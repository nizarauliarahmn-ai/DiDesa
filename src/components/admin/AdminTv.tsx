import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, MonitorPlay, Save, ExternalLink } from 'lucide-react';
import { showToast } from '../../utils/toast';
import {
  TvConfig, DEFAULT_TV_CONFIG, loadTvConfigLocal, loadTvConfigCloud,
  saveTvConfig, detectSlideType, newSlideId,
} from '../../utils/tvConfig';

const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-gray-400 bg-white dark:bg-slate-900 text-gray-900 dark:text-white';

export default function AdminTv() {
  const [cfg, setCfg] = useState<TvConfig>(DEFAULT_TV_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newDurasi, setNewDurasi] = useState(8);

  useEffect(() => {
    (async () => {
      setCfg(loadTvConfigLocal());
      const cloud = await loadTvConfigCloud();
      if (cloud) setCfg(cloud);
      setLoading(false);
    })();
  }, []);

  const addSlide = () => {
    const url = newUrl.trim();
    if (!url) {
      showToast('Isi URL gambar/video dulu.', 'error');
      return;
    }
    setCfg(c => ({
      ...c,
      slides: [...c.slides, { id: newSlideId(), url, type: detectSlideType(url), durasi: Math.min(120, Math.max(3, newDurasi || 8)) }],
    }));
    setNewUrl('');
  };

  const moveSlide = (i: number, dir: -1 | 1) => {
    setCfg(c => {
      const j = i + dir;
      if (j < 0 || j >= c.slides.length) return c;
      const slides = [...c.slides];
      [slides[i], slides[j]] = [slides[j], slides[i]];
      return { ...c, slides };
    });
  };

  const removeSlide = (id: string) => {
    setCfg(c => ({ ...c, slides: c.slides.filter(s => s.id !== id) }));
  };

  const save = async () => {
    setSaving(true);
    const res = await saveTvConfig(cfg);
    setSaving(false);
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  if (loading) {
    return <p className="text-sm text-gray-400 py-8 text-center">Memuat konfigurasi TV...</p>;
  }

  return (
    <div className="pb-24 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Layar TV</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Atur slideshow, running text & statistik untuk layar ruang tunggu</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="?tab=tv"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ExternalLink size={14} /> Pratinjau
          </a>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save size={14} /> {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {/* Slideshow */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-1">
          <MonitorPlay size={16} className="text-gray-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Slideshow Media</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Tempel URL gambar (JPG/PNG) atau video (MP4/WebM). Video diputar bersuara-senyap otomatis.</p>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addSlide(); }}
            placeholder="https://.../foto-kegiatan.jpg"
            className={`${inputCls} flex-1`}
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={3}
              max={120}
              value={newDurasi}
              onChange={e => setNewDurasi(Number(e.target.value))}
              title="Durasi tampil gambar (detik)"
              className={`${inputCls} w-24`}
            />
            <button
              onClick={addSlide}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            >
              <Plus size={14} /> Tambah
            </button>
          </div>
        </div>
        {cfg.slides.length === 0 ? (
          <p className="text-xs text-gray-400 border border-dashed border-gray-200 dark:border-slate-700 rounded-lg p-4 text-center">
            Belum ada media — layar TV menampilkan placeholder. Tambahkan minimal 1 gambar.
          </p>
        ) : (
          <div className="space-y-2">
            {cfg.slides.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 border border-gray-200 dark:border-slate-700 rounded-lg p-2">
                {s.type === 'image' ? (
                  <img src={s.url} alt="" className="w-14 h-10 object-cover rounded-md bg-gray-100 shrink-0" onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                ) : (
                  <span className="w-14 h-10 rounded-md bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">VIDEO</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">{s.url}</p>
                  <p className="text-[11px] text-gray-400">
                    {i + 1}. {s.type === 'image' ? `Gambar • ${s.durasi} dtk` : 'Video • s/d selesai'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => moveSlide(i, -1)} disabled={i === 0} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer" title="Naik">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => moveSlide(i, 1)} disabled={i === cfg.slides.length - 1} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer" title="Turun">
                    <ChevronDown size={14} />
                  </button>
                  <button onClick={() => removeSlide(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer" title="Hapus">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Running text */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Running Text Pengumuman</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Berjalan di pita bawah layar TV.</p>
        <textarea
          value={cfg.tickerText}
          onChange={e => setCfg({ ...cfg, tickerText: e.target.value })}
          rows={3}
          placeholder="Tulis pengumuman untuk warga..."
          className={`${inputCls} resize-y`}
        />
      </div>

      {/* Statistik */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Statistik Desa</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Kartu kecil di panel kanan layar TV.</p>
          </div>
          <button
            onClick={() => setCfg({ ...cfg, showStats: !cfg.showStats })}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${cfg.showStats ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-slate-700'}`}
            title={cfg.showStats ? 'Sembunyikan' : 'Tampilkan'}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 shadow transition-all ${cfg.showStats ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>
        {cfg.showStats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {cfg.stats.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={s.label}
                  onChange={e => {
                    const stats = [...cfg.stats];
                    stats[i] = { ...stats[i], label: e.target.value };
                    setCfg({ ...cfg, stats });
                  }}
                  placeholder="Label"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={s.value}
                  onChange={e => {
                    const stats = [...cfg.stats];
                    stats[i] = { ...stats[i], value: e.target.value };
                    setCfg({ ...cfg, stats });
                  }}
                  placeholder="Nilai"
                  className={`${inputCls} w-24`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
