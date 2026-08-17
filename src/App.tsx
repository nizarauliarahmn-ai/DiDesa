import React, { useState } from 'react';
import { LayoutDashboard, Newspaper, ShieldCheck, Building2, ArrowLeft } from 'lucide-react';
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
import AdminProdukHukum from './components/admin/AdminProdukHukum';
import AdminPengaturan from './components/admin/AdminPengaturan';
import AdminNotifikasi from './components/admin/AdminNotifikasi';
import AdminTenants from './components/admin/AdminTenants';
import AdminAspirasi from './components/admin/AdminAspirasi';
import AdminBukuTamu from './components/admin/AdminBukuTamu';
import AdminUsulanDesa from './components/admin/AdminUsulanDesa';
import AdminBerita from './components/admin/AdminBerita';
import PublicBukuTamu from './components/PublicBukuTamu';
import PublicVerifikasiSurat from './components/PublicVerifikasiSurat';
import AdminAiAssistant from './components/admin/AdminAiAssistant';
import AdminSaaSLogs from './components/admin/AdminSaaSLogs';
import AdminSaaSLeads from './components/admin/AdminSaaSLeads';
import AdminGlobalBranding from './components/admin/AdminGlobalBranding';
import AdminSaaSGlobalUpdates from './components/admin/AdminSaaSGlobalUpdates';
import AdminSaaSBugReports from './components/admin/AdminSaaSBugReports';
import GlobalBugReportButton from './components/common/GlobalBugReportButton';
import AdminSaaSTemplateSurat from './components/admin/AdminSaaSTemplateSurat';
import AdminPanduan from './components/admin/AdminPanduan';
import ToastContainer from './components/common/ToastContainer';
import WaNotificationManager from './components/common/WaNotificationManager';
import { GlobalUpdateNotifier } from './components/GlobalUpdateNotifier';
import PageTransition from './components/common/PageTransition';
import Login from './components/Login';
import TenantNotFound from './components/TenantNotFound';
import TenantPending from './components/TenantPending';
import AdminPendingApprovals from './components/admin/AdminPendingApprovals';
import SaaSAffiliateManager from './components/admin/saas/SaaSAffiliateManager';
import Footer from './components/common/Footer';
import SyaratKetentuanPage from './pages/SyaratKetentuan';
import KebijakanPrivasiPage from './pages/KebijakanPrivasi';
import AffiliateLandingPage from './pages/AffiliateLandingPage';
import AffiliateDashboard from './pages/AffiliateDashboard';
import { subscribeGlobalBrandingRealtime, subscribeSaaSSettingsRealtime } from './utils/globalBrandingSync';
import { supabase } from './utils/supabase';
import { resolveCurrentTenant, clearTenantCache } from './utils/tenantResolver';
import { performLazyCleanup } from './utils/cleanupService';

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
import KioskKtpScanner from './components/KioskKtpScanner';
import SaasLandingPage from './components/SaasLandingPage';

