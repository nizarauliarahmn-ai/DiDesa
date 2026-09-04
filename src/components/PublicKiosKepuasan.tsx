import { useState } from 'react';
import { ArrowLeft, Star, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { supabase } from '../utils/supabase';

const LAYANAN_OPTIONS = [
  'Pelayanan Administrasi Desa',
  'Pelayanan Surat & Keterangan',
  'Pelayanan Bantuan Sosial',
  'Pelayanan Umum Balai Desa',
  'Fasilitas Publik Desa',
];

export default function PublicKiosKepuasan() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [layanan, setLayanan] = useState(LAYANAN_OPTIONS[0]);
  const [ulasan, setUlasan] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleBack = () => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get('tenant') || p.get('t_id');
    window.location.search = t ? `?tab=kios&t_id=${t}` : '?tab=kios';
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const tid = await resolveCurrentTenant();
      if (!tid) return;

      // Ambil data kepuasan existing
      const { data } = await supabase.from('saas_settings').select('value').eq('tenant_id', tid).eq('key', 'kepuasan_data').maybeSingle();
      const all = data?.value ? JSON.parse(data.value) : [];

      const newEntry = {
        id: `kp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        rating,
        layanan,
        ulasan: ulasan.trim() || null,
        timestamp: new Date().toISOString(),
      };

      all.push(newEntry);

      // Simpan ke Supabase
      if (data?.value) {
        await supabase.from('saas_settings').update({ value: JSON.stringify(all) }).eq('tenant_id', tid).eq('key', 'kepuasan_data');
      } else {
        await supabase.from('saas_settings').insert({ tenant_id: tid, key: 'kepuasan_data', value: JSON.stringify(all) });
      }

      // Notifikasi ke admin
      const avgScore = all.reduce((sum: number, k: any) => sum + k.rating, 0) / all.length;
      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`, tenant_id: tid, title: 'Indeks Kepuasan Baru',
        message: `Warga memberikan penilaian ${rating} bintang untuk ${layanan}${ulasan.trim() ? ': "' + ulasan.trim().slice(0, 80) + '"' : ''}`,
        category: 'Services', is_read: false, timestamp: new Date().toISOString(),
      }]);

      window.dispatchEvent(new Event('didesa_kepuasan_updated'));
      setSubmitted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-[2rem] p-12 max-w-lg text-center border border-slate-700/50 shadow-2xl">
          <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/30">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Terima Kasih!</h2>
          <p className="text-slate-400 text-lg mb-8">Penilaian Anda sangat berarti untuk perbaikan pelayanan desa.</p>
          <button onClick={handleBack}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all active:scale-95">
            Kembali ke Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col p-6">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <button onClick={handleBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors font-semibold">
            <ArrowLeft size={20} /> Kembali
          </button>

          <div className="bg-slate-800/60 backdrop-blur-xl rounded-[2rem] p-8 border border-slate-700/50 shadow-2xl">
            <h1 className="text-3xl font-bold text-white mb-2">Indeks Kepuasan</h1>
            <p className="text-slate-400 mb-8">Beri penilaian Anda terhadap pelayanan desa hari ini.</p>

            {/* Rating Bintang */}
            <div className="flex justify-center gap-3 mb-8">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                  className="transition-all active:scale-90">
                  <Star size={48} className={`transition-colors ${(hoverRating || rating) >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Layanan */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Layanan yang Dinilai</label>
                  <select value={layanan} onChange={e => setLayanan(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white text-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                    {LAYANAN_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* Ulasan */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Ulasan (Opsional)</label>
                  <textarea value={ulasan} onChange={e => setUlasan(e.target.value)} placeholder="Ceritakan pengalaman Anda..."
                    rows={3} className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                </div>

                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95">
                  {submitting ? <Loader2 size={20} className="animate-spin" /> : <><Send size={18} /> Kirim Penilaian</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
