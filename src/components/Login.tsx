import React, { useState, useEffect } from 'react';
import { Building2, ShieldCheck, User, Lock, ArrowRight, Eye, EyeOff, Sparkles, CheckCircle2, Server } from 'lucide-react';
import { showToast } from '../utils/toast';
import { supabase } from '../utils/supabase';
import { resolveCurrentTenant } from '../utils/tenantResolver';

interface LoginProps {
  onLoginSuccess: (user: { email: string; role: 'admin' | 'kades' | 'saas_admin' | 'public'; name: string; avatar: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Village Settings for Dynamic branding in login screen
  const [desaName, setDesaName] = useState(() => localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
  const [kabupatenName, setKabupatenName] = useState(() => localStorage.getItem('kop_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan');
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png');

  // Global Branding
  const [globalName, setGlobalName] = useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalLogo, setGlobalLogo] = useState(() => localStorage.getItem('global_app_logo') || '');
  const [globalColor, setGlobalColor] = useState(() => localStorage.getItem('global_app_color') || '#047857');

  const [currentTenant, setCurrentTenant] = useState<any>(null);

  useEffect(() => {
    const initializeTenantAndBranding = async () => {
      try {
        // Fetch Tenant
        const tenantId = await resolveCurrentTenant();
        if (tenantId) {
          const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
          if (data) {
            setCurrentTenant(data);
            setDesaName(data.nama_desa || 'Desa Sukamakmur');
          }
        }
        
        // Fetch Global SaaS Branding Online
        const { data: brandingData } = await supabase.from('global_settings').select('key, value');
        if (brandingData && brandingData.length > 0) {
          brandingData.forEach((setting: any) => {
            if (setting.key === 'global_app_name' && setting.value && setting.value.trim() !== '') {
              setGlobalName(setting.value);
              localStorage.setItem('global_app_name', setting.value);
            }
            if (setting.key === 'global_app_logo' && setting.value && setting.value.trim() !== '') {
              setGlobalLogo(setting.value);
              localStorage.setItem('global_app_logo', setting.value);
            }
            if (setting.key === 'global_app_color' && setting.value && setting.value.trim() !== '') {
              setGlobalColor(setting.value);
              localStorage.setItem('global_app_color', setting.value);
            }
          });
        }
      } catch (error) {
        console.error('Failed to fetch online settings:', error);
      }
    };
    initializeTenantAndBranding();
    
    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
      setKabupatenName(localStorage.getItem('kop_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan');
      setLogoUrl(localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showToast('Harap masukkan email dan kata sandi!', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // Check if it's the default super-user for SaaS admin
      if (email === 'admin@sistemdidesa.id' && password === 'saas123') {
        const loggedUser = {
          email: email,
          role: 'saas_admin' as const,
          name: 'Pemilik Platform (SaaS)',
          avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=SaaS'
        };
        localStorage.setItem('didesa_auth_user', JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
        showToast(`Selamat datang kembali, ${loggedUser.name}!`, 'success');
        setIsLoading(false);
        return;
      }

      // MUST STRICTLY ENFORCE: Only check credentials against the CURRENT domain/tenant!
      if (!currentTenant?.id) {
        showToast('Domain atau Desa tidak valid. Silakan gunakan link website desa Anda yang benar.', 'error');
        setIsLoading(false);
        return;
      }

      // Check credentials in Supabase tenants table, STRICTLY for the current tenant
      const { data: tenantMatches, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', currentTenant.id) // SECURITY FIX: Lock query to the active domain's tenant ID
        .or(`admin_email.eq."${email}",kades_email.eq."${email}"`);

      if (error) throw error;
      const matchingTenantAdmin = tenantMatches?.find(t => t.admin_email?.toLowerCase() === email.toLowerCase() && t.admin_password === password);
      const matchingTenantKades = tenantMatches?.find(t => t.kades_email?.toLowerCase() === email.toLowerCase() && t.kades_password === password);


      if (matchingTenantKades) {
        // Log in as Super Admin for this tenant
        const loggedUser = {
          email: email,
          role: 'kades' as const,
          name: `Super Admin ${matchingTenantKades.nama_desa}`,
          tenantId: matchingTenantKades.id,
          avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=Kades'
        };
        localStorage.setItem('kop_desa', matchingTenantKades.nama_desa);
        localStorage.setItem('didesa_auth_user', JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
        showToast(`Selamat datang kembali di Portal Desa ${matchingTenantKades.nama_desa}!`, 'success');
        setIsLoading(false);
        return;
      }

      if (matchingTenantAdmin) {
        // Log in as Admin for this tenant
        const loggedUser = {
          email: email,
          role: 'admin' as const,
          name: `Admin ${matchingTenantAdmin.nama_desa}`,
          tenantId: matchingTenantAdmin.id,
          avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=Admin'
        };
        localStorage.setItem('kop_desa', matchingTenantAdmin.nama_desa);
        localStorage.setItem('didesa_auth_user', JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
        showToast(`Selamat datang kembali di Portal Desa ${matchingTenantAdmin.nama_desa}!`, 'success');
        setIsLoading(false);
        return;
      }

      // Jika tidak ada yang cocok di database
      showToast('Email atau kata sandi salah! Pastikan kredensial Anda terdaftar di desa ini.', 'error');
      setIsLoading(false);
      return;

    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan koneksi, masuk menggunakan mode demo offline.', 'error');
    } finally {
      setIsLoading(false);
    }
  };


  const welcomeBannerUrl = localStorage.getItem('village_welcome_banner_url') || 'https://images.unsplash.com/photo-1590123514210-90c74993a404?auto=format&fit=crop&q=80&w=2000';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 p-4 relative overflow-hidden transition-colors duration-500">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-400/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-300/20 blur-[100px] pointer-events-none" />

      {/* Subtle Dot Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#047857_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0" />

      {/* Glassmorphism Login Card Container */}
      <div className="w-full max-w-[420px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[32px] border border-white/90 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-emerald-950/20 p-8 sm:p-10 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md dark:shadow-none mb-4 transition-all duration-300 overflow-hidden shrink-0"
            style={{ backgroundColor: globalColor }}
          >
            {globalLogo ? (
              <img src={globalLogo} alt={globalName} className="w-10 h-10 object-contain animate-fade-in" />
            ) : (
              <svg viewBox="0 0 100 100" className="w-9 h-9" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Smart Village building icon in white */}
                <path d="M50 20 L80 45 L70 45 L70 75 L30 75 L30 45 L20 45 Z" fill="white" />
                {/* Tech glowing node in the center */}
                <circle cx="50" cy="52" r="6" fill="#34d399" />
                {/* Connection lines */}
                <line x1="50" y1="52" x2="50" y2="75" stroke="#34d399" strokeWidth="3" />
                <line x1="30" y1="45" x2="50" y2="52" stroke="#34d399" strokeWidth="2" />
                <line x1="70" y1="45" x2="50" y2="52" stroke="#34d399" strokeWidth="2" />
              </svg>
            )}
          </div>
          
          <h1 className="text-2xl font-black tracking-tight leading-none mb-2" style={{ color: globalColor }}>
            {globalName}
          </h1>
          <p className="text-xs font-bold text-emerald-800/70 dark:text-emerald-400/70 uppercase tracking-widest leading-none">
            Portal Digital Terpadu
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Email atau Nama Pengguna
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <User size={16} />
              </span>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={currentTenant?.admin_email || 'admin@sukamakmur.desa.id'}
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 outline-none font-medium bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Kata Sandi
              </label>
              <a href="#" className="text-[10px] font-extrabold text-emerald-700 hover:underline">
                Lupa Sandi?
              </a>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 outline-none font-medium bg-slate-50/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-700"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-2 text-white font-bold text-xs rounded-xl transition-all duration-200 shadow-md dark:shadow-none flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: globalColor, boxShadow: `0 4px 12px ${globalColor}33` }}
          >
            <span>{isLoading ? 'Menghubungkan...' : 'Masuk Sekarang'}</span>
            {!isLoading && <ArrowRight size={14} />}
          </button>
        </form>

        {/* Footer */}
        <p className="text-[10px] text-center text-gray-400 mt-6 leading-relaxed">
          Sistem Informasi Administrasi Desa & Layanan Mandiri Terintegrasi.<br />
          &copy; {new Date().getFullYear()} {globalName}. Seluruh Hak Cipta Dilindungi.
        </p>
      </div>

      {/* Trust Badge Indicators */}
      <div className="flex items-center gap-6 mt-6 relative z-10 text-gray-400 font-semibold text-[10px] uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sistem Aman Enkripsi</span>
        </div>
        <div className="h-4 w-[1px] bg-gray-200"></div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Layanan Digital Mandiri</span>
        </div>
      </div>
    </div>
  );
}
