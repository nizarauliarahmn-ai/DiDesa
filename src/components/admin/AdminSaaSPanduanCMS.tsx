import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Edit3, Trash2, Search, RefreshCw, Eye, CheckCircle2, X,
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Code, Minus,
  BookOpenCheck, ArrowUp, ArrowDown, EyeOff, FileText, LayoutList
} from 'lucide-react';
import Markdown from 'react-markdown';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { addSaaSLog } from '../../utils/saasLogs';
import ConfirmModal from '../common/ConfirmModal';
import {
  GuideContentItem, DEFAULT_CATEGORIES, GUIDE_ICON_OPTIONS, getGuideIcon, getCategoryLabel
} from '../../utils/guideContent';

const ICON_PREVIEW = getGuideIcon;

export const AdminSaaSPanduanCMS: React.FC = () => {
  const [items, setItems] = useState<GuideContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GuideContentItem | null>(null);
  const [activeTabForm, setActiveTabForm] = useState<'write' | 'preview'>('write');

  const [formData, setFormData] = useState({
    title: '',
    category: 'kiosk',
    category_label: '',
    icon: 'FileText',
    sort_order: 0,
    is_active: 1,
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('guide_content')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setItems((data || []).sort((a, b) => a.sort_order - b.sort_order));
      setIsRealtimeConnected(true);
    } catch (err: any) {
      console.error('Error fetching guide content:', err);
      showToast('Gagal memuat konten panduan dari Supabase Cloud: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel('public_guide_content_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guide_content' }, () => {
        fetchItems();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsRealtimeConnected(true);
      });

    const onUpdate = () => fetchItems();
    window.addEventListener('guide_content_updated', onUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('guide_content_updated', onUpdate);
    };
  }, []);

  const categoriesUsed = Array.from(new Set(items.map(i => i.category)));

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      category: 'kiosk',
      category_label: getCategoryLabel('kiosk'),
      icon: 'FileText',
      sort_order: items.length,
      is_active: 1,
      content: '### Bagian Baru\n\nTuliskan isi panduan di sini...'
    });
    setActiveTabForm('write');
    setIsModalOpen(true);
  };

  const openEditModal = (item: GuideContentItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category,
      category_label: item.category_label,
      icon: item.icon || 'FileText',
      sort_order: item.sort_order ?? 0,
      is_active: item.is_active ?? 1,
      content: item.content
    });
    setActiveTabForm('write');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast('Harap isi Judul dan Isi Konten!', 'error');
      return;
    }
    const label = formData.category_label.trim() || getCategoryLabel(formData.category);
    if (formData.category === 'custom' || !DEFAULT_CATEGORIES.some(c => c.key === formData.category)) {
      if (!label) {
        showToast('Untuk kategori baru, isi Label Kategori terlebih dahulu!', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: editingItem ? editingItem.id : `guide-${Date.now()}`,
        title: formData.title.trim(),
        category: formData.category,
        category_label: label,
        icon: formData.icon || 'FileText',
        sort_order: Number(formData.sort_order) || 0,
        is_active: Number(formData.is_active),
        content: formData.content
      };

      const { error } = await supabase.from('guide_content').upsert([payload]);
      if (error) throw error;

      window.dispatchEvent(new Event('guide_content_updated'));
      showToast(editingItem ? 'Konten panduan berhasil diperbarui!' : 'Konten panduan berhasil ditambahkan!', 'success');

      const authUser = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
      await addSaaSLog({
        admin: authUser.name || 'SaaS Admin',
        aksi: editingItem ? 'Update Konten Panduan' : 'Tambah Konten Panduan',
        target: `${payload.title}`,
        status: 'Berhasil',
        category: 'SaaS Admin'
      });

      setIsModalOpen(false);
      fetchItems();
    } catch (err: any) {
      console.error('Error saving guide content:', err);
      showToast('Gagal menyimpan ke Supabase Cloud: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: GuideContentItem) => {
    const nextStatus = item.is_active === 1 ? 0 : 1;
    try {
      const { error } = await supabase
        .from('guide_content')
        .update({ is_active: nextStatus })
        .eq('id', item.id);
      if (error) throw error;

      window.dispatchEvent(new Event('guide_content_updated'));
      showToast(
        nextStatus === 1
          ? `'${item.title}' diaktifkan & tampil di halaman Panduan.`
          : `'${item.title}' disimpan sebagai draft (sembunyi).`,
        'success'
      );
      fetchItems();
    } catch (err: any) {
      showToast('Gagal mengubah status: ' + err.message, 'error');
    }
  };

  const [deleteConfirmItem, setDeleteConfirmItem] = useState<GuideContentItem | null>(null);

  const executeDelete = async () => {
    if (!deleteConfirmItem) return;
    const item = deleteConfirmItem;
    setDeleteConfirmItem(null);
    try {
      const { error } = await supabase.from('guide_content').delete().eq('id', item.id);
      if (error) throw error;

      window.dispatchEvent(new Event('guide_content_updated'));
      showToast(`'${item.title}' berhasil dihapus.`, 'success');

      const authUser = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
      await addSaaSLog({
        admin: authUser.name || 'SaaS Admin',
        aksi: 'Hapus Konten Panduan',
        target: item.title,
        status: 'Berhasil',
        category: 'SaaS Admin'
      });
      fetchItems();
    } catch (err: any) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  };

  const moveItem = async (index: number, dir: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const target = index + dir;
    if (target < 0 || target >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[target];
    const nextItems = [...sorted];
    nextItems[index] = b;
    nextItems[target] = a;
    const ops = [
      supabase.from('guide_content').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('guide_content').update({ sort_order: a.sort_order }).eq('id', b.id),
    ];
    const results = await Promise.all(ops);
    if (results.some(r => r.error)) {
      showToast('Gagal mengubah urutan: ' + (results.find(r => r.error)?.error?.message || ''), 'error');
      return;
    }
    window.dispatchEvent(new Event('guide_content_updated'));
    fetchItems();
  };

  const filtered = items.filter(i =>
    !searchQuery.trim() ||
    i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.category_label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-teal-700/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-teal-500/30">
              <BookOpenCheck size={14} className="text-teal-300" />
              CMS Konten Panduan & Tutorial
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
              Kelola Konten Panduan
            </h1>
            <p className="text-teal-100 text-sm md:text-base max-w-2xl leading-relaxed">
              Buat, ubah, urutkan, dan aktifkan konten Panduan & Tutorial secara fleksibel. Semua desa otomatis melihat konten terbaru tanpa perlu update aplikasi.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <Plus size={16} /> Tambah Konten Baru
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold border border-white/15">
            <FileText size={13} className="text-emerald-300" /> {items.length} Konten
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold border border-white/15">
            <LayoutList size={13} className="text-teal-300" /> {categoriesUsed.length} Kategori
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold border border-white/15">
            <CheckCircle2 size={13} className="text-emerald-300" /> {items.filter(i => i.is_active === 1).length} Aktif
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            isRealtimeConnected ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : 'bg-amber-500/20 text-amber-200 border-amber-400/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
            {isRealtimeConnected ? 'Realtime Terhubung' : 'Menghubungkan...'}
          </span>
        </div>

        <div className="mt-6 relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-300" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, isi, atau kategori konten panduan..."
            className="w-full pl-11 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-teal-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
          />
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-12 text-center animate-pulse">
          Memuat konten panduan...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-12 text-center">
          <BookOpenCheck className="w-12 h-12 text-teal-400 mx-auto mb-3" />
          <p className="font-bold text-gray-900 dark:text-white mb-1">Belum ada konten</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
            Klik "Tambah Konten Baru" untuk membuat panduan pertama. Jika belum ada konten, halaman Panduan menampilkan konten bawaan sistem.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all"
          >
            <Plus size={15} /> Tambah Konten
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item, idx) => {
            const Icon = ICON_PREVIEW(item.icon);
            const catLabel = item.category_label || getCategoryLabel(item.category);
            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-sm p-5 transition-all ${
                  item.is_active === 1
                    ? 'border-gray-100 dark:border-slate-800'
                    : 'border-dashed border-amber-300 dark:border-amber-800/50 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      item.is_active === 1
                        ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full">
                          {catLabel}
                        </span>
                        {item.is_active !== 1 && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <EyeOff size={10} /> Draft
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-gray-400">Urutan: {item.sort_order}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">{item.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Naikkan urutan"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === filtered.length - 1}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Turunkan urutan"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={`p-2 rounded-lg transition-all ${
                        item.is_active === 1
                          ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                      }`}
                      title={item.is_active === 1 ? 'Jadikan draft' : 'Aktifkan'}
                    >
                      {item.is_active === 1 ? <EyeOff size={16} /> : <CheckCircle2 size={16} />}
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-blue-600"
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmItem(item)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 pl-15 ml-15 text-xs text-gray-600 dark:text-slate-400 line-clamp-2 prose prose-sm prose-teal dark:prose-invert max-w-none">
                  <Markdown>{item.content}</Markdown>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingItem ? 'Edit Konten Panduan' : 'Tambah Konten Panduan'}
              </h3>
              <button
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Judul Konten *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Contoh: Cara Membuat Surat Keterangan Usaha"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Kategori *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      category: e.target.value,
                      category_label: e.target.value === 'custom' ? '' : getCategoryLabel(e.target.value)
                    }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {DEFAULT_CATEGORIES.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                    {categoriesUsed.filter(c => !DEFAULT_CATEGORIES.some(d => d.key === c)).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="custom">+ Kategori Baru...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Label Kategori</label>
                  <input
                    type="text"
                    value={formData.category_label}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_label: e.target.value }))}
                    placeholder={formData.category === 'custom' ? 'Wajib: nama tab, misal "Pelatihan Kades"' : 'Otomatis / bisa diubah'}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Ikon</label>
                  <div className="flex flex-wrap gap-1.5">
                    {GUIDE_ICON_OPTIONS.map(opt => (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, icon: opt.name }))}
                        title={opt.name}
                        className={`p-2 rounded-lg border transition-all ${
                          formData.icon === opt.name
                            ? 'bg-teal-50 border-teal-400 text-teal-600'
                            : 'border-gray-200 dark:border-slate-700 text-gray-400 hover:border-teal-300'
                        }`}
                      >
                        <opt.Icon size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Urutan</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                    <input
                      type="checkbox"
                      checked={formData.is_active === 1}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked ? 1 : 0 }))}
                      className="w-4 h-4 rounded accent-teal-600"
                    />
                    <span className="text-sm font-bold text-gray-700 dark:text-slate-300">Aktif / Tampil</span>
                  </label>
                </div>
              </div>

              {/* Markdown Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">Isi Konten (Markdown) *</label>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setActiveTabForm('write')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeTabForm === 'write' ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}>Tulis</button>
                    <button type="button" onClick={() => setActiveTabForm('preview')} className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${activeTabForm === 'preview' ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}><Eye size={12} /> Pratinjau</button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  <button type="button" onClick={() => insertFormatting('**', '**', 'teks tebal')} className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300"><Bold size={14} /></button>
                  <button type="button" onClick={() => insertFormatting('_', '_', 'teks miring')} className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300"><Italic size={14} /></button>
                  <button type="button" onClick={() => insertFormatting('### ', '', 'Judul Bagian')} className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300"><Heading2 size={14} /></button>
                  <button type="button" onClick={() => insertFormatting('#### ', '', 'Sub Judul')} className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300"><Heading3 size={14} /></button>
                  <button type="button" onClick={() => insertFormatting('- ', '', 'Poin')} className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300"><List size={14} /></button>
                  <button type="button" onClick={() => insertFormatting('1. ', '', 'Langkah')} className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300"><ListOrdered size={14} /></button>
                  <button type="button" onClick={() => insertFormatting('> ', '', 'Catatan penting')} className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300"><Quote size={14} /></button>
                  <button type="button" onClick={() => insertFormatting('`', '`', 'kode')} className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300"><Code size={14} /></button>
                  <button type="button" onClick={() => insertFormatting('\n---\n', '', '')} className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300"><Minus size={14} /></button>
                </div>

                {activeTabForm === 'write' ? (
                  <textarea
                    ref={textareaRef}
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={12}
                    placeholder="Tulis konten panduan dalam format Markdown..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <div className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-h-[200px] prose prose-teal dark:prose-invert max-w-none text-sm">
                    <Markdown>{formData.content || '*Belum ada isi konten.*'}</Markdown>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-100 dark:border-slate-800 text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-lg transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : (editingItem ? 'Perbarui Konten' : 'Simpan Konten')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirmItem}
        title="Hapus Konten Panduan?"
        message={`Konten "${deleteConfirmItem?.title}" akan dihapus permanen dari semua desa. Lanjutkan?`}
        confirmText="Ya, Hapus"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmItem(null)}
      />
    </div>
  );
};

export default AdminSaaSPanduanCMS;