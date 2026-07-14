import { fetchResidentsCached, invalidateResidentsCache } from '../../../utils/apiCache';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import PrintSuccessDialog from './PrintSuccessDialog';
import {
  ArrowLeft, Printer, Search, User, FileText, FileSignature,
  ZoomIn, ZoomOut, Plus, ShieldAlert, Check, X, Edit2, Save, Loader2, RefreshCw
} from 'lucide-react';
import {
  getLetterClassifications, incrementSequenceNumber, generateLetterNumber
} from '../../../utils/letterClassifications';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { showToast } from '../../../utils/toast';
import { useDragScroll } from '../../../hooks/useDragScroll';

// ===================== INTERFACES =====================
interface FullResident {
  nik: string;
  name: string;
  gender: string;
  birthPlace: string;
  birthDate: string;
  job?: string;
  address: string;
  desa?: string;
  noKk?: string;
  familyRelation?: string;
  fatherName?: string;
  motherName?: string;
  rt?: string;
  rw?: string;
  religion?: string;
  bloodType?: string;
  education?: string;
  status?: string;
  [key: string]: any;
}

interface HeirCandidate {
  resident: FullResident;       // Original resident data
  included: boolean;            // Is this person selected as ahli waris?
  isProxy: boolean;             // Is this person the penerima kuasa?
  editedName: string;
  editedNik: string;
  editedBirthPlace: string;
  editedBirthDate: string;
  editedAddress: string;
  editedRelationship: string;
  isEditing: boolean;
  isManual: boolean;            // Manually added (not from KK)
}

interface RtRwEntry { no: string; name: string; }

// ===================== HELPERS =====================
const fmtDate = (d: string) => {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return d; }
};
const v = (val: any, fallback = '-') =>
  (val !== undefined && val !== null && String(val).trim() !== '') ? String(val) : fallback;
const cleanStr = (s: string, regex: RegExp) => (s || '').replace(regex, '');

// Map familyRelation to Ahli Waris relationship label
const mapFamilyRelation = (rel: string = '', gender: string = ''): string => {
  const r = rel.toLowerCase();
  if (r.includes('istri') || r.includes('suami')) return rel;
  if (r.includes('anak')) return 'Anak Kandung';
  if (r.includes('kepala')) return gender.toLowerCase().includes('perempuan') ? 'Istri' : 'Suami';
  return rel || 'Anggota Keluarga';
};

