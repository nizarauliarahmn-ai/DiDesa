import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Wallet, BadgePercent, Handshake, Building2, Search, Loader2,
  CheckCircle2, XCircle, RefreshCw, Upload, ExternalLink, Phone,
  MessageSquare, X, Banknote, FileText, TrendingUp, Clock, Eye, UserCheck,
  UserX, Landmark, Download, Copy, Check, MapPin
} from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';
import { addSaaSLog } from '../../../utils/saasLogs';

const formatRupiah = (value: number) =>
  'Rp ' + Math.round(value || 0).toLocaleString('id-ID');

const formatIDR = (value: number) =>
  new Intl.NumberFormat('id-ID').format(Math.round(value || 0));

const formatDate = (iso?: string) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (iso?: string) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const toWaNumber = (p?: string) => {
  let digits = (p || '').replace(/[^\d]/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  return digits;
};

const KALSEL_KEYWORDS = ['kalimantan selatan', 'banjar', 'banjarbaru', 'banjarmasin', 'barito kuala', 'hulu sungai', 'kotabaru', 'tabalong', 'tanah bumbu', 'tanah laut', 'tapin', 'balangan'];

const isKalselDomisili = (daerah?: string) => {
  const t = (daerah || '').toLowerCase();
  if (!t) return false;
  return KALSEL_KEYWORDS.some(k => t.includes(k));
};

const toTitleCase = (s?: string) =>
  (s || '').replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

const formatWilayah = (daerah?: string) => {
  const t = (daerah || '').trim();
  if (!t) return '-';
  return t
    .replace(/^kabupaten\s+/i, 'Kab. ')
    .replace(/^kab\.?\s+/i, 'Kab. ')
    .replace(/^kota\s+/i, 'Kota ')
    .replace(/^kecamatan\s+/i, 'Kec. ')
    .replace(/^kec\.?\s+/i, 'Kec. ')
    .replace(/^desa\s+/i, 'Desa ')
    .replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
};

const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  active: 'Aktif',
  suspended: 'Dinonaktifkan',
  rejected: 'Ditolak'
};

function getTier(n: number) {
  if (n >= 20) return { name: 'VIP', perDesa: 1250000, tag: 'MAKSIMAL' };
  if (n >= 5) return { name: 'Pro', perDesa: 1000000, tag: 'TUMBUH' };
  return { name: 'Perintis', perDesa: 750000, tag: 'BARU MULAI' };
}

const AFF_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  suspended: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  rejected: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
};

const PAYOUT_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  approved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  paid: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
};

const REF_STATUS_BADGE: Record<string, string> = {
  trial: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  paid: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800'
};

type Affiliate = {
  id: string;
  nama?: string;
  email?: string;
  no_wa?: string;
  daerah_kerja?: string;
  referral_code?: string;
  custom_voucher_code?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_account_holder?: string;
  commission_rate?: number;
  status?: string;
  created_at?: string;
};

type Referral = {
  id: string;
  affiliate_id: string;
  village_id?: string;
  village_name?: string;
  status?: string;
  commission_amount?: number;
  created_at?: string;
  affiliates?: { nama?: string } | null;
};

type Payout = {
  id: string;
  affiliate_id: string;
  amount?: number;
  status?: string;
  payment_receipt_url?: string;
  created_at?: string;
  affiliates?: { nama?: string; no_wa?: string; bank_name?: string; bank_account_no?: string; bank_account_holder?: string } | null;
};

