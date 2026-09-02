import React from 'react';
import { LayoutDashboard, PieChart, Newspaper, ShieldCheck, Building2, LogOut, MessageSquareText, ChevronLeft, ChevronRight } from 'lucide-react';

import { X } from 'lucide-react';

export default function Sidebar({ 
  onLogout,
  activeTab,
  setActiveTab,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}: { 
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (val: boolean) => void;
}) {
  const [desaName, setDesaName] = React.useState(() => localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
  const [authUser, setAuthUser] = React.useState<{ name: string; email: string; avatar: string } | null>(null);

  // Global Branding
  const [globalName, setGlobalName] = React.useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalLogo, setGlobalLogo] = React.useState(() => localStorage.getItem('global_app_logo') || '');
  const [globalColor, setGlobalColor] = React.useState(() => localStorage.getItem('global_app_color') || '#047857');

  const [isCollapsed, setIsCollapsed] = React.useState(() => localStorage.getItem('sidebar_collapsed') === 'true');

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  React.useEffect(() => {
    const loadAuthUser = () => {
      const saved = localStorage.getItem('didesa_auth_user');
      if (saved) {
        setAuthUser(JSON.parse(saved));
      }
    };
    loadAuthUser();

    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
    };

    const handleBrandingUpdate = () => {
      setGlobalName(localStorage.getItem('global_app_name') || 'DiDesa');
      setGlobalLogo(localStorage.getItem('global_app_logo') || '');
      setGlobalColor(localStorage.getItem('global_app_color') || '#047857');
    };

    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    window.addEventListener('global_branding_updated', handleBrandingUpdate);
    
    return () => {
      window.removeEventListener('village_settings_updated', handleSettingsUpdate);
      window.removeEventListener('global_branding_updated', handleBrandingUpdate);
    };
  }, []);

  return (
        <>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen?.(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex-col h-full shadow-sm dark:shadow-none transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        {isMobileMenuOpen && (
          <button onClick={() => setIsMobileMenuOpen?.(false)} className="absolute top-4 right-4 p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg lg:hidden">
            <X size={20} />
          </button>
        )}

        {/* Floating Edge Toggle (Border Edge Floating Button) */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex absolute -right-3 top-5 z-50 w-6 h-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-full shadow-md flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:scale-110 transition-all cursor-pointer"
          title={isCollapsed ? 'Buka Sidebar' : 'Lipat Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

      {/* Brand */}
      <div className="flex items-center px-3 py-2 mb-1 w-full border-b border-slate-100 dark:border-slate-800">
        {/* Sisi Kiri: Logo + Detail Nama */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{ backgroundColor: globalColor || '#047857' }}
          >
            {globalLogo ? (
              <img src={globalLogo} alt={globalName} className="w-5 h-5 object-contain" />
            ) : (
              <Building2 className="w-5 h-5 text-white" />
            )}
          </div>

          {/* Teks Judul + Subtitle */}
          {!isCollapsed && (
          <div className="flex flex-col min-w-0 leading-none">
            <span className="font-bold text-slate-800 dark:text-white text-base truncate">{globalName}</span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1 truncate">
              {desaName.replace(/desa|kelurahan/gi, '').trim().toUpperCase()}
            </span>
          </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1 mt-2">
        <NavItem 
          collapsed={isCollapsed} icon={<LayoutDashboard size={20} />} 
          label="Dashboard Publik" 
          active={activeTab === 'dashboard'} 
          onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('dashboard'); }}
        />
        <NavItem 
          collapsed={isCollapsed} icon={<Building2 size={20} />} 
          label="Profil Desa" 
          active={activeTab === 'profil_desa'} 
          onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('profil_desa'); }}
        />
        <NavItem 
          collapsed={isCollapsed} icon={<PieChart size={20} />} 
          label="Transparansi Dana" 
          active={activeTab === 'transparansi'} 
          onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('transparansi'); }}
        />
        <NavItem 
          collapsed={isCollapsed} id="tour-public-berita" icon={<Newspaper size={20} />} 
          label="Berita Desa" 
          active={activeTab === 'berita'} 
          onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('berita'); }}
        />
        <NavItem 
           collapsed={isCollapsed} id="tour-public-layanan" icon={<ShieldCheck size={20} />} 
           label="Layanan Mandiri" 
           active={activeTab === 'layanan_mandiri'} 
           onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('layanan_mandiri'); }} 
        />
        <NavItem 
           collapsed={isCollapsed} id="tour-public-aspirasi" icon={<MessageSquareText size={20} />} 
           label="Aspirasi Warga" 
           active={activeTab === 'aspirasi'} 
           onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('aspirasi'); }} 
        />
      </nav>

      {/* Profile */}
      <div className={`${isCollapsed ? 'p-2 m-2 flex flex-col items-center gap-2' : 'p-4 border-t border-gray-100 dark:border-slate-800 m-4 rounded-xl bg-gray-50 dark:bg-slate-800 flex flex-col gap-3'}`}>
        <div className={`${isCollapsed ? 'flex justify-center' : 'flex items-center gap-3'}`}>
          <img src={authUser?.avatar || `https://api.dicebear.com/9.x/micah/svg?seed=${authUser?.name || 'Warga'}`} alt="Profile" className="w-10 h-10 rounded-full border-2 border-emerald-100 object-cover" />
          {!isCollapsed && (
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{authUser?.name || "Akses Publik"}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate font-semibold">{authUser?.email || "warga@sukamakmur.desa.id"}</p>
          </div>
          )}
        </div>
        <button 
          onClick={onLogout}
          title={isCollapsed ? 'Keluar Sesi' : undefined}
          className={`${isCollapsed ? 'w-9 h-9 flex items-center justify-center' : 'w-full flex items-center justify-center gap-2 py-2 px-3'} bg-white dark:bg-slate-900 hover:bg-rose-50 border border-gray-100 dark:border-slate-800 hover:border-rose-200 text-rose-600 rounded-lg text-xs font-bold transition-all`}
        >
          <LogOut size={14} />
          {!isCollapsed && <span>Keluar Sesi</span>}
        </button>
        {!isCollapsed && (
        <div className="text-center pt-2 border-t border-gray-200/50">
          
        </div>
        )}
      </div>
    </aside>
    </>
  );
}

function NavItem({ icon, label, active = false, onClick, id, collapsed = false }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, id?: string, collapsed?: boolean }) {
  return (
    <a
      id={id}
      href="#"
      title={collapsed ? label : undefined}
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick();
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm relative overflow-hidden group ${
        collapsed ? 'justify-center px-2' : ''
      } ${
        active
          ? 'bg-emerald-50/80 text-emerald-700'
          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900'
      }`}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600 rounded-r-md"></div>}
      <span className={`${active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`}>{icon}</span>
      {!collapsed && <span>{label}</span>}
    </a>
  );
}
