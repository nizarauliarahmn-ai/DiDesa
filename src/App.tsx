import React, { useState } from 'react';
import { LayoutDashboard, PieChart, Newspaper, Map, ShieldCheck, Building2, ArrowLeft } from 'lucide-react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/Dashboard';
import AdminSidebar from './components/admin/AdminSidebar';
import AdminHeader from './components/admin/AdminHeader';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminPenduduk from './components/admin/AdminPenduduk';
import AdminAparatur from './components/admin/AdminAparatur';
import AdminSurat from './components/admin/AdminSurat';
import AdminBantuan from './components/admin/AdminBantuan';
import AdminKeuangan from './components/admin/AdminKeuangan';
import AdminProdukHukum from './components/admin/AdminProdukHukum';
import AdminPengaturan from './components/admin/AdminPengaturan';
import AdminNotifikasi from './components/admin/AdminNotifikasi';
import AdminApprovalQueue from './components/admin/AdminApprovalQueue';
import AdminTenants from './components/admin/AdminTenants';
import AdminAspirasi from './components/admin/AdminAspirasi';
import AdminBukuTamu from './components/admin/AdminBukuTamu';
import PublicBukuTamu from './components/PublicBukuTamu';
import AdminAiAssistant from './components/admin/AdminAiAssistant';
import AdminSaaSLogs from './components/admin/AdminSaaSLogs';
import AdminGlobalBranding from './components/admin/AdminGlobalBranding';
import AdminSaaSTemplateSurat from './components/admin/AdminSaaSTemplateSurat';
import ToastContainer from './components/common/ToastContainer';
import { GlobalUpdateNotifier } from './components/GlobalUpdateNotifier';
import PageTransition from './components/common/PageTransition';
import Login from './components/Login';
import Footer from './components/common/Footer';
import { syncGlobalBrandingFromSupabase, subscribeGlobalBrandingRealtime } from './utils/globalBrandingSync';
import { supabase } from './utils/supabase';
import { resolveCurrentTenant } from './utils/tenantResolver';

// Public views
import TransparansiDana from './components/dashboard/TransparansiDana';
import BeritaDesa from './components/dashboard/BeritaDesa';
import PetaWilayah from './components/dashboard/PetaWilayah';
import LayananMandiri from './components/dashboard/LayananMandiri';
import ProfilDesa from './components/dashboard/ProfilDesa';
import AspirasiWarga from './components/dashboard/AspirasiWarga';
import AiAssistant from './components/dashboard/AiAssistant';
import IntroductionTour from './components/IntroductionTour';
import PrintQRKiosk from './components/admin/PrintQRKiosk';
import PublicKiosPortal from './components/PublicKiosPortal';
import PublicKiosSurat from './components/PublicKiosSurat';
import PublicKiosAspirasi from './components/PublicKiosAspirasi';