function useUrlSync<T extends string>(
  key: string, 
  defaultValue: T, 
  customGetter?: () => T
): [T, (val: T) => void] {
  const [state, setState] = useState<T>(() => {
    if (customGetter) return customGetter();
    const urlParams = new URLSearchParams(window.location.search);
    return (urlParams.get(key) as T) || defaultValue;
  });

  // Kami menggunakan useCallback untuk menghindari customGetter memicu useEffect berulang kali jika tidak perlu
  // Tapi karena customGetter di-pass sebagai anonymous function, kita akan abaikan dependency-nya dan cukup dengarkan popstate
  React.useEffect(() => {
    const handlePopState = () => {
      if (customGetter) {
        setState(customGetter());
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        setState((urlParams.get(key) as T) || defaultValue);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [key, defaultValue]);

  const setUrlState = (newState: T) => {
    setState(newState);
    const url = new URL(window.location.href);
    if (newState === defaultValue) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, String(newState));
    }
    if (window.location.href !== url.href) {
      window.history.pushState({}, '', url);
    }
  };

  return [state, setUrlState];
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');


  
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  const isRootDomain = (parts.length < 3 || parts[0] === 'www' || parts[0] === 'didesa' || parts[0] === 'localhost') && !urlParams.get('tenant') && !urlParams.get('t_id');

  const [tenantValid, setTenantValid] = useState<boolean | null>(null);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);

  React.useEffect(() => {
    const verifyDomain = async () => {
      if (isRootDomain) {
        setTenantValid(true);
        setTenantStatus(null);
        return;
      }
      const tid = await resolveCurrentTenant();
      setTenantValid(tid !== null);
      if (tid !== null) {
        performLazyCleanup();
        // Cek status tenant: pending_approval / inactive -> blokir akses login
        try {
          const { data } = await supabase
            .from('tenants')
            .select('status')
            .eq('id', tid)
            .maybeSingle();
          setTenantStatus((data && data.status) || 'active');
        } catch (e) {
          setTenantStatus('active');
        }
      }
    };
    verifyDomain();
  }, [isRootDomain]);


  const [user, setUser] = useState<{ email: string; role: 'admin' | 'kades' | 'saas_admin' | 'public'; name: string; avatar: string } | null>(() => {
    if (new URLSearchParams(window.location.search).get('preview') === 'true') {
      return null;
    }
    const saved = localStorage.getItem('didesa_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useUrlSync<'public' | 'admin'>('mode', 'public', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'admin') {
      return 'admin';
    }
    if (urlParams.get('mode') === 'public' || urlParams.get('tab') === 'layanan_mandiri' || urlParams.get('portal') === 'warga') {
      return 'public';
    }
    if (urlParams.get('preview') === 'true') {
      return 'admin';
    }

    // Domain utama (sistemdidesa.id / www.sistemdidesa.id) SELALU menampilkan Landing Page Publik!
    if (isRootDomain && urlParams.get('mode') !== 'admin') {
      return 'public';
    }

    const saved = localStorage.getItem('didesa_auth_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.role === 'public' ? 'public' : 'admin';
    }
    return 'public';
  });

  // Clear cache to force reload letter classifications
  if (localStorage.getItem('letter_cache_version') !== 'v4') {
    localStorage.removeItem('letter_classifications');
    localStorage.removeItem('saas_global_letter_catalog');
    localStorage.setItem('letter_cache_version', 'v4');
  }

  // Wipe old dummy data (NOT village_officers — that's valid data synced from Supabase)
  if (localStorage.getItem('data_wipe_v1') !== 'true') {
    localStorage.removeItem('didesa_feedbacks');
    localStorage.removeItem('didesa_aspirasi_data');
    localStorage.removeItem('local_residents');
    localStorage.setItem('data_wipe_v1', 'true');
  }


  const [adminTab, setAdminTab] = useUrlSync<string>('admin_tab', 'dashboard');
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
  const [publicTab, setPublicTab] = useUrlSync<string>('tab', 'dashboard');
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
    // ✅ PRIMARY SYNC & REALTIME SUBSCRIPTION: 
    // Pull SaaS global branding from Supabase + subscribe to instant WebSocket events (<100ms)
    const unsubscribeRealtime = subscribeGlobalBrandingRealtime();

    // ✅ SAAS SETTINGS REALTIME: catalog template surat, feature flags, dll.
    // Menjamin semua perubahan SaaS Admin tersebar ke SEMUA device dalam <2 detik
    const unsubscribeSaaS = subscribeSaaSSettingsRealtime();

    // ✅ SECONDARY SYNC: Pull tenant-specific settings from Supabase
    // village_officers defaults ONLY set if Supabase returns empty (fresh tenant)
    const syncTenantSettings = async () => {
      try {
        const tid = await resolveCurrentTenant();
        if (!tid) {
          // No tenant — safe to set offline defaults if nothing in localStorage
          if (!localStorage.getItem('village_officers')) {
            const defaultOfficers = [
              { name: 'Kepala Desa', role: 'Kepala Desa', nip: '-' },
              { name: 'Sekretaris Desa', role: 'Sekretaris Desa', nip: '-' },
            ];
            localStorage.setItem('village_officers', JSON.stringify(defaultOfficers));
          }
          return;
        }

        // Fetch tenant details for name fallback
        const { data: tenant } = await supabase
          .from('tenants')
          .select('nama_desa')
          .eq('id', tid)
          .single();

        if (tenant) {
          const tName = tenant.nama_desa;
          if (tName) {
            localStorage.setItem('village_name', tName);
            const currentKop = localStorage.getItem('kop_desa');
            if (!currentKop || currentKop === 'Desa Sukamakmur' || currentKop === 'Sukamakmur') {
              localStorage.setItem('kop_desa', tName.toLowerCase().startsWith('desa') ? tName : `Desa ${tName}`);
            }
          }
        }

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
          // If Supabase has village_officers, it's already written above.
          // If NOT present in Supabase at all (fresh tenant), set generic defaults.
          const hasOfficers = data.some((r: any) => r.key === 'village_officers');
          if (!hasOfficers && !localStorage.getItem('village_officers')) {
            const defaultOfficers = [
              { name: 'Kepala Desa', role: 'Kepala Desa', nip: '-' },
              { name: 'Sekretaris Desa', role: 'Sekretaris Desa', nip: '-' },
            ];
            localStorage.setItem('village_officers', JSON.stringify(defaultOfficers));
          }
        } else if (!localStorage.getItem('village_officers')) {
          // saas_settings empty for this tenant (fresh install)
          const defaultOfficers = [
            { name: 'Kepala Desa', role: 'Kepala Desa', nip: '-' },
            { name: 'Sekretaris Desa', role: 'Sekretaris Desa', nip: '-' },
          ];
          localStorage.setItem('village_officers', JSON.stringify(defaultOfficers));
        }
        window.dispatchEvent(new Event('village_settings_updated'));
        window.dispatchEvent(new Event('app_theme_updated'));
        window.dispatchEvent(new Event('letter_font_updated'));
        window.dispatchEvent(new Event('letter_classifications_updated'));
      } catch (err) {
        console.warn('[App] Gagal sinkronisasi pengaturan desa:', err);
      }
    };
    syncTenantSettings();

    return () => {
      unsubscribeRealtime();
      unsubscribeSaaS();
    };
  }, []);

  // Theme and Security logic
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

    // SECURITY: Prevent cross-tenant data leakage on shared origins (localhost/testing)
    const verifyTenantMatch = async () => {
      const saved = localStorage.getItem('didesa_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.tenantId && parsed.role !== 'saas_admin') {
          // STRICT ROUTING: If on root domain, redirect to tenant subdomain!
          const hostname = window.location.hostname;
          const parts = hostname.split('.');
          const isRoot = (parts.length < 3 || parts[0] === 'www' || parts[0] === 'didesa' || parts[0] === 'localhost') && !window.location.search.includes('tenant=') && !window.location.search.includes('t_id=');
          
          if (isRoot) {
            const { data } = await supabase.from('tenants').select('domain').eq('id', parsed.tenantId).single();
            if (data && data.domain) {
              const targetUrl = hostname.includes('localhost')
                ? `${window.location.origin}?tenant=${data.domain}&mode=admin`
                : `https://${data.domain}.sistemdidesa.id?mode=admin`;
              window.location.href = targetUrl;
              return;
            }
          }

          const currentTenantId = await resolveCurrentTenant();
          if (currentTenantId !== parsed.tenantId) {
            console.warn('[Security] Tenant mismatch detected. Logging out to prevent data leakage.', parsed.tenantId, currentTenantId);
            handleLogout();
          }
        }
      }
    };
    verifyTenantMatch();

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
    // Clear ALL tenant-specific cache keys to prevent cross-session contamination
    const keysToRemove = [
      'didesa_auth_user', 
      'kop_desa', 
      'kop_kabupaten', 
      'kop_logo_url', 
      'village_name',
      'village_officers',
      'village_welcome_banner_url',
      'app_theme',
      'local_residents',
      'didesa_feedbacks',
      'didesa_aspirasi_data',
      'letter_classifications',
      'saas_global_letter_catalog',
      'letter_cache_version',
      'didesa_impersonator'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Reset React states
    setUser(null);
    setAdminTab('dashboard');
    setPublicTab('dashboard');
    
    // Clear resolver cache
    clearTenantCache();

    // Reload page to ensure all components start fresh and fetch correct default/tenant data
    window.location.href = '/';
  };

  // If not authenticated, force login screen UNLESS view is public
  if (tenantValid === null || (!isRootDomain && tenantStatus === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (urlParams.get('print') === 'qr_kiosk') {
    return <PrintQRKiosk />;
  }

  // Route /admin/usulan-desa → redirect ke mode admin + tab usulan desa
  if (window.location.pathname.includes('/admin/usulan-desa') && !urlParams.get('admin_tab')) {
    window.location.replace('/?mode=admin&admin_tab=usulan_desa');
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Remote KTP Scanner (Tablet Desa) — route /kiosk/scan
  if (window.location.pathname.includes('/kiosk/scan')) {
    return <><KioskKtpScanner /><ToastContainer /></>;
  }
  
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
  if (tabParam === 'verifikasi' || tabParam === 'verifikasi_surat' || urlParams.get('no') || urlParams.get('verify') || window.location.pathname.includes('/verifikasi')) {
    return <><PublicVerifikasiSurat /><ToastContainer /></>;
  }

  // Halaman dokumen legal publik (Syarat & Ketentuan / Kebijakan Privasi)
  if (window.location.pathname.includes('/syarat-ketentuan')) {
    return <><SyaratKetentuanPage /><Footer /><ToastContainer /></>;
  }
  if (window.location.pathname.includes('/kebijakan-privasi')) {
    return <><KebijakanPrivasiPage /><Footer /><ToastContainer /></>;
  }

  // Program Affiliator DiDesa
  if (window.location.pathname.includes('/affiliate/dashboard')) {
    return <AffiliateDashboard />;
  }
  if (
    window.location.pathname.includes('/afiliasi') ||
    window.location.pathname.includes('/affiliator') ||
    window.location.pathname.includes('/affiliate')
  ) {
    return <><AffiliateLandingPage /><ToastContainer /></>;
  }

  if (tenantValid === false) {
    return <TenantNotFound />;
  }

  // Blokir akses portal untuk desa yang belum disetujui / dinonaktifkan
  if (tenantStatus === 'pending_approval' || tenantStatus === 'inactive') {
    return <TenantPending status={tenantStatus === 'pending_approval' ? 'pending_approval' : 'inactive'} />;
  }

  if (!user && view !== 'public') {
    return (
      <>
        <Login onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setAdminTab('dashboard');
          setPublicTab('dashboard');
          setView(loggedInUser.role === 'public' ? 'public' : 'admin');
        }} />
        <ToastContainer />
        <GlobalUpdateNotifier isBusy={false} />
      </>
    );
  }

  // Jika kita di domain utama dan di mode publik, tampilkan SaaS Landing Page (Portal Pusat PT)
  if (view === 'public' && isRootDomain && tabParam !== 'verifikasi' && tabParam !== 'verifikasi_surat') {
    return <SaasLandingPage onLoginClick={() => setView('admin')} />;
  }

  // Determine if the user is in a "busy" state where reloading would cause data loss
  const isBusy = (view === 'admin' && adminTab === 'surat' && document.querySelector('form') !== null) || 
                 (view === 'public' && publicTab === 'layanan_surat');

  if (view === 'admin' && user) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-sans overflow-hidden print:h-auto print:overflow-visible print:block">
        <AdminSidebar setView={setView} activeTab={adminTab} setActiveTab={setAdminTab} onLogout={handleLogout} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 h-screen overflow-hidden relative transition-all duration-300 ease-in-out print:h-auto print:overflow-visible print:block">
          <main className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-800 scroll-smooth print:h-auto print:overflow-visible print:block">
            <AdminHeader 
              setActiveTab={setAdminTab} 
              globalSearch={globalSearch} 
              setGlobalSearch={setGlobalSearch} 
              activeTab={adminTab}
              toggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
              className="sticky top-0 z-50"
            />
            <div className="max-w-[1800px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-4 flex flex-col min-h-full print:p-0 print:block">
              <div className="flex-1 print:block">
                <PageTransition pageKey={adminTab}>
                {adminTab === 'dashboard' && <AdminDashboard setActiveTab={setAdminTab} />}
                {adminTab === 'produk_hukum' && <AdminProdukHukum />}
                {adminTab === 'aparatur' && (user.role === 'kades' || user.role === 'saas_admin') && <AdminAparatur />}
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
                {adminTab === 'usulan_desa' && <AdminUsulanDesa />}
                {adminTab === 'berita' && (
                  <AdminBerita 
                    searchQuery={globalSearch}
                    setSearchQuery={setGlobalSearch}
                    debouncedSearchQuery={debouncedSearch}
                  />
                )}
                {adminTab === 'panduan' && <AdminPanduan />}

                {adminTab === 'tenants' && user.role === 'saas_admin' && <AdminTenants />}
                {adminTab === 'saas_leads' && user.role === 'saas_admin' && <AdminSaaSLeads onSetActiveTab={setAdminTab} />}
                {adminTab === 'pending_approvals' && user.role === 'saas_admin' && <AdminPendingApprovals />}
                {adminTab === 'saas_affiliates' && user.role === 'saas_admin' && <SaaSAffiliateManager />}
                {adminTab === 'log_aktivitas' && user.role === 'saas_admin' && <AdminSaaSLogs />}
                {adminTab === 'log_pembaruan' && user.role === 'saas_admin' && <AdminSaaSGlobalUpdates />}
                {adminTab === 'saas_bugs' && user.role === 'saas_admin' && <AdminSaaSBugReports />}
                {adminTab === 'global_branding' && user.role === 'saas_admin' && <AdminGlobalBranding />}
                {adminTab === 'template_surat' && user.role === 'saas_admin' && <AdminSaaSTemplateSurat />}
                {adminTab === 'pengaturan' && (user.role === 'kades' || user.role === 'saas_admin') && <AdminPengaturan />}
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
        <WaNotificationManager />
        <GlobalUpdateNotifier isBusy={isBusy} enabled />
        {user.role !== 'saas_admin' && <GlobalBugReportButton />}
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
          user={user}
          onAdminLogin={() => setView('admin')}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] scroll-smooth transition-all duration-300 ease-in-out">
          <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-4 flex flex-col min-h-full">
            
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
      <ToastContainer />
      <WaNotificationManager />
      <GlobalUpdateNotifier isBusy={isBusy} />
      {user && user.role !== 'saas_admin' && <GlobalBugReportButton />}
    </div>
  );
}

