import { fetchResidentsCached } from '../../../utils/apiCache';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PrintSuccessDialog from './PrintSuccessDialog';
import { FileText, ArrowLeft, Printer, Save, Search, User, 
  MapPin, Calendar, Briefcase, FileSignature, AlertCircle, CheckCircle2, History, Trash2, Heart,
  ZoomIn, ZoomOut
} from 'lucide-react';
import { getLetterClassifications, saveLetterClassifications, incrementSequenceNumber, generateLetterNumber } from '../../../utils/letterClassifications';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { getPrintSignatureHTML } from '../../../utils/signature';
import { showToast } from '../../../utils/toast';
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
}

export default function AdminSuratSKH({ 
  onBack,
  editData,
  editLetterId
}: { 
  onBack: () => void;
  editData?: any;
  editLetterId?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChild, setSelectedChild] = useState<Resident | null>(null);
  const [showRiwayat, setShowRiwayat] = useState(false);
  const [riwayat, setRiwayat] = useState<any[]>([]);

  // Prefill in edit mode
  useEffect(() => {
    if (editData) {
      setFormData(editData);
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
    pekerjaan: 'Wiraswasta',
    kewarganegaraan: 'Indonesia',
    statusPerkawinan: 'Belum Kawin',
    rt: '001',
    rw: '001',
    alamat: '',
    keperluan: 'Persyaratan Administrasi',
    
    // Data Kehilangan
    barangHilang: '',
    tanggalKehilangan: '',
    tempatKehilangan: '',
    keteranganKehilangan: '',
    
    // Pejabat
    namaPejabat: localStorage.getItem('kop_kades') || 'FAZAKKIR RAHMAD',
    jabatanPejabat: 'Kepala Desa',
    includeCamat: false,
    
    // Kop Settings
    namaDesa: localStorage.getItem('kop_desa') || 'Wasah Hilir',
    namaKecamatan: localStorage.getItem('kop_kecamatan') || 'Simpur',
    namaKabupaten: localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan',
    namaProvinsi: localStorage.getItem('kop_provinsi') || 'Kalimantan Selatan',
    alamatKantor: localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RK.001 Kodepos 71261',
    kontakKantor: localStorage.getItem('kop_kontak') || '081346867519 | pemdesawasahhilir@gmail.com',
  });

  const [previewZoom, setPreviewZoom] = useState(0.45);
  const dragProps = useDragScroll();
  const letterFont = localStorage.getItem('village_letter_font') || 'Arial, sans-serif';
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const jobs = [
    'Belum/Tidak Bekerja', 'Mengurus Rumah Tangga', 'Pelajar/Mahasiswa', 'Pensiunan', 
    'Pegawai Negeri Sipil', 'Tentara Nasional Indonesia', 'Kepolisian RI', 'Perdagangan', 
    'Petani/Pekebun', 'Peternak', 'Nelayan/Perikanan', 'Industri', 'Konstruksi', 'Transportasi', 
    'Karyawan Swasta', 'Karyawan BUMN', 'Karyawan BUMD', 'Karyawan Honorer', 'Buruh Harian Lepas', 
    'Buruh Tani/Perkebunan', 'Buruh Nelayan/Perikanan', 'Buruh Peternakan', 'Pembantu Rumah Tangga', 
    'Tukang Cukur', 'Tukang Listrik', 'Tukang Batu', 'Tukang Kayu', 'Tukang Sol Sepatu', 
    'Tukang Las/Pandai Besi', 'Tukang Jahit', 'Tukang Masak', 'Penata Rambut', 'Penata Rias', 
    'Penata Busana', 'Mekanik', 'Seniman', 'Tabib', 'Paraji', 'Perancang Busana', 'Penterjemah', 
    'Imam Masjid', 'Pendeta', 'Pastor', 'Wartawan', 'Ustadz/Mubaligh', 'Juru Masak', 'Promotor Acara', 
    'Anggota DPR-RI', 'Anggota DPD', 'Anggota BPK', 'Presiden', 'Wakil Presiden', 'Anggota Mahkamah Konstitusi', 
    'Anggota Kabinet/Kementerian', 'Duta Besar', 'Gubernur', 'Wakil Gubernur', 'Bupati', 'Wakil Bupati', 
    'Walikota', 'Wakil Walikota', 'Anggota DPRD Provinsi', 'Anggota DPRD Kabupaten/Kota', 'Dosen', 
    'Guru', 'Pilot', 'Pengacara', 'Notaris', 'Arsitek', 'Akuntan', 'Konsultan', 'Dokter', 'Bidan', 
    'Perawat', 'Apoteker', 'Psikiater/Psikolog', 'Penyiar Televisi', 'Penyiar Radio', 'Pelaut', 
    'Peneliti', 'Sopir', 'Pialang', 'Paranormal', 'Pedagang', 'Perangkat Desa', 'Kepala Desa', 
    'Biarawati', 'Wiraswasta'
  ];

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
          message: `Data penduduk atas nama ${data.name} telah diperbarui secara otomatis melalui pembuatan SKH.`,
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
    const skh = configs.find(c => c.klasifikasi === 'SKH') || { id: 'fallback_skh', jenis: 'SKH', klasifikasi: 'SKH', kodeKlasifikasi: '400', noUrutTerakhir: 0 };
    
    if (!editData) {
      const generatedNo = generateLetterNumber(skh.klasifikasi, skh.kodeKlasifikasi || '400');
      setFormData(prev => ({
        ...prev,
        nomorSurat: generatedNo
      }));
    }

    const savedRiwayat = localStorage.getItem('riwayat_surat_skh');
    if (savedRiwayat) setRiwayat(JSON.parse(savedRiwayat));

    const activePejabat = localStorage.getItem('kop_kades') || 'FAZAKKIR RAHMAD';
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
      nama: res.name,
      nik: res.nik,
      tempatLahir: res.birthPlace,
      tanggalLahir: res.birthDate,
      jenisKelamin: res.gender || 'Laki-Laki',
      agama: (res as any).religion || 'Islam',
      pekerjaan: res.job || 'Wiraswasta',
      alamat: res.address,
      rt: rt || '001',
      rw: rw || '001',
    }));
    setSearchQuery('');
  };

  const handlePrint = async () => {
    if (!formData.nama || !formData.nama.trim()) {
      showToast("Mohon lengkapi Nama Pemohon terlebih dahulu sebelum mencetak surat.", 'error');
      return;
    }
    setLoading(true);

    await updateResidentData(formData.nik, { 
      name: formData.nama, 
      birthPlace: formData.tempatLahir, 
      birthDate: formData.tanggalLahir, 
      gender: formData.jenisKelamin,
      religion: formData.agama,
      job: formData.pekerjaan,
      address: formData.alamat,
      rt: formData.rt,
      rw: formData.rw
    });

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
          <title>Cetak SKH - ${formData.nama}</title>
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
        jenis: 'SKH',
        tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        status: 'Selesai'
      });
      incrementSequenceNumber('SKH');
    }

    const newEntry = {
      id: Date.now(),
      nama: formData.nama,
      nomor: formData.nomorSurat,
      tanggal: new Date().toISOString(),
      data: formData
    };
    const updatedRiwayat = [newEntry, ...riwayat].slice(0, 50);
    setRiwayat(updatedRiwayat);
    localStorage.setItem('riwayat_surat_skh', JSON.stringify(updatedRiwayat));
    setLoading(false);
    setSuccess(true);
  };

  const v = (val: string, fallback = '-') => (val && val.trim() !== '' ? val : fallback);
  
  const generateHTML = () => {
    const today = new Date();
    const tglFormatted = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const villageLogo = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';

    const activeKabupaten = localStorage.getItem('kop_kabupaten') || formData.namaKabupaten || 'Hulu Sungai Selatan';
    const activeKecamatan = localStorage.getItem('kop_kecamatan') || formData.namaKecamatan || 'Simpur';
    const activeDesa = localStorage.getItem('kop_desa') || formData.namaDesa || 'Wasah Hilir';
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
      <!-- KOP SURAT -->
      <div style="border-bottom:3px solid #000;margin-bottom:12px;">
        <div style="display:flex;align-items:flex-start;padding-bottom:6px;border-bottom:1px solid #000;margin-bottom:1px;font-family:${letterFont};">
          <div style="display:flex;width:100%;align-items:center;">
            <div style="width:90px;height:100px;flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-right:15px;">
              <img src="${villageLogo}" style="width:100%;height:100%;object-fit:contain;" />
            </div>
            <div style="text-align:center;flex:1;padding-right:90px;">
            <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">${activeKabupaten.toUpperCase()}</div>
            <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">${activeKecamatan.toUpperCase()}</div>
            <div style="font-weight:900;font-size:26px;text-transform:uppercase;letter-spacing:2px;line-height:1.1;margin:2px 0 3px 0;">${activeDesa.toUpperCase()}</div>
            <div style="font-size:10.5px;margin-top:4px;text-transform:capitalize;line-height:1.15;margin:2px 0 1px 0;">${activeAlamat}</div>
            <div style="font-size:10.5px;line-height:1.15;margin:1px 0 0 0;">${formData.kontakKantor || '0813 4686 7519, pemdeswasahhilir@gmail.com'}</div>
          </div>
          </div>
        </div>
      </div>

      <!-- JUDUL SURAT -->
      <div style="text-align:center;margin-bottom:15px;">
        <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">SURAT KETERANGAN KEHILANGAN</h3>
        <p style="margin:2px 0 0 0;font-size:14px;">Nomor : ${v(formData.nomorSurat, '... / ... / ... / ' + today.getFullYear())}</p>
      </div>

      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">
        Yang bertanda tangan di bawah ini Kepala Desa ${cleanStr(activeDesa, /^(desa|kelurahan)\s+/i)} Kecamatan ${cleanStr(activeKecamatan, /^kecamatan\s+/i)} Kabupaten ${cleanStr(activeKabupaten, /^(kabupaten|kota)\s+/i)} Provinsi ${cleanStr(activeProvinsi, /^provinsi\s+/i)}, menerangkan dengan sebenarnya bahwa :
      </p>

      <!-- DATA PENDUDUK -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.3;font-size:14px;">
        <tr><td style="width:30%;">Nama Lengkap</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(formData.nama)}</strong></td></tr>
        <tr><td>NIK</td><td>:</td><td>${v(formData.nik)}</td></tr>
        <tr><td>Tempat, Tanggal lahir</td><td>:</td><td>${v(formData.tempatLahir)}, ${fmtDate(formData.tanggalLahir)}</td></tr>
        <tr><td>Jenis Kelamin</td><td>:</td><td>${v(formData.jenisKelamin)}</td></tr>
        <tr><td>Agama</td><td>:</td><td>${v(formData.agama)}</td></tr>
        <tr><td>Pekerjaan</td><td>:</td><td>${v(formData.pekerjaan)}</td></tr>
        <tr><td>Status Perkawinan</td><td>:</td><td>${v(formData.statusPerkawinan)}</td></tr>
        <tr><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td>${v(formData.alamat)} RT.${v(formData.rt)} RW.${v(formData.rw)}<br/>Desa ${cleanStr(v(formData.namaDesa), /^(desa|kelurahan)\s+/i)} Kecamatan ${cleanStr(v(formData.namaKecamatan), /^kecamatan\s+/i)}</td></tr>
      </table>

            <!-- PERNYATAAN -->
      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;margin-top:15px;">
        Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas benar telah melaporkan kehilangan dokumen/barang dengan rincian sebagai berikut:
      </p>

      <!-- DATA KEHILANGAN -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:8px;margin-left:40px;line-height:1.3;font-size:14px;">
        <tr><td style="width:30%;vertical-align:top;">Barang/Dokumen Hilang</td><td style="width:3%;vertical-align:top;">:</td><td><strong>${v(formData.barangHilang)}</strong></td></tr>
        <tr><td style="vertical-align:top;">Tanggal Kehilangan</td><td style="vertical-align:top;">:</td><td>${fmtDate(formData.tanggalKehilangan)}</td></tr>
        <tr><td style="vertical-align:top;">Tempat Kehilangan</td><td style="vertical-align:top;">:</td><td>${v(formData.tempatKehilangan)}</td></tr>
        ${formData.keteranganKehilangan ? `<tr><td style="vertical-align:top;">Keterangan Tambahan</td><td style="vertical-align:top;">:</td><td>${v(formData.keteranganKehilangan)}</td></tr>` : ''}
      </table>

      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi pengajuan laporan kepolisian atau penerbitan dokumen pengganti.
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
        formData.includeCamat
      )}
      <div style="position:absolute;bottom:8mm;left:15mm;right:15mm;width:calc(100% - 30mm);">
        ${SAAS_CONFIG.globalFooterHTML}
      </div>
    `;
  };

  const filteredResidents = residents.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.nik.includes(searchQuery)
  ).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md dark:shadow-none sticky top-16 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Buat SKH</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Surat Keterangan Kehilangan / Miskin</p>
          </div>
        </div>
        <div className="flex gap-2">
          
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg dark:shadow-none shadow-emerald-900/20 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Cetak Surat
          </button>
        </div>
      </div>

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
                Riwayat Pembuatan SKH
              </h2>
              <button 
                onClick={() => {
                  if (confirm('Kosongkan riwayat?')) {
                    setRiwayat([]);
                    localStorage.removeItem('riwayat_surat_skh');
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
          
          {/* Pencarian Warga */}
          <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Search className="w-4 h-4 text-emerald-600" />
              Pilih Penduduk (Warga)
            </h3>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text"
                  placeholder="Cari NIK atau Nama Warga..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <p className="mt-2 text-emerald-600 font-medium text-[10px]">* Pencarian otomatis melengkapi biodata, alamat, KK, pendidikan, dan pekerjaan warga desa terpilih</p>
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20">
                  {filteredResidents.length > 0 ? (
                    filteredResidents.map(res => (
                      <button
                        key={res.nik}
                        onClick={() => handleSelectResident(res)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-bold shrink-0">
                          {res.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100">{res.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">NIK: {res.nik} • {res.desa}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="p-4 text-sm text-slate-500 dark:text-slate-400 italic text-center">Warga tidak ditemukan.</p>
                  )}
                </div>
              )}
            </div>
            {selectedChild && (
              <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-900">{selectedChild.name}</p>
                    <p className="text-[10px] text-emerald-700">Warga Terpilih</p>
                  </div>
                </div>
                <button onClick={() => setSelectedChild(null)} className="text-xs font-bold text-emerald-600 hover:underline">Ganti</button>
              </div>
            )}
          </section>

          {/* Form Detail */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none space-y-8">
            {/* Informasi Surat */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Informasi Surat</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    Nomor Surat
                  </label>
                  <input 
                    type="text"
                    placeholder="Contoh: SKH/064/WHi/2026"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                    value={formData.nomorSurat}
                    onChange={(e) => setFormData({...formData, nomorSurat: e.target.value})}
                  />
                  <p className="mt-1 text-[10px] text-emerald-600 font-medium">* Format: [Kode]/[No]/[Tahun]. Dapat diubah manual jika perlu.</p>
                </div>
              </div>
            </div>

            {/* Data Penduduk */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Data Penduduk</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.nik}
                    onChange={(e) => setFormData({...formData, nik: e.target.value})}
                  />
                </div>
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
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={formData.pekerjaan}
                    onChange={(e) => setFormData({...formData, pekerjaan: e.target.value})}
                  >
                    <option value="">Pilih Pekerjaan</option>
                    {jobs.map((j, i) => <option key={i} value={j}>{j}</option>)}
                  </select>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RT</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      value={formData.rt}
                      onChange={(e) => setFormData({...formData, rt: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RW</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      value={formData.rw}
                      onChange={(e) => setFormData({...formData, rw: e.target.value})}
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                  <textarea 
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                    value={formData.alamat}
                    onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Barang yang Hilang</label>
                  <input 
                    type="text"
                    placeholder="Contoh: KTP, Kartu ATM BRI, Buku Tabungan"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.barangHilang}
                    onChange={(e) => setFormData({...formData, barangHilang: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Kehilangan</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      value={formData.tanggalKehilangan}
                      onChange={(e) => setFormData({...formData, tanggalKehilangan: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Kehilangan</label>
                    <input 
                      type="text"
                      placeholder="Contoh: Perjalanan dari Wasah Hilir ke Kandangan"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      value={formData.tempatKehilangan}
                      onChange={(e) => setFormData({...formData, tempatKehilangan: e.target.value})}
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Keterangan Tambahan</label>
                  <textarea 
                    rows={2}
                    placeholder="Contoh: Hilang beserta dompet warna hitam"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                    value={formData.keteranganKehilangan}
                    onChange={(e) => setFormData({...formData, keteranganKehilangan: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Keperluan Surat</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Persyaratan pembuatan KTP baru"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.keperluan}
                    onChange={(e) => setFormData({...formData, keperluan: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Pejabat Penandatangan */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
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
                        return <option value="FAZAKKIR RAHMAD">FAZAKKIR RAHMAD (Kepala Desa)</option>;
                      })()}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-amber-900">Jabatan</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl outline-none font-medium"
                      value={formData.jabatanPejabat}
                      onChange={(e) => setFormData({...formData, jabatanPejabat: e.target.value})}
                    />
                  </div>
                
                </div>
                
                <div className="mt-6 pt-6 border-t border-amber-100">
                  <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50 transition-colors">
                    <input 
                      type="checkbox"
                      checked={formData.includeCamat}
                      onChange={(e) => setFormData({...formData, includeCamat: e.target.checked})}
                      className="w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tambahkan Kolom Mengetahui Camat</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gunakan format 2 tanda tangan (Camat di sebelah kiri)</div>
                    </div>
                  </label>
                </div>

                <p className="mt-4 text-[10px] text-amber-700 font-medium italic">
                  * Nama dan jabatan pejabat dapat diatur secara permanen melalui Menu Pengaturan.
                </p>
              </div>
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

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col h-[600px] sticky top-[170px]">
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
              className="flex-1 bg-slate-200/40 overflow-auto relative flex p-8"
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
        jenisSurat="Surat Keterangan Kehilangan (SKH)"
        onBackToTemplates={onBack}
      />
    </div>
  );
}
