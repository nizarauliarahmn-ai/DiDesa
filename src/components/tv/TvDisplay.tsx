import { useState, useEffect } from 'react';
import { Users, FileText, Megaphone } from 'lucide-react';
import { TvConfig, DEFAULT_TV_CONFIG, loadTvConfigLocal, loadTvConfigCloud, loadTvAutoStats, youtubeId } from '../../utils/tvConfig';

/**
 * DiDesa TV — layar ruang tunggu (Digital Signage), 10-foot UI.
 * Mandiri & fullscreen: tanpa Sidebar/Navbar/Footer. Rasio 16:9, no-scroll.
 * Konten diatur admin di menu Layar TV (tersimpan cloud, refresh tiap 60 dtk).
 */
const STAT_ICONS = [Users, FileText, Megaphone];

// Slideshow bawaan bila admin belum mengisi media (tanpa jaringan).
const PLACEHOLDERS = [
  { title: 'Selamat Datang', sub: 'Kantor Desa melayani dengan sepenuh hati', bg: 'from-emerald-700 to-teal-900' },
  { title: 'Pelayanan Administrasi', sub: 'Surat keterangan, domisili, usaha, dan lainnya', bg: 'from-slate-800 to-slate-950' },
  { title: 'Transparansi Dana Desa', sub: 'Setiap rupiah tercatat dan terlaporkan', bg: 'from-teal-800 to-emerald-950' },
];

export default function TvDisplay() {
  const [now, setNow] = useState(() => new Date());
  const [cfg, setCfg] = useState<TvConfig>(DEFAULT_TV_CONFIG);
  const [slideIdx, setSlideIdx] = useState(0);
  const [phIdx, setPhIdx] = useState(0);
  const [autoStats, setAutoStats] = useState<{ label: string; value: string }[] | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Muat config: lokal dulu (cepat), lalu cloud; poll tiap 60 dtk.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const cloud = await loadTvConfigCloud();
      if (alive && cloud) setCfg(cloud);
      const auto = await loadTvAutoStats();
      if (alive) setAutoStats(auto);
    };
    setCfg(loadTvConfigLocal());
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const slides = cfg.slides;
  const active = slides.length > 0 ? slides[slideIdx % slides.length] : null;
  const activeYoutubeId = active?.type === 'youtube' ? youtubeId(active.url) : null;

  // Gambar & YouTube berpindah tiap `durasi` detik; video pindah saat selesai.
  useEffect(() => {
    if (!active || active.type === 'video') return;
    const t = setTimeout(() => {
      setSlideIdx(i => (slides.length > 0 ? (i + 1) % slides.length : 0));
    }, Math.max(3, active.durasi) * 1000);
    return () => clearTimeout(t);
  }, [slideIdx, slides, active]);
  const nextSlide = () => {
    setSlideIdx(i => (slides.length > 0 ? (i + 1) % slides.length : 0));
  };

  // Placeholder berputar bila belum ada media.
  useEffect(() => {
    if (slides.length > 0) return;
    const t = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 8000);
    return () => clearInterval(t);
  }, [slides.length]);

  const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');
  const tanggal = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const stats = cfg.showStats ? (autoStats || cfg.stats) : [];
  const ph = PLACEHOLDERS[phIdx % PLACEHOLDERS.length];

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col select-none">
      {/* Zona atas: media 70% + info 30% */}
      <div className="flex-1 flex min-h-0">
        {/* Kiri: Main Media */}
        <div className="flex-[7] bg-slate-900 flex items-center justify-center overflow-hidden">
          {!active ? (
            <div key={phIdx} className={`w-full h-full bg-gradient-to-br ${ph.bg} flex flex-col items-center justify-center text-center px-12`}>
              <p className="text-white text-6xl font-black tracking-tight">{ph.title}</p>
              <p className="text-slate-200 text-2xl font-semibold mt-4">{ph.sub}</p>
            </div>
          ) : active.type === 'video' ? (
            <video
              key={active.id}
              src={active.url}
              autoPlay
              muted
              playsInline
              onEnded={nextSlide}
              onError={nextSlide}
              className="w-full h-full object-cover"
            />
          ) : active.type === 'youtube' && activeYoutubeId ? (
            <iframe
              key={active.id}
              src={`https://www.youtube-nocookie.com/embed/${activeYoutubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${activeYoutubeId}&rel=0`}
              title="Video Desa"
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="w-full h-full"
            />
          ) : (
            <img
              key={active?.id}
              src={active?.url}
              alt=""
              onError={nextSlide}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Kanan: Widget Info */}
        <div className="flex-[3] bg-white shadow-xl p-8 flex flex-col justify-center gap-6 min-w-0">
          <div>
            <p className="text-slate-500 text-xl font-bold uppercase tracking-widest">Jam Digital</p>
            <p className="text-slate-900 text-6xl font-black tabular-nums tracking-tight">{jam}</p>
            <p className="text-slate-700 text-2xl font-bold mt-2">{tanggal}</p>
          </div>
          {stats.length > 0 && (
            <div className="space-y-3">
              <p className="text-slate-500 text-xl font-bold uppercase tracking-widest">Statistik Desa</p>
              {stats.map((s, i) => {
                const Icon = STAT_ICONS[i % STAT_ICONS.length];
                return (
                  <div key={i} className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
                    <Icon className="w-8 h-8 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-slate-900 text-3xl font-black leading-none truncate">{s.value || '-'}</p>
                      <p className="text-slate-500 text-xl font-semibold mt-1 truncate">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Zona bawah: running text */}
      <div className="h-20 shrink-0 bg-green-700 text-white flex items-center overflow-hidden">
        <div className="w-max whitespace-nowrap animate-[tv-ticker_25s_linear_infinite]">
          <span className="text-2xl font-bold px-8">{cfg.tickerText || 'Area Running Text Pengumuman Desa'}</span>
        </div>
      </div>
    </div>
  );
}
