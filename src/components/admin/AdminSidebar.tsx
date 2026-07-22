import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Gift, Settings, Building2, LogOut, Bell, ShieldCheck, Database, MessageSquareText, Bot, Sparkles, Camera } from 'lucide-react';
import { X } from 'lucide-react';
import { getFeedbacks } from '../../utils/feedbackData';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; // Small size for avatar
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to Blob failed'));
          }
        }, 'image/jpeg', 0.7); // 70% quality
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function AdminSidebar({ setView, activeTab, setActiveTab, onLogout, isMobileMenuOpen, setIsMobileMenuOpen }: { setView: (view: 'public' | 'admin') => void, activeTab: string, setActiveTab: (tab: string) => void, onLogout: () => void, isMobileMenuOpen?: boolean, setIsMobileMenuOpen?: (val: boolean) => void }) {
  const [desaName, setDesaName] = React.useState(() => localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
  const [authUser, setAuthUser] = React.useState<{ name: string; email: string; role: 'admin' | 'kades' | 'saas_admin' | 'public'; avatar: string } | null>(null);
  const [unreadFeedbacks, setUnreadFeedbacks] = useState(0);
  
  // Global Branding
  const [globalName, setGlobalName] = React.useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalLogo, setGlobalLogo] = React.useState(() => localStorage.getItem('global_app_logo') || '');
  const [globalColor, setGlobalColor] = React.useState(() => localStorage.getItem('global_app_color') || '#047857');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setIsUploadingAvatar(true);
      const file = e.target.files[0];
      
      // Compress the image before uploading
      const compressedBlob = await compressImage(file);
      
      const fileName = `avatar-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, compressedBlob, {
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      if (authUser) {
        const updatedUser = { ...authUser, avatar: publicUrl };
        setAuthUser(updatedUser);
        localStorage.setItem('didesa_auth_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('auth_user_updated'));
        showToast('Foto profil berhasil diperbarui!', 'success');
      }
      
      // Reset input value to allow uploading the same file again if needed
      e.target.value = '';
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      const errMsg = error?.message || error?.error || 'Terjadi kesalahan sistem';
      showToast(`Gagal: ${errMsg}`, 'error');
      // Reset input value on error too
      e.target.value = '';
    } finally {
      setIsUploadingAvatar(false);
    }
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

    const handleFeedbackUpdate = () => {
      const feedbacks = getFeedbacks();
      setUnreadFeedbacks(feedbacks.filter(f => f.status === 'Baru').length);
    };
    handleFeedbackUpdate();

    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    window.addEventListener('global_branding_updated', handleBrandingUpdate);
    window.addEventListener('feedback_updated', handleFeedbackUpdate);
    
    return () => {
      window.removeEventListener('village_settings_updated', handleSettingsUpdate);
      window.removeEventListener('global_branding_updated', handleBrandingUpdate);
      window.removeEventListener('feedback_updated', handleFeedbackUpdate);
    };
  }, []);

  return (
        <>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen?.(false)} />
      )}
      <aside className={`print:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex-col h-full shadow-sm dark:shadow-none transition-transform duration-300 lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex`}>
        {isMobileMenuOpen && (
          <button onClick={() => setIsMobileMenuOpen?.(false)} className="absolute top-4 right-4 p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg lg:hidden">
            <X size={18} />
          </button>
        )}

      {/* Brand */}
      <div className="p-6 flex items-center gap-4 mb-4">
        {globalLogo ? (
          <img src={globalLogo} alt={globalName} className="h-10 w-auto max-w-[140px] object-contain rounded-xl shrink-0" />
        ) : (
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0"
            style={{ backgroundColor: globalColor }}
          >
            <Building2 className="text-white w-6 h-6" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold tracking-tight leading-none" style={{ color: globalColor }}>{globalName}</h1>
            <span className="text-[9px] font-bold bg-emerald-100 dark:bg-slate-800 text-emerald-800 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">v4.0</span>
          </div>
          <p className="text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-widest mt-1">
            {desaName.replace(/desa|kelurahan/gi, '').trim().toUpperCase()}
          </p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {authUser?.role !== 'saas_admin' ? (
          <>
            <NavItem id="tour-dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('dashboard'); }} />
            
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-3 mb-0.5 px-3">Pemerintahan</p>
            <NavItem id="tour-penduduk" icon={<Users size={18} />} label="Penduduk" active={activeTab === 'penduduk'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('penduduk'); }} />
            {authUser?.role === 'kades' && <NavItem icon={<Building2 size={18} />} label="Aparatur Desa" active={activeTab === 'aparatur'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('aparatur'); }} />}
            
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-3 mb-0.5 px-3">Kesejahteraan</p>
            <NavItem icon={<Gift size={18} />} label="Bantuan Sosial" active={activeTab === 'bantuan'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('bantuan'); }} />
            
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-3 mb-0.5 px-3">Produk Hukum</p>
            <NavItem icon={<FileText size={18} />} label="Penomoran SK & Perdes" active={activeTab === 'produk_hukum'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('produk_hukum'); }} />
            
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-3 mb-0.5 px-3">Pelayanan Publik</p>
            <NavItem id="tour-surat" icon={<FileText size={18} />} label="Surat & Administrasi" active={activeTab === 'surat'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('surat'); }} />
            <NavItem icon={<MessageSquareText size={18} />} label="Aspirasi Warga" active={activeTab === 'aspirasi'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('aspirasi'); }} />
            {authUser?.role === 'kades' && <NavItem icon={<ShieldCheck size={18} className="text-amber-600 animate-pulse" />} label="Antrean Konfirmasi" active={activeTab === 'antrean'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('antrean'); }} /> }
            
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-3 mb-0.5 px-3">Lainnya</p>
            <NavItem icon={<Settings size={18} />} label="Pengaturan" active={activeTab === 'pengaturan'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('pengaturan'); }} />
          </>
        ) : (
          <>
            <NavItem icon={<LayoutDashboard size={18} />} label="SaaS Dashboard" active={activeTab === 'dashboard'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('dashboard'); }} />
            <NavItem icon={<Building2 size={18} className="text-blue-600" />} label="Manajemen Klien" active={activeTab === 'tenants'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('tenants'); }} badgeCount={unreadFeedbacks} />
            <NavItem icon={<Database size={18} className="text-purple-600" />} label="Log Aktivitas" active={activeTab === 'log_aktivitas'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('log_aktivitas'); }} />
            <NavItem icon={<FileText size={18} className="text-emerald-600" />} label="Template Surat Global" active={activeTab === 'template_surat'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('template_surat'); }} />
            <NavItem icon={<Settings size={18} />} label="Branding Platform" active={activeTab === 'global_branding'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('global_branding'); }} />
          </>
        )}
        
        <div className="pt-4 mt-6 border-t border-gray-100 dark:border-slate-800">
          <button 
            onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('ai_assistant'); }}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all relative overflow-hidden group ${activeTab === 'ai_assistant' ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner text-white">
                <Bot size={16} />
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${activeTab === 'ai_assistant' ? 'text-indigo-900' : 'text-gray-700 dark:text-slate-300'}`}>Asisten AI</span>
                  <span className="bg-amber-500 text-white text-[8px] font-black px-1 py-0.2 rounded-full border border-white shadow-sm dark:shadow-none">DEV</span>
                </div>
                <span className="text-[9px] text-indigo-500 font-bold tracking-wider uppercase flex items-center gap-1">
                  <Sparkles size={8} /> Pintar
                </span>
              </div>
            </div>
            {activeTab === 'ai_assistant' && (
              <div className="w-1.5 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            )}
          </button>
        </div>
      </nav>

      {/* Profile */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-3 mt-auto bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3 px-1">
          <div className="relative shrink-0 group cursor-pointer">
            <label className="cursor-pointer block relative">
              <img src={authUser?.avatar || `https://api.dicebear.com/9.x/micah/svg?seed=${authUser?.name || 'Admin'}`} alt="Admin" className={`w-11 h-11 rounded-full border-2 border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none object-cover ${isUploadingAvatar ? 'opacity-50' : 'group-hover:opacity-80'} transition-opacity`} />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Camera size={14} className="text-white" />
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploadingAvatar} />
            </label>
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center pointer-events-none ${authUser?.role === 'saas_admin' ? 'bg-purple-500' : authUser?.role === 'kades' ? 'bg-amber-500' : 'bg-emerald-500'}`} title={authUser?.role === 'saas_admin' ? 'SaaS Admin' : authUser?.role === 'kades' ? 'Super Admin' : 'Admin'}>
              {authUser?.role === 'saas_admin' ? (
                <Building2 size={10} className="text-white" />
              ) : authUser?.role === 'kades' ? (
                <ShieldCheck size={10} className="text-white" />
              ) : (
                <Users size={10} className="text-white" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1">{authUser?.name || "Admin Desa"}</p>
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                authUser?.role === 'saas_admin' ? 'bg-purple-100 text-purple-700' : 
                authUser?.role === 'kades' ? 'bg-amber-100 text-amber-700' : 
                'bg-emerald-100 text-emerald-700'
              }`}>
                {authUser?.role === 'saas_admin' ? 'SaaS Admin' : authUser?.role === 'kades' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setView('public')}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-50 dark:bg-slate-800 hover:bg-emerald-50 border border-gray-100 dark:border-slate-800 hover:border-emerald-100 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-400 hover:text-emerald-700 transition-colors shadow-sm dark:shadow-none"
          >
            <LayoutDashboard size={14} />
            <span>Portal Publik</span>
          </button>
          <button 
            onClick={onLogout}
            className="w-9 h-9 flex items-center justify-center bg-gray-50 dark:bg-slate-800 hover:bg-rose-50 border border-gray-100 dark:border-slate-800 hover:border-rose-100 rounded-xl text-gray-500 dark:text-slate-400 hover:text-rose-600 transition-colors shrink-0 shadow-sm dark:shadow-none"
            title="Keluar Sesi"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}

function NavItem({ icon, label, active = false, onClick, badgeCount = 0, id }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, badgeCount?: number, id?: string }) {
  return (
    <a
      id={id}
      href="#"
      onClick={(e) => { e.preventDefault(); onClick && onClick(); }}
      className={`flex items-center justify-between px-3.5 py-2 rounded-xl transition-all duration-200 font-semibold text-[13px] relative overflow-hidden group ${
        active
          ? 'bg-emerald-50/80 text-emerald-700'
          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600 rounded-r-md"></div>}
        <span className={`${active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`}>{icon}</span>
        <span>{label}</span>
      </div>
      {badgeCount > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center animate-pulse">
          {badgeCount}
        </span>
      )}
    </a>
  );
}
