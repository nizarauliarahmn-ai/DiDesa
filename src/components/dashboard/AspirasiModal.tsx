import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Send, CheckCircle, Loader2 } from 'lucide-react';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

interface Props {
  onClose: () => void;
}

const categories = ['Infrastruktur', 'Pelayanan Publik', 'Keamanan', 'Sosial & Bantuan'];

export default function AspirasiModal({ onClose }: Props) {
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState(categories[0]);
  const [pesan, setPesan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pesan.trim()) {
      showToast('Harap isi pesan aspirasi', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) {
        showToast('Gagal mengirim aspirasi', 'error');
        return;
      }

      const { error } = await supabase.from('aspirasi').insert([{
        tenant_id: tenantId,
        kategori,
        pesan: pesan.trim(),
        nama_pengirim: nama.trim() || 'Anonim',
        status: 'Baru',
      }]);

      if (error) throw error;

      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`,
        tenant_id: tenantId,
        title: `Aspirasi Warga: ${kategori}`,
        message: `${nama.trim() || 'Anonim'} mengirim aspirasi: "${pesan.trim().slice(0, 100)}..."`,
        category: 'Services',
        is_read: false,
        timestamp: new Date().toISOString(),
      }]);

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengirim aspirasi. Coba lagi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Laporan & Aspirasi</h3>
                <p className="text-[11px] text-slate-400">Sampaikan pengaduan, saran, atau kritik</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="p-6">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-10 space-y-4"
              >
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Aspirasi Terkirim!</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Laporan Anda berhasil dikirim ke pemerintah desa. Terima kasih atas partisipasi Anda.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 transition-colors"
                >
                  Tutup
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nama */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Nama (Opsional — Kosongkan jika Anonim)
                  </label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama Anda"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Kategori */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Kategori
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setKategori(cat)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                          kategori === cat
                            ? 'bg-blue-700 text-white border-blue-700'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pesan */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Pesan / Laporan
                  </label>
                  <textarea
                    value={pesan}
                    onChange={(e) => setPesan(e.target.value)}
                    required
                    rows={4}
                    placeholder="Uraikan aspirasi, pengaduan, atau saran Anda secara lengkap..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-700 text-white font-bold rounded-xl text-sm hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Kirim Aspirasi</>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
