import React, { useState } from 'react';
import { Smartphone, ArrowRight, Search } from 'lucide-react';

export default function WelcomeBanner({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const [desaName, setDesaName] = React.useState(() => localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
    };
    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('village_settings_updated', handleSettingsUpdate);
  }, []);

  const cleanDesaName = desaName.replace(/desa|kelurahan/gi, '').trim();

  const handleNav = (tabId: string) => {
    if (onTabChange) onTabChange(tabId);
    const target = document.getElementById(`section-${tabId}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase();
    if (query.includes('surat') || query.includes('layanan') || query.includes('sktm') || query.includes('sku')) {
      handleNav('layanan_mandiri');
    } else if (query.includes('apbd') || query.includes('dana') || query.includes('anggaran')) {
      handleNav('transparansi');
    } else if (query.includes('berita') || query.includes('pengumuman')) {
      handleNav('berita');
    } else if (query.includes('peta') || query.includes('wilayah')) {
      handleNav('peta_wilayah');
    } else {
      handleNav('aspirasi');
    }
  };

  return (
    <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 sm:p-8 shadow-xl border border-slate-800 text-white">
      <div className="relative z-10 max-w-2xl space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Portal Resmi {desaName}
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
          Pusat Pelayanan &{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            Digitalisasi Desa Modern
          </span>
        </h1>

        <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-lg">
          Persuratan mandiri 24/7, transparansi APBD, peta GIS, dan aspirasi publik untuk masyarakat <strong>{cleanDesaName}</strong>.
        </p>

        <form onSubmit={handleSearchSubmit} className="relative max-w-lg">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari layanan, berita, atau informasi..."
            className="w-full pl-10 pr-20 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg transition-all cursor-pointer"
          >
            Cari
          </button>
        </form>

        <button
          onClick={() => handleNav('layanan_mandiri')}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl px-5 py-3 font-black text-sm transition-all shadow-lg shadow-emerald-500/25 active:scale-95 flex items-center gap-2 cursor-pointer group"
        >
          <Smartphone className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Mulai Layanan Mandiri
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </section>
  );
}
