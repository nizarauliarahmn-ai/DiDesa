import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Search, MapPin, Calendar, Tag, CheckCircle2, Clock, Ban,
  ChevronRight, Building2, Home, Users, FileText, Landmark, TrendingUp,
  Share2, Check, Filter, X, Edit3, Plus, Send, Loader2, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

interface UsulanDesa {
  id: string;
  tenant_id: string;
  kode_usulan: string;
  uraian_usulan: string;
  kategori: string;
  lokasi_rt_rw?: string | null;
  pengusul?: string | null;
  diteruskan_tags?: string[] | null;
  status_terakomodir: string;
  pipeline_status: string;
  skala_prioritas?: number | null;
  keterangan?: string | null;
  foto_url?: string | null;
  foto_progress_url?: string | null;
  anggaran?: number;
  created_at: string;
}

const PIPELINE_STAGES = ['Diajukan', 'Musrenbang', 'RKPDesa', 'RPJMDesa', 'APBDesa', 'Dikerjakan', 'Selesai'];

const PIPELINE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Diajukan': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', dot: 'bg-gray-400' },
  'Musrenbang': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-400' },
  'RKPDesa': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', dot: 'bg-indigo-400' },
  'RPJMDesa': { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', dot: 'bg-violet-400' },
  'APBDesa': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  'Dikerjakan': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' },
  'Selesai': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Ditolak': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-400' },
};

const KATEGORI_ICONS: Record<string, React.ReactNode> = {
  'Infrastruktur': <Home className="w-4 h-4" />,
  'Ekonomi': <TrendingUp className="w-4 h-4" />,
  'Sosial/Kesehatan': <Users className="w-4 h-4" />,
  'Pemerintahan': <Landmark className="w-4 h-4" />,
  'Pemberdayaan': <Building2 className="w-4 h-4" />,
};

const KATEGORI_COLORS: Record<string, string> = {
  'Infrastruktur': 'bg-blue-100 text-blue-700 border-blue-200',
  'Ekonomi': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Sosial/Kesehatan': 'bg-rose-100 text-rose-700 border-rose-200',
  'Pemerintahan': 'bg-violet-100 text-violet-700 border-violet-200',
  'Pemberdayaan': 'bg-amber-100 text-amber-700 border-amber-200',
};

const PERBAIKAN_FIELDS = [
  { value: 'uraian_usulan', label: 'Uraian / Nama Usulan' },
  { value: 'lokasi_rt_rw', label: 'Lokasi / Alamat' },
  { value: 'pengusul', label: 'Nama Pengusul' },
  { value: 'kategori', label: 'Kategori' },
  { value: 'keterangan', label: 'Keterangan' },
  { value: 'anggaran', label: 'Anggaran' },
  { value: 'lainnya', label: 'Lainnya (isi di kolom catatan)' },
];

const formatRupiah = (val?: number) => {
  if (!val) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
};

