const fs = require('fs');

const content = `
import React, { useState, useEffect } from 'react';
import { Users, FileText, Gift, MessageSquare, TrendingUp, ChevronDown, UserPlus, PenTool, ExternalLink, Loader2 } from 'lucide-react';
import { getAspirasi } from '../../utils/aspirasiData';

export default function AdminDashboard({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [desaName, setDesaName] = useState(() => localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');
  const [aspirasiList, setAspirasiList] = useState<any[]>([]);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');
    };
    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('village_settings_updated', handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    // load aspirasi
    setAspirasiList(getAspirasi());

    fetch('/api/residents')
      .then(res => { if (!res.ok) throw new Error(\`HTTP error! status: \${res.status}\`); return res.json(); })
      .then(data => {
        if (Array.isArray(data)) {
          setResidents(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading residents for dashboard:", err);
        setLoading(false);
      });
  }, []);

  const totalResidents = residents.length;
  
  // Job Distribution mapping
  const jobCounts: { [key: string]: number } = {};
  residents.forEach(r => {
    const job = (r.job || 'Belum Bekerja').trim();
    jobCounts[job] = (jobCounts[job] || 0) + 1;
  });

  const getJobPercentage = (keywords: string[]) => {
    if (totalResidents === 0) return { count: 0, percent: 0 };
    let count = 0;
    Object.keys(jobCounts).forEach(j => {
      const lower = j.toLowerCase();
      if (keywords.some(kw => lower.includes(kw))) {
        count += jobCounts[j];
      }
    });
    return { count, percent: Math.round((count / totalResidents) * 100) };
  };

  const petaniStats = getJobPercentage(['tani', 'petani', 'kebun']);
  const karyawanStats = getJobPercentage(['karyawan', 'pns', 'guru', 'swasta', 'pegawai', 'kantor']);
  const wiraswastaStats = getJobPercentage(['wira', 'usaha', 'dagang', 'pedagang', 'bisnis', 'jasa']);
  const lainnyaCount = Math.max(0, totalResidents - (petaniStats.count + karyawanStats.count + wiraswastaStats.count));
  const lainnyaPercent = Math.max(0, 100 - (petaniStats.percent + karyawanStats.percent + wiraswastaStats.percent));

  // Education Levels
  const eduCounts: { [key: string]: number } = {};
  residents.forEach(r => {
    const edu = (r.education || '').trim().toLowerCase();
    eduCounts[edu] = (eduCounts[edu] || 0) + 1;
  });

  const getEduPercentage = (keywords: string[]) => {
    if (totalResidents === 0) return 0;
    let count = 0;
    Object.keys(eduCounts).forEach(j => {
      if (keywords.some(kw => j.includes(kw))) {
        count += eduCounts[j];
      }
    });
    return Math.round((count / totalResidents) * 100);
  };

  const sdPercent = getEduPercentage(['sd', 'sekolah dasar']);
  const smpPercent = getEduPercentage(['smp', 'sekolah menengah pertama', 'slpt']);
  const smaPercent = getEduPercentage(['sma', 'smk', 'slta', 'sekolah menengah atas', 'sekolah menengah kejuruan']);
  const sarjanaPercent = getEduPercentage(['diploma', 'd1', 'd2', 'd3', 'd4', 's1', 's2', 's3', 'sarjana', 'magister', 'doktor']);
  const eduLainnya = Math.max(0, 100 - (sdPercent + smpPercent + smaPercent + sarjanaPercent));

  // Aspirasi Stats
  const aspirasiBaru = aspirasiList.filter(a => a.status === 'Baru').length;
  const aspirasiDiproses = aspirasiList.filter(a => a.status === 'Diproses').length;
  const aspirasiSelesai = aspirasiList.filter(a => a.status === 'Selesai').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-700 mb-2" />
        <p className="text-sm font-medium">Memuat data dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-24">
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Ringkasan Administrasi</h2>
            <p className="text-sm text-gray-500 mt-1">Pantauan layanan surat dan aspirasi warga hari ini di {desaName}</p>
          </div>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="standard-card p-6 border-l-4 border-primary">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-primary-container/10 rounded-lg flex items-center justify-center text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-primary font-bold text-xs bg-primary-container/10 px-2 py-1 rounded">+8% Bulan ini</span>
            </div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Surat Dikeluarkan</p>
            <h3 className="text-5xl font-extrabold text-gray-900 tracking-tighter">1,248</h3>
          </div>
          
          <div className="standard-card p-6 border-l-4 border-tertiary">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Aspirasi Masuk</p>
            </div>
            <h3 className="text-5xl font-extrabold text-gray-900 tracking-tighter">{aspirasiList.length}</h3>
          </div>

          <div className="standard-card p-6 border-l-4 border-secondary">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700">
                <Gift className="w-5 h-5" />
              </div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Aspirasi Selesai</p>
            </div>
            <h3 className="text-5xl font-extrabold text-gray-900 tracking-tighter">{aspirasiSelesai}</h3>
          </div>

          <div className="standard-card p-6 border-l-4 border-gray-400">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Layanan Aktif</p>
            </div>
            <h3 className="text-5xl font-extrabold text-gray-900 tracking-tighter">15</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Surat Stats */}
        <div className="lg:col-span-8 standard-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xl font-bold text-gray-900">Statistik Layanan Surat</h4>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-primary rounded-full"></span>
              <span className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Frekuensi</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span>SKU (Keterangan Usaha)</span>
                  <span className="text-primary">450</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full">
                  <div className="bg-primary h-full w-[85%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span>SKTM (Keterangan Tidak Mampu)</span>
                  <span className="text-primary">320</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full">
                  <div className="bg-primary h-full w-[60%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span>Domisili</span>
                  <span className="text-primary">280</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full">
                  <div className="bg-primary h-full w-[50%] rounded-full"></div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col justify-center">
              <h5 className="text-xs font-bold text-gray-500 uppercase mb-4">Status Aspirasi</h5>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Baru</span>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-xs font-bold">{aspirasiBaru}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Diproses</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-bold">{aspirasiDiproses}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Selesai</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-bold">{aspirasiSelesai}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs */}
        <div className="lg:col-span-4 standard-card p-6 flex flex-col">
          <h4 className="text-xl font-bold text-gray-900 mb-6">Pekerjaan Utama</h4>
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span>Petani</span>
                <span className="text-primary">{petaniStats.count} ({petaniStats.percent}%)</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{width: \`\${petaniStats.percent}%\`}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span>Pegawai Swasta / PNS</span>
                <span className="text-blue-600">{karyawanStats.count} ({karyawanStats.percent}%)</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{width: \`\${karyawanStats.percent}%\`}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span>Wiraswasta</span>
                <span className="text-amber-600">{wiraswastaStats.count} ({wiraswastaStats.percent}%)</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{width: \`\${wiraswastaStats.percent}%\`}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span>Lainnya</span>
                <span className="text-gray-500">{lainnyaCount} ({lainnyaPercent}%)</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                <div className="bg-gray-400 h-full rounded-full" style={{width: \`\${lainnyaPercent}%\`}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Family Prosperity */}
        <div className="standard-card p-6">
          <h4 className="text-xl font-bold text-gray-900 mb-6">Tingkat Kesejahteraan Keluarga</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="group">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-bold">Pra-Sejahtera</span>
                  <span className="text-rose-600 font-extrabold text-lg">124 KK</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full">
                  <div className="bg-rose-600 h-full w-[17%] rounded-full"></div>
                </div>
              </div>
              <div className="group">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-bold">Sejahtera I</span>
                  <span className="text-amber-600 font-extrabold text-lg">245 KK</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full">
                  <div className="bg-amber-600 h-full w-[34%] rounded-full"></div>
                </div>
              </div>
              <div className="group">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-bold">Sejahtera II</span>
                  <span className="text-primary font-extrabold text-lg">198 KK</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full">
                  <div className="bg-primary h-full w-[28%] rounded-full"></div>
                </div>
              </div>
              <div className="group">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-bold">Sejahtera III+</span>
                  <span className="text-blue-600 font-extrabold text-lg">145 KK</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full">
                  <div className="bg-blue-600 h-full w-[21%] rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Mayoritas</p>
                <h5 className="text-2xl font-extrabold text-primary mt-1">Sejahtera I</h5>
                <p className="text-xs text-gray-500 mt-1">34% dari Total KK</p>
              </div>
            </div>
          </div>
        </div>

        {/* Education Level (Simulation Donut) */}
        <div className="standard-card p-6">
          <h4 className="text-xl font-bold text-gray-900 mb-6">Tingkat Pendidikan Terakhir</h4>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" fill="transparent" r="16" stroke="#eeeeee" strokeWidth="4"></circle>
                {/* SD */}
                <circle className="donut-segment" cx="18" cy="18" fill="transparent" r="16" stroke="#0d631b" strokeDasharray={\`\${sdPercent} 100\`} strokeDashoffset="0" strokeWidth="4"></circle>
                {/* SMP */}
                <circle className="donut-segment" cx="18" cy="18" fill="transparent" r="16" stroke="#246dc8" strokeDasharray={\`\${smpPercent} 100\`} strokeDashoffset={\`-\${sdPercent}\`} strokeWidth="4"></circle>
                {/* SMA */}
                <circle className="donut-segment" cx="18" cy="18" fill="transparent" r="16" stroke="#fdc825" strokeDasharray={\`\${smaPercent} 100\`} strokeDashoffset={\`-\${sdPercent + smpPercent}\`} strokeWidth="4"></circle>
                {/* Sarjana */}
                <circle className="donut-segment" cx="18" cy="18" fill="transparent" r="16" stroke="#ba1a1a" strokeDasharray={\`\${sarjanaPercent} 100\`} strokeDashoffset={\`-\${sdPercent + smpPercent + smaPercent}\`} strokeWidth="4"></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-gray-500">Lulus</span>
                <span className="text-xl font-extrabold text-gray-900">{totalResidents > 0 ? 100 - eduLainnya : 0}%</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary"></span>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">SD</p>
                  <p className="text-sm font-extrabold">{sdPercent}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">SMP</p>
                  <p className="text-sm font-extrabold">{smpPercent}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">SMA</p>
                  <p className="text-sm font-extrabold">{smaPercent}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Sarjana</p>
                  <p className="text-sm font-extrabold">{sarjanaPercent}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 standard-card p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xl font-bold text-gray-900">Aktivitas Terkini</h4>
            <button onClick={() => setActiveTab && setActiveTab('notifikasi')} className="text-primary font-bold text-xs hover:underline uppercase tracking-wider">Lihat Semua</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-200">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h5 className="font-bold text-sm">Penerbitan SKU</h5>
                  <span className="text-[10px] text-gray-500 font-bold">14:20 WIB</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Pemohon: <span className="text-gray-900 font-extrabold">Bpk. Ahmad Subarjo</span> (RT 04)</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">Selesai</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-200">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h5 className="font-bold text-sm">Penyaluran BLT</h5>
                  <span className="text-[10px] text-gray-500 font-bold">10:15 WIB</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Status: <span className="text-gray-900 font-extrabold">150 KPM Tersalurkan</span></p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">Selesai</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-200">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h5 className="font-bold text-sm">Pembaruan Kartu Keluarga</h5>
                  <span className="text-[10px] text-gray-500 font-bold">Kemarin</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Pemohon: <span className="text-gray-900 font-extrabold">Ibu Siti Aminah</span></p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold">Proses</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-200">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h5 className="font-bold text-sm">Surat Keterangan Domisili</h5>
                  <span className="text-[10px] text-gray-500 font-bold">Kemarin</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Pemohon: <span className="text-gray-900 font-extrabold">Andi Wijaya</span></p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">Selesai</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', content);
