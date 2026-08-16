import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, CheckCircle2, Home, User, ArrowLeft } from 'lucide-react';
import { showToast } from '../utils/toast';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { fetchResidentsCached } from '../utils/apiCache';
import { supabase } from '../utils/supabase';

export default function PublicKiosAspirasi() {
  const [step, setStep] = useState(1);
  const [nik, setNik] = useState('');
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [verifiedResident, setVerifiedResident] = useState<any>(null);

  const [kategori, setKategori] = useState('');
  const [pesan, setPesan] = useState('');
  const [desaName, setDesaName] = useState('');
  const [isTenantValid, setIsTenantValid] = useState<boolean | null>(null);

  const categories = [
    'Infrastruktur & Fasilitas Umum',
    'Pelayanan Publik Desa',
    'Keamanan & Ketertiban',
    'Bantuan Sosial & BLT',
    'Kebersihan Lingkungan',
    'Lainnya'
  ];

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    const tIdParam = urlParams.get('t_id');
    
    if (!tenantParam && !tIdParam) {
      setIsTenantValid(false);
      return;
    }
    setIsTenantValid(true);

    const storedDesa = localStorage.getItem('kop_desa') || localStorage.getItem('village_name');
    if (storedDesa) setDesaName(storedDesa);
  }, []);

  const handleVerifyNik = async () => {
    const query = nik.trim();
    if (query.length < 3) {
      showToast('Ketikkan NIK atau minimal 3 huruf nama', 'error');
      return;
    }
    
    try {
      const res = await fetchResidentsCached();
      if (!res.ok) throw new Error('Network response was not ok');
      const residents = await res.json();
      
      let match;
      if (/^\d{16}/.test(query)) {
        match = residents.find((r: any) => r.nik === query);
      } else {
        match = residents.find((r: any) => r.name?.toLowerCase().includes(query.toLowerCase()));
      }

      if (match) {
        setVerifiedResident(match);
        setStep(1.5);
      } else {
        setIsManualEntry(true);
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat memverifikasi identitas', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!kategori || !pesan.trim()) {
      showToast('Harap lengkapi kategori dan isi aduan', 'error');
      return;
    }

    const pengirim = verifiedResident?.name || manualName || 'Warga Anonim';
    const tenantId = await resolveCurrentTenant();
    
    if (!tenantId) {
      showToast('Gagal memproses aspirasi, Tenant ID tidak ditemukan.', 'error');
      return;
    }

    try {
      
      // 1. Insert into aspirasi
      await supabase.from('aspirasi').insert([{
        tenant_id: tenantId,
        kategori: kategori,
        pesan: pesan.trim(),
        nama_pengirim: pengirim,
        status: 'Baru'
      }]);

      // 2. Insert into notifications
      const { error: notifErr } = await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`,
        tenant_id: tenantId,
        title: `Aspirasi Kios: ${kategori}`,
        message: `${pengirim} mengirim pengaduan/aspirasi: "${pesan.trim()}"`,
        category: 'Services',
        is_read: false,
        timestamp: new Date().toISOString()
      }]);
      if (notifErr) console.error('Gagal membuat notif aspirasi:', notifErr);
    } catch (error) {
      console.error("Gagal mengirim data ke server:", error);
    }

    setStep(3);
    
    // Auto reset after 10s
    setTimeout(() => {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('tenant') || p.get('t_id');
      window.location.search = t ? `?tenant=${t}&tab=kios` : '?tab=kios';
    }, 10000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none relative overflow-hidden">
      
      {isTenantValid === false && (
        <div className="absolute inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-3xl p-10 max-w-lg text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">dY"'</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Akses Ditolak</h2>
            <p className="text-slate-600 text-lg mb-8">Kios Belum Dikonfigurasi. Silakan buka tautan Kios melalui Dashboard Admin Desa Anda.</p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white shadow-sm px-8 py-4 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Aduan & Aspirasi</h1>
            <p className="text-slate-500 text-sm">Layanan Mandiri {desaName}</p>
          </div>
        </div>
        
        {step === 1 && (
          <button 
            onClick={() => { const p = new URLSearchParams(window.location.search); const t = p.get('tenant') || p.get('t_id'); window.location.search = t ? `?tenant=${t}&tab=kios` : '?tab=kios'; }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold transition-colors"
          >
            <Home className="w-5 h-5" /> Kembali ke Beranda
          </button>
        )}
      </header>

      {/* Main Content area */}
      <main className="flex-1 relative flex items-center justify-center p-8">
        <AnimatePresence mode="wait">

          {/* STEP 1: NIK/Name Verification */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}
              className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-2xl text-center"
            >
              <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-12 h-12 text-amber-600" />
              </div>
              <h2 className="text-4xl font-black text-slate-800 mb-4">Verifikasi Identitas</h2>
              <p className="text-xl text-slate-500 mb-8">Silakan masukkan NIK atau Nama Lengkap Anda untuk mengirimkan aduan.</p>
              
              {!isManualEntry ? (
                <div className="flex flex-col items-center w-full">
                  <input 
                    type="text"
                    data-no-cap
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerifyNik();
                    }}
                    className="w-full text-center text-3xl md:text-4xl font-mono p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl mb-8 focus:border-amber-500 focus:ring-4 focus:ring-amber-200 outline-none"
                    placeholder="Masukkan NIK atau Nama..."
                  />

                  <button 
                    onClick={handleVerifyNik}
                    disabled={nik.trim().length < 3}
                    className="w-full py-5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-2xl font-bold rounded-2xl transition-colors shadow-lg shadow-amber-500/30"
                  >
                    Lanjutkan
                  </button>

                  <button 
                    onClick={() => setIsManualEntry(true)}
                    className="mt-6 text-amber-600 font-bold text-lg hover:underline transition-colors"
                  >
                    Bukan Penduduk Desa? Isi Data Manual / Anonim
                  </button>
                </div>
              ) : (
                <div className="space-y-6 text-left w-full">
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-800 mb-6">
                    <p className="font-medium">
                      {nik.length >= 3 ? "Data tidak ditemukan di database warga. " : ""}
                      Silakan masukkan identitas Anda untuk melanjutkan.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xl font-bold text-gray-700 mb-2">Nama Pengirim <span className="text-slate-400 font-normal">(Opsional)</span></label>
                    <input 
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      className="w-full p-4 text-xl rounded-2xl border-2 border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-200 outline-none transition-all uppercase"
                      placeholder="Kosongkan jika Anonim"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        setIsManualEntry(false);
                        setNik('');
                        setManualName('');
                      }}
                      className="w-1/3 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-colors"
                    >
                      Kembali
                    </button>
                    <button 
                      onClick={() => {
                        setVerifiedResident({ 
                          name: manualName.trim() ? manualName.trim().toUpperCase() : 'Anonim', 
                          nik: /^\d{16}/.test(nik) ? nik : '0000000000000000' 
                        });
                        setStep(2);
                      }}
                      className="w-2/3 py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-colors"
                    >
                      Lanjutkan
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 1.5: Confirm Identity */}
          {step === 1.5 && verifiedResident && (
            <motion.div 
              key="step1.5"
              initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
              className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-2xl text-center"
            >
              <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-12 h-12 text-amber-600" />
              </div>
              <h2 className="text-4xl font-black text-slate-800 mb-2">Konfirmasi Identitas</h2>
              <p className="text-xl text-slate-500 mb-8">Apakah ini data diri Anda?</p>
              
              <div className="bg-slate-50 rounded-2xl p-6 text-left mb-8 border border-slate-200">
                <div className="mb-4">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                  <p className="text-2xl font-black text-slate-800">{verifiedResident.name || '-'}</p>
                </div>
                <div className="mb-4">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">NIK</p>
                  <p className="text-xl font-medium text-slate-700 font-mono tracking-widest">{verifiedResident.nik || '-'}</p>
                </div>
                {verifiedResident.address && (
                  <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Alamat</p>
                    <p className="text-lg font-medium text-slate-700">{verifiedResident.address} RT {verifiedResident.rt || '00'} RW {verifiedResident.rw || '00'}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="w-1/3 py-5 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xl font-bold rounded-2xl transition-colors"
                >
                  Bukan
                </button>
                <button 
                  onClick={() => setStep(2)}
                  className="w-2/3 py-5 bg-amber-500 hover:bg-amber-600 text-white text-xl font-bold rounded-2xl transition-colors shadow-lg shadow-amber-500/30"
                >
                  Ya, Benar
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Form Aduan */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-4xl bg-white p-10 rounded-3xl shadow-xl"
            >
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                <button onClick={() => setStep(1)} className="p-3 bg-slate-50 rounded-full hover:bg-slate-100">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h2 className="text-3xl font-black text-slate-800">Tuliskan Aspirasi Anda</h2>
                  <p className="text-slate-500 text-lg">Mengirim sebagai: <strong className="text-slate-700">{verifiedResident?.name || manualName || 'Anonim'}</strong></p>
                </div>
              </div>
              
              <div className="space-y-8 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-3">Kategori Laporan</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setKategori(cat)}
                        className={`p-4 rounded-xl border-2 text-left text-lg font-medium transition-all ${
                          kategori === cat 
                            ? 'border-amber-500 bg-amber-50 text-amber-700' 
                            : 'border-slate-200 text-slate-600 hover:border-amber-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-3">Isi Laporan / Saran</label>
                  <textarea
                    value={pesan}
                    onChange={(e) => setPesan(e.target.value)}
                    className="w-full p-6 text-xl rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-200 outline-none transition-all resize-none h-48"
                    placeholder="Ceritakan detail keluhan atau saran Anda di sini..."
                  />
                </div>

                <button 
                  onClick={handleSubmit}
                  disabled={!kategori || !pesan.trim()}
                  className="w-full py-5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-2xl font-bold rounded-2xl transition-colors shadow-lg shadow-amber-500/30 mt-4"
                >
                  Kirim Laporan Sekarang
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Success */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-12 rounded-3xl shadow-xl w-full max-w-2xl text-center"
            >
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8"
              >
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </motion.div>
              <h2 className="text-4xl font-black text-slate-800 mb-4">Terima Kasih!</h2>
              <p className="text-2xl text-slate-600 mb-8 leading-relaxed">
                Aspirasi Anda mengenai <strong className="text-slate-800">{kategori}</strong> telah berhasil dikirim ke sistem Pemerintah Desa.
              </p>
              <p className="text-sm text-slate-400">Layar ini akan kembali ke halaman utama secara otomatis...</p>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
