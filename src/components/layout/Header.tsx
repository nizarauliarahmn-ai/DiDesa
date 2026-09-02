import React from 'react';
import { Globe, Bell, Menu, LayoutDashboard, Building2, PieChart, Newspaper, Map, ShieldCheck, MessageSquareText, LogOut, Moon, Sun, Shield } from 'lucide-react';
import { getFormattedDate } from '../../utils/dateHelper';

export default function Header({ 
  toggleMobileMenu,
  activeTab,
  setActiveTab,
  user,
  onAdminLogin,
  onLogout
}: { 
  toggleMobileMenu?: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  user?: { role: string } | null;
  onAdminLogin?: () => void;
  onLogout?: () => void;
}) {
  const [desaName, setDesaName] = React.useState(() => localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
  const [globalColor, setGlobalColor] = React.useState(() => localStorage.getItem('global_app_color') || '#047857');
  const [globalLogo, setGlobalLogo] = React.useState(() => localStorage.getItem('global_app_logo') || '');
  const [appTheme, setAppTheme] = React.useState(() => localStorage.getItem('app_theme') || 'light');

  React.useEffect(() => {
    const syncTheme = () => setAppTheme(localStorage.getItem('app_theme') || 'light');
    window.addEventListener('app_theme_updated', syncTheme);
    
    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
    };
    const handleBrandingUpdate = () => {
      setGlobalColor(localStorage.getItem('global_app_color') || '#047857');
      setGlobalLogo(localStorage.getItem('global_app_logo') || '');
    };
    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    window.addEventListener('global_branding_updated', handleBrandingUpdate);
    return () => {
      window.removeEventListener('village_settings_updated', handleSettingsUpdate);
      window.removeEventListener('global_branding_updated', handleBrandingUpdate);
      window.removeEventListener('app_theme_updated', syncTheme);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = appTheme === 'light' ? 'dark' : 'light';
    setAppTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
    window.dispatchEvent(new Event('app_theme_updated'));
  };

  const navItems = [
    { id: 'dashboard', label: 'Beranda', icon: <LayoutDashboard size={15} /> },
    { id: 'layanan_mandiri', label: 'Layanan', icon: <ShieldCheck size={15} /> },
    { id: 'profil_desa', label: 'Profil Desa', icon: <Building2 size={15} /> },
    { id: 'transparansi', label: 'Transparansi', icon: <PieChart size={15} /> },
    { id: 'berita', label: 'Berita', icon: <Newspaper size={15} /> },
    { id: 'aspirasi', label: 'Aspirasi', icon: <MessageSquareText size={15} /> },
  ];

  const handleNavClick = (id: string) => {
    if (setActiveTab) setActiveTab(id);
    const target = document.getElementById(`section-${id}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="h-16 md:h-18 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 z-40 sticky top-0 shadow-sm transition-all">
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={toggleMobileMenu} className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <Menu size={22} />
        </button>
        <a href="#section-dashboard" onClick={() => handleNavClick('dashboard')} className="flex items-center gap-3 group">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-900/10 group-hover:scale-105 transition-transform"
            style={{ backgroundColor: globalColor }}
          >
            {globalLogo ? (
              <img src={globalLogo} alt="Logo" className="w-5.5 h-5.5 object-contain" />
            ) : (
              <Globe size={18} />
            )}
          </div>
          <div className="leading-tight">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">{desaName}</h2>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              PORTAL WARGA RESMI
            </p>
          </div>
        </a>
      </div>
      
      {/* Desktop Horizontal Navigation Bar */}
      {setActiveTab && (
        <nav className="hidden xl:flex items-center gap-1 bg-slate-100/70 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
      
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden 2xl:block font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
          {getFormattedDate()}
        </span>

        {/* Admin Login Button integrated cleanly into Top Right Header */}
        {onAdminLogin && (
          <button 
            onClick={onAdminLogin}
            className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Masuk ke Dashboard Mode Admin Desa"
          >
            <Shield size={14} className="text-emerald-300" />
            <span className="hidden sm:inline">Mode Admin</span>
          </button>
        )}

        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleTheme}
          title={appTheme === 'light' ? "Aktifkan Mode Gelap" : "Aktifkan Mode Terang"}
          className="p-2 text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
        >
          {appTheme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button className="relative p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>

        {user && onLogout && (
          <button 
            onClick={onLogout}
            title="Keluar Sesi"
            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
