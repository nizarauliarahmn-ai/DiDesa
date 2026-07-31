import React, { useEffect } from 'react';
import { ArrowLeft, Printer, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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
  const activeDesa = localStorage.getItem('kop_desa') || 'Wasah Hilir';
  const activeAlamat = localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RK.001 Kodepos 71261';
  
  // Ambil Pejabat Penandatangan Resmi dari Pengaturan (village_officers / kades settings)
  let kadesName = localStorage.getItem('kades_name') || localStorage.getItem('village_kades_name') || '';
  let kadesNip = localStorage.getItem('kades_nip') || localStorage.getItem('village_kades_nip') || '';
  let kadesTitle = localStorage.getItem('kades_title') || 'Kepala Desa';

  try {
    const storedOfficers = localStorage.getItem('village_officers');
    if (storedOfficers) {
      const list = JSON.parse(storedOfficers);
      const kadesObj = list.find((o: any) => (o.role || '').toLowerCase().includes('kepala desa') || (o.role || '').toLowerCase().includes('kades'));
      if (kadesObj) {
        if (kadesObj.name) kadesName = kadesObj.name;
        if (kadesObj.nip) kadesNip = kadesObj.nip;
        if (kadesObj.role) kadesTitle = kadesObj.role;
      } else if (list.length > 0) {
        if (list[0].name) kadesName = list[0].name;
        if (list[0].nip) kadesNip = list[0].nip;
        if (list[0].role) kadesTitle = list[0].role;
      }
    }
  } catch (e) {}

  if (!kadesName) kadesName = 'Ahmaduddin Noor';
  if (!kadesNip) kadesNip = '19750520 200501 1 005';

  const appName = localStorage.getItem('global_app_name') || 'DiDesa';
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen text-gray-900 dark:text-white font-sans">
      <style>
        {`
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          @media print {
            .no-print { display: none !important; }
            body { background-color: white !important; color: black !important; }
            body * { visibility: hidden !important; }
            .print-container, .print-container * { visibility: visible !important; }
            .print-container { 
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important; 
                margin: 0 !important; 
                padding: 10px !important;
                border: none !important;
                background-color: white !important;
                color: black !important;
            }
          }
        `}
      </style>

      {/* Sticky Action Header (No Print) */}
      <header className="no-print sticky top-0 z-50 flex justify-between items-center px-8 w-full h-16 bg-white dark:bg-slate-900 shadow-sm dark:shadow-none border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold text-emerald-700">DiDesa</span>
          <div className="h-6 w-[1px] bg-gray-200"></div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Pratinjau Dokumen Cetak Profil (A4)</h1>
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
        <div className="print-container bg-white dark:bg-slate-900 w-full max-w-[800px] min-h-[1123px] shadow-lg dark:shadow-none p-[40px] sm:p-[50px] border border-gray-200 dark:border-slate-700 flex flex-col gap-6">
          
          {/* Document Header (Kop Surat Removed as requested) */}
          <div className="flex items-center justify-between border-b-2 border-emerald-700 pb-4 mb-2">
            <div>
              <h1 className="text-2xl font-black uppercase text-emerald-800 tracking-wider">PROFIL DATA PENDUDUK</h1>
              <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">Pemerintah Desa {activeDesa.replace(/desa|kelurahan/gi, '').trim()}</p>
            </div>
            <span className="font-mono text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-md border border-emerald-300 dark:border-emerald-800">
              DIDESA DIGITAL ID
            </span>
          </div>

          {/* Identitas Utama (NIK/KK Highlight) */}
          <div className="grid grid-cols-2 gap-6 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 p-4 rounded-lg mt-2">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nomor Induk Kependudukan (NIK)</span>
              <span className="text-2xl font-extrabold text-emerald-700">{data?.nik || "-"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nomor Kartu Keluarga (KK)</span>
              <span className="text-2xl font-extrabold text-emerald-700">{data?.noKk || "-"}</span>
            </div>
          </div>

          {/* Biodata Section */}
          <div className="grid grid-cols-12 gap-8 mt-4">
            {/* Foto */}
            <div className="col-span-3">
              <div className="w-full aspect-[3/4] border-2 border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden relative shadow-sm">
                {data?.photo ? (
                  <img src={data.photo} alt={data.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex flex-col items-center justify-center text-white ${data?.gender === 'Perempuan' ? 'bg-gradient-to-b from-pink-500 to-pink-700' : 'bg-gradient-to-b from-blue-600 to-blue-800'}`}>
                    <User className="w-20 h-20 opacity-90" fill="currentColor" />
                    <span className="text-[9px] font-bold tracking-widest mt-2 uppercase">PASFOTO</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-emerald-800/90 text-white text-center py-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">AKTIF</span>
                </div>
              </div>
            </div>
            {/* Detail Info */}
            <div className="col-span-9 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white uppercase">{data?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Jenis Kelamin</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white uppercase">{data?.gender || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Tempat, Tgl Lahir</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white uppercase">
                    {data?.birthPlace || "-"}{data?.birthDate ? `, ${data.birthDate}` : ''} {data?.age ? `(${data.age} Thn)` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Golongan Darah</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white uppercase">{data?.bloodType || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pendidikan Terakhir</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white uppercase">{data?.education || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pekerjaan</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white uppercase">{data?.job || "-"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alamat & Verifikasi */}
          <div className="flex flex-col gap-2 mt-4">
            <h5 className="text-lg font-bold text-emerald-700 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
              <span className="material-symbols-outlined text-xl">location_on</span> Alamat & Tempat Tinggal
            </h5>
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 grid grid-cols-3 gap-4 bg-gray-50/50 dark:bg-slate-800/50 mt-2">
              <div className="col-span-2">
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Alamat Lengkap</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white uppercase">
                  {data?.address || '-'} (RT {data?.rt || '-'}/RW {data?.rw || '-'}, Desa {data?.desa || activeDesa})
                </p>
              </div>
              <div className="flex flex-col items-end justify-center">
                <div className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-200">
                  <span className="material-symbols-outlined text-lg">verified</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider">KTP Terverifikasi</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hubungan Keluarga - Selalu Tampil (Tabel Anggota Keluarga) */}
          <div className="flex flex-col gap-2 mt-4">
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
                  {familyMembers && familyMembers.length > 0 ? (
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
                      <td colSpan={4} className="px-4 py-4 text-sm text-center text-gray-500 dark:text-slate-400 italic font-medium">
                        - Hanya yang bersangkutan terdaftar sebagai anggota tunggal dalam Kartu Keluarga ini -
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clean Official Document Footer */}
          <div className="mt-auto pt-6 border-t border-gray-300 dark:border-slate-700 flex justify-between items-center text-[10px] text-gray-500 font-medium">
            <span>Dokumen Profil Kependudukan Resmi • Pemerintah Desa {activeDesa.replace(/desa|kelurahan/gi, '').trim()}</span>
            <span>Terverifikasi Digital Sistem DiDesa</span>
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
