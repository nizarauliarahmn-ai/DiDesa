import React, { useEffect } from 'react';
import { ArrowLeft, Printer, User } from 'lucide-react';

interface AdminPendudukPrintProps {
  onBack: () => void;
  data: any;
  familyMembers?: any[];
  residentLetters?: any[];
}

export default function AdminPendudukPrint({ onBack, data, familyMembers = [], residentLetters = [] }: AdminPendudukPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const villageLogo = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
  const activeKabupaten = localStorage.getItem('kop_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan';
  const activeKecamatan = localStorage.getItem('kop_kecamatan') || 'Kecamatan Simpur';
  const activeDesa = localStorage.getItem('kop_desa') || 'Sukamakmur';
  const activeAlamat = localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RK.001 Kodepos 71261';
  const kadesName = localStorage.getItem('village_kades_name') || 'Ahmaduddin Noor';
  const kadesNip = localStorage.getItem('village_kades_nip') || '19750520 200501 1 005';
  const appName = localStorage.getItem('global_app_name') || 'DiDesa';
  
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

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
              <div className="w-20 h-24 flex items-center justify-center overflow-hidden">
                <img src={villageLogo} alt="Logo Desa" className="w-full h-full object-contain" />
              </div>
              <div className="text-center flex-1 pr-20">
                <h2 className="text-[17px] font-bold text-gray-900 leading-tight uppercase tracking-wide">{activeKabupaten}</h2>
                <h3 className="text-[17px] font-bold text-gray-900 leading-tight uppercase tracking-wide">{activeKecamatan}</h3>
                <h1 className="text-2xl font-black text-gray-900 leading-tight uppercase tracking-wider mt-1 mb-1">DESA {activeDesa}</h1>
                <p className="text-xs font-medium text-gray-700">{activeAlamat}</p>
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
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 grid grid-cols-3 gap-4 bg-gray-50/50 dark:bg-slate-800/50 mt-2">
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
                  {familyMembers.length > 0 ? (
                    familyMembers.map((member: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white uppercase">{member.name || '-'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-slate-400">{member.nik || '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-300 uppercase">{member.familyRelation || '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-300 uppercase">{member.maritalStatus || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-sm text-center text-gray-400 italic">
                        Tidak ada data anggota keluarga
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Riwayat Layanan & Bantuan */}
          <div className="mb-8">
            <h4 className="font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 uppercase tracking-wide">Riwayat Layanan Administrasi & Sosial</h4>
            <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <table className="w-full text-left">
                <thead className="bg-gray-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jenis Layanan</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Keterangan</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:bg-slate-900">
                  {residentLetters.length > 0 ? (
                    residentLetters.map((letter: any, i: number) => (
                      <tr key={`letter-${i}`}>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{new Date(letter.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{letter.jenisSurat}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">Penerbitan Surat</td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">Selesai</td>
                      </tr>
                    ))
                  ) : null}
                  
                  {data?.activeAids && data.activeAids.length > 0 ? (
                    data.activeAids.map((aid: string, i: number) => (
                      <tr key={`aid-${i}`}>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">-</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{aid}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">Program Bantuan Sosial Aktif</td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">Aktif</td>
                      </tr>
                    ))
                  ) : null}

                  {residentLetters.length === 0 && (!data?.activeAids || data.activeAids.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-sm text-center text-gray-400 italic">
                        Belum ada riwayat layanan atau bantuan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer / Tanda Tangan */}
          <div className="mt-auto pt-12 grid grid-cols-2 gap-12">
            <div className="flex mb-6 flex-col items-center">
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-20">Penduduk yang bersangkutan,</p>
              <div className="w-40 h-[1px] bg-gray-400 mb-2"></div>
              <p className="text-sm font-bold uppercase text-gray-900 dark:text-white">{data?.name || "Nama Penduduk"}</p>
            </div>
            <div className="flex mb-6 flex-col items-center text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">{activeDesa}, {today}</p>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-6">Kepala Desa,</p>
              <div className="w-48 h-20 flex items-center justify-center mb-4">
                {/* Tanda tangan bisa ditempatkan di sini */}
              </div>
              <p className="text-sm font-bold uppercase underline text-gray-900 dark:text-white">{kadesName}</p>
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mt-1">NIP. {kadesNip}</p>
            </div>
          </div>

          {/* Document ID & QR */}
          <div className="mt-8 pt-4 border-t border-gray-200 dark:border-slate-700 flex justify-between items-end">
            <div 
              className="text-[10px] text-gray-500 dark:text-slate-400 font-medium leading-relaxed"
              dangerouslySetInnerHTML={{ __html: localStorage.getItem('global_print_footer') || 'Dokumen ini dibuat & dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia' }}
            />
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