export default function PublicUsulanPortal() {
  const [usulanList, setUsulanList] = useState<UsulanDesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [villageName, setVillageName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('semua');
  const [filterPipeline, setFilterPipeline] = useState('semua');
  const [selectedUsulan, setSelectedUsulan] = useState<UsulanDesa | null>(null);
  const [copied, setCopied] = useState(false);

  const [showPerbaikanForm, setShowPerbaikanForm] = useState(false);
  const [showUsulanBaruForm, setShowUsulanBaruForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [perbaikanField, setPerbaikanField] = useState('uraian_usulan');
  const [perbaikanNilaiBaru, setPerbaikanNilaiBaru] = useState('');
  const [perbaikanCatatan, setPerbaikanCatatan] = useState('');
  const [perbaikanNama, setPerbaikanNama] = useState('');
  const [perbaikanKontak, setPerbaikanKontak] = useState('');

  const [baruUraian, setBaruUraian] = useState('');
  const [baruKategori, setBaruKategori] = useState('Infrastruktur');
  const [baruLokasi, setBaruLokasi] = useState('');
  const [baruPengusul, setBaruPengusul] = useState('');
  const [baruKontak, setBaruKontak] = useState('');
  const [baruKeterangan, setBaruKeterangan] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const usulanId = params.get('usulan_id');
    fetchData(usulanId);
  }, []);

  const fetchData = async (focusId?: string | null) => {
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) { setLoading(false); return; }

      const [usulanRes, settingRes] = await Promise.all([
        supabase.from('usulan_desas').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
        supabase.from('saas_settings').select('value').eq('tenant_id', tenantId).eq('key', 'village_name').maybeSingle()
      ]);

      if (settingRes.data?.value) setVillageName(settingRes.data.value);
      if (usulanRes.data) {
        setUsulanList(usulanRes.data as UsulanDesa[]);
        if (focusId) {
          const found = (usulanRes.data as UsulanDesa[]).find(u => u.id === focusId);
          if (found) setSelectedUsulan(found);
        }
      }
    } catch (e) {
      console.error('Error fetching usulan:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return usulanList.filter(u => {
      const matchSearch = !searchQuery ||
        u.uraian_usulan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.kode_usulan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.pengusul && u.pengusul.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchKategori = filterKategori === 'semua' || u.kategori === filterKategori;
      const matchPipeline = filterPipeline === 'semua' || u.pipeline_status === filterPipeline;
      return matchSearch && matchKategori && matchPipeline;
    });
  }, [usulanList, searchQuery, filterKategori, filterPipeline]);

  const summaryStats = useMemo(() => {
    const total = usulanList.length;
    const belum = usulanList.filter(u => u.status_terakomodir === 'Belum').length;
    const terakomodir = total - belum;
    const selesai = usulanList.filter(u => u.pipeline_status === 'Selesai').length;
    return { total, belum, terakomodir, selesai };
  }, [usulanList]);

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}?tab=usulan`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { prompt('Salin link ini:', url); });
  };

  const handleShareSingle = (u: UsulanDesa) => {
    const url = `${window.location.origin}${window.location.pathname}?tab=usulan&usulan_id=${u.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { prompt('Salin link ini:', url); });
  };

  const pipelineIndex = (stage: string) => PIPELINE_STAGES.indexOf(stage);

  const resetPerbaikanForm = () => {
    setPerbaikanField('uraian_usulan');
    setPerbaikanNilaiBaru('');
    setPerbaikanCatatan('');
    setPerbaikanNama('');
    setPerbaikanKontak('');
    setSubmitSuccess(false);
  };

  const resetBaruForm = () => {
    setBaruUraian('');
    setBaruKategori('Infrastruktur');
    setBaruLokasi('');
    setBaruPengusul('');
    setBaruKontak('');
    setBaruKeterangan('');
    setSubmitSuccess(false);
  };

  const submitPerbaikan = async () => {
    if (!perbaikanNama.trim() || !perbaikanNilaiBaru.trim() || !selectedUsulan) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('usulan_submissions').insert({
        tenant_id: selectedUsulan.tenant_id,
        type: 'perbaikan',
        usulan_id: selectedUsulan.id,
        uraian_usulan: selectedUsulan.uraian_usulan,
        kategori: selectedUsulan.kategori,
        lokasi_rt_rw: selectedUsulan.lokasi_rt_rw,
        pengusul: perbaikanNama.trim(),
        pengusul_kontak: perbaikanKontak.trim() || null,
        field_yang_diperbaiki: perbaikanField,
        nilai_baru: perbaikanNilaiBaru.trim(),
        catatan: perbaikanCatatan.trim() || null,
        status: 'pending',
      });
      if (error) throw error;
      setSubmitSuccess(true);
    } catch (e) {
      console.error(e);
      alert('Gagal mengirim. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitUsulanBaru = async () => {
    if (!baruUraian.trim() || !baruPengusul.trim()) return;
    setSubmitting(true);
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) throw new Error('Tenant not found');
      const { error } = await supabase.from('usulan_submissions').insert({
        tenant_id: tenantId,
        type: 'usulan_baru',
        uraian_usulan: baruUraian.trim(),
        kategori: baruKategori,
        lokasi_rt_rw: baruLokasi.trim() || null,
        pengusul: baruPengusul.trim(),
        pengusul_kontak: baruKontak.trim() || null,
        catatan: baruKeterangan.trim() || null,
        status: 'pending',
      });
      if (error) throw error;
      setSubmitSuccess(true);
    } catch (e) {
      console.error(e);
      alert('Gagal mengirim. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Memuat data usulan...</p>
        </div>
      </div>
    );
  }

  // ===== DETAIL VIEW =====
  if (selectedUsulan) {
    const u = selectedUsulan;
    const currentIdx = pipelineIndex(u.pipeline_status);
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => {
              setSelectedUsulan(null);
              setShowPerbaikanForm(false);
              resetPerbaikanForm();
              const cleanUrl = window.location.pathname + '?tab=usulan';
              window.history.replaceState({}, '', cleanUrl);
            }}
            className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 mb-4 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Usulan
          </button>

          <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full mb-2">
                    {u.kode_usulan}
                  </span>
                  <h1 className="text-xl font-bold text-white leading-snug">{u.uraian_usulan}</h1>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleShareSingle(u)}
                    className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors"
                    title="Bagikan link"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => { setShowPerbaikanForm(!showPerbaikanForm); resetPerbaikanForm(); }}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Edit3 className="w-4 h-4" />
                    Usulkan Perbaikan
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Pipeline Progress */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Progres Pipeline</h3>
                <div className="flex items-center gap-1 flex-wrap">
                  {PIPELINE_STAGES.map((stage, i) => {
                    const isCompleted = i <= currentIdx && u.pipeline_status !== 'Ditolak';
                    const isCurrent = stage === u.pipeline_status;
                    const colors = PIPELINE_COLORS[stage];
                    return (
                      <React.Fragment key={stage}>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          isCurrent ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-offset-1 ring-current/20` :
                          isCompleted ? `${colors.bg} ${colors.text} ${colors.border}` :
                          'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${isCurrent || isCompleted ? colors.dot : 'bg-slate-300'}`}></span>
                          {stage}
                        </div>
                        {i < PIPELINE_STAGES.length - 1 && (
                          <ChevronRight className={`w-3 h-3 ${i < currentIdx ? 'text-emerald-400' : 'text-slate-300'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Perbaikan Form */}
              {showPerbaikanForm && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  {submitSuccess ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Check className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="font-bold text-emerald-800 mb-1">Perbaikan Terkirim!</h3>
                      <p className="text-sm text-emerald-600">Admin akan segera meninjau usulan perbaikan Anda.</p>
                      <button
                        onClick={() => { setShowPerbaikanForm(false); resetPerbaikanForm(); }}
                        className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700"
                      >
                        Tutup
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <h3 className="font-bold text-amber-800">Usulkan Perbaikan</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Nama Lengkap *</label>
                          <input
                            type="text"
                            value={perbaikanNama}
                            onChange={e => setPerbaikanNama(e.target.value)}
                            placeholder="Masukkan nama Anda"
                            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">No. HP / WhatsApp</label>
                          <input
                            type="text"
                            value={perbaikanKontak}
                            onChange={e => setPerbaikanKontak(e.target.value)}
                            placeholder="08xxx"
                            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Bagian yang Perlu Diperbaiki *</label>
                        <select
                          value={perbaikanField}
                          onChange={e => setPerbaikanField(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                        >
                          {PERBAIKAN_FIELDS.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Nilai yang Benar *
                          {perbaikanField !== 'lainnya' && (
                            <span className="text-slate-400 font-normal ml-1">
                              (saat ini: "{u[perbaikanField as keyof UsulanDesa] || '-' || 'kosong'}")
                            </span>
                          )}
                        </label>
                        {perbaikanField === 'kategori' ? (
                          <select
                            value={perbaikanNilaiBaru}
                            onChange={e => setPerbaikanNilaiBaru(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                          >
                            <option value="">Pilih kategori...</option>
                            <option value="Infrastruktur">Infrastruktur</option>
                            <option value="Ekonomi">Ekonomi</option>
                            <option value="Sosial/Kesehatan">Sosial/Kesehatan</option>
                            <option value="Pemerintahan">Pemerintahan</option>
                            <option value="Pemberdayaan">Pemberdayaan</option>
                          </select>
                        ) : (
                          <input
                            type={perbaikanField === 'anggaran' ? 'number' : 'text'}
                            value={perbaikanNilaiBaru}
                            onChange={e => setPerbaikanNilaiBaru(e.target.value)}
                            placeholder={perbaikanField === 'anggaran' ? '50000000' : 'Tuliskan nilai yang benar...'}
                            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                          />
                        )}
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Catatan Tambahan</label>
                        <textarea
                          value={perbaikanCatatan}
                          onChange={e => setPerbaikanCatatan(e.target.value)}
                          placeholder="Jelaskan alasan perbaikan (misal: ada salah ketik nama jalan)"
                          rows={2}
                          className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setShowPerbaikanForm(false); resetPerbaikanForm(); }}
                          className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          onClick={submitPerbaikan}
                          disabled={submitting || !perbaikanNama.trim() || !perbaikanNilaiBaru.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Kirim Perbaikan
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoCard icon={<Tag className="w-4 h-4 text-blue-500" />} label="Kategori" value={u.kategori} />
                <InfoCard icon={<MapPin className="w-4 h-4 text-orange-500" />} label="Lokasi" value={u.lokasi_rt_rw || '-'} />
                <InfoCard icon={<Users className="w-4 h-4 text-violet-500" />} label="Pengusul" value={u.pengusul || '-'} />
                <InfoCard icon={<Calendar className="w-4 h-4 text-emerald-500" />} label="Tanggal Usul" value={new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <InfoCard icon={<Landmark className="w-4 h-4 text-amber-500" />} label="Anggaran" value={formatRupiah(u.anggaran)} />
                <InfoCard
                  icon={u.status_terakomodir === 'Belum' ? <Ban className="w-4 h-4 text-rose-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  label="Status Terakomodir"
                  value={u.status_terakomodir}
                  valueClassName={u.status_terakomodir === 'Belum' ? 'text-rose-600' : 'text-emerald-600'}
                />
              </div>

              {/* Tags */}
              {u.diteruskan_tags && u.diteruskan_tags.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Diteruskan Ke</h3>
                  <div className="flex flex-wrap gap-2">
                    {u.diteruskan_tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium px-2.5 py-1 rounded-full">
                        <FileText className="w-3 h-3" /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Keterangan */}
              {u.keterangan && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Keterangan</h3>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 border border-slate-100">{u.keterangan}</p>
                </div>
              )}

              {/* Foto */}
              {(u.foto_url || u.foto_progress_url) && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Foto</h3>
                  <div className="flex gap-3">
                    {u.foto_url && <img src={u.foto_url} alt="Foto Usulan" className="w-32 h-32 object-cover rounded-xl border border-slate-200" />}
                    {u.foto_progress_url && <img src={u.foto_progress_url} alt="Foto Progress" className="w-32 h-32 object-cover rounded-xl border border-slate-200" />}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center py-6 text-xs text-slate-400">
          {villageName && <span className="font-medium text-slate-500">{villageName} — </span>}
          <span>Sistem Informasi Desa · </span>
          <a href="https://sistemdidesa.id" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">sistemdidesa.id</a>
        </div>
      </div>
    );
  }

  // ===== LIST VIEW =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              {villageName && <p className="text-emerald-100 text-sm font-medium mb-1">{villageName}</p>}
              <h1 className="text-2xl md:text-3xl font-bold text-white">Daftar Usulan Desa</h1>
              <p className="text-emerald-100 text-sm mt-1">Pantau progress usulan pembangunan desa secara transparan</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowUsulanBaruForm(!showUsulanBaruForm); resetBaruForm(); }}
                className="flex items-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-xl transition-colors text-sm font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" /> Usulkan Usulan Baru
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl transition-colors text-sm font-medium"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copied ? 'Tersalin!' : 'Bagikan'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Usulan Baru Form */}
        {showUsulanBaruForm && (
          <div className="bg-white border-2 border-emerald-200 rounded-2xl p-6 mb-6 shadow-lg">
            {submitSuccess ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="font-bold text-emerald-800 text-lg mb-1">Usulan Terkirim!</h3>
                <p className="text-sm text-emerald-600 mb-4">Usulan Anda berhasil dikirim. Admin akan segera meninjau dan memproses.</p>
                <button
                  onClick={() => { setShowUsulanBaruForm(false); resetBaruForm(); }}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 rounded-xl">
                      <Plus className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">Usulkan Usulan Baru</h3>
                      <p className="text-xs text-slate-400">Sampaikan usulan pembangunan desa Anda</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowUsulanBaruForm(false); resetBaruForm(); }} className="p-1 hover:bg-slate-100 rounded-lg">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nama Pengusul *</label>
                    <input
                      type="text"
                      value={baruPengusul}
                      onChange={e => setBaruPengusul(e.target.value)}
                      placeholder="Nama lengkap Anda"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">No. HP / WhatsApp</label>
                    <input
                      type="text"
                      value={baruKontak}
                      onChange={e => setBaruKontak(e.target.value)}
                      placeholder="08xxx (opsional)"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Uraian Usulan *</label>
                  <input
                    type="text"
                    value={baruUraian}
                    onChange={e => setBaruUraian(e.target.value)}
                    placeholder="Contoh: Pemasangan PJU di Jl. Mawar RT 03"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Kategori</label>
                    <select
                      value={baruKategori}
                      onChange={e => setBaruKategori(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="Infrastruktur">Infrastruktur</option>
                      <option value="Ekonomi">Ekonomi</option>
                      <option value="Sosial/Kesehatan">Sosial / Kesehatan</option>
                      <option value="Pemerintahan">Pemerintahan</option>
                      <option value="Pemberdayaan">Pemberdayaan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Lokasi / Alamat</label>
                    <input
                      type="text"
                      value={baruLokasi}
                      onChange={e => setBaruLokasi(e.target.value)}
                      placeholder="RT 03 / RW 05 (opsional)"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Keterangan / Detail Tambahan</label>
                  <textarea
                    value={baruKeterangan}
                    onChange={e => setBaruKeterangan(e.target.value)}
                    placeholder="Jelaskan detail usulan Anda (opsional)"
                    rows={2}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowUsulanBaruForm(false); resetBaruForm(); }}
                    className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={submitUsulanBaru}
                    disabled={submitting || !baruUraian.trim() || !baruPengusul.trim()}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Kirim Usulan
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SummaryCard icon={<FileText className="w-5 h-5 text-emerald-500" />} value={summaryStats.total} label="Total Usulan" bg="bg-emerald-50" border="border-emerald-100" />
          <SummaryCard icon={<Clock className="w-5 h-5 text-amber-500" />} value={summaryStats.belum} label="Belum Terakomodir" bg="bg-amber-50" border="border-amber-100" />
          <SummaryCard icon={<CheckCircle2 className="w-5 h-5 text-blue-500" />} value={summaryStats.terakomodir} label="Terakomodir" bg="bg-blue-50" border="border-blue-100" />
          <SummaryCard icon={<CheckCircle2 className="w-5 h-5 text-violet-500" />} value={summaryStats.selesai} label="Selesai" bg="bg-violet-50" border="border-violet-100" />
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari judul usulan, kode, pengusul..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
              <option value="semua">Semua Kategori</option>
              <option value="Infrastruktur">Infrastruktur</option>
              <option value="Ekonomi">Ekonomi</option>
              <option value="Sosial/Kesehatan">Sosial/Kesehatan</option>
              <option value="Pemerintahan">Pemerintahan</option>
              <option value="Pemberdayaan">Pemberdayaan</option>
            </select>
            <select value={filterPipeline} onChange={e => setFilterPipeline(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
              <option value="semua">Semua Pipeline</option>
              {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {(filterKategori !== 'semua' || filterPipeline !== 'semua' || searchQuery) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400">{filtered.length} dari {usulanList.length} usulan ditampilkan</span>
              <button onClick={() => { setSearchQuery(''); setFilterKategori('semua'); setFilterPipeline('semua'); }}
                className="text-xs text-emerald-600 hover:underline ml-auto">Reset Filter</button>
            </div>
          )}
        </div>

        {/* Usulan List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Tidak ada usulan ditemukan</p>
            <p className="text-slate-400 text-sm mt-1">Coba ubah filter atau kata kunci pencarian</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(u => {
              const currentIdx = pipelineIndex(u.pipeline_status);
              const colors = PIPELINE_COLORS[u.pipeline_status] || PIPELINE_COLORS['Diajukan'];
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    setSelectedUsulan(u);
                    const url = `${window.location.pathname}?tab=usulan&usulan_id=${u.id}`;
                    window.history.replaceState({}, '', url);
                  }}
                  className="bg-white rounded-xl border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer p-4 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 text-center min-w-[80px]">
                      <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2 py-1 rounded-lg">
                        {u.kode_usulan}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                        {u.uraian_usulan}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${KATEGORI_COLORS[u.kategori] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {KATEGORI_ICONS[u.kategori]} {u.kategori}
                        </span>
                        {u.lokasi_rt_rw && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <MapPin className="w-3 h-3" /> {u.lokasi_rt_rw}
                          </span>
                        )}
                        {u.pengusul && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Users className="w-3 h-3" /> {u.pengusul}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 mt-2.5">
                        {PIPELINE_STAGES.map((stage, i) => {
                          const isActive = i <= currentIdx && u.pipeline_status !== 'Ditolak';
                          const isCurrent = stage === u.pipeline_status;
                          const c = PIPELINE_COLORS[stage];
                          return (
                            <div key={stage}
                              className={`h-1.5 flex-1 rounded-full transition-all ${isCurrent ? c.dot : isActive ? `${c.dot} opacity-60` : 'bg-slate-200'}`}
                              title={stage}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right flex items-center gap-3">
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></span>
                          {u.pipeline_status}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">{formatRupiah(u.anggaran)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShareSingle(u); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
                        title="Bagikan"
                      >
                        <Share2 className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-center py-8 text-xs text-slate-400">
        {villageName && <span className="font-medium text-slate-500">{villageName} — </span>}
        <span>Sistem Informasi Desa · </span>
        <a href="https://sistemdidesa.id" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">sistemdidesa.id</a>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, valueClassName = '' }: { icon: React.ReactNode; label: string; value: string; valueClassName?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[11px] text-slate-400 font-medium">{label}</span>
      </div>
      <p className={`text-sm font-semibold ${valueClassName || 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function SummaryCard({ icon, value, label, bg, border }: { icon: React.ReactNode; value: number; label: string; bg: string; border: string }) {
  return (
    <div className={`${bg} ${border} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
