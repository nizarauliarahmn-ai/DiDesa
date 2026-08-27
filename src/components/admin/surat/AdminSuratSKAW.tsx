import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';
import { UnifiedResidentSearch } from '../penduduk/UnifiedResidentSearch';
import { SuggestCombobox } from './SuggestCombobox';
import { KEPERLUAN_OPTIONS } from './keperluanOptions';
import SuratEditorHeader, { getLetterHeaderTemplate } from './SuratEditorHeader';
import { useBackdateNumber } from '../../../hooks/useBackdateNumber';
import BackdateConfig from './BackdateConfig';
import { generateKopSuratHTML } from '../../../utils/letterFormat';
import { resolveKadesName } from '../../../utils/letterOfficers';
import { parseAddress } from '../../../utils/addressParser';
import { fetchResidentsCached } from '../../../utils/apiCache';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PrintSuccessDialog from './PrintSuccessDialog';
import { User, Frown, FileSignature, AlertCircle, History,
  ZoomIn, ZoomOut, Calendar, FileText, Plus, Trash2, Users
} from 'lucide-react';
import { getLetterClassifications, incrementSequenceNumber, generateLetterNumberAsync } from '../../../utils/letterClassifications';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { getPrintSignatureHTML } from '../../../utils/signature';
import { showToast } from '../../../utils/toast';
import { capitalizeResidentFields, capitalizeWords } from '../../../utils/textUtils';
import { useDragScroll } from '../../../hooks/useDragScroll';

interface Resident {
  nik: string;
  name: string;
  gender: string;
  birthPlace: string;
  birthDate: string;
  job: string;
  address: string;
  desa: string;
  fatherName: string;
  motherName: string;
  noKk?: string;
  familyRelation?: string;
  religion?: string;
  rt_rw?: string;
}

interface RtRwEntry { no: string; name: string; }

interface HeirRow {
  id: number;
  nama: string;
  hubungan: string;
  nik: string;
  ttl: string;
  pekerjaan: string;
}

interface FamilyMemberCandidate {
  resident: Resident;
  included: boolean;
}

