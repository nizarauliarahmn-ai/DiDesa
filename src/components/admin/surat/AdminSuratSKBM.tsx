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
import { User, Award, FileSignature, AlertCircle, History,
  ZoomIn, ZoomOut
} from 'lucide-react';
import { getLetterClassifications, incrementSequenceNumber, generateLetterNumberAsync } from '../../../utils/letterClassifications';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { getPrintSignatureHTML } from '../../../utils/signature';
import { showToast } from '../../../utils/toast';
import { capitalizeResidentFields, capitalizeWords } from '../../../utils/textUtils';
import { useDragScroll } from '../../../hooks/useDragScroll';
import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';
import { UnifiedResidentSearch } from '../penduduk/UnifiedResidentSearch';
import { SuggestCombobox } from './SuggestCombobox';
import { KEPERLUAN_OPTIONS } from './keperluanOptions';
import { checkResidentExists } from '../../../utils/residentSync';

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

export default function AdminSuratSKBM({ 
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
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0]);
  const backdateKlas = getLetterClassifications().find(c => c.klasifikasi === 'SKBM') || { klasifikasi: 'SKBM', kodeKlasifikasi: '400' };
  const kodeKlasifikasiSKBM = backdateKlas.kodeKlasifikasi || '400';
  const { isBackdate, setIsBackdate } = useBackdateNumber(tanggalSurat, backdateKlas.klasifikasi, backdateKlas.kodeKlasifikasi);
  const [manualSequence, setManualSequence] = useState('');

  const handleCustomNomorSurat = (nomor: string) => {
    setFormData((prev: any) => ({ ...prev, nomorSurat: nomor }));
  };

  // Auto-generate nomor surat saat membuat surat baru (mode normal)
  useEffect(() => {
    if (!editData && !formData.nomorSurat) {
      generateLetterNumberAsync(backdateKlas.klasifikasi, backdateKlas.kodeKlasifikasi)
        .then(generatedNo => setFormData((prev: any) => ({ ...prev, nomorSurat: generatedNo })))
        .catch(err => console.error('Gagal generate nomor surat:', err));
    }
  }, [editData]);

  React.useEffect(() => {
    if (presetResident) {
      handleSelectResident(presetResident);
    }
  }, [presetResident]);

  const [loading, setLoading] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddInitialData, setQuickAddInitialData] = useState<{nik?: string, name?: string}>({});
  const [useEsignature, setUseEsignature] = useState(true);
  const [success, setSuccess] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChild, setSelectedChild] = useState<Resident | null>(null);
  const [showRiwayat, setShowRiwayat] = useState(false);
  const [riwayat, setRiwayat] = useState<any[]>([]);

  // Prefill in edit mode
  useEffect(() => {
    if (editData) {
      setFormData(prev => ({ ...prev, ...editData }));
    }
  }, [editData]);

  // Form Data
  const [formData, setFormData] = useState({
    nomorSurat: '',
    
    // Data Penduduk
    nama: '',
    nik: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: 'Laki-Laki',
    agama: 'Islam',
    pekerjaan: '',
    kewarganegaraan: 'Indonesia',
    statusPerkawinan: 'Belum Kawin',
    rt: '001',
    rw: '001',
    alamat: '',
    keperluan: 'Persyaratan Administrasi',
    
    // Pejabat
    namaPejabat: resolveKadesName() || '',
    jabatanPejabat: 'Kepala Desa',
    includeCamat: false,
    
    // Kop Settings
    namaDesa: localStorage.getItem('kop_desa') || 'Sukamakmur',
    namaKecamatan: localStorage.getItem('kop_kecamatan') || 'Simpur',
    namaKabupaten: localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan',
    namaProvinsi: localStorage.getItem('kop_provinsi') || 'Kalimantan Selatan',
    alamatKantor: localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RK.001 Kodepos 71261',
    kontakKantor: localStorage.getItem('kop_kontak') || '081346867519 | pemdesasukamakmur@gmail.com',
  });

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
      alamat: parsed.cleanAddress,
      ...(parsed.rt ? { rt: parsed.rt } : {}),
      ...(parsed.rw ? { rw: parsed.rw } : {})
    }));
  };

  const updateResidentData = async (nik: string, data: any) => {
    if (!nik || nik === '-') return;
    try {
      const checkRes = await fetch(`/api/residents`);
      const allResidents = await checkRes.json();
      const existing = allResidents.find((r: any) => r.nik === nik);

      const residentData = {
        name: data.name,
        birthPlace: data.birthPlace,
        birthDate: data.birthDate,
        gender: data.gender,
        religion: data.religion,
        job: data.job,
        address: data.address,
        rt_rw: `${data.rt}/${data.rw}`
      };

      if (existing) {
        await fetch(`/api/residents/${nik}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...existing, ...residentData })
        });
      } else {
        await fetch(`/api/residents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nik, status: 'Aktif', statusColor: 'green', ...residentData })
        });
      }

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Data Penduduk Diperbarui',
          message: `Data penduduk atas nama ${data.name} telah diperbarui secara otomatis melalui pembuatan SKBM.`,
          category: 'Residents'
        })
      });
    } catch (e) {
      console.error('Failed to sync resident data', e);
    }
  };

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
    const sktm = configs.find(c => c.klasifikasi === 'SKBM') || { id: 'fallback_sktm', jenis: 'SKBM', klasifikasi: 'SKBM', kodeKlasifikasi: '400', noUrutTerakhir: 0 };
    
    

    const savedRiwayat = localStorage.getItem('riwayat_surat_skbm');
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

  const handleSelectResident = (res: Resident) => {
    setSelectedChild(res);
    const rt_rw = (res as any).rt_rw || '001/001';
    const [rt, rw] = rt_rw.split('/');

    setFormData(prev => ({
      ...prev,
      nama: capitalizeResidentFields(res).name,
      nik: res.nik,
      tempatLahir: capitalizeResidentFields(res).birthPlace,
      tanggalLahir: res.birthDate,
      jenisKelamin: res.gender || 'Laki-Laki',
      agama: (res as any).religion || 'Islam',
      pekerjaan: res.job || '',
      alamat: capitalizeResidentFields(res).address,
      rt: rt || '001',
      rw: rw || '001',
    }));
    setSearchQuery('');
  };

  const handlePrint = async (skipCheck = false) => {
    if (!formData.nama || !formData.nama.trim()) {
      showToast("Mohon lengkapi Nama Pemohon terlebih dahulu sebelum mencetak surat.", 'error');
      return;
    }
    if (isBackdate && !(manualSequence || '').trim()) {
      showToast('Mohon isi nomor urut surat sisipan.', 'error');
      return;
    }
    setLoading(true);
    if (!skipCheck && (formData.nama || formData.nik)) {
      setLoading(true);
      const exists = await checkResidentExists(formData.nik, formData.nama);
      setLoading(false);
      if (!exists) {
        setShowQuickAddModal(true);
        return;
      }
    }


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
          <title>Cetak SKBM - ${formData.nama}</title>
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
              padding: 56px 75px !important; /* matches preview's padding precisely */
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
            /* Hide crop marks in print */
            .crop-mark { 
              display: none !important; 

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
            <div class="printable-area bg-white dark:bg-slate-900 text-black">
              ${content}
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Trigger printing directly and reliably from parent window
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
    const updatedFields = {
      nomor: formData.nomorSurat,
      nik: formData.nik,
      nama: formData.nama,
      keperluan: formData.keperluan,
      data: formData
    };

    if (editLetterId) {
      updateLetterHistory(editLetterId, updatedFields);
    } else {
      addLetterHistory({
        ...updatedFields,
        jenis: 'SKBM',
        tanggal: isBackdate ? new Date(tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        status: 'Selesai'
      });
      if (!isBackdate) incrementSequenceNumber('SKBM');
    }

    const newEntry = {
      id: Date.now(),
      nama: formData.nama,
      nomor: formData.nomorSurat,
      tanggal: isBackdate ? new Date(tanggalSurat).toISOString() : new Date().toISOString(),
      data: formData
    };
    const updatedRiwayat = [newEntry, ...riwayat].slice(0, 50);
    setRiwayat(updatedRiwayat);
    localStorage.setItem('riwayat_surat_skbm', JSON.stringify(updatedRiwayat));
    setLoading(false);
    setSuccess(true);
  };

  const v = (val: string, fallback = '-') => (val && val.trim() !== '' ? capitalizeWords(val) : fallback);
  
  const generateHTML = () => {
    const today = new Date();
    const printDate = isBackdate ? new Date(tanggalSurat) : today;
    const tglFormatted = printDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const villageLogo = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';

    const activeKabupaten = localStorage.getItem('kop_kabupaten') || formData.namaKabupaten || 'Hulu Sungai Selatan';
    const activeKecamatan = localStorage.getItem('kop_kecamatan') || formData.namaKecamatan || 'Simpur';
    const activeDesa = localStorage.getItem('kop_desa') || formData.namaDesa || 'Sukamakmur';
    const activeAlamat = localStorage.getItem('kop_alamat') || formData.alamatKantor || 'Jalan Keramat RT.002 RK.001 Kodepos 71261';
    const activeProvinsi = localStorage.getItem('kop_provinsi') || formData.namaProvinsi || 'Kalimantan Selatan';

    const cleanStr = (s: string, regex: RegExp) => (s || "").replace(regex, "");
    const fmtDate = (d: string) => {
      if (!d) return '';
      try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return d;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch (e) { return d; }
    };

    return `
      ${generateKopSuratHTML()}



      <!-- JUDUL SURAT -->
      <div style="text-align:center;margin-bottom:15px;">
        <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">SURAT KETERANGAN BELUM PERNAH MENIKAH</h3>
        <p class="nomor-surat-cetak" style="margin:2px 0 0 0;font-size:14px;text-transform:uppercase;">Nomor : ${v(formData.nomorSurat, '... / ... / ... / ' + (typeof printDate !== 'undefined' ? printDate : new Date()).getFullYear()).toUpperCase()}</p>
      </div>


      <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">
        Yang bertanda tangan di bawah ini:
      </p>

      <!-- DATA PEJABAT -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.6;font-size:14px;">
        <tr><td style="width:30%;">a. Nama</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(formData.namaPejabat)}</strong></td></tr>
        <tr><td>b. Jabatan</td><td>:</td><td><strong style="text-transform:uppercase;">${v(formData.jabatanPejabat)} ${activeDesa.toUpperCase()}</strong></td></tr>
      </table>

      <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">
        Menerangkan dengan sebenarnya bahwa:
      </p>

      <!-- DATA PENDUDUK -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
        <tr><td style="width:30%;">a. Nama Lengkap</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(formData.nama)}</strong></td></tr>
        <tr><td>b. NIK</td><td>:</td><td>${v(formData.nik)}</td></tr>
        <tr><td>c. Tempat, Tanggal Lahir</td><td>:</td><td>${v(formData.tempatLahir)}, ${fmtDate(formData.tanggalLahir)}</td></tr>
        <tr><td>d. Jenis Kelamin</td><td>:</td><td>${v(formData.jenisKelamin)}</td></tr>
        <tr><td>e. Agama</td><td>:</td><td>${v(formData.agama)}</td></tr>
        <tr><td>f. Pekerjaan</td><td>:</td><td>${v(formData.pekerjaan)}</td></tr>
        <tr><td>g. Status Perkawinan</td><td>:</td><td>${v(formData.statusPerkawinan)}</td></tr>
        <tr><td style="vertical-align:top;">h. Alamat</td><td style="vertical-align:top;">:</td><td>${v(formData.alamat)} RT.${v(formData.rt)} RW.${v(formData.rw)}<br/>Desa ${cleanStr(v(formData.namaDesa), /^(desa|kelurahan)\s+/i)} Kecamatan ${cleanStr(v(formData.namaKecamatan), /^kecamatan\s+/i)}</td></tr>
      </table>


            <!-- PERNYATAAN -->
      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">
        Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas benar-benar berstatus belum kawin dan belum pernah melangsungkan perkawinan dengan siapa pun.
      </p>

      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi pernikahan atau pendaftaran pekerjaan.
      </p>

      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:25px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>

      <!-- TANDA TANGAN -->
      ${getPrintSignatureHTML(
        formData.namaDesa,
        tglFormatted,
        formData.namaPejabat,
        formData.jabatanPejabat,
        // Optional NIP lookup from officers
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
    <div className="space-y-6 pb-20">
      {/* Header (Reusable Standard Header) */}
      <SuratEditorHeader 
          template={getLetterHeaderTemplate('SKBM', { kode: '400', jenis: 'Surat Keterangan Belum Menikah', deskripsi: 'Surat Keterangan Belum Pernah Menikah (SKBM)', nomorSurat: formData.nomorSurat })}
          icon={<Award className="w-5 h-5" />}
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
                Riwayat Pembuatan SKBM
              </h2>
              <button 
                onClick={() => {
                  if (confirm('Kosongkan riwayat?')) {
                    setRiwayat([]);
                    localStorage.removeItem('riwayat_surat_skbm');
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
                  onClick={() => setFormData(item.data)}
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

          {/* Backdate Config - Paling Atas Form */}
          <BackdateConfig
            prefix={kodeKlasifikasiSKBM}
            suffix="WHI-SKBM"
            tanggalSurat={tanggalSurat}
            onTanggalSuratChange={setTanggalSurat}
            isBackdate={isBackdate}
            onBackdateChange={setIsBackdate}
            manualSequence={manualSequence}
            onManualSequenceChange={setManualSequence}
            normalNomor={formData.nomorSurat}
            onCustomNomorSurat={handleCustomNomorSurat}
          />
          
          

          {/* Form Detail */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none space-y-8">
            {/* Data Penduduk */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Data Pemohon</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                <UnifiedResidentSearch
                  formData={formData}
                  setFormData={setFormData}
                  residents={residents}
                  onOpenQuickAdd={(nik, name) => {
                    setQuickAddInitialData({ nik: nik || formData.nik, name: name || formData.nama || (formData as any).name || (formData as any).namaAyah || (formData as any).namaIbu });
                    setShowQuickAddModal(true);
                  }}
                />
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Jenis Kelamin</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.jenisKelamin}
                    onChange={(e) => setFormData({...formData, jenisKelamin: e.target.value})}
                  >
                    <option value="Laki-Laki">Laki-Laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Agama</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
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
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                  <SuggestCombobox
                    value={formData.pekerjaan}
                    onChange={(v) => setFormData({...formData, pekerjaan: v})}
                    options={jobs}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Status Perkawinan</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.statusPerkawinan}
                    onChange={(e) => setFormData({...formData, statusPerkawinan: e.target.value})}
                  >
                    <option value="Belum Kawin">Belum Kawin</option>
                    <option value="Kawin">Kawin</option>
                    <option value="Cerai Hidup">Cerai Hidup</option>
                    <option value="Cerai Mati">Cerai Mati</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Kandangan"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.tempatLahir}
                    onChange={(e) => setFormData({...formData, tempatLahir: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.tanggalLahir}
                    onChange={(e) => setFormData({...formData, tanggalLahir: e.target.value})}
                  />
                </div>
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:col-span-2">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Jl. Keramat, Desa Wasah Hilir"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                      value={formData.alamat}
                      onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                      onBlur={(e) => handleAlamatBlur(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-1 space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RT</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      placeholder="Contoh: 001"
                      value={formData.rt}
                      onChange={(e) => setFormData({...formData, rt: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-1 space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RW</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      placeholder="Contoh: 002"
                      value={formData.rw}
                      onChange={(e) => setFormData({...formData, rw: e.target.value})}
                    />
                  </div>
</div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Keperluan Surat (Diberikan Untuk...)</label>
                  <SuggestCombobox
                    value={formData.keperluan}
                    onChange={(v) => setFormData({...formData, keperluan: v})}
                    options={KEPERLUAN_OPTIONS}
                    placeholder="Contoh: Bantuan Beasiswa"
                  />
                  <p className="mt-1 text-[10px] text-emerald-600 font-medium">* Tuliskan secara spesifik tujuan pembuatan surat ini.</p>
                </div>
              </div>
            </div>
          </section>

            {/* Pejabat Penandatangan */}
            <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none mt-6">
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <FileSignature className="w-4 h-4 text-amber-600" />
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
                        // Update role if found
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
                  {/* Toggle TTE / QR Code */}
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

                  {/* Toggle Mengetahui Camat */}
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
            </section>
          </div>

        {/* Preview Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-900 text-xs">Informasi Penting & Cetak</h4>
              <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                Pastikan data orang tua dan anak sudah sesuai dengan KTP/KK terbaru. 
                Gunakan fitur pencarian untuk meminimalkan kesalahan pengetikan. Jika tombol cetak tidak merespon, silakan gunakan menu <strong>Buka di Tab Baru</strong>.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col h-[700px] sticky top-[170px]">
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
            
            <div 
              ref={dragProps.ref}
              onMouseDown={dragProps.onMouseDown}
              onMouseLeave={dragProps.onMouseLeave}
              onMouseUp={dragProps.onMouseUp}
              onMouseMove={dragProps.onMouseMove}
              style={{ ...dragProps.style }}
              className="flex-1 bg-slate-200/40 overflow-auto relative flex p-6 justify-center items-start"
            >
              <div 
                style={{
                  width: `${794 * previewZoom}px`,
                  height: `${1123 * previewZoom}px`,
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                  borderRadius: '12px',
                  transition: 'width 0.2s ease-out, height 0.2s ease-out'
                }}
                className="bg-white dark:bg-slate-900 m-auto shrink-0 relative"
              >
                {/* Visual Crop Marks */}
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

      {/* Hidden Iframe for Printing */}
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

      {/* Pop-up Dialog Success Printing */}
      <PrintSuccessDialog
        isOpen={success}
        onClose={() => setSuccess(false)}
        nomorSurat={formData.nomorSurat}
        namaWarga={formData.nama}
        jenisSurat="Surat Keterangan Belum Pernah Menikah (SKBM)"
        onBackToTemplates={onBack}
      />
    
      <QuickAddResidentModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onSuccess={() => {
          setShowQuickAddModal(false);
          handlePrint(true);
        }}
        initialData={quickAddInitialData}
      />
    </div>
  );
}
