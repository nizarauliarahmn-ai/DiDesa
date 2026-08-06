import React, { useState } from 'react';
import { Sparkles, FileText, Eye, Smartphone, ArrowRight, MessageSquare, Compass, Search, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function WelcomeBanner({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const [desaName, setDesaName] = React.useState(() => localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
  const [globalName, setGlobalName] = React.useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
    };
    const handleBrandingUpdate = () => {
      setGlobalName(localStorage.getItem('global_app_name') || 'DiDesa');
    };

    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    window.addEventListener('global_branding_updated', handleBrandingUpdate);

    return () => {
      window.removeEventListener('village_settings_updated', handleSettingsUpdate);
      window.removeEventListener('global_branding_updated', handleBrandingUpdate);
    };
  }, []);

  const cleanDesaName = desaName.replace(/desa|kelurahan/gi, '').trim();

  const handleNav = (tabId: string) => {
    if (onTabChange) onTabChange(tabId);
    const target = document.getElementById(`section-${tabId}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase();
    if (query.includes('surat') || query.includes('layanan') || query.includes('sktm') || query.includes('sku')) {
      handleNav('layanan_mandiri');
    } else if (query.includes('apbd') || query.includes('dana') || query.includes('anggaran') || query.includes('keuangan')) {
      handleNav('transparansi');
    } else if (query.includes('berita') || query.includes('pengumuman') || query.includes('proyek')) {
      handleNav('berita');
    } else if (query.includes('peta') || query.includes('wilayah') || query.includes('rt') || query.includes('rw')) {
      handleNav('peta_wilayah');
    } else {
      handleNav('aspirasi');
    }
  };

  return (
    <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-8 sm:p-10 md:p-12 shadow-2xl border border-slate-800 transition-all text-white">
      
      {/* Background Ambient Glowing Blur Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Hero Content */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Live Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-extrabold tracking-wide shadow-sm backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Portal Resmi Layanan Digital {desaName}</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] text-white">
            Pusat Pelayanan & <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
              Digitalisasi Desa Modern
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-300 text-sm sm:text-base font-medium leading-relaxed max-w-xl">
            Akses pengajuan persuratan mandiri 24/7, transparansi APBD Desa, peta wilayah GIS, dan kotak aspirasi publik untuk masyarakat <strong>{cleanDesaName}</strong>.
          </p>

          {/* Integrated Interactive Quick Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 absolute left-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari persuratan, transparansi APBD, berita, atau pengaduan..."
                className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-white/10 dark:bg-slate-800/80 border border-white/15 text-white placeholder-slate-400 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all backdrop-blur-md"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Cari
              </button>
            </div>
          </form>

          {/* High-Impact Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button 
              onClick={() => handleNav('layanan_mandiri')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl px-6 py-3.5 font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/25 active:scale-95 flex items-center gap-2 cursor-pointer group"
            >
              <Smartphone className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Layanan Mandiri & Kios</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={() => handleNav('ai_assistant')}
              className="bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-2xl px-5 py-3.5 font-bold text-xs sm:text-sm transition-all backdrop-blur-md active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Tanya Asisten AI</span>
              <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">DEV</span>
            </button>

            <button 
              onClick={() => handleNav('aspirasi')}
              className="bg-white/5 hover:bg-white/10 text-emerald-300 rounded-2xl px-4 py-3.5 font-bold text-xs sm:text-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer border border-emerald-500/20"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Pengaduan 24 Jam</span>
            </button>
          </div>

          {/* Social Proof Footer Badge */}
          <div className="pt-4 flex items-center gap-3 text-xs text-slate-400 font-medium border-t border-white/10">
            <div className="flex -space-x-2 overflow-hidden">
              <div className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-emerald-600 text-white font-bold flex items-center justify-center text-[9px]">DS</div>
              <div className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-teal-600 text-white font-bold flex items-center justify-center text-[9px]">SD</div>
              <div className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-indigo-600 text-white font-bold flex items-center justify-center text-[9px]">AI</div>
            </div>
            <span>Terkoneksi Cloud Server Resmi <strong>{globalName} SaaS B2G</strong></span>
          </div>

        </div>

        {/* Right Column: Modern Interactive Micro-Services Card Grid */}
        <div className="lg:col-span-5 relative">
          <div className="bg-slate-900/90 rounded-3xl border border-slate-700/80 p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-4">
            
            {/* Window Top Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
                {cleanDesaName.toLowerCase().replace(/\s+/g, '')}.sistemdidesa.id
              </span>
            </div>

            {/* App Header Inside Preview */}
            <div className="flex items-center gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-md">
                D
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white leading-tight">{desaName}</h4>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">PORTAL RESMI WARGA</p>
              </div>
            </div>

            {/* Micro Service Cards */}
            <div className="space-y-2.5">
              
              <button 
                onClick={() => handleNav('layanan_mandiri')}
                className="w-full text-left p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-900/40 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500 text-slate-950 rounded-xl shadow-sm">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white">Persuratan & TTE Digital</p>
                    <p className="text-[10px] text-slate-400">Pengajuan & cetak surat mandiri online</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => handleNav('transparansi')}
                className="w-full text-left p-3 rounded-2xl bg-sky-950/40 border border-sky-800/50 hover:bg-sky-900/40 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-500 text-slate-950 rounded-xl shadow-sm">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white">Transparansi Anggaran APBD</p>
                    <p className="text-[10px] text-slate-400">Publikasi transparansi keuangan desa</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-sky-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => handleNav('peta_wilayah')}
                className="w-full text-left p-3 rounded-2xl bg-amber-950/40 border border-amber-800/50 hover:bg-amber-900/40 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-400 text-slate-950 rounded-xl shadow-sm">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white">Peta GIS & Batas Wilayah</p>
                    <p className="text-[10px] text-slate-400">Peta interaktif fasum & batas RT/RW</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
              </button>

            </div>

            {/* Bottom Status Indicator */}
            <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi Cloud Supabase
              </span>
              <span className="font-mono text-[9px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">v4.0 Live</span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