export default function SaaSAffiliateManager() {
  const [activeTab, setActiveTab] = useState<'afiliator' | 'payouts' | 'referrals'>('afiliator');
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  // Modal state
  const [detailAffiliate, setDetailAffiliate] = useState<Affiliate | null>(null);
  const [tierRate, setTierRate] = useState<number>(750000);
  const [tierRateText, setTierRateText] = useState<string>('');
  const [isSavingTier, setIsSavingTier] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [processingPayout, setProcessingPayout] = useState<Payout | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

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

  const handleCopyReferral = async () => {
    if (!detailAffiliate?.referral_code) return;
    const ok = await copyToClipboard(detailAffiliate.referral_code);
    if (ok) {
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [affRes, refRes, payRes] = await Promise.all([
      supabase.from('affiliates').select('*').order('created_at', { ascending: false }),
      supabase.from('affiliate_referrals').select('*, affiliates(nama)').order('created_at', { ascending: false }),
      supabase.from('affiliate_payouts').select('*, affiliates(nama, no_wa, bank_name, bank_account_no, bank_account_holder)').order('created_at', { ascending: false })
    ]);
    if (!affRes.error) setAffiliates(affRes.data || []);
    if (!refRes.error) setReferrals(refRes.data || []);
    if (!payRes.error) setPayouts(payRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase.channel('saas_affiliate_manager_realtime');
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliates' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_referrals' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_payouts' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // --- Computed stats ---
  const activeAffiliates = affiliates.filter(a => a.status === 'active').length;
  const pendingAffiliates = affiliates.filter(a => a.status === 'pending').length;
  const suspendedAffiliates = affiliates.filter(a => a.status === 'suspended' || a.status === 'rejected').length;

  const totalReferrals = referrals.length;
  const trialReferrals = referrals.filter(r => r.status === 'trial').length;
  const paidReferrals = referrals.filter(r => r.status === 'active' || r.status === 'paid').length;

  const pendingPayouts = payouts.filter(p => p.status === 'pending' || p.status === 'approved');
  const pendingPayoutAmount = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaidOut = payouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);

  const referralCountByAffiliate = (affiliateId: string) =>
    referrals.filter(r => r.affiliate_id === affiliateId).length;

  const filteredAffiliates = affiliates.filter(a => {
    const matchSearch =
      (a.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.no_wa || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.referral_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.custom_voucher_code || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'Semua' || (a.status || '') === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredPayouts = payouts.filter(p => {
    const matchSearch =
      (p.affiliates?.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.affiliates?.bank_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.affiliates?.bank_account_no || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'Semua' || (p.status || '') === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredReferrals = referrals.filter(r => {
    const matchSearch =
      (r.village_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.affiliates?.nama || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'Semua' || (r.status || '') === statusFilter;
    return matchSearch && matchStatus;
  });

  // --- Actions ---
  const handleApproval = async (aff: Affiliate, action: 'active' | 'rejected') => {
    const { error } = await supabase
      .from('affiliates')
      .update({ status: action })
      .eq('id', aff.id);
    if (error) {
      showToast('Gagal memperbarui status afiliator.', 'error');
      return;
    }
    showToast(action === 'active' ? 'Afiliator disetujui & diaktifkan.' : 'Pendaftaran afiliator ditolak.', action === 'active' ? 'success' : 'info');
    await addSaaSLog({
      admin: 'SaaS Admin',
      aksi: action === 'active' ? 'Menyetujui afiliator' : 'Menolak afiliator',
      target: aff.nama || aff.email || aff.id,
      status: 'Berhasil',
      category: 'SaaS Admin'
    });
    loadData();
  };

  const handleSaveTier = async (opts?: { approve?: boolean }) => {
    if (!detailAffiliate) return;
    setIsSavingTier(true);
    const payload: Record<string, unknown> = { commission_rate: tierRate };
    if (opts?.approve && detailAffiliate.status !== 'active') payload.status = 'active';
    const { error } = await supabase
      .from('affiliates')
      .update(payload)
      .eq('id', detailAffiliate.id);
    setIsSavingTier(false);
    if (error) {
      showToast('Gagal menyimpan komisi khusus.', 'error');
      return;
    }
    showToast(opts?.approve && detailAffiliate.status !== 'active' ? 'Afiliator disetujui & komisi khusus tersimpan.' : 'Komisi khusus berhasil disimpan.', 'success');
    await addSaaSLog({
      admin: 'SaaS Admin',
      aksi: opts?.approve && detailAffiliate.status !== 'active' ? 'Menyetujui afiliator & mengubah komisi' : 'Mengubah komisi afiliator',
      target: detailAffiliate.nama || detailAffiliate.email || detailAffiliate.id,
      status: 'Berhasil',
      category: 'SaaS Admin'
    });
    setDetailAffiliate(null);
    loadData();
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!processingPayout || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingReceipt(true);
    try {
      const fileName = `affiliate-payout-${Date.now()}-${Math.floor(Math.random() * 10000)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('affiliate_payouts')
        .update({ status: 'paid', payment_receipt_url: publicUrl })
        .eq('id', processingPayout.id);

      if (updateError) throw updateError;

      showToast('Payout ditandai PAID & bukti transfer diunggah.', 'success');
      await addSaaSLog({
        admin: 'SaaS Admin',
        aksi: 'Memproses pencairan komisi afiliator',
        target: processingPayout.affiliates?.nama || processingPayout.id,
        status: 'Berhasil',
        category: 'SaaS Admin'
      });
      setProcessingPayout(null);
      loadData();
    } catch (error: any) {
      console.error('Error processing payout:', error);
      showToast('Gagal memproses payout. Silakan coba lagi.', 'error');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleRejectPayout = async (p: Payout) => {
    const { error } = await supabase
      .from('affiliate_payouts')
      .update({ status: 'rejected' })
      .eq('id', p.id);
    if (error) {
      showToast('Gagal menolak payout.', 'error');
      return;
    }
    showToast('Payout ditolak.', 'info');
    loadData();
  };

  const waPayoutMessage = (p: Payout) =>
    encodeURIComponent(
      `Halo ${p.affiliates?.nama || 'Afiliator DiDesa'}! 🎉\n\nPengajuan pencairan komisi Anda sebesar ${formatRupiah(p.amount || 0)} telah kami PROSES dan ditandai sebagai TERBAYAR.\n\nTerima kasih telah menjadi bagian dari program afiliator DiDesa. Pantau dashboard afiliator Anda untuk melihat riwayat lengkap.`
    );

  // --- Render ---
  const statCards = [
    {
      icon: Users,
      label: 'Afiliator Aktif',
      value: String(activeAffiliates),
      sub: `${pendingAffiliates} pending • ${suspendedAffiliates} nonaktif`,
      badge: pendingAffiliates > 0 ? { text: `${pendingAffiliates} Pending`, cls: 'bg-amber-500 text-white' } : null,
      iconBg: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
    },
    {
      icon: Building2,
      label: 'Desa Referral',
      value: String(totalReferrals),
      sub: `${trialReferrals} trial • ${paidReferrals} aktif`,
      badge: null,
      iconBg: 'bg-blue-600/10 text-blue-700 dark:text-blue-400'
    },
    {
      icon: Wallet,
      label: 'Pending Payout',
      value: String(pendingPayouts.length),
      sub: formatRupiah(pendingPayoutAmount),
      badge: pendingPayouts.length > 0 ? { text: 'Perlu Diproses', cls: 'bg-amber-500 text-white' } : null,
      iconBg: 'bg-amber-600/10 text-amber-700 dark:text-amber-400'
    },
    {
      icon: BadgePercent,
      label: 'Komisi Terbayar',
      value: formatRupiah(totalPaidOut),
      sub: `${payouts.filter(p => p.status === 'paid').length} transaksi`,
      badge: null,
      iconBg: 'bg-purple-600/10 text-purple-700 dark:text-purple-400'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Manajemen Afiliator</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola pendaftar, referral desa, dan pembayaran komisi program afiliasi.</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
        >
          <RefreshCw size={16} /> Muat Ulang
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow relative">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <card.icon className="w-5 h-5" />
              </div>
              {card.badge && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse ${card.badge.cls}`}>
                  {card.badge.text}
                </span>
              )}
            </div>
            <p className="text-xl font-black truncate">{card.value}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{card.label}</p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Sub-Tab Navigation */}
      <div className="inline-flex flex-wrap rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
        {([
          { key: 'afiliator', label: 'Daftar Afiliator', icon: Users, count: filteredAffiliates.length },
          { key: 'payouts', label: 'Permintaan Pencairan', icon: Wallet, count: pendingPayouts.length },
          { key: 'referrals', label: 'Riwayat Referral Desa', icon: Building2, count: filteredReferrals.length }
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearchQuery(''); setStatusFilter('Semua'); }}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === tab.key
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${activeTab === tab.key ? 'bg-white/20 dark:bg-slate-900/10' : 'bg-slate-100 dark:bg-slate-700'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={
              activeTab === 'afiliator' ? 'Cari nama, email, no. WA, atau kode referral...' :
              activeTab === 'payouts' ? 'Cari nama afiliator, bank, atau no. rekening...' :
              'Cari nama desa atau afiliator...'
            }
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-900 dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['Semua', 'pending', 'active', 'suspended', 'rejected', 'trial', 'paid'] as const)
            .filter(s => activeTab === 'afiliator' ? ['Semua', 'pending', 'active', 'suspended', 'rejected'].includes(s) : activeTab === 'payouts' ? ['Semua', 'pending', 'approved', 'paid', 'rejected'].includes(s) : ['Semua', 'trial', 'active', 'paid'].includes(s))
            .map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                }`}
              >
                {status}
              </button>
            ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-600" />
          <p>Memuat data afiliator...</p>
        </div>
      ) : (
        <>
          {activeTab === 'afiliator' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60">
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Afiliator</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">No. WhatsApp</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Domisili</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Kode Referral</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tier</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total Desa</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAffiliates.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Users size={32} strokeWidth={1.5} />
                          </div>
                          <p className="font-semibold text-slate-600 dark:text-slate-300">Tidak ada data afiliator</p>
                          <p className="text-xs text-slate-400 mt-1">Pendaftar baru akan muncul di sini secara realtime.</p>
                        </td>
                      </tr>
                    ) : filteredAffiliates.map(aff => {
                      const totalDesa = referralCountByAffiliate(aff.id);
                      const tier = getTier(totalDesa);
                      return (
                        <tr key={aff.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-sm shrink-0">
                                {(aff.nama || 'A').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-sm">{aff.nama || '-'}</p>
                                <p className="text-[11px] font-semibold text-slate-400">{aff.email || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Phone size={14} className="text-slate-400" />
                              <a href={`https://wa.me/${toWaNumber(aff.no_wa)}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600">
                                {aff.no_wa || '-'}
                              </a>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {isKalselDomisili(aff.daerah_kerja) ? (
                              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                Kalsel
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                Luar Kalsel
                              </span>
                            )}
                            <p className="mt-1 text-[10px] font-semibold text-slate-400">{aff.daerah_kerja || '-'}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-black text-xs tracking-wider text-emerald-700 dark:text-emerald-400">{aff.referral_code || '-'}</p>
                            {aff.custom_voucher_code && (
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Voucher: {aff.custom_voucher_code}</p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                              {tier.name}
                            </span>
                            <p className="mt-1 text-[10px] font-semibold text-slate-400">{formatRupiah(aff.commission_rate || tier.perDesa)}/desa</p>
                          </td>
                          <td className="py-4 px-4 font-black text-sm">{totalDesa}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${AFF_STATUS_BADGE[aff.status || 'pending']}`}>
                              {aff.status || 'pending'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(aff.status === 'pending') && (
                                <>
                                  <button
                                    onClick={() => handleApproval(aff, 'active')}
                                    title="Setujui"
                                    className="p-2 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                                  >
                                    <UserCheck size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleApproval(aff, 'rejected')}
                                    title="Tolak"
                                    className="p-2 rounded-lg bg-red-600/10 text-red-700 dark:text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                                  >
                                    <UserX size={16} />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => {
                                  const rate = aff.commission_rate || 750000;
                                  setDetailAffiliate(aff);
                                  setTierRate(rate);
                                  setTierRateText(rate.toString());
                                  setCopiedReferral(false);
                                }}
                                title="Detail & Edit Tier"
                                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                              >
                                <Eye size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payouts' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60">
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal Pengajuan</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Afiliator</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Bank &amp; No. Rekening</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nominal Komisi</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Bukti</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayouts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Wallet size={32} strokeWidth={1.5} />
                          </div>
                          <p className="font-semibold text-slate-600 dark:text-slate-300">Tidak ada pengajuan payout</p>
                          <p className="text-xs text-slate-400 mt-1">Pengajuan pencairan dari afiliator akan muncul di sini.</p>
                        </td>
                      </tr>
                    ) : filteredPayouts.map(p => (
                      <tr key={p.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-4">
                          <p className="text-xs font-bold">{formatDateTime(p.created_at)}</p>
                          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{p.id.slice(0, 8)}</p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-xs shrink-0">
                              {(p.affiliates?.nama || 'A').charAt(0).toUpperCase()}
                            </div>
                            <p className="font-bold text-sm">{p.affiliates?.nama || '-'}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Landmark size={14} className="text-slate-400 shrink-0" />
                            <div>
                              <p className="text-xs font-bold">{p.affiliates?.bank_name || '-'}</p>
                              <p className="text-[10px] font-semibold text-slate-400">{p.affiliates?.bank_account_no || '-'} {p.affiliates?.bank_account_holder ? `• ${p.affiliates?.bank_account_holder}` : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-black text-sm text-emerald-700 dark:text-emerald-400">{formatRupiah(p.amount || 0)}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${PAYOUT_STATUS_BADGE[p.status || 'pending']}`}>
                            {p.status || 'pending'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {p.payment_receipt_url ? (
                            <a href={p.payment_receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                              <ExternalLink size={13} /> Lihat Bukti
                            </a>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(p.status === 'pending' || p.status === 'approved') && (
                              <>
                                <button
                                  onClick={() => setProcessingPayout(p)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors"
                                >
                                  <Banknote size={14} /> Proses Transfer
                                </button>
                                <button
                                  onClick={() => handleRejectPayout(p)}
                                  title="Tolak"
                                  className="p-2 rounded-lg bg-red-600/10 text-red-700 dark:text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                            {p.affiliates?.no_wa && (
                              <a
                                href={`https://wa.me/${toWaNumber(p.affiliates.no_wa)}?text=${waPayoutMessage(p)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Kirim notifikasi WhatsApp"
                                className="p-2 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                              >
                                <MessageSquare size={16} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'referrals' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60">
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Desa</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Afiliator Perujuk</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal Langganan</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status Referral</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Komisi Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReferrals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Building2 size={32} strokeWidth={1.5} />
                          </div>
                          <p className="font-semibold text-slate-600 dark:text-slate-300">Tidak ada referral desa</p>
                          <p className="text-xs text-slate-400 mt-1">Desa yang direferensikan afiliator akan muncul di sini.</p>
                        </td>
                      </tr>
                    ) : filteredReferrals.map(r => (
                      <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Building2 size={15} className="text-slate-400 shrink-0" />
                            <p className="font-bold text-sm">{r.village_name || 'Desa (ID: ' + r.village_id + ')'}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Handshake size={14} className="text-slate-400" />
                            <p className="text-sm font-semibold">{r.affiliates?.nama || '-'}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-xs font-bold">{formatDateTime(r.created_at)}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${REF_STATUS_BADGE[r.status || 'trial']}`}>
                            {r.status || 'trial'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-black text-sm text-emerald-700 dark:text-emerald-400">{formatRupiah(r.commission_amount || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Detail & Edit Tier */}
      {detailAffiliate && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="max-h-[88vh] w-full max-w-2xl mx-4 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700/60 animate-in fade-in zoom-in duration-300">
            {/* Header (Sticky) */}
            <div className="flex-shrink-0 relative bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-800 px-5 sm:px-6 py-5 text-white border-b border-white/10 z-10">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full -mb-16" />
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-slate-900 flex items-center justify-center text-3xl font-black shadow-lg ring-4 ring-white/20 shrink-0"
                  >
                    {(detailAffiliate.nama || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight leading-tight">
                      {toTitleCase(detailAffiliate.nama) || 'Afiliator'}
                    </h3>
                    <p className="text-emerald-100 text-sm font-medium mt-0.5">{detailAffiliate.email || '-'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {/* Badge Status Akun */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-sm ${
                          detailAffiliate.status === 'active'
                            ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-50'
                            : detailAffiliate.status === 'rejected' || detailAffiliate.status === 'suspended'
                              ? 'bg-red-500/20 border-red-300/40 text-red-50'
                              : 'bg-amber-400/20 border-amber-300/40 text-amber-50'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${detailAffiliate.status === 'active' ? 'bg-emerald-300' : detailAffiliate.status === 'rejected' || detailAffiliate.status === 'suspended' ? 'bg-red-300' : 'bg-amber-300'}`} />
                        {ACCOUNT_STATUS_LABEL[detailAffiliate.status || 'pending'] || (detailAffiliate.status || 'Pending')}
                      </span>
                      {/* Badge Deteksi Wilayah */}
                      {isKalselDomisili(detailAffiliate.daerah_kerja) ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-emerald-500/20 border-emerald-300/40 text-emerald-50">
                          📍 Kalimantan Selatan (Prioritas)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-orange-500/20 border-orange-300/40 text-orange-50">
                          🌐 Luar Kalsel (Waitlist)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setDetailAffiliate(null)} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Grid 2 Kolom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* KOLOM KIRI: Kontak & Wilayah */}
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">No. WhatsApp</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm">{detailAffiliate.no_wa || '-'}</p>
                      {detailAffiliate.no_wa && (
                        <a
                          href={`https://wa.me/${toWaNumber(detailAffiliate.no_wa)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors shrink-0"
                        >
                          💬 Chat WA
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Wilayah Kerja</p>
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                      <p className="font-bold text-sm">{formatWilayah(detailAffiliate.daerah_kerja)}</p>
                    </div>
                  </div>
                </div>

                {/* KOLOM KANAN: Performa & Bank */}
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Kode Referral</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono font-black text-sm tracking-widest text-emerald-700 dark:text-emerald-400">{detailAffiliate.referral_code || '-'}</p>
                      <button
                        onClick={handleCopyReferral}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${copiedReferral ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-emerald-600'}`}
                        title="Salin Kode Referral"
                      >
                        {copiedReferral ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Total Desa Terhubung</p>
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-slate-400" />
                      <p className="font-black text-sm">{referralCountByAffiliate(detailAffiliate.id)}</p>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Desa</span>
                    </div>
                  </div>
                  <div
                    className={`rounded-xl border p-4 ${
                      detailAffiliate.bank_name
                        ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Rekening Bank Payout</p>
                    {detailAffiliate.bank_name ? (
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm flex items-center gap-1.5"><Landmark size={14} className="text-emerald-600" /> {detailAffiliate.bank_name}</p>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{detailAffiliate.bank_account_no || '-'}</p>
                        {detailAffiliate.bank_account_holder && (
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Atas nama {detailAffiliate.bank_account_holder}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        ⚠️ Belum mengisi data bank
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section Setting Komisi Khusus */}
              <div className="rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/60 p-4">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                  ⚙️ Pengaturan Komisi Khusus Per Desa
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-amber-700 dark:text-amber-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tierRateText}
                    onChange={e => {
                      const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 12);
                      setTierRateText(digits);
                      setTierRate(Number(digits));
                    }}
                    placeholder="750000"
                    className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                  <span className="text-sm font-black text-amber-700 dark:text-amber-400 whitespace-nowrap">/ desa</span>
                </div>
                <p className="mt-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  = {formatRupiah(Number(tierRateText) || 0)}
                </p>
                <p className="mt-2 text-[11px] font-semibold text-amber-700/80 dark:text-amber-300/70 leading-relaxed">
                  Secara bawaan mengikuti Tier {getTier(referralCountByAffiliate(detailAffiliate.id)).name} ({formatRupiah(getTier(referralCountByAffiliate(detailAffiliate.id)).perDesa)}). Ubah angka di atas jika ingin memberikan rate khusus untuk afiliator ini.
                </p>
              </div>
            </div>

            {/* Footer (Sticky) */}
            <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-700/60 p-4 bg-slate-50 dark:bg-slate-800 flex items-center justify-between gap-3 z-10">
              <button
                onClick={() => setDetailAffiliate(null)}
                className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                Batal / Tutup
              </button>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  onClick={() => { handleApproval(detailAffiliate, 'rejected'); setDetailAffiliate(null); }}
                  className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-black capitalize hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  ✖ Tolak
                </button>
                <button
                  onClick={() => handleSaveTier({ approve: true })}
                  disabled={isSavingTier}
                  className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isSavingTier ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  ✓
                  <span className="hidden xs:inline sm:inline">{detailAffiliate.status === 'active' ? 'Simpan Komisi Khusus' : 'Setujui & Aktifkan Afiliator'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Proses Payout */}
      {processingPayout && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="max-h-[88vh] w-full max-w-md mx-4 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">
            {/* Header (Sticky) */}
            <div className="flex-shrink-0 border-b border-slate-100 dark:border-slate-700/60 p-4 sm:p-5 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Proses Transfer Komisi</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Konfirmasi Pembayaran</p>
                  </div>
                </div>
                <button onClick={() => setProcessingPayout(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 p-5 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Nominal Komisi</p>
                <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{formatRupiah(processingPayout.amount || 0)}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-700/80 dark:text-emerald-300/80">kepada {processingPayout.affiliates?.nama || 'Afiliator'}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-slate-400 shrink-0" />
                  <p className="font-semibold">
                    {processingPayout.affiliates?.bank_name || '-'} • {processingPayout.affiliates?.bank_account_no || '-'}
                    {processingPayout.affiliates?.bank_account_holder ? ` (${processingPayout.affiliates?.bank_account_holder})` : ''}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <p className="font-semibold">{processingPayout.affiliates?.no_wa || '-'}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/60 p-4">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1">Langkah</p>
                <ol className="text-[12px] font-semibold text-amber-800 dark:text-amber-300 space-y-1.5 leading-relaxed">
                  <li>1. Lakukan transfer ke rekening afiliator di atas sesuai nominal komisi.</li>
                  <li>2. Unggah foto/resi bukti transfer di bawah.</li>
                  <li>3. Status payout otomatis berubah menjadi <strong>PAID</strong> dan notifikasi WhatsApp terkirim.</li>
                </ol>
              </div>

              <label className={`w-full flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${isUploadingReceipt ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600' : 'bg-slate-50 dark:bg-slate-800 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>
                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleUploadReceipt} disabled={isUploadingReceipt} />
                {isUploadingReceipt ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Mengunggah bukti...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-emerald-600" />
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Unggah Bukti Transfer / Resi</p>
                    <p className="text-[11px] font-semibold text-slate-400">Klik untuk memilih file (JPG, PNG, atau PDF)</p>
                  </>
                )}
              </label>
            </div>

            {/* Footer (Sticky) */}
            <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-700/60 p-4 bg-slate-50 dark:bg-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 z-10">
              <button
                onClick={() => setProcessingPayout(null)}
                className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                Batal
              </button>
              {processingPayout.affiliates?.no_wa && (
                <a
                  href={`https://wa.me/${toWaNumber(processingPayout.affiliates.no_wa)}?text=${waPayoutMessage(processingPayout)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" /> Notifikasi WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
