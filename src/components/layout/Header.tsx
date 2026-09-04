import React from 'react';
import { Globe, LogOut } from 'lucide-react';
import { getFormattedDate } from '../../utils/dateHelper';

export default function Header({ 
  activeTab,
  setActiveTab,
  user,
  onAdminLogin,
  onLogout
}: { 
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  user?: { role: string } | null;
  onAdminLogin?: () => void;
  onLogout?: () => void;
}) {
  const [desaName, setDesaName] = React.useState(() => localStorage.getItem('kop_desa') || 'DiDesa');
  const [globalColor, setGlobalColor] = React.useState(() => localStorage.getItem('global_app_color') || '#047857');
  const [globalLogo, setGlobalLogo] = React.useState(() => localStorage.getItem('global_app_logo') || '');

  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Ketupat');
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
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Beranda' },
    { id: 'layanan_mandiri', label: 'Layanan' },
    { id: 'profil_desa', label: 'Profil Desa' },
    { id: 'transparansi', label: 'Transparansi' },
    { id: 'berita', label: 'Berita' },
    { id: 'aspirasi', label: 'Aspirasi' },
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
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-widest">
              PORTAL WARGA
            </p>
          </div>
        </a>
      </div>
      
      {/* Desktop Horizontal Navigation Bar */}
      {setActiveTab && (
        <nav className="hidden xl:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-xs font-extrabold transition-all cursor-pointer py-1 border-b-2 ${
                  isActive 
                    ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400' 
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-emerald-800 dark:hover:text-emerald-400'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
      
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 hidden 2xl:block font-mono">
          {getFormattedDate()}
        </span>

        {onAdminLogin && (
          <button 
            onClick={onAdminLogin}
            className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95"
          >
            Mode Admin
          </button>
        )}

        {user && onLogout && (
          <button 
            onClick={onLogout}
            title="Keluar Sesi"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
