import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight, CheckCircle2, Wallet, CalendarCheck, Landmark, UserPlus,
  Copy, Users, BadgeCheck, TrendingUp, Smartphone, MessagesSquare,
  ChevronDown, ShieldAlert, ClipboardCheck, Timer
} from 'lucide-react';
import { supabase } from '../utils/supabase';

const PER_DESA_COMMISSION = 750000;
const RANGE_MIN = 1;
const RANGE_MAX = 50;

const TIERS = [
  { name: 'Perintis', min: 1, max: 4, perDesa: 750000, perpanjangan: 0.10, tag: 'BARU MULAI' },
  { name: 'Pro', min: 5, max: 19, perDesa: 1000000, perpanjangan: 0.125, tag: 'TUMBUH' },
  { name: 'VIP', min: 20, max: 50, perDesa: 1250000, perpanjangan: 0.15, tag: 'MAKSIMAL' }
];

const MILESTONES = [
  { desa: 5, bonus: 1000000 },
  { desa: 15, bonus: 3500000 },
  { desa: 30, bonus: 8000000 }
];

const formatRupiah = (value: number) =>
  'Rp ' + Math.round(value).toLocaleString('id-ID');

function getTier(n: number) {
  return TIERS.find(t => n >= t.min && n <= t.max) || TIERS[TIERS.length - 1];
}

function getMilestoneBonus(n: number) {
  return MILESTONES.filter(m => n >= m.desa).reduce((sum, m) => sum + m.bonus, 0);
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'DD' + code;
}

type AffiliateForm = {
  nama: string;
  email: string;
  no_wa: string;
  daerah: string;
};

