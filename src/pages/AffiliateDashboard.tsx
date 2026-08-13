import React, { useEffect, useState, useCallback } from 'react';
import {
  Copy, Check, Link2, TicketPercent, Share2, Download, Users, Wallet,
  BadgeCheck, TrendingUp, CircleDollarSign, Plus, Search, ExternalLink,
  RefreshCw, ArrowLeft, Landmark, ClipboardList, LogOut, Megaphone
} from 'lucide-react';
import { supabase } from '../utils/supabase';

const formatRupiah = (value: number) =>
  'Rp ' + Math.round(value || 0).toLocaleString('id-ID');

const formatDate = (iso?: string) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

type Affiliate = {
  id: string;
  nama?: string;
  email?: string;
  no_wa?: string;
  daerah_kerja?: string;
  referral_code?: string;
  custom_voucher_code?: string;
  status?: string;
  commission_rate?: number;
};

type Referral = {
  id: string;
  affiliate_id: string;
  village_id?: string;
  village_name?: string;
  status?: string;
  commission_amount?: number;
  created_at?: string;
};

type Payout = {
  id: string;
  affiliate_id: string;
  amount?: number;
  status?: string;
  payment_receipt_url?: string;
  created_at?: string;
};

type AuthUser = {
  name?: string;
  email?: string;
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  approved: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  paid: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  trial: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
};

