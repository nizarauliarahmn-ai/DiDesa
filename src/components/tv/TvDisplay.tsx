import { useState, useEffect, useRef } from 'react';
import { Users, FileText, Megaphone } from 'lucide-react';
import { TvConfig, DEFAULT_TV_CONFIG, loadTvConfigLocal, loadTvConfigCloud, loadTvAutoStats, youtubeId, loadStatsCache, saveStatsCache } from '../../utils/tvConfig';

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

/** Muat YouTube IFrame API sekali per halaman. false bila gagal (offline/dsb). */
let ytApiPromise: Promise<boolean> | null = null;
function loadYtApi(): Promise<boolean> {
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve(true);
  if (!ytApiPromise) {
    ytApiPromise = new Promise<boolean>(resolve => {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => { try { prev?.(); } catch { /* abaikan */ } resolve(true); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
      // Jangan tunggu selamanya — 10 dtk lalu anggap gagal.
      setTimeout(() => resolve(!!w.YT?.Player), 10000);
    });
  }
  return ytApiPromise;
}

export default function TvDisplay() {
  const [now, setNow] = useState(() => new Date());
  const [cfg, setCfg] = useState<TvConfig>(DEFAULT_TV_CONFIG);
  const [slideIdx, setSlideIdx] = useState(0);
  const [phIdx, setPhIdx] = useState(0);
  const [autoStats, setAutoStats] = useState<{ label: string; value: string }[] | null>(() => loadStatsCache());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Muat config: lokal dulu (cepat), lalu cloud; poll tiap 60 dtk.
  // Config & statistik diambil PARALEL — statistik tidak menunggu config.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [cloud, auto] = await Promise.all([loadTvConfigCloud(), loadTvAutoStats()]);
      if (!alive) return;
      if (cloud) setCfg(cloud);
      if (auto.some(s => s.value !== '-')) {
        setAutoStats(auto);
        saveStatsCache(auto);
      }
    };
    setCfg(loadTvConfigLocal());
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const slides = cfg.slides;
  const active = slides.length > 0 ? slides[slideIdx % slides.length] : null;
  const activeYoutubeId = active?.type === 'youtube' ? youtubeId(active.url) : null;
  const [ytFallback, setYtFallback] = useState(false);
  const ytBoxRef = useRef<HTMLDivElement>(null);

  const nextSlide = () => {
    setSlideIdx(i => (slides.length > 0 ? (i + 1) % slides.length : 0));
  };

  // Gambar: berpindah tiap `durasi` detik. Video MP4: pindah saat selesai.
  useEffect(() => {
    if (!active || active.type !== 'image') return;
    const t = setTimeout(() => {
      setSlideIdx(i => (slides.length > 0 ? (i + 1) % slides.length : 0));
    }, Math.max(3, active.durasi) * 1000);
    return () => clearTimeout(t);
    // Dep pada id/durasi (stabil) — poll config 60 dtk tak boleh me-reset timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, active?.durasi, slides.length]);

  // YouTube: berpindah saat video HABIS (event ENDED via IFrame API),
  // tidak dibatasi durasi. Bila API tak termuat → fallback iframe loop + durasi.
  useEffect(() => {
    if (!active || active.type !== 'youtube') return;
    const vid = activeYoutubeId;
    let cancelled = false;
    let advanced = false;
    let player: any = null;
    let timer: any = null;
    const advance = () => { if (!cancelled && !advanced) { advanced = true; nextSlide(); } };
    const durasiMs = Math.max(3, active.durasi) * 1000;

    if (vid && !ytFallback && ytBoxRef.current) {
      loadYtApi().then(ok => {
        if (cancelled) return;
        if (!ok || !ytBoxRef.current) { setYtFallback(true); return; }
        const inner = document.createElement('div');
        inner.style.width = '100%';
        inner.style.height = '100%';
        ytBoxRef.current.appendChild(inner);
        try {
          player = new (window as any).YT.Player(inner, {
            videoId: vid,
            host: 'https://www.youtube-nocookie.com',
            playerVars: { autoplay: 1, mute: 1, controls: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1 },
            events: {
              onReady: (e: any) => { try { e.target.mute(); e.target.playVideo(); } catch { /* abaikan */ } },
              onStateChange: (e: any) => {
                const ENDED = (window as any).YT?.PlayerState?.ENDED ?? 0;
                if (e.data === ENDED) advance();
              },
              // Video tak bisa diputar (diblokir/URL mati) — jangan macet slideshow.
              onError: () => { if (!timer) timer = setTimeout(advance, 3000); },
            },
          });
        } catch { setYtFallback(true); }
      });
    } else if (vid && ytFallback) {
      // Fallback: iframe loop biasa — maju setelah `durasi` detik.
      timer = setTimeout(advance, durasiMs);
    } else if (!vid) {
      // URL tak valid — <img> onError yang memajukan; durasi sebagai jaga-jaga.
      timer = setTimeout(advance, durasiMs);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      try { player?.destroy?.(); } catch { /* abaikan */ }
      try { if (ytBoxRef.current) ytBoxRef.current.innerHTML = ''; } catch { /* abaikan */ }
    };
    // Dep pada id (stabil) — poll config 60 dtk tak boleh me-restart player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, activeYoutubeId, ytFallback, slides.length]);

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
            ytFallback ? (
              <iframe
                key={active.id}
                src={`https://www.youtube-nocookie.com/embed/${activeYoutubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${activeYoutubeId}&rel=0`}
                title="Video Desa"
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="w-full h-full"
              />
            ) : (
              <div ref={ytBoxRef} className="w-full h-full" />
            )
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
