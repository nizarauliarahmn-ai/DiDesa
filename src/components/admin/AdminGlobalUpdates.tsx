import React, { useState, useEffect } from 'react';
import { Plus, Search, Megaphone, Trash2, Rocket, ShieldCheck, Zap, Info, Clock, AlertCircle } from 'lucide-react';

interface GlobalUpdate {
  id: string;
  title: string;
  content: string;
  version: string;
  release_date: string;
  type: string;
  is_active: number;
}

export default function AdminGlobalUpdates() {
  const [updates, setUpdates] = useState<GlobalUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    version: '',
    content: '',
    type: 'feature'
  });

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/global-updates');
      if (res.ok) {
        const data = await res.json();
        setUpdates(data);
      }
    } catch (err) {
      console.error("Error fetching global updates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/global-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ title: '', version: '', content: '', type: 'feature' });
        fetchUpdates();
      }
    } catch (err) {
      console.error("Error adding global update:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'feature': return <Rocket className="w-5 h-5 text-blue-500" />;
      case 'fix': return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'improvement': return <Zap className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-gray-500 dark:text-slate-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'feature': return 'Fitur Baru';
      case 'fix': return 'Perbaikan';
      case 'improvement': return 'Peningkatan';
      default: return 'Pembaruan';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-emerald-600" />
            Update Sistem Global
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Sampaikan pembaruan fitur ke seluruh klien desa secara otomatis.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm dark:shadow-none"
        >
          <Plus size={16} />
          Buat Pengumuman Baru
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Update List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-gray-100 dark:border-slate-800 text-center text-gray-500 dark:text-slate-400">
              Memuat pengumuman...
            </div>
          ) : updates.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 text-center space-y-3">
              <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <Megaphone className="w-8 h-8 text-gray-300" />
              </div>
              <div className="max-w-xs mx-auto">
                <p className="text-gray-900 dark:text-white font-bold">Belum Ada Pengumuman</p>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Klik tombol "Buat Pengumuman Baru" untuk mengirim update ke seluruh klien.</p>
              </div>
            </div>
          ) : updates.map((update) => (
            <div key={update.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none hover:shadow-md transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {getIcon(update.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        v{update.version}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {getTypeLabel(update.type)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-emerald-700 transition-colors">
                      {update.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {update.content}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400 font-medium">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(update.release_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertCircle size={12} />
                        Status: <span className="text-emerald-600">Terpublikasi</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-emerald-900 rounded-2xl p-6 text-white shadow-lg dark:shadow-none shadow-emerald-900/20">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-emerald-400" />
              Satu Update untuk Semua
            </h4>
            <p className="text-emerald-100 text-sm leading-relaxed mb-4">
              Setiap kali Anda memposting pengumuman di sini, seluruh klien (Desa) yang menggunakan platform DiDesa akan menerima notifikasi "Apa Yang Baru" saat mereka login.
            </p>
            <ul className="space-y-3 text-xs text-emerald-200">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                Otomatis tampil di seluruh tenant desa
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                Mendukung format Markdown untuk konten
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                Memastikan klien tahu fitur terbaru
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Buat Pengumuman Update</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Luncurkan info fitur baru ke seluruh ekosistem DiDesa</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-all"
              >
                <Trash2 size={20} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300">Judul Pembaruan</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all" 
                    placeholder="Contoh: Modul Surat Nikah Digital" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300">Versi Rilis</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.version} 
                    onChange={e => setFormData({...formData, version: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-mono" 
                    placeholder="Contoh: 1.2.0" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300">Tipe Pembaruan</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['feature', 'fix', 'improvement'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({...formData, type})}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                        formData.type === type 
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700' 
                          : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:border-emerald-200'
                      }`}
                    >
                      <div className="mb-2">{getIcon(type)}</div>
                      <span className="text-xs font-bold uppercase tracking-wider">{getTypeLabel(type)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300">Konten Pengumuman (Markdown)</label>
                <textarea 
                  required 
                  rows={6}
                  value={formData.content} 
                  onChange={e => setFormData({...formData, content: e.target.value})} 
                  className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-sans" 
                  placeholder="Gunakan Markdown untuk membuat list atau teks tebal..."
                ></textarea>
                <p className="text-[10px] text-gray-400 font-medium">Mendukung syntax: **Teks Tebal**, - List Item, dll.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Batalkan
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg dark:shadow-none shadow-emerald-900/20"
                >
                  {isSubmitting ? 'Memproses...' : 'Luncurkan Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
