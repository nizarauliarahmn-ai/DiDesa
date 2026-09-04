import React, { useState, useEffect, useCallback } from 'react';
import { User, FileText, Heart, MessageSquare, LogOut, Phone, MapPin, Calendar, ChevronRight, Loader2, Inbox, AlertCircle, Award, Home } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface ResidentSession {
  nik: string;
  name: string;
  phone?: string;
  tenantId: string;
}

interface ResidentData {
  nik: string;
  name: string;
  no_whatsapp?: string;
  address?: string;
  rt?: string;
  rw?: string;
  gender?: string;
  birth_date?: string;
  religion?: string;
  job?: string;
  status?: string;
}

interface BantuanItem {
  id: string;
  program_id: string;
  nama: string;
  tahun: number;
  status: string;
  source?: string;
  created_at: string;
}

interface SuratItem {
  id: string;
  nomor: string;
  jenis_surat: string;
  status: string;
  keterangan?: string;
  created_at: string;
}

interface AspirasiItem {
  id: string;
  kategori: string;
  subjek: string;
  pesan: string;
  status: string;
  tanggapan_admin?: string;
  created_at: string;
}

type Tab = 'profil' | 'bantuan' | 'surat' | 'aspirasi';

export default function ResidentDashboard({ onLogout }: { onLogout: () => void }) {
  const [session] = useState<ResidentSession>(() => JSON.parse(localStorage.getItem('didesa_resident_user') || '{}'));
  const [resident, setResident] = useState<ResidentData | null>(null);
  const [bantuanList, setBantuanList] = useState<BantuanItem[]>([]);
  const [suratList, setSuratList] = useState<SuratItem[]>([]);
  const [aspirasiList, setAspirasiList] = useState<AspirasiItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('profil');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!session.nik || !session.tenantId) return;
    setLoading(true);
    try {
      const [residentRes, bantuanRes, suratRes, aspirasiRes] = await Promise.all([
        supabase.from('residents').select('*').eq('nik', session.nik).eq('tenant_id', session.tenantId).limit(1).maybeSingle(),
        supabase.from('bansos_recipients').select('*').eq('resident_id', session.nik).eq('tenant_id', session.tenantId).order('created_at', { ascending: false }),
        supabase.from('surat').select('id, nomor, jenis_surat, status, keterangan, created_at').eq('nik', session.nik).eq('tenant_id', session.tenantId).order('created_at', { ascending: false }),
        supabase.from('aspirasi').select('id, kategori, subjek, pesan, status, tanggapan_admin, created_at').eq('nama_pengirim', session.name).eq('tenant_id', session.tenantId).order('created_at', { ascending: false }),
      ]);

      if (residentRes.data) setResident(residentRes.data);
      if (bantuanRes.data) setBantuanList(bantuanRes.data);
      if (suratRes.data) setSuratList(suratRes.data);
      if (aspirasiRes.data) setAspirasiList(aspirasiRes.data);
    } catch (e) {
      console.error('Gagal memuat data warga:', e);
    } finally {
      setLoading(false);
    }
  }, [session.nik, session.tenantId, session.name]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('didesa_resident_user');
    onLogout();
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; }
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      'Baru': 'bg-blue-100 text-blue-700',
      'Menunggu': 'bg-amber-100 text-amber-700',
      'Proses': 'bg-indigo-100 text-indigo-700',
      'Selesai': 'bg-emerald-100 text-emerald-700',
      'aktif': 'bg-emerald-100 text-emerald-700',
      'pending': 'bg-amber-100 text-amber-700',
    };
    return map[s] || 'bg-slate-100 text-slate-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'profil', label: 'Profil', icon: <User size={16} /> },
    { id: 'bantuan', label: 'Bantuan', icon: <Heart size={16} />, count: bantuanList.length },
    { id: 'surat', label: 'Surat', icon: <FileText size={16} />, count: suratList.length },
    { id: 'aspirasi', label: 'Aspirasi', icon: <MessageSquare size={16} />, count: aspirasiList.length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <div className="bg-emerald-700 text-white px-4 py-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold">{session.name}</h1>
              <p className="text-[11px] text-emerald-200 font-mono">NIK: {session.nik}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Keluar">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-all ${activeTab === t.id ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t.icon}
              <span>{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded-full">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4">
        {activeTab === 'profil' && resident && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <User size={16} className="text-emerald-600" /> Data Diri
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'NIK', value: resident.nik, icon: <span className="text-xs font-mono">🔢</span> },
                  { label: 'Nama', value: resident.name, icon: <User size={14} className="text-slate-400" /> },
                  { label: 'Jenis Kelamin', value: resident.gender, icon: <span className="text-xs">👤</span> },
                  { label: 'Tempat, Tanggal Lahir', value: resident.birth_date ? `${resident.birth_date}` : null, icon: <Calendar size={14} className="text-slate-400" /> },
                  { label: 'Agama', value: resident.religion, icon: <span className="text-xs">🕌</span> },
                  { label: 'Pekerjaan', value: resident.job, icon: <span className="text-xs">💼</span> },
                  { label: 'No. WhatsApp', value: resident.no_whatsapp, icon: <Phone size={14} className="text-slate-400" /> },
                  { label: 'Alamat', value: resident.address, icon: <MapPin size={14} className="text-slate-400" /> },
                  { label: 'RT / RW', value: resident.rt && resident.rw ? `${resident.rt} / ${resident.rw}` : null, icon: <Home size={14} className="text-slate-400" /> },
                ].filter(i => i.value).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                    <span className="mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-400 font-bold uppercase">{item.label}</p>
                      <p className="text-sm text-slate-800 font-medium">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bantuan' && (
          <div className="space-y-3">
            {bantuanList.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">Belum ada riwayat bantuan</p>
              </div>
            ) : bantuanList.map(b => (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{b.program_id}</p>
                  <p className="text-xs text-slate-500">{b.tahun} &middot; {b.source || 'Sistem'}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColor(b.status)}`}>{b.status}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'surat' && (
          <div className="space-y-3">
            {suratList.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">Belum ada dokumen surat</p>
              </div>
            ) : suratList.map(s => (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{s.jenis_surat}</p>
                  <p className="text-xs text-slate-500 font-mono">{s.nomor}</p>
                  {s.keterangan && <p className="text-xs text-slate-400 mt-0.5 truncate">{s.keterangan}</p>}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColor(s.status)}`}>{s.status}</span>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDate(s.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'aspirasi' && (
          <div className="space-y-3">
            {aspirasiList.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">Belum ada aspirasi</p>
              </div>
            ) : aspirasiList.map(a => (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 font-bold uppercase">{a.kategori}</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{a.subjek}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ml-2 ${statusColor(a.status)}`}>{a.status}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 mb-2">{a.pesan}</p>
                {a.tanggapan_admin && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mt-2">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Tanggapan Admin</p>
                    <p className="text-xs text-emerald-800">{a.tanggapan_admin}</p>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 mt-2">{formatDate(a.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