export default function AdminSuratSKAW({ 
  onBack,
  editData,
  editLetterId,
  presetResident
}: { 
  onBack: () => void;
  editData?: any;
  editLetterId?: string | null;
  presetResident?: any;
}) {
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddInitialData, setQuickAddInitialData] = useState<{nik?: string, name?: string}>({});
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0]);
  const backdateKlas = getLetterClassifications().find(c => c.klasifikasi === 'SKAW') || { klasifikasi: 'SKAW', kodeKlasifikasi: '500' };
  const kodeKlasifikasiSKAW = backdateKlas.kodeKlasifikasi || '500';
  const { isBackdate, setIsBackdate } = useBackdateNumber(tanggalSurat, backdateKlas.klasifikasi, backdateKlas.kodeKlasifikasi);
  const [manualSequence, setManualSequence] = useState('');

  const handleCustomNomorSurat = (nomor: string) => {
    setFormData((prev: any) => ({ ...prev, nomorSurat: nomor }));
  };

  React.useEffect(() => {
    if (presetResident) {
      handleSelectResident(presetResident);
    }
  }, [presetResident]);

  const [loading, setLoading] = useState(false);
  const [useEsignature, setUseEsignature] = useState(true);
  const [success, setSuccess] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChild, setSelectedChild] = useState<Resident | null>(null);
  const [showRiwayat, setShowRiwayat] = useState(false);
  const [riwayat, setRiwayat] = useState<any[]>([]);

  const rtList: RtRwEntry[] = (() => { try { return JSON.parse(localStorage.getItem('village_rt_list') || '[]'); } catch { return []; } })();
  const rwList: RtRwEntry[] = (() => { try { return JSON.parse(localStorage.getItem('village_rw_list') || '[]'); } catch { return []; } })();

  useEffect(() => {
    if (editData) {
      setFormData(prev => ({ ...prev, ...editData }));
      if (editData.heirRows) {
        setHeirRows(editData.heirRows);
      }
    }
  }, [editData]);

  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const res = await fetchResidentsCached();
        if (res.ok) {
          const data = await res.json();
          setResidents(data);
        }
      } catch (e) {}
    };

    fetchResidents();

    const configs = getLetterClassifications();
    const skaw = configs.find(c => c.klasifikasi === 'SKAW') || { klasifikasi: 'SKAW', kodeKlasifikasi: '500' };
    
    if (!editData) {
      generateLetterNumberAsync(skaw.klasifikasi, skaw.kodeKlasifikasi || '500', isBackdate ? new Date(tanggalSurat) : undefined)
        .then(generatedNo => setFormData(prev => ({
          ...prev,
          nomorSurat: generatedNo
        })))
        .catch(err => console.error('Gagal generate nomor surat:', err));
    }

    const savedRiwayat = localStorage.getItem('riwayat_surat_skaw');
    if (savedRiwayat) setRiwayat(JSON.parse(savedRiwayat));

    const activePejabat = resolveKadesName() || '';
    try {
      const stored = localStorage.getItem('village_officers');
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find((o: any) => o.name === activePejabat);
        if (found) {
          setFormData(prev => ({ ...prev, jabatanPejabat: found.role }));
        }
      }
    } catch (e) {}
  }, []);

  const [formData, setFormData] = useState({
    nomorSurat: '',
    
    // Data Almarhum
    namaAlmarhum: '',
    nikAlmarhum: '',
    tempatLahirAlmarhum: '',
    tanggalLahirAlmarhum: '',
    jenisKelaminAlmarhum: 'Laki-Laki',
    pekerjaanAlmarhum: '',
    alamatAlmarhum: '',
    tanggalWafatAlmarhum: '',
    
    // Data Pasangan
    namaPasangan: '',
    nikPasangan: '',
    
    // Keperluan
    keperluan: 'Ahli Waris',
    
    // Pejabat
    namaPejabat: resolveKadesName() || '',
    jabatanPejabat: 'Kepala Desa',
    includeCamat: false,
    
    // Kop Settings
    namaDesa: localStorage.getItem('kop_desa') || '',
    namaKecamatan: localStorage.getItem('kop_kecamatan') || '',
    namaKabupaten: localStorage.getItem('kop_kabupaten') || '',
    namaProvinsi: localStorage.getItem('kop_provinsi') || '',
    alamatKantor: localStorage.getItem('kop_alamat') || '',
    kontakKantor: localStorage.getItem('kop_kontak') || '',
  });

  const [heirRows, setHeirRows] = useState<HeirRow[]>([
    { id: 1, nama: '', hubungan: 'Anak', nik: '', ttl: '', pekerjaan: '' },
  ]);

  const [familyMembers, setFamilyMembers] = useState<FamilyMemberCandidate[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (!formData.nikAlmarhum || formData.nikAlmarhum.length < 16) {
        setFamilyMembers([]);
        setSelectedFamilyMembers(new Set());
        return;
      }

      const selectedResident = residents.find(r => r.nik === formData.nikAlmarhum);
      if (!selectedResident || !selectedResident.noKk) {
        setFamilyMembers([]);
        setSelectedFamilyMembers(new Set());
        return;
      }

      setLoadingFamily(true);
      try {
        const res = await fetchResidentsCached(true);
        if (!res.ok) throw new Error();
        const data: Resident[] = await res.json();
        
        const family = data
          .filter(r => r.noKk === selectedResident.noKk && r.nik !== formData.nikAlmarhum)
          .sort((a, b) => {
            const priority = (rel: string = '') => {
              const r = (rel || '').toLowerCase();
              if (r.includes('istri') || r.includes('suami') || r.includes('kepala')) return 1;
              if (r.includes('anak')) return 2;
              return 3;
            };
            return priority(a.familyRelation || '') - priority(b.familyRelation || '');
          });

        const candidates: FamilyMemberCandidate[] = family.map(r => ({
          resident: r,
          included: true,
        }));

        setFamilyMembers(candidates);
        setSelectedFamilyMembers(new Set(candidates.map(c => c.resident.nik)));
      } catch (e) {
        setFamilyMembers([]);
        setSelectedFamilyMembers(new Set());
      } finally {
        setLoadingFamily(false);
      }
    };

    fetchFamilyMembers();
  }, [formData.nikAlmarhum, residents]);

  const addHeirRow = () => {
    setHeirRows(prev => [...prev, { id: Date.now(), nama: '', hubungan: 'Anak', nik: '', ttl: '', pekerjaan: '' }]);
  };

  const removeHeirRow = (id: number) => {
    if (heirRows.length <= 1) return;
    setHeirRows(prev => prev.filter(r => r.id !== id));
  };

  const updateHeirRow = (id: number, field: keyof HeirRow, value: string) => {
    setHeirRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const mapFamilyRelation = (relation: string, gender: string): string => {
    const r = (relation || '').toLowerCase();
    if (r.includes('istri')) return 'Istri';
    if (r.includes('suami')) return 'Suami';
    if (r.includes('anak')) return 'Anak';
    if (r.includes('kepala')) return gender === 'Laki-Laki' ? 'Suami' : 'Istri';
    if (r.includes('ayah') || r.includes('bapak')) return 'Ayah';
    if (r.includes('ibu')) return 'Ibu';
    return 'Lainnya';
  };

  const toggleFamilyMember = (nik: string) => {
    setSelectedFamilyMembers(prev => {
      const next = new Set(prev);
      if (next.has(nik)) {
        next.delete(nik);
      } else {
        next.add(nik);
      }
      return next;
    });
  };

  const toggleAllFamilyMembers = () => {
    if (selectedFamilyMembers.size === familyMembers.length) {
      setSelectedFamilyMembers(new Set());
    } else {
      setSelectedFamilyMembers(new Set(familyMembers.map(m => m.resident.nik)));
    }
  };

  const [previewZoom, setPreviewZoom] = useState(0.45);
  const dragProps = useDragScroll();
  const letterFont = localStorage.getItem('village_letter_font') || 'Arial, sans-serif';
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const jobs = [
    'Belum/Tidak Bekerja', 'Mengurus Rumah Tangga', 'Pelajar/Mahasiswa', 'Pensiunan',
    'Petani/Pekebun', 'Buruh Tani/Perkebunan', 'Peternak', 'Nelayan/Perikanan', 'Buruh Nelayan/Perikanan',
    'Buruh Harian Lepas', 'Pedagang', 'Wiraswasta', 'Karyawan Swasta', 'Karyawan BUMN/BUMD',
    'Sopir/Ojek', 'Tukang (Kayu/Batu/Las/Jahit, dll)', 'Mekanik', 'Pembantu Rumah Tangga',
    'Guru', 'Bidan', 'Perawat', 'Ustadz/Mubaligh',
    'Perangkat Desa', 'Kepala Desa', 'ASN (Aparatur Sipil Negara)'
  ];

  const handleAlamatBlur = (val: string) => {
    const parsed = parseAddress(val);
    setFormData(prev => ({
      ...prev,
      alamatAlmarhum: parsed.cleanAddress,
    }));
  };

  const handleSelectResident = (res: Resident) => {
    setSelectedChild(res);

    setFormData(prev => ({
      ...prev,
      namaAlmarhum: capitalizeResidentFields(res).name,
      nikAlmarhum: res.nik,
      tempatLahirAlmarhum: capitalizeResidentFields(res).birthPlace,
      tanggalLahirAlmarhum: res.birthDate,
      jenisKelaminAlmarhum: res.gender || 'Laki-Laki',
      pekerjaanAlmarhum: res.job || '',
      alamatAlmarhum: capitalizeResidentFields(res).address,
    }));
    setSearchQuery('');
  };

  const getAllHeirs = (): HeirRow[] => {
    const familyHeirs: HeirRow[] = familyMembers
      .filter(m => selectedFamilyMembers.has(m.resident.nik))
      .map((m, i) => ({
        id: parseInt(`1000${i}`),
        nama: m.resident.name || '',
        hubungan: mapFamilyRelation(m.resident.familyRelation || '', m.resident.gender || ''),
        nik: m.resident.nik || '',
        ttl: m.resident.birthPlace && m.resident.birthDate 
          ? `${m.resident.birthPlace}, ${m.resident.birthDate}`
          : '',
        pekerjaan: m.resident.job || '',
      }));
    
    const manualHeirs = heirRows.filter(r => r.nama.trim() !== '');
    
    return [...familyHeirs, ...manualHeirs];
  };

  const handlePrint = async () => {
    if (!formData.namaAlmarhum || !formData.namaAlmarhum.trim()) {
      showToast("Mohon lengkapi Nama Almarhum terlebih dahulu sebelum mencetak surat.", 'error');
      return;
    }
    if (isBackdate && !(manualSequence || '').trim()) {
      showToast('Mohon isi nomor urut surat sisipan.', 'error');
      return;
    }
    setLoading(true);

    const content = generateHTML();
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Cetak SKAW - ${formData.namaAlmarhum}</title>
          ${styles}
          <style>
            @page { size: A4; margin: 0 !important; }
            body { 
              margin: 0; 
              padding: 0; 
              background: white; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
            }
            .page { 
              width: 210mm; 
              margin: 0; 
              box-sizing: border-box; 
              background: white; 
              position: relative; 
            }
            .printable-area {
              width: 210mm !important;
              margin: 0 !important;
              padding: 56px 75px !important;
              box-sizing: border-box !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
              display: block !important;
              transform: none !important;
              visibility: visible !important;
              font-family: ${letterFont};
              font-size: 13px;
              line-height: 1.5;
            }
            .printable-area * {
              visibility: visible !important;
            }
            .crop-mark { 
              display: none !important; 
            }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
            @media print {
              body, .page { 
                width: 210mm; 
              }
              .nomor-surat-cetak { text-transform: uppercase !important; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="printable-area bg-white dark:bg-slate-900 text-black">
              ${content}
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Iframe print error:", e);
        window.print();
      }
    }, 500);

    const allHeirs = getAllHeirs();
    const updatedFields = {
      nomor: formData.nomorSurat,
      nik: formData.nikAlmarhum,
      nama: formData.namaAlmarhum,
      keperluan: formData.keperluan,
      data: formData,
      heirRows: allHeirs
    };

    if (editLetterId) {
      updateLetterHistory(editLetterId, updatedFields);
    } else {
      addLetterHistory({
        ...updatedFields,
        jenis: 'SKAW',
        tanggal: isBackdate ? new Date(tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        status: 'Selesai'
      });
      if (!isBackdate) incrementSequenceNumber('SKAW');
    }

    const newEntry = {
      id: Date.now(),
      nama: formData.namaAlmarhum,
      nomor: formData.nomorSurat,
      tanggal: isBackdate ? new Date(tanggalSurat).toISOString() : new Date().toISOString(),
      data: formData,
      heirRows: allHeirs
    };
    const updatedRiwayat = [newEntry, ...riwayat].slice(0, 50);
    setRiwayat(updatedRiwayat);
    localStorage.setItem('riwayat_surat_skaw', JSON.stringify(updatedRiwayat));
    setLoading(false);
    setSuccess(true);
  };

  const v = (val: string, fallback = '-') => (val && val.trim() !== '' ? capitalizeWords(val) : fallback);
  
  const generateHTML = () => {
    const today = new Date();
    const printDate = isBackdate ? new Date(tanggalSurat) : today;
    const tglFormatted = printDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const cleanStr = (s: string, regex: RegExp) => (s || "").replace(regex, "");
    const fmtDate = (d: string) => {
      if (!d) return '';
      try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return d;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch (e) { return d; }
    };

    const allHeirs = getAllHeirs();
    const heirRowsHTML = allHeirs.map((row, i) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:center;">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-transform:uppercase;">${v(row.nama)}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:center;">${v(row.hubungan)}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;">${v(row.nik)}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;">${v(row.ttl)}</td>
      </tr>
    `).join('');

    return `
      ${generateKopSuratHTML()}

      <div style="text-align:center;margin-bottom:15px;">
        <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">SURAT KETERANGAN AHLI WARIS</h3>
        <p class="nomor-surat-cetak" style="margin:2px 0 0 0;font-size:14px;text-transform:uppercase;">Nomor : ${v(formData.nomorSurat, '... / ... / ... / ' + (typeof printDate !== 'undefined' ? printDate : new Date()).getFullYear()).toUpperCase()}</p>
      </div>

      <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">
        Yang bertanda tangan di bawah ini:
      </p>

      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.6;font-size:14px;">
        <tr><td style="width:30%;">a. Nama</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(formData.namaPejabat)}</strong></td></tr>
        <tr><td>b. Jabatan</td><td>:</td><td><strong style="text-transform:uppercase;">${v(formData.jabatanPejabat)} Desa ${cleanStr(v(formData.namaDesa), /^(desa|kelurahan)\s+/i)}</strong></td></tr>
      </table>

      <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">
        Menerangkan dengan sebenarnya bahwa orang-orang yang namanya tersebut di bawah ini adalah ahli waris yang sah dari almarhum/almarhumah:
      </p>

      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
        <tr><td style="width:30%;">a. Nama Almarhum/ah</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(formData.namaAlmarhum)}</strong></td></tr>
        <tr><td>b. NIK</td><td>:</td><td>${v(formData.nikAlmarhum)}</td></tr>
        <tr><td>c. Tempat, Tanggal Lahir</td><td>:</td><td>${v(formData.tempatLahirAlmarhum)}, ${fmtDate(formData.tanggalLahirAlmarhum)}</td></tr>
        <tr><td>d. Jenis Kelamin</td><td>:</td><td>${v(formData.jenisKelaminAlmarhum)}</td></tr>
        <tr><td>e. Pekerjaan</td><td>:</td><td>${v(formData.pekerjaanAlmarhum)}</td></tr>
        <tr><td style="vertical-align:top;">f. Alamat</td><td style="vertical-align:top;">:</td><td>${v(formData.alamatAlmarhum)}</td></tr>
        <tr><td>g. Tanggal Wafat</td><td>:</td><td>${fmtDate(formData.tanggalWafatAlmarhum)}</td></tr>
        ${formData.namaPasangan ? `<tr><td>h. Nama Pasangan (Istri/Suami)</td><td>:</td><td><strong style="text-transform:uppercase;">${v(formData.namaPasangan)}</strong> (NIK: ${v(formData.nikPasangan)})</td></tr>` : ''}
      </table>

      <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">
        Adapun ahli waris dari almarhum/almarhumah tersebut adalah sebagai berikut:
      </p>

      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:15px;margin-left:40px;line-height:1.5;font-size:13px;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="padding:6px 8px;border:1px solid #ccc;width:5%;">No</th>
            <th style="padding:6px 8px;border:1px solid #ccc;width:25%;">Nama</th>
            <th style="padding:6px 8px;border:1px solid #ccc;width:15%;">Hubungan</th>
            <th style="padding:6px 8px;border:1px solid #ccc;width:18%;">NIK</th>
            <th style="padding:6px 8px;border:1px solid #ccc;width:37%;">Tempat, Tanggal Lahir</th>
          </tr>
        </thead>
        <tbody>
          ${heirRowsHTML}
        </tbody>
      </table>
      ${allHeirs.length > 8 ? `<p style="text-align:center;font-size:11px;color:#666;font-style:italic;margin-top:-10px;margin-bottom:15px;">* Menampilkan ${allHeirs.length} ahli waris - halaman akan otomatis bertambah saat dicetak</p>` : ''}

      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi <strong>${v(formData.keperluan)}</strong>.
      </p>

      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:25px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>

      ${getPrintSignatureHTML(
        formData.namaDesa,
        tglFormatted,
        formData.namaPejabat,
        formData.jabatanPejabat,
        (() => {
          try {
            const officersList = JSON.parse(localStorage.getItem('village_officers') || '[]');
            const found = officersList.find((o: any) => o.name === formData.namaPejabat);
            return found?.nip || '-';
          } catch(e) {
            return '-';
          }
        })(),
        formData.includeCamat,
        useEsignature,
        formData.nomorSurat
      )}
      <div style="position:absolute;bottom:8mm;left:15mm;right:15mm;width:calc(100% - 30mm);">
        ${SAAS_CONFIG.globalFooterHTML}
      </div>
    `;
  };

  const filteredResidents = residents.filter(r => 
    (r.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
    (r.nik || '').includes(searchQuery || '')
  ).slice(0, 5);

  return (
    <div className="w-full flex-1 min-w-0 space-y-6 pb-20">
      <SuratEditorHeader 
          template={getLetterHeaderTemplate('SKAW', { kode: '500', jenis: 'Surat Keterangan Ahli Waris', deskripsi: 'Surat Keterangan Ahli Waris', nomorSurat: formData.nomorSurat })}
          icon={<Frown className="w-5 h-5" />}
          onBack={onBack}
          onPrint={handlePrint}
          printLabel="Cetak Surat"
        />

      <AnimatePresence>
        {showRiwayat && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none p-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                Riwayat Pembuatan SKAW
              </h2>
              <button 
                onClick={() => {
                  if (confirm('Kosongkan riwayat?')) {
                    setRiwayat([]);
                    localStorage.removeItem('riwayat_surat_skaw');
                  }
                }}
                className="text-xs text-rose-500 font-bold hover:underline"
              >
                Hapus Semua
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {riwayat.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Belum ada riwayat cetak.</p>
              ) : riwayat.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    setFormData(item.data);
                    if (item.heirRows) setHeirRows(item.heirRows);
                  }}
                  className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-emerald-200 hover:bg-emerald-50 cursor-pointer transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{item.nama}</p>
                      <p className="text-[10px] text-slate-400">{item.nomor || 'No Nomor'}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(item.tanggal).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">

          <BackdateConfig
            prefix={kodeKlasifikasiSKAW}
            suffix="WHI-SKAW"
            tanggalSurat={tanggalSurat}
            onTanggalSuratChange={setTanggalSurat}
            isBackdate={isBackdate}
            onBackdateChange={setIsBackdate}
            manualSequence={manualSequence}
            onManualSequenceChange={setManualSequence}
            normalNomor={formData.nomorSurat}
            onCustomNomorSurat={handleCustomNomorSurat}
          />

          {/* Card: Data Almarhum */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Data Almarhum/ah</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <UnifiedResidentSearch
                formData={formData}
                setFormData={setFormData}
                residents={residents}
                namaFieldName="namaAlmarhum"
                nikFieldName="nikAlmarhum"
                namaLabel="Nama Almarhum/ah"
                nikLabel="NIK Almarhum"
                placeholderNama="Ketik nama almarhum..."
                placeholderNik="Ketik NIK almarhum..."
                fieldMappings={{
                  tempatLahir: 'tempatLahirAlmarhum',
                  tanggalLahir: 'tanggalLahirAlmarhum',
                  jenisKelamin: 'jenisKelaminAlmarhum',
                  pekerjaan: 'pekerjaanAlmarhum',
                  alamat: 'alamatAlmarhum',
                }}
                onOpenQuickAdd={(nik, name) => {
                  setQuickAddInitialData({ nik: nik || formData.nikAlmarhum, name: name || formData.namaAlmarhum });
                  setShowQuickAddModal(true);
                }}
              />
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Jenis Kelamin</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  value={formData.jenisKelaminAlmarhum}
                  onChange={(e) => setFormData({...formData, jenisKelaminAlmarhum: e.target.value})}
                >
                  <option value="Laki-Laki">Laki-Laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                <SuggestCombobox
                  value={formData.pekerjaanAlmarhum}
                  onChange={(v) => setFormData({...formData, pekerjaanAlmarhum: v})}
                  options={jobs}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                <input 
                  type="text"
                  placeholder="Contoh: Kandangan"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  value={formData.tempatLahirAlmarhum}
                  onChange={(e) => setFormData({...formData, tempatLahirAlmarhum: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  value={formData.tanggalLahirAlmarhum}
                  onChange={(e) => setFormData({...formData, tanggalLahirAlmarhum: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Wafat</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  value={formData.tanggalWafatAlmarhum}
                  onChange={(e) => setFormData({...formData, tanggalWafatAlmarhum: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Jl. Keramat, Desa Wasah Hilir"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                  value={formData.alamatAlmarhum}
                  onChange={(e) => setFormData(prev => ({ ...prev, alamatAlmarhum: e.target.value }))}
                  onBlur={(e) => handleAlamatBlur(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Card: Data Pasangan */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Data Pasangan (Istri/Suami)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Pasangan</label>
                <input 
                  type="text"
                  placeholder="Nama lengkap pasangan"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  value={formData.namaPasangan}
                  onChange={(e) => setFormData({...formData, namaPasangan: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK Pasangan</label>
                <input 
                  type="text"
                  placeholder="NIK pasangan"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  value={formData.nikPasangan}
                  onChange={(e) => setFormData({...formData, nikPasangan: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Card: Daftar Ahli Waris */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Daftar Ahli Waris</h3>
              </div>
            </div>

            {/* Loading State */}
            {loadingFamily && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                <span className="ml-3 text-sm text-slate-500">Memuat data anggota keluarga...</span>
              </div>
            )}

            {/* Family Members from Database */}
            {!loadingFamily && familyMembers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Anggota Keluarga dari KK yang Sama ({familyMembers.length} orang)
                  </p>
                  <button
                    type="button"
                    onClick={toggleAllFamilyMembers}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    {selectedFamilyMembers.size === familyMembers.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
                  {familyMembers.map((candidate) => {
                    const res = candidate.resident;
                    const isSelected = selectedFamilyMembers.has(res.nik);
                    const relation = mapFamilyRelation(res.familyRelation || '', res.gender || '');
                    const ttl = res.birthPlace && res.birthDate 
                      ? `${res.birthPlace}, ${new Date(res.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : '-';
                    
                    return (
                      <label
                        key={res.nik}
                        className={`flex items-center gap-4 p-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFamilyMember(res.nik)}
                          className="w-4 h-4 text-emerald-600 bg-white border-slate-300 rounded focus:ring-emerald-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{res.name}</p>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-full">
                              {relation}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            NIK: {res.nik} &bull; {ttl}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                
                <p className="text-[10px] text-emerald-600 font-medium italic">
                  * Centang anggota keluarga yang akan dimasukkan sebagai ahli waris dalam surat.
                </p>
              </div>
            )}

            {/* Manual Input Section */}
            {!loadingFamily && familyMembers.length === 0 && formData.nikAlmarhum && (
              <div className="bg-amber-50/50 dark:bg-amber-900/20 rounded-xl border border-amber-200/50 dark:border-amber-800/50 p-4 mb-4">
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                  Tidak ditemukan data anggota keluarga untuk NIK ini. Silakan tambahkan ahli waris secara manual.
                </p>
              </div>
            )}

            {/* Manual Heir Rows */}
            <div className="space-y-4">
              {heirRows.map((row, index) => (
                <div key={row.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Ahli Waris Manual #{index + 1}</span>
                    {heirRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeHeirRow(row.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                      <input 
                        type="text"
                        placeholder="Nama ahli waris"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                        value={row.nama}
                        onChange={(e) => updateHeirRow(row.id, 'nama', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Hubungan</label>
                      <select 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                        value={row.hubungan}
                        onChange={(e) => updateHeirRow(row.id, 'hubungan', e.target.value)}
                      >
                        <option value="Anak">Anak</option>
                        <option value="Istri">Istri</option>
                        <option value="Suami">Suami</option>
                        <option value="Orang Tua">Orang Tua</option>
                        <option value="Saudara">Saudara</option>
                        <option value="Cucu">Cucu</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK</label>
                      <input 
                        type="text"
                        placeholder="NIK ahli waris"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                        value={row.nik}
                        onChange={(e) => updateHeirRow(row.id, 'nik', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat, Tanggal Lahir</label>
                      <input 
                        type="text"
                        placeholder="Contoh: Kandangan, 01-01-1990"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                        value={row.ttl}
                        onChange={(e) => updateHeirRow(row.id, 'ttl', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                      <SuggestCombobox
                        value={row.pekerjaan}
                        onChange={(v) => updateHeirRow(row.id, 'pekerjaan', v)}
                        options={jobs}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addHeirRow}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold transition-colors border-2 border-dashed border-emerald-200"
              >
                <Plus className="w-4 h-4" />
                Tambah Ahli Waris Manual
              </button>
            </div>
          </div>

          {/* Card: Keperluan Surat */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Keperluan Surat</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Keperluan Surat (Diberikan Untuk...)</label>
              <SuggestCombobox
                value={formData.keperluan}
                onChange={(v) => setFormData({...formData, keperluan: v})}
                options={KEPERLUAN_OPTIONS}
                placeholder="Contoh: Pembagian Harta Waris"
              />
              <p className="mt-1 text-[10px] text-emerald-600 font-medium">* Tuliskan secara spesifik tujuan pembuatan surat ini.</p>
            </div>
          </div>

          {/* Card: Pejabat Penandatangan */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <FileSignature className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Pejabat Penandatangan</h3>
            </div>
            <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-amber-900">Nama Pejabat</label>
                  <select 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold"
                    value={formData.namaPejabat}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData(prev => ({ ...prev, namaPejabat: name }));
                      try {
                        const stored = localStorage.getItem('village_officers');
                        if (stored) {
                          const list = JSON.parse(stored);
                          const found = list.find((o: any) => o.name === name);
                          if (found) setFormData(prev => ({ ...prev, jabatanPejabat: found.role }));
                        }
                      } catch (e) {}
                    }}
                    >
                      {(() => {
                        try {
                          const stored = localStorage.getItem('village_officers');
                          if (stored) {
                            const list = JSON.parse(stored);
                            return list.map((o: any, i: number) => (
                              <option key={i} value={o.name}>{o.name} ({o.role})</option>
                            ));
                          }
                        } catch (e) {}
                        return <option value={resolveKadesName() || 'Kepala Desa'}>{resolveKadesName() || 'Kepala Desa'} (Kepala Desa)</option>;
                      })()}
                    </select>
                  </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-amber-100 space-y-3">
                <label className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50/50 transition-all">
                  <div className="space-y-0.5 pr-4">
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tanda Tangan Elektronik (TTE / QR Code)</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Tampilkan QR Code verifikasi dokumen resmi pada hasil cetak</div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={useEsignature} 
                      onChange={(e) => setUseEsignature(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                  </div>
                </label>

                <label className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50/50 transition-all">
                  <div className="space-y-0.5 pr-4">
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tambahkan Kolom Mengetahui Camat</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Gunakan format 2 tanda tangan (Camat di sebelah kiri)</div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={formData.includeCamat} 
                      onChange={(e) => setFormData(prev => ({ ...prev, includeCamat: e.target.checked }))}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                  </div>
                </label>
              </div>

              <p className="mt-4 text-[10px] text-amber-700 font-medium italic">
                * Nama dan jabatan pejabat dapat diatur secara permanen melalui Menu Pengaturan.
              </p>
            </div>
          </div>
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-[170px] space-y-6">
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-900 text-xs">Informasi Penting & Cetak</h4>
                <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                  Pastikan data almarhum dan ahli waris sudah sesuai. 
                  Gunakan fitur pencarian untuk meminimalkan kesalahan pengetikan. Jika tombol cetak tidak merespon, silakan gunakan menu <strong>Buka di Tab Baru</strong>.
                </p>
              </div>
            </div>

            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-md flex flex-col sticky top-[170px]">
              <div className="px-5 py-3 border-b border-slate-100/60 dark:border-slate-800/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">LIVE A4 ENGINE</span>
                </div>
                
                <div className="flex items-center gap-1.5 bg-white/60 dark:bg-slate-800/60 p-1 rounded-lg border border-slate-100/40 dark:border-slate-800/40">
                  <button 
                    onClick={() => setPreviewZoom(prev => Math.max(0.3, prev - 0.05))} 
                    className="p-1.5 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 px-1.5 w-12 text-center">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button 
                    onClick={() => setPreviewZoom(prev => Math.min(1.5, prev + 0.05))} 
                    className="p-1.5 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <div className="w-px h-4 bg-slate-200/60 mx-0.5"></div>
                  <button 
                    onClick={() => setPreviewZoom(0.45)} 
                    className="p-1.5 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-colors text-[10px] font-bold"
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                </div>
              </div>
              
              <div 
                ref={dragProps.ref}
                onMouseDown={dragProps.onMouseDown}
                onMouseLeave={dragProps.onMouseLeave}
                onMouseUp={dragProps.onMouseUp}
                onMouseMove={dragProps.onMouseMove}
                style={{ ...dragProps.style }}
                className="bg-slate-100/60 dark:bg-slate-800/40 overflow-auto relative flex p-6 justify-center"
              >
                <div 
                  style={{
                    width: `${794 * previewZoom}px`,
                    height: `${1123 * previewZoom}px`,
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: '0 4px 24px -4px rgb(0 0 0 / 0.12)',
                    borderRadius: '2px',
                    transition: 'width 0.2s ease-out, height 0.2s ease-out'
                  }}
                  className="bg-white dark:bg-slate-900 m-auto shrink-0 relative"
                >
                  <div className="absolute top-6 left-6 w-4 h-4 border-t border-l border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>
                  <div className="absolute top-6 right-6 w-4 h-4 border-t border-r border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>
                  <div className="absolute bottom-6 left-6 w-4 h-4 border-b border-l border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>
                  <div className="absolute bottom-6 right-6 w-4 h-4 border-b border-r border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>

                  <div 
                    className="bg-white dark:bg-slate-900 shrink-0"
                    style={{ 
                      width: '794px', 
                      height: '1123px', 
                      padding: '56px 75px',
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'top left',
                      fontFamily: letterFont,
                      fontSize: '13px',
                      lineHeight: '1.45',
                      position: 'relative',
                      color: 'black',
                      boxSizing: 'border-box'
                    }}
                    dangerouslySetInnerHTML={{ __html: generateHTML() }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <iframe 
        ref={iframeRef} 
        style={{ 
          position: 'absolute', 
          width: '0', 
          height: '0', 
          border: 'none', 
          opacity: '0', 
          pointerEvents: 'none' 
        }} 
        title="Print Frame" 
      />

      <PrintSuccessDialog
        isOpen={success}
        onClose={() => setSuccess(false)}
        nomorSurat={formData.nomorSurat}
        namaWarga={formData.namaAlmarhum}
        jenisSurat="Surat Keterangan Ahli Waris (SKAW)"
        onBackToTemplates={onBack}
      />
      <QuickAddResidentModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        initialData={quickAddInitialData}
        onSuccess={(savedData) => {
          setFormData((prev: any) => ({
            ...prev,
            nikAlmarhum: savedData.nik,
            namaAlmarhum: savedData.name,
            tempatLahirAlmarhum: savedData.birth_place,
            tanggalLahirAlmarhum: savedData.birth_date,
            jenisKelaminAlmarhum: savedData.gender,
            pekerjaanAlmarhum: savedData.job,
            alamatAlmarhum: savedData.address,
          }));
          setShowQuickAddModal(false);
        }}
      />
    </div>
  );
}