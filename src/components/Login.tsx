import React, { useState, useEffect } from 'react';
import { Building2, User, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, KeyRound, X, Mail, Phone, AlertCircle, Loader2 } from 'lucide-react';
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

  // Available Tenants for Global Login Dropdown
  const [allTenants, setAllTenants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Pada subdomain khusus SaaS (saas.sistemdidesa.id), langsung tampilkan
  // Login Pengelola Platform tanpa harus klik toggle "Masuk sebagai Pengelola".
  const [showSaaSLogin, setShowSaaSLogin] = useState(() => window.location.hostname.split('.')[0] === 'saas');

  // Determine if we are on a specific subdomain or explicit tenant parameter
  const [isSpecificSubdomain, setIsSpecificSubdomain] = useState(false);

  // Village Settings for Dynamic branding in login screen
  const [desaName, setDesaName] = useState('');
  const [kabupatenName, setKabupatenName] = useState(() => localStorage.getItem('kop_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan');
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png');

  // Global Branding
  const [globalName, setGlobalName] = useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalLogo, setGlobalLogo] = useState(() => localStorage.getItem('global_app_logo') || '');
  const [globalColor, setGlobalColor] = useState(() => localStorage.getItem('global_app_color') || '#047857');

  const [currentTenant, setCurrentTenant] = useState<any>(null);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  useEffect(() => {
    const initializeTenantAndBranding = async () => {
      try {
        // Load all registered tenants for global selection
        const { data: tenantsList } = await supabase.from('tenants').select('*').order('nama_desa', { ascending: true });
        if (tenantsList) {
          setAllTenants(tenantsList);
        }

        // Check if current URL is a specific subdomain or tenant parameter
        const urlParams = new URLSearchParams(window.location.search);
        const tenantParam = urlParams.get('tenant');
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        const hasSubdomain = parts.length >= 2 && !['www', 'localhost', 'didesa', 'dev', 'staging', 'preview', 'saas'].includes(parts[0]);
        
        const isSpecific = !!(tenantParam || hasSubdomain);
        setIsSpecificSubdomain(isSpecific);

        // Fetch Resolved Tenant
        const tenantId = await resolveCurrentTenant();
        if (tenantId) {
          const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
          if (data) {
            setCurrentTenant(data);
            if (isSpecific && data.nama_desa) {
              setDesaName(data.nama_desa);
            }
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

      // If a specific tenant is currently selected or resolved
      let targetTenant = currentTenant;

      if (!targetTenant) {
        showToast('Portal desa tidak ditemukan. Harap akses melalui subdomain yang benar.', 'error');
        setIsLoading(false);
        return;
      }

      // Verify credentials for the target tenant
      const { data: tenantMatches, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', targetTenant.id)
        .or(`admin_email.eq."${email}",kades_email.eq."${email}"`);

      if (error) throw error;

      const matchingTenantAdmin = tenantMatches?.find(t => t.admin_email?.toLowerCase() === email.toLowerCase() && t.admin_password === password);
      const matchingTenantKades = tenantMatches?.find(t => t.kades_email?.toLowerCase() === email.toLowerCase() && t.kades_password === password);

      if (matchingTenantKades) {
        if (matchingTenantKades.status === 'pending_approval') {
          setIsLoading(false);
          showToast('Pendaftaran Anda masih dalam proses verifikasi oleh Tim DiDesa. Silakan tunggu konfirmasi via WhatsApp.', 'error');
          return;
        }
        if (matchingTenantKades.status === 'inactive') {
          setIsLoading(false);
          showToast('Akun desa ini sedang dinonaktifkan. Hubungi Pengelola Platform untuk informasi lebih lanjut.', 'error');
          return;
        }
        const loggedUser = {
          email: email,
          role: 'kades' as const,
          name: `Super Admin ${matchingTenantKades.nama_desa}`,
          tenantId: matchingTenantKades.id,
          avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=Kades'
        };
        localStorage.setItem('kop_desa', matchingTenantKades.nama_desa);
        localStorage.setItem('village_name', matchingTenantKades.nama_desa);
        localStorage.setItem('didesa_auth_user', JSON.stringify(loggedUser));
        
        // Strict Root Domain Routing
        if (!isSpecificSubdomain && matchingTenantKades.domain) {
          const hostname = window.location.hostname;
          const targetUrl = hostname.includes('localhost')
            ? `${window.location.origin}?tenant=${matchingTenantKades.domain}&mode=admin`
            : `https://${matchingTenantKades.domain}.sistemdidesa.id?mode=admin`;
          window.location.href = targetUrl;
          return;
        }

        onLoginSuccess(loggedUser);
        showToast(`Selamat datang kembali di Portal Desa ${matchingTenantKades.nama_desa}!`, 'success');
        setIsLoading(false);
        return;
      }

      if (matchingTenantAdmin) {
        if (matchingTenantAdmin.status === 'pending_approval') {
          setIsLoading(false);
          showToast('Pendaftaran Anda masih dalam proses verifikasi oleh Tim DiDesa. Silakan tunggu konfirmasi via WhatsApp.', 'error');
          return;
        }
        if (matchingTenantAdmin.status === 'inactive') {
          setIsLoading(false);
          showToast('Akun desa ini sedang dinonaktifkan. Hubungi Pengelola Platform untuk informasi lebih lanjut.', 'error');
          return;
        }
        const loggedUser = {
          email: email,
          role: 'admin' as const,
          name: `Admin ${matchingTenantAdmin.nama_desa}`,
          tenantId: matchingTenantAdmin.id,
          avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=Admin'
        };
        localStorage.setItem('kop_desa', matchingTenantAdmin.nama_desa);
        localStorage.setItem('village_name', matchingTenantAdmin.nama_desa);
        localStorage.setItem('didesa_auth_user', JSON.stringify(loggedUser));
        
        // Strict Root Domain Routing
        if (!isSpecificSubdomain && matchingTenantAdmin.domain) {
          const hostname = window.location.hostname;
          const targetUrl = hostname.includes('localhost')
            ? `${window.location.origin}?tenant=${matchingTenantAdmin.domain}&mode=admin`
            : `https://${matchingTenantAdmin.domain}.sistemdidesa.id?mode=admin`;
          window.location.href = targetUrl;
          return;
        }

        onLoginSuccess(loggedUser);
        showToast(`Selamat datang kembali di Portal Desa ${matchingTenantAdmin.nama_desa}!`, 'success');
        setIsLoading(false);
        return;
      }

      showToast('Kata sandi yang Anda masukkan salah!', 'error');
      setIsLoading(false);
      return;

    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan koneksi saat memverifikasi akun.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotEmail('');
    setForgotPhone('');
    setForgotError('');
    setForgotSuccess(false);
    setShowForgotPassword(true);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    const email = forgotEmail.trim();
    const phone = forgotPhone.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneValid = /^(08|62|8)\d{8,13}$/.test(phone.replace(/[\s-]/g, ''));

    if (!emailValid) {
      setForgotError('Masukkan email terdaftar yang valid.');
      return;
    }
    if (!phoneValid) {
      setForgotError('Masukkan nomor WhatsApp aktif yang valid, contoh: 08xxxxxxxxxx.');
      return;
    }

    setForgotSubmitting(true);
    try {
      let saved = false;

      // Simpan ke tabel dedicated (jika sudah dibuat di Supabase)
      try {
        const { error } = await supabase.from('password_reset_requests').insert([{
          email,
          no_whatsapp: phone,
          status: 'pending',
          timestamp: new Date().toISOString(),
        }]);
        if (error) {
          console.warn('Insert ke password_reset_requests gagal:', error.message);
        } else {
          saved = true;
        }
      } catch (e) {
        console.warn('Kesalahan insert ke password_reset_requests:', e);
      }

      // Fallback: simpan ke saas_settings agar permintaan tidak hilang
      if (!saved) {
        try {
          const masterTenantId = '11111111-1111-1111-1111-111111111111';
          const { data: existing } = await supabase
            .from('saas_settings')
            .select('value')
            .eq('key', 'saas_password_reset_requests')
            .limit(1)
            .maybeSingle();
          const list = existing?.value ? JSON.parse(existing.value) : [];
          list.unshift({
            id: 'reset-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            email,
            no_whatsapp: phone,
            status: 'pending',
            timestamp: new Date().toISOString(),
          });
          const jsonStr = JSON.stringify(list);
          if (existing) {
            await supabase.from('saas_settings').update({ value: jsonStr }).eq('key', 'saas_password_reset_requests');
          } else {
            await supabase.from('saas_settings').insert({ tenant_id: masterTenantId, key: 'saas_password_reset_requests', value: jsonStr });
          }
          saved = true;
        } catch (e) {
          console.warn('Fallback ke saas_settings gagal:', e);
        }
      }

      if (!saved) {
        setForgotError('Gagal mengirim permintaan. Periksa koneksi Anda lalu coba lagi.');
        return;
      }

      setForgotSuccess(true);
    } finally {
      setForgotSubmitting(false);
    }
  };


  const welcomeBannerUrl = localStorage.getItem('village_welcome_banner_url') || 'https://images.unsplash.com/photo-1590123514210-90c74993a404?auto=format&fit=crop&q=80&w=2000';

  // Halaman Pengantar (Intro Page) untuk Pemilihan Desa di Domain Utama
  if (!isSpecificSubdomain && !showSaaSLogin) {
    const filteredTenants = allTenants.filter(t => 
      t.nama_desa?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.domain?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 p-4 relative overflow-hidden transition-colors duration-500">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-400/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-300/20 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#047857_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0" />

        <div className="w-full max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[32px] border border-white/90 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-emerald-950/20 p-8 sm:p-10 relative z-10 animate-in fade-in zoom-in-95 duration-300 flex flex-col h-[80vh] max-h-[600px]">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6 shrink-0">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md dark:shadow-none mb-4"
              style={{ backgroundColor: globalColor }}
            >
              {globalLogo ? (
                <img src={globalLogo} alt={globalName} className="w-8 h-8 object-contain" />
              ) : (
                <Building2 className="text-white w-8 h-8" />
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight leading-none mb-2 text-slate-900 dark:text-white">
              Pilih Portal Desa Anda
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Silakan cari dan pilih desa Anda untuk masuk ke sistem.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative mb-4 shrink-0">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik nama desa Anda..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-emerald-100 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold text-slate-900 dark:text-white placeholder:font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {allTenants.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                <p className="text-xs">Memuat daftar desa...</p>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Desa "{searchQuery}" tidak ditemukan</p>
                <p className="text-xs mt-1">Pastikan penulisan nama desa sudah benar.</p>
              </div>
            ) : (
              filteredTenants.map((tenant) => {
                const targetUrl = window.location.hostname.includes('localhost')
                  ? `${window.location.origin}?tenant=${tenant.domain}&mode=admin`
                  : `https://${tenant.domain}.sistemdidesa.id?mode=admin`;
                  
                return (
                  <a
                    key={tenant.id}
                    href={targetUrl}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 border border-transparent hover:border-emerald-100 dark:hover:border-slate-700 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center shrink-0 border border-gray-200 dark:border-slate-800 group-hover:border-emerald-200">
                      {tenant.logo_url ? (
                        <img src={tenant.logo_url} alt={tenant.nama_desa} className="w-6 h-6 object-contain" />
                      ) : (
                        <Building2 className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                        {tenant.nama_desa.startsWith('Desa') ? tenant.nama_desa : `Desa ${tenant.nama_desa}`}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                        {tenant.domain}.sistemdidesa.id
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <ArrowRight size={14} />
                    </div>
                  </a>
                );
              })
            )}
          </div>

          {/* Footer / Toggle SaaS */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800 text-center shrink-0">
            <button 
              onClick={() => setShowSaaSLogin(true)}
              className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-wider"
            >
              Masuk sebagai Pengelola Platform
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Halaman Login Bersih (Email/Password)
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
                <path d="M50 20 L80 45 L70 45 L70 75 L30 75 L30 45 L20 45 Z" fill="white" />
                <circle cx="50" cy="52" r="6" fill="#34d399" />
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
            {showSaaSLogin ? 'Pusat Pengelola SaaS' : `Sistem Digitalisasi ${desaName ? (desaName.startsWith('Desa') ? desaName : `Desa ${desaName}`) : 'Desa'}`}
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
                type="email"
                data-no-cap
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={showSaaSLogin ? 'admin@sistemdidesa.id' : `admin@${desaName ? desaName.toLowerCase().replace(/\s+/g, '') : 'desa'}.id`}
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 outline-none font-medium bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Kata Sandi
              </label>
              <button
                type="button"
                onClick={openForgotPassword}
                className="text-[10px] font-extrabold text-emerald-700 hover:underline"
              >
                Lupa Sandi?
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                data-no-cap
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
        <div className="mt-6 text-center space-y-4">
          {showSaaSLogin && (
            <button 
              onClick={() => setShowSaaSLogin(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-wider"
            >
              &larr; Kembali ke Pencarian Desa
            </button>
          )}
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Sistem Informasi Administrasi Desa & Layanan Mandiri Terintegrasi.<br />
            &copy; {new Date().getFullYear()} {globalName}. Seluruh Hak Cipta Dilindungi.
          </p>
        </div>
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

      {/* Lupa Sandi Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <KeyRound className="text-emerald-600" />
                Lupa Kata Sandi?
              </h3>
              <button onClick={() => setShowForgotPassword(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {forgotSuccess ? (
              <div className="px-6 py-8 space-y-4 text-center">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 size={28} />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  ✅ Permintaan Berhasil Dikirim! Tim Pengelola Platform akan memeriksa data Anda dan menghubungi via WhatsApp untuk proses reset kata sandi.
                </p>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full px-5 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  Mengerti, Tutup
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="px-6 py-5 space-y-4">
                <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-3">
                  <AlertCircle size={15} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                    Kata sandi dikelola terpusat oleh Pengelola Platform. Isi data berikut, tim kami akan menghubungi Anda setelah permintaan diverifikasi.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Email Terdaftar</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="admin@desaanda.id"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Nomor WhatsApp Aktif</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Gunakan format nomor Indonesia, contoh: 08123456789</p>
                </div>

                {forgotError && (
                  <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-xl px-3 py-2.5">
                    {forgotError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="w-full px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {forgotSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    'Kirim Permintaan Reset'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
