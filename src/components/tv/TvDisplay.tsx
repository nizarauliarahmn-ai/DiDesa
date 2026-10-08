import { useState, useEffect } from 'react';
import { Users, FileText, Megaphone } from 'lucide-react';

/**
 * DiDesa TV — layar ruang tunggu (Digital Signage), 10-foot UI.
 * Mandiri & fullscreen: tanpa Sidebar/Navbar/Footer. Rasio 16:9, no-scroll.
 */
export default function TvDisplay() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');
  const tanggal = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const stats = [
    { icon: Users, label: 'Total Penduduk', value: '-' },
    { icon: FileText, label: 'Surat Terbit', value: '-' },
    { icon: Megaphone, label: 'Pengumuman', value: '-' },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col select-none">
      {/* Zona atas: media 70% + info 30% */}
      <div className="flex-1 flex min-h-0">
        {/* Kiri: Main Media */}
        <div className="flex-[7] bg-slate-900 flex items-center justify-center p-8">
          <p className="text-slate-400 text-3xl font-bold text-center">
            Area Pemutar Video / Slideshow Desa
          </p>
        </div>

        {/* Kanan: Widget Info */}
        <div className="flex-[3] bg-white shadow-xl p-8 flex flex-col justify-center gap-6 min-w-0">
          <div>
            <p className="text-slate-500 text-xl font-bold uppercase tracking-widest">Jam Digital</p>
            <p className="text-slate-900 text-6xl font-black tabular-nums tracking-tight">{jam}</p>
            <p className="text-slate-700 text-2xl font-bold mt-2">{tanggal}</p>
          </div>
          <div className="space-y-3">
            <p className="text-slate-500 text-xl font-bold uppercase tracking-widest">Statistik Desa</p>
            {stats.map(s => (
              <div key={s.label} className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
                <s.icon className="w-8 h-8 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-slate-900 text-3xl font-black leading-none">{s.value}</p>
                  <p className="text-slate-500 text-xl font-semibold mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zona bawah: running text */}
      <div className="h-20 shrink-0 bg-green-700 text-white flex items-center overflow-hidden">
        <div className="flex w-max whitespace-nowrap animate-[tv-ticker_25s_linear_infinite]">
          <span className="text-2xl font-bold px-8">Area Running Text Pengumuman Desa</span>
          <span className="text-2xl font-bold px-8" aria-hidden="true">Area Running Text Pengumuman Desa</span>
        </div>
      </div>
    </div>
  );
}
