import { useState } from 'react';
import { ArrowLeft, ThumbsUp, Star, Send, CheckCircle, Loader2 } from 'lucide-react';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { supabase } from '../utils/supabase';

const aspects = [
  { id: 'kecepatan', label: 'Kecepatan Pelayanan' },
  { id: 'keramahan', label: 'Keramahan Petugas' },
  { id: 'kemudahan', label: 'Kemudahan Prosedur' },
  { id: 'kepuasan', label: 'Kepuasan Secara Keseluruhan' },
];

export default function PublicKiosKepuasan() {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [ulasan, setUlasan] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const allRated = aspects.every(a => ratings[a.id]);

  const handleBack = () => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get('tenant') || p.get('t_id');
    window.location.search = t ? `?tab=kios&t_id=${t}` : '?tab=kios';
  };

  const handleSubmit = async () => {
    if (!allRated) return;
    setSubmitting(true);
    try {
      const tid = await resolveCurrentTenant();
      if (!tid) return;

      const avgScore = Object.values(ratings).reduce((a, b) => a + b, 0) / aspects.length;

      // Ambil data existing dari Supabase
      const { data } = await supabase.from('saas_settings').select('value').eq('tenant_id', tid).eq('key', 'kepuasan_data').maybeSingle();
      const all = data?.value ? JSON.parse(data.value) : [];

      const newEntry = {
        id: `KPT-${Date.now()}`,
        tenant_id: tid,
        ratings,
        rata_rata: Math.round(avgScore * 10) / 10,
        ulasan: ulasan.trim() || null,
        timestamp: new Date().toISOString(),
      };

      all.push(newEntry);

      if (data?.value) {
        await supabase.from('saas_settings').update({ value: JSON.stringify(all) }).eq('tenant_id', tid).eq('key', 'kepuasan_data');
      } else {
        await supabase.from('saas_settings').insert({ tenant_id: tid, key: 'kepuasan_data', value: JSON.stringify(all) });
      }

      // Notifikasi ke admin
      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`, tenant_id: tid, title: 'Indeks Kepuasan Baru',
        message: `Warga memberikan penilaian rata-rata ${Math.round(avgScore * 10) / 10} bintang${ulasan.trim() ? ': "' + ulasan.trim().slice(0, 80) + '"' : ''}`,
        category: 'Services', is_read: false, timestamp: new Date().toISOString(),
      }]);

      window.dispatchEvent(new Event('didesa_kepuasan_updated'));
      setSubmitted(true);
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  const renderStars = (aspectId: string) => {
    const current = ratings[aspectId] || 0;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} onClick={() => setRatings(p => ({ ...p, [aspectId]: star }))}
            className="transition-transform hover:scale-110 active:scale-95">
            <Star className={`w-7 h-7 transition-colors ${star <= current ? 'fill-amber-400 text-amber-400' : 'fill-slate-600 text-slate-600'}`} />
          </button>
        ))}
      </div>
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-[2rem] p-12 max-w-lg text-center border border-slate-700/50 shadow-2xl">
          <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-500/30">
            <CheckCircle className="w-12 h-12 text-amber-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Terima Kasih!</h2>
          <p className="text-slate-400 text-lg mb-8">Penilaian Anda telah tercatat. Masukan Anda membantu kami meningkatkan kualitas pelayanan.</p>
          <button onClick={handleBack}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-lg transition-all active:scale-95">
            Kembali ke Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <button onClick={handleBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors font-semibold">
            <ArrowLeft size={20} /> Kembali
          </button>

          <div className="bg-slate-800/60 backdrop-blur-xl rounded-[2rem] border border-slate-700/50 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 border-b border-slate-700/50 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <ThumbsUp className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Indeks Kepuasan</h2>
                <p className="text-xs text-slate-400">Beri penilaian terhadap pelayanan desa</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-5">
              <p className="text-sm text-slate-400">
                Beri penilaian 1-5 bintang untuk setiap aspek pelayanan di bawah ini:
              </p>

              {aspects.map((aspect, i) => (
                <div key={aspect.id}
                  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-slate-700/30"
                  style={{ animationDelay: `${i * 80}ms` }}>
                  <span className="text-sm font-bold text-slate-200">{aspect.label}</span>
                  {renderStars(aspect.id)}
                </div>
              ))}

              {/* Ulasan */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">
                  Ulasan Tambahan (Opsional)
                </label>
                <textarea value={ulasan} onChange={e => setUlasan(e.target.value)} rows={3}
                  placeholder="Ceritakan pengalaman Anda..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-700/30 border border-slate-600/30 text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none resize-none text-sm" />
              </div>

              <button onClick={handleSubmit} disabled={submitting || !allRated}
                className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-base transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim...</>
                ) : (
                  <><Send className="w-5 h-5" /> Kirim Penilaian</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
