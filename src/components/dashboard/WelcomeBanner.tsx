import React from 'react';
import { Sparkles } from 'lucide-react';

export default function WelcomeBanner({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const [desaName, setDesaName] = React.useState(() => localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');
  const [globalName, setGlobalName] = React.useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [welcomeBannerUrl, setWelcomeBannerUrl] = React.useState(() => localStorage.getItem('village_welcome_banner_url') || 'https://images.unsplash.com/photo-1590123514210-90c74993a404?auto=format&fit=crop&q=80&w=2000');
  const [welcomeBannerYOffset, setWelcomeBannerYOffset] = React.useState(() => localStorage.getItem('village_welcome_banner_y_offset') || '50');
  const [welcomeBannerZoom, setWelcomeBannerZoom] = React.useState(() => localStorage.getItem('village_welcome_banner_zoom') || '100');

  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');
      setWelcomeBannerUrl(localStorage.getItem('village_welcome_banner_url') || 'https://images.unsplash.com/photo-1590123514210-90c74993a404?auto=format&fit=crop&q=80&w=2000');
      setWelcomeBannerYOffset(localStorage.getItem('village_welcome_banner_y_offset') || '50');
      setWelcomeBannerZoom(localStorage.getItem('village_welcome_banner_zoom') || '100');
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

  return (
    <section className="relative rounded-3xl overflow-hidden bg-emerald-950/80 dark:bg-slate-950/85 backdrop-blur-md p-8 md:p-10 lg:p-12 shadow-sm dark:shadow-none border border-emerald-900/10 dark:border-slate-800/40 min-h-[320px] flex items-center">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-no-repeat transition-all duration-300" 
        style={{ 
          backgroundImage: `url("${welcomeBannerUrl}")`,
          backgroundPosition: `center ${welcomeBannerYOffset}%`,
          opacity: 0.85,
          transform: `scale(${parseFloat(welcomeBannerZoom || '100') / 100})`,
          transformOrigin: 'center center',
          maskImage: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)',
          WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)',
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/80 to-transparent dark:from-slate-950/95 dark:via-slate-900/80 dark:to-transparent z-0"></div>
      
      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-100 text-[10px] font-bold tracking-wider uppercase mb-4 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
          <span>{globalName} AI Intelligence</span>
          <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full">DEV</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">Selamat Datang di {desaName}</h2>
        <p className="text-emerald-50 text-base md:text-lg mb-8 leading-relaxed font-medium opacity-90">
          Transparansi, partisipasi, dan kemajuan untuk masyarakat {desaName.replace(/desa|kelurahan/gi, '').trim()} yang lebih sejahtera dan mandiri melalui digitalisasi desa.
        </p>
        
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => onTabChange && onTabChange('ai_assistant')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm dark:shadow-none active:scale-95 cursor-pointer border border-indigo-500 flex items-center gap-2 group"
          >
            <Sparkles className="w-4 h-4 text-indigo-200 group-hover:animate-pulse" />
            <span>Tanya Asisten AI</span>
            <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded">DEV</span>
          </button>
          <button 
            onClick={() => onTabChange && onTabChange('layanan_mandiri')}
            className="bg-white dark:bg-slate-900 text-emerald-800 px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-all shadow-sm dark:shadow-none active:scale-95 cursor-pointer"
          >
            Layanan Mandiri
          </button>
          <button 
             onClick={() => onTabChange && onTabChange('aspirasi')}
            className="bg-emerald-700/50 border border-emerald-400/30 text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-700/70 backdrop-blur-sm transition-all active:scale-95 cursor-pointer"
          >
            Aspirasi Warga
          </button>
        </div>
      </div>
    </section>
  );
}
