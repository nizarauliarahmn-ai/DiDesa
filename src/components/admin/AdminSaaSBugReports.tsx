import React, { useState, useEffect } from 'react';
import { 
  Bug, LifeBuoy, AlertTriangle, CheckCircle2, Clock, 
  Search, RefreshCw, Eye, MessageSquare, ShieldAlert,
  Send, User, Building2, Monitor, ArrowRight, Filter,
  Check, X, Sparkles, HelpCircle, Tag, Info
} from 'lucide-react';
import { 
  fetchBugReportsOnline, 
  updateBugReportStatusOnline,
  replyToBugReportOnline,
  BugReport 
} from '../../utils/bugReportService';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';

export const AdminSaaSBugReports: React.FC = () => {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Selected Detail Modal
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [adminReplyInput, setAdminReplyInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await fetchBugReportsOnline();
      setReports(data || []);
      setIsRealtimeConnected(true);
    } catch (err: any) {
      console.error('Error fetching bug reports:', err);
      showToast('Gagal memuat laporan bug: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    const handleUpdate = () => {
      fetchReports();
    };

    window.addEventListener('bug_reports_updated', handleUpdate);

    // Supabase Realtime Subscription for saas_settings
    const channel = supabase
      .channel('public_saas_bug_reports_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saas_settings' }, (payload) => {
        fetchReports();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
        }
      });

    return () => {
      window.removeEventListener('bug_reports_updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenDetail = (report: BugReport) => {
    setSelectedReport(report);
    setAdminReplyInput(report.admin_reply || '');
  };

  const handleUpdateStatus = async (newStatus: BugReport['status']) => {
    if (!selectedReport) return;
    setIsUpdatingStatus(true);
    try {
      let success = true;
      let statusChangedByReply = false;
      
      if (adminReplyInput.trim()) {
        success = await replyToBugReportOnline(selectedReport.id, {
          sender: 'SaaS Admin',
          role: 'SaaS Admin',
          text: adminReplyInput
        });
        setAdminReplyInput('');
        if (newStatus === 'Menunggu') {
          newStatus = 'Diproses';
        }
        statusChangedByReply = true;
      }
      
      // If we didn't send a reply OR we are explicitly changing to a different status like 'Selesai'
      if (success && !statusChangedByReply && newStatus !== selectedReport.status) {
        success = await updateBugReportStatusOnline(selectedReport.id, newStatus);
      } else if (success && statusChangedByReply && newStatus !== 'Diproses') {
        // If they replied BUT also clicked "Selesai", we should update status to Selesai after replying
        success = await updateBugReportStatusOnline(selectedReport.id, newStatus);
      }

      if (success) {
        showToast(`Status tiket ${selectedReport.id} diperbarui menjadi '${newStatus}'!`, 'success');
        setSelectedReport(prev => prev ? { ...prev, status: newStatus, admin_reply: adminReplyInput } : null);
        fetchReports();
      } else {
        throw new Error('Gagal memperbarui status ke cloud.');
      }
    } catch (err: any) {
      showToast('Gagal memperbarui status: ' + err.message, 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Filter Reports
  const filteredReports = reports.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.reporter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchUrgency = urgencyFilter === 'all' || item.urgency === urgencyFilter;
    return matchSearch && matchStatus && matchUrgency;
  });

  const totalReports = reports.length;
  const pendingCount = reports.filter(r => r.status === 'Menunggu').length;
  const processingCount = reports.filter(r => r.status === 'Diproses').length;
  const resolvedCount = reports.filter(r => r.status === 'Selesai').length;

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Mendesak':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shadow-xs animate-pulse">
            🔴 Mendesak
          </span>
        );
      case 'Tinggi':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            🟠 Tinggi
          </span>
        );
      case 'Sedang':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            🟡 Sedang
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            🔵 Rendah
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Menunggu':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <Clock size={12} /> Menunggu Respon
          </span>
        );
      case 'Diproses':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <RefreshCw size={12} className="animate-spin" /> Sedang Diproses
          </span>
        );
      case 'Selesai':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={12} /> Selesai Ditangani
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return <Bug size={14} className="text-rose-500" />;
      case 'feature_request': return <Sparkles size={14} className="text-indigo-500" />;
      case 'question': return <HelpCircle size={14} className="text-teal-500" />;
      default: return <Info size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-rose-900/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-rose-500/20 text-rose-300 rounded-xl border border-rose-400/20">
                <Bug size={24} />
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Pusat Tiket Laporan Bug & Kendala Desa</h1>
            </div>
            <p className="text-slate-300 text-sm max-w-2xl">
              Pantau laporan bug, error sistem, dan permintaan bantuan dari seluruh instansi desa secara <strong className="text-rose-400 font-semibold">online & realtime</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300">
              <span className={`w-2.5 h-2.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {isRealtimeConnected ? 'Supabase Realtime Live' : 'Connecting Cloud...'}
            </div>

            <button
              onClick={fetchReports}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-xs transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Sync Server</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Tiket Laporan</span>
            <LifeBuoy size={16} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalReports} <span className="text-xs font-semibold text-slate-400">Tiket</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Terkirim dari seluruh desa</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Menunggu Respon</span>
            <Clock size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {pendingCount} <span className="text-xs font-semibold text-slate-400">Pending</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Memerlukan penanganan tim SaaS</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Sedang Diproses</span>
            <RefreshCw size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {processingCount} <span className="text-xs font-semibold text-slate-400">Tiket</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Dalam pengerjaan tim teknis</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Selesai Ditangani</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {resolvedCount} <span className="text-xs font-semibold text-slate-400">Resolved</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Telah ditangani dengan sukses</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari desa, pengirim, atau judul laporan..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="Menunggu">⏳ Menunggu Respon</option>
            <option value="Diproses">🛠️ Sedang Diproses</option>
            <option value="Selesai">✅ Selesai</option>
          </select>

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
          >
            <option value="all">Semua Urgensi</option>
            <option value="Mendesak">🔴 Mendesak</option>
            <option value="Tinggi">🟠 Tinggi</option>
            <option value="Sedang">🟡 Sedang</option>
            <option value="Rendah">🔵 Rendah</option>
          </select>
        </div>
      </div>

      {/* Main Reports List */}
      {loading && reports.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Mengambil daftar laporan bug dari Supabase Cloud...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Bug size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Tidak Ada Tiket Laporan</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || urgencyFilter !== 'all' 
              ? 'Tidak ada tiket laporan yang cocok dengan filter pencarian Anda.' 
              : 'Belum ada laporan kendala yang dikirim oleh admin desa.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((item) => (
            <div 
              key={item.id}
              onClick={() => handleOpenDetail(item)}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-400">
                    #{item.id.split('-').pop()}
                  </span>
                  {getStatusBadge(item.status)}
                  {getUrgencyBadge(item.urgency)}
                  
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    <Building2 size={12} /> {item.tenant_name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {getTypeIcon(item.type)}
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
                  <span>Pelapor: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{item.reporter_name}</strong> ({item.reporter_role})</span>
                  <span>•</span>
                  <span>Modul: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{item.module}</strong></span>
                  <span>•</span>
                  <span>{new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2 justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); handleOpenDetail(item); }}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5"
                >
                  <Eye size={14} /> Detail Tiket
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL / DRAWER */}
      {selectedReport && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400">ID: #{selectedReport.id}</span>
                  {getStatusBadge(selectedReport.status)}
                  {getUrgencyBadge(selectedReport.urgency)}
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {selectedReport.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Reporter Information Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Instansi Desa</span>
                  <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 size={14} className="text-indigo-500" /> {selectedReport.tenant_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Nama Pelapor</span>
                  <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <User size={14} className="text-emerald-500" /> {selectedReport.reporter_name} ({selectedReport.reporter_role})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Modul Terkait</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedReport.module}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Waktu Laporan</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(selectedReport.created_at).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Detail Message as Chat History */}
              <div className="space-y-4">
                {selectedReport.messages?.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'SaaS Admin' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-500">{msg.sender} ({msg.role})</span>
                      <span className="text-[9px] text-slate-400">{new Date(msg.timestamp).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                      msg.role === 'SaaS Admin' 
                        ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-slate-700'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status Update Quick Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ubah Status Tiket Penanganan:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('Menunggu')}
                    disabled={isUpdatingStatus}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedReport.status === 'Menunggu'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Clock size={14} /> Pending (Menunggu)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('Diproses')}
                    disabled={isUpdatingStatus}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedReport.status === 'Diproses'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <RefreshCw size={14} /> Sedang Diproses
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('Selesai')}
                    disabled={isUpdatingStatus}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedReport.status === 'Selesai'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle2 size={14} /> Selesai (Resolved)
                  </button>
                </div>
              </div>

              {/* Admin Reply Note Form */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Catatan Penanganan / Balasan Tim SaaS (Tampil ke Desa):
                </label>
                <textarea
                  rows={3}
                  value={adminReplyInput}
                  onChange={(e) => setAdminReplyInput(e.target.value)}
                  placeholder="Ketik balasan pesan ke desa di sini..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedReport.status)}
                disabled={isUpdatingStatus}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isUpdatingStatus ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Simpan Balasan SaaS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSaaSBugReports;
