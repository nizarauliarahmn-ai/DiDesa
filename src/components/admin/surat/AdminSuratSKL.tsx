import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Printer, FileText, CheckCircle, AlertCircle, Baby, Users, Building, Activity } from 'lucide-react';
import { showToast } from '../../../utils/toast';

interface AdminSuratSKLProps {
  onBack: () => void;
  presetResident?: any;
  editData?: any;
  editLetterId?: string;
}

export default function AdminSuratSKL({ onBack, presetResident, editData, editLetterId }: AdminSuratSKLProps) {
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const villageName = localStorage.getItem('village_name') || 'Desa Sukamaju';
  const villageKades = localStorage.getItem('village_kades') || 'Budi Santoso';
  const villageKabupaten = localStorage.getItem('village_kabupaten') || 'Kabupaten Bandung';
  const villageKecamatan = localStorage.getItem('village_kecamatan') || 'Kecamatan Sukamaju';
  const villageAlamat = localStorage.getItem('village_alamat') || 'Jl. Raya Desa No. 123';

  // State untuk Nomor dan Tanggal Surat
  const [noSurat, setNoSurat] = useState('474.1/___/DS/' + new Date().getFullYear());
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0]);

  // Data Anak
  const [anakData, setAnakData] = useState({
    nama: '',
    jenisKelamin: 'Laki-laki',
    tempatLahir: '',
    tanggalLahir: '',
    jamLahir: '',
    anakKe: '1'
  });

  // Data Ayah
  const [ayahData, setAyahData] = useState({
    nik: '',
    nama: '',
    umur: '',
    pekerjaan: '',
    alamat: ''
  });

  // Data Ibu
  const [ibuData, setIbuData] = useState({
    nik: '',
    nama: '',
    umur: '',
    pekerjaan: '',
    alamat: ''
  });

  // Data Pelapor
  const [pelaporData, setPelaporData] = useState({
    nik: presetResident?.nik || '',
    nama: presetResident?.name || '',
    umur: presetResident?.age || '',
    pekerjaan: presetResident?.job || '',
    alamat: presetResident?.address || '',
    hubungan: 'Ayah Kandung'
  });

  // Data RS/Klinik
  const [rsData, setRsData] = useState({
    noSuratRs: '',
    namaRs: ''
  });

  // Penandatangan
  const [penandatangan, setPenandatangan] = useState<'kades' | 'sekdes'>('kades');

  useEffect(() => {
    // Generate auto number if new
    if (!editLetterId) {
      const stored = localStorage.getItem('surat_letters');
      if (stored) {
        try {
          const letters = JSON.parse(stored);
          const sklLetters = letters.filter((l: any) => l.code === '474.1');
          const nextNum = sklLetters.length + 1;
          const formattedNum = nextNum.toString().padStart(3, '0');
          setNoSurat(`474.1/${formattedNum}/DS/${new Date().getFullYear()}`);
        } catch (e) {}
      }
    }
  }, [editLetterId]);

  const updateResidentData = async (nik: string, data: any) => {
    if (!nik || nik.trim() === '' || nik === '-') return;
    try {
      const checkRes = await fetch(`/api/residents`);
      const allResidents = await checkRes.json();
      const existing = allResidents.find((r: any) => r.nik === nik);
      
      if (existing) {
        await fetch(`/api/residents/${nik}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...existing, ...data })
        });
      } else {
        await fetch(`/api/residents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nik, ...data })
        });
      }
    } catch (err) {
      console.error("Gagal update data penduduk:", err);
    }
  };

  const handleSave = async (isPrint = false) => {
    if (!anakData.nama || !ayahData.nama || !ibuData.nama) {
      showToast("Data Anak, Ayah, dan Ibu wajib diisi", "error");
      return;
    }
    
    setLoading(true);

    // Auto update/insert to Resident Database
    // 1. Ayah
    await updateResidentData(ayahData.nik, {
      name: ayahData.nama,
      job: ayahData.pekerjaan,
      address: ayahData.alamat,
      gender: 'Laki-laki'
    });

    // 2. Ibu
    await updateResidentData(ibuData.nik, {
      name: ibuData.nama,
      job: ibuData.pekerjaan,
      address: ibuData.alamat,
      gender: 'Perempuan'
    });

    // 3. Anak (Gunakan NIK Dummy jika belum ada NIK, format: BAYI-YYYYMMDD-HHMMSS)
    const tempAnakNik = `BAYI-${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}`;
    await updateResidentData(tempAnakNik, {
      name: anakData.nama,
      gender: anakData.jenisKelamin,
      birthPlace: anakData.tempatLahir,
      birthDate: anakData.tanggalLahir,
      address: ayahData.alamat, // Ikut alamat ayah by default
      fatherName: ayahData.nama,
      motherName: ibuData.nama,
      familyRelation: 'Anak',
      status: 'Aktif'
    });

    // Simulasi penyimpanan surat
    setTimeout(() => {
      setLoading(false);
      showToast("Surat Keterangan Lahir berhasil disimpan!", "success");
      
      // Dispatch update global untuk merefresh data penduduk di halaman lain
      window.dispatchEvent(new Event('residents_updated'));

      if (isPrint) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Cetak Surat Keterangan Lahir</title>
                <style>
                  body { margin: 0; padding: 0; color: #000; }
                  @media print {
                    @page { margin: 1cm; size: A4; }
                    body { -webkit-print-color-adjust: exact; }
                  }
                </style>
              </head>
              <body>
                ${generateSuratHTML()}
                <script>
                  window.onload = function() { window.print(); window.close(); }
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      } else if (!isPrint) {
        onBack();
      }
    }, 1000);
  };

  const generateSuratHTML = () => {
    const today = new Date();
    const letterFont = localStorage.getItem('kop_font') || "'Times New Roman', Times, serif";
    const villageLogo = localStorage.getItem('kop_logo') || '/logo_kabupaten.png';
    const activeKabupaten = localStorage.getItem('kop_kabupaten') || villageKabupaten || 'Kabupaten';
    const activeKecamatan = localStorage.getItem('kop_kecamatan') || villageKecamatan || 'Kecamatan';
    const activeDesa = localStorage.getItem('kop_desa') || villageName || 'Desa';
    const activeAlamat = localStorage.getItem('kop_alamat') || villageAlamat || 'Alamat';
    
    const v = (val: any, fallback = '_______________________') => val ? val : fallback;
    const cleanStr = (s: string, regex: RegExp) => (s || "").replace(regex, "");
    
    const fDate = (d: string) => {
      if (!d) return '';
      try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return d;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch (e) { return d; }
    };

    const formattedDate = () => {
      const d = new Date(tanggalSurat);
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    let html = `
      <div style="font-family:${letterFont}; color:#000; padding: 20px 40px; line-height: 1.5;">
        <!-- KOP SURAT -->
        <div style="border-bottom:3px solid #000;margin-bottom:12px;">
          <div style="display:flex;align-items:flex-start;padding-bottom:6px;border-bottom:1px solid #000;margin-bottom:1px;">
            <div style="display:flex;width:100%;align-items:center;">
              <div style="width:90px;height:100px;flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-right:15px;">
                <img src="${villageLogo}" style="width:100%;height:100%;object-fit:contain;" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_of_Ministry_of_Home_Affairs_of_the_Republic_of_Indonesia.svg/800px-Logo_of_Ministry_of_Home_Affairs_of_the_Republic_of_Indonesia.svg.png'" />
              </div>
              <div style="text-align:center;flex:1;padding-right:90px;">
                <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">PEMERINTAH KABUPATEN ${activeKabupaten.toUpperCase().replace('KABUPATEN ', '')}</div>
                <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">KECAMATAN ${activeKecamatan.toUpperCase().replace('KECAMATAN ', '')}</div>
                <div style="font-weight:900;font-size:26px;text-transform:uppercase;letter-spacing:2px;line-height:1.1;margin:2px 0 3px 0;">DESA ${activeDesa.toUpperCase().replace('DESA ', '')}</div>
                <div style="font-size:10.5px;margin-top:4px;text-transform:capitalize;line-height:1.15;margin:2px 0 1px 0;">${activeAlamat}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- JUDUL SURAT -->
        <div style="text-align:center;margin-bottom:15px;margin-top:20px;">
          <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">SURAT KETERANGAN KELAHIRAN</h3>
          <p style="margin:2px 0 0 0;font-size:14px;">Nomor : ${v(noSurat, '... / ... / ... / ' + today.getFullYear())}</p>
        </div>

        <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;text-indent: 40px;">
          Yang bertanda tangan di bawah ini Kepala Desa ${cleanStr(activeDesa, /^(desa|kelurahan)\s+/i)}, Kecamatan ${cleanStr(activeKecamatan, /^kecamatan\s+/i)}, Kabupaten ${cleanStr(activeKabupaten, /^kabupaten\s+/i)}, menerangkan dengan sebenarnya bahwa:
        </p>

        <!-- DATA IBU -->
        <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
          <tr><td style="width:30%;">Nama Lengkap</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(ibuData.nama)}</strong></td></tr>
          <tr><td>NIK</td><td>:</td><td>${v(ibuData.nik)}</td></tr>
          <tr><td>Umur</td><td>:</td><td>${ibuData.umur ? `${ibuData.umur} Tahun` : '____ Tahun'}</td></tr>
          <tr><td>Pekerjaan</td><td>:</td><td>${v(ibuData.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td>${v(ibuData.alamat, '_____________________________________________')}</td></tr>
        </table>

        <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">
          Istri dari:
        </p>

        <!-- DATA AYAH -->
        <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
          <tr><td style="width:30%;">Nama Lengkap</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(ayahData.nama)}</strong></td></tr>
          <tr><td>NIK</td><td>:</td><td>${v(ayahData.nik)}</td></tr>
          <tr><td>Umur</td><td>:</td><td>${ayahData.umur ? `${ayahData.umur} Tahun` : '____ Tahun'}</td></tr>
          <tr><td>Pekerjaan</td><td>:</td><td>${v(ayahData.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td>${v(ayahData.alamat, '_____________________________________________')}</td></tr>
        </table>

        <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">
          Telah lahir anak <strong style="text-transform:lowercase;">${anakData.jenisKelamin || 'laki-laki/perempuan'}</strong> pada:
        </p>

        <!-- DATA ANAK -->
        <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
          <tr><td style="width:30%;">Tempat Lahir</td><td style="width:3%;">:</td><td>${v(anakData.tempatLahir)}</td></tr>
          <tr><td>Hari/Tanggal Lahir</td><td>:</td><td>${anakData.tanggalLahir ? fDate(anakData.tanggalLahir) : '_______________________'}</td></tr>
          <tr><td>Pukul/Jam</td><td>:</td><td>${anakData.jamLahir || '____ WIB'}</td></tr>
          <tr><td>Anak Ke-</td><td>:</td><td>${anakData.anakKe || '____'}</td></tr>
          <tr><td style="padding-top:8px;">Diberi Nama</td><td style="padding-top:8px;">:</td><td style="padding-top:8px;"><strong style="text-transform:uppercase;font-size:16px;">${v(anakData.nama)}</strong></td></tr>
        </table>
      `;

      if (pelaporData.nama) {
        html += `
          <p style="text-align:justify;line-height:1.15;margin-top:15px;margin-bottom:10px;font-size:14px;">
            Surat Keterangan ini dibuat berdasarkan laporan dari:
          </p>
          <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
            <tr><td style="width:30%;">Nama Pelapor</td><td style="width:3%;">:</td><td><strong>${v(pelaporData.nama)}</strong></td></tr>
            <tr><td>Hubungan</td><td>:</td><td>${v(pelaporData.hubungan)}</td></tr>
          </table>
        `;
      }

      if (rsData.noSuratRs && rsData.namaRs) {
        html += `
          <p style="text-align:justify;line-height:1.15;margin-top:10px;margin-bottom:10px;font-size:14px;">
            Sesuai dengan Surat Keterangan Kelahiran dari ${rsData.namaRs} Nomor: ${rsData.noSuratRs}.
          </p>
        `;
      }

      html += `
        <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:20px;font-size:14px;">
          Demikian surat keterangan ini dibuat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya, khususnya untuk persyaratan pengurusan Akta Kelahiran dan dokumen kependudukan lainnya.
        </p>

        <!-- TANDA TANGAN -->
        <div style="display:flex;justify-content:flex-end;margin-top:30px;font-size:14px;">
          <div style="text-align:center;width:250px;">
            <div style="margin-bottom:2px;">${cleanStr(activeDesa, /^(desa|kelurahan)\s+/i)}, ${formattedDate()}</div>
            ${penandatangan === 'kades' ? 
              `<div style="font-weight:bold;margin-bottom:70px;">KEPALA DESA ${activeDesa.toUpperCase().replace('DESA ', '')}</div>` :
              `<div style="margin-bottom:2px;">a.n. Kepala Desa ${activeDesa.replace('Desa ', '')}</div><div style="font-weight:bold;margin-bottom:70px;">SEKRETARIS DESA</div>`
            }
            <div style="font-weight:bold;text-decoration:underline;">${penandatangan === 'kades' ? villageKades.toUpperCase() : '...................................'}</div>
          </div>
        </div>
      </div>
    `;
    return html;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto pb-24 h-[calc(100vh-100px)]">
      {/* Kolom Kiri: Form Input Interaktif */}
      <div className="w-full lg:w-1/2 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Baby className="w-6 h-6 text-emerald-600" /> Form SK Lahir
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Pembaruan data orang tua/anak terintegrasi dengan database penduduk.</p>
          </div>
        </div>

        {/* Section 1: Detail Surat */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" /> Detail Surat
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nomor Surat</label>
              <input type="text" value={noSurat} onChange={e => setNoSurat(e.target.value)} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tanggal Surat</label>
              <input type="date" value={tanggalSurat} onChange={e => setTanggalSurat(e.target.value)} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
          </div>
        </div>

        {/* Section: Rumah Sakit */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" /> Data Fasilitas Kesehatan (Opsional)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">No. Surat RS/Klinik</label>
              <input type="text" placeholder="Contoh: RS/2026/01/123" value={rsData.noSuratRs} onChange={e => setRsData({...rsData, noSuratRs: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nama Faskes</label>
              <input type="text" placeholder="Contoh: RSUD Kabupaten" value={rsData.namaRs} onChange={e => setRsData({...rsData, namaRs: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>
          </div>
        </div>

        {/* Section 2: Data Anak */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800/30 p-6 shadow-sm bg-emerald-50/10 dark:bg-emerald-900/10">
          <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-400 mb-4 flex items-center gap-2">
            <Baby className="w-5 h-5 text-emerald-600" /> Data Bayi / Anak
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nama Lengkap Bayi</label>
              <input type="text" placeholder="Masukkan nama anak..." value={anakData.nama} onChange={e => setAnakData({...anakData, nama: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Jenis Kelamin</label>
                <select value={anakData.jenisKelamin} onChange={e => setAnakData({...anakData, jenisKelamin: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Anak Ke-</label>
                <input type="number" placeholder="Misal: 1" value={anakData.anakKe} onChange={e => setAnakData({...anakData, anakKe: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tempat Lahir</label>
                <input type="text" placeholder="Kota/Kab" value={anakData.tempatLahir} onChange={e => setAnakData({...anakData, tempatLahir: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tanggal Lahir</label>
                <input type="date" value={anakData.tanggalLahir} onChange={e => setAnakData({...anakData, tanggalLahir: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Jam Lahir (Opsional)</label>
                <input type="time" value={anakData.jamLahir} onChange={e => setAnakData({...anakData, jamLahir: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Data Ayah */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Data Ayah
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">NIK Ayah</label>
                <input type="text" placeholder="16 digit NIK" value={ayahData.nik} onChange={e => setAyahData({...ayahData, nik: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nama Ayah</label>
                <input type="text" placeholder="Nama lengkap..." value={ayahData.nama} onChange={e => setAyahData({...ayahData, nama: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Umur (Tahun)</label>
                <input type="number" placeholder="Misal: 30" value={ayahData.umur} onChange={e => setAyahData({...ayahData, umur: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pekerjaan</label>
                <input type="text" placeholder="Pekerjaan..." value={ayahData.pekerjaan} onChange={e => setAyahData({...ayahData, pekerjaan: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Alamat Ayah</label>
              <textarea placeholder="Alamat lengkap..." value={ayahData.alamat} onChange={e => setAyahData({...ayahData, alamat: e.target.value})} rows={2} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"></textarea>
            </div>
          </div>
        </div>

        {/* Section 4: Data Ibu */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-600" /> Data Ibu
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">NIK Ibu</label>
                <input type="text" placeholder="16 digit NIK" value={ibuData.nik} onChange={e => setIbuData({...ibuData, nik: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nama Ibu</label>
                <input type="text" placeholder="Nama lengkap..." value={ibuData.nama} onChange={e => setIbuData({...ibuData, nama: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Umur (Tahun)</label>
                <input type="number" placeholder="Misal: 28" value={ibuData.umur} onChange={e => setIbuData({...ibuData, umur: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pekerjaan</label>
                <input type="text" placeholder="Pekerjaan..." value={ibuData.pekerjaan} onChange={e => setIbuData({...ibuData, pekerjaan: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Alamat Ibu</label>
              <textarea placeholder="Alamat lengkap..." value={ibuData.alamat} onChange={e => setIbuData({...ibuData, alamat: e.target.value})} rows={2} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 outline-none transition-all resize-none"></textarea>
            </div>
          </div>
        </div>

        {/* Section 5: Data Pelapor (Opsional) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-600" /> Data Pelapor (Opsional)
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">NIK Pelapor</label>
                <input type="text" placeholder="16 digit NIK" value={pelaporData.nik} onChange={e => setPelaporData({...pelaporData, nik: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nama Pelapor</label>
                <input type="text" placeholder="Nama lengkap..." value={pelaporData.nama} onChange={e => setPelaporData({...pelaporData, nama: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Umur</label>
                <input type="number" placeholder="Umur" value={pelaporData.umur} onChange={e => setPelaporData({...pelaporData, umur: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pekerjaan</label>
                <input type="text" placeholder="Pekerjaan" value={pelaporData.pekerjaan} onChange={e => setPelaporData({...pelaporData, pekerjaan: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Hub. dengan Anak</label>
                <input type="text" placeholder="Misal: Ayah/Kakek" value={pelaporData.hubungan} onChange={e => setPelaporData({...pelaporData, hubungan: e.target.value})} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Alamat Pelapor</label>
              <textarea placeholder="Alamat lengkap..." value={pelaporData.alamat} onChange={e => setPelaporData({...pelaporData, alamat: e.target.value})} rows={1} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"></textarea>
            </div>
          </div>
        </div>

        {/* Section 6: Pengesahan */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Pengesahan</h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={penandatangan === 'kades'} onChange={() => setPenandatangan('kades')} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Kepala Desa</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={penandatangan === 'sekdes'} onChange={() => setPenandatangan('sekdes')} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Sekretaris Desa (Atas Nama)</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => handleSave(false)} disabled={loading} className="flex-1 bg-white dark:bg-slate-800 border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 py-3 rounded-xl font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center justify-center gap-2">
            <Save className="w-5 h-5" />
            Simpan Arsip
          </button>
          <button onClick={() => handleSave(true)} disabled={loading} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Printer className="w-5 h-5" />}
            Simpan & Cetak
          </button>
        </div>
      </div>

      {/* Kolom Kanan: Live Preview Kertas */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto bg-gray-100 dark:bg-black/20 p-4 sm:p-8 rounded-3xl border border-gray-200 dark:border-slate-800 custom-scrollbar">
        <div className="sticky top-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Pratinjau Dokumen
            </h3>
            <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">Ukuran A4</span>
          </div>
          
          {/* Kertas A4 */}
          <div className="bg-white w-full max-w-[210mm] mx-auto min-h-[297mm] shadow-2xl rounded-sm p-[20mm] md:p-[25.4mm] text-black relative origin-top transform scale-90 sm:scale-100 transition-transform duration-300" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            
            {/* Template Dokumen untuk di-Print */}
            <div 
              ref={printRef} 
              className="w-full h-full bg-white"
              dangerouslySetInnerHTML={{ __html: generateSuratHTML() }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
