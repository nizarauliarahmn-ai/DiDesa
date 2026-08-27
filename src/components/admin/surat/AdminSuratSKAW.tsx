import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';
import { UnifiedResidentSearch } from '../penduduk/UnifiedResidentSearch';
import { SuggestCombobox } from './SuggestCombobox';
import { KEPERLUAN_OPTIONS } from './keperluanOptions';
import SuratEditorHeader, { getLetterHeaderTemplate } from './SuratEditorHeader';
import { useBackdateNumber } from '../../../hooks/useBackdateNumber';
import BackdateConfig from './BackdateConfig';
import { generateKopSuratHTML } from '../../../utils/letterFormat';
import { resolveKadesName, getOfficerOptions, resolveKadesOfficer } from '../../../utils/letterOfficers';
import { parseAddress } from '../../../utils/addressParser';
import { fetchResidentsCached } from '../../../utils/apiCache';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PrintSuccessDialog from './PrintSuccessDialog';
import { 
  User, Users, FileSignature, AlertCircle, History,
  ZoomIn, ZoomOut, Calendar, FileText, Plus, Trash2, Edit3, CheckCircle2, Search, X
} from 'lucide-react';
import { getLetterClassifications, incrementSequenceNumber, generateLetterNumberAsync } from '../../../utils/letterClassifications';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { getPrintSignatureHTML } from '../../../utils/signature';
import { showToast } from '../../../utils/toast';
import { capitalizeResidentFields, capitalizeWords } from '../../../utils/textUtils';
import { useDragScroll } from '../../../hooks/useDragScroll';
import PejabatPenandatanganCard from './PejabatPenandatanganCard';

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
}

interface RtRwEntry { no: string; name: string; }

interface HeirRow {
  id: string;
  nama: string;
  nik: string;
  hubungan: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  agama: string;
  pekerjaan: string;
  alamat: string;
  rt: string;
  rw: string;
}

const JOBS_OPTIONS = [
  'Belum/Tidak Bekerja', 'Mengurus Rumah Tangga', 'Pelajar/Mahasiswa', 'Pensiunan',
  'Petani/Pekebun', 'Buruh Tani/Perkebunan', 'Peternak', 'Nelayan/Perikanan', 'Buruh Nelayan/Perikanan',
  'Buruh Harian Lepas', 'Pedagang', 'Wiraswasta', 'Karyawan Swasta', 'Karyawan BUMN/BUMD',
  'Sopir/Ojek', 'Tukang (Kayu/Batu/Las/Jahit, dll)', 'Mekanik', 'Pembantu Rumah Tangga',
  'Guru', 'Bidan', 'Perawat', 'Ustadz/Mubaligh',
  'Perangkat Desa', 'Kepala Desa', 'ASN (Aparatur Sipil Negara)'
];

