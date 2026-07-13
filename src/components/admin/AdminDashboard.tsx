import NumberCounter from '../common/NumberCounter';
import { fetchResidentsCached } from '../../utils/apiCache';

import React, { useState, useEffect } from 'react';
import { Users, FileText, Gift, MessageSquare, TrendingUp, ChevronDown, UserPlus, PenTool, ExternalLink, Loader2, Building2, BarChart3, Clock, AlertTriangle, CheckCircle2, MessageCircle, Sparkles } from 'lucide-react';
import { getAspirasi } from '../../utils/aspirasiData';
import { getFeedbacks, Feedback } from '../../utils/feedbackData';
import { getSaaSLogs, SaaSLog } from '../../utils/saasLogs';

export default function AdminDashboard({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [desaName, setDesaName] = useState(() => localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');
  const [aspirasiList, setAspirasiList] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [authUser, setAuthUser] = useState<any>(null);
  const [saasLogs, setSaasLogs] = useState<SaaSLog[]>([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
    setAuthUser(user);

    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');
    };
    const handleFeedbackUpdate = () => {
      setFeedbacks(getFeedbacks());
    };
    const handleSaaSLogsUpdate = () => {
      setSaasLogs(getSaaSLogs().slice(0, 5));
    };

    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    window.addEventListener('feedback_updated', handleFeedbackUpdate);
    window.addEventListener('saas_logs_updated', handleSaaSLogsUpdate);
    
    handleSaaSLogsUpdate();

    return () => {
      window.removeEventListener('village_settings_updated', handleSettingsUpdate);
      window.removeEventListener('feedback_updated', handleFeedbackUpdate);
      window.removeEventListener('saas_logs_updated', handleSaaSLogsUpdate);
    };
  }, []);

  useEffect(() => {
    // load aspirasi & feedback
    setAspirasiList(getAspirasi());
    setFeedbacks(getFeedbacks());

    fetchResidentsCached()
      .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
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

  if (authUser?.role === 'saas_admin') {
    const totalDesa = 5; // Mock
    const totalWargaEkosistem = residents.length * totalDesa;
    const totalSuratEkosistem = 12480; // Mock
    
    // Simulating app usage data
    const usageData = [
      { name: 'Desa Wasah Hilir', users: 124, surat: 850, uptime: '99.9%' },
      { name: 'Desa Sukamaju', users: 89, surat: 420, uptime: '99.8%' },
      { name: 'Desa Melati', users: 210, surat: 1100, uptime: '99.9%' },
      { name: 'Desa Anggrek', users: 56, surat: 280, uptime: '99.7%' },
      { name: 'Desa Mawar', users: 145, surat: 760, uptime: '99.9%' },
    ];

    return (
      <div className="max-w-[1440px] mx-auto space-y-6 pb-24">
        {/* SaaS Header */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">SaaS Command Center</h2>
            <p className="text-sm text-slate-500 mt-1">Pemantauan ekosistem digitalisasi desa lintas wilayah</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setActiveTab?.('log_aktivitas')}
              className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <Clock size={18} />
              <span>Log Sistem</span>
            </button>
            <button 
              onClick={() => setActiveTab?.('tenants')}
              className="px-6 py-2.5 bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-800 transition-all flex items-center gap-2"
            >
              <Building2 size={18} />
              <span>Manajemen Desa</span>
            </button>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 mb-6">
                <Building2 className="w-6 h-6" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Desa Terdaftar</p>
              <h3 className="text-4xl font-black text-slate-900 tracking-tight"><NumberCounter end={totalDesa} /></h3>
              <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-xs">
                <TrendingUp size={14} />
                <span>+2 desa bulan ini</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 mb-6">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Penduduk Ekosistem</p>
              <h3 className="text-4xl font-black text-slate-900 tracking-tight"><NumberCounter end={totalWargaEkosistem} /></h3>
              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Terverifikasi Biometrik</p>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-700 mb-6">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Dokumen Diterbitkan</p>
              <h3 className="text-4xl font-black text-slate-900 tracking-tight"><NumberCounter end={totalSuratEkosistem} /></h3>
              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">Efisiensi Kertas 85%</p>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-700 mb-6">
                <MessageCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Feedback Pengguna</p>
              <h3 className="text-4xl font-black text-slate-900 tracking-tight"><NumberCounter end={feedbacks.length} /></h3>
              <div className="mt-4 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                  {feedbacks.filter(f => f.status === 'Baru').length} Baru
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Monitoring */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="text-xl font-bold text-slate-900">Pemantauan Pemakaian Aplikasi</h4>
                <p className="text-xs text-slate-500 mt-1">Metrik performa dan penggunaan fitur antar desa terdaftar</p>
              </div>
              <BarChart3 className="text-slate-300 w-6 h-6" />
            </div>
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-4">Nama Desa</th>
                      <th className="px-8 py-4">Sesi Aktif</th>
                      <th className="px-8 py-4">Surat Hari Ini</th>
                      <th className="px-8 py-4">System Uptime</th>
                      <th className="px-8 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usageData.map((data, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5 font-bold text-slate-900">{data.name}</td>
                        <td className="px-8 py-5 text-slate-600">{data.users}</td>
                        <td className="px-8 py-5 font-medium text-emerald-600">{data.surat}</td>
                        <td className="px-8 py-5 text-slate-500 font-mono text-xs">{data.uptime}</td>
                        <td className="px-8 py-5 text-right">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse mr-2" />
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Normal</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            <div className="relative z-10">
              <Sparkles className="w-8 h-8 text-amber-400 mb-6" />
              <h4 className="text-xl font-bold leading-tight mb-2">Kontrol Branding Global</h4>
              <p className="text-sm text-slate-400 mb-6">Sesuaikan logo, nama aplikasi, dan warna tema utama untuk seluruh desa dalam satu klik.</p>
              <button 
                onClick={() => setActiveTab?.('global_branding')}
                className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold text-sm hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/20"
              >
                <PenTool size={18} />
                <span>Edit Tampilan Masal</span>
              </button>
              
              <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Auto-Update Client</span>
                  <div className="w-10 h-5 bg-emerald-500 rounded-full flex items-center px-1">
                    <div className="w-3 h-3 bg-white rounded-full translate-x-5" />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Multi-Region Sync</span>
                  <div className="w-10 h-5 bg-emerald-500 rounded-full flex items-center px-1">
                    <div className="w-3 h-3 bg-white rounded-full translate-x-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="text-xl font-bold text-slate-900">Saran & Kritik Pengguna</h4>
                <p className="text-xs text-slate-500 mt-1">Masukan dari admin desa dan warga untuk pengembangan platform</p>
              </div>
              <button 
                onClick={() => setActiveTab?.('tenants')} // Should go to feedback tab in tenants, but for now just tenants
                className="text-emerald-700 text-xs font-bold uppercase tracking-widest hover:underline"
              >
                Lihat Detail
              </button>
            </div>
            <div className="flex-1 overflow-auto max-h-[500px] p-4">
              <div className="space-y-3">
                {feedbacks.length > 0 ? feedbacks.map((f) => (
                  <div key={f.id} className="p-5 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-3 items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg ${
                          f.kategori === 'Saran' ? 'bg-blue-600' : f.kategori === 'Bug' ? 'bg-rose-600' : 'bg-amber-600'
                        }`}>
                          {f.nama.charAt(0)}
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-slate-900">{f.nama}</h5>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{f.desa}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-[10px] text-slate-400">{f.tanggal}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        f.status === 'Baru' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {f.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed italic border-l-4 border-slate-200 pl-4 py-1">
                      "{f.pesan}"
                    </p>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <MessageSquare size={48} className="mb-4 opacity-20" />
                    <p className="font-bold">Belum ada feedback masuk.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
              <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span>Log Aktivitas Terbaru</span>
              </h4>
              <div className="space-y-6">
                {saasLogs.length > 0 ? saasLogs.map((log) => (
                  <div key={log.id} className="flex gap-4 relative group">
                    <div className="absolute left-[7px] top-6 bottom-0 w-[2px] bg-slate-100 group-last:hidden" />
                    <div className={`w-4 h-4 rounded-full border-4 border-white shadow-sm shrink-0 z-10 mt-1 ${
                      log.status === 'Berhasil' ? 'bg-emerald-500' : log.status === 'Gagal' ? 'bg-rose-500' : 'bg-amber-500'
                    }`} />
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">{log.aksi}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{log.target}</p>
                      <p className="text-[9px] text-slate-400 mt-1">{log.waktu}, {log.tanggal}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 italic">Belum ada aktivitas tercatat.</p>
                )}
              </div>
              <button 
                onClick={() => setActiveTab?.('log_aktivitas')}
                className="w-full mt-8 py-3 text-slate-500 hover:text-slate-900 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Lihat Semua Log
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="standard-card p-6 border-l-4 border-primary">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-primary-container/10 rounded-lg flex items-center justify-center text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-primary font-bold text-xs bg-primary-container/10 px-2 py-1 rounded">+8% Bulan ini</span>
            </div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Surat Dikeluarkan</p>
            <h3 className="text-5xl font-extrabold text-gray-900 tracking-tighter"><NumberCounter end={1248} /></h3>
          </div>
          
          <div className="standard-card p-6 border-l-4 border-tertiary">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Aspirasi Masuk</p>
            </div>
            <h3 className="text-5xl font-extrabold text-gray-900 tracking-tighter"><NumberCounter end={aspirasiList.length} /></h3>
          </div>

          <div className="standard-card p-6 border-l-4 border-emerald-500">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Produk Hukum (SK/Perdes)</p>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-5xl font-extrabold text-gray-900 tracking-tighter"><NumberCounter end={45} /></h3>
              <span className="text-sm font-bold text-gray-400">Dokumen</span>
            </div>
          </div>

          <div className="standard-card p-6 border-l-4 border-indigo-500">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700">
                <BarChart3 className="w-5 h-5" />
              </div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Layanan Terpopuler</p>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">SKU</h3>
              <span className="text-sm font-bold text-gray-400">(Ket. Usaha)</span>
            </div>
          </div>

          <div className="standard-card p-6 border-l-4 border-secondary">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Aspirasi Selesai</p>
            </div>
            <h3 className="text-5xl font-extrabold text-gray-900 tracking-tighter"><NumberCounter end={aspirasiSelesai} /></h3>
          </div>

          <div className="standard-card p-6 border-l-4 border-gray-400">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Layanan Aktif</p>
            </div>
            <h3 className="text-5xl font-extrabold text-gray-900 tracking-tighter"><NumberCounter end={15} /></h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Surat Stats */}
        <div className="lg:col-span-12 standard-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xl font-bold text-gray-900">Statistik Layanan Surat & Aspirasi</h4>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-primary rounded-full"></span>
              <span className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Frekuensi</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4 md:col-span-2">
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
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span>Kelahiran / Kematian</span>
                  <span className="text-primary">120</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full">
                  <div className="bg-primary h-full w-[25%] rounded-full"></div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6 flex flex-col justify-center border border-gray-100 shadow-inner">
              <h5 className="text-sm font-bold text-gray-600 uppercase mb-6 tracking-wider">Status Aspirasi Warga</h5>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Menunggu (Baru)</span>
                  <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-sm font-black shadow-sm">{aspirasiBaru}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Sedang Diproses</span>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-black shadow-sm">{aspirasiDiproses}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Selesai / Ditutup</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-black shadow-sm">{aspirasiSelesai}</span>
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