export default function App() {
  // Khusus untuk Halaman Print (Terisolasi dari semua layout)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('print') === 'qr_kiosk') {
    return <PrintQRKiosk />;
  }

  // Khusus untuk Kiosk Publik, tampilkan fullscreen (tanpa Header/Sidebar/Footer)
  // Ini harus ditaruh SEBELUM pengecekan login (!user) agar warga bisa menggunakan Kiosk tanpa harus punya akun/login
  const tabParam = urlParams.get('tab');
  
  if (tabParam === 'kios') {
    return <><PublicKiosPortal /><ToastContainer /></>;
  }
  if (tabParam === 'buku_tamu') {
    return <><PublicBukuTamu /><ToastContainer /></>;
  }
  if (tabParam === 'kios_surat') {
    return <><PublicKiosSurat /><ToastContainer /></>;
  }
  if (tabParam === 'kios_aspirasi') {
    return <><PublicKiosAspirasi /><ToastContainer /></>;
  }

  const [user, setUser] = useState<{ email: string; role: 'admin' | 'kades' | 'saas_admin' | 'public'; name: string; avatar: string } | null>(() => {
    if (new URLSearchParams(window.location.search).get('preview') === 'true') {
      return null;
    }
    const saved = localStorage.getItem('didesa_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState<'public' | 'admin'>(() => {
    if (new URLSearchParams(window.location.search).get('preview') === 'true') {
      return 'admin';
    }
    const saved = localStorage.getItem('didesa_auth_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.role === 'public' ? 'public' : 'admin';
    }
    return 'admin';
  });

  // Clear cache to force reload letter classifications
  if (localStorage.getItem('letter_cache_version') !== 'v4') {
    localStorage.removeItem('letter_classifications');
    localStorage.removeItem('saas_global_letter_catalog');
    localStorage.setItem('letter_cache_version', 'v4');
  }

  // Wipe old dummy data
  if (localStorage.getItem('data_wipe_v1') !== 'true') {
    localStorage.removeItem('didesa_feedbacks');
    localStorage.removeItem('didesa_aspirasi_data');
    localStorage.removeItem('local_residents');
    localStorage.removeItem('village_officers');
    localStorage.setItem('data_wipe_v1', 'true');
  }


  const [adminTab, setAdminTab] = useState('dashboard');
  const [presetResident, setPresetResident] = useState<any>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce globalSearch -> debouncedSearch to avoid UI lag on heavy filter operations
  React.useEffect(() => {
    if (globalSearch === '') {
      setDebouncedSearch('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(globalSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [globalSearch]);
  const [publicTab, setPublicTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isImpersonated, setIsImpersonated] = useState(() => {
    const saved = localStorage.getItem('didesa_auth_user');
    return saved ? !!JSON.parse(saved).isImpersonated : false;
  });

  const handleStopImpersonation = () => {
    const originalAdmin = localStorage.getItem('didesa_impersonator');
    if (originalAdmin) {
      localStorage.setItem('didesa_auth_user', originalAdmin);
      localStorage.removeItem('didesa_impersonator');
      localStorage.removeItem('kop_desa');
      window.location.reload();
    }
  };

  React.useEffect(() => {
    // Inisialisasi daftar pejabat desa (village_officers) jika belum ada di localStorage
    if (!localStorage.getItem('village_officers')) {
      const defaultOfficers = [
        { name: 'Fazakkir Rahmad', role: 'Kepala Desa', nip: '-' },
        { name: 'Siti Aminah', role: 'Sekretaris Desa', nip: '198510122010122003' },
        { name: 'Muhammad Noor', role: 'Kasi Pemerintahan', nip: '198704152014021002' },
        { name: 'Ahmad Rifai', role: 'Kasi Kesejahteraan', nip: '-' },
        { name: 'Rahmadi', role: 'Kasi Pelayanan', nip: '-' },
        { name: 'H. Supian', role: 'Kaur Keuangan', nip: '-' },
        { name: 'Sri Wahyuni', role: 'Kaur Umum', nip: '-' }
      ];
      localStorage.setItem('village_officers', JSON.stringify(defaultOfficers));
    }

    // ✅ PRIMARY SYNC & REALTIME SUBSCRIPTION: 
    // Pull SaaS global branding from Supabase + subscribe to instant WebSocket events (<100ms)
    const unsubscribeRealtime = subscribeGlobalBrandingRealtime();

    // ✅ SECONDARY SYNC: Pull tenant-specific settings from Supabase
    const syncTenantSettings = async () => {
      try {
        const tid = await resolveCurrentTenant();
        if (!tid) return;
        const { data } = await supabase
          .from('saas_settings')
          .select('key, value')
          .eq('tenant_id', tid);
        if (data && data.length > 0) {
          data.forEach((row: any) => {
            if (row.value !== null && row.value !== undefined && row.value !== '') {
              localStorage.setItem(row.key, row.value);
            }
          });
          window.dispatchEvent(new Event('village_settings_updated'));
          window.dispatchEvent(new Event('app_theme_updated'));
        }
      } catch (err) {
        console.warn('[App] Gagal sinkronisasi pengaturan desa:', err);
      }
    };
    syncTenantSettings();

    return () => {
      unsubscribeRealtime();
    };
  }, []);

  // Theme logic
  React.useEffect(() => {
    const applyTheme = () => {
      const theme = localStorage.getItem('app_theme') || 'light';
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    applyTheme();
    window.addEventListener('app_theme_updated', applyTheme);

    const handleAuthUserUpdate = () => {
      const saved = localStorage.getItem('didesa_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        setAdminTab('dashboard');
        setPublicTab('dashboard');
      }
    };
    window.addEventListener('auth_user_updated', handleAuthUserUpdate);

    return () => {
      window.removeEventListener('app_theme_updated', applyTheme);
      window.removeEventListener('auth_user_updated', handleAuthUserUpdate);
    };
  }, []);

  // Clear search on tab or view change
  React.useEffect(() => {
    setGlobalSearch('');
  }, [adminTab, publicTab, view]);

  const handleLogout = () => {
    localStorage.removeItem('didesa_auth_user');
    localStorage.removeItem('kop_desa');
    localStorage.removeItem('kop_kabupaten');
    localStorage.removeItem('kop_logo_url');
    setUser(null);
    setAdminTab('dashboard');
    setPublicTab('dashboard');
  };

  // If not authenticated, force login screen
  if (!user) {
    return (
      <>
        <Login onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setAdminTab('dashboard');
          setPublicTab('dashboard');
          setView(loggedInUser.role === 'public' ? 'public' : 'admin');
        }} />
        <ToastContainer />
        <GlobalUpdateNotifier />
      </>
    );
  }

  if (view === 'admin') {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-sans overflow-hidden print:h-auto print:overflow-visible print:block">
        <AdminSidebar setView={setView} activeTab={adminTab} setActiveTab={setAdminTab} onLogout={handleLogout} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 h-screen overflow-hidden relative print:h-auto print:overflow-visible print:block">
          <main className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-800 scroll-smooth print:h-auto print:overflow-visible print:block">
            <AdminHeader 
              setActiveTab={setAdminTab} 
              globalSearch={globalSearch} 
              setGlobalSearch={setGlobalSearch} 
              activeTab={adminTab}
              toggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
              className="sticky top-0 z-50"
            />
            <div className="p-4 md:p-6 lg:p-8 pb-72 lg:pb-80 flex flex-col min-h-full print:p-0 print:block">
              <div className="flex-1 print:block">
                <PageTransition pageKey={adminTab}>
                {adminTab === 'dashboard' && <AdminDashboard setActiveTab={setAdminTab} />}
                {adminTab === 'produk_hukum' && <AdminProdukHukum />}
                {adminTab === 'aparatur' && user.role === 'kades' && <AdminAparatur />}
                 {adminTab === 'penduduk' && (
                  <AdminPenduduk 
                    onNavigateToTab={setAdminTab} 
                    onSetPresetResident={setPresetResident} 
                    searchQuery={globalSearch}
                    setSearchQuery={setGlobalSearch}
                    debouncedSearchQuery={debouncedSearch}
                  />
                )}
                {adminTab === 'surat' && (
                  <AdminSurat 
                    presetResident={presetResident} 
                    onClearPresetResident={() => setPresetResident(null)} 
                    searchQuery={globalSearch}
                    setSearchQuery={setGlobalSearch}
                    debouncedSearchQuery={debouncedSearch}
                  />
                )}
                {adminTab === 'bantuan' && (
                  <AdminBantuan 
                    searchQuery={globalSearch}
                    setSearchQuery={setGlobalSearch}
                    debouncedSearchQuery={debouncedSearch}
                  />
                )}
                {adminTab === 'aspirasi' && (
                  <AdminAspirasi 
                    searchQuery={globalSearch}
                    setSearchQuery={setGlobalSearch}
                    debouncedSearchQuery={debouncedSearch}
                  />
                )}
                {adminTab === 'buku_tamu' && <AdminBukuTamu />}
                {adminTab === 'antrean' && (user.role === 'kades' || user.role === 'saas_admin') && <AdminApprovalQueue />}
                {adminTab === 'tenants' && user.role === 'saas_admin' && <AdminTenants />}
                {adminTab === 'log_aktivitas' && user.role === 'saas_admin' && <AdminSaaSLogs />}
                {adminTab === 'global_branding' && user.role === 'saas_admin' && <AdminGlobalBranding />}
                {adminTab === 'template_surat' && user.role === 'saas_admin' && <AdminSaaSTemplateSurat />}
                {adminTab === 'pengaturan' && <AdminPengaturan />}
                {adminTab === 'notifikasi' && (
                  <AdminNotifikasi 
                    searchQuery={globalSearch}
                    setSearchQuery={setGlobalSearch}
                    debouncedSearchQuery={debouncedSearch}
                  />
                )}
                {adminTab === 'ai_assistant' && <AdminAiAssistant />}
              </PageTransition>
              </div>
              {/* Impersonation Banner */}
              {isImpersonated && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 w-full max-w-xs md:max-w-md">
                  <button 
                    onClick={handleStopImpersonation}
                    className="w-full px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-3 hover:bg-rose-600 transition-all border border-white/10 group animate-in slide-in-from-bottom-10"
                  >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <div className="text-left">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-0.5">Mode Impersonasi</p>
                      <p className="text-sm">Kembali ke SaaS Admin</p>
                    </div>
                  </button>
                </div>
              )}

              <Footer isAdmin={true} />
            </div>
          </main>
        </div>
        <IntroductionTour role={user.role} />
        <ToastContainer />
        <GlobalUpdateNotifier />
      </div>
    );
  }


  return (
    <div className="flex h-screen bg-gray-50/50 dark:bg-slate-800/50 text-gray-900 dark:text-white font-sans overflow-hidden">
      <div className="lg:hidden">
        <Sidebar onLogout={handleLogout} activeTab={publicTab} setActiveTab={setPublicTab} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      </div>
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative pb-16 lg:pb-0">
        <Header 
          toggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)} 
          activeTab={publicTab}
          setActiveTab={setPublicTab}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] scroll-smooth">
          <div className="p-4 md:p-6 lg:p-8 pb-72 lg:pb-80 flex flex-col min-h-full">
            <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center w-full">
              <div></div>
              <div className="flex gap-3">
                 {(user.role === 'admin' || user.role === 'kades' || user.role === 'saas_admin') && (
                   <button onClick={() => setView('admin')} className="bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm dark:shadow-none hover:bg-emerald-700 transition-colors cursor-pointer">
                     Masuk Mode Admin Desa
                   </button>
                 )}
                 <button onClick={handleLogout} className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm dark:shadow-none border border-rose-200 transition-colors cursor-pointer">
                   Keluar Sesi
                 </button>
              </div>
            </div>
            
            
            <div className="flex-1 w-full">
              <PageTransition pageKey={publicTab}>
                {publicTab === 'dashboard' && <Dashboard setPublicTab={setPublicTab} />}
                {publicTab === 'profil_desa' && <ProfilDesa />}
                {publicTab === 'transparansi' && <TransparansiDana />}
                {publicTab === 'berita' && <BeritaDesa />}
                {publicTab === 'peta_wilayah' && <PetaWilayah />}
                {publicTab === 'layanan_mandiri' && <LayananMandiri />}
                {publicTab === 'aspirasi' && <AspirasiWarga />}
                {publicTab === 'ai_assistant' && <AiAssistant />}
              </PageTransition>
            </div>
            
            <Footer />
          </div>
        </main>

        {/* Mobile Navigation Bar matching user mockup request */}
        <nav className="fixed bottom-0 w-full h-16 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex justify-around items-center lg:hidden z-50 shadow-[0px_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
          <button 
             onClick={() => setPublicTab('dashboard')} 
             className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${publicTab === 'dashboard' ? 'text-emerald-800 font-bold' : 'text-gray-400'}`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">Utama</span>
          </button>
          <button 
             id="tour-mobile-layanan" onClick={() => setPublicTab('layanan_mandiri')} 
             className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${publicTab === 'layanan_mandiri' ? 'text-emerald-800 font-bold' : 'text-gray-400'}`}
          >
            <ShieldCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">Layanan</span>
          </button>
          
          <div className="relative -top-3">
            <button 
              id="tour-mobile-aspirasi" onClick={() => setPublicTab('aspirasi')}
              className="w-14 h-14 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full flex flex-col items-center justify-center shadow-lg dark:shadow-none shadow-emerald-700/30 active:scale-95 transition-all border-4 border-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square-text"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/></svg>
            </button>
          </div>
          
          <button 
             id="tour-mobile-berita" onClick={() => setPublicTab('berita')} 
             className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${publicTab === 'berita' ? 'text-emerald-800 font-bold' : 'text-gray-400'}`}
          >
            <Newspaper className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">Berita</span>
          </button>
          <button 
             onClick={() => setPublicTab('profil_desa')} 
             className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${publicTab === 'profil_desa' ? 'text-emerald-800 font-bold' : 'text-gray-400'}`}
          >
            <Building2 className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">Profil</span>
          </button>
        </nav>
      </div>
      <IntroductionTour role={user.role} />
      <ToastContainer />
      <GlobalUpdateNotifier />
    </div>
  );
}

