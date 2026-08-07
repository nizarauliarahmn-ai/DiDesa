import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Printer, Search, User, FileText, FileSignature, 
  ZoomIn, ZoomOut, Plus, ShieldAlert, Check, X, Edit2, Save, 
  Loader2, RefreshCw, Calendar, CheckCircle2, Users, FileSpreadsheet,
  ToggleLeft, ToggleRight, Trash2, MapPin, Building2, ChevronRight,
  ArrowUp, ArrowDown, GripVertical
} from 'lucide-react';
import { useBackdateNumber } from '../../../hooks/useBackdateNumber';
import { fetchResidentsCached } from '../../../utils/apiCache';
import { useLetterKode } from '../../../hooks/useLetterKode';
import PrintSuccessDialog from './PrintSuccessDialog';
import TTESignatureBox from './TTESignatureBox';
import { getLetterClassifications, incrementSequenceNumber, generateLetterNumber } from '../../../utils/letterClassifications';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { showToast } from '../../../utils/toast';
import { generateKopSuratHTML } from '../../../utils/letterFormat';
import { capitalizeWords, capitalizeResidentFields } from '../../../utils/textUtils';
import { useDragScroll } from '../../../hooks/useDragScroll';
import SuratEditorHeader from './SuratEditorHeader';
import { useReactToPrint } from 'react-to-print';

export interface Recipient {
  id: string;
  name: string;
  jabatan?: string;
  alamat?: string;
}

interface Resident {
  nik: string;
  name: string;
  gender?: string;
  address?: string;
  job?: string;
  rt_rw?: string;
}

const fmtDate = (d: string) => {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return d; }
};

const fmtShortDate = (d: string) => {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return d; }
};

