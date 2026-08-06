import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Printer, Search, User, FileText, FileSignature, 
  ZoomIn, ZoomOut, Plus, ShieldAlert, Check, X, Edit2, Save, 
  Loader2, RefreshCw, Calendar, CheckCircle2, Users, FileSpreadsheet,
  ToggleLeft, ToggleRight, Trash2, MapPin, Building2, ChevronRight
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
import { capitalizeWords, capitalizeResidentFields } from '../../../utils/textUtils';
import { useDragScroll } from '../../../hooks/useDragScroll';

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
  const [perihal, setPerihal] = useState(editData?.perihal || editData?.keperluan || 'Musyawarah Batas Tanah Posyandu HPTT');

  // Recipients State
  const [recipients, setRecipients] = useState<Recipient[]>(editData?.recipients || [
    { id: '1', name: 'Isya Ansari', jabatan: 'BPD', alamat: 'di Tempat' },
    { id: '2', name: 'Norliani', jabatan: 'RT.03', alamat: 'di Tempat' },
    { id: '3', name: 'Mahyudi', jabatan: '', alamat: 'di Tempat' }
  ]);
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
  const [waktuAcara, setWaktuAcara] = useState(editData?.waktuAcara || '08.00 WITA s.d selesai');
  const [tempatAcara, setTempatAcara] = useState(editData?.tempatAcara || 'Kantor Desa Wasah Hilir');

  // Paragraf Text
  const [paragrafPembuka, setParagrafPembuka] = useState(
    editData?.paragrafPembuka || 
    'Sehubungan akan di bangunnya Posyandu Harapan Pahlawan Tumpang Talu RT.03 Desa Wasah Hilir, Perlu adanya kesepakatan terkait batas tanah yang akan di bangun.'
  );
  const [paragrafPenutup, setParagrafPenutup] = useState(
    editData?.paragrafPenutup || 
    'Demikian undangan ini disampaikan, atas perhatian Kami ucapkan terimakasih.'
  );

  // Signature State
  const [pejabatNama, setPejabatNama] = useState(() => localStorage.getItem('kop_kades') || localStorage.getItem('village_kades_name') || 'FAZAKKIR RAHMAD');
  const [pejabatJabatan, setPejabatJabatan] = useState(() => localStorage.getItem('kades_title') || 'Kepala Desa');
  const [pejabatNip, setPejabatNip] = useState(() => localStorage.getItem('kades_nip') || '-');
  const [isTTE, setIsTTE] = useState<boolean>(true);

  // UI States
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);
  const [savedLetterId, setSavedLetterId] = useState<string>('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { isDragging, handleMouseDown, handleMouseMove, handleMouseUpOrLeave } = useDragScroll();

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
      setRecipients(prev => [
        ...prev,
        { id: Date.now().toString() + '_rt', name: 'Seluruh Ketua RT (RT 01 s/d RT 06)', jabatan: 'Ketua RT', alamat: 'di Tempat' },
        { id: Date.now().toString() + '_rw', name: 'Seluruh Ketua RW (RW 01 & RW 02)', jabatan: 'Ketua RW', alamat: 'di Tempat' }
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
    }
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
    
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const page1Element = document.getElementById('undangan-page-1');
    const page2Element = document.getElementById('undangan-page-2');

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Surat Undangan - ${nomorSurat}</title>
          ${styles}
          <style>
            @page { size: A4 portrait; margin: 0 !important; }
            body { 
              margin: 0; 
              padding: 0; 
              background: white; 
              color: black;
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
            }
            .page { 
              width: 210mm; 
              min-height: 297mm; 
              margin: 0 auto; 
              box-sizing: border-box; 
              background: white; 
              position: relative;
              page-break-after: always;
            }
            .page:last-child { page-break-after: avoid; }
          </style>
        </head>
        <body>
          <div class="page">
            ${page1Element ? page1Element.outerHTML : ''}
          </div>
          ${isAttached && page2Element ? `
            <div class="page">
              ${page2Element.outerHTML}
            </div>
          ` : ''}
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
      }
    }, 500);
  };

  const filteredResidents = residentSearchQuery.trim() === '' ? [] : residents.filter(r => 
    r.name?.toLowerCase().includes(residentSearchQuery.toLowerCase()) || 
    r.nik?.includes(residentSearchQuery)
  ).slice(0, 5);

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-24">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all"
          >
            <ArrowLeft size={20} className="text-slate-700 dark:text-slate-200" />
          </button>
          <div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold rounded-full uppercase tracking-wider">
              005 / UND
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              Pembuat Surat Undangan Resmi
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            <span>Simpan</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
          >
            <Printer size={18} />
            <span>Cetak / Download PDF</span>
          </button>
        </div>
      </div>

      {/* Main Form & Preview Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Form Controls (Optimized like SKTM) */}
        <div className="lg:col-span-5 space-y-6">
          
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
              </div>
            </div>

            {/* Added Recipients List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {recipients.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-3">Belum ada penerima yang ditambahkan</p>
              ) : (
                recipients.map((r, index) => (
                  <div key={r.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex justify-between items-center text-xs border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{index + 1}. {r.name}</p>
                      {r.jabatan && <p className="text-slate-500 dark:text-slate-400 text-[11px]">{r.jabatan} • {r.alamat}</p>}
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
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Maksud / Kalimat Pembuka</label>
                <textarea 
                  rows={2}
                  value={paragrafPembuka}
                  onChange={(e) => setParagrafPembuka(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium resize-none"
                />
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
                <input 
                  type="text"
                  value={waktuAcara}
                  onChange={(e) => setWaktuAcara(e.target.value)}
                  placeholder="08.00 WITA s.d selesai"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Tempat Pelaksanaan</label>
                <input 
                  type="text"
                  value={tempatAcara}
                  onChange={(e) => setTempatAcara(e.target.value)}
                  placeholder="Kantor Desa Wasah Hilir"
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

          {/* Card 4: Penandatanganan */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 border-b pb-3 dark:border-slate-800">
              <FileSignature size={18} className="text-emerald-500" />
              <span>4. Pejabat Penandatangan</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Jabatan Pejabat</label>
                <input 
                  type="text"
                  value={pejabatJabatan}
                  onChange={(e) => setPejabatJabatan(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Nama Lengkap Pejabat</label>
                <input 
                  type="text"
                  value={pejabatNama}
                  onChange={(e) => setPejabatNama(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">NIP (Opsional)</label>
                <input 
                  type="text"
                  value={pejabatNip}
                  onChange={(e) => setPejabatNip(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tanda Tangan Elektronik (TTE QR Code)</span>
                <button
                  type="button"
                  onClick={() => setIsTTE(!isTTE)}
                  className={`p-1 rounded-full transition-colors ${isTTE ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                >
                  {isTTE ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Document Preview (Matching Exact Sample Layout) */}
        <div className="lg:col-span-7 space-y-4 sticky top-6">
          {/* Zoom Controls Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Pratinjau Resmi Surat Undangan (A4)</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-slate-600 dark:text-slate-300"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 min-w-[40px] text-center">{zoomLevel}%</span>
              <button 
                onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-slate-600 dark:text-slate-300"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>

          {/* Document Paper Container */}
          <div 
            className="overflow-auto max-h-[850px] p-6 bg-slate-200 dark:bg-slate-950 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-inner flex flex-col items-center gap-8 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
          >
            {/* PAGE 1: Main Surat Undangan */}
            <div 
              id="undangan-page-1"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="w-[210mm] min-h-[297mm] bg-white text-black p-[20mm] shadow-2xl font-serif text-[11pt] leading-relaxed relative flex flex-col justify-between shrink-0"
            >
              <div>
                {/* Official Village Header (Kop Surat) */}
                <div className="flex items-center gap-4 border-b-4 border-double border-black pb-3 mb-6 text-center font-serif">
                  <img src={villageLogo} alt="Logo" className="w-20 h-24 object-contain shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-[11pt] font-bold uppercase tracking-widest leading-tight">{activeKabupaten}</h4>
                    <h3 className="text-[12pt] font-bold uppercase tracking-widest leading-tight">KECAMATAN {activeKecamatan.toUpperCase()}</h3>
                    <h2 className="text-[16pt] font-black uppercase tracking-wider leading-tight">{activeDesa.toUpperCase()}</h2>
                    <p className="text-[9pt] font-normal italic leading-snug mt-1 font-sans text-gray-700">{activeAlamat}</p>
                  </div>
                </div>

                {/* Date on Top Right */}
                <div className="flex justify-end font-sans text-[11pt] mb-2">
                  <p>{cleanDesaName}, {fmtShortDate(tanggalSurat)}</p>
                </div>

                {/* Surat Information Attributes Header */}
                <div className="font-sans text-[11pt] mb-6">
                  <table className="w-[70%] border-collapse text-[11pt]">
                    <tbody>
                      <tr>
                        <td className="w-24 font-normal py-0.5">Nomor</td>
                        <td className="w-4 text-center">:</td>
                        <td className="font-bold">{nomorSurat}</td>
                      </tr>
                      <tr>
                        <td className="font-normal py-0.5">Sifat</td>
                        <td className="text-center">:</td>
                        <td>{sifat}</td>
                      </tr>
                      <tr>
                        <td className="font-normal py-0.5">Lampiran</td>
                        <td className="text-center">:</td>
                        <td>{isAttached ? '1 (satu) Lembar' : lampiran}</td>
                      </tr>
                      <tr>
                        <td className="font-normal py-0.5">Hal</td>
                        <td className="text-center">:</td>
                        <td className="font-bold">{perihal}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Recipient Section (Kepada Yth.) Matched with Sample Layout */}
                <div className="font-sans text-[11pt] mb-6">
                  <table className="border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-12 align-top font-normal">Yth.</td>
                        <td className="align-top">
                          {isAttached ? (
                            <div>
                              <p className="font-bold">Daftar Penerima Undangan Terlampir</p>
                              <p className="italic text-[10.5pt] mt-2">di<br/>Tempat</p>
                            </div>
                          ) : (
                            <div>
                              <div className="space-y-0.5">
                                {recipients.map((r, i) => (
                                  <div key={r.id} className="flex gap-2">
                                    <span className="min-w-[18px]">{i + 1}.</span>
                                    <span>
                                      {r.name} {r.jabatan ? `(${r.jabatan})` : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <p className="italic text-[10.5pt] mt-3">di<br/>Tempat</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Paragraf Pembuka */}
                <div className="font-sans text-[11pt] text-justify space-y-3 leading-relaxed mb-4">
                  <p>{paragrafPembuka}</p>
                  <p>Dengan itu, Kami mengundang Bapak/Ibu pada:</p>
                </div>

                {/* Detail Pelaksanaan Acara (Matching Sample Formatting) */}
                <div className="pl-8 font-sans text-[11pt] mb-6">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-36 py-1 font-normal">Hari/Tanggal</td>
                        <td className="w-4 text-center">:</td>
                        <td className="font-bold py-1">{fmtDate(tglAcara)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-normal">Pukul</td>
                        <td className="text-center">:</td>
                        <td className="py-1">{waktuAcara}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-normal">Tempat</td>
                        <td className="text-center">:</td>
                        <td className="font-bold py-1">{tempatAcara}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Paragraf Penutup */}
                <div className="font-sans text-[11pt] text-justify leading-relaxed mb-8">
                  <p>{paragrafPenutup}</p>
                </div>
              </div>

              {/* Signature Block */}
              <div className="flex justify-end font-sans mt-6 text-[11pt]">
                <div className="w-[55%] text-center">
                  <p className="font-bold">{pejabatJabatan}</p>
                  
                  <div className="my-4 min-h-[85px] flex items-center justify-center">
                    {isTTE ? (
                      <TTESignatureBox
                        officerTitle={pejabatJabatan}
                        officerName={pejabatNama}
                        nip={pejabatNip}
                        dateStr={fmtShortDate(tanggalSurat)}
                        verifyUrl={`https://sistemdidesa.id/verify-tte?doc=${encodeURIComponent(nomorSurat)}`}
                      />
                    ) : (
                      <div className="h-20" />
                    )}
                  </div>

                  <p className="font-bold uppercase underline text-[12pt]">{pejabatNama}</p>
                  {pejabatNip && pejabatNip !== '-' && (
                    <p className="text-[10pt] text-gray-800 mt-0.5">NIP. {pejabatNip}</p>
                  )}
                </div>
              </div>

              {/* SaaS Global Footer */}
              <div className="mt-8" dangerouslySetInnerHTML={{ __html: SAAS_CONFIG.globalFooterHTML }} />
            </div>

            {/* PAGE 2: Lampiran Daftar Penerima (If Attached > 3 or Forced) */}
            {isAttached && (
              <div 
                id="undangan-page-2"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="w-[210mm] min-h-[297mm] bg-white text-black p-[20mm] shadow-2xl font-serif text-[11pt] leading-relaxed relative flex flex-col justify-between shrink-0"
              >
                <div>
                  {/* Header Lampiran */}
                  <div className="font-sans text-[10pt] border-b-2 border-black pb-3 mb-6">
                    <div className="flex justify-between font-bold">
                      <span>LAMPIRAN SURAT UNDANGAN</span>
                      <span>Halaman 2</span>
                    </div>
                    <table className="mt-2 text-[10pt] font-sans">
                      <tbody>
                        <tr>
                          <td className="w-28 font-normal">Nomor Surat</td>
                          <td className="w-4 text-center">:</td>
                          <td className="font-bold">{nomorSurat}</td>
                        </tr>
                        <tr>
                          <td className="font-normal">Tanggal Surat</td>
                          <td className="text-center">:</td>
                          <td>{fmtShortDate(tanggalSurat)}</td>
                        </tr>
                        <tr>
                          <td className="font-normal">Perihal</td>
                          <td className="text-center">:</td>
                          <td className="font-bold">{perihal}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h3 className="text-center font-bold font-sans uppercase text-[12pt] underline mb-6">
                    DAFTAR PENERIMA UNDANGAN
                  </h3>

                  {/* Recipients Table */}
                  <table className="w-full border-collapse border border-black font-sans text-[10.5pt] mb-8">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black px-3 py-2 text-center w-12">NO</th>
                        <th className="border border-black px-4 py-2 text-left">NAMA / PENERIMA</th>
                        <th className="border border-black px-4 py-2 text-left">JABATAN / INSTANSI</th>
                        <th className="border border-black px-3 py-2 text-center w-28">ALAMAT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipients.map((r, i) => (
                        <tr key={r.id}>
                          <td className="border border-black px-3 py-2.5 text-center font-bold">{i + 1}</td>
                          <td className="border border-black px-4 py-2.5 font-bold">{r.name}</td>
                          <td className="border border-black px-4 py-2.5">{r.jabatan || '-'}</td>
                          <td className="border border-black px-3 py-2.5 text-center italic">{r.alamat || 'di Tempat'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Signature Block on Lampiran */}
                <div className="flex justify-end font-sans text-[11pt]">
                  <div className="w-[55%] text-center">
                    <p className="font-bold">{pejabatJabatan}</p>
                    
                    <div className="my-4 min-h-[80px] flex items-center justify-center">
                      {isTTE ? (
                        <TTESignatureBox
                          officerTitle={pejabatJabatan}
                          officerName={pejabatNama}
                          nip={pejabatNip}
                          dateStr={fmtShortDate(tanggalSurat)}
                          verifyUrl={`https://sistemdidesa.id/verify-tte?doc=${encodeURIComponent(nomorSurat)}`}
                        />
                      ) : (
                        <div className="h-16" />
                      )}
                    </div>

                    <p className="font-bold uppercase underline text-[11pt]">{pejabatNama}</p>
                    {pejabatNip && pejabatNip !== '-' && (
                      <p className="text-[9.5pt] text-gray-800 mt-0.5">NIP. {pejabatNip}</p>
                    )}
                  </div>
                </div>

                {/* SaaS Global Footer */}
                <div className="mt-8" dangerouslySetInnerHTML={{ __html: SAAS_CONFIG.globalFooterHTML }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Print Iframe */}
      <iframe 
        ref={iframeRef}
        title="Print Frame"
        className="hidden"
      />

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
