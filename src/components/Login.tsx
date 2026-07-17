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
  const [role, setRole] = useState<'admin' | 'kades' | 'saas_admin' | 'public'>('admin');
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
    const initializeTenant = async () => {
      const tenantId = await resolveCurrentTenant();
      if (tenantId) {
        const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
        if (data) {
          setCurrentTenant(data);
          setDesaName(data.nama_desa || 'Desa Sukamakmur');
          // Update global names based on tenant
        }
      }
    };
    initializeTenant();
    
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
          avatar: 'https://i.pravatar.cc/150?img=60'
        };
        localStorage.setItem('didesa_auth_user', JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
        showToast(`Selamat datang kembali, ${loggedUser.name}!`, 'success');
        setIsLoading(false);
        return;
      }

      // Check credentials in Supabase tenants table
      const { data: tenantMatches, error } = await supabase
        .from('tenants')
        .select('*')
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
          avatar: 'https://i.pravatar.cc/150?img=47'
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
          avatar: 'https://i.pravatar.cc/150?img=12'
        };
        localStorage.setItem('kop_desa', matchingTenantAdmin.nama_desa);
        localStorage.setItem('didesa_auth_user', JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
        showToast(`Selamat datang kembali di Portal Desa ${matchingTenantAdmin.nama_desa}!`, 'success');
        setIsLoading(false);
        return;
      }

      // Fallback to default demo logins if matching failed
      const isSuper = role === 'kades' || role === 'saas_admin' || email.includes('kades') || email.includes('saas');
      const isAdminUser = role === 'admin' || role === 'kades' || role === 'saas_admin' || email.includes('admin') || isSuper;

      if (isAdminUser) {
        if (password.length < 3) {
          showToast('Kata sandi terlalu pendek (minimal 3 karakter)!', 'error');
          setIsLoading(false);
          return;
        }
        
        const loggedUser = {
          email: email || (isSuper ? 'kades@sukamakmur.desa.id' : 'admin@sukamakmur.desa.id'),
          role: role as any,
          name: role === 'saas_admin' ? 'Pemilik Platform' : role === 'kades' ? (localStorage.getItem('village_super_admin') || 'Super Admin') : 'Admin',
          avatar: isSuper ? 'https://i.pravatar.cc/150?img=47' : 'https://i.pravatar.cc/150?img=12'
        };

        localStorage.setItem('didesa_auth_user', JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
        showToast(`Selamat datang kembali, ${loggedUser.name}!`, 'success');
      } else {
        const loggedUser = {
          email: email,
          role: 'public' as const,
          name: email.split('@')[0].toUpperCase().replace('.', ' ') || 'Warga Sukamakmur',
          avatar: 'https://i.pravatar.cc/150?img=11'
        };

        localStorage.setItem('didesa_auth_user', JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
        showToast(`Selamat datang di Portal Layanan Publik, ${loggedUser.name}!`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan koneksi, masuk menggunakan mode demo offline.', 'error');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 relative overflow-hidden px-4 py-8">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-12 -translate-y-12"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-12 translate-y-12"></div>

      {/* Login Card Container */}
      <div className="w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 p-6 md:p-8 relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8 bg-slate-50/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md dark:shadow-none mb-3 transition-all duration-300 overflow-hidden"
            style={{ backgroundColor: globalColor }}
          >
            {globalLogo ? (
              <img src={globalLogo} alt="Logo" className="w-11 h-11 object-contain animate-fade-in" />
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
          
          <h1 className="text-2xl font-black tracking-tight leading-none mb-1.5" style={{ color: globalColor }}>
            {globalName}
          </h1>
          <p className="text-[11px] font-black text-emerald-800 uppercase tracking-widest leading-none">
            Sistem Digitalisasi Desa
          </p>
        </div>

        {/* Tab Selector for Login Role */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setRole('admin');
              setEmail('');
              setPassword('');
            }}
            className={`py-2.5 rounded-xl text-xs font-extrabold transition-all ${
              role === 'admin' || role === 'kades'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 shadow-sm dark:shadow-none'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
            }`}
          >
            Sistem Admin Desa
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('public');
              setEmail('');
              setPassword('');
            }}
            className={`py-2.5 rounded-xl text-xs font-extrabold transition-all ${
              role === 'public'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 shadow-sm dark:shadow-none'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
            }`}
          >
            Portal Layanan Warga
          </button>
        </div>

        {/* Sub-role Selector for Admin */}
        {(role === 'admin' || role === 'kades') && (
          <div className="flex gap-2 p-1 bg-emerald-50/50 rounded-2xl mb-6 border border-emerald-100/50">
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`flex-1 py-2 rounded-xl text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                role === 'admin'
                  ? 'bg-emerald-800 text-white shadow-sm dark:shadow-none font-black'
                  : 'text-emerald-800/70 hover:bg-emerald-50 hover:text-emerald-900'
              }`}
            >
              <User size={12} />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('kades')}
              className={`flex-1 py-2 rounded-xl text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                role === 'kades'
                  ? 'bg-emerald-800 text-white shadow-sm dark:shadow-none font-black'
                  : 'text-emerald-800/70 hover:bg-emerald-50 hover:text-emerald-900'
              }`}
            >
              <ShieldCheck size={12} />
              <span>Super Admin</span>
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
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
                placeholder={role === 'admin' ? (currentTenant?.admin_email || 'admin@sukamakmur.desa.id') : 'warga@sukamakmur.desa.id'}
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
          © {new Date().getFullYear()} {desaName}. Seluruh Hak Cipta Dilindungi.
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
