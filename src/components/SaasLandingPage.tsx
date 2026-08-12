import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, PieChart, FileText, Smartphone, CheckCircle2, Globe, Building2, ChevronRight, LayoutDashboard, Search, X, ExternalLink, MapPin } from 'lucide-react';
import Footer from './common/Footer';
import { supabase } from '../utils/supabase';
import FormalAvatar from './common/FormalAvatar';

function getKabupatenName(tenant: any): string {
  let raw = tenant.kabupaten || tenant.nama_kabupaten || tenant.kab_kota || tenant.city || tenant.regency;
  
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    const domain = (tenant.domain || '').toLowerCase();
    const name = (tenant.nama_desa || '').toLowerCase();

    if (domain.includes('wasah') || name.includes('wasah')) {
      return 'Kabupaten Hulu Sungai Selatan';
    }
    if (domain.includes('sukamakmur') || name.includes('sukamakmur')) {
      return 'Kabupaten Bogor';
    }
    if (domain.includes('majusejahtera') || name.includes('maju')) {
      return 'Kabupaten Bandung';
    }
    if (domain.includes('sukamanah') || name.includes('sukamanah')) {
      return 'Kabupaten Garut';
    }
    return 'Kabupaten Hulu Sungai Selatan';
  }

  const isKota = /kota/i.test(raw);

  // Bersihkan awalan berulang seperti "Pemerintah", "Kabupaten", "Kab.", "Kota"
  let clean = raw.trim()
    .replace(/^pemerintah\s+/i, '')
    .replace(/^kabupaten\s+/i, '')
    .replace(/^kab\.\s+/i, '')
    .replace(/^kota\s+/i, '')
    .trim();

  return isKota ? `Kota ${clean}` : `Kabupaten ${clean}`;
}

export default function SaasLandingPage({ onLoginClick }: { onLoginClick?: () => void }) {
  const [globalColor, setGlobalColor] = useState(() => localStorage.getItem('global_app_color') || '#047857');
  const [globalLogo, setGlobalLogo] = useState(() => localStorage.getItem('global_app_logo') || '');
  const [globalPhone, setGlobalPhone] = useState(() => localStorage.getItem('global_footer_phone') || '+6281346867519');

  // Modal & Tenants state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tenants, setTenants] = useState<any[]>([]);

  useEffect(() => {
    // Pastikan tema yang digunakan adalah light/dark sesuai preferensi global
    const theme = localStorage.getItem('app_theme') || 'light';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const handleBrandingUpdate = () => {
      setGlobalColor(localStorage.getItem('global_app_color') || '#047857');
      setGlobalLogo(localStorage.getItem('global_app_logo') || '');
      setGlobalPhone(localStorage.getItem('global_footer_phone') || '+6281346867519');
    };
    window.addEventListener('global_branding_updated', handleBrandingUpdate);

    // Fetch daftar desa dari Supabase & sambungkan data Kabupaten dari saas_settings
    const fetchTenants = async () => {
      try {
        const { data: tenantsData, error } = await supabase
          .from('tenants')
          .select('*')
          .order('nama_desa', { ascending: true });

        if (error) {
          console.error('[SaasLandingPage] Error fetching tenants:', error);
        }

        if (tenantsData && tenantsData.length > 0) {
          try {
            const { data: settingsData } = await supabase
              .from('saas_settings')
              .select('tenant_id, key, value')
              .in('key', ['kop_kabupaten', 'village_kabupaten']);

            if (settingsData && settingsData.length > 0) {
              const kabupatenMap: Record<string, string> = {};
              settingsData.forEach(row => {
                if (row.tenant_id && row.value) {
                  kabupatenMap[row.tenant_id] = row.value;
                }
              });

              tenantsData.forEach(t => {
                if (t.id && kabupatenMap[t.id]) {
                  t.kabupaten = kabupatenMap[t.id];
                }
              });
            }
          } catch (e) {
            console.warn('[SaasLandingPage] saas_settings fetch skipped:', e);
          }

          setTenants(tenantsData);
        } else {
          setTenants([]);
        }
      } catch (err) {
        console.warn('Gagal memuat tenants:', err);
        setTenants([]);
      }
    };
    fetchTenants();

    return () => {
      window.removeEventListener('global_branding_updated', handleBrandingUpdate);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans selection:bg-emerald-500/30 text-slate-900 dark:text-white flex flex-col overflow-x-hidden">
      
      {/* Navbar Khusus Landing Page */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-800/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {globalLogo ? (
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg p-1.5"
                style={{ backgroundColor: globalColor }}
              >
                <img src={globalLogo} alt="DiDesa Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: globalColor }}
              >
                <Globe className="text-white" size={24} strokeWidth={2.5} />
              </div>
            )}
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              DiDesa<span style={{ color: globalColor }}>.</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#fitur" className="hover:text-emerald-600 transition-colors">Fitur</a>
            <a href="#keunggulan" className="hover:text-emerald-600 transition-colors">Keunggulan</a>
            <a href="#desa-terdaftar" className="hover:text-emerald-600 transition-colors">Desa Terdaftar</a>
            <a href="#integrasi" className="hover:text-emerald-600 transition-colors">Integrasi</a>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={onLoginClick}
              className="text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors hidden sm:block"
            >
              Masuk Kades / Admin
            </button>
            <button 
              onClick={onLoginClick}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              Login Sistem <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 pt-32 pb-20 relative">
        {/* Background Ornaments */}
        <div className="absolute top-0 left-0 w-full h-[80vh] overflow-hidden -z-10">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[70%] bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-[120px]" />
          <div className="absolute top-[10%] -right-[10%] w-[40%] h-[60%] bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-[100px]" />
          
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] dark:opacity-20 opacity-50" />
        </div>

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Platform SaaS B2G Resmi
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight">
              Sistem <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                Pemerintahan
              </span><br/>
              Era Digital
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-lg">
              <strong className="text-slate-900 dark:text-white">DiDesa</strong> — Solusi Administrasi & Digitalisasi Desa Modern Indonesia. Terintegrasi, transparan, dan mudah digunakan oleh Aparatur maupun Warga.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button onClick={onLoginClick} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl hover:-translate-y-1 flex items-center justify-center gap-3 cursor-pointer">
                <LayoutDashboard size={20} /> Masuk ke Dashboard Admin
              </button>
              <button 
                onClick={() => setIsSearchModalOpen(true)} 
                className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-2xl font-bold border border-gray-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm hover:-translate-y-1 flex items-center justify-center gap-3 cursor-pointer"
              >
                <Search size={20} /> Cari Portal Desa Saya
              </button>
            </div>
            
            <div className="flex items-center gap-4 pt-6 border-t border-gray-200 dark:border-slate-800">
              <div className="flex -space-x-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                     <FormalAvatar name={String(i)} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Telah digunakan oleh <strong className="text-slate-900 dark:text-white">ratusan desa</strong> di Indonesia.
              </div>
            </div>
          </div>

          {/* Right Side Visuals / Mockup */}
          <div className="relative z-10 lg:h-[600px] flex items-center justify-center">
            {/* Dekorasi Glow Belakang Mockup */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 blur-3xl rounded-full" />
            
            <div className="relative w-full max-w-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/40 dark:border-slate-700/50 shadow-2xl overflow-hidden shadow-emerald-900/10 transform rotate-2 hover:rotate-0 transition-transform duration-500">
              
              {/* Mockup Header */}
              <div className="h-12 bg-white/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700/50 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="mx-auto bg-white dark:bg-slate-800 h-6 px-3 rounded-md text-[10px] font-mono flex items-center text-slate-400 border border-gray-200 dark:border-slate-700">
                  sukamakmur.sistemdidesa.id
                </div>
              </div>

              {/* Mockup Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 mb-8">
                  {globalLogo ? (
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg p-2"
                      style={{ backgroundColor: globalColor }}
                    >
                      <img src={globalLogo} alt="Logo Desa" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: globalColor }}
                    >
                       <Building2 className="text-white" size={24} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight">Desa Sukamakmur</h3>
                    <p className="text-xs font-bold tracking-wide" style={{ color: globalColor }}>PORTAL WARGA</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                    <FileText className="text-emerald-600 dark:text-emerald-400 mb-2" size={24} />
                    <h4 className="font-bold text-sm">Persuratan & TTE</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Surat elektronik resmi</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                    <PieChart className="text-blue-600 dark:text-blue-400 mb-2" size={24} />
                    <h4 className="font-bold text-sm">Transparansi</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Publikasi Dana Desa</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/30 col-span-2 flex items-center justify-between">
                     <div>
                       <h4 className="font-bold text-sm">Layanan Mandiri Warga</h4>
                       <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Akses 24/7 via Kiosk / HP</p>
                     </div>
                     <Smartphone className="text-amber-500" size={32} />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle2 className="text-emerald-600" size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="fitur" className="py-24 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Sistem Terpadu Untuk Seluruh Kebutuhan Desa</h2>
            <p className="text-slate-500 dark:text-slate-400">Dirancang khusus sesuai standar administrasi pemerintahan desa di Indonesia, dengan antarmuka yang sangat mudah dipahami.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<FileText size={28} className="text-blue-500" />}
              title="Persuratan Otomatis & TTE"
              desc="Generasi surat keterangan dengan KOP resmi dan Tanda Tangan Elektronik ber-QR Code otomatis."
              bg="bg-blue-50 dark:bg-blue-900/10"
            />
            <FeatureCard 
              icon={<PieChart size={28} className="text-emerald-500" />}
              title="Buku Keuangan & Bansos"
              desc="Manajemen kas desa, laporan realisasi APBDes, serta penyaluran bantuan sosial tepat sasaran."
              bg="bg-emerald-50 dark:bg-emerald-900/10"
            />
            <FeatureCard 
              icon={<ShieldCheck size={28} className="text-rose-500" />}
              title="Layanan Mandiri & Kiosk"
              desc="Portal mandiri (Kiosk) bagi warga untuk cetak surat, buku tamu, hingga lapor aspirasi secara swadaya."
              bg="bg-rose-50 dark:bg-rose-900/10"
            />
          </div>
        </div>
      </section>

      {/* Keunggulan Section */}
      <section id="keunggulan" className="py-24 bg-slate-100/50 dark:bg-slate-800/40 border-t border-gray-150 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Mengapa Desa Memilih DiDesa?</h2>
            <p className="text-slate-500 dark:text-slate-400">Arsitektur Cloud Multi-Tenant modern yang menjamin keamanan data, transparansi publik, dan kecepatan pelayanan 24/7.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200/60 dark:border-slate-700 shadow-sm">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 mb-4 font-black">100%</div>
              <h3 className="font-bold text-lg mb-2">Cloud Multi-Tenant</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Setiap desa memiliki portal & domain independen tanpa mengganggu desa lain.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200/60 dark:border-slate-700 shadow-sm">
              <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center text-teal-600 mb-4 font-black">TTE</div>
              <h3 className="font-bold text-lg mb-2">Resmi & Keabsahan</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Persuratan dilengkapi QR Code Verifikasi Keabsahan Dokumen secara real-time.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200/60 dark:border-slate-700 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4 font-black">24/7</div>
              <h3 className="font-bold text-lg mb-2">Kiosk Anjungan Mandiri</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Warga dapat mengurus surat & melaporkan aspirasi secara mandiri di kantor desa.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200/60 dark:border-slate-700 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 mb-4 font-black">AI</div>
              <h3 className="font-bold text-lg mb-2">Asisten AI Desa</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Kecerdasan Buatan bawaan untuk membantu analisa APBDes dan pembuatan dokumen.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrasi Section */}
      <section id="integrasi" className="py-20 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-black mb-4">Terintegrasi dengan Ekosistem Digital Nasional</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto mb-10 text-sm">DiDesa mendukung format standar Kementrian Dalam Negeri, KemenDes PDTT, serta sistem keamanan data nasional.</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-70 grayscale hover:grayscale-0 transition-all">
            <span className="font-mono text-sm font-bold bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">KEMENDAGRI COMPATIBLE</span>
            <span className="font-mono text-sm font-bold bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">BANSOS DESA</span>
            <span className="font-mono text-sm font-bold bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">TTE QR-VERIFIED</span>
            <span className="font-mono text-sm font-bold bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">OPEN-API READY</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-900">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-400 via-transparent to-transparent" />
        </div>
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Siap Digitalisasi Desa Anda?</h2>
          <p className="text-emerald-100 text-lg mb-10 max-w-2xl mx-auto">Bergabung dengan ratusan desa lainnya yang telah meningkatkan efisiensi dan pelayanan publik menggunakan platform DiDesa.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
             <button onClick={onLoginClick} className="bg-white text-emerald-900 px-8 py-4 rounded-2xl font-bold shadow-2xl hover:scale-105 transition-transform cursor-pointer">
               Login ke Sistem Admin
             </button>
             <a 
               href={`https://wa.me/${globalPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Halo Tim DiDesa, saya tertarik untuk konsultasi digitalisasi desa.')}`} 
               target="_blank" 
               rel="noopener noreferrer"
               className="bg-emerald-800 text-white border border-emerald-700 px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-colors inline-flex items-center justify-center cursor-pointer"
             >
               Hubungi Tim Penjualan (WhatsApp)
             </a>
          </div>
        </div>
      </section>

      {/* Desa Terdaftar Section */}
      <section id="desa-terdaftar" className="py-24 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-3">
                <Building2 size={14} /> Ekosistem Desa Terintegrasi
              </div>
              <h2 className="text-3xl md:text-4xl font-black">Desa-Desa Pengguna DiDesa</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xl">Bergabung bersama desa-desa mandiri di Indonesia yang telah mendigitalisasi pelayanan publik & persuratan warga.</p>
            </div>
            
            <button 
              onClick={() => setIsSearchModalOpen(true)}
              className="bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors flex items-center gap-2"
            >
              <Search size={16} /> Cari Desa Lainnya
            </button>
          </div>

          {tenants.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-12 rounded-3xl text-center border border-dashed border-gray-300 dark:border-slate-700">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-40" />
              <p className="font-bold text-slate-700 dark:text-slate-200">Belum ada desa yang terdaftar secara publik</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Daftarkan desa Anda melalui panel admin SaaS DiDesa.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tenants.slice(0, 8).map((tenant) => {
                const targetUrl = window.location.hostname.includes('localhost')
                  ? `${window.location.origin}?tenant=${tenant.domain}`
                  : `https://${tenant.domain}.sistemdidesa.id`;

                return (
                  <div 
                    key={tenant.id}
                    className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-3xl border border-gray-200/60 dark:border-slate-700/60 hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md p-1"
                          style={{ backgroundColor: globalColor }}
                        >
                          {tenant.logo_url ? (
                            <img src={tenant.logo_url} alt={tenant.nama_desa} className="w-full h-full object-contain rounded-xl" />
                          ) : (
                            <Building2 className="text-white" size={24} />
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Aktif
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight group-hover:text-emerald-600 transition-colors">
                        {tenant.nama_desa}
                      </h3>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span>{getKabupatenName(tenant)}</span>
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-slate-700/50">
                      <a
                        href={targetUrl}
                        className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 hover:bg-emerald-600 hover:text-white border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2 group-hover:shadow-md"
                      >
                        <span>Kunjungi Portal</span>
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer is already full width in the component, just render it */}
      <div className="bg-white dark:bg-slate-900 pt-10 border-t border-gray-200 dark:border-slate-800">
         <div className="max-w-7xl mx-auto px-6 text-center text-sm text-slate-500 pb-10">
            &copy; {new Date().getFullYear()} Hak Cipta Dilindungi. <strong className="text-slate-700 dark:text-slate-300">DiDesa</strong> — Solusi Administrasi & Digitalisasi Desa Modern Indonesia.
         </div>
      </div>

      {/* SEARCH PORTAL POPUP MODAL */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <Search size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">Cari Portal Desa</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Temukan portal resmi desa Anda di platform DiDesa</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsSearchModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-6 pb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama desa atau subdomain (misal: Sukamakmur)..."
                  className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-900 dark:text-white"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Modal Content / Results */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {tenants.filter(t => 
                t.nama_desa?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                t.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.kabupaten?.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Building2 size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">Desa "{searchQuery}" tidak ditemukan</p>
                  <p className="text-xs mt-1">Coba gunakan nama desa lain atau hubungi admin desa Anda.</p>
                </div>
              ) : (
                tenants
                  .filter(t => 
                    t.nama_desa?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    t.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    getKabupatenName(t).toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((tenant) => {
                    const targetUrl = window.location.hostname.includes('localhost')
                      ? `${window.location.origin}?tenant=${tenant.domain}`
                      : `https://${tenant.domain}.sistemdidesa.id`;

                    return (
                      <a
                        key={tenant.id}
                        href={targetUrl}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-150 dark:border-slate-700/60 hover:border-emerald-500 hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-center gap-3.5">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm p-1 shrink-0"
                            style={{ backgroundColor: globalColor }}
                          >
                            {tenant.logo_url ? (
                              <img src={tenant.logo_url} alt={tenant.nama_desa} className="w-full h-full object-contain rounded-lg" />
                            ) : (
                              <Building2 className="text-white" size={20} />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-emerald-600 transition-colors">
                              {tenant.nama_desa}
                            </h4>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              {getKabupatenName(tenant)} • {tenant.domain}.sistemdidesa.id
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <span>Buka Portal</span>
                          <ChevronRight size={16} />
                        </div>
                      </a>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 text-center text-xs text-slate-400 font-medium">
              Portal Desa Resmi Berbasis Cloud Multi-Tenant DiDesa
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, desc, bg }: { icon: React.ReactNode, title: string, desc: string, bg: string }) {
  return (
    <div className="bg-white dark:bg-slate-800/50 p-8 rounded-3xl border border-gray-100 dark:border-slate-700/50 hover:shadow-xl hover:shadow-emerald-900/5 transition-all group">
      <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
        {desc}
      </p>
    </div>
  );
}
