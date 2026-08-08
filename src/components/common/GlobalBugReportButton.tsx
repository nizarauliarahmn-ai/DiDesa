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
          className="group relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:to-pink-500 text-white rounded-full font-bold text-xs shadow-xl shadow-rose-600/30 hover:shadow-rose-600/50 transition-all duration-300 active:scale-95 cursor-pointer border border-rose-400/30"
          title="Laporkan Bug atau Kendala Sistem ke SaaS Admin"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
          <Bug size={18} className="animate-bounce shrink-0" />
          <span className="font-extrabold tracking-wide hidden sm:inline">Laporkan Bug / Kendala</span>
          <span className="sm:hidden font-extrabold">Bantuan</span>
        </button>
      </div>

      {/* MODAL FORM LAPORAN BUG / KENDALA */}
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white flex items-center justify-between relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-400/20 flex items-center justify-center font-bold">
                  <LifeBuoy size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight">Pusat Bantuan & Laporan Kendala</h3>
                  <p className="text-xs text-rose-200/80">
                    Kirim laporan langsung ke Tim SaaS Platform ({villageName})
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
                  <Monitor size={15} className="text-rose-500 shrink-0" />
                  <span>Pelapor: <strong className="text-slate-900 dark:text-white font-bold">{authUser.name || 'Admin'}</strong> ({villageName})</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] rounded-full border border-emerald-200 dark:border-emerald-800">
                  Cloud Live
                </span>
              </div>

              {/* Tipe Laporan Options */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Tipe Laporan <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'bug' })}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      formData.type === 'bug'
                        ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Bug size={18} />
                    <span>🐞 Error / Bug</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'feature_request' })}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      formData.type === 'feature_request'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles size={18} />
                    <span>💡 Usulan Fitur</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'question' })}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      formData.type === 'question'
                        ? 'bg-teal-600 text-white border-teal-700 shadow-md shadow-teal-600/20'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <HelpCircle size={18} />
                    <span>❓ Pertanyaan</span>
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
                  className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