const HUBUNGAN_OPTIONS = [
  'Anak Kandung',
  'Istri',
  'Suami',
  'Anak Angkat',
  'Cucu',
  'Orang Tua',
  'Saudara Kandung',
  'Ahli Waris Lainnya'
];

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
  const backdateKlas = getLetterClassifications().find(c => c.klasifikasi === 'SKAW') || { klasifikasi: 'SKAW', kodeKlasifikasi: '474' };
  const kodeKlasifikasiSKAW = backdateKlas.kodeKlasifikasi || '474';
  const { isBackdate, setIsBackdate } = useBackdateNumber(tanggalSurat, backdateKlas.klasifikasi, backdateKlas.kodeKlasifikasi);
  const [manualSequence, setManualSequence] = useState('');

  const [loading, setLoading] = useState(false);
  const [useEsignature, setUseEsignature] = useState(true);
  const [success, setSuccess] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [showRiwayat, setShowRiwayat] = useState(false);
  const [riwayat, setRiwayat] = useState<any[]>([]);
  
  // Heirs modal & editing states
  const [heirs, setHeirs] = useState<HeirRow[]>([]);
  const [showAddHeirModal, setShowAddHeirModal] = useState(false);
  const [editingHeirId, setEditingHeirId] = useState<string | null>(null);
  const [heirSearchQuery, setHeirSearchQuery] = useState('');
  
  const [tempHeir, setTempHeir] = useState<HeirRow>({
    id: '',
    nama: '',
    nik: '',
    hubungan: 'Anak Kandung',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: 'Laki-Laki',
    agama: 'Islam',
    pekerjaan: 'Belum/Tidak Bekerja',
    alamat: '',
    rt: '001',
    rw: '001'
  });

  const rtList: RtRwEntry[] = (() => { try { return JSON.parse(localStorage.getItem('village_rt_list') || '[]'); } catch { return []; } })();
  const rwList: RtRwEntry[] = (() => { try { return JSON.parse(localStorage.getItem('village_rw_list') || '[]'); } catch { return []; } })();

  // Form State
  const [formData, setFormData] = useState({
    nomorSurat: '',
    
    // Data Almarhum (Pewaris)
    nama: '',
    nik: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: 'Laki-Laki',
    agama: 'Islam',
    pekerjaan: 'Pensiunan',
    statusPerkawinan: 'Kawin',
    alamat: '',
    rt: '001',
    rw: '001',
    
    // Data Kematian
    tanggalMeninggal: '',
    tempatMeninggal: '',
    
    // Data Pasangan
    namaPasangan: '',
    nikPasangan: '',
    statusPasangan: 'Masih Hidup',
    
    // Keperluan
    keperluan: 'Kelengkapan Berkas Ahli Waris / Administrasi Pertanahan & Perbankan',
    
    // Pejabat
    namaPejabat: resolveKadesName() || '',
    jabatanPejabat: 'Kepala Desa',
    nipPejabat: resolveKadesOfficer()?.nip || '',
    includeCamat: false,
    
    // Kop Settings
    namaDesa: localStorage.getItem('kop_desa') || '',
    namaKecamatan: localStorage.getItem('kop_kecamatan') || '',
    namaKabupaten: localStorage.getItem('kop_kabupaten') || '',
    namaProvinsi: localStorage.getItem('kop_provinsi') || '',
    alamatKantor: localStorage.getItem('kop_alamat') || '',
    kontakKantor: localStorage.getItem('kop_kontak') || '',
  });

  const [previewZoom, setPreviewZoom] = useState(0.45);
  const dragProps = useDragScroll();
  const letterFont = localStorage.getItem('village_letter_font') || 'Arial, sans-serif';
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleCustomNomorSurat = (nomor: string) => {
    setFormData((prev: any) => ({ ...prev, nomorSurat: nomor }));
  };

  // Auto-fill from preset resident if provided
  useEffect(() => {
    if (presetResident) {
      handleSelectResident(presetResident);
    }
  }, [presetResident]);

  // Load editData if in edit mode
  useEffect(() => {
    if (editData) {
      setFormData(prev => ({ ...prev, ...editData }));
      if (editData.heirs && Array.isArray(editData.heirs)) {
        setHeirs(editData.heirs);
      }
    }
  }, [editData]);

  // Initial load
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

    if (!editData) {
      generateLetterNumberAsync('SKAW', kodeKlasifikasiSKAW, isBackdate ? new Date(tanggalSurat) : undefined)
        .then(generatedNo => setFormData(prev => ({
          ...prev,
          nomorSurat: generatedNo
        })))
        .catch(err => console.error('Gagal generate nomor surat SKAW:', err));
    }

    const savedRiwayat = localStorage.getItem('riwayat_surat_skaw');
    if (savedRiwayat) {
      try {
        setRiwayat(JSON.parse(savedRiwayat));
      } catch (e) {}
    }

    const activePejabat = resolveKadesName() || '';
    try {
      const stored = localStorage.getItem('village_officers');
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find((o: any) => o.name === activePejabat);
        if (found) {
          setFormData(prev => ({ 
            ...prev, 
            jabatanPejabat: found.role || 'Kepala Desa',
            nipPejabat: found.nip || ''
          }));
        }
      }
    } catch (e) {}
  }, []);

  const handleSelectResident = (res: Resident) => {
    const cap = capitalizeResidentFields(res);
    const rt_rw = (res as any).rt_rw || '001/001';
    const [rt, rw] = rt_rw.split('/');

    setFormData(prev => ({
      ...prev,
      nama: cap.name,
      nik: res.nik,
      tempatLahir: cap.birthPlace,
      tanggalLahir: res.birthDate,
      jenisKelamin: res.gender || 'Laki-Laki',
      agama: (res as any).religion || 'Islam',
      pekerjaan: res.job || '',
      statusPerkawinan: (res as any).status_kawin || (res as any).statusPerkawinan || 'Kawin',
      alamat: cap.address,
      rt: rt || '001',
      rw: rw || '001',
    }));
  };

  const handleAlamatBlur = (val: string) => {
    const parsed = parseAddress(val);
    setFormData(prev => ({
      ...prev,
      alamat: parsed.cleanAddress,
      ...(parsed.rt ? { rt: parsed.rt } : {}),
      ...(parsed.rw ? { rw: parsed.rw } : {})
    }));
  };

  // Format Indo Date
  const formatIndoDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const currentDateFormatted = () => {
    const d = isBackdate && tanggalSurat ? new Date(tanggalSurat) : new Date();
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Add / Edit Heir
  const openAddHeirModal = () => {
    setEditingHeirId(null);
    setHeirSearchQuery('');
    setTempHeir({
      id: 'heir_' + Date.now().toString(),
      nama: '',
      nik: '',
      hubungan: 'Anak Kandung',
      tempatLahir: '',
      tanggalLahir: '',
      jenisKelamin: 'Laki-Laki',
      agama: 'Islam',
      pekerjaan: 'Pelajar/Mahasiswa',
      alamat: formData.alamat || '',
      rt: formData.rt || '001',
      rw: formData.rw || '001'
    });
    setShowAddHeirModal(true);
  };

  const openEditHeirModal = (heir: HeirRow) => {
    setEditingHeirId(heir.id);
    setHeirSearchQuery('');
    setTempHeir({ ...heir });
    setShowAddHeirModal(true);
  };

  const saveHeir = () => {
    if (!tempHeir.nama || !tempHeir.nama.trim()) {
      showToast('Nama ahli waris wajib diisi', 'error');
      return;
    }

    if (editingHeirId) {
      setHeirs(prev => prev.map(h => h.id === editingHeirId ? tempHeir : h));
      showToast('Data ahli waris diperbarui', 'success');
    } else {
      setHeirs(prev => [...prev, { ...tempHeir, id: 'heir_' + Date.now().toString() }]);
      showToast('Ahli waris berhasil ditambahkan', 'success');
    }
    setShowAddHeirModal(false);
  };

  const deleteHeir = (id: string) => {
    setHeirs(prev => prev.filter(h => h.id !== id));
    showToast('Ahli waris dihapus', 'info');
  };

  const handleSelectResidentForHeir = (res: Resident) => {
    const cap = capitalizeResidentFields(res);
    const rt_rw = (res as any).rt_rw || '001/001';
    const [rt, rw] = rt_rw.split('/');

    setTempHeir(prev => ({
      ...prev,
      nama: cap.name,
      nik: res.nik,
      tempatLahir: cap.birthPlace,
      tanggalLahir: res.birthDate,
      jenisKelamin: res.gender || 'Laki-Laki',
      agama: (res as any).religion || 'Islam',
      pekerjaan: res.job || 'Belum/Tidak Bekerja',
      alamat: cap.address,
      rt: rt || '001',
      rw: rw || '001'
    }));
    setHeirSearchQuery('');
  };

  // Generate Letter HTML
  const generateHTML = () => {
    const kopHTML = generateKopSuratHTML();
    const activeDesa = formData.namaDesa || localStorage.getItem('kop_desa') || 'Wasah Hilir';

    return `
      ${kopHTML}
      
      <div class="text-center mb-6 mt-4">
        <h6 class="font-bold underline uppercase text-[15px] tracking-wide" style="letter-spacing: 0.5px; margin-bottom: 2px;">
          SURAT KETERANGAN AHLI WARIS
        </h6>
        <p class="text-[12px] font-mono mt-0 uppercase nomor-surat-cetak">Nomor: ${formData.nomorSurat || '---'}</p>
      </div>

      <div class="text-justify leading-relaxed text-[12px] space-y-3">
        <p style="text-indent: 28px; margin-bottom: 8px;">
          Yang bertanda tangan di bawah ini, Kepala Desa <strong>${activeDesa}</strong>, Kecamatan <strong>${formData.namaKecamatan || 'Simpur'}</strong>, Kabupaten <strong>${formData.namaKabupaten || 'Hulu Sungai Selatan'}</strong>, Provinsi <strong>${formData.namaProvinsi || 'Kalimantan Selatan'}</strong>, dengan ini menerangkan dengan sebenarnya bahwa:
        </p>

        <!-- DATA PEWARIS / ALMARHUM -->
        <table style="width: 100%; border-collapse: collapse; margin-left: 12px; margin-bottom: 8px; font-size: 12px;">
          <tr>
            <td style="width: 170px; vertical-align: top; padding: 1.5px 0;">Nama Lengkap</td>
            <td style="width: 15px; vertical-align: top; padding: 1.5px 0;">:</td>
            <td style="font-weight: bold; padding: 1.5px 0; text-transform: uppercase;">${formData.nama || '...........................................'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 1.5px 0;">NIK</td>
            <td style="vertical-align: top; padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0;">${formData.nik || '...........................................'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 1.5px 0;">Tempat / Tgl. Lahir</td>
            <td style="vertical-align: top; padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0;">${formData.tempatLahir ? `${formData.tempatLahir}, ${formatIndoDate(formData.tanggalLahir)}` : '...........................................'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 1.5px 0;">Jenis Kelamin</td>
            <td style="vertical-align: top; padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0;">${formData.jenisKelamin || '-'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 1.5px 0;">Agama / Pekerjaan</td>
            <td style="vertical-align: top; padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0;">${formData.agama || '-'} / ${formData.pekerjaan || '-'}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; padding: 1.5px 0;">Alamat Semasa Hidup</td>
            <td style="vertical-align: top; padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0;">${formData.alamat ? `${formData.alamat} RT.${formData.rt || '001'} RW.${formData.rw || '001'}` : '...........................................'}</td>
          </tr>
          ${formData.tanggalMeninggal ? `
          <tr>
            <td style="vertical-align: top; padding: 1.5px 0;">Meninggal Dunia Pada</td>
            <td style="vertical-align: top; padding: 1.5px 0;">:</td>
            <td style="padding: 1.5px 0; font-weight: 600;">${formatIndoDate(formData.tanggalMeninggal)} ${formData.tempatMeninggal ? `di ${formData.tempatMeninggal}` : ''}</td>
          </tr>
          ` : ''}
        </table>

        <p style="text-indent: 28px; margin-bottom: 8px;">
          Telah meninggal dunia dan meninggalkan ahli waris yang sah sebagaimana tercantum di bawah ini:
        </p>

        <!-- TABEL AHLI WARIS -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 12px; font-size: 11px; border: 1px solid #333;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #333; padding: 4px; width: 28px; text-align: center;">No</th>
              <th style="border: 1px solid #333; padding: 4px; text-align: left;">Nama Lengkap</th>
              <th style="border: 1px solid #333; padding: 4px; width: 110px; text-align: center;">NIK</th>
              <th style="border: 1px solid #333; padding: 4px; width: 100px; text-align: left;">Hubungan</th>
              <th style="border: 1px solid #333; padding: 4px; text-align: left;">Tempat & Tgl. Lahir</th>
              <th style="border: 1px solid #333; padding: 4px; width: 90px; text-align: left;">Pekerjaan</th>
            </tr>
          </thead>
          <tbody>
            ${heirs.length === 0 ? `
              <tr>
                <td colspan="6" style="border: 1px solid #333; padding: 8px; text-align: center; color: #888; font-style: italic;">
                  (Belum ada data ahli waris yang ditambahkan)
                </td>
              </tr>
            ` : heirs.map((h, idx) => `
              <tr>
                <td style="border: 1px solid #333; padding: 3px 4px; text-align: center; vertical-align: middle;">${idx + 1}</td>
                <td style="border: 1px solid #333; padding: 3px 4px; font-weight: 600; text-transform: uppercase;">${h.nama}</td>
                <td style="border: 1px solid #333; padding: 3px 4px; text-align: center; font-family: monospace;">${h.nik || '-'}</td>
                <td style="border: 1px solid #333; padding: 3px 4px;">${h.hubungan}</td>
                <td style="border: 1px solid #333; padding: 3px 4px;">${h.tempatLahir ? `${h.tempatLahir}, ${formatIndoDate(h.tanggalLahir)}` : '-'}</td>
                <td style="border: 1px solid #333; padding: 3px 4px;">${h.pekerjaan || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p style="text-indent: 28px; margin-bottom: 8px;">
          Surat Keterangan Ahli Waris ini diberikan untuk keperluan: <strong>${formData.keperluan || 'Administrasi Hak Waris'}</strong>.
        </p>

        <p style="text-indent: 28px; margin-bottom: 16px;">
          Demikian Surat Keterangan Ahli Waris ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya oleh yang berkepentingan.
        </p>
      </div>

      <!-- TANDA TANGAN -->
      ${getPrintSignatureHTML(
        activeDesa,
        currentDateFormatted(),
        formData.namaPejabat,
        formData.jabatanPejabat,
        formData.nipPejabat,
        formData.includeCamat,
        formData.nomorSurat,
        'SKAW',
        useEsignature
      )}

      <div style="position:absolute;bottom:8mm;left:15mm;right:15mm;width:calc(100% - 30mm);">
        ${SAAS_CONFIG.globalFooterHTML}
      </div>
    `;
  };

  // Handle Print Action
  const handlePrint = async () => {
    if (!formData.nama || !formData.nama.trim()) {
      showToast('Mohon lengkapi Nama Pewaris / Almarhum terlebih dahulu.', 'error');
      return;
    }
    if (heirs.length === 0) {
      showToast('Mohon tambahkan minimal 1 orang Ahli Waris.', 'error');
      return;
    }
    if (isBackdate && !(manualSequence || '').trim()) {
      showToast('Mohon isi nomor urut surat sisipan.', 'error');
      return;
    }

    setLoading(true);

    const content = generateHTML();
    const iframe = iframeRef.current;
    if (!iframe) {
      setLoading(false);
      return;
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      setLoading(false);
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Cetak SKAW - ${formData.nama}</title>
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
              height: 297mm; 
              margin: 0; 
              box-sizing: border-box; 
              background: white; 
              position: relative; 
              overflow: hidden;
            }
            .printable-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
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
              font-size: 12px;
              line-height: 1.5;
            }
            .printable-area * {
              visibility: visible !important;
            }
            @media print {
              body, .page { 
                width: 210mm; 
                height: 297mm; 
              }
              .nomor-surat-cetak { text-transform: uppercase !important; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="printable-area bg-white text-black">
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

    // Record to global history
    const payloadHistory = {
      nomor: formData.nomorSurat,
      nik: formData.nik,
      nama: formData.nama,
      keperluan: formData.keperluan,
      heirs: heirs,
      data: { ...formData, heirs }
    };

    if (editLetterId) {
      updateLetterHistory(editLetterId, payloadHistory);
      showToast('Surat SKAW berhasil diperbarui!', 'success');
    } else {
      addLetterHistory({
        ...payloadHistory,
        jenis: 'SKAW',
        tanggal: isBackdate ? new Date(tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        status: 'Selesai'
      });
      if (!isBackdate) incrementSequenceNumber('SKAW');
      showToast('Surat SKAW berhasil dicetak & dicatat di buku agenda!', 'success');
    }

    const newEntry = {
      id: Date.now(),
      nama: formData.nama,
      nomor: formData.nomorSurat,
      tanggal: isBackdate ? new Date(tanggalSurat).toISOString() : new Date().toISOString(),
      data: { ...formData, heirs }
    };
    const updatedRiwayat = [newEntry, ...riwayat].slice(0, 50);
    setRiwayat(updatedRiwayat);
    localStorage.setItem('riwayat_surat_skaw', JSON.stringify(updatedRiwayat));

    setSuccess(true);
    setLoading(false);
  };

  const filteredHeirSearch = heirSearchQuery.trim()
    ? residents.filter(r => 
        (r.name || '').toLowerCase().includes(heirSearchQuery.toLowerCase()) || 
        (r.nik || '').includes(heirSearchQuery)
      ).slice(0, 5)
    : [];

  return (
    <div className="space-y-6 pb-20">
      {/* Header Reusable Editor */}
      <SuratEditorHeader 
        template={getLetterHeaderTemplate('SKAW', { 
          kode: kodeKlasifikasiSKAW, 
          jenis: 'Surat Keterangan Ahli Waris', 
          deskripsi: 'Surat Keterangan & Pernyataan Ahli Waris Resmi', 
          nomorSurat: formData.nomorSurat 
        })}
        icon={<Users className="w-5 h-5" />}
        onBack={onBack}
        onPrint={handlePrint}
        printLabel="Cetak SKAW"
      />

      {/* Riwayat Modal / Drawer */}
      <AnimatePresence>
        {showRiwayat && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                Riwayat Pembuatan SKAW
              </h2>
              <button 
                onClick={() => {
                  if (confirm('Kosongkan riwayat SKAW?')) {
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
                    if (item.data) {
                      setFormData(item.data);
                      if (item.data.heirs) setHeirs(item.data.heirs);
                    }
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">

          {/* Card 1: Pengaturan Tanggal & Nomor Surat */}
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

          {/* Card 2: Data Pewaris / Almarhum */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-sm">
                Data Pewaris / Almarhum (Yang Meninggal Dunia)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <UnifiedResidentSearch
                formData={formData}
                setFormData={setFormData}
                residents={residents}
                onOpenQuickAdd={(nik, name) => {
                  setQuickAddInitialData({ nik: nik || formData.nik, name: name || formData.nama });
                  setShowQuickAddModal(true);
                }}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Jenis Kelamin</label>
                <select 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm"
                  value={formData.jenisKelamin}
                  onChange={(e) => setFormData({...formData, jenisKelamin: e.target.value})}
                >
                  <option value="Laki-Laki">Laki-Laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Agama</label>
                <select 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm"
                  value={formData.agama}
                  onChange={(e) => setFormData({...formData, agama: e.target.value})}
                >
                  <option value="Islam">Islam</option>
                  <option value="Kristen">Kristen</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Budha">Budha</option>
                  <option value="Khonghucu">Khonghucu</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pekerjaan Terakhir</label>
                <SuggestCombobox
                  value={formData.pekerjaan}
                  onChange={(v) => setFormData({...formData, pekerjaan: v})}
                  options={JOBS_OPTIONS}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                <input 
                  type="text"
                  placeholder="Contoh: Kandangan"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm"
                  value={formData.tempatLahir}
                  onChange={(e) => setFormData({...formData, tempatLahir: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                <input 
                  type="date"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm"
                  value={formData.tanggalLahir}
                  onChange={(e) => setFormData({...formData, tanggalLahir: e.target.value})}
                />
              </div>

              {/* Data Wafat */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tanggal Meninggal Dunia</label>
                <input 
                  type="date"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm"
                  value={formData.tanggalMeninggal}
                  onChange={(e) => setFormData({...formData, tanggalMeninggal: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tempat Meninggal</label>
                <input 
                  type="text"
                  placeholder="Contoh: Wasah Hilir / RSUD Kandangan"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm"
                  value={formData.tempatMeninggal}
                  onChange={(e) => setFormData({...formData, tempatMeninggal: e.target.value})}
                />
              </div>

              {/* Alamat */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Alamat Semasa Hidup</label>
                  <input
                    type="text"
                    placeholder="Contoh: Jl. Keramat, Desa Wasah Hilir"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm"
                    value={formData.alamat}
                    onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                    onBlur={(e) => handleAlamatBlur(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">RT</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm"
                    placeholder="001"
                    value={formData.rt}
                    onChange={(e) => setFormData(prev => ({ ...prev, rt: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">RW</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm"
                    placeholder="001"
                    value={formData.rw}
                    onChange={(e) => setFormData(prev => ({ ...prev, rw: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Daftar Ahli Waris */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-sm">
                    Daftar Ahli Waris Yang Sah ({heirs.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tambahkan anak, istri, suami, atau ahli waris lainnya</p>
                </div>
              </div>

              <button
                type="button"
                onClick={openAddHeirModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-200 dark:shadow-none"
              >
                <Plus size={14} /> Tambah Ahli Waris
              </button>
            </div>

            {heirs.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Belum Ada Ahli Waris</p>
                <p className="text-xs text-slate-400 mt-1">Klik tombol <strong>"Tambah Ahli Waris"</strong> di atas untuk memasukkan nama-nama ahli waris.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {heirs.map((h, idx) => (
                  <div 
                    key={h.id}
                    className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{h.nama}</p>
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold shrink-0">
                            {h.hubungan}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          NIK: {h.nik || '-'} &bull; {h.tempatLahir ? `${h.tempatLahir}, ${formatIndoDate(h.tanggalLahir)}` : '-'} &bull; {h.pekerjaan || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => openEditHeirModal(h)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit Ahli Waris"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteHeir(h.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Keperluan & Pejabat Penandatangan */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <FileSignature className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-sm">
                Keperluan & Penandatangan
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Keperluan Pembuatan SKAW</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-medium"
                  placeholder="Contoh: Balik Nama Sertifikat Tanah / Administrasi Perbankan"
                  value={formData.keperluan}
                  onChange={(e) => setFormData(prev => ({ ...prev, keperluan: e.target.value }))}
                />
              </div>

              <PejabatPenandatanganCard 
                namaPejabat={formData.namaPejabat}
                setNamaPejabat={(val: string) => setFormData(prev => ({ ...prev, namaPejabat: val }))}
                jabatanPejabat={formData.jabatanPejabat}
                setJabatanPejabat={(val: string) => setFormData(prev => ({ ...prev, jabatanPejabat: val }))}
                nipPejabat={formData.nipPejabat}
                setNipPejabat={(val: string) => setFormData(prev => ({ ...prev, nipPejabat: val }))}
                includeCamat={formData.includeCamat}
                setIncludeCamat={(val: boolean) => setFormData(prev => ({ ...prev, includeCamat: val }))}
                useEsignature={useEsignature}
                setUseEsignature={setUseEsignature}
              />
            </div>
          </div>
        </div>

        {/* Preview Column (Live A4 Preview) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20">
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-xl mb-3 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 pl-2">Pratinjau Dokumen (A4)</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewZoom(prev => Math.max(0.3, prev - 0.05))}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Perkecil"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-mono font-bold text-slate-500 w-12 text-center">
                  {Math.round(previewZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(prev => Math.min(0.8, prev + 0.05))}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Perbesar"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
            </div>

<div 
  {...dragProps}
  className="bg-slate-200/70 dark:bg-slate-950 p-4 rounded-2xl overflow-auto max-h-[750px] flex justify-center w-full max-w-[210mm] aspect-[1/1.414] border border-slate-200 dark:border-slate-800 shadow-inner cursor-grab active:cursor-grabbing"
>
  <div>
    <div
      style={{
        transform: `scale(${previewZoom})`,
        transformOrigin: 'top center',
        fontFamily: letterFont,
        fontSize: 13px,
        lineHeight: 1.4,
        boxSizing: 'border-box',
        position: 'relative'
      }}
      dangerouslySetInnerHTML={{ __html: generateHTML() }}
    />
  </div>
</div>
              />
            </div>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT AHLI WARIS */}
      {showAddHeirModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                {editingHeirId ? 'Edit Data Ahli Waris' : 'Tambah Ahli Waris'}
              </h3>
              <button 
                onClick={() => setShowAddHeirModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Cari dari database penduduk */}
              {!editingHeirId && (
                <div className="relative">
                  <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    Cari Dari Database Penduduk (Otomatis Isi)
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ketik NIK atau Nama Penduduk..."
                      value={heirSearchQuery}
                      onChange={(e) => setHeirSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-emerald-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/40 dark:bg-slate-800"
                    />
                  </div>
                  {filteredHeirSearch.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-50 max-h-48 overflow-y-auto">
                      {filteredHeirSearch.map(r => (
                        <div
                          key={r.nik}
                          onClick={() => handleSelectResidentForHeir(r)}
                          className="p-2.5 hover:bg-emerald-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 text-xs"
                        >
                          <p className="font-bold text-slate-800 dark:text-slate-100">{r.name}</p>
                          <p className="text-[10px] text-slate-400">NIK: {r.nik} &bull; RT {r.address || '-'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Lengkap Ahli Waris *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-semibold"
                    placeholder="Nama Lengkap..."
                    value={tempHeir.nama}
                    onChange={(e) => setTempHeir({ ...tempHeir, nama: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">NIK</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-mono"
                    placeholder="16 Digit NIK..."
                    value={tempHeir.nik}
                    onChange={(e) => setTempHeir({ ...tempHeir, nik: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Hubungan Keluarga</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-medium"
                    value={tempHeir.hubungan}
                    onChange={(e) => setTempHeir({ ...tempHeir, hubungan: e.target.value })}
                  >
                    {HUBUNGAN_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs"
                    placeholder="Tempat Lahir..."
                    value={tempHeir.tempatLahir}
                    onChange={(e) => setTempHeir({ ...tempHeir, tempatLahir: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs"
                    value={tempHeir.tanggalLahir}
                    onChange={(e) => setTempHeir({ ...tempHeir, tanggalLahir: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Jenis Kelamin</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs"
                    value={tempHeir.jenisKelamin}
                    onChange={(e) => setTempHeir({ ...tempHeir, jenisKelamin: e.target.value })}
                  >
                    <option value="Laki-Laki">Laki-Laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Agama</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs"
                    value={tempHeir.agama}
                    onChange={(e) => setTempHeir({ ...tempHeir, agama: e.target.value })}
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Budha">Budha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                  <SuggestCombobox
                    value={tempHeir.pekerjaan}
                    onChange={(v) => setTempHeir({ ...tempHeir, pekerjaan: v })}
                    options={JOBS_OPTIONS}
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Alamat</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs"
                    placeholder="Alamat domisili ahli waris..."
                    value={tempHeir.alamat}
                    onChange={(e) => setTempHeir({ ...tempHeir, alamat: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddHeirModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveHeir}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm"
              >
                {editingHeirId ? 'Simpan Perubahan' : 'Tambahkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Iframe for Printing */}
      <iframe ref={iframeRef} className="hidden" title="Print Iframe" />

      {/* Quick Add Resident Modal */}
      {showQuickAddModal && (
        <QuickAddResidentModal
          isOpen={showQuickAddModal}
          onClose={() => setShowQuickAddModal(false)}
          initialData={quickAddInitialData}
          onSuccess={(newRes) => {
            setResidents(prev => [newRes, ...prev]);
            handleSelectResident(newRes);
            setShowQuickAddModal(false);
          }}
        />
      )}

      {/* Print Success Dialog */}
      <PrintSuccessDialog
        isOpen={success}
        onClose={() => setSuccess(false)}
        title="Surat Keterangan Ahli Waris Berhasil Dicetak!"
        nomorSurat={formData.nomorSurat}
        namaWarga={formData.nama}
      />
    </div>
  );
}
