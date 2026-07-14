import React, { useEffect } from 'react';
import { ArrowLeft, Printer, User } from 'lucide-react';

interface AdminPendudukPrintProps {
  onBack: () => void;
  data: any;
}

export default function AdminPendudukPrint({ onBack, data }: AdminPendudukPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen text-gray-900 dark:text-white font-sans">
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { background-color: white !important; }
            .print-container { 
                box-shadow: none !important; 
                margin: 0 !important; 
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                border: none !important;
            }
          }
        `}
      </style>

      {/* Sticky Action Header (No Print) */}
      <header className="no-print sticky top-0 z-50 flex justify-between items-center px-8 w-full h-16 bg-white dark:bg-slate-900 shadow-sm dark:shadow-none border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold text-emerald-700">DiDesa</span>
          <div className="h-6 w-[1px] bg-gray-200"></div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Pratinjau Dokumen</h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-bold">Kembali</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg shadow-sm dark:shadow-none hover:opacity-90 transition-all"
          >
            <Printer className="w-5 h-5" />
            <span className="text-sm font-bold">Cetak</span>
          </button>
        </div>
      </header>

      {/* Document Canvas */}
      <main className="flex justify-center py-8 px-4 bg-gray-50 dark:bg-slate-800 min-h-screen">
        <div className="print-container bg-white dark:bg-slate-900 w-full max-w-[800px] min-h-[1123px] shadow-lg dark:shadow-none p-[50px] border border-gray-200 dark:border-slate-700 flex flex-col gap-6">
          
          {/* Document Header */}
          <div className="flex mb-6 flex-col items-center text-center gap-2 border-b-2 border-gray-900 pb-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-100">
                <span className="material-symbols-outlined text-3xl text-emerald-700">account_balance</span>
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-bold text-emerald-800 leading-tight">PEMERINTAH KABUPATEN DESA DIGITAL</h2>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">KECAMATAN MODERNISASI</h3>
                <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Jl. Raya Digital No. 45, Desa Inovasi, Kode Pos 40123</p>
              </div>
            </div>
            <div className="w-full mt-4">
              <h4 className="text-xl font-extrabold uppercase tracking-widest text-gray-900 dark:text-white">PROFIL DATA PENDUDUK</h4>
            </div>
          </div>

          {/* Identitas Utama (NIK/KK Highlight) */}
          <div className="grid grid-cols-2 gap-6 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 p-4 rounded-lg mt-2">
            <div className="flex mb-6 flex-col">
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nomor Induk Kependudukan (NIK)</span>
              <span className="text-2xl font-extrabold text-emerald-700">{data?.nik || "3273010101780005"}</span>
            </div>
            <div className="flex mb-6 flex-col">
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nomor Kartu Keluarga (KK)</span>
              <span className="text-2xl font-extrabold text-emerald-700">{data?.noKk || "3273010101210001"}</span>
            </div>
          </div>

          {/* Biodata Section */}
          <div className="grid grid-cols-12 gap-8 mt-4">
            {/* Foto */}
            <div className="col-span-3">
              <div className="w-full aspect-[3/4] border-2 border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden relative">
                {data?.photo ? (
                  <img src={data.photo} alt={data.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center bg-gradient-to-b text-white ${data?.gender === 'Perempuan' ? 'from-pink-300 to-pink-400' : 'from-blue-300 to-blue-400'}`}>
                    <User className="w-24 h-24" fill="currentColor" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-emerald-800/90 text-white text-center py-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">AKTIF</span>
                </div>
              </div>
            </div>
            {/* Detail Info */}
            <div className="col-span-9 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{data?.name || "Ahmad Bukhori, S.Kom"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Jenis Kelamin</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{data?.gender || "Laki-laki"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Tempat, Tgl Lahir</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">Bandung, 12 Januari 1978 ({data?.age || 40} Thn)</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Golongan Darah</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">O</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pendidikan Terakhir</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">Sarjana (S1)</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pekerjaan</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">Wiraswasta / Pemilik UMKM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alamat & Verifikasi */}
          <div className="flex mb-6 flex-col gap-2 mt-4">
            <h5 className="text-lg font-bold text-emerald-700 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <span className="material-symbols-outlined text-xl">location_on</span> Alamat & Tempat Tinggal
            </h5>
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 grid grid-cols-3 gap-4 bg-gray-50/50 mt-2">
              <div className="col-span-2">
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Alamat Lengkap</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Jl. Melati No. 12, RT 004/RW 002, Desa Sukasari, Desa Digital</p>
              </div>
              <div className="flex mb-6 flex-col items-end justify-center">
                <div className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-200">
                  <span className="material-symbols-outlined text-lg">verified</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider">KTP Terverifikasi</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hubungan Keluarga */}
          <div className="flex mb-6 flex-col gap-2 mt-4">
            <h5 className="text-lg font-bold text-emerald-700 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <span className="material-symbols-outlined text-xl">family_history</span> Hubungan Keluarga
            </h5>
            <div className="overflow-hidden border border-gray-200 dark:border-slate-700 rounded-lg mt-2">
              <table className="w-full text-left">
                <thead className="bg-gray-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Nama Anggota</th>
                    <th className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">NIK</th>
                    <th className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Hubungan</th>
                    <th className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Status Kawin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:bg-slate-900">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">Siti Aminah</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-slate-400">3273010505800002</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-300">Istri</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-300">Kawin</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">Zaki Ramadhan</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-slate-400">3273011212050004</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-300">Anak</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-300">Belum Kawin</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">Nabila Putri</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-slate-400">3273011406100003</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-300">Anak</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-300">Belum Kawin</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Riwayat Administrasi */}
          <div className="flex mb-6 flex-col gap-2 mt-4">
            <h5 className="text-lg font-bold text-emerald-700 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <span className="material-symbols-outlined text-xl">history_edu</span> Riwayat Layanan & Bantuan
            </h5>
            <div className="overflow-hidden border border-gray-200 dark:border-slate-700 rounded-lg mt-2">
              <table className="w-full text-left">
                <thead className="bg-gray-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                    <th className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Jenis Layanan</th>
                    <th className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:bg-slate-900">
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-400">15 Okt 2023</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">Bantuan BLT-DD</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-700">Diterima</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-400">Tahap III 2023</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-400">02 Sep 2023</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">Surat Keterangan Usaha</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-700">Selesai</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-400">Keperluan Kredit KUR</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-400">12 Jan 2023</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">Pemutakhiran Data</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-700">Selesai</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-400">Update Pekerjaan & Gelar</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer / Tanda Tangan */}
          <div className="mt-auto pt-12 grid grid-cols-2 gap-12">
            <div className="flex mb-6 flex-col items-center">
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-20">Penduduk yang bersangkutan,</p>
              <div className="w-40 h-[1px] bg-gray-400 mb-2"></div>
              <p className="text-sm font-bold uppercase text-gray-900 dark:text-white">{data?.name || "Ahmad Bukhori"}</p>
            </div>
            <div className="flex mb-6 flex-col items-center text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">Desa Digital, 24 Mei 2024</p>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-6">Sekretaris Desa,</p>
              <div className="w-48 h-20 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center mb-4 bg-gray-50 dark:bg-slate-800">
                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Cap Desa & TTD</span>
              </div>
              <p className="text-sm font-bold uppercase underline text-gray-900 dark:text-white">Budi Santoso, S.Sos</p>
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mt-1">NIP. 19850520 201001 1 005</p>
            </div>
          </div>

          {/* Document ID & QR */}
          <div className="mt-8 pt-4 border-t border-gray-200 dark:border-slate-700 flex justify-between items-end">
            <div className="flex mb-6 flex-col gap-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Generated by DiDesa Digital Infrastructure Ecosystem</p>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">Dokumen ini diterbitkan secara elektronik dan sah sesuai hukum yang berlaku.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">Verifikasi Digital:</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">Scan QR untuk keaslian data</p>
              </div>
              <div className="w-12 h-12 bg-white dark:bg-slate-900 border border-gray-900 p-1 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">qr_code_2</span>
              </div>
            </div>
          </div>

        </div>
      </main>
      
      {/* Floating Print Shortcut (No Print) */}
      <button 
        onClick={handlePrint}
        className="no-print fixed bottom-8 right-8 w-14 h-14 bg-emerald-700 text-white rounded-full shadow-lg dark:shadow-none flex items-center justify-center hover:scale-105 active:scale-95 transition-all group"
      >
        <Printer className="w-6 h-6" />
      </button>
    </div>
  );
}