export default function AffiliateLandingPage() {
  const [globalName, setGlobalName] = useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalLogo, setGlobalLogo] = useState(() => localStorage.getItem('global_app_logo') || '');
  const [globalColor, setGlobalColor] = useState(() => localStorage.getItem('global_app_color') || '#047857');

  const [jumlahDesa, setJumlahDesa] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  const [form, setForm] = useState<AffiliateForm>({ nama: '', email: '', no_wa: '', daerah: '' });
  const [openTerms, setOpenTerms] = useState<number | null>(0);

  const activeTier = getTier(jumlahDesa);
  const commissionPerDesa = activeTier.perDesa;
  const estimatedMonthly = jumlahDesa * commissionPerDesa;
  const estimatedYearly = estimatedMonthly * 12;
  const milestoneBonus = getMilestoneBonus(jumlahDesa);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama || !form.email || !form.no_wa) return;
    setIsSubmitting(true);
    setSubmitError('');

    let referralCode = generateReferralCode();
    let affiliateId: string | null = null;
    let insertOk = false;

    // Berikan beberapa percobaan jika kode referral bentrok (unique constraint)
    for (let attempt = 0; attempt < 4 && !insertOk; attempt++) {
      if (attempt > 0) referralCode = generateReferralCode();
      const { data, error } = await supabase
        .from('affiliates')
        .insert([{
          email: form.email.trim().toLowerCase(),
          nama: form.nama.trim(),
          no_wa: form.no_wa.trim(),
          daerah_kerja: form.daerah.trim() || null,
          referral_code: referralCode,
          commission_rate: PER_DESA_COMMISSION,
          status: 'pending'
        }])
        .select('id');

      if (!error && data && data.length > 0) {
        affiliateId = data[0].id;
        insertOk = true;
      } else if (error && !String(error.message).toLowerCase().includes('duplicate') && !String(error.message).toLowerCase().includes('23505')) {
        setSubmitError('Gagal mengirim pendaftaran. Silakan coba lagi.');
        break;
      }
    }

    setTimeout(() => {
      setIsSubmitting(false);
      if (!insertOk) {
        setSubmitError('Gagal mengirim pendaftaran. Silakan coba lagi atau hubungi tim kami.');
        return;
      }

      // Simpan identitas affiliator untuk pembukaan dashboard
      try {
        const existingAuth = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
        localStorage.setItem('didesa_affiliate_session', JSON.stringify({
          id: affiliateId,
          nama: form.nama.trim(),
          email: form.email.trim().toLowerCase(),
          referral_code: referralCode
        }));
      } catch (_) { /* abaikan */ }

      setRegisteredEmail(form.email.trim());
      setRegisteredName(form.nama.trim());
      setForm({ nama: '', email: '', no_wa: '', daerah: '' });
      setIsSuccessModalOpen(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md"
              style={{ backgroundColor: globalColor }}
            >
              {globalLogo ? (
                <img src={globalLogo} alt={globalName} className="w-6 h-6 object-contain" />
              ) : (
                globalName.charAt(0)
              )}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black tracking-tight uppercase">{globalName}</p>
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Program Affiliator</p>
            </div>
          </a>
          <div className="flex items-center gap-3">
            <a href="/" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-700 transition-colors">
              <Landmark className="w-4 h-4" /> Beranda
            </a>
            <a
              href="#daftar"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.97] flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Daftar
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-24 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 lg:pt-24 lg:pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600/10 border border-emerald-600/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-black uppercase tracking-widest mb-6">
            <BadgeCheck className="w-4 h-4" /> Program Resmi DiDesa
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] max-w-3xl mx-auto">
            Bantu Desa Go-Digital,<br />
            Raih{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Komisi Nyata
            </span>{' '}
            Setiap Bulan
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
            Jadilah <strong>Affiliator DiDesa</strong> dan pendamping desa untuk memulai digitalisasi administrasi.
            Untuk setiap desa yang aktif menggunakan DiDesa melalui referensi Anda, Anda berhak atas komisi{' '}
            <strong className="text-emerald-700 dark:text-emerald-400">Rp 750.000 / bulan</strong>.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#daftar" className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-600/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              Daftar Jadi Affiliator <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#kalkulator" className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-black uppercase tracking-widest hover:border-emerald-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              Hitung Komisi Anda
            </a>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Wallet, value: 'Mulai Rp 750rb', label: 'Komisi per Desa / Bulan' },
              { icon: CalendarCheck, value: 'Bulanan', label: 'Pembayaran Rutin' },
              { icon: TrendingUp, value: 'Tanpa Batas', label: 'Jumlah Desa Referensi' }
            ].map((item, i) => (
              <div key={i} className="rounded-2xl bg-white/80 dark:bg-slate-800/70 backdrop-blur border border-slate-200/70 dark:border-slate-700/60 p-5 flex items-center gap-4 text-left shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-lg font-black leading-none">{item.value}</p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skema Komisi Transparan */}
      <section id="skema-komisi" className="py-14 lg:py-20 bg-white dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2">Skema Komisi Transparan</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Makin Banyak Referensi, Makin Besar Komisi Anda</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 font-medium">
              Komisi naik bertingkat berdasarkan jumlah desa aktif Anda, plus persentase bonus perpanjangan langganan.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier, i) => {
              const isActive = activeTier.name === tier.name;
              return (
                <div
                  key={tier.name}
                  className={`relative rounded-3xl border p-7 transition-all ${
                    isActive
                      ? 'bg-emerald-700 border-emerald-700 text-white shadow-xl shadow-emerald-900/20 scale-[1.02]'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${isActive ? 'bg-white/15 text-emerald-100' : 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'}`}>
                      {tier.tag}
                    </span>
                    <span className={`text-xs font-black ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                      Tier {i + 1}
                    </span>
                  </div>
                  <h3 className={`mt-4 text-2xl font-black ${isActive ? '' : 'text-slate-800 dark:text-slate-100'}`}>{tier.name}</h3>
                  <p className={`mt-1 text-[11px] font-bold uppercase tracking-widest ${isActive ? 'text-emerald-100/90' : 'text-slate-400'}`}>
                    {tier.min}–{tier.max} Desa
                  </p>
                  <div className={`mt-5 h-px ${isActive ? 'bg-white/15' : 'bg-slate-100 dark:bg-slate-700'}`} />
                  <p className="mt-5 text-sm font-bold flex items-baseline gap-1">
                    <span className={`text-3xl font-black ${isActive ? '' : 'text-emerald-700 dark:text-emerald-400'}`}>{formatRupiah(tier.perDesa)}</span>
                    <span className={isActive ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}>/ desa baru</span>
                  </p>
                  <p className={`mt-3 text-sm font-bold flex items-center gap-2 ${isActive ? 'text-emerald-50' : 'text-slate-600 dark:text-slate-300'}`}>
                    <TrendingUp className="w-4 h-4" /> +{Math.round(tier.perpanjangan * 100).toFixed(tier.perpanjangan * 100 % 1 === 0 ? 0 : 1).replace('.', ',')}% perpanjangan
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 text-center mt-4">
            *Komisi transaksi dibayarkan 1x saat desa pertama kali berlangganan paket tahunan, dan komisi % perpanjangan dibayarkan setiap tahun saat desa memperpanjang layanan.
          </p>
        </div>
      </section>

      {/* Kalkulator Komisi */}
      <section id="kalkulator" className="py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2">Simulasi Komisi</p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Berapa Penghasilan Anda <br className="hidden sm:block" /> Sebagai Affiliator?
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Geser slider untuk memperkirakan penghasilan Anda. Komisi dihitung otomatis sesuai{' '}
                <strong>Tier {activeTier.name}</strong> Anda saat ini ({formatRupiah(commissionPerDesa)}/desa/bulan).
              </p>

              <div className="mt-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Jumlah Desa</label>
                  <span className="text-2xl font-black bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 rounded-xl px-3 py-0.5">
                    {jumlahDesa}
                  </span>
                </div>
                <input
                  type="range"
                  min={RANGE_MIN}
                  max={RANGE_MAX}
                  value={jumlahDesa}
                  onChange={e => setJumlahDesa(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-600"
                  aria-label="Jumlah desa"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                  <span>{RANGE_MIN} desa</span>
                  <span>{RANGE_MAX} desa</span>
                </div>

                <div className="mt-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tier Aktif</p>
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{activeTier.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Komisi / Desa / Bulan</p>
                    <p className="text-lg font-black">{formatRupiah(commissionPerDesa)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  {([
                    { label: 'Per Bulan', value: formatRupiah(estimatedMonthly) },
                    { label: 'Per Tahun', value: formatRupiah(estimatedYearly) }
                  ] as const).map((row, i) => (
                    <div key={i} className={`rounded-2xl p-4 border ${i === 0 ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'text-emerald-100' : 'text-slate-400'}`}>{row.label}</p>
                      <p className={`text-xl sm:text-2xl font-black mt-1 ${i === 1 ? 'text-slate-700 dark:text-slate-200' : ''}`}>{row.value}</p>
                    </div>
                  ))}
                </div>

                {/* Banner Bonus Milestone */}
                <div className={`mt-3 rounded-2xl p-4 border transition-all ${milestoneBonus > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/60' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${milestoneBonus > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'}`}>
                      Bonus Pencapaian (Sekali Terima)
                    </p>
                    <p className={`text-lg font-black ${milestoneBonus > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'}`}>
                      {formatRupiah(milestoneBonus)}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {MILESTONES.map(m => {
                      const reached = jumlahDesa >= m.desa;
                      return (
                        <div key={m.desa} className={`rounded-xl px-2 py-1.5 text-center border ${reached ? 'bg-amber-100/70 dark:bg-amber-800/40 border-amber-300 dark:border-amber-700' : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'}`}>
                          <p className={`text-[10px] font-black ${reached ? 'text-amber-800 dark:text-amber-300' : 'text-slate-400'}`}>+{formatRupiah(m.bonus)}</p>
                          <p className={`text-[9px] font-bold ${reached ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'}`}>di {m.desa} desa</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                  * Estimasi bruto. Bonus milestone merupakan insentif sekali terima saat mencapai jumlah desa aktif. Rincian komisi final ditentukan dalam perjanjian kemitraan dan kebijakan program.
                </p>
              </div>
            </div>

            {/* Fitur Unggulan */}
            <div className="space-y-4">
              {[
                { icon: MessagesSquare, title: 'Toolkit & Materi Promosi', desc: 'Link referral, kode voucher, dan materi marketing siap pakai di dashboard Anda.' },
                { icon: Smartphone, title: 'Pantau Real-Time', desc: 'Lacak jumlah desa terreferensi, status aktif, dan komisi yang berjalan.' },
                { icon: Users, title: 'Dukungan Tim DiDesa', desc: 'Tim kami siap membantu pendampingan desa yang Anda referensikan hingga go-live.' },
                { icon: CalendarCheck, title: 'Pencairan Terjadwal', desc: 'Pengajuan payout tercatat rapi di dashboard untuk transparansi penuh.' }
              ].map((item, i) => (
                <div key={i} className="group flex gap-4 items-start rounded-2xl bg-white/80 dark:bg-slate-800/70 backdrop-blur border border-slate-200/70 dark:border-slate-700/60 p-5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-600/5 transition-all">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">{item.title}</h3>
                    <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cara Kerja */}
      <section className="py-14 lg:py-20 bg-white dark:bg-slate-800/40 border-y border-slate-200/60 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2">Cara Kerja</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">3 Langkah Menuju Komisi</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: UserPlus, step: '01', title: 'Daftar Gratis', desc: 'Isi formulir pendaftaran. Tim kami akan memverifikasi dan mengaktifkan akun affiliator Anda.' },
              { icon: Copy, step: '02', title: 'Bagikan Referensi', desc: 'Gunakan link referral dan kode voucher dari dashboard untuk merekomendasikan DiDesa ke desa-desa.' },
              { icon: Wallet, step: '03', title: 'Raup Komisi', desc: 'Setiap desa aktif dari referensi Anda menghasilkan komisi mulai Rp 750.000 hingga Rp 1.250.000 per bulan sesuai tier, plus bonus pencapaian. Ajukan payout kapan saja.' }
            ].map((item, i) => (
              <div key={i} className="relative rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                <span className="absolute top-5 right-6 text-5xl font-black text-slate-100 dark:text-slate-700 select-none">{item.step}</span>
                <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center mb-5 shadow-lg shadow-emerald-600/20 relative">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg">{item.title}</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form Pendaftaran */}
      <section id="daftar" className="py-14 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2">Bergabung Sekarang</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Daftar sebagai Affiliator</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 font-medium">
              Gratis, tanpa biaya pendaftaran. Tim kami akan menghubungi Anda untuk verifikasi.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-10 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Lengkap</label>
                <input
                  required
                  type="text"
                  value={form.nama}
                  onChange={e => setForm({ ...form, nama: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                  placeholder="Nama Anda..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                  placeholder="email@contoh.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">No. WhatsApp</label>
                <input
                  required
                  type="tel"
                  value={form.no_wa}
                  onChange={e => setForm({ ...form, no_wa: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Daerah / Wilayah Kerja (Opsional)</label>
                <input
                  type="text"
                  value={form.daerah}
                  onChange={e => setForm({ ...form, daerah: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                  placeholder="cth: Kabupaten Bogor"
                />
              </div>
            </div>

            {submitError && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">
                {submitError}
              </div>
            )}

            <button
              disabled={isSubmitting}
              className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengirim Pendaftaran...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" /> Daftar Sekarang
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Dengan mendaftar, Anda menyetujui <a href="/syarat-ketentuan" className="text-emerald-600 hover:underline">Syarat &amp; Ketentuan</a> dan{' '}
              <a href="/kebijakan-privasi" className="text-emerald-600 hover:underline">Kebijakan Privasi</a> DiDesa.
            </p>
          </form>
        </div>
      </section>

      {/* Syarat & Ketentuan Program Afiliasi */}
      <section id="syarat-ketentuan" className="py-14 lg:py-20 bg-white dark:bg-slate-800/40 border-y border-slate-200/60 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2">Transparansi Program</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Syarat &amp; Ketentuan Program Afiliasi</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 font-medium">
              Kami ingin kemitraan yang adil dan jelas. Berikut aturan yang mengikat seluruh affiliator DiDesa.
            </p>
          </div>

          <div className="mt-10 space-y-3">
            {[
              {
                icon: ClipboardCheck,
                title: 'Syarat Pendaftaran',
                desc: 'Pendaftaran affiliator 100% gratis. Terbuka untuk Warga Negara Indonesia berusia minimal 18 tahun. Akun affiliator aktif setelah data Anda diverifikasi oleh tim DiDesa.'
              },
              {
                icon: Timer,
                title: 'Atribusi & Masa Cookie 60 Hari',
                desc: 'Referensi dihitung berdasarkan penggunaan link referral / kode voucher Anda saat desa melakukan pendaftaran. Masa atribusi berlaku 60 hari sejak klik pertama. Desa yang sudah berhasil terhubung tercatat sebagai referensi Anda secara permanen.'
              },
              {
                icon: Wallet,
                title: 'Ketentuan Pencairan',
                desc: 'Payout hanya dapat diajukan jika komisi yang terkumpul minimal Rp 500.000. Pengajuan diverifikasi oleh tim dan proses pencairan dilakukan maksimal H+7 hari kerja setelah pengajuan disetujui.'
              },
              {
                icon: ShieldAlert,
                title: 'Kode Etik & Larangan',
                desc: 'Dilarang melakukan spam atau promosi agresif, menggunakan nama dan logo DiDesa tanpa izin tertulis, serta mendaftarkan desa fiktif atau data palsu (fraud). Pelanggaran dapat mengakibatkan pembekuan komisi hingga penonaktifan akun affiliator.'
              }
            ].map((item, i) => {
              const isOpen = openTerms === i;
              return (
                <div key={i} className={`rounded-2xl border transition-all ${isOpen ? 'bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-700/60 shadow-lg shadow-emerald-600/5' : 'bg-white/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                  <button
                    onClick={() => setOpenTerms(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-sm sm:text-base">{item.title}</p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Poin {i + 1}</p>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                  </button>
                  <div className={`px-5 sm:px-6 pb-5 overflow-hidden transition-all duration-300 ${isOpen ? 'block' : 'hidden'}`}>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Skema ini merupakan ringkasan. Ketentuan lengkap mengacu pada{' '}
            <a href="/syarat-ketentuan" className="text-emerald-600 hover:underline">Syarat &amp; Ketentuan</a> DiDesa dan perjanjian kemitraan.
          </p>
        </div>
      </section>

      {/* CTA Akhir */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-600 p-10 sm:p-14 text-center shadow-2xl shadow-emerald-900/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-16 -mb-16" />
            <h2 className="relative text-3xl sm:text-4xl font-black text-white tracking-tight">Siap Dampingi Desa-Desa Indonesia?</h2>
            <p className="relative mt-3 text-emerald-100 font-medium max-w-xl mx-auto">
              Mulai dari satu desa. Kembangkan jejaring Anda dan raih komisi berkelanjutan bersama DiDesa.
            </p>
            <a href="#daftar" className="relative inline-flex mt-7 px-8 py-4 rounded-2xl bg-white text-emerald-800 text-sm font-black uppercase tracking-widest shadow-xl hover:bg-emerald-50 transition-all active:scale-[0.98] items-center gap-2">
              Gabung Sekarang <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Modal Sukses */}
      {isSuccessModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">
            <div className="p-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black mb-2">Pendaftaran Terkirim!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Terima kasih, <strong>{registeredName}</strong>. Tim {globalName} akan memverifikasi pendaftaran Anda.
                Informasi aktivasi akun affiliator dan dashboard Anda akan dikirim ke{' '}
                <strong className="text-emerald-600">{registeredEmail}</strong>.
              </p>
              <button
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full mt-8 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 dark:shadow-emerald-900/40 transition-all active:scale-[0.98]"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}