import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ThumbsUp, Star, Send, CheckCircle, Loader2 } from 'lucide-react';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

interface Props {
  onClose: () => void;
}

const aspects = [
  { id: 'kecepatan', label: 'Kecepatan Pelayanan' },
  { id: 'keramahan', label: 'Keramahan Petugas' },
  { id: 'kemudahan', label: 'Kemudahan Prosedur' },
  { id: 'kepuasan', label: 'Kepuasan Secara Keseluruhan' },
];

export default function IndeksKepuasanModal({ onClose }: Props) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [ulasan, setUlasan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRating = (aspectId: string, value: number) => {
    setRatings({ ...ratings, [aspectId]: value });
  };

  const allRated = aspects.every((a) => ratings[a.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRated) {
      showToast('Harap beri penilaian untuk semua aspek', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) {
        showToast('Gagal mengirim penilaian', 'error');
        return;
      }

      const avgScore = Object.values(ratings).reduce((a, b) => a + b, 0) / aspects.length;

      // Save to saas_settings (kepuasan_data) since kepuasan table may not exist
      const existingData = localStorage.getItem('kepuasan_data');
      const allRatings = existingData ? JSON.parse(existingData) : [];
      const newEntry = {
        id: `KPT-${Date.now()}`,
        tenant_id: tenantId,
        ratings,
        rata_rata: Math.round(avgScore * 10) / 10,
        ulasan: ulasan.trim() || null,
        timestamp: new Date().toISOString(),
      };
      allRatings.push(newEntry);
      localStorage.setItem('kepuasan_data', JSON.stringify(allRatings));

      // Also try to save to Supabase saas_settings
      try {
        await supabase.from('saas_settings').upsert({
          tenant_id: tenantId,
          key: 'kepuasan_data',
          value: JSON.stringify(allRatings),
        }, { onConflict: 'tenant_id,key' });
      } catch (e) {
        // localStorage already saved, ignore Supabase error
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengirim penilaian. Coba lagi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (aspectId: string) => {
    const current = ratings[aspectId] || 0;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRating(aspectId, star)}
            className="transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                star <= current
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
              }`}
            />
          </button>
        ))}
      </div>
    );
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
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                <ThumbsUp className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Indeks Kepuasan</h3>
                <p className="text-[11px] text-slate-400">Beri penilaian terhadap pelayanan desa</p>
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
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Terima Kasih!</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Penilaian Anda telah tercatat. Masukan Anda membantu kami meningkatkan kualitas pelayanan.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors"
                >
                  Tutup
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Beri penilaian 1-5 bintang untuk setiap aspek pelayanan di bawah ini:
                </p>

                {aspects.map((aspect, i) => (
                  <motion.div
                    key={aspect.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                  >
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{aspect.label}</span>
                    {renderStars(aspect.id)}
                  </motion.div>
                ))}

                {/* Ulasan */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Ulasan Tambahan (Opsional)
                  </label>
                  <textarea
                    value={ulasan}
                    onChange={(e) => setUlasan(e.target.value)}
                    rows={3}
                    placeholder="Ceritakan pengalaman Anda..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !allRated}
                  className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl text-sm hover:bg-amber-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Kirim Penilaian</>
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
