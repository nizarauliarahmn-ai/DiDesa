import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Plus, Edit3, Trash2, Rocket, ShieldCheck, Zap, Info, 
  Search, RefreshCw, Eye, CheckCircle2, Clock, Globe,
  FileText, X, Tag, Calendar, Bold, Italic, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Minus, Wand2, Strikethrough
} from 'lucide-react';
import Markdown from 'react-markdown';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { addSaaSLog } from '../../utils/saasLogs';
import ConfirmModal from '../common/ConfirmModal';

export interface GlobalUpdateItem {
  id: string;
  title: string;
  content: string;
  version: string;
  release_date: string;
  type: 'feature' | 'fix' | 'improvement' | string;
  is_active: number; // 1 = Active, 0 = Inactive / Draft
  created_at?: string;
}

export const AdminSaaSGlobalUpdates: React.FC = () => {
  const [updates, setUpdates] = useState<GlobalUpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GlobalUpdateItem | null>(null);
  const [activeTabForm, setActiveTabForm] = useState<'write' | 'preview'>('write');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    version: '',
    type: 'feature' as 'feature' | 'fix' | 'improvement',
    release_date: new Date().toISOString().split('T')[0],
    is_active: 1,
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Textarea Ref for Word-style Toolbar Selection Wrapping
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormData(prev => ({ ...prev, content: prev.content + `${prefix}${defaultPlaceholder}${suffix}` }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = formData.content;

    const selectedText = currentText.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newText = currentText.substring(0, start) + replacement + currentText.substring(end);
    setFormData(prev => ({ ...prev, content: newText }));

    // Refocus & select inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  const applyPresetTemplate = (presetType: 'standard' | 'bugfix' | 'major') => {
    let tpl = '';
    if (presetType === 'standard') {
      tpl = `### ✨ Apa yang baru di versi ini?\n\n- **🚀 Fitur Baru**:\n  - Penambahan fitur utama...\n\n- **🛡️ Perbaikan System**:\n  - Perbaikan pada modul kependudukan...\n\n- **⚡ Peningkatan**:\n  - Peningkatan kecepatan halaman kependudukan...`;
    } else if (presetType === 'bugfix') {
      tpl = `### 🛡️ Catatan Perbaikan & Keamanan System\n\n1. **Perbaikan Fitur**: Perbaikan pada modul cetak surat...\n2. **Stabilitas Cloud**: Optimasi kestabilan Supabase Realtime...`;
    } else if (presetType === 'major') {
      tpl = `### 🚀 Rilis Fitur Utama Baru!\n\nKami dengan senang hati merilis pembaruan besar untuk seluruh instansi desa:\n\n- **Modul Baru**: Penjelasan fitur utama...\n- **Integrasi Cloud**: Otomatisasi data realtime...\n\n> 💡 *Petunjuk lengkap penggunaan dapat diakses melalui menu Panduan.*`;
    }
    setFormData(prev => ({ ...prev, content: tpl }));
  };

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<GlobalUpdateItem | null>(null);

  // Fetch Updates from Supabase Online
  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('global_updates')
        .select('*')
        .order('release_date', { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
      setIsRealtimeConnected(true);
    } catch (err: any) {
      console.error('Error fetching global updates:', err);
      showToast('Gagal memuat data pembaruan dari Supabase Cloud: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();

    // Subscribe to Supabase Realtime for table `global_updates`
    const channel = supabase
      .channel('public_global_updates_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_updates' }, (payload) => {
        console.log('Realtime change detected on global_updates:', payload);
        fetchUpdates();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    const nextVerNum = updates.length > 0 ? updates.length + 1 : 1;
    setFormData({
      title: '',
      version: `v1.${nextVerNum}`,
      type: 'feature',
      release_date: new Date().toISOString().split('T')[0],
      is_active: 1,
      content: '### ✨ Apa yang baru di versi ini?\n\n- **Fitur Baru**: Deskripsi fitur utama yang ditambahkan...\n- **Peningkatan**: Optimasi kecepatan halaman kependudukan...\n- **Perbaikan**: Perbaikan sistem cetak surat.'
    });
    setActiveTabForm('write');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: GlobalUpdateItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      version: item.version,
      type: (item.type as 'feature' | 'fix' | 'improvement') || 'feature',
      release_date: item.release_date || new Date().toISOString().split('T')[0],
      is_active: item.is_active ?? 1,
      content: item.content || ''
    });
    setActiveTabForm('write');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.version.trim() || !formData.content.trim()) {
      showToast('Harap isi Judul, Versi, dan Catatan Pembaruan!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: editingItem ? editingItem.id : `update-${Date.now()}`,
        title: formData.title,
        version: formData.version,
        type: formData.type,
        release_date: formData.release_date,
        is_active: Number(formData.is_active),
        content: formData.content
      };

      const { error } = await supabase
        .from('global_updates')
        .upsert([payload]);

      if (error) throw error;

      // Realtime Event Trigger
      window.dispatchEvent(new Event('global_updates_updated'));

      showToast(
        editingItem 
          ? `Pembaruan versi ${formData.version} berhasil diperbarui!` 
          : `🚀 Pembaruan ${formData.version} berhasil dirilis online ke seluruh desa!`, 
        'success'
      );

      // Log SaaS activity
      const authUser = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
      addSaaSLog({
        admin: authUser.name || 'SaaS Admin',
        aksi: editingItem ? 'Update Release Notes' : 'Rilis Pembaruan Baru',
        target: `${formData.version} - ${formData.title}`,
        status: 'Berhasil',
        category: 'SaaS Admin'
      });

      setIsModalOpen(false);
      fetchUpdates();
    } catch (err: any) {
      console.error('Error saving update:', err);
      showToast('Gagal menyimpan ke Supabase Cloud: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: GlobalUpdateItem) => {
    const nextStatus = item.is_active === 1 ? 0 : 1;
    try {
      const { error } = await supabase
        .from('global_updates')
        .update({ is_active: nextStatus })
        .eq('id', item.id);

      if (error) throw error;

      window.dispatchEvent(new Event('global_updates_updated'));
      showToast(
        nextStatus === 1 
          ? `Pembaruan ${item.version} diaktifkan & disebarkan ke desa.` 
          : `Pembaruan ${item.version} diubah menjadi Draft/Nonaktif.`,
        'success'
      );
      fetchUpdates();
    } catch (err: any) {
      showToast('Gagal mengubah status: ' + err.message, 'error');
    }
  };

  // Delete Confirm State
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<GlobalUpdateItem | null>(null);

  const executeDelete = async () => {
    if (!deleteConfirmItem) return;
    const item = deleteConfirmItem;
    setDeleteConfirmItem(null);

    try {
      const { error } = await supabase
        .from('global_updates')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      window.dispatchEvent(new Event('global_updates_updated'));
      showToast(`Catatan rilis ${item.version} berhasil dihapus dari cloud!`, 'success');
      fetchUpdates();
    } catch (err: any) {
      showToast('Gagal menghapus dari Supabase Cloud: ' + err.message, 'error');
    }
  };

  // Filter Data
  const filteredUpdates = updates.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || item.type === typeFilter;
    return matchSearch && matchType;
  });

  const latestVersion = updates.length > 0 ? updates[0].version : 'v1.0.0';
  const totalFeature = updates.filter(u => u.type === 'feature').length;
  const totalFix = updates.filter(u => u.type === 'fix').length;
  const totalImprovement = updates.filter(u => u.type === 'improvement').length;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'feature':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Rocket size={13} /> Fitur Baru
          </span>
        );
      case 'fix':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <ShieldCheck size={13} /> Perbaikan System
          </span>
        );
      case 'improvement':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Zap size={13} /> Peningkatan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Info size={13} /> Pembaruan
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/20">
                <Sparkles size={24} />
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Log Pembaruan Sistem (Release Notes)</h1>
            </div>
            <p className="text-slate-300 text-sm max-w-2xl">
              Pusat publikasi catatan pembaruan platform SaaS. Rilis fitur baru, perbaikan bug, dan optimasi secara <strong className="text-emerald-400 font-semibold">online & realtime</strong> ke seluruh instansi desa pengguna DiDesa.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300">
              <span className={`w-2.5 h-2.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {isRealtimeConnected ? 'Supabase Realtime Online' : 'Syncing Cloud...'}
            </div>

            <button
              onClick={handleOpenAddModal}
              className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Plus size={18} />
              <span>Rilis Pembaruan Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Versi Publikasi Terakhir</span>
            <Tag size={16} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {latestVersion}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Aktif & Tampil di Pop-up Desa</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Catatan Rilis</span>
            <FileText size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {updates.length} <span className="text-xs font-semibold text-slate-400">Pembaruan</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Tersimpan di Cloud Supabase</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Fitur Baru Released</span>
            <Rocket size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {totalFeature} <span className="text-xs font-semibold text-slate-400">Fitur</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Penambahan modul/fitur baru</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Perbaikan & Optimasi</span>
            <Zap size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {totalFix + totalImprovement} <span className="text-xs font-semibold text-slate-400">Item</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{totalFix} Fix / {totalImprovement} Performance</p>
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
            placeholder="Cari versi, judul, atau kata kunci..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${typeFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Semua
            </button>
            <button
              onClick={() => setTypeFilter('feature')}
              className={`px-3 py-1.5 rounded-lg transition-all ${typeFilter === 'feature' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Fitur Baru
            </button>
            <button
              onClick={() => setTypeFilter('fix')}
              className={`px-3 py-1.5 rounded-lg transition-all ${typeFilter === 'fix' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Perbaikan
            </button>
            <button
              onClick={() => setTypeFilter('improvement')}
              className={`px-3 py-1.5 rounded-lg transition-all ${typeFilter === 'improvement' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Peningkatan
            </button>
          </div>

          <button
            onClick={fetchUpdates}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content List / Timeline */}
      {loading && updates.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Mengambil catatan rilis terbaru dari Supabase Cloud...</p>
        </div>
      ) : filteredUpdates.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <FileText size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Tidak Ada Catatan Pembaruan</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery ? 'Tidak ada data pembaruan yang cocok dengan kata kunci pencarian Anda.' : 'Belum ada catatan rilis yang dipublikasikan.'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenAddModal}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} /> Rilis Pembaruan Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUpdates.map((item, index) => (
            <div 
              key={item.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-6 border transition-all shadow-xs hover:shadow-md relative overflow-hidden ${
                item.is_active === 1 
                  ? 'border-slate-200 dark:border-slate-800' 
                  : 'border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10'
              }`}
            >
              {/* Active / Draft Status Stripe */}
              <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${item.is_active === 1 ? 'bg-indigo-500' : 'bg-amber-500'}`} />

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pl-2">
                <div className="space-y-3 flex-1">
                  {/* Badge & Meta */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-slate-900 text-white dark:bg-slate-800 dark:text-indigo-300 font-mono font-black text-xs rounded-xl shadow-xs">
                      {item.version}
                    </span>
                    {getTypeBadge(item.type)}
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <Calendar size={13} /> {item.release_date}
                    </span>

                    {item.is_active === 1 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 size={11} /> Rilis Online (Aktif)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <Clock size={11} /> Draft (Nonaktif)
                      </span>
                    )}

                    {index === 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 text-white uppercase tracking-wider shadow-xs">
                        Rilis Terbaru
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {item.title}
                  </h3>

                  {/* Content (Rendered Markdown) */}
                  <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <Markdown>{item.content}</Markdown>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center md:flex-col gap-2 shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="flex-1 md:w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Uji Tampil Pop-up Desamu"
                  >
                    <Eye size={14} /> Preview Pop-up
                  </button>

                  <button
                    onClick={() => handleToggleStatus(item)}
                    className={`flex-1 md:w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      item.is_active === 1 
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800' 
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {item.is_active === 1 ? 'Sembunyikan' : 'Publikasikan'}
                  </button>

                  <div className="flex items-center gap-1 w-full">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="flex-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                    >
                      <Edit3 size={14} /> Edit
                    </button>

                    <button
                      onClick={() => setDeleteConfirmItem(item)}
                      className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all border border-rose-200 dark:border-rose-900/40 cursor-pointer"
                      title="Hapus Pembaruan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL EDIT / TAMBAH PEMBARUAN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {editingItem ? `Edit Catatan Pembaruan (${editingItem.version})` : 'Rilis Pembaruan Sistem Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pembaruan ini akan otomatis disinkronkan secara realtime ke seluruh pengguna desa
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Kode Versi */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Kode Versi <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">misal: v1.1 atau v2.0</span>
                  </div>

                  <input
                    type="text"
                    required
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="misal: v1.1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />

                  {/* Quick Version Selection Pills */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400">Pilih Cepat:</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, version: `v1.${updates.length > 0 ? updates.length : 1}` })}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      v1.{updates.length > 0 ? updates.length : 1}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, version: `v1.${(updates.length > 0 ? updates.length : 1) + 1}` })}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      v1.{(updates.length > 0 ? updates.length : 1) + 1}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, version: `v${(updates.length > 0 ? updates.length : 1) + 1}.0` })}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold rounded-md border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                    >
                      v{(updates.length > 0 ? updates.length : 1) + 1}.0
                    </button>
                  </div>
                </div>

                {/* Tipe Pembaruan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tipe Pembaruan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="feature">🚀 Fitur Baru (Feature)</option>
                    <option value="fix">🛡️ Perbaikan System (Bug Fix)</option>
                    <option value="improvement">⚡ Peningkatan (Improvement)</option>
                  </select>
                </div>

                {/* Tanggal Rilis */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tanggal Rilis <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.release_date}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Card Petunjuk Penjelasan Kode Versi */}
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
                <Info size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-slate-900 dark:text-white">💡 Penjelasan Kode Versi:</span>
                  <p className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300">
                    Kode versi adalah nomor penanda rilis (contoh: <strong>v1.1</strong>, <strong>v1.2</strong>, atau <strong>v2.0</strong>). Ketika Anda merilis versi baru yang nomornya belum pernah dilihat oleh akun desa, jendela pop-up pengumuman akan <strong>otomatis muncul di layar mereka secara realtime</strong>. Anda bebas mengetik penanda (misal: <em>v1.1</em>) atau mengeklik tombol <em>Pilih Cepat</em> di atas!
                  </p>
                </div>
              </div>

              {/* Judul Pembaruan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Judul Utama Pembaruan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="misal: UPDATE SISTEM SURAT DIGITAL & MODUL DUSUN REALTIME"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Status Publikasi Switch */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Status Publikasi Online</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Jika diaktifkan, pop-up notifikasi pembaruan ini akan tampil otomatis di seluruh akun desa.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: formData.is_active === 1 ? 0 : 1 })}
                  className={`w-12 h-6 rounded-full transition-colors p-1 relative cursor-pointer ${formData.is_active === 1 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${formData.is_active === 1 ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Detail Content (Write / Preview Tabs) */}
              {/* Detail Content (Word-Style Rich Editor + Tabs) */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Isi Catatan Pembaruan <span className="text-rose-500">*</span>
                  </label>
                  
                  <div className="flex items-center gap-2">
                    {/* Quick Template Presets */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline">Template:</span>
                      <button
                        type="button"
                        onClick={() => applyPresetTemplate('standard')}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-[11px] font-bold transition-all border border-indigo-200 dark:border-indigo-800 cursor-pointer flex items-center gap-1"
                        title="Gunakan Template Rilis Standar"
                      >
                        <Wand2 size={12} /> Standar
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetTemplate('bugfix')}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg text-[11px] font-bold transition-all border border-rose-200 dark:border-rose-800 cursor-pointer flex items-center gap-1"
                        title="Gunakan Template Perbaikan Bug"
                      >
                        <ShieldCheck size={12} /> Bug Fix
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetTemplate('major')}
                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-lg text-[11px] font-bold transition-all border border-purple-200 dark:border-purple-800 cursor-pointer flex items-center gap-1"
                        title="Gunakan Template Fitur Utama"
                      >
                        <Rocket size={12} /> Fitur Utama
                      </button>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveTabForm('write')}
                        className={`px-3 py-1 rounded-md font-semibold transition-all ${activeTabForm === 'write' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-500'}`}
                      >
                        Edit Teks
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTabForm('preview')}
                        className={`px-3 py-1 rounded-md font-semibold transition-all ${activeTabForm === 'preview' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-500'}`}
                      >
                        Hasil Tampilan
                      </button>
                    </div>
                  </div>
                </div>

                {activeTabForm === 'write' ? (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-800">
                    {/* Word-Style Toolbar Header */}
                    <div className="bg-slate-100 dark:bg-slate-800/90 p-2 border-b border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center gap-1 text-slate-700 dark:text-slate-300">
                      {/* Bold */}
                      <button
                        type="button"
                        onClick={() => insertFormatting('**', '**', 'teks tebal')}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-bold flex items-center gap-1"
                        title="Tebal (Bold)"
                      >
                        <Bold size={15} />
                      </button>

                      {/* Italic */}
                      <button
                        type="button"
                        onClick={() => insertFormatting('*', '*', 'teks miring')}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-bold"
                        title="Miring (Italic)"
                      >
                        <Italic size={15} />
                      </button>

                      {/* Strikethrough */}
                      <button
                        type="button"
                        onClick={() => insertFormatting('~~', '~~', 'teks dicoret')}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-bold"
                        title="Coret Teks (Strikethrough)"
                      >
                        <Strikethrough size={15} />
                      </button>

                      <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-600 mx-1" />

                      {/* Heading 2 */}
                      <button
                        type="button"
                        onClick={() => insertFormatting('## ', '', 'Judul Utama')}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-bold flex items-center gap-0.5"
                        title="Judul Utama (H2)"
                      >
                        <Heading2 size={15} />
                      </button>

                      {/* Heading 3 */}
                      <button
                        type="button"
                        onClick={() => insertFormatting('### ', '', 'Sub Judul')}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-bold flex items-center gap-0.5"
                        title="Sub Judul (H3)"
                      >
                        <Heading3 size={15} />
                      </button>

                      <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-600 mx-1" />

                      {/* Bullet List */}
                      <button
                        type="button"
                        onClick={() => insertFormatting('- ', '', 'Poin pembaruan')}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-bold flex items-center gap-1"
                        title="Daftar Poin (Bullet List)"
                      >
                        <List size={15} />
                      </button>

                      {/* Numbered List */}
                      <button
                        type="button"
                        onClick={() => insertFormatting('1. ', '', 'Poin kesatu')}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-bold flex items-center gap-1"
                        title="Daftar Nomor (Numbered List)"
                      >
                        <ListOrdered size={15} />
                      </button>

                      <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-600 mx-1" />

                      {/* Quote */}
                      <button
                        type="button"
                        onClick={() => insertFormatting('> 💡 ', '', 'Catatan penting untuk pengguna...')}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-bold"
                        title="Sorotan / Kutipan Penting"
                      >
                        <Quote size={15} />
                      </button>

                      {/* Inline Code */}
                      <button
                        type="button"
                        onClick={() => insertFormatting('`', '`', 'nama_fitur')}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-bold"
                        title="Format Kode Singkat"
                      >
                        <Code size={15} />
                      </button>

                      {/* Horizontal Rule Divider */}
                      <button
                        type="button"
                        onClick={() => insertFormatting('\n---\n', '', '')}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-bold"
                        title="Garis Pembatas"
                      >
                        <Minus size={15} />
                      </button>
                    </div>

                    {/* Textarea Editor */}
                    <textarea
                      ref={textareaRef}
                      rows={9}
                      required
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Gunakan tombol di atas untuk menebalkan, membuat penomoran, daftar poin, atau klik template cepat..."
                      className="w-full p-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs leading-relaxed focus:outline-none resize-y min-h-[180px]"
                    />
                  </div>
                ) : (
                  <div className="min-h-[220px] max-h-[320px] overflow-y-auto p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-xs prose dark:prose-invert max-w-none shadow-inner">
                    {formData.content ? (
                      <Markdown>{formData.content}</Markdown>
                    ) : (
                      <span className="italic text-slate-400">Belum ada catatan yang ditulis...</span>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan Online...</span>
                    </>
                  ) : (
                    <>
                      <Globe size={16} />
                      <span>{editingItem ? 'Simpan Perubahan' : 'Rilis Online ke Seluruh Desa'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW POP-UP MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative animate-in zoom-in-95 duration-200">
            {/* Top Header Badge */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-6 text-white relative">
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white rounded-full bg-black/20 hover:bg-black/40 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-0.5 bg-white/20 backdrop-blur-sm text-white font-mono font-black text-xs rounded-full">
                  {previewItem.version}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-400 text-slate-950 font-bold text-[10px] uppercase rounded-full tracking-wider">
                  PREVIEW POP-UP DESA
                </span>
              </div>

              <h3 className="text-xl font-extrabold leading-snug">
                {previewItem.title}
              </h3>
              <p className="text-xs text-indigo-100 mt-1">Tanggal Rilis: {previewItem.release_date}</p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 text-xs">
                <Markdown>{previewItem.content}</Markdown>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Pratinjau tampilan warga / admin desa</span>
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all cursor-pointer"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL KONFIRMASI HAPUS MODERN */}
      <ConfirmModal
        isOpen={!!deleteConfirmItem}
        title="Hapus Catatan Pembaruan"
        message={
          <span>
            Apakah Anda yakin ingin menghapus catatan rilis versi <strong className="text-slate-900 dark:text-white font-bold">{deleteConfirmItem?.version}</strong> ({deleteConfirmItem?.title})? Tindakan ini akan menghapus data secara permanen dari Supabase Cloud.
          </span>
        }
        confirmText="Ya, Hapus Pembaruan"
        cancelText="Batal"
        type="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmItem(null)}
      />
    </div>
  );
};

export default AdminSaaSGlobalUpdates;
