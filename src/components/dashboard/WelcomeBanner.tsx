import React from 'react';
import { Sparkles, FileText, Eye, Smartphone, CheckCircle2, ArrowRight, ShieldCheck, MessageSquare, Compass } from 'lucide-react';

export default function WelcomeBanner({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const [desaName, setDesaName] = React.useState(() => localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
  const [globalName, setGlobalName] = React.useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [welcomeBannerUrl, setWelcomeBannerUrl] = React.useState(() => localStorage.getItem('village_welcome_banner_url') || '');

  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
      setWelcomeBannerUrl(localStorage.getItem('village_welcome_banner_url') || '');
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

  return (
    <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-emerald-950/40 p-8 md:p-12 shadow-xl shadow-slate-200/50 dark:shadow-none border border-emerald-100/80 dark:border-slate-800 transition-all">
      
      {/* Background Ambient Glowing Elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-400/15 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-400/15 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Hero Content */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300/60 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold tracking-wide shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Portal Resmi Layanan Digital {desaName}</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
            Sistem Pelayanan & <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
              Digitalisasi Desa Modern
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg font-medium leading-relaxed max-w-xl">
            Akses persuratan mandiri, transparansi APBD, peta wilayah digital, dan pengaduan warga 24/7 untuk masyarakat <strong>{cleanDesaName}</strong> yang lebih mandiri dan sejahtera.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button 
              onClick={() => onTabChange && onTabChange('layanan_mandiri')}
              className="bg-[#0f172a] hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-2xl px-7 py-4 font-black text-sm transition-all shadow-lg shadow-slate-900/15 dark:shadow-none active:scale-95 flex items-center gap-2.5 cursor-pointer group"
            >
              <Smartphone className="w-4 h-4 text-emerald-400 dark:text-white group-hover:scale-110 transition-transform" />
              <span>Layanan Mandiri & Kios</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={() => onTabChange && onTabChange('ai_assistant')}
              className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-800 dark:text-white rounded-2xl px-6 py-4 font-bold text-sm transition-all shadow-sm active:scale-95 flex items-center gap-2.5 cursor-pointer group"
            >
              <Sparkles className="w-4 h-4 text-indigo-500 group-hover:animate-spin" />
              <span>Tanya Asisten AI</span>
              <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">DEV</span>
            </button>

            <button 
              onClick={() => onTabChange && onTabChange('aspirasi')}
              className="bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-emerald-800 dark:text-emerald-300 rounded-2xl px-5 py-4 font-bold text-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer border border-emerald-200/60 dark:border-slate-700"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Aspirasi</span>
            </button>
          </div>

          {/* Social Proof / Security Footer Badge */}
          <div className="pt-4 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex -space-x-2 overflow-hidden">
              <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">DS</div>
              <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 bg-teal-600 text-white font-bold flex items-center justify-center text-[10px]">SD</div>
              <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">AI</div>
            </div>
            <span>Terkoneksi Cloud Server Resmi <strong>{globalName} SaaS B2G</strong></span>
          </div>

        </div>

        {/* Right Column: Simulated Modern Browser Card (Matching sistemdidesa.id hero preview) */}
        <div className="lg:col-span-5 relative">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xl relative overflow-hidden group hover:border-emerald-400/40 transition-all">
            
            {/* Window Top Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-700">
                {cleanDesaName.toLowerCase().replace(/\s+/g, '')}.sistemdidesa.id
              </span>
            </div>

            {/* App Header Inside Preview */}
            <div className="flex items-center gap-3 mb-5 p-3 bg-emerald-50/70 dark:bg-slate-800/70 rounded-2xl border border-emerald-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
                D
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{desaName}</h4>
                <p className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">PORTAL RESMI WARGA</p>
              </div>
            </div>

            {/* Micro Feature Cards inside Mockup */}
            <div className="space-y-3">
              
              <button 
                onClick={() => onTabChange && onTabChange('layanan_mandiri')}
                className="w-full text-left p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/50 border border-emerald-100 dark:border-slate-700/80 hover:bg-emerald-100/60 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group/card cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800 dark:text-white">Persuratan & TTE Digital</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Pengajuan & cetak surat mandiri</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 group-hover/card:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => onTabChange && onTabChange('transparansi')}
                className="w-full text-left p-3.5 rounded-2xl bg-sky-50/50 dark:bg-slate-800/50 border border-sky-100 dark:border-slate-700/80 hover:bg-sky-100/60 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group/card cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-sm">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800 dark:text-white">Transparansi Anggaran</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Publikasi transparansi APBD Desa</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-sky-600 group-hover/card:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => onTabChange && onTabChange('peta')}
                className="w-full text-left p-3.5 rounded-2xl bg-amber-50/50 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700/80 hover:bg-amber-100/60 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group/card cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800 dark:text-white">Peta Wilayah Interaktif</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Batas wilayah & fasum desa</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600 group-hover/card:translate-x-1 transition-transform" />
              </button>

            </div>

            {/* Bottom Status Pill */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi Cloud Supabase
              </span>
              <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">v4.0 Ready</span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