// ===================== COMPONENT =====================
export default function AdminSuratSPT({
  onBack, editData, editLetterId
}: {
  onBack: () => void; editData?: any; editLetterId?: string | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const letterFont = localStorage.getItem('village_letter_font') || 'Arial, sans-serif';

  // ─── Super admin config ───
  const rtList: RtRwEntry[] = (() => { try { return JSON.parse(localStorage.getItem('village_rt_list') || '[]'); } catch { return []; } })();
  const rwList: RtRwEntry[] = (() => { try { return JSON.parse(localStorage.getItem('village_rw_list') || '[]'); } catch { return []; } })();
  const camatFromConfig = localStorage.getItem('village_signature_left_name') || '';
  const camatPangkat = localStorage.getItem('village_signature_left_pangkat') || '';
  const camatNip = localStorage.getItem('village_signature_left_nip') || '';
  const activeKecamatan = cleanStr(localStorage.getItem('kop_kecamatan') || 'Simpur', /^kecamatan\s+/i);
  const activeDesa = cleanStr(localStorage.getItem('kop_desa') || 'Wasah Hilir', /^(desa|kelurahan)\s+/i);
  const activeKabupaten = cleanStr(localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan', /^(kabupaten|kota)\s+/i);

  // ─── State ───
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [allResidents, setAllResidents] = useState<FullResident[]>([]);

  // Pewaris search
  const [pewarisQuery, setPewarisQuery] = useState('');
  const [pewarisSearchOpen, setPewarisSearchOpen] = useState(false);
  const [selectedPewaris, setSelectedPewaris] = useState<FullResident | null>(null);

  // Heir candidates (from KK + manual)
  const [heirCandidates, setHeirCandidates] = useState<HeirCandidate[]>([]);
  const [loadingKK, setLoadingKK] = useState(false);

  const [selectedRtIndex, setSelectedRtIndex] = useState<number>(-1);
  const [selectedRwIndex, setSelectedRwIndex] = useState<number>(-1);
  const [previewZoom, setPreviewZoom] = useState(0.40);

  const [formData, setFormData] = useState({
    nomorSurat: '',
    hariMeninggal: '',
    tanggalMeninggal: '',
    tempatMeninggal: '',
    jamMeninggal: '',
    alamatTerakhir: '',
    noAktaKematian: '',
    noSuratKematianRS: '',
    tglSuratKematianRS: '',
    noSkmDesa: '',
    tglSkmDesa: '',
    keperluanKlaim: 'Klaim BPJS Ketenagakerjaan & TASPEN',
    saksi1: '',
    saksi2: '',
    saksi3: '',
    namaPejabat: localStorage.getItem('kop_kades') || '',
  });

  // ─── Load all residents ───
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchResidentsCached();
        if (res.ok) setAllResidents(await res.json());
      } catch { }
    };
    load();

    if (!editData) {
      const configs = getLetterClassifications();
      const sptConfig = configs.find(c => c.klasifikasi === 'SPT') || { klasifikasi: 'SPT', kodeKlasifikasi: '474', noUrutTerakhir: 0 };
      setFormData(p => ({ ...p, nomorSurat: generateLetterNumber(sptConfig.klasifikasi, sptConfig.kodeKlasifikasi || '474') }));
    }
  }, []);

  // ─── Restore edit data ───
  useEffect(() => {
    if (editData) {
      const { heirsList, pewarisData, ...rest } = editData;
      setFormData(p => ({ ...p, ...rest }));
      if (pewarisData) setSelectedPewaris(pewarisData);
      if (heirsList) setHeirCandidates(heirsList);
    }
  }, [editData]);

  // ─── Select pewaris → auto load KK family ───
  const handleSelectPewaris = useCallback(async (resident: FullResident) => {
    setSelectedPewaris(resident);
    setPewarisSearchOpen(false);
    setPewarisQuery('');
    setFormData(p => ({ ...p, alamatTerakhir: resident.address || '' }));

    if (!resident.noKk) {
      showToast('Pewaris tidak memiliki data Nomor KK. Silakan tambahkan ahli waris manual.', 'info');
      return;
    }

    setLoadingKK(true);
    try {
      // Force fresh load of residents to get latest data
      const res = await fetchResidentsCached(true);
      if (!res.ok) throw new Error();
      const data: FullResident[] = await res.json();
      setAllResidents(data);

      // Get all family members with same KK, exclude the pewaris themselves
      const family = data.filter(r => r.noKk === resident.noKk && r.nik !== resident.nik);

      // Sort: Istri/Suami first, then Anak
      const sorted = [...family].sort((a, b) => {
        const priority = (rel: string = '') => {
          const r = rel.toLowerCase();
          if (r.includes('istri') || r.includes('suami')) return 1;
          if (r.includes('anak')) return 2;
          return 3;
        };
        return priority(a.familyRelation) - priority(b.familyRelation);
      });

      const candidates: HeirCandidate[] = sorted.map((r, idx) => ({
        resident: r,
        included: true, // default: include all family
        isProxy: idx === 0, // first family member (usually istri) is default proxy
        editedName: r.name,
        editedNik: r.nik,
        editedBirthPlace: r.birthPlace || '',
        editedBirthDate: r.birthDate || '',
        editedAddress: r.address || '',
        editedRelationship: mapFamilyRelation(r.familyRelation, r.gender),
        isEditing: false,
        isManual: false,
      }));

      setHeirCandidates(candidates);

      if (candidates.length === 0) {
        showToast('Tidak ada anggota keluarga lain dalam KK ini. Silakan tambahkan ahli waris manual.', 'info');
      } else {
        showToast(`${candidates.length} anggota keluarga ditemukan dari KK yang sama.`, 'success');
      }
    } catch {
      showToast('Gagal memuat data keluarga. Coba lagi.', 'error');
    }
    setLoadingKK(false);
  }, []);

  // ─── Add manual heir ───
  const addManualHeir = () => {
    const blank: HeirCandidate = {
      resident: { nik: '', name: '', gender: '', birthPlace: '', birthDate: '', address: '' },
      included: true,
      isProxy: heirCandidates.filter(h => h.included).length === 0,
      editedName: '',
      editedNik: '',
      editedBirthPlace: '',
      editedBirthDate: '',
      editedAddress: '',
      editedRelationship: 'Anak Kandung',
      isEditing: true,
      isManual: true,
    };
    setHeirCandidates(p => [...p, blank]);
  };

  const updateCandidate = (idx: number, patch: Partial<HeirCandidate>) =>
    setHeirCandidates(p => p.map((h, i) => i === idx ? { ...h, ...patch } : h));

  const removeCandidate = (idx: number) =>
    setHeirCandidates(p => p.filter((_, i) => i !== idx));

  // Only one proxy at a time
  const setProxy = (idx: number) =>
    setHeirCandidates(p => p.map((h, i) => ({ ...h, isProxy: i === idx })));

  // ─── Active heirs (included only) ───
  const activeHeirs = heirCandidates.filter(h => h.included);
  const proxyHeir = activeHeirs.find(h => h.isProxy) || activeHeirs[0];

  // ─── Sync changes back to residents API ───
  const syncToResidents = async () => {
    if (!selectedPewaris) return;
    setSyncing(true);

    const authUser = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
    const isSuperAdmin = authUser.role === 'superadmin' || authUser.role === 'super_admin';

    // Only sync changes made to heirs that came from actual resident records (not manual)
    const edited = heirCandidates.filter(h => !h.isManual && h.resident.nik);
    let synced = 0;
    let failed = 0;

    for (const c of edited) {
      const r = c.resident;
      const hasChanges =
        c.editedName !== r.name ||
        c.editedNik !== r.nik ||
        c.editedBirthPlace !== r.birthPlace ||
        c.editedBirthDate !== r.birthDate ||
        c.editedAddress !== r.address;

      if (!hasChanges) continue;

      const updated = {
        ...r,
        name: c.editedName,
        nik: c.editedNik,
        birthPlace: c.editedBirthPlace,
        birthDate: c.editedBirthDate,
        address: c.editedAddress,
      };

      try {
        if (isSuperAdmin) {
          const res = await fetch(`/api/residents/${r.nik}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          });
          if (res.ok) synced++;
          else failed++;
        } else {
          // Admin: request approval
          const res = await fetch(`/api/residents/${r.nik}/request-approval`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actionType: 'edit', originalStatus: r.status || 'Aktif', details: updated }),
          });
          if (res.ok) synced++;
          else failed++;
        }
      } catch { failed++; }
    }

    invalidateResidentsCache();

    if (synced > 0) showToast(`${synced} data penduduk berhasil disinkronkan ke database.`, 'success');
    if (failed > 0) showToast(`${failed} data gagal disinkronkan.`, 'error');
    if (synced === 0 && failed === 0) showToast('Tidak ada perubahan data penduduk yang perlu disinkronkan.', 'info');

    setSyncing(false);
  };

  // ─── Print ───
  const handlePrint = async () => {
    if (!selectedPewaris) {
      showToast('Pilih pewaris terlebih dahulu dari data penduduk.', 'error');
      return;
    }
    if (activeHeirs.length === 0) {
      showToast('Minimal 1 ahli waris harus dipilih.', 'error');
      return;
    }
    setLoading(true);

    // Sync changes to resident data
    await syncToResidents();

    const iframe = iframeRef.current;
    if (iframe) {
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`<html><head><title>SPT</title><style>
          @media print { @page { size: A4; margin: 0; } body { margin:0; padding:0; background:white; }
            .page-break { page-break-before:always; break-before:page; display:block; } }
          body { margin:0; }
        </style></head><body>
          ${generatePage1HTML()}
          <div class="page-break"></div>
          ${generatePage2HTML()}
          ${activeHeirs.length > 5 ? `<div class="page-break"></div>\n          ${generatePage3HTML()}` : ''}
          <script>window.onload=function(){window.print();}<\/script>
        </body></html>`);
        doc.close();
      }
    }

    const heirsList = heirCandidates;
    const updatedFields = { nomor: formData.nomorSurat, nik: selectedPewaris.nik, nama: selectedPewaris.name, heirsList, pewarisData: selectedPewaris };

    if (editLetterId) {
      updateLetterHistory(editLetterId, updatedFields);
    } else {
      addLetterHistory({
        nomor: formData.nomorSurat, jenis: 'SPT',
        nik: selectedPewaris.nik, nama: selectedPewaris.name,
        tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        status: 'Selesai', keperluan: formData.keperluanKlaim,
        data: { ...formData, heirsList, pewarisData: selectedPewaris }
      });
      incrementSequenceNumber('SPT');
    }

    setLoading(false);
    setSuccess(true);
  };

  // ─── HTML generators ───
  const tglFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const selectedRt = rtList[selectedRtIndex] || null;
  const selectedRw = rwList[selectedRwIndex] || null;

  const generatePage1HTML = () => `
    <div style="width:210mm;min-height:297mm;padding:25mm 20mm 20mm 20mm;box-sizing:border-box;position:relative;background:white;font-family:${letterFont};">
      <div style="text-align:center;margin-bottom:10px;">
        <h3 style="text-decoration:underline;margin:0;font-size:15.5px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">SURAT KUASA AHLI WARIS</h3>
        <p style="margin:2px 0 0 0;font-size:13.5px;">Nomor : ${v(formData.nomorSurat)}</p>
      </div>

      <p style="text-indent:40px;text-align:justify;line-height:1.25;margin-bottom:12px;font-size:13.5px;">
        Kami yang bertanda tangan di bawah ini adalah ahli waris yang sah dari almarhum <strong>${v(selectedPewaris?.name).toUpperCase()}</strong>
        yang meninggal dunia pada hari ${v(formData.hariMeninggal)} tanggal ${fmtDate(formData.tanggalMeninggal)}
        berdasarkan Surat Akta Kematian dari Dinas Catatan Sipil Kabupaten ${activeKabupaten} Nomor: ${v(formData.noAktaKematian)}.
        Dengan ini menyatakan dengan sebenarnya bahwa hubungan kami dengan Almarhum <strong>${v(selectedPewaris?.name).toUpperCase()}</strong> adalah sebagai berikut:
      </p>

      <div style="margin-left:40px;margin-bottom:12px;font-size:13px;line-height:1.25;">
        ${activeHeirs.slice(0, 5).map((h, i) => `
          <div style="margin-bottom:8px;">
            <span style="display:inline-block;width:20px;vertical-align:top;font-weight:bold;">${i + 1}.</span>
            <div style="display:inline-block;width:calc(100% - 25px);vertical-align:top;">
              <table style="width:100%;border-collapse:collapse;line-height:1.15;font-size:13px;">
                <tr><td style="width:28%;">Nama</td><td style="width:2%;">:</td><td><strong>${h.editedName}</strong></td></tr>
                <tr><td>NIK</td><td>:</td><td style="font-family:monospace;">${h.editedNik}</td></tr>
                <tr><td>Tempat, Tgl Lahir</td><td>:</td><td>${h.editedBirthPlace}, ${fmtDate(h.editedBirthDate)}</td></tr>
                <tr><td>Alamat</td><td>:</td><td>${h.editedAddress}</td></tr>
              </table>
            </div>
          </div>`).join('')}
      </div>
      ${activeHeirs.length > 5 ? `<div style="margin-left:40px;margin-bottom:12px;font-style:italic;font-size:12px;">(* Lanjutan daftar ahli waris No. 6 dst. dilanjutkan pada Lembar Lampiran ke-3)</div>` : ''}

      <p style="text-indent:40px;text-align:justify;line-height:1.25;margin-bottom:12px;font-size:13.5px;">
        Kami sepakat menunjuk atau memberikan Kuasa kepada salah satu orang dari kami yang bernama
        <strong>${v(proxyHeir?.editedName).toUpperCase()}</strong> untuk pengurusan dan pengambilan
        <strong>${v(formData.keperluanKlaim)}</strong>.
      </p>
      <p style="text-indent:40px;text-align:justify;line-height:1.25;margin-bottom:25px;font-size:13.5px;">
        Surat kuasa ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:20px;line-height:1.15;">
        <tr>
          <td style="width:40%;text-align:center;vertical-align:top;padding-bottom:15px;">
            Yang Diberi Kuasa,<br/><br/><br/><br/><br/>
            <u><strong>${v(proxyHeir?.editedName)}</strong></u>
          </td>
          <td style="width:20%;"></td>
          <td style="width:40%;text-align:left;vertical-align:top;padding-bottom:15px;">
            Pemberi Kuasa (Ahli Waris):<br/><br/>
            ${activeHeirs.slice(0, 5).map((h, i) => `
              <div style="margin-bottom:12px;display:flex;justify-content:space-between;">
                <span>${i + 1}. ${h.editedName}</span>
                <span style="font-style:italic;margin-right:20px;">(...................)</span>
              </div>`).join('')}
            ${activeHeirs.length > 5 ? `<div style="font-style:italic;font-size:11px;margin-top:5px;">(Tanda Tangan Lanjutan Terlampir)</div>` : ''}
          </td>
        </tr>
        <tr>
          <td colspan="3" style="text-align:center;padding-top:20px;vertical-align:top;">
            Mengetahui,<br/>
            Kepala Desa ${activeDesa}<br/><br/><br/><br/><br/>
            <u><strong>${formData.namaPejabat}</strong></u>
          </td>
        </tr>
      </table>

      <div style="position:absolute;bottom:8mm;left:15mm;right:15mm;">
        ${SAAS_CONFIG.globalFooterHTML}
      </div>
    </div>`;

  const generatePage2HTML = () => `
    <div style="width:210mm;min-height:297mm;padding:25mm 20mm 20mm 20mm;box-sizing:border-box;position:relative;background:white;font-family:${letterFont};">
      <div style="text-align:center;margin-bottom:10px;">
        <h3 style="text-decoration:underline;margin:0;font-size:15.5px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">SURAT PERNYATAAN WARIS</h3>
        <p style="margin:2px 0 0 0;font-size:13.5px;">Tanggal : ${tglFormatted}</p>
      </div>

      <p style="text-indent:40px;text-align:justify;line-height:1.25;margin-bottom:10px;font-size:13px;">
        Kami yang bertanda tangan di bawah ini para ahli waris Almarhum <strong>${v(selectedPewaris?.name).toUpperCase()}</strong>
        menyatakan dengan sesungguhnya dan sanggup diangkat sumpah sesuai agama yang kami anut, bahwa almarhum
        <strong>${v(selectedPewaris?.name).toUpperCase()}</strong> tempat tinggal terakhir di ${v(formData.alamatTerakhir)} telah meninggal dunia
        di ${v(formData.tempatMeninggal)} pada hari ${v(formData.hariMeninggal)} tanggal ${fmtDate(formData.tanggalMeninggal)} jam ${v(formData.jamMeninggal)},
        berdasarkan Surat Kematian Nomor: ${v(formData.noSuratKematianRS)} tanggal ${fmtDate(formData.tglSuratKematianRS)}
        dan berdasar Surat Keterangan Kematian dari Kepala Desa ${activeDesa} Nomor: ${v(formData.noSkmDesa)} tanggal ${fmtDate(formData.tglSkmDesa)}.
      </p>

      <p style="text-indent:40px;text-align:justify;line-height:1.25;margin-bottom:10px;font-size:13px;">
        Semasa hidupnya almarhum <strong>${v(selectedPewaris?.name).toUpperCase()}</strong> pernah menikah 1 (satu) kali dengan
        istri/suami yang bernama <strong>${activeHeirs[0]?.editedName || '-'}</strong>
        lahir di ${activeHeirs[0]?.editedBirthPlace || '-'} pada tanggal ${fmtDate(activeHeirs[0]?.editedBirthDate)}.
        Dari pernikahannya telah dilahirkan ${activeHeirs.filter(h => h.editedRelationship.toLowerCase().includes('anak')).length} orang anak, yaitu:
      </p>

      <table style="width:100%;border-collapse:collapse;margin-top:8px;margin-bottom:10px;font-size:11.5px;" border="1">
        <thead>
          <tr style="background:#f2f2f2;font-weight:bold;text-align:center;">
            <th style="border:1px solid #000;padding:4px;width:6%;">No</th>
            <th style="border:1px solid #000;padding:4px;text-align:left;width:30%;">Nama Lengkap</th>
            <th style="border:1px solid #000;padding:4px;width:20%;">NIK</th>
            <th style="border:1px solid #000;padding:4px;width:24%;">Tempat, Tanggal Lahir</th>
            <th style="border:1px solid #000;padding:4px;width:20%;">Hubungan</th>
          </tr>
        </thead>
        <tbody>
          ${activeHeirs.slice(0, 5).map((h, i) => `
            <tr>
              <td style="border:1px solid #000;padding:3px;text-align:center;">${i + 1}</td>
              <td style="border:1px solid #000;padding:3px 6px;font-weight:bold;text-transform:uppercase;">${h.editedName}</td>
              <td style="border:1px solid #000;padding:3px;text-align:center;font-family:monospace;">${h.editedNik}</td>
              <td style="border:1px solid #000;padding:3px;text-align:center;">${h.editedBirthPlace}, ${fmtDate(h.editedBirthDate)}</td>
              <td style="border:1px solid #000;padding:3px;text-align:center;">${h.editedRelationship}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      ${activeHeirs.length > 5 ? `<div style="font-style:italic;font-size:11.5px;margin-bottom:10px;">(* Lanjutan tabel ahli waris No. 6 dst. terdapat pada Lembar Lampiran ke-3)</div>` : ''}

      <p style="text-indent:40px;text-align:justify;line-height:1.25;margin-bottom:8px;font-size:13px;">
        Kami tersebut di atas adalah satu-satunya ahli waris, tidak ada lagi ahli waris yang lain.
      </p>
      <p style="text-indent:40px;text-align:justify;line-height:1.25;margin-bottom:12px;font-size:12.5px;">
        Demikian Surat Pernyataan Waris ini kami buat dengan sebenarnya dalam keadaan sehat jasmani dan rohani tanpa ada paksaan dari pihak manapun juga.
        Apabila di kemudian hari ada ahli waris lainnya, maka kami bersedia dituntut berdasarkan peraturan perundang-undangan yang berlaku dan tidak akan melibatkan pejabat instansi manapun.
      </p>

      <div style="font-size:11.5px;line-height:1.15;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:50%;vertical-align:top;text-align:left;padding-right:10px;">
              <strong>Para Ahli Waris:</strong><br/><br/>
              ${activeHeirs.slice(0, 5).map((h, i) => `
                <div style="margin-bottom:8px;display:flex;justify-content:space-between;width:90%;">
                  <span>${i + 1}. ${h.editedName}</span>
                  <span style="font-style:italic;">(.................)</span>
                </div>`).join('')}
              ${activeHeirs.length > 5 ? `<div style="font-style:italic;font-size:11px;margin-top:5px;">(Tanda Tangan Lanjutan Terlampir)</div>` : ''}
            </td>
            <td style="width:50%;vertical-align:top;text-align:left;padding-left:10px;">
              <strong>Para Saksi-Saksi:</strong><br/><br/>
              ${(['saksi1','saksi2','saksi3'] as const).map((k, i) => `
                <div style="margin-bottom:8px;display:flex;justify-content:space-between;width:90%;">
                  <span>${i + 1}. ${v((formData as any)[k])}</span>
                  <span style="font-style:italic;">(.................)</span>
                </div>`).join('')}
            </td>
          </tr>
          <tr><td colspan="2" style="padding:8px 0;"><hr style="border:0;border-top:1px dashed #555;"/></td></tr>
          <tr>
            <td style="vertical-align:top;text-align:left;">
              <div style="font-style:italic;font-size:11px;margin-bottom:8px;">
                Sesuai KTP dan KK yang dimiliki, almarhum adalah benar-benar warga Desa ${activeDesa} Kecamatan ${activeKecamatan}.
              </div>
              <table style="width:100%;font-size:11px;text-align:center;">
                <tr>
                  <td>Mengetahui,<br/>Ketua RT. ${selectedRt ? selectedRt.no : '.......'}<br/><br/><br/><br/>
                    <u><strong>${selectedRt ? selectedRt.name : '........................'}</strong></u></td>
                  <td>Mengetahui,<br/>Ketua RW. ${selectedRw ? selectedRw.no : '.......'}<br/><br/><br/><br/>
                    <u><strong>${selectedRw ? selectedRw.name : '........................'}</strong></u></td>
                </tr>
              </table>
            </td>
            <td style="vertical-align:top;text-align:center;">
              ${activeDesa}, ${tglFormatted}<br/><br/>
              <em>Dirigister di: Desa ${activeDesa}</em><br/>
              Nomor: ${v(formData.nomorSurat)}<br/>
              Tanggal: ${tglFormatted}<br/>
              <strong>Kepala Desa ${activeDesa}</strong>
              <br/><br/><br/><br/>
              <u><strong>${formData.namaPejabat}</strong></u>
            </td>
          </tr>
          <tr><td colspan="2" style="padding-top:10px;">
            <div style="border-top:1px solid #000;padding-top:8px;text-align:center;font-size:11px;">
              <em>Dirigister di: Kecamatan ${activeKecamatan}</em><br/>
              Nomor: ....................................... Tanggal: .......................................<br/>
              <strong>Camat ${activeKecamatan}</strong>
              <br/><br/><br/><br/>
              <u><strong>${v(camatFromConfig, '................................')}</strong></u><br/>
              ${camatPangkat}<br/>
              NIP: ${v(camatNip, '-')}
            </div>
          </td></tr>
        </table>
      </div>

      <div style="position:absolute;bottom:8mm;left:15mm;right:15mm;">
        ${SAAS_CONFIG.globalFooterHTML}
      </div>
    </div>`;

  const generatePage3HTML = () => `
    <div style="width:210mm;min-height:297mm;padding:25mm 20mm 20mm 20mm;box-sizing:border-box;position:relative;background:white;font-family:${letterFont};">
      <div style="text-align:center;margin-bottom:20px;">
        <h3 style="text-decoration:underline;margin:0;font-size:15.5px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">LAMPIRAN LANJUTAN AHLI WARIS</h3>
        <p style="margin:2px 0 0 0;font-size:13.5px;">Nomor : ${v(formData.nomorSurat)}</p>
      </div>

      <h4 style="font-size:13px;margin-bottom:10px;">A. Lanjutan Tabel Ahli Waris</h4>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;margin-bottom:20px;font-size:11.5px;" border="1">
        <thead>
          <tr style="background:#f2f2f2;font-weight:bold;text-align:center;">
            <th style="border:1px solid #000;padding:4px;width:6%;">No</th>
            <th style="border:1px solid #000;padding:4px;text-align:left;width:30%;">Nama Lengkap</th>
            <th style="border:1px solid #000;padding:4px;width:20%;">NIK</th>
            <th style="border:1px solid #000;padding:4px;width:24%;">Tempat, Tanggal Lahir</th>
            <th style="border:1px solid #000;padding:4px;width:20%;">Hubungan</th>
          </tr>
        </thead>
        <tbody>
          ${activeHeirs.slice(5).map((h, i) => `
            <tr>
              <td style="border:1px solid #000;padding:3px;text-align:center;">${i + 6}</td>
              <td style="border:1px solid #000;padding:3px 6px;font-weight:bold;text-transform:uppercase;">${h.editedName}</td>
              <td style="border:1px solid #000;padding:3px;text-align:center;font-family:monospace;">${h.editedNik}</td>
              <td style="border:1px solid #000;padding:3px;text-align:center;">${h.editedBirthPlace}, ${fmtDate(h.editedBirthDate)}</td>
              <td style="border:1px solid #000;padding:3px;text-align:center;">${h.editedRelationship}</td>
            </tr>`).join('')}
        </tbody>
      </table>

      <h4 style="font-size:13px;margin-bottom:10px;margin-top:30px;">B. Lanjutan Tanda Tangan Ahli Waris</h4>
      <div style="display:flex;flex-wrap:wrap;gap:20px;">
        ${activeHeirs.slice(5).map((h, i) => `
          <div style="width:45%;margin-bottom:30px;">
            <div style="margin-bottom:40px;font-size:13px;">${i + 6}. ${h.editedName}</div>
            <div style="font-size:13px;">(...................................)</div>
          </div>
        `).join('')}
      </div>

      <div style="position:absolute;bottom:8mm;left:15mm;right:15mm;">
        ${SAAS_CONFIG.globalFooterHTML}
      </div>
    </div>`;

  // ─── Filtered pewaris search ───
  const filteredPewaris = allResidents.filter(r =>
    r.name.toLowerCase().includes(pewarisQuery.toLowerCase()) ||
    r.nik.includes(pewarisQuery)
  ).slice(0, 8);

  // ===================== RENDER =====================
  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-20">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md dark:shadow-none sticky top-16 z-30">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Surat Pengurusan Taspen (SPT)</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Surat Kuasa & Pernyataan Waris · Terintegrasi Data Penduduk</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncToResidents}
            disabled={syncing || !selectedPewaris}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all disabled:opacity-40"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sinkron Data
          </button>
          <button
            onClick={handlePrint}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg dark:shadow-none shadow-emerald-900/20 active:scale-95 disabled:opacity-60"
          >
            <Printer className="w-4 h-4" />
            {loading ? 'Memproses...' : `Cetak ${activeHeirs.length > 5 ? '3' : '2'} Lembar`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* ═══════ LEFT: FORM ═══════ */}
        <div className="space-y-4 max-h-[88vh] overflow-y-auto pr-2 pb-10">

          {/* ─ 1. Pencarian Pewaris ─ */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Data Pewaris (Almarhum)</h2>
              <span className="ml-auto text-[10px] bg-rose-50 text-rose-600 border border-rose-100 font-bold px-2 py-0.5 rounded-full">Terintegrasi Data Penduduk</span>
            </div>

            {/* Pewaris Search Box */}
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Cari Pewaris dari Data Penduduk</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-emerald-400 rounded-xl focus-within:border-emerald-500 transition-colors">
                <Search className="w-4 h-4 text-emerald-500 shrink-0" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="Ketik nama atau NIK almarhum..."
                  value={selectedPewaris && !pewarisSearchOpen ? selectedPewaris.name : pewarisQuery}
                  onFocus={() => { setPewarisSearchOpen(true); if (selectedPewaris) setPewarisQuery(''); }}
                  onChange={e => { setPewarisQuery(e.target.value); setPewarisSearchOpen(true); setSelectedPewaris(null); setHeirCandidates([]); }}
                />
                {selectedPewaris && !pewarisSearchOpen && (
                  <button onClick={() => { setSelectedPewaris(null); setHeirCandidates([]); setPewarisQuery(''); setPewarisSearchOpen(true); }} className="text-slate-400 hover:text-rose-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown results */}
              {pewarisSearchOpen && pewarisQuery.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                  {filteredPewaris.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-4 italic">Tidak ditemukan.</p>
                    : filteredPewaris.map(r => (
                      <div key={r.nik} onClick={() => handleSelectPewaris(r)} className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-none">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{r.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{r.nik}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{r.address} · {r.familyRelation}</p>
                      </div>
                    ))
                  }
                  <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => setPewarisSearchOpen(false)} className="text-[10px] text-rose-500 hover:underline font-bold">Tutup</button>
                  </div>
                </div>
              )}
            </div>

            {/* Pewaris Card — shown after selection */}
            {selectedPewaris && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedPewaris.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-emerald-900 text-sm truncate">{selectedPewaris.name}</p>
                  <p className="text-[10px] text-emerald-700 font-mono">{selectedPewaris.nik}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">{selectedPewaris.address}</p>
                  {selectedPewaris.noKk && <p className="text-[10px] text-emerald-500 mt-0.5">No. KK: {selectedPewaris.noKk}</p>}
                </div>
                {loadingKK && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin shrink-0 mt-1" />}
              </div>
            )}

            {/* Death details */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Hari Wafat</label>
                <input type="text" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={formData.hariMeninggal} onChange={e => setFormData(p => ({...p, hariMeninggal: e.target.value}))} placeholder="Selasa" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tanggal</label>
                <input type="date" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={formData.tanggalMeninggal} onChange={e => setFormData(p => ({...p, tanggalMeninggal: e.target.value}))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Jam</label>
                <input type="text" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={formData.jamMeninggal} onChange={e => setFormData(p => ({...p, jamMeninggal: e.target.value}))} placeholder="17:49" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nomor Surat</label>
                <input type="text" className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono" value={formData.nomorSurat} onChange={e => setFormData(p => ({...p, nomorSurat: e.target.value}))} />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tempat Wafat</label>
                <input type="text" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={formData.tempatMeninggal} onChange={e => setFormData(p => ({...p, tempatMeninggal: e.target.value}))} placeholder="RSUD ..." />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Alamat Terakhir</label>
                <input type="text" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={formData.alamatTerakhir} onChange={e => setFormData(p => ({...p, alamatTerakhir: e.target.value}))} />
              </div>
            </div>
          </div>

          {/* ─ 2. Dokumen Legalitas ─ */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <FileText className="w-4.5 h-4.5 text-emerald-600" />
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Dokumen Legalitas & Keperluan</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { key: 'noAktaKematian', label: 'No. Akta Kematian Sipil', span: 2 },
                { key: 'noSuratKematianRS', label: 'No. Surat Kematian RSUD', span: 1 },
                { key: 'tglSuratKematianRS', label: 'Tgl Surat RSUD', span: 1, type: 'date' },
                { key: 'noSkmDesa', label: 'No. SKM Desa', span: 1 },
                { key: 'tglSkmDesa', label: 'Tgl SKM Desa', span: 1, type: 'date' },
                { key: 'keperluanKlaim', label: 'Keperluan Klaim', span: 2 },
              ].map(({ key, label, span, type }) => (
                <div key={key} className={`space-y-1 col-span-${span}`}>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{label}</label>
                  <input type={type || 'text'} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={(formData as any)[key]} onChange={e => setFormData(p => ({...p, [key]: e.target.value}))} />
                </div>
              ))}
            </div>
          </div>

          {/* ─ 3. Daftar Ahli Waris ─ */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-emerald-600" />
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Daftar Ahli Waris</h2>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-0.5 rounded-full">{activeHeirs.length} dipilih</span>
              </div>
              <button onClick={addManualHeir} className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <Plus className="w-3 h-3" /> Tambah Manual
              </button>
            </div>

            {loadingKK && (
              <div className="flex items-center gap-3 py-4 justify-center text-emerald-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Memuat anggota keluarga dari KK...</span>
              </div>
            )}

            {!loadingKK && heirCandidates.length === 0 && selectedPewaris && (
              <div className="text-center py-5 text-slate-400 text-xs italic">
                Tidak ada anggota KK lain ditemukan. Klik <strong>Tambah Manual</strong> untuk menambahkan ahli waris.
              </div>
            )}

            {!selectedPewaris && (
              <div className="text-center py-5 text-slate-400 text-xs italic">
                Pilih pewaris terlebih dahulu untuk memuat daftar ahli waris dari data KK.
              </div>
            )}

            <div className="space-y-3">
              {heirCandidates.map((c, idx) => (
                <div key={idx} className={`rounded-2xl border transition-all ${c.included ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 opacity-60'}`}>
                  {/* Header row */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    {/* Checkbox: include/exclude */}
                    <button
                      onClick={() => updateCandidate(idx, { included: !c.included })}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${c.included ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'}`}
                    >
                      {c.included && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold truncate ${c.included ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>{c.editedName || <em className="font-normal text-slate-400">Nama belum diisi</em>}</span>
                        {c.isManual && <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">MANUAL</span>}
                        {!c.isManual && <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">KK</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{c.editedRelationship} · NIK: {c.editedNik || '-'}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Proxy badge */}
                      {c.included && (
                        <button
                          onClick={() => setProxy(idx)}
                          title="Jadikan penerima kuasa"
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${c.isProxy ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'}`}
                        >
                          {c.isProxy ? '★ Kuasa' : 'Beri Kuasa'}
                        </button>
                      )}
                      {/* Edit toggle */}
                      <button
                        onClick={() => updateCandidate(idx, { isEditing: !c.isEditing })}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-emerald-700 transition-colors"
                      >
                        {c.isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                      </button>
                      {/* Remove */}
                      <button
                        onClick={() => removeCandidate(idx)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {c.isEditing && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nama Lengkap</label>
                        <input type="text" className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-400 font-bold" value={c.editedName} onChange={e => updateCandidate(idx, { editedName: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">NIK</label>
                        <input type="text" className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-400 font-mono" value={c.editedNik} onChange={e => updateCandidate(idx, { editedNik: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Hubungan</label>
                        <select className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={c.editedRelationship} onChange={e => updateCandidate(idx, { editedRelationship: e.target.value })}>
                          <option value="Istri">Istri</option>
                          <option value="Suami">Suami</option>
                          <option value="Anak Kandung">Anak Kandung</option>
                          <option value="Keluarga">Keluarga</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tempat Lahir</label>
                        <input type="text" className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={c.editedBirthPlace} onChange={e => updateCandidate(idx, { editedBirthPlace: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tanggal Lahir</label>
                        <input type="date" className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={c.editedBirthDate} onChange={e => updateCandidate(idx, { editedBirthDate: e.target.value })} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Alamat</label>
                        <input type="text" className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={c.editedAddress} onChange={e => updateCandidate(idx, { editedAddress: e.target.value })} />
                      </div>
                      {!c.isManual && (
                        <div className="col-span-2">
                          <p className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                            ℹ️ Perubahan di sini akan disinkronkan ke <strong>Data Penduduk</strong> saat klik <strong>Sinkron Data</strong> atau <strong>Cetak</strong>.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ─ 4. Saksi & RT/RW ─ */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <FileSignature className="w-4.5 h-4.5 text-emerald-600" />
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Saksi & Verifikasi RT/RW/Camat</h2>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {(['saksi1', 'saksi2', 'saksi3'] as const).map((key, i) => (
                <div key={key} className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Saksi {i + 1}</label>
                  <input type="text" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-400" value={(formData as any)[key]} onChange={e => setFormData(p => ({...p, [key]: e.target.value}))} placeholder={`Nama ${i + 1}`} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ketua RT</label>
                {rtList.length > 0
                  ? <select className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={selectedRtIndex} onChange={e => setSelectedRtIndex(Number(e.target.value))}>
                      <option value={-1}>-- Pilih RT --</option>
                      {rtList.map((rt, i) => <option key={i} value={i}>RT {rt.no} — {rt.name}</option>)}
                    </select>
                  : <div className="px-3 py-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl italic">Atur di Pengaturan → Daftar RT/RW</div>
                }
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ketua RW</label>
                {rwList.length > 0
                  ? <select className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={selectedRwIndex} onChange={e => setSelectedRwIndex(Number(e.target.value))}>
                      <option value={-1}>-- Pilih RW --</option>
                      {rwList.map((rw, i) => <option key={i} value={i}>RW {rw.no} — {rw.name}</option>)}
                    </select>
                  : <div className="px-3 py-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl italic">Atur di Pengaturan → Daftar RT/RW</div>
                }
              </div>
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-xs text-emerald-900 space-y-0.5">
              <p className="font-bold text-[10px] text-emerald-700 uppercase tracking-wider mb-1">Camat (Otomatis dari Pengaturan)</p>
              {camatFromConfig
                ? <>
                    <p><strong>Nama:</strong> {camatFromConfig}</p>
                    {camatPangkat && <p><strong>Pangkat:</strong> {camatPangkat}</p>}
                    {camatNip && <p><strong>NIP:</strong> {camatNip}</p>}
                  </>
                : <p className="italic text-emerald-600">Belum dikonfigurasi. Atur di <strong>Pengaturan → Info Pengesah Sebelah Kiri</strong>.</p>
              }
            </div>
          </div>
        </div>

        {/* ═══════ RIGHT: PREVIEW ═══════ */}
        <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl h-[88vh] sticky top-[76px]">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">LIVE PREVIEW — 2 LEMBAR A4</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border rounded-xl p-1">
              <button onClick={() => setPreviewZoom(z => Math.max(0.18, z - 0.05))} className="p-1.5 hover:bg-white rounded-lg text-slate-600 dark:text-slate-400 transition-all"><ZoomOut className="w-3.5 h-3.5" /></button>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 px-1 select-none">{Math.round(previewZoom * 100)}%</span>
              <button onClick={() => setPreviewZoom(z => Math.min(0.80, z + 0.05))} className="p-1.5 hover:bg-white rounded-lg text-slate-600 dark:text-slate-400 transition-all"><ZoomIn className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-slate-200/80 p-5 flex flex-col items-center gap-5" style={{ scrollBehavior: 'smooth' }}>
            {/* Lembar 1 */}
            <div>
              <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-2 text-center">— LEMBAR 1: SURAT KUASA —</p>
              <div style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top center', width: '210mm', boxShadow: '0 4px 24px #0003' }}>
                <div className="bg-white dark:bg-slate-900 text-black select-none" style={{ width: '210mm', minHeight: '297mm' }} dangerouslySetInnerHTML={{ __html: generatePage1HTML() }} />
              </div>
            </div>

            {/* Lembar 2 */}
            <div style={{ marginTop: `calc(${297 * (previewZoom - 1)}mm)` }}>
              <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-2 text-center">— LEMBAR 2: SURAT PERNYATAAN WARIS —</p>
              <div style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top center', width: '210mm', boxShadow: '0 4px 24px #0003' }}>
                <div className="bg-white dark:bg-slate-900 text-black select-none" style={{ width: '210mm', minHeight: '297mm' }} dangerouslySetInnerHTML={{ __html: generatePage2HTML() }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden print iframe */}
      <iframe ref={iframeRef} className="hidden" title="print-frame" />

      <PrintSuccessDialog
        isOpen={success}
        onClose={() => setSuccess(false)}
        nomorSurat={formData.nomorSurat}
        namaWarga={selectedPewaris?.name || ''}
        jenisSurat="Surat Pengurusan Taspen (SPT)"
        onBackToTemplates={onBack}
      />
    </div>
  );
}