export default function AffiliateDashboard() {
  const [globalName, setGlobalName] = useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalColor, setGlobalColor] = useState(() => localStorage.getItem('global_app_color') || '#047857');

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [registerSource, setRegisterSource] = useState<'session' | 'email' | null>(null);

  const [voucherCode, setVoucherCode] = useState('');
  const [isSavingVoucher, setIsSavingVoucher] = useState(false);
  const [voucherSaved, setVoucherSaved] = useState(false);

  const [villageDomain, setVillageDomain] = useState('');
  const [isAddingVillage, setIsAddingVillage] = useState(false);
  const [addError, setAddError] = useState('');
  const [addingMessage, setAddingMessage] = useState('');

  const [copiedKey, setCopiedKey] = useState('');

  const referralLink = affiliate?.referral_code
    ? `${window.location.origin}/afiliasi?ref=${affiliate.referral_code}`
    : '';

  const activeCount = referrals.filter(r => r.status === 'active').length;
  const commissionRate = affiliate?.commission_rate || 0;
  const estimatedMonthly = activeCount * commissionRate;
  const pendingPayout = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaidOut = payouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleCopyWithStatus = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    }
  };

  const loadData = useCallback(async (affiliateId: string) => {
    const [refRes, payRes] = await Promise.all([
      supabase.from('affiliate_referrals').select('*').eq('affiliate_id', affiliateId).order('created_at', { ascending: false }),
      supabase.from('affiliate_payouts').select('*').eq('affiliate_id', affiliateId).order('created_at', { ascending: false })
    ]);
    if (!refRes.error) setReferrals(refRes.data || []);
    if (!payRes.error) setPayouts(payRes.data || []);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const authStr = localStorage.getItem('didesa_auth_user');
      if (authStr) {
        try {
          setAuthUser(JSON.parse(authStr));
        } catch (_) { /* abaikan */ }
      }

      let affiliateData: Affiliate | null = null;

      // Prioritas 1: sesi dari form pendaftaran landing page
      const sessionStr = localStorage.getItem('didesa_affiliate_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session.id) {
            const { data } = await supabase.from('affiliates').select('*').eq('id', session.id).single();
            if (data) {
              affiliateData = data;
              setRegisterSource('session');
            }
          }
        } catch (_) { /* abaikan */ }
      }

      // Prioritas 2: cari berdasarkan email user yang login
      if (!affiliateData && authStr) {
        let email = '';
        try {
          const parsed = JSON.parse(authStr);
          email = (parsed.email || '').trim().toLowerCase();
        } catch (_) { /* abaikan */ }
        if (email) {
          const { data } = await supabase
            .from('affiliates')
            .select('*')
            .or(`email.eq.${email},user_email.eq.${email}`)
            .limit(1)
            .maybeSingle();
          if (data) {
            affiliateData = data;
            setRegisterSource('email');
          }
        }
      }

      if (mounted) {
        if (affiliateData) {
          setAffiliate(affiliateData);
          setVoucherCode(affiliateData.custom_voucher_code || '');
          const auth: AuthUser = {};
          if (affiliateData.nama) auth.name = affiliateData.nama;
          if (authUser?.name) auth.name = authUser.name;
          if (authUser?.email) auth.email = authUser.email;
          setAuthUser({ name: affiliateData.nama || authUser?.name || 'Afiliator', email: affiliateData.email || authUser?.email || '' });
          await loadData(affiliateData.id);
        }
        setIsLoading(false);
      }
    };

    init();

    const handleBranding = () => {
      setGlobalName(localStorage.getItem('global_app_name') || 'DiDesa');
      setGlobalColor(localStorage.getItem('global_app_color') || '#047857');
    };
    window.addEventListener('global_branding_updated', handleBranding);

    return () => {
      mounted = false;
      window.removeEventListener('global_branding_updated', handleBranding);
    };
  }, [loadData]);

  const handleSaveVoucher = async () => {
    if (!affiliate) return;
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;
    setIsSavingVoucher(true);
    setVoucherSaved(false);
    const { error } = await supabase
      .from('affiliates')
      .update({ custom_voucher_code: code })
      .eq('id', affiliate.id);
    setIsSavingVoucher(false);
    if (!error) {
      setAffiliate({ ...affiliate, custom_voucher_code: code });
      setVoucherSaved(true);
      setTimeout(() => setVoucherSaved(false), 2500);
    }
  };

  const handleAddVillage = async () => {
    if (!affiliate) return;
    const domain = villageDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain) return;
    setIsAddingVillage(true);
    setAddError('');
    setAddingMessage('');

    try {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, nama_desa')
        .ilike('domain', `%${domain}%`)
        .limit(1)
        .maybeSingle();

      if (tenantError || !tenant) {
        setAddError('Desa tidak ditemukan. Pastikan domain yang dimasukkan benar (cth: wasah.didesa.id).');
        setIsAddingVillage(false);
        return;
      }

      const { data: existing } = await supabase
        .from('affiliate_referrals')
        .select('id')
        .eq('affiliate_id', affiliate.id)
        .eq('village_id', tenant.id)
        .maybeSingle();

      if (existing) {
        setAddError('Desa ini sudah terdaftar dalam daftar referensi Anda.');
        setIsAddingVillage(false);
        return;
      }

      const { error: refError } = await supabase
        .from('affiliate_referrals')
        .insert([{
          affiliate_id: affiliate.id,
          village_id: tenant.id,
          village_name: tenant.nama_desa,
          status: 'trial',
          commission_amount: 0
        }]);

      if (refError) {
        setAddError('Gagal menambahkan desa. Silakan coba lagi.');
      } else {
        setAddingMessage(`Desa "${tenant.nama_desa}" berhasil ditambahkan sebagai referensi dan menunggu verifikasi tim.`);
        setVillageDomain('');
        await loadData(affiliate.id);
      }
    } catch (_) {
      setAddError('Terjadi kesalahan. Silakan coba lagi.');
    }
    setIsAddingVillage(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('didesa_affiliate_session');
    window.location.reload();
  };

  const waMessage = affiliate
    ? encodeURIComponent(
        `Halo! Saya ${authUser?.name || 'afiliator'} dari DiDesa. Saya merekomendasikan ${globalName} untuk digitalisasi administrasi desa Anda. Simak informasi lengkapnya di ${referralLink} dengan kode voucher ${affiliate.custom_voucher_code || affiliate.referral_code}.`
      )
    : '';

  // State tampilan ketika belum ditemukan akun affiliator
  if (!isLoading && !affiliate) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-sans flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-5">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black">Belum Ada Akun Affiliator</h2>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            {authUser?.email ? (
              <>Akun dengan email <strong>{authUser.email}</strong> belum terdaftar sebagai affiliator.</>
            ) : (
              <>Anda belum login. Gunakan email yang terdaftar, atau daftarkan diri Anda sebagai affiliator terlebih dahulu.</>
            )}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <a href="/afiliasi" className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <Megaphone className="w-4 h-4" /> Daftar Jadi Affiliator
            </a>
            <a href="/" className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
            </a>
          </div>
        </div>
      </div>
    );
  }

  // State tampilan loading
  const statCards = [
    { icon: Users, label: 'Total Referensi', value: String(referrals.length), sub: 'Desa' },
    { icon: BadgeCheck, label: 'Desa Aktif', value: String(activeCount), sub: 'Berjalan' },
    { icon: TrendingUp, label: 'Estimasi Komisi / Bulan', value: formatRupiah(estimatedMonthly), sub: `${activeCount} x ${formatRupiah(commissionRate)}` },
    { icon: Wallet, label: 'Payout Menunggu', value: formatRupiah(pendingPayout), sub: 'Belum dicairkan' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-sans pb-16">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md"
              style={{ backgroundColor: globalColor }}
            >
              {localStorage.getItem('global_app_logo') ? (
                <img src={localStorage.getItem('global_app_logo') || ''} alt={globalName} className="w-6 h-6 object-contain" />
              ) : (
                globalName.charAt(0)
              )}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black tracking-tight uppercase">{globalName}</p>
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Dashboard Affiliator</p>
            </div>
          </a>
          <div className="flex items-center gap-3">
            {authUser?.name && (
              <span className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <Landmark className="w-4 h-4 text-emerald-600" /> {authUser.name}
              </span>
            )}
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Selamat datang */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Halo, {authUser?.name || 'Afiliator'} 👋
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Pantau performa referensi dan komisi Anda di sini.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {affiliate && referralLink && (
              <button
                onClick={() => {
                  const el = document.getElementById('tambahkan-desa');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Tambah Desa
              </button>
            )}
            <button onClick={() => { if (affiliate) loadData(affiliate.id); }} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors">
              <RefreshCw className="w-4 h-4" /> Muat Ulang
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
            <p className="mt-4 text-sm font-semibold text-slate-500">Memuat dashboard...</p>
          </div>
        ) : (
          <>
            {/* Status Akun */}
            <div className="mb-7 rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-emerald-700 to-teal-600 border-emerald-600/30 text-white shadow-lg shadow-emerald-900/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Status Keanggotaan</p>
                  <p className="text-lg font-black mt-0.5 capitalize">
                    {affiliate?.status || 'undetermined'}
                    <span className="ml-2 text-[11px] font-bold text-emerald-100 normal-case">
                      {registerSource === 'session' ? '• Terdaftar via landing page' : registerSource === 'email' ? '• Terverifikasi via email' : ''}
                    </span>
                  </p>
                  {affiliate?.daerah_kerja && (
                    <p className="text-xs font-semibold text-emerald-100/80 mt-0.5">Wilayah kerja: {affiliate.daerah_kerja}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Komisi / Desa</p>
                <p className="text-2xl font-black mt-0.5">{formatRupiah(commissionRate)}</p>
              </div>
            </div>

            {/* Kartu statistik */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statCards.map((card, i) => (
                <div key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                      <card.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xl font-black truncate">{card.value}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{card.label}</p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{card.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Referral Toolkit */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                  <h2 className="font-black text-lg flex items-center gap-2 mb-5">
                    <Link2 className="w-5 h-5 text-emerald-600" /> Referral Toolkit
                  </h2>

                  <div className="space-y-5">
                    {affiliate?.referral_code && (
                      <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Link Referral Anda</label>
                        <div className="mt-2 flex items-stretch gap-2">
                          <input
                            readOnly
                            value={referralLink}
                            onFocus={e => e.target.select()}
                            className="flex-1 min-w-0 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500 truncate"
                          />
                          <button
                            onClick={() => handleCopyWithStatus('link', referralLink)}
                            className="px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shrink-0"
                          >
                            {copiedKey === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copiedKey === 'link' ? 'Disalin' : 'Salin'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Kode Referral */}
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kode Referral</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="font-black text-lg tracking-wider text-emerald-700 dark:text-emerald-400">{affiliate?.referral_code}</p>
                          <button
                            onClick={() => handleCopyWithStatus('kode', affiliate?.referral_code || '')}
                            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600 transition-colors"
                          >
                            {copiedKey === 'kode' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Kode Voucher */}
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <TicketPercent className="w-3.5 h-3.5 text-emerald-600" /> Kode Voucher Kustom
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={voucherCode}
                            onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                            placeholder="cth: DESABOGOR25"
                            maxLength={20}
                            className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold uppercase outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={handleSaveVoucher}
                            disabled={isSavingVoucher}
                            className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                          >
                            {isSavingVoucher ? '...' : voucherSaved ? <Check className="w-4 h-4" /> : 'Simpan'}
                          </button>
                        </div>
                        {voucherSaved && <p className="mt-1 text-[10px] font-bold text-emerald-600">Kode voucher berhasil disimpan.</p>}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <a
                        href={`https://wa.me/?text=${waMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-black transition-all active:scale-[0.98]"
                      >
                        <Share2 className="w-4 h-4" /> Bagikan via WhatsApp
                      </a>
                      <button
                        onClick={() => handleCopyWithStatus('template', waMessage)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-black transition-all active:scale-[0.98]"
                      >
                        {copiedKey === 'template' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copiedKey === 'template' ? 'Template Disalin' : 'Salin Template Promosi'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tambah Desa */}
                <div id="tambahkan-desa" className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                  <h2 className="font-black text-lg flex items-center gap-2 mb-2">
                    <Plus className="w-5 h-5 text-emerald-600" /> Tambah Referensi Desa
                  </h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-5">
                    Masukkan domain desa yang Anda referensikan untuk mendaftarkan sebagai referensi (cth: <strong>wasah.didesa.id</strong>).
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={villageDomain}
                      onChange={e => setVillageDomain(e.target.value)}
                      placeholder="domain.didesa.id"
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleAddVillage}
                      disabled={isAddingVillage}
                      className="px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      {isAddingVillage ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                      {isAddingVillage ? 'Memeriksa...' : 'Daftarkan'}
                    </button>
                  </div>
                  {addError && <p className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400">⚠️ {addError}</p>}
                  {addingMessage && <p className="mt-3 text-sm font-semibold text-emerald-600">✅ {addingMessage}</p>}
                </div>

                {/* Riwayat Referensi */}
                <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                  <h2 className="font-black text-lg flex items-center gap-2 mb-5">
                    <Users className="w-5 h-5 text-emerald-600" /> Daftar Referensi Desa
                  </h2>
                  {referrals.length === 0 ? (
                    <p className="text-sm font-medium text-slate-400 py-6 text-center">
                      Belum ada referensi. Tambahkan desa pertama Anda di atas.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[520px]">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-700/60">
                            <th className="py-3 pr-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Desa</th>
                            <th className="py-3 pr-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="py-3 pr-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Komisi</th>
                            <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Terdaftar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {referrals.map(r => (
                            <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                              <td className="py-3.5 pr-4 font-bold text-sm">{r.village_name || 'Desa (ID: ' + r.village_id + ')'}</td>
                              <td className="py-3.5 pr-4">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_BADGE[r.status || 'trial']}`}>
                                  {r.status || 'trial'}
                                </span>
                              </td>
                              <td className="py-3.5 pr-4 font-bold text-sm text-emerald-700 dark:text-emerald-400">{formatRupiah(r.commission_amount || 0)}</td>
                              <td className="py-3.5 text-xs font-semibold text-slate-400">{formatDate(r.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Kolom kanan */}
              <div className="space-y-6">
                {/* Riwayat Payout */}
                <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                  <h2 className="font-black text-lg flex items-center gap-2 mb-1">
                    <CircleDollarSign className="w-5 h-5 text-emerald-600" /> Riwayat Payout
                  </h2>
                  <div className="flex items-center justify-between text-sm font-bold text-slate-500 mb-5">
                    <span>Total dicairkan</span>
                    <span className="text-emerald-700 dark:text-emerald-400">{formatRupiah(totalPaidOut)}</span>
                  </div>
                  {payouts.length === 0 ? (
                    <p className="text-sm font-medium text-slate-400 py-4 text-center">
                      Belum ada riwayat payout. Komisi kumulatif dapat diajukan pencairan melalui tim kami.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {payouts.map(p => (
                        <div key={p.id} className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-black text-sm">{formatRupiah(p.amount || 0)}</p>
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_BADGE[p.status || 'pending']}`}>
                              {p.status || 'pending'}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11px] font-semibold text-slate-400">Diajukan: {formatDate(p.created_at)}</p>
                          {p.payment_receipt_url && (
                            <a href={p.payment_receipt_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                              <ExternalLink className="w-3.5 h-3.5" /> Bukti pembayaran
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Marketing Kit */}
                <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                  <h2 className="font-black text-lg flex items-center gap-2 mb-4">
                    <Download className="w-5 h-5 text-emerald-600" /> Marketing Kit
                  </h2>
                  <div className="space-y-3">
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <div className="relative bg-gradient-to-br from-emerald-700 to-teal-600 p-5 text-white">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100">DiDesa Digitalisasi Desa</p>
                        <p className="mt-2 text-2xl font-black tracking-tight leading-tight">Bantu Desa. <br /> Raih Komisi.</p>
                        <p className="mt-2 text-[10px] font-bold text-emerald-100/90">Affiliator Program • Rp 750.000 / desa / bulan</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyWithStatus('kit', waMessage)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider hover:border-emerald-300 transition-all active:scale-[0.98]"
                    >
                      {copiedKey === 'kit' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedKey === 'kit' ? 'Tersalin' : 'Salin Template Promosi'}
                    </button>
                  </div>
                </div>

                {/* Bantuan */}
                <div className="rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 p-6">
                  <h3 className="font-black text-sm text-emerald-900 dark:text-emerald-300">Butuh bantuan?</h3>
                  <p className="mt-1 text-xs font-medium text-emerald-800/80 dark:text-emerald-200/70 leading-relaxed">
                    Hubungi tim kemitraan {globalName} untuk pendampingan, penyesuaian komisi, atau pengajuan payout.
                  </p>
                  <a
                    href={`https://wa.me/6281346867519?text=${encodeURIComponent('Halo tim kemitraan DiDesa, saya perlu bantuan terkait program affiliator.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                  >
                    <Share2 className="w-4 h-4" /> Hubungi Kami
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}