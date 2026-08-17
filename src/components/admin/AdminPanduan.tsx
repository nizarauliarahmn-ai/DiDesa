import { useState, useEffect } from 'react';
import { 
  Tablet, FileText, Gift, Building2, HelpCircle, 
  Search, AlertTriangle, ExternalLink, 
  Printer, Sparkles, ShieldCheck,
  ChevronDown, ChevronRight, Copy, Check, Users, BookOpenCheck
} from 'lucide-react';
import Markdown from 'react-markdown';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import {
  GuideContentItem, DEFAULT_CATEGORIES, getGuideIcon, getCategoryLabel
} from '../../utils/guideContent';

export default function AdminPanduan() {
  const [activeCategory, setActiveCategory] = useState<string>('kiosk');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [dbItems, setDbItems] = useState<GuideContentItem[]>([]);

  const tenantName = localStorage.getItem('kop_desa') || 'Desa Anda';
  
  let userTenantId = '';
  const localAuth = localStorage.getItem('didesa_auth_user');
  if (localAuth) {
    try {
      const user = JSON.parse(localAuth);
      userTenantId = user.tenantId || '';
    } catch (e) {}
  }

  useEffect(() => {
    const loadItems = async () => {
      try {
        const { data, error } = await supabase
          .from('guide_content')
          .select('*')
          .eq('is_active', 1)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        setDbItems((data || []).sort((a, b) => a.sort_order - b.sort_order));
      } catch (err: any) {
        console.warn('Gagal memuat konten panduan dari Supabase:', err.message || err);
      }
    };
    loadItems();

    const onUpdate = () => loadItems();
    window.addEventListener('guide_content_updated', onUpdate);

    const channel = supabase
      .channel('public_guide_content_viewer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guide_content' }, () => {
        loadItems();
      })
      .subscribe();

    return () => {
      window.removeEventListener('guide_content_updated', onUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  const customCategories = Array.from(
    new Set(dbItems.map(i => i.category).filter(c => !DEFAULT_CATEGORIES.some(d => d.key === c)))
  );

  const tabs = [
    ...DEFAULT_CATEGORIES,
    ...customCategories.map(c => ({
      key: c,
      label: dbItems.find(i => i.category === c)?.category_label || c
    }))
  ];

  const labelOf = (cat: string) => {
    const item = dbItems.find(i => i.category === cat);
    if (item?.category_label) return item.category_label;
    return getCategoryLabel(cat);
  };

  const iconOf = (cat: string) => {
    const item = dbItems.find(i => i.category === cat);
    return getGuideIcon(item?.icon);
  };

  const itemsOf = (cat: string) => {
    const list = dbItems
      .filter(i => i.category === cat && i.is_active === 1)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.content.toLowerCase().includes(q) ||
      i.category_label.toLowerCase().includes(q)
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(label);
    showToast(`Tautan '${label}' berhasil disalin!`, 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderDbSection = (cat: string) => {
    const items = itemsOf(cat);
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-4 w-full">
            {labelOf(cat)}
          </h2>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-full border border-teal-100 dark:border-teal-900/50">
            <BookOpenCheck size={12} /> Dikelola oleh Platform
          </span>
        </div>

        {items.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm text-center">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Tidak ada konten yang cocok dengan pencarian "{searchQuery}".
            </p>
          </div>
        ) : cat === 'faq' ? (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)}
                  className="w-full p-4 text-left font-bold text-gray-900 dark:text-white flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-sm"
                >
                  <span>{item.title}</span>
                  {openFaq === item.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                {openFaq === item.id && (
                  <div className="p-4 text-xs text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 leading-relaxed border-t border-gray-100 dark:border-slate-800 prose prose-teal dark:prose-invert max-w-none">
                    <Markdown>{item.content}</Markdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) => {
              const Icon = getGuideIcon(item.icon);
              return (
                <div key={item.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <Icon size={20} />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white leading-snug">{item.title}</h4>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed prose prose-teal dark:prose-invert max-w-none">
                    <Markdown>{item.content}</Markdown>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const hasDbContent = (cat: string) => dbItems.some(i => i.category === cat && i.is_active === 1);

  return (
    <div className="space-y-6 pb-24 print:p-0 print:m-0">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-700/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-emerald-500/30">
              <Sparkles size={14} className="text-emerald-300" />
              Pusat Pengetahuan & Panduan Operasional
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
              Panduan Penggunaan Sistem DiDesa
            </h1>
            <p className="text-emerald-100 text-sm md:text-base max-w-2xl leading-relaxed">
              Petunjuk praktis langkah-demi-langkah penggunaan aplikasi DiDesa untuk Layar Kios Tablet, Pengurusan Surat, Buku Tamu Digital, hingga Manajemen Platform SaaS.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 backdrop-blur-sm transition-all border border-white/20"
            >
              <Printer size={16} /> Unduh / Cetak Panduan
            </button>
            <a
              href={`/?t_id=${userTenantId}&tab=kios`}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <Tablet size={16} /> Buka Kios Tablet <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Quick Search */}
        <div className="mt-8 relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kata kunci panduan (misal: Kios, Surat, QR Code, Broadcast)..."
            className="w-full pl-11 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-emerald-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
          />
        </div>
      </div>

      {/* Navigation Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none print:hidden">
        {tabs.map((tab) => {
          const TabIcon = iconOf(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shrink-0 transition-all ${
                activeCategory === tab.key
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-50 border border-gray-100 dark:border-slate-800'
              }`}
            >
              <TabIcon size={18} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">

        {/* CATEGORY 1: KIOSK & BUKU TAMU */}
        {activeCategory === 'kiosk' && (hasDbContent('kiosk') ? renderDbSection('kiosk') : (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Quick Links Box */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Tablet className="text-emerald-600" size={20} /> Tautan Cepat Layar Kios Tablet Desa {tenantName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">Tautan Portal Kios Utama</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-emerald-900 dark:text-emerald-200 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg flex-1 truncate border border-emerald-200 dark:border-emerald-800">
                      {window.location.origin}/?t_id={userTenantId}&tab=kios
                    </code>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/?t_id=${userTenantId}&tab=kios`, 'Tautan Portal Kios')}
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      {copiedIndex === 'Tautan Portal Kios' ? <Check size={14} /> : <Copy size={14} />} Salin
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                  <p className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-1">Tautan Mode Langsung Buku Tamu</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-blue-900 dark:text-blue-200 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg flex-1 truncate border border-blue-200 dark:border-blue-800">
                      {window.location.origin}/?t_id={userTenantId}&tab=buku_tamu
                    </code>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/?t_id=${userTenantId}&tab=buku_tamu`, 'Tautan Buku Tamu')}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      {copiedIndex === 'Tautan Buku Tamu' ? <Check size={14} /> : <Copy size={14} />} Salin
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Step-by-Step Guide */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-4">
                Langkah Operasional Kios Tablet di Balai Desa
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Step 1 */}
                <div className="flex gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center text-lg shrink-0 shadow-md">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-900 dark:text-white">Buka Tautan Kios di Tablet</h4>
                    <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                      Gunakan browser di tablet balai desa (Chrome/Safari), lalu buka tautan Portal Kios Desa Anda. Layar Kios publik ini bisa diakses warga tanpa harus login.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center text-lg shrink-0 shadow-md">
                    2
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-900 dark:text-white">Aktifkan Fitur Layar Menyala Terus (*Always On*)</h4>
                    <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                      Atur *Screen Timeout* di tablet ke "Never" atau gunakan aplikasi *Keep Screen On* agar tablet tidak tidur (*sleep*) saat jam pelayanan balai desa.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center text-lg shrink-0 shadow-md">
                    3
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-900 dark:text-white">Fitur Kirim Data dari Laptop Admin ke Tablet</h4>
                    <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                      Petugas admin di laptop bisa mengisi NIK & Nama tamu via menu **Buku Tamu Digital**, lalu klik **Kirim ke Layar Kiosk**. Tablet akan otomatis berpindah layar dan meminta Tanda Tangan tamu!
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center text-lg shrink-0 shadow-md">
                    4
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-900 dark:text-white">Navigasi Cepat Tombol Enter</h4>
                    <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                      Saat admin mengetik data tamu di laptop, tekan tombol **Enter** untuk berpindah antar kolom secara cepat, lalu tekan **Enter** sekali lagi di kolom terakhir untuk mengirim ke tablet.
                    </p>
                  </div>
                </div>

              </div>

              {/* Status Indicator Tip */}
              <div className="bg-amber-50 dark:bg-amber-950/40 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex items-start gap-4 text-amber-900 dark:text-amber-300">
                <AlertTriangle size={24} className="shrink-0 mt-0.5 text-amber-600" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-sm">Pemeriksaan Lampu Sinyal Kios (Realtime Status)</p>
                  <p>
                    Di pojok kanan atas tablet Kios terdapat titik indikator sinyal:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li><strong className="text-emerald-700 dark:text-emerald-400">Titik Hijau (SUBSCRIBED):</strong> Tablet terhubung sempurna dan siap menerima sinyal siaran data dari laptop admin.</li>
                    <li><strong className="text-amber-700 dark:text-amber-400">Titik Kuning (connecting):</strong> Tablet sedang mencoba menyambungkan ulang sinyal ke server. Muat ulang (refresh) halaman jika tidak kunjung hijau.</li>
                  </ul>
                </div>
              </div>

            </div>

          </div>
        ))}

        {/* CATEGORY 2: SURAT ADMINISTRASI */}
        {activeCategory === 'surat' && (hasDbContent('surat') ? renderDbSection('surat') : (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-4">
              Panduan Alur Pengurusan Surat Administrasi Desa
            </h2>

            <div className="space-y-6">
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Pengajuan Surat oleh Warga / Mandiri via Kios</h4>
                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                    Warga dapat mengajukan permohonan surat (SKTM, SKU, Surat Keterangan Usaha, dll) secara mandiri di Layar Kios Tablet cukup memasukkan NIK.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Verifikasi Otomatis NIK Penduduk</h4>
                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                    Sistem akan mencocokkan NIK pemohon dengan data kependudukan desa. Jika NIK cocok, form permohonan surat akan otomatis terisi nama, alamat, dan tanggal lahir pemohon.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Verifikasi & Cetak Surat di Dasbor Admin</h4>
                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                    Buka menu **Surat & Administrasi** di dasbor admin. Admin dapat memeriksa kelengkapan syarat, menyetujui, mencetak surat ber-KOP resmi, atau mengirimkannya ke antrean konfirmasi Kepala Desa.
                  </p>
                </div>
              </div>

            </div>
          </div>
        ))}

        {/* CATEGORY 3: BANTUAN SOSIAL */}
        {activeCategory === 'bansos' && (hasDbContent('bansos') ? renderDbSection('bansos') : (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-4">
              Panduan Pengelolaan Bantuan Sosial & Data Kependudukan
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white">Import Data Penduduk</h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  Unggah file Excel/CSV data penduduk desa Anda di menu **Penduduk**. Data NIK yang valid akan menjadi rujukan utama seluruh layanan surat dan bansos.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center">
                  <Gift size={20} />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white">Filter Penerima Bansos Bebas Ganda</h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  Gunakan menu **Bantuan Sosial** untuk menyaring warga kurang mampu (PKH, BLT, BPNT). Sistem otomatis memberikan peringatan jika terdapat penerima bansos ganda.
                </p>
              </div>

            </div>
          </div>
        ))}

        {/* CATEGORY 4: PENGATURAN KOP & PROFIL DESA */}
        {activeCategory === 'pengaturan' && (hasDbContent('pengaturan') ? renderDbSection('pengaturan') : (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-4">
              Panduan Pengaturan KOP Surat, Logo & Profil Desa
            </h2>

            <div className="space-y-6">
              
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 space-y-2">
                <h4 className="font-bold text-emerald-950 dark:text-emerald-200">1. Mengatur KOP Surat Resmi & Logo Desa</h4>
                <ol className="list-decimal pl-5 text-xs text-emerald-900 dark:text-emerald-300 space-y-1.5">
                  <li>Buka menu **Pengaturan** di sidebar sebelah kiri.</li>
                  <li>Isi nama lengkap desa, nama kecamatan, kabupaten, alamat kantor desa, serta kode pos.</li>
                  <li>Unggah **Logo Kabupaten** dan **Logo Desa** resmi. Logo ini akan otomatis tampil di bagian atas (*header*) semua surat administrasi yang dicetak.</li>
                  <li>Klik **Simpan Pengaturan**.</li>
                </ol>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <h4 className="font-bold text-indigo-950 dark:text-indigo-200">2. Mengatur Pejabat Penandatangan & TTD Digital</h4>
                <ol className="list-decimal pl-5 text-xs text-indigo-900 dark:text-indigo-300 space-y-1.5">
                  <li>Buka menu **Aparatur Desa** atau **Pengaturan**.</li>
                  <li>Masukkan nama lengkap dan NIP Kepala Desa serta Sekretaris Desa.</li>
                  <li>Bubuhkan atau unggah gambar **Tanda Tangan Digital** Kepala Desa agar verifikasi surat bisa berjalan secara otomatis dan sah.</li>
                  <li>Klik **Simpan**.</li>
                </ol>
              </div>

            </div>
          </div>
        ))}

        {/* CATEGORY 5: FAQ */}
        {activeCategory === 'faq' && (hasDbContent('faq') ? renderDbSection('faq') : (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-4">
              Pertanyaan Sering Ditanyakan (FAQ) & Solusi Kendala
            </h2>

            <div className="space-y-4">
              
              {[
                {
                  q: "Mengapa data yang dikirim dari laptop admin tidak muncul otomatis di layar tablet Kios?",
                  a: "Pastikan dua hal: (1) Layar tablet dalam keadaan terbuka di alamat Kios (?t_id=...&tab=kios), dan (2) Titik sinyal indikator di pojok kanan atas tablet berwarna HIJAU (SUBSCRIBED). Jika warna titik masih kuning, silakan muat ulang (refresh) browser tablet tersebut."
                },
                {
                  q: "Bagaimana jika tablet milik desa tidak memiliki kamera untuk scan QR Code?",
                  a: "Tidak masalah sama sekali. Warga tetap bisa mengisi buku tamu atau mengajukan surat dengan memilih tombol 'Input Manual NIK / Nama' di layar Kios tanpa perlu memindai kamera."
                },
                {
                  q: "Apakah data antara desa kami dan desa lain bisa saling tertukar?",
                  a: "Tidak bisa. Aplikasi ini menggunakan sistem keamanan Multi-Tenant Supabase. Setiap data desa diisolasi penuh menggunakan ID unik (UUID) 36 karakter yang tidak bisa ditebak."
                },
                {
                  q: "Bagaimana cara mencetak surat dengan KOP desa resmi?",
                  a: "Atur terlebih dahulu nama desa dan logo desa di menu Pengaturan. Setelah itu, setiap kali Anda mengeklik cetak surat di menu Surat & Administrasi, KOP surat resmi akan otomatis terpasang rapi."
                }
              ].map((faq) => (
                <div 
                  key={faq.q} 
                  className="border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === faq.q ? null : faq.q)}
                    className="w-full p-4 text-left font-bold text-gray-900 dark:text-white flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-sm"
                  >
                    <span>{faq.q}</span>
                    {openFaq === faq.q ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  {openFaq === faq.q && (
                    <div className="p-4 text-xs text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 leading-relaxed border-t border-gray-100 dark:border-slate-800">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}

            </div>
          </div>
        ))}

        {/* CATEGORY 6: ASISTEN AI */}
        {activeCategory === 'ai' && (hasDbContent('ai') ? renderDbSection('ai') : (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-4 flex items-center gap-2">
                <Sparkles className="text-indigo-500" /> Panduan Pengaturan Asisten AI (Desi)
              </h2>
              
              <div className="prose prose-emerald dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-slate-400">
                  Desi (Asisten AI DiDesa) menggunakan teknologi Google Gemini untuk menjawab pertanyaan secara cerdas berdasarkan data desa Anda. 
                  Sistem ini menggunakan token yang dihitung per desa, sehingga setiap desa perlu mengkonfigurasi <strong>API Key Gemini</strong> mereka sendiri.
                </p>

                <h3 className="text-lg font-bold mt-8 mb-4">Langkah 1: Mendapatkan API Key Gratis</h3>
                <ol className="list-decimal pl-5 space-y-3 text-gray-600 dark:text-slate-400">
                  <li>Buka situs <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">Google AI Studio</a>.</li>
                  <li>Login menggunakan akun Google (email) yang akan didedikasikan untuk desa ini.</li>
                  <li>Klik tombol <strong>Create API Key</strong> (Buat Kunci API).</li>
                  <li>Salin (Copy) kode unik API Key yang muncul. Kode ini bersifat rahasia.</li>
                </ol>

                <h3 className="text-lg font-bold mt-8 mb-4">Langkah 2: Memasukkan API Key ke DiDesa</h3>
                <ol className="list-decimal pl-5 space-y-3 text-gray-600 dark:text-slate-400">
                  <li>Buka tab menu <strong>Asisten AI (Desi)</strong> di sidebar kiri bawah.</li>
                  <li>Jika belum pernah diatur, akan muncul form <strong>Konfigurasi API Key AI</strong>. (Jika ingin mengganti kunci yang lama, klik tombol <strong>Ganti API Key</strong> di pojok kanan atas layar AI).</li>
                  <li>Paste (Tempelkan) API Key yang telah Anda salin sebelumnya ke dalam kolom yang tersedia.</li>
                  <li>Klik <strong>Simpan</strong>.</li>
                </ol>

                <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-4">
                  <ShieldCheck size={24} className="shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Keamanan Terjamin</h4>
                    <p className="text-sm text-indigo-800 dark:text-indigo-400 mt-1 leading-relaxed">
                      API Key ini tidak dikirim ke server pusat kami. API Key disimpan secara lokal (di browser komputer/perangkat Anda) khusus untuk desa ini. 
                      Pastikan teknisi atau admin desa menyetel API Key ini di komputer utama balai desa yang digunakan untuk mengakses dashboard DiDesa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* CUSTOM CATEGORIES */}
        {customCategories.includes(activeCategory) && renderDbSection(activeCategory)}

      </div>

    </div>
  );
}