import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Gift, Settings, Building2, LogOut, ShieldCheck, Database, MessageSquareText, Bot, Sparkles, Camera, BookOpen, Newspaper, Bug, Handshake, ListChecks, PanelLeftClose, PanelLeftOpen, Scale, FileSignature } from 'lucide-react';
import { X } from 'lucide-react';
import { fetchFeedbacksAsync, getFeedbackReadState } from '../../utils/feedbackData';
import { fetchBugReportsOnline, getBugReportReadState } from '../../utils/bugReportService';
import { fetchSaaSTenantRequests, getLeadReadState, getApprovalReadState } from '../../utils/saasLeads';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { ENABLE_AI_FEATURES, AI_DEV_MESSAGE } from '../../utils/featureFlags';

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
  const [pendingBugsCount, setPendingBugsCount] = useState(0);
  const [pendingLeadsCount, setPendingLeadsCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingAffiliatesCount, setPendingAffiliatesCount] = useState(0);
  
  // Global Branding
  const [globalName, setGlobalName] = React.useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalLogo, setGlobalLogo] = React.useState(() => localStorage.getItem('global_app_logo') || '');
  const [globalDesiLogo, setGlobalDesiLogo] = React.useState(() => localStorage.getItem('global_desi_logo') || '');
  const [globalColor, setGlobalColor] = React.useState(() => localStorage.getItem('global_app_color') || '#047857');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

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
      setGlobalDesiLogo(localStorage.getItem('global_desi_logo') || '');
      setGlobalColor(localStorage.getItem('global_app_color') || '#047857');
    };

    const handleFeedbackUpdate = async () => {
      const feedbacks = await fetchFeedbacksAsync();
      const seen = new Set(getFeedbackReadState());
      setUnreadFeedbacks(feedbacks.filter(f => f.status === 'Baru' && !seen.has(f.id)).length);
    };
    handleFeedbackUpdate();

    const handleBugsUpdate = async () => {
      const reports = await fetchBugReportsOnline();
      const read = getBugReportReadState();
      setPendingBugsCount(reports.filter(r => {
        const msgs = r.messages || [];
        const last = msgs[msgs.length - 1];
        if (!last || last.role === 'SaaS Admin') return false;
        return Date.parse(last.timestamp) > (read[r.id] || 0);
      }).length);
    };
    handleBugsUpdate();

    const handleLeadsUpdate = async () => {
      const leads = await fetchSaaSTenantRequests();
      const seen = new Set(getLeadReadState());
      setPendingLeadsCount(leads.filter(l => l.status === 'Menunggu' && !seen.has(l.id)).length);
    };
    handleLeadsUpdate();

    const handleApprovalsUpdate = async () => {
      try {
        const { data } = await supabase
          .from('tenants')
          .select('id')
          .eq('status', 'pending_approval');
        const seen = new Set(getApprovalReadState());
        setPendingApprovalsCount((data || []).filter(t => !seen.has(t.id)).length);
      } catch (e) {
        setPendingApprovalsCount(0);
      }
    };
    handleApprovalsUpdate();

    const handleAffiliatesUpdate = async () => {
      try {
        const { count } = await supabase
          .from('affiliates')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingAffiliatesCount(count || 0);
      } catch (e) {
        setPendingAffiliatesCount(0);
      }
    };
    handleAffiliatesUpdate();

    window.addEventListener('affiliates_updated', handleAffiliatesUpdate);
    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    window.addEventListener('global_branding_updated', handleBrandingUpdate);
    window.addEventListener('feedback_updated', handleFeedbackUpdate);
    window.addEventListener('bug_reports_updated', handleBugsUpdate);
    window.addEventListener('bug_reports_read', handleBugsUpdate);
    window.addEventListener('tenant_requests_updated', handleLeadsUpdate);
    window.addEventListener('tenant_approvals_updated', handleApprovalsUpdate);
    
    return () => {
      window.removeEventListener('village_settings_updated', handleSettingsUpdate);
      window.removeEventListener('global_branding_updated', handleBrandingUpdate);
      window.removeEventListener('feedback_updated', handleFeedbackUpdate);
      window.removeEventListener('bug_reports_updated', handleBugsUpdate);
      window.removeEventListener('bug_reports_read', handleBugsUpdate);
      window.removeEventListener('tenant_requests_updated', handleLeadsUpdate);
      window.removeEventListener('tenant_approvals_updated', handleApprovalsUpdate);
      window.removeEventListener('affiliates_updated', handleAffiliatesUpdate);
    };
  }, []);

  return (
        <>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen?.(false)} />
      )}
      <aside className={`print:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex-col h-full shadow-sm dark:shadow-none transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        {isMobileMenuOpen && (
          <button onClick={() => setIsMobileMenuOpen?.(false)} className="absolute top-4 right-4 p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg lg:hidden">
            <X size={18} />
          </button>
        )}

      {/* Brand */}
      <div className={`${isCollapsed ? 'p-4 flex flex-col items-center gap-3' : 'p-6 flex items-center gap-4'} mb-4`}>
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0 overflow-hidden"
          style={{ backgroundColor: globalColor }}
        >
          {globalLogo ? (
            <img src={globalLogo} alt={globalName} className="w-6 h-6 object-contain" />
          ) : (
            <Building2 className="text-white w-6 h-6" />
          )}
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight leading-none truncate" style={{ color: globalColor }}>{globalName}</h1>
            <p className="text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-widest mt-1 truncate">
              {desaName.replace(/desa|kelurahan/gi, '').trim().toUpperCase()}
            </p>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? 'Perluas Sidebar' : 'Lipat Sidebar'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/80 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-emerald-200/60 dark:hover:border-emerald-500/30 active:scale-95"
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {authUser?.role !== 'saas_admin' ? (
          <>
            <NavItem id="tour-dashboard" collapsed={isCollapsed} icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('dashboard'); }} />
            
            {!isCollapsed && <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-3 mb-0.5 px-3">Pemerintahan</p>}
            <NavItem id="tour-penduduk" collapsed={isCollapsed} icon={<Users size={18} />} label="Penduduk" active={activeTab === 'penduduk'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('penduduk'); }} />
            {authUser?.role === 'kades' && <NavItem collapsed={isCollapsed} icon={<Building2 size={18} />} label="Aparatur Desa" active={activeTab === 'aparatur'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('aparatur'); }} />}
            
            {!isCollapsed && <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-3 mb-0.5 px-3">Kesejahteraan</p>}
            <NavItem collapsed={isCollapsed} icon={<Gift size={18} />} label="Bantuan Sosial" active={activeTab === 'bantuan'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('bantuan'); }} />
            
            {!isCollapsed && <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-3 mb-0.5 px-3">Produk Hukum</p>}
            <NavItem collapsed={isCollapsed} icon={<Scale className="w-5 h-5 transition-colors" strokeWidth={1.75} />} label="Penomoran SK & Perdes" active={activeTab === 'produk_hukum'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('produk_hukum'); }} />
            
            {!isCollapsed && <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-3 mb-0.5 px-3">Pelayanan Publik</p>}
            <NavItem id="tour-surat" collapsed={isCollapsed} icon={<FileSignature className="w-5 h-5 transition-colors" strokeWidth={1.75} />} label="Surat & Administrasi" active={activeTab === 'surat'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('surat'); }} />
            <NavItem collapsed={isCollapsed} icon={<MessageSquareText size={18} />} label="Aspirasi Warga" active={activeTab === 'aspirasi'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('aspirasi'); }} />
            <NavItem collapsed={isCollapsed} icon={<Newspaper size={18} />} label="Berita & Pengumuman" active={activeTab === 'berita'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('berita'); }} />
              <NavItem collapsed={isCollapsed} icon={<BookOpen size={18} />} label="Buku Tamu Digital" active={activeTab === 'buku_tamu'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('buku_tamu'); }} />
            <NavItem collapsed={isCollapsed} icon={<ListChecks size={18} />} label="Usulan Desa" active={activeTab === 'usulan_desa'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('usulan_desa'); }} />
            {!isCollapsed && <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-3 mb-0.5 px-3">Lainnya</p>}
            <NavItem collapsed={isCollapsed} icon={<BookOpen size={18} className="text-emerald-600" />} label="Panduan & Tutorial" active={activeTab === 'panduan'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('panduan'); }} />
            {authUser?.role === 'kades' && <NavItem collapsed={isCollapsed} icon={<Settings size={18} />} label="Pengaturan" active={activeTab === 'pengaturan'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('pengaturan'); }} />}
          </>
        ) : (
          <>
            <NavItem collapsed={isCollapsed} icon={<LayoutDashboard size={18} />} label="SaaS Dashboard" active={activeTab === 'dashboard'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('dashboard'); }} />
            <NavItem collapsed={isCollapsed} icon={<Building2 size={18} className="text-blue-600" />} label="Manajemen Klien" active={activeTab === 'tenants'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('tenants'); }} badgeCount={activeTab === 'tenants' ? 0 : unreadFeedbacks} />
            <NavItem collapsed={isCollapsed} icon={<Users size={18} className="text-orange-500" />} label="Prospek & Pengajuan" active={activeTab === 'saas_leads'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('saas_leads'); }} badgeCount={activeTab === 'saas_leads' ? 0 : pendingLeadsCount} />
            <NavItem collapsed={isCollapsed} icon={<ShieldCheck size={18} className="text-emerald-600" />} label="Persetujuan Desa" active={activeTab === 'pending_approvals'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('pending_approvals'); }} badgeCount={activeTab === 'pending_approvals' ? 0 : pendingApprovalsCount} />
            <NavItem collapsed={isCollapsed} icon={<Handshake size={18} className="text-emerald-700" />} label="Manajemen Afiliator" active={activeTab === 'saas_affiliates'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('saas_affiliates'); }} badgeCount={activeTab === 'saas_affiliates' ? 0 : pendingAffiliatesCount} />
            <NavItem collapsed={isCollapsed} icon={<Database size={18} className="text-purple-600" />} label="Log Aktivitas" active={activeTab === 'log_aktivitas'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('log_aktivitas'); }} />
            <NavItem collapsed={isCollapsed} icon={<Sparkles size={18} className="text-amber-500" />} label="Log Pembaruan" active={activeTab === 'log_pembaruan'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('log_pembaruan'); }} />
            <NavItem collapsed={isCollapsed} icon={<Bug size={18} className="text-rose-500" />} label="Tiket & Laporkan Bug" active={activeTab === 'saas_bugs'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('saas_bugs'); }} badgeCount={activeTab === 'saas_bugs' ? 0 : pendingBugsCount} />
            <NavItem collapsed={isCollapsed} icon={<FileText size={18} className="text-emerald-600" />} label="Template Surat Global" active={activeTab === 'template_surat'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('template_surat'); }} />
            <NavItem collapsed={isCollapsed} icon={<BookOpen size={18} className="text-teal-600" />} label="Panduan & Documentation" active={activeTab === 'panduan'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('panduan'); }} />
            <NavItem collapsed={isCollapsed} icon={<Settings size={18} />} label="Branding Platform" active={activeTab === 'global_branding'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('global_branding'); }} />
          </>
        )}
        
        <div className="pt-4 mt-6 border-t border-gray-100 dark:border-slate-800">
          <button 
            onClick={() => {
              setIsMobileMenuOpen?.(false);
              if (!ENABLE_AI_FEATURES) {
                showToast(AI_DEV_MESSAGE, 'info');
                return;
              }
              setActiveTab('ai_assistant');
            }}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all relative overflow-hidden group ${isCollapsed ? 'justify-center px-2' : ''} ${activeTab === 'ai_assistant' ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent'}`}
            title={isCollapsed ? 'Asisten AI' : undefined}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner text-white overflow-hidden">
                {globalDesiLogo ? (
                  <img src={globalDesiLogo} alt="Desi Logo" className="w-full h-full object-cover" />
                ) : (
                  <Bot size={16} />
                )}
              </div>
              {!isCollapsed && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${activeTab === 'ai_assistant' ? 'text-indigo-900' : 'text-gray-700 dark:text-slate-300'}`}>Asisten AI</span>
                  {!ENABLE_AI_FEATURES && (
                    <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[9px] font-black rounded-md border border-amber-200 dark:border-amber-800">
                      [DEV]
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-indigo-500 font-bold tracking-wider uppercase flex items-center gap-1">
                  <Sparkles size={8} /> Pintar
                </span>
              </div>
              )}
            </div>
            {activeTab === 'ai_assistant' && !isCollapsed && (
              <div className="w-1.5 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            )}
          </button>
        </div>
      </nav>

      {/* Profile */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-3 mt-auto bg-white dark:bg-slate-900">
        <div className={`${isCollapsed ? 'flex justify-center' : 'flex items-center gap-3 px-1'}`}>
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
          {!isCollapsed && (
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
          )}
        </div>
        
        <div className={`${isCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-2'}`}>
          <button 
            onClick={() => setView('public')}
            title={isCollapsed ? 'Portal Publik' : undefined}
            className={`${isCollapsed ? 'w-9 h-9 flex items-center justify-center' : 'flex-1 flex items-center justify-center gap-2'} py-2 bg-gray-50 dark:bg-slate-800 hover:bg-emerald-50 border border-gray-100 dark:border-slate-800 hover:border-emerald-100 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-400 hover:text-emerald-700 transition-colors shadow-sm dark:shadow-none`}
          >
            <LayoutDashboard size={14} />
            {!isCollapsed && <span>Portal Publik</span>}
          </button>
          <button 
            onClick={onLogout}
            className="w-9 h-9 flex items-center justify-center bg-gray-50 dark:bg-slate-800 hover:bg-rose-50 border border-gray-100 dark:border-slate-800 hover:border-rose-100 rounded-xl text-gray-500 dark:text-slate-400 hover:text-rose-600 transition-colors shrink-0 shadow-sm dark:shadow-none"
            title="Keluar Sesi"
          >
            <LogOut size={16} />
          </button>
        </div>
        {!isCollapsed && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          <span>DiDesa App</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px]">
            v5.3
          </span>
        </div>
        )}
      </div>
    </aside>
    </>
  );
}

function NavItem({ icon, label, active = false, onClick, badgeCount = 0, id, collapsed = false }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, badgeCount?: number, id?: string, collapsed?: boolean }) {
  return (
    <a
      id={id}
      href="#"
      title={collapsed ? label : undefined}
      onClick={(e) => { e.preventDefault(); onClick && onClick(); }}
      className={`flex items-center justify-between px-3.5 py-2 rounded-xl transition-all duration-200 font-semibold text-[13px] relative overflow-hidden group ${
        collapsed ? 'justify-center px-2' : ''
      } ${
        active
          ? 'bg-emerald-50/80 text-emerald-700'
          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600 rounded-r-md"></div>}
        <span className={`${active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`}>{icon}</span>
        {!collapsed && <span>{label}</span>}
      </div>
      {!collapsed && badgeCount > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center animate-pulse">
          {badgeCount}
        </span>
      )}
      {collapsed && badgeCount > 0 && (
        <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center justify-center animate-pulse">
          {badgeCount}
        </span>
      )}
    </a>
  );
}