export default function AdminSuratUndangan({
  onBack,
  editData,
  editLetterId
}: {
  onBack: () => void;
  editData?: any;
  editLetterId?: string | null;
}) {
  // Form Header State
  const [tanggalSurat, setTanggalSurat] = useState(editData?.tanggal || new Date().toISOString().split('T')[0]);
  const backdateKlas = getLetterClassifications().find(c => c.klasifikasi === 'UND') || { klasifikasi: 'UND', kodeKlasifikasi: '005' };
  const { customNomorSurat, isBackdate } = useBackdateNumber(tanggalSurat, backdateKlas.klasifikasi, backdateKlas.kodeKlasifikasi);

  const [nomorSurat, setNomorSurat] = useState(editData?.nomor || '');
  const [sifat, setSifat] = useState(editData?.sifat || 'Penting');
  const [lampiran, setLampiran] = useState(editData?.lampiran || '-');
  const [perihal, setPerihal] = useState(editData?.perihal || editData?.keperluan || '');

  // Recipients State (Default empty array, no dummy data)
  const [recipients, setRecipients] = useState<Recipient[]>(editData?.recipients || []);
  const [forceAttachment, setForceAttachment] = useState<boolean>(editData?.forceAttachment || false);

  // Resident Autocomplete Search State
  const [residents, setResidents] = useState<Resident[]>([]);
  const [residentSearchQuery, setResidentSearchQuery] = useState('');
  const [showResidentDropdown, setShowResidentDropdown] = useState(false);

  // New Manual Recipient Inputs
  const [newRecipName, setNewRecipName] = useState('');
  const [newRecipJabatan, setNewRecipJabatan] = useState('');
  const [newRecipAlamat, setNewRecipAlamat] = useState('di Tempat');

  // Event Details State
  const [tglAcara, setTglAcara] = useState(editData?.tglAcara || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [waktuAcara, setWaktuAcara] = useState(editData?.waktuAcara || '08.00 WITA s.d Selesai');
  const [isCustomWaktu, setIsCustomWaktu] = useState(false);
  const [tempatAcara, setTempatAcara] = useState(editData?.tempatAcara || '');

  // Paragraf Text
  const [showParagrafKustom, setShowParagrafKustom] = useState<boolean>(editData?.showParagrafKustom || false);
  const [paragrafKustom, setParagrafKustom] = useState(
    editData?.paragrafKustom || 
    'Sehubungan akan di bangunnya Posyandu Harapan Pahlawan Tumpang Talu RT.03 Desa Wasah Hilir, Perlu adanya kesepakatan terkait batas tanah yang akan di bangun.'
  );
  const [paragrafPembuka, setParagrafPembuka] = useState(
    editData?.paragrafPembuka || 
    'Dengan hormat, kami mengundang Bapak/Ibu/Saudara(i) untuk dapat berhadir pada pertemuan yang akan diselenggarakan pada:'
  );
  const [paragrafPenutup, setParagrafPenutup] = useState(
    editData?.paragrafPenutup || 
    'Demikian undangan ini disampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.'
  );

  // Signature State & Village Officers List (SKTM-style)
  const officerList: any[] = (() => {
    try {
      const stored = localStorage.getItem('village_officers');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  })();

  const [pejabatNama, setPejabatNama] = useState(() => localStorage.getItem('kop_kades') || localStorage.getItem('village_kades_name') || 'FAZAKKIR RAHMAD');
  const [pejabatJabatan, setPejabatJabatan] = useState(() => localStorage.getItem('kades_title') || 'Kepala Desa');
  const [pejabatNip, setPejabatNip] = useState(() => localStorage.getItem('kades_nip') || '-');
  const [isTTE, setIsTTE] = useState<boolean>(true);
  const [includeCamat, setIncludeCamat] = useState<boolean>(editData?.includeCamat || false);

  // UI States (SKTM Live Engine Defaults)
  const [previewZoom, setPreviewZoom] = useState<number>(0.45);
  const printRef = useRef<HTMLDivElement>(null);

  const handleTriggerPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Surat_Undangan_${nomorSurat ? nomorSurat.replace(/[\/\s]/g, '_') : 'Undangan'}`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 0 !important;
      }
      @media print {
        html, body {
          background: #ffffff !important;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-wrapper-container {
          transform: none !important;
          width: 100% !important;
          max-width: none !important;
        }
        .undangan-page-sheet {
          width: 210mm !important;
          min-height: 297mm !important;
          box-shadow: none !important;
          border: none !important;
          margin: 0 auto !important;
          padding: 20mm !important;
          background: white !important;
          page-break-after: always !important;
          break-after: page !important;
        }
        .undangan-page-sheet:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
      }
    `
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);
  const [savedLetterId, setSavedLetterId] = useState<string>('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dragProps = useDragScroll();

  // Village Kop Config
  const rawDesa = localStorage.getItem('kop_desa') || 'Desa Wasah Hilir';
  const cleanDesaName = rawDesa.replace(/^desa\s+/i, '');
  const activeDesa = rawDesa.startsWith('Desa') ? rawDesa : `Desa ${rawDesa}`;
  const activeKecamatan = localStorage.getItem('kop_kecamatan') || 'Kecamatan Simpur';
  const activeKabupaten = localStorage.getItem('kop_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan';
  const activeAlamat = localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RK.001 Kodepos 71261';
  const villageLogo = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';

  // Load residents for autocomplete
  useEffect(() => {
    const loadResidents = async () => {
      try {
        const res = await fetchResidentsCached();
        if (res.ok) {
          const data = await res.json();
          setResidents(data);
        }
      } catch (e) {
        console.error('Failed to load residents for invitation letter:', e);
      }
    };
    loadResidents();
  }, []);

  // Auto Numbering effect
  useEffect(() => {
    if (!editData && isBackdate && customNomorSurat) {
      setNomorSurat(customNomorSurat);
    } else if (!editData && !nomorSurat) {
      const generated = generateLetterNumber('UND', '005');
      setNomorSurat(generated);
    }
  }, [customNomorSurat, isBackdate, editData]);

  // Recipient Attachment Logic (>3 recipients auto-attaches to Lampiran Page 2)
  const isAttached = forceAttachment || recipients.length > 3;

  // Add Recipient Handlers
  const handleAddRecipient = (name: string, jabatan?: string, alamat?: string) => {
    if (!name.trim()) return;
    const newEntry: Recipient = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 4),
      name: capitalizeWords(name.trim()),
      jabatan: jabatan ? jabatan.trim() : undefined,
      alamat: alamat ? alamat.trim() : 'di Tempat'
    };
    setRecipients(prev => [...prev, newEntry]);
    showToast(`Berhasil menambahkan ${name}`, 'success');
  };

  const handleSelectResident = (res: Resident) => {
    const formatted = capitalizeResidentFields(res);
    handleAddRecipient(formatted.name, res.job || 'Warga Desa', formatted.address || 'di Tempat');
    setResidentSearchQuery('');
    setShowResidentDropdown(false);
  };

  const handleRemoveRecipient = (id: string) => {
    setRecipients(recipients.filter(r => r.id !== id));
  };

  // Preset Recipients
  const handleAddPreset = (presetType: string) => {
    if (presetType === 'rt_rw') {
      const formatGroup = (type: 'RT' | 'RW') => {
        let nums: string[] = [];
        try {
          const list = JSON.parse(localStorage.getItem(`village_${type.toLowerCase()}_list`) || '[]');
          if (Array.isArray(list) && list.length > 0) {
            nums = list.map(item => item.no.toString().padStart(2, '0'));
          }
        } catch { }

        if (nums.length === 0) {
          return `Seluruh Ketua ${type}`;
        }

        if (nums.length === 1) return `Seluruh Ketua ${type} (${type}.${nums[0]})`;
        if (nums.length === 2) return `Seluruh Ketua ${type} (${type}.${nums[0]} dan ${nums[1]})`;
        const last = nums.pop();
        return `Seluruh Ketua ${type} (${type}.${nums.join(', ')}, dan ${last})`;
      };

      setRecipients(prev => [
        ...prev,
        { id: Date.now().toString() + '_rt', name: formatGroup('RT'), jabatan: 'Ketua RT', alamat: 'di Tempat' },
        { id: Date.now().toString() + '_rw', name: formatGroup('RW'), jabatan: 'Ketua RW', alamat: 'di Tempat' }
      ]);
    } else if (presetType === 'bpd') {
      setRecipients(prev => [
        ...prev,
        { id: Date.now().toString() + '_bpd', name: 'Ketua & Anggota BPD', jabatan: 'Badan Permusyawaratan Desa', alamat: 'di Tempat' }
      ]);
    } else if (presetType === 'perangkat') {
      setRecipients(prev => [
        ...prev,
        { id: Date.now().toString() + '_pkk', name: 'Seluruh Perangkat Desa & Staf', jabatan: 'Pemerintah Desa', alamat: 'di Tempat' }
      ]);
    } else if (presetType === 'tokoh') {
      setRecipients(prev => [
        ...prev,
        { id: Date.now().toString() + '_tokoh', name: 'Tokoh Agama & Tokoh Masyarakat Desa', jabatan: 'Tokoh Masyarakat', alamat: 'di Tempat' }
      ]);
    } else if (presetType === 'pld') {
      const kec = localStorage.getItem('kop_kecamatan') || 'Kecamatan Simpur';
      const kecName = kec.startsWith('Kecamatan') ? kec : `Kecamatan ${kec}`;
      setRecipients(prev => [
        ...prev,
        { id: Date.now().toString() + '_pld', name: `PD & PLD ${kecName}`, jabatan: 'Pendamping Desa', alamat: 'di Tempat' }
      ]);
    } else if (presetType === 'ta') {
      const kab = localStorage.getItem('kop_kabupaten') || 'Kabupaten Hulu Sungai Selatan';
      const kabClean = kab.replace(/^Pemerintah\s+/i, '');
      const kabName = kabClean.startsWith('Kabupaten') ? kabClean : `Kabupaten ${kabClean}`;
      setRecipients(prev => [
        ...prev,
        { id: Date.now().toString() + '_ta', name: `Tenaga Ahli ${kabName}`, jabatan: 'Tenaga Ahli P3MD', alamat: 'di Tempat' }
      ]);
    } else if (presetType === 'camat') {
      const kec = localStorage.getItem('kop_kecamatan') || 'Kecamatan Simpur';
      const kecOnly = kec.replace(/^Kecamatan\s+/i, '');
      setRecipients(prev => [
        ...prev,
        { id: Date.now().toString() + '_camat', name: `Camat ${kecOnly}`, jabatan: 'Camat', alamat: 'di Tempat' }
      ]);
    } else if (presetType === 'pkk') {
      const rawDesa = localStorage.getItem('kop_desa') || 'Wasah Hilir';
      const desaName = rawDesa.startsWith('Desa') ? rawDesa : `Desa ${rawDesa}`;
      setRecipients(prev => [
        ...prev,
        { id: Date.now().toString() + '_pkk_ketua', name: `Ketua TP-PKK ${desaName}`, jabatan: 'Ketua TP-PKK', alamat: 'di Tempat' }
      ]);
    } else if (presetType === 'posyandu') {
      const rawDesa = localStorage.getItem('kop_desa') || 'Wasah Hilir';
      const desaName = rawDesa.startsWith('Desa') ? rawDesa : `Desa ${rawDesa}`;
      setRecipients(prev => [
        ...prev,
        { id: Date.now().toString() + '_posyandu', name: `Kader Posyandu ${desaName}`, jabatan: 'Kader Posyandu', alamat: 'di Tempat' }
      ]);
    } else if (presetType === 'hpk') {
      const rawDesa = localStorage.getItem('kop_desa') || 'Wasah Hilir';
      const desaName = rawDesa.startsWith('Desa') ? rawDesa : `Desa ${rawDesa}`;
      setRecipients(prev => [
        ...prev,
        { id: Date.now().toString() + '_hpk', name: `Keluarga Sasaran 1000 HPK ${desaName}`, jabatan: 'Sasaran 1000 HPK', alamat: 'di Tempat' }
      ]);
    } else if (presetType === 'rembuk_stunting') {
      const kec = localStorage.getItem('kop_kecamatan') || 'Kecamatan Simpur';
      const kecName = kec.startsWith('Kecamatan') ? kec : `Kecamatan ${kec}`;
      const kecOnly = kec.replace(/^Kecamatan\s+/i, '');
      const kab = localStorage.getItem('kop_kabupaten') || 'Kabupaten Hulu Sungai Selatan';
      const kabClean = kab.replace(/^Pemerintah\s+/i, '');
      const kabName = kabClean.startsWith('Kabupaten') ? kabClean : `Kabupaten ${kabClean}`;
      const rawDesa = localStorage.getItem('kop_desa') || 'Wasah Hilir';
      const desaName = rawDesa.startsWith('Desa') ? rawDesa : `Desa ${rawDesa}`;

      const formatGroup = (type: 'RT' | 'RW') => {
        let nums: string[] = [];
        try {
          const list = JSON.parse(localStorage.getItem(`village_${type.toLowerCase()}_list`) || '[]');
          if (Array.isArray(list) && list.length > 0) {
            nums = list.map(item => item.no.toString().padStart(2, '0'));
          }
        } catch { }
        if (nums.length === 0) return `Seluruh Ketua ${type}`;
        if (nums.length === 1) return `Seluruh Ketua ${type} (${type}.${nums[0]})`;
        if (nums.length === 2) return `Seluruh Ketua ${type} (${type}.${nums[0]} dan ${nums[1]})`;
        const last = nums.pop();
        return `Seluruh Ketua ${type} (${type}.${nums.join(', ')}, dan ${last})`;
      };

      const now = Date.now();
      setRecipients(prev => [
        ...prev,
        { id: now + '_1', name: `Camat ${kecOnly}`, jabatan: 'Camat', alamat: 'di Tempat' },
        { id: now + '_2', name: `Kepala Puskesmas & Bidan Desa`, jabatan: 'Puskesmas / Kesehatan', alamat: 'di Tempat' },
        { id: now + '_3', name: `PD & PLD ${kecName}`, jabatan: 'Pendamping Desa', alamat: 'di Tempat' },
        { id: now + '_4', name: `Tenaga Ahli ${kabName}`, jabatan: 'Tenaga Ahli P3MD', alamat: 'di Tempat' },
        { id: now + '_5', name: `Ketua & Anggota BPD`, jabatan: 'Badan Permusyawaratan Desa', alamat: 'di Tempat' },
        { id: now + '_6', name: `Seluruh Perangkat Desa & Staf`, jabatan: 'Pemerintah Desa', alamat: 'di Tempat' },
        { id: now + '_7', name: `Ketua TP-PKK ${desaName}`, jabatan: 'Ketua TP-PKK', alamat: 'di Tempat' },
        { id: now + '_8', name: `Kader Posyandu & KPM ${desaName}`, jabatan: 'Kader Kesehatan & KPM', alamat: 'di Tempat' },
        { id: now + '_9', name: `Keluarga Sasaran 1000 HPK ${desaName}`, jabatan: 'Sasaran 1000 HPK', alamat: 'di Tempat' },
        { id: now + '_10', name: formatGroup('RT'), jabatan: 'Ketua RT', alamat: 'di Tempat' },
        { id: now + '_11', name: formatGroup('RW'), jabatan: 'Ketua RW', alamat: 'di Tempat' },
        { id: now + '_12', name: `Tokoh Agama & Tokoh Masyarakat Desa`, jabatan: 'Tokoh Masyarakat', alamat: 'di Tempat' },
      ]);

      if (!perihal.trim()) {
        setPerihal(`Pelaksanaan Rembuk Stunting ${desaName}`);
      }
    }
  };

  // Move Recipient Order Handler
  const handleMoveRecipient = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= recipients.length) return;
    const newRecipients = [...recipients];
    const [movedItem] = newRecipients.splice(index, 1);
    newRecipients.splice(targetIndex, 0, movedItem);
    setRecipients(newRecipients);
  };

  // Save Handler
  const handleSave = async () => {
    if (recipients.length === 0) {
      showToast('Harap tambahkan minimal 1 penerima undangan', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const fullDataPayload = {
        nomorSurat,
        tanggalSurat,
        sifat,
        lampiran: isAttached ? '1 (satu) Lembar' : lampiran,
        perihal,
        recipients,
        forceAttachment,
        tglAcara,
        waktuAcara,
        tempatAcara,
        paragrafPembuka,
        paragrafPenutup,
        pejabatNama,
        pejabatJabatan,
        pejabatNip,
        isTTE,
        jenis: 'UNDANGAN'
      };

      let letterId = editLetterId;
      if (editLetterId) {
        await updateLetterHistory(editLetterId, {
          nomor: nomorSurat,
          jenis: 'UNDANGAN',
          nik: '-',
          nama: recipients[0]?.name || 'Daftar Penerima Undangan',
          tanggal: tanggalSurat,
          keperluan: perihal,
          status: 'Selesai',
          data: fullDataPayload
        });
      } else {
        const added = await addLetterHistory({
          nomor: nomorSurat,
          jenis: 'UNDANGAN',
          nik: '-',
          nama: recipients[0]?.name || 'Daftar Penerima Undangan',
          tanggal: tanggalSurat,
          keperluan: perihal,
          status: 'Selesai',
          data: fullDataPayload
        });
        if (added) letterId = added.id;
        incrementSequenceNumber('UND');
      }

      setSavedLetterId(letterId || 'UND_' + Date.now());
      setShowSuccessDialog(true);
      showToast('Surat Undangan berhasil disimpan!', 'success');
    } catch (err) {
      console.error('Error saving invitation letter:', err);
      showToast('Gagal menyimpan surat undangan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Print Document Handler
  const handlePrint = () => {
    handleSave();
    setTimeout(() => {
      handleTriggerPrint();
    }, 150);
  };

  const filteredResidents = residentSearchQuery.trim() === '' ? [] : residents.filter(r => 
    r.name?.toLowerCase().includes(residentSearchQuery.toLowerCase()) || 
    r.nik?.includes(residentSearchQuery)
  ).slice(0, 5);

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-24">
      {/* Top Bar (Reusable Standard Header) */}
      <SuratEditorHeader 
        title="Pembuat Surat Undangan Resmi"
        templateKode="005 / UND"
        onBack={onBack}
        onPrint={handlePrint}
        printLabel="Cetak / Download PDF"
      />

      {/* Main Form & Preview Workspace (Matching SKTM 7/5 Grid Ratio) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form Controls (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Header & Naskah Surat */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 border-b pb-3 dark:border-slate-800">
              <FileText size={18} className="text-emerald-500" />
              <span>1. Header & Nomor Surat</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Tanggal Dibuat Surat</label>
                <input 
                  type="date"
                  value={tanggalSurat}
                  onChange={(e) => setTanggalSurat(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Nomor Surat Undangan</label>
                <input 
                  type="text"
                  value={nomorSurat}
                  onChange={(e) => setNomorSurat(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Sifat Surat</label>
                  <select 
                    value={sifat}
                    onChange={(e) => setSifat(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium"
                  >
                    <option value="Penting">Penting</option>
                    <option value="Biasa">Biasa</option>
                    <option value="Sangat Penting">Sangat Penting</option>
                    <option value="Rahasia">Rahasia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Lampiran</label>
                  <input 
                    type="text"
                    value={isAttached ? '1 (satu) Lembar' : lampiran}
                    disabled={isAttached}
                    onChange={(e) => setLampiran(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Perihal / Hal</label>
                <input 
                  type="text"
                  value={perihal}
                  onChange={(e) => setPerihal(e.target.value)}
                  placeholder="Misal: Musyawarah Batas Tanah Posyandu HPTT..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Daftar Penerima Undangan (Kepada Yth.) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Users size={18} className="text-emerald-500" />
                <span>2. Penerima Undangan (Yth.)</span>
              </h3>
              <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-bold">
                {recipients.length} Orang
              </span>
            </div>

            {/* Auto Attachment Indicator */}
            <div className={`p-3.5 rounded-2xl text-xs font-medium border flex items-center justify-between transition-all ${
              isAttached ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className={isAttached ? 'text-amber-600' : 'text-slate-400'} />
                <span>
                  {isAttached ? 'Daftar penerima dialihkan ke Lampiran Halaman 2 (>3 penerima)' : 'Daftar penerima ditampilkan langsung di Halaman 1 (≤3 penerima)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setForceAttachment(!forceAttachment)}
                className="text-xs font-bold underline shrink-0 hover:text-emerald-600 ml-2"
              >
                {forceAttachment ? 'Batal Paksa' : 'Paksa Lampiran'}
              </button>
            </div>

            {/* Resident Autocomplete Search Input */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Cari dari Data Penduduk Desa:</label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  value={residentSearchQuery}
                  onChange={(e) => {
                    setResidentSearchQuery(e.target.value);
                    setShowResidentDropdown(true);
                  }}
                  onFocus={() => setShowResidentDropdown(true)}
                  placeholder="Ketik Nama / NIK warga desa..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showResidentDropdown && filteredResidents.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
                  {filteredResidents.map(r => (
                    <button
                      key={r.nik}
                      type="button"
                      onClick={() => handleSelectResident(r)}
                      className="w-full text-left p-3 hover:bg-emerald-50 dark:hover:bg-slate-700/60 border-b border-slate-100 dark:border-slate-700/40 last:border-0 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-xs">{r.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">NIK: {r.nik} • {r.job || 'Warga'}</p>
                      </div>
                      <Plus size={14} className="text-emerald-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Preset Cepat:</label>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleAddPreset('rt_rw')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all"
                >
                  + Ketua RT / RW
                </button>
                <button 
                  onClick={() => handleAddPreset('bpd')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all"
                >
                  + Pengurus BPD
                </button>
                <button 
                  onClick={() => handleAddPreset('perangkat')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all"
                >
                  + Perangkat Desa
                </button>
                <button 
                  onClick={() => handleAddPreset('tokoh')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all"
                >
                  + Tokoh Masyarakat
                </button>
                <button 
                  onClick={() => handleAddPreset('pld')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all"
                >
                  + PD & PLD
                </button>
                <button 
                  onClick={() => handleAddPreset('ta')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all"
                >
                  + Tenaga Ahli Kabupaten
                </button>
                <button 
                  onClick={() => handleAddPreset('camat')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all"
                >
                  + Camat
                </button>
                <button 
                  onClick={() => handleAddPreset('pkk')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all"
                >
                  + Ketua TP-PKK Desa
                </button>
                <button 
                  onClick={() => handleAddPreset('posyandu')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all"
                >
                  + Kader Posyandu
                </button>
                <button 
                  onClick={() => handleAddPreset('hpk')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all"
                >
                  + Sasaran 1000 HPK
                </button>
                <button 
                  onClick={() => handleAddPreset('rembuk_stunting')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                  title="Otomatis menambahkan 12 daftar penerima standar acara Rembuk Stunting"
                >
                  + Paket Rembuk Stunting (12 Penerima)
                </button>
              </div>
            </div>

            {/* Added Recipients List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {recipients.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-3">Belum ada penerima yang ditambahkan</p>
              ) : (
                recipients.map((r, index) => (
                  <div key={r.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex justify-between items-center text-xs border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="flex flex-col gap-0.5 bg-slate-200/60 dark:bg-slate-700/60 p-1 rounded-lg">
                        <button 
                          disabled={index === 0}
                          onClick={() => handleMoveRecipient(index, 'up')}
                          className="hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-20 disabled:hover:text-inherit transition-all p-0.5"
                          title="Geser Ke Atas"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button 
                          disabled={index === recipients.length - 1}
                          onClick={() => handleMoveRecipient(index, 'down')}
                          className="hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-20 disabled:hover:text-inherit transition-all p-0.5"
                          title="Geser Ke Bawah"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{index + 1}. {r.name}</p>
                        {r.jabatan && <p className="text-slate-500 dark:text-slate-400 text-[11px]">{r.jabatan} • {r.alamat}</p>}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveRecipient(r.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add New Manual Recipient Form */}
            <div className="pt-3 border-t dark:border-slate-800 space-y-2">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Tambah Penerima Manual:</p>
              <input 
                type="text"
                placeholder="Nama / Penerima (misal: Isya Ansari)..."
                value={newRecipName}
                onChange={(e) => setNewRecipName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
              />
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text"
                  placeholder="Jabatan (misal: BPD / RT.03)..."
                  value={newRecipJabatan}
                  onChange={(e) => setNewRecipJabatan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                />
                <input 
                  type="text"
                  placeholder="Lokasi (default: di Tempat)..."
                  value={newRecipAlamat}
                  onChange={(e) => setNewRecipAlamat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (newRecipName.trim()) {
                    handleAddRecipient(newRecipName, newRecipJabatan, newRecipAlamat);
                    setNewRecipName('');
                    setNewRecipJabatan('');
                  }
                }}
                className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus size={14} />
                <span>Tambahkan Penerima</span>
              </button>
            </div>
          </div>

          {/* Card 3: Isi Surat & Detail Pelaksanaan Acara */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 border-b pb-3 dark:border-slate-800">
              <Calendar size={18} className="text-emerald-500" />
              <span>3. Isi & Detail Pelaksanaan Acara</span>
            </h3>

            <div className="space-y-3">
              {/* Custom Paragraph Toggle & Textarea */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Tambah Paragraf Pengantar Kustom (Sebelum Kalimat Pembuka)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowParagrafKustom(!showParagrafKustom)}
                    className={`p-1 rounded-full transition-colors ${showParagrafKustom ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                  >
                    {showParagrafKustom ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                </div>

                {showParagrafKustom && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Teks Paragraf Kustom (Opsional):</label>
                    <textarea 
                      rows={2}
                      value={paragrafKustom}
                      onChange={(e) => setParagrafKustom(e.target.value)}
                      placeholder="Contoh: Sehubungan akan dibangunnya Posyandu Harapan..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium resize-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Hari / Tanggal Acara</label>
                <input 
                  type="date"
                  value={tglAcara}
                  onChange={(e) => setTglAcara(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Waktu / Pukul</label>
                <div className="space-y-2">
                  <select 
                    value={isCustomWaktu ? 'custom' : waktuAcara}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomWaktu(true);
                      } else {
                        setIsCustomWaktu(false);
                        setWaktuAcara(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
                  >
                    <option value="08.00 WITA s.d Selesai">08.00 WITA s.d Selesai</option>
                    <option value="08.30 WITA s.d Selesai">08.30 WITA s.d Selesai</option>
                    <option value="09.00 WITA s.d Selesai">09.00 WITA s.d Selesai</option>
                    <option value="09.30 WITA s.d Selesai">09.30 WITA s.d Selesai</option>
                    <option value="10.00 WITA s.d Selesai">10.00 WITA s.d Selesai</option>
                    <option value="13.30 WITA s.d Selesai">13.30 WITA s.d Selesai</option>
                    <option value="14.00 WITA s.d Selesai">14.00 WITA s.d Selesai</option>
                    <option value="19.30 WITA s.d Selesai">19.30 WITA s.d Selesai</option>
                    <option value="20.00 WITA s.d Selesai">20.00 WITA s.d Selesai</option>
                    <option value="custom">+ Ketik Manual / Kustom...</option>
                  </select>

                  {(isCustomWaktu || !['08.00 WITA s.d Selesai','08.30 WITA s.d Selesai','09.00 WITA s.d Selesai','09.30 WITA s.d Selesai','10.00 WITA s.d Selesai','13.30 WITA s.d Selesai','14.00 WITA s.d Selesai','19.30 WITA s.d Selesai','20.00 WITA s.d Selesai'].includes(waktuAcara)) && (
                    <input 
                      type="text"
                      value={waktuAcara}
                      onChange={(e) => setWaktuAcara(e.target.value)}
                      placeholder="Contoh: 08.00 WITA s.d Selesai..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Tempat Pelaksanaan</label>
                <input 
                  type="text"
                  value={tempatAcara}
                  onChange={(e) => setTempatAcara(e.target.value)}
                  placeholder="Contoh: Kantor Desa Wasah Hilir..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Kalimat Penutup Surat</label>
                <textarea 
                  rows={2}
                  value={paragrafPenutup}
                  onChange={(e) => setParagrafPenutup(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium resize-none"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Penandatanganan (Identical to SKTM) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <FileSignature className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Pejabat Penandatangan</h3>
            </div>

            <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-amber-900">Nama Pejabat</label>
                  <select 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-slate-800 dark:text-slate-100"
                    value={pejabatNama}
                    onChange={(e) => {
                      const name = e.target.value;
                      setPejabatNama(name);
                      try {
                        const stored = localStorage.getItem('village_officers');
                        if (stored) {
                          const list = JSON.parse(stored);
                          const found = list.find((o: any) => o.name === name);
                          if (found) {
                            setPejabatJabatan(found.role || 'Perangkat Desa');
                            if (found.nip) setPejabatNip(found.nip);
                          } else {
                            setPejabatJabatan(localStorage.getItem('kades_title') || 'Kepala Desa');
                            setPejabatNip(localStorage.getItem('kades_nip') || '-');
                          }
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
                      return (
                        <option value={localStorage.getItem('kop_kades') || 'FAZAKKIR RAHMAD'}>
                          {localStorage.getItem('kop_kades') || 'FAZAKKIR RAHMAD'} (Kepala Desa)
                        </option>
                      );
                    })()}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-amber-900">Jabatan</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl outline-none font-medium text-slate-800 dark:text-slate-100"
                    value={pejabatJabatan}
                    onChange={(e) => setPejabatJabatan(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-amber-100 space-y-3">
                {/* Toggle TTE / QR Code */}
                <label className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50/50 transition-all">
                  <div className="space-y-0.5 pr-4">
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tanda Tangan Elektronik (TTE / QR Code)</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Tampilkan QR Code verifikasi dokumen resmi pada hasil cetak</div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={isTTE} 
                      onChange={(e) => setIsTTE(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                  </div>
                </label>

                {/* Toggle Mengetahui Camat */}
                <label className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50/50 transition-all">
                  <div className="space-y-0.5 pr-4">
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tambahkan Kolom Mengetahui Camat</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Gunakan format 2 tanda tangan (Camat di sebelah kiri)</div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={includeCamat} 
                      onChange={(e) => setIncludeCamat(e.target.checked)}
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

        {/* Right Column: Live A4 Engine Preview (Identical to SKTM) */}
        <div className="lg:col-span-5 relative">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col h-[calc(100vh-120px)] sticky top-28">
            {/* Live Engine Top Control Bar */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">LIVE A4 ENGINE PREVIEW</span>
              </div>
              
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setPreviewZoom(prev => Math.max(0.3, prev - 0.05))} 
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 px-2 w-14 text-center">
                  {Math.round(previewZoom * 100)}%
                </span>
                <button 
                  onClick={() => setPreviewZoom(prev => Math.min(1.2, prev + 0.05))} 
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
                <div className="w-px h-5 bg-slate-200 mx-1"></div>
                <button 
                  onClick={() => setPreviewZoom(0.45)} 
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-[10px] font-bold"
                  title="Reset Zoom"
                >
                  Reset
                </button>
              </div>
            </div>
            
            {/* Scrollable Preview Canvas */}
            <div 
              ref={dragProps.ref}
              onMouseDown={dragProps.onMouseDown}
              onMouseLeave={dragProps.onMouseLeave}
              onMouseUp={dragProps.onMouseUp}
              onMouseMove={dragProps.onMouseMove}
              style={{ ...dragProps.style }}
              className="flex-1 bg-slate-200/40 overflow-auto relative flex p-8"
            >
              {/* Outer wrapper to collapse the bounding box width for scrollbars */}
              <div 
                style={{
                  width: `${794 * previewZoom}px`,
                  transition: 'width 0.2s ease-out',
                }}
                className="m-auto shrink-0 relative"
              >
                {/* Inner wrapper that actually scales the pages */}
                <div 
                  ref={printRef}
                  id="undangan-print-wrapper"
                  style={{
                    width: '794px',
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'top left',
                  }}
                  className="print-wrapper-container flex flex-col gap-8"
                >
                  {/* PAGE 1: Main Surat Undangan */}
                  <div 
                    id="undangan-page-1"
                    style={{ 
                      minHeight: '1123px',
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
                    }}
                    className="undangan-page-sheet bg-white text-black p-[20mm] font-serif text-[11pt] leading-relaxed relative flex flex-col justify-between shrink-0 overflow-hidden"
                  >
              <div>
                {/* Official Village Header (Kop Surat) */}
                <div dangerouslySetInnerHTML={{ __html: generateKopSuratHTML() }} />

                {/* Date on Top Right */}
                <div className="flex justify-end font-sans text-[11pt] mb-2">
                  <p>{cleanDesaName}, {fmtShortDate(tanggalSurat)}</p>
                </div>

                {/* Surat Information Attributes Header */}
                <div className="font-sans text-[11pt] mb-4">
                  <table className="w-[70%] border-collapse text-[11pt] leading-tight">
                    <tbody>
                      <tr>
                        <td className="w-20 font-normal py-0.5 align-top">Nomor</td>
                        <td className="w-4 text-center py-0.5 align-top">:</td>
                        <td className="py-0.5 align-top">{nomorSurat}</td>
                      </tr>
                      <tr>
                        <td className="font-normal py-0.5 align-top">Sifat</td>
                        <td className="text-center py-0.5 align-top">:</td>
                        <td className="py-0.5 align-top">{sifat}</td>
                      </tr>
                      <tr>
                        <td className="font-normal py-0.5 align-top">Lampiran</td>
                        <td className="text-center py-0.5 align-top">:</td>
                        <td className="py-0.5 align-top">{isAttached ? '1 (satu) Lembar' : lampiran}</td>
                      </tr>
                      <tr>
                        <td className="font-normal py-0.5 align-top">Hal</td>
                        <td className="text-center py-0.5 align-top">:</td>
                        <td className="font-bold py-0.5 align-top">{perihal || ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Recipient Section (Kepada Yth.) */}
                <div className="font-sans text-[11pt] mb-4">
                  <table className="border-collapse leading-tight">
                    <tbody>
                      <tr>
                        <td className="w-12 align-top font-normal py-0.5">Yth.</td>
                        <td className="align-top py-0.5">
                          {isAttached ? (
                            <div>
                              <p className="font-bold">Daftar Penerima Undangan Terlampir</p>
                              <p className="italic text-[10.5pt] mt-1">di<br/>Tempat</p>
                            </div>
                          ) : recipients.length === 0 ? (
                            <div>
                              <p className="italic text-gray-400 text-[10.5pt]">................................................</p>
                              <p className="italic text-[10.5pt] mt-1">di<br/>Tempat</p>
                            </div>
                          ) : (
                            <div>
                              <div className="space-y-0.5">
                                {recipients.map((r, i) => (
                                  <div key={r.id} className="flex gap-2">
                                    <span className="min-w-[18px]">{i + 1}.</span>
                                    <span>{r.name}</span>
                                  </div>
                                ))}
                              </div>
                              <p className="italic text-[10.5pt] mt-2">di<br/>Tempat</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Paragraf Pembuka */}
                <div className="font-sans text-[11pt] text-justify space-y-2 leading-relaxed mb-3">
                  {showParagrafKustom && paragrafKustom?.trim() && (
                    <p className="indent-8">{paragrafKustom}</p>
                  )}
                  <p className="indent-8">{paragrafPembuka}</p>
                </div>

                {/* Detail Pelaksanaan Acara (Tight line spacing, no bold on date/location) */}
                <div className="pl-8 font-sans text-[11pt] mb-4">
                  <table className="w-full border-collapse leading-snug">
                    <tbody>
                      <tr>
                        <td className="w-36 py-0.5 font-normal">Hari/Tanggal</td>
                        <td className="w-4 text-center py-0.5">:</td>
                        <td className="py-0.5 font-normal">{fmtDate(tglAcara)}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-normal">Pukul</td>
                        <td className="text-center py-0.5">:</td>
                        <td className="py-0.5 font-normal">{waktuAcara}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-normal">Tempat</td>
                        <td className="text-center py-0.5">:</td>
                        <td className="py-0.5 font-normal">{tempatAcara}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Paragraf Penutup */}
                <div className="font-sans text-[11pt] text-justify leading-relaxed mb-8">
                  <p className="indent-8">{paragrafPenutup}</p>
                </div>
              </div>

              {/* Signature Block (Supports TTE & Dual Camat Signature) */}
              <div className="mt-8 font-sans text-[11pt]">
                {includeCamat ? (
                  <div className="flex justify-between items-start text-center">
                    {/* Left: Camat */}
                    <div className="w-[45%]">
                      <p className="font-bold">Mengetahui,</p>
                      <p className="font-bold">Camat Simpur</p>
                      <div className="h-20 flex items-center justify-center">
                        <span className="text-xs text-gray-400 font-sans italic">(Tanda Tangan Camat)</span>
                      </div>
                      <p className="font-bold uppercase underline text-[11pt]">........................................</p>
                      <p className="text-[9.5pt] text-gray-700 mt-0.5">NIP. ....................................</p>
                    </div>

                    {/* Right: Pejabat Penandatangan */}
                    <div className="w-[45%] text-center">
                      {isTTE ? (
                        <div className="my-2 min-h-[75px] flex items-center justify-center">
                          <TTESignatureBox
                            officerTitle={pejabatJabatan}
                            officerName={pejabatNama}
                            nip={pejabatNip}
                            dateStr={fmtShortDate(tanggalSurat)}
                            verifyUrl={`https://sistemdidesa.id/verify-tte?doc=${encodeURIComponent(nomorSurat)}`}
                          />
                        </div>
                      ) : (
                        <>
                          <p className="font-bold">{pejabatJabatan}</p>
                          <div className="my-2 h-20" />
                          <p className="font-bold uppercase underline text-[12pt]">{pejabatNama}</p>
                          {pejabatNip && pejabatNip !== '-' && (
                            <p className="text-[10pt] text-gray-800 mt-0.5">NIP. {pejabatNip}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end text-center">
                    <div className="w-[55%]">
                      {isTTE ? (
                        <div className="my-2 min-h-[75px] flex items-center justify-center">
                          <TTESignatureBox
                            officerTitle={pejabatJabatan}
                            officerName={pejabatNama}
                            nip={pejabatNip}
                            dateStr={fmtShortDate(tanggalSurat)}
                            verifyUrl={`https://sistemdidesa.id/verify-tte?doc=${encodeURIComponent(nomorSurat)}`}
                          />
                        </div>
                      ) : (
                        <>
                          <p className="font-bold">{pejabatJabatan}</p>
                          <div className="my-2 h-20" />
                          <p className="font-bold uppercase underline text-[12pt]">{pejabatNama}</p>
                          {pejabatNip && pejabatNip !== '-' && (
                            <p className="text-[10pt] text-gray-800 mt-0.5">NIP. {pejabatNip}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SaaS Global Footer */}
              <div className="mt-8" dangerouslySetInnerHTML={{ __html: SAAS_CONFIG.globalFooterHTML }} />
            </div>

            {/* PAGE 2: Lampiran Daftar Penerima (If Attached > 3 or Forced) */}
            {isAttached && (
              <div 
                id="undangan-page-2"
                style={{ 
                  minHeight: '1123px',
                  boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
                }}
                className="undangan-page-sheet bg-white text-black p-[20mm] font-serif text-[11pt] leading-relaxed relative flex flex-col justify-between shrink-0 overflow-hidden"
              >
                <div>
                  {/* Header Lampiran */}
                  <div className="font-sans border-b-[3px] border-black pb-4 mb-8">
                    <div className="flex justify-between font-bold text-[11pt] mb-1">
                      <span className="tracking-wide">LAMPIRAN SURAT UNDANGAN</span>
                      <span>Halaman 2</span>
                    </div>
                    <table className="mt-3 text-[10pt] font-sans">
                      <tbody>
                        <tr>
                          <td className="w-28 font-normal py-0.5">Nomor Surat</td>
                          <td className="w-4 text-center py-0.5">:</td>
                          <td className="py-0.5">{nomorSurat}</td>
                        </tr>
                        <tr>
                          <td className="font-normal py-0.5">Tanggal Surat</td>
                          <td className="text-center py-0.5">:</td>
                          <td className="py-0.5">{fmtShortDate(tanggalSurat)}</td>
                        </tr>
                        <tr>
                          <td className="font-normal py-0.5">Perihal</td>
                          <td className="text-center py-0.5">:</td>
                          <td className="font-bold py-0.5">{perihal}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h3 className="text-center font-bold font-sans uppercase text-[13pt] mb-6">
                    DAFTAR PENERIMA UNDANGAN
                  </h3>

                  {/* Recipients Table */}
                  <table className="w-full border-collapse border border-black font-sans text-[11pt] mb-8">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black px-3 py-3 text-center w-12 font-bold">NO</th>
                        <th className="border border-black px-4 py-3 text-center font-bold">NAMA / PENERIMA</th>
                        <th className="border border-black px-4 py-3 text-center font-bold">JABATAN / INSTANSI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipients.map((r, i) => (
                        <tr key={r.id}>
                          <td className="border border-black px-3 py-2 text-center font-bold">{i + 1}</td>
                          <td className="border border-black px-4 py-2 font-bold">{r.name}</td>
                          <td className="border border-black px-4 py-2">{r.jabatan || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Signature Block for Page 2 */}
                <div className="mt-8 font-sans text-[11pt]">
                  <div className="flex justify-end text-center">
                    <div className="w-[55%]">
                      {isTTE ? (
                        <div className="my-2 min-h-[75px] flex items-center justify-center">
                          <TTESignatureBox
                            officerTitle={pejabatJabatan}
                            officerName={pejabatNama}
                            nip={pejabatNip}
                            dateStr={fmtShortDate(tanggalSurat)}
                            verifyUrl={`https://sistemdidesa.id/verify-tte?doc=${encodeURIComponent(nomorSurat)}`}
                          />
                        </div>
                      ) : (
                        <>
                          <p className="font-bold">{pejabatJabatan}</p>
                          <div className="my-2 h-20" />
                          <p className="font-bold uppercase underline text-[12pt]">{pejabatNama}</p>
                          {pejabatNip && pejabatNip !== '-' && (
                            <p className="text-[10pt] text-gray-800 mt-0.5">NIP. {pejabatNip}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* SaaS Global Footer */}
                <div className="mt-8" dangerouslySetInnerHTML={{ __html: SAAS_CONFIG.globalFooterHTML }} />
              </div>
            )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Stylesheet for High Fidelity A4 Print Preview */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #undangan-print-wrapper, #undangan-print-wrapper * {
            visibility: visible !important;
          }
          #undangan-print-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            transform: none !important;
          }
          .undangan-page-sheet {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            background: white !important;
          }
          .undangan-page-sheet:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Success Dialog */}
      {showSuccessDialog && (
        <PrintSuccessDialog
          letterId={savedLetterId}
          nomorSurat={nomorSurat}
          jenisSurat="Surat Undangan"
          namaPenduduk={recipients[0]?.name || 'Daftar Penerima'}
          onClose={() => setShowSuccessDialog(false)}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
}
