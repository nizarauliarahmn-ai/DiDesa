import React from 'react';
import { Home, LayoutDashboard, PieChart, Newspaper, Map, ShieldCheck, Building2, LogOut, MessageSquareText, Sparkles, Bot } from 'lucide-react';

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
  const [desaName, setDesaName] = React.useState(() => localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');
  const [authUser, setAuthUser] = React.useState<{ name: string; email: string; avatar: string } | null>(null);

  // Global Branding
  const [globalName, setGlobalName] = React.useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalLogo, setGlobalLogo] = React.useState(() => localStorage.getItem('global_app_logo') || '');
  const [globalColor, setGlobalColor] = React.useState(() => localStorage.getItem('global_app_color') || '#047857');

  React.useEffect(() => {
    const loadAuthUser = () => {
      const saved = localStorage.getItem('didesa_auth_user');
      if (saved) {
        setAuthUser(JSON.parse(saved));
      }
    };
    loadAuthUser();

    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex-col h-full shadow-sm transition-transform duration-300 lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex`}>
        {isMobileMenuOpen && (
          <button onClick={() => setIsMobileMenuOpen?.(false)} className="absolute top-4 right-4 p-2 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden">
            <X size={20} />
          </button>
        )}

      {/* Brand */}
      <div className="p-6 flex items-center gap-4">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0"
          style={{ backgroundColor: globalColor }}
        >
          {globalLogo ? (
            <img src={globalLogo} alt="Logo" className="w-6 h-6 object-contain" />
          ) : (
            <Building2 className="text-white w-6 h-6" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold tracking-tight leading-none" style={{ color: globalColor }}>{globalName}</h1>
            <span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">v3.0</span>
          </div>
          <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mt-1">
            {desaName.replace(/desa|kelurahan/gi, '').trim().toUpperCase()}
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        <NavItem 
          icon={<LayoutDashboard size={20} />} 
          label="Dashboard Publik" 
          active={activeTab === 'dashboard'} 
          onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('dashboard'); }}
        />
        <NavItem 
          icon={<Building2 size={20} />} 
          label="Profil Desa" 
          active={activeTab === 'profil_desa'} 
          onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('profil_desa'); }}
        />
        <NavItem 
          icon={<PieChart size={20} />} 
          label="Transparansi Dana" 
          active={activeTab === 'transparansi'} 
          onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('transparansi'); }}
        />
        <NavItem 
          id="tour-public-berita" icon={<Newspaper size={20} />} 
          label="Berita Desa" 
          active={activeTab === 'berita'} 
          onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('berita'); }}
        />
        <NavItem 
          icon={<Map size={20} />} 
          label="Peta Wilayah" 
          active={activeTab === 'peta_wilayah'} 
          onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('peta_wilayah'); }}
        />
        <NavItem 
           id="tour-public-layanan" icon={<ShieldCheck size={20} />} 
           label="Layanan Mandiri" 
           active={activeTab === 'layanan_mandiri'} 
           onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('layanan_mandiri'); }} 
        />
        <NavItem 
           id="tour-public-aspirasi" icon={<MessageSquareText size={20} />} 
           label="Aspirasi Warga" 
           active={activeTab === 'aspirasi'} 
           onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('aspirasi'); }} 
        />
      </nav>

      {/* Profile */}
      <div className="p-4 border-t border-gray-100 m-4 rounded-xl bg-gray-50 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <img src={authUser?.avatar || "https://i.pravatar.cc/150?img=11"} alt="Profile" className="w-10 h-10 rounded-full border-2 border-emerald-100 object-cover" />
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-bold text-gray-900 truncate">{authUser?.name || "Akses Publik"}</p>
            <p className="text-[10px] text-gray-500 truncate font-semibold">{authUser?.email || "warga@wasahhilir.desa.id"}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-rose-50 border border-gray-100 hover:border-rose-200 text-rose-600 rounded-lg text-xs font-bold transition-all mb-1"
        >
          <LogOut size={14} />
          <span>Keluar Sesi</span>
        </button>
        <div className="text-center pt-2 border-t border-gray-200/50">
          
        </div>
      </div>
    </aside>
    </>
  );
}

function NavItem({ icon, label, active = false, onClick, id }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, id?: string }) {
  return (
    <a
      id={id}
      href="#"
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick();
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm relative overflow-hidden group ${
        active
          ? 'bg-emerald-50/80 text-emerald-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600 rounded-r-md"></div>}
      <span className={`${active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`}>{icon}</span>
      <span>{label}</span>
    </a>
  );
}
