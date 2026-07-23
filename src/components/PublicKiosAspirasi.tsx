import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, CheckCircle2, Home } from 'lucide-react';
import { showToast } from '../utils/toast';

export default function PublicKiosAspirasi() {
  const [step, setStep] = useState(1);
  const [namaPengirim, setNamaPengirim] = useState('');
  
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

  const handleSubmit = async () => {
    if (!kategori || !pesan.trim()) {
      showToast('Harap lengkapi kategori dan isi aduan', 'error');
      return;
    }

    const pengirim = namaPengirim.trim() || 'Warga Anonim';
    const tenantId = new URLSearchParams(window.location.search).get('tenant') || new URLSearchParams(window.location.search).get('t_id') || 'unknown';

    try {
      const { supabase } = await import('../utils/supabase');
      
      // 1. Insert into aspirasi
      await supabase.from('aspirasi').insert([{
        tenant_id: tenantId,
        kategori: kategori,
        pesan: pesan.trim(),
        nama_pengirim: pengirim,
        status: 'Baru'
      }]);

      // 2. Insert into notifications
      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`,
        tenant_id: tenantId,
        title: `Aspirasi Kios: ${kategori}`,
        message: `${pengirim} mengirim pengaduan/aspirasi: "${pesan.trim()}"`,
        category: 'Services',
        type: 'info',
        is_read: false,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error("Gagal mengirim data ke server:", error);
    }

    setStep(2);
    
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
              <span className="text-4xl">🔒</span>
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
          
          {/* STEP 1: Form Aduan */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-4xl bg-white p-10 rounded-3xl shadow-xl"
            >
              <div className="mb-8 pb-6 border-b border-gray-100">
                <h2 className="text-3xl font-black text-slate-800">Tuliskan Aspirasi Anda</h2>
                <p className="text-slate-500 text-lg">Pesan Anda akan langsung diterima oleh Kepala Desa tanpa perlu menggunakan NIK.</p>
              </div>
              
              <div className="space-y-8">
                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-3">Kategori Laporan</label>
                  <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-3">Nama Anda <span className="text-slate-400 font-normal">(Opsional)</span></label>
                  <input
                    type="text"
                    value={namaPengirim}
                    onChange={(e) => setNamaPengirim(e.target.value)}
                    className="w-full p-6 text-xl rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-200 outline-none transition-all"
                    placeholder="Kosongkan jika ingin mengirim secara anonim (rahasia)"
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

          {/* STEP 2: Success */}
          {step === 2 && (
            <motion.div 
              key="step2"
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
