import React from 'react';
import { Globe, Bell, Menu, LayoutDashboard, Building2, PieChart, Newspaper, Map, ShieldCheck, MessageSquareText, LogOut, Moon, Sun } from 'lucide-react';
import { getFormattedDate } from '../../utils/dateHelper';
import { showToast } from '../../utils/toast';

export default function Header({ 
  toggleMobileMenu,
  activeTab,
  setActiveTab,
  onLogout
}: { 
  toggleMobileMenu?: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onLogout?: () => void;
}) {
  const [desaName, setDesaName] = React.useState(() => localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');
  const [globalColor, setGlobalColor] = React.useState(() => localStorage.getItem('global_app_color') || '#047857');
  const [globalLogo, setGlobalLogo] = React.useState(() => localStorage.getItem('global_app_logo') || '');
  const [appTheme, setAppTheme] = React.useState(() => localStorage.getItem('app_theme') || 'light');

  React.useEffect(() => {
    const syncTheme = () => setAppTheme(localStorage.getItem('app_theme') || 'light');
    window.addEventListener('app_theme_updated', syncTheme);
    
    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');
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
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'profil_desa', label: 'Profil Desa', icon: <Building2 size={16} /> },
    { id: 'transparansi', label: 'Transparansi', icon: <PieChart size={16} /> },
    { id: 'berita', label: 'Berita', icon: <Newspaper size={16} /> },
    { id: 'peta_wilayah', label: 'Peta Wilayah', icon: <Map size={16} /> },
    { id: 'layanan_mandiri', label: 'Layanan', icon: <ShieldCheck size={16} /> },
    { id: 'aspirasi', label: 'Aspirasi', icon: <MessageSquareText size={16} /> },
  ];

  return (
    <header className="h-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-6 z-40 sticky top-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-4 shrink-0">
        <button onClick={toggleMobileMenu} className="lg:hidden p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center shadow-inner text-white"
            style={{ backgroundColor: globalColor }}
          >
            {globalLogo ? (
              <img src={globalLogo} alt="Logo" className="w-5.5 h-5.5 object-contain" />
            ) : (
              <Globe size={18} />
            )}
          </div>
          <div className="leading-tight">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">{desaName}</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Portal Warga</p>
          </div>
        </div>
      </div>
      
      {/* Desktop Horizontal Navigation */}
      {setActiveTab && activeTab && (
        <nav className="hidden lg:flex items-center gap-1 bg-gray-50 dark:bg-slate-800 p-1 rounded-xl border border-gray-150/50">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-white dark:bg-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-150/40 text-emerald-800' 
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 hover:bg-white/50 border border-transparent'
                }`}
                style={isActive ? { color: globalColor } : {}}
              >
                <span className={isActive ? '' : 'text-gray-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
      
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-xs font-bold text-gray-400 hidden xl:block font-mono bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-slate-800">{getFormattedDate()}</span>

        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleTheme}
          title={appTheme === 'light' ? "Aktifkan Mode Gelap" : "Aktifkan Mode Terang"}
          className="relative p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer flex items-center justify-center hover:scale-105"
        >
          {appTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
        {onLogout && (
          <button 
            onClick={onLogout}
            title="Keluar Sesi"
            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
