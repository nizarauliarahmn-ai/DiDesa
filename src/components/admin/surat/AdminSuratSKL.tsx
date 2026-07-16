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

      if (isPrint && printRef.current) {
        const printContents = printRef.current.innerHTML;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Cetak Surat Keterangan Lahir</title>
                <style>
                  body { font-family: 'Times New Roman', Times, serif; line-height: 1.5; padding: 40px; margin: 0; color: #000; }
                  .text-center { text-align: center; }
                  .font-bold { font-weight: bold; }
                  .uppercase { text-transform: uppercase; }
                  .underline { text-decoration: underline; }
                  .text-xl { font-size: 20px; }
                  .text-lg { font-size: 18px; }
                  .text-sm { font-size: 14px; }
                  .mb-1 { margin-bottom: 4px; }
                  .mb-2 { margin-bottom: 8px; }
                  .mb-4 { margin-bottom: 16px; }
                  .mb-6 { margin-bottom: 24px; }
                  .mb-8 { margin-bottom: 32px; }
                  .mt-4 { margin-top: 16px; }
                  .mt-8 { margin-top: 32px; }
                  .mt-12 { margin-top: 48px; }
                  .mt-16 { margin-top: 64px; }
                  .grid { display: grid; }
                  .grid-cols-2 { grid-template-columns: 1fr 1fr; }
                  .border-b-2 { border-bottom: 2px solid #000; }
                  .pb-4 { padding-bottom: 16px; }
                  .w-full { width: 100%; }
                  .text-justify { text-align: justify; }
                  .pl-4 { padding-left: 16px; }
                  .pl-8 { padding-left: 32px; }
                  
                  .kop-surat { display: flex; align-items: center; border-bottom: 3px solid black; padding-bottom: 10px; margin-bottom: 20px; }
                  .kop-logo { width: 70px; height: 90px; object-fit: contain; margin-right: 20px; }
                  .kop-text { flex: 1; text-align: center; }
                  .kop-text h1 { margin: 0; font-size: 24px; text-transform: uppercase; font-weight: bold; }
                  .kop-text h2 { margin: 0; font-size: 20px; text-transform: uppercase; font-weight: bold; }
                  .kop-text p { margin: 0; font-size: 14px; }
                  
                  .data-grid { display: grid; grid-template-columns: 180px 15px 1fr; margin-bottom: 4px; }
                  
                  @media print {
                    @page { margin: 1cm; size: A4; }
                    body { padding: 0; }
                    -webkit-print-color-adjust: exact;
                  }
                </style>
              </head>
              <body>
                ${printContents}
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

  const formattedDate = () => {
    const d = new Date(tanggalSurat);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
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
            <div ref={printRef} className="w-full h-full text-justify text-[11pt] md:text-[12pt] leading-normal md:leading-relaxed">
              
              {/* Kop Surat */}
              <div className="kop-surat flex items-center border-b-[3px] border-black pb-3 md:pb-4 mb-4 md:mb-6">
                <img src="/logo_kabupaten.png" alt="Logo" className="w-[60px] md:w-[70px] h-auto object-contain mr-4 md:mr-6" onError={(e) => { e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_of_Ministry_of_Home_Affairs_of_the_Republic_of_Indonesia.svg/800px-Logo_of_Ministry_of_Home_Affairs_of_the_Republic_of_Indonesia.svg.png' }} />
                <div className="flex-1 text-center">
                  <h1 className="m-0 text-[14pt] md:text-[16pt] uppercase font-bold tracking-wide">Pemerintah Kabupaten {villageKabupaten.replace(/kabupaten/i, '').trim()}</h1>
                  <h2 className="m-0 text-[14pt] md:text-[16pt] uppercase font-bold tracking-wide">Kecamatan {villageKecamatan.replace(/kecamatan/i, '').trim()}</h2>
                  <h2 className="m-0 text-[16pt] md:text-[18pt] uppercase font-bold tracking-widest mt-1">Desa {villageName.replace(/desa/i, '').trim()}</h2>
                  <p className="m-0 text-[9pt] md:text-[10pt] mt-1 italic">{villageAlamat}</p>
                </div>
              </div>

              {/* Judul Surat */}
              <div className="text-center mb-6 md:mb-8 mt-4 md:mt-6">
                <h3 className="m-0 text-[12pt] md:text-[14pt] font-bold uppercase underline decoration-2 underline-offset-4 tracking-wide">SURAT KETERANGAN KELAHIRAN</h3>
                <p className="m-0 text-[11pt] mt-1 font-medium">Nomor: {noSurat}</p>
              </div>

              {/* Isi Surat */}
              <p className="indent-[10mm] md:indent-[12.7mm] mb-4">
                Yang bertanda tangan di bawah ini Kepala Desa {villageName}, Kecamatan {villageKecamatan}, Kabupaten {villageKabupaten}, menerangkan dengan sebenarnya bahwa:
              </p>

              {/* Data Istri/Ibu */}
              <div className="mb-4 pl-4 md:pl-8">
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                  <span>Nama Lengkap</span><span>:</span><span className="font-bold">{ibuData.nama || '_______________________'}</span>
                </div>
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                  <span>NIK</span><span>:</span><span>{ibuData.nik || '_______________________'}</span>
                </div>
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                  <span>Umur</span><span>:</span><span>{ibuData.umur ? `${ibuData.umur} Tahun` : '____ Tahun'}</span>
                </div>
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                  <span>Pekerjaan</span><span>:</span><span>{ibuData.pekerjaan || '_______________________'}</span>
                </div>
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1 items-start">
                  <span>Alamat</span><span>:</span><span>{ibuData.alamat || '_____________________________________________'}</span>
                </div>
              </div>

              {/* Data Suami/Ayah */}
              <p className="mb-4">Istri dari: </p>
              <div className="mb-4 pl-4 md:pl-8">
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                  <span>Nama Lengkap</span><span>:</span><span className="font-bold">{ayahData.nama || '_______________________'}</span>
                </div>
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                  <span>NIK</span><span>:</span><span>{ayahData.nik || '_______________________'}</span>
                </div>
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                  <span>Umur</span><span>:</span><span>{ayahData.umur ? `${ayahData.umur} Tahun` : '____ Tahun'}</span>
                </div>
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                  <span>Pekerjaan</span><span>:</span><span>{ayahData.pekerjaan || '_______________________'}</span>
                </div>
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1 items-start">
                  <span>Alamat</span><span>:</span><span>{ayahData.alamat || '_____________________________________________'}</span>
                </div>
              </div>

              {/* Kalimat Kelahiran */}
              <p className="mb-4">
                Telah lahir anak <span className="font-bold lowercase">{anakData.jenisKelamin || 'laki-laki/perempuan'}</span> pada:
              </p>

              {/* Data Anak */}
              <div className="mb-4 pl-4 md:pl-8">
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                  <span>Tempat Lahir</span><span>:</span><span>{anakData.tempatLahir || '_______________________'}</span>
                </div>
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                  <span>Hari/Tanggal Lahir</span><span>:</span><span>{anakData.tanggalLahir ? formattedDate() : '_______________________'}</span>
                </div>
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                  <span>Pukul/Jam</span><span>:</span><span>{anakData.jamLahir || '____ WIB/WITA/WIT'}</span>
                </div>
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                  <span>Anak Ke-</span><span>:</span><span>{anakData.anakKe || '____'}</span>
                </div>
                <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1 mt-2">
                  <span>Diberi Nama</span><span>:</span><span className="font-bold text-lg">{anakData.nama || '_______________________'}</span>
                </div>
              </div>

              {/* Data Pelapor (Optional Section in Preview) */}
              {pelaporData.nama && (
                <>
                  <p className="mb-4 mt-2">
                    Surat Keterangan ini dibuat berdasarkan laporan dari:
                  </p>
                  <div className="mb-4 pl-4 md:pl-8">
                    <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                      <span>Nama Pelapor</span><span>:</span><span>{pelaporData.nama}</span>
                    </div>
                    <div className="data-grid grid grid-cols-[130px_10px_1fr] md:grid-cols-[160px_15px_1fr] mb-1">
                      <span>Hubungan</span><span>:</span><span>{pelaporData.hubungan}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Tambahan Info RS jika ada */}
              {rsData.noSuratRs && rsData.namaRs && (
                <p className="mb-4 mt-2 text-justify">
                  Sesuai dengan Surat Keterangan Kelahiran dari {rsData.namaRs} Nomor: {rsData.noSuratRs}.
                </p>
              )}

              {/* Penutup */}
              <p className="indent-[10mm] md:indent-[12.7mm] mb-8 md:mb-12 text-justify">
                Demikian surat keterangan ini dibuat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya, khususnya untuk persyaratan pengurusan Akta Kelahiran dan dokumen kependudukan lainnya.
              </p>

              {/* Tanda Tangan */}
              <div className="flex justify-end w-full">
                <div className="w-[60%] md:w-[50%] text-center">
                  <p className="mb-0">{villageName}, {formattedDate()}</p>
                  
                  {penandatangan === 'kades' ? (
                    <p className="font-bold mb-16 md:mb-24 uppercase">KEPALA DESA {villageName}</p>
                  ) : (
                    <>
                      <p className="mb-0">a.n. Kepala Desa {villageName}</p>
                      <p className="font-bold mb-16 md:mb-24 uppercase">SEKRETARIS DESA</p>
                    </>
                  )}

                  <p className="font-bold underline uppercase">{penandatangan === 'kades' ? villageKades : '...................................'}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
