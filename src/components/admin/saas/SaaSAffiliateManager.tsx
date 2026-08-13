import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Wallet, BadgePercent, Handshake, Building2, Search, Loader2,
  CheckCircle2, XCircle, RefreshCw, Upload, ExternalLink, Phone,
  MessageSquare, X, Banknote, FileText, TrendingUp, Clock, Eye, UserCheck,
  UserX, Landmark, Download, Copy
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
  const [isSavingTier, setIsSavingTier] = useState(false);
  const [processingPayout, setProcessingPayout] = useState<Payout | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

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

  const handleSaveTier = async () => {
    if (!detailAffiliate) return;
    setIsSavingTier(true);
    const { error } = await supabase
      .from('affiliates')
      .update({ commission_rate: tierRate })
      .eq('id', detailAffiliate.id);
    setIsSavingTier(false);
    if (error) {
      showToast('Gagal menyimpan komisi khusus.', 'error');
      return;
    }
    showToast('Komisi khusus berhasil disimpan.', 'success');
    await addSaaSLog({
      admin: 'SaaS Admin',
      aksi: 'Mengubah komisi afiliator',
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
                                onClick={() => { setDetailAffiliate(aff); setTierRate(aff.commission_rate || 750000); }}
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
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Detail Afiliator</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Detail &amp; Edit Komisi</p>
                  </div>
                </div>
                <button onClick={() => setDetailAffiliate(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nama</p>
                    <p className="font-bold mt-1">{detailAffiliate.nama || '-'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${AFF_STATUS_BADGE[detailAffiliate.status || 'pending']}`}>
                      {detailAffiliate.status || 'pending'}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</p>
                  <p className="font-semibold mt-1">{detailAffiliate.email || '-'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No. WhatsApp</p>
                  <p className="font-semibold mt-1">{detailAffiliate.no_wa || '-'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Wilayah Kerja</p>
                  <p className="font-semibold mt-1">{detailAffiliate.daerah_kerja || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kode Referral</p>
                    <p className="font-black tracking-wider text-emerald-700 dark:text-emerald-400 mt-1">{detailAffiliate.referral_code || '-'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Desa</p>
                    <p className="font-black mt-1">{referralCountByAffiliate(detailAffiliate.id)} desa</p>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data Bank (untuk payout)</p>
                  <p className="font-semibold mt-1">
                    {detailAffiliate.bank_name ? `${detailAffiliate.bank_name} • ${detailAffiliate.bank_account_no || '-'}${detailAffiliate.bank_account_holder ? ' • ' + detailAffiliate.bank_account_holder : ''}` : 'Belum melengkapi data bank'}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/60 p-4">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                  <BadgePercent size={14} /> Komisi Khusus per Desa
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tierRate}
                    min={0}
                    step={25000}
                    onChange={e => setTierRate(Number(e.target.value))}
                    className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-amber-500"
                  />
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400">/desa</span>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-amber-700/80 dark:text-amber-300/80">
                  Default tier: {getTier(referralCountByAffiliate(detailAffiliate.id)).name} ({formatRupiah(getTier(referralCountByAffiliate(detailAffiliate.id)).perDesa)}/desa). Set nilai di atas untuk komisi khusus.
                </p>
              </div>

              <button
                onClick={handleSaveTier}
                disabled={isSavingTier}
                className="w-full mt-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 dark:shadow-emerald-900/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSavingTier ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {isSavingTier ? 'Menyimpan...' : 'Simpan Komisi Khusus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Proses Payout */}
      {processingPayout && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Proses Transfer Komisi</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Konfirmasi Pembayaran</p>
                  </div>
                </div>
                <button onClick={() => setProcessingPayout(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 p-5 text-center mb-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Nominal Komisi</p>
                <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{formatRupiah(processingPayout.amount || 0)}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-700/80 dark:text-emerald-300/80">kepada {processingPayout.affiliates?.nama || 'Afiliator'}</p>
              </div>

              <div className="space-y-3 text-sm mb-6">
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

              <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/60 p-4 mb-6">
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

              {processingPayout.affiliates?.no_wa && (
                <a
                  href={`https://wa.me/${toWaNumber(processingPayout.affiliates.no_wa)}?text=${waPayoutMessage(processingPayout)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" /> Kirim Notifikasi WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
