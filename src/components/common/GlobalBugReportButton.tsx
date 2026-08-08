import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, Bug, X, Send, AlertTriangle, CheckCircle2, 
  HelpCircle, Sparkles, MessageSquare, Info, ShieldAlert, Monitor
} from 'lucide-react';
import { submitBugReportOnline, BugReport } from '../../utils/bugReportService';
import { showToast } from '../../utils/toast';

export const GlobalBugReportButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth User & Context
  const authUser = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
  const storedTenant = localStorage.getItem('didesa_current_tenant');
  let villageName = 'Desa';
  if (storedTenant) {
    try {
      villageName = JSON.parse(storedTenant).nama_desa || villageName;
    } catch (e) {}
  }

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'bug' as 'bug' | 'feature_request' | 'question',
    module: 'Surat & Administrasi',
    urgency: 'Sedang' as 'Rendah' | 'Sedang' | 'Tinggi' | 'Mendesak'
  });

  const handleOpen = () => {
    setFormData({
      title: '',
      description: '',
      type: 'bug',
      module: 'Surat & Administrasi',
      urgency: 'Sedang'
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      showToast('Harap isi Judul Kendala dan Deskripsi Detail!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitBugReportOnline({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        module: formData.module,
        urgency: formData.urgency,
        reporter_name: authUser.name || 'Admin Desa',
        reporter_role: authUser.role === 'kades' ? 'Kepala Desa' : 'Admin Desa',
        reporter_email: authUser.email || '',
        page_url: window.location.href
      });

      if (result) {
        showToast('🚀 Laporan kendala berhasil terkirim online ke Tim SaaS! Kami akan segera menindaklanjuti.', 'success');
        setIsOpen(false);
      } else {
        throw new Error('Gagal mengirim ke server cloud.');
      }
    } catch (err: any) {
      console.error('Error submitting bug report:', err);
      showToast('Gagal mengirim laporan: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) - Positioned Fixed at Bottom Right */}
      <div className="fixed bottom-6 right-6 z-[90] flex items-center gap-2">
        <button
          onClick={handleOpen}
          className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-full font-bold shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 active:scale-95 cursor-pointer border border-emerald-400/30"
          title="Hubungi Pusat Bantuan / Laporkan Kendala"
        >
          <div className="w-3 h-3 rounded-full bg-rose-400 animate-ping absolute top-0 right-0" />
          <MessageSquare size={24} className="shrink-0" />
        </button>
      </div>

      {/* MODAL FORM LAPORAN BUG / KENDALA */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[110] flex items-end justify-end p-0">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-[380px] sm:w-[420px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[75vh] overflow-hidden origin-bottom-right animate-in zoom-in-95 duration-200 shadow-emerald-900/20">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 text-white flex items-center justify-between relative overflow-hidden">
              <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center font-bold shadow-inner">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">Hubungi Tim SaaS</h3>
                  <p className="text-[10px] text-emerald-100">
                    Bantuan teknis untuk {villageName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="relative z-10 p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Context Info Banner */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Monitor size={14} className="text-emerald-600 shrink-0" />
                  <span>Pelapor: <strong className="text-slate-900 dark:text-white font-bold">{authUser.name || 'Admin'}</strong></span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[9px] rounded-full flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                </span>
              </div>

              {/* Tipe Laporan Options */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Topik <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'bug' })}
                    className={`p-2.5 rounded-2xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      formData.type === 'bug'
                        ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Bug size={16} />
                    <span>Error / Bug</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'feature_request' })}
                    className={`p-2.5 rounded-2xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      formData.type === 'feature_request'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles size={16} />
                    <span>Usulan Fitur</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'question' })}
                    className={`p-2.5 rounded-2xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      formData.type === 'question'
                        ? 'bg-teal-600 text-white border-teal-700 shadow-md shadow-teal-600/20'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <HelpCircle size={16} />
                    <span>Pertanyaan</span>
                  </button>
                </div>
              </div>

              {/* Modul Terkait & Tingkat Urgensi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Modul Terkait <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.module}
                    onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="Surat & Administrasi">📄 Surat & Administrasi</option>
                    <option value="Data Penduduk">👥 Data Penduduk</option>
                    <option value="Bantuan Sosial">🎁 Bantuan Sosial</option>
                    <option value="Berita & Pengumuman">📰 Berita & Pengumuman</option>
                    <option value="Pengaturan Desa">⚙️ Pengaturan Desa</option>
                    <option value="Lainnya">🧩 Lainnya / Umum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tingkat Urgensi <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="Rendah">🔵 Rendah (Tidak mendesak)</option>
                    <option value="Sedang">🟡 Sedang (Normal)</option>
                    <option value="Tinggi">🟠 Tinggi (Mengganggu pekerjaan)</option>
                    <option value="Mendesak">🔴 Mendesak (Sistem berhenti/tidak bisa dipakai)</option>
                  </select>
                </div>
              </div>

              {/* Judul Kendala */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Judul Kendala / Laporan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="misal: Tombol cetak Surat Keterangan tidak merespons saat diklik"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Deskripsi Detail Kendala */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Deskripsi Detail Kendala <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Jelaskan langkah-langkah yang terjadi, pesan error yang muncul, atau detail kendala yang dialami..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mengirim Laporan...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Kirim Laporan Online</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalBugReportButton;
