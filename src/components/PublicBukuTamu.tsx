import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { capitalizeWords } from '../utils/textUtils';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  BookOpen, QrCode, User, MapPin, Briefcase, ChevronRight,
  CheckCircle2, RefreshCw, Keyboard, ArrowLeft, Home, Search
} from 'lucide-react';

const KEPERLUAN_OPTIONS = [
  'Mengurus Surat Keterangan',
  'Konsultasi / Pengaduan',
  'Urusan Administrasi',
  'Kunjungan Dinas',
  'Bantuan Sosial',
  'Urusan Tanah / Aset',
  'Silaturahmi',
  'Lainnya',
];

type KioskStep = 'form' | 'success';

export default function PublicBukuTamu() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [step, setStep] = useState<KioskStep>('form');
  const [desaName, setDesaName] = useState('Desa');
  const [scanMode, setScanMode] = useState<'qr' | 'manual'>('qr');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [manualNik, setManualNik] = useState('');

  const [form, setForm] = useState({
    nik: '', nama: '', alamat: '', instansi: '',
    keperluan: KEPERLUAN_OPTIONS[0], tujuan_temu: ''
  });
  const [isKioskMode, setIsKioskMode] = useState(false);

  useEffect(() => {
    resolveCurrentTenant().then(id => {
      if (id) setTenantId(id);
    });

    const urlParams = new URLSearchParams(window.location.search);
    const tName = urlParams.get('t_name');
    if (urlParams.get('tab') === 'buku_tamu') {
      setIsKioskMode(true);
    }
    
    if (tName) {
      setDesaName(tName);
    } else {
      const branding = localStorage.getItem('global_branding');
      if (branding) {
        try {
          const p = JSON.parse(branding);
          if (p.village_name) setDesaName(p.village_name);
        } catch {}
      }
      const kop = localStorage.getItem('kop_desa');
      if (kop) setDesaName(capitalizeWords(kop));
    }
  }, []);

  // Auto-reset to welcome after 60 seconds of inactivity on success
  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => { setStep('form'); resetForm(); }, 10000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const resetForm = () => {
    setForm({ nik: '', nama: '', alamat: '', instansi: '', keperluan: KEPERLUAN_OPTIONS[0], tujuan_temu: '' });
    setManualNik('');
    setError('');
  };

  const lookupNik = async (nik: string) => {
    setIsLookingUp(true);
    setError('');
    try {
      const { data } = await supabase
        .from('residents')
        .select('name, address, rt, rw')
        .eq('nik', nik)
        .eq('tenant_id', tenantId)
        .single();

      if (data) {
        setForm({
          nik,
          nama: capitalizeWords(data.name || ''),
          alamat: capitalizeWords(`${data.address || ''} RT ${data.rt || ''} RW ${data.rw || ''}`),
          instansi: 'Warga Desa',
          keperluan: KEPERLUAN_OPTIONS[0],
          tujuan_temu: '',
        });
      } else {
        setForm(prev => ({ ...prev, nik, nama: '', alamat: '', instansi: '' }));
      }
      setStep('form');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleScan = (results: any) => {
    if (!results || results.length === 0) return;
    const result = results[0].rawValue;
    if (!result) return;
    const nikMatch = result.match(/\b(\d{16})\b/);
    if (nikMatch) {
      lookupNik(nikMatch[1]);
    } else {
      try {
        const p = JSON.parse(result);
        if (p.nik) { lookupNik(p.nik); return; }
      } catch {}
      setError('QR tidak dikenali. Coba scan ulang atau masukkan NIK manual.');
    }
  };

  const handleManualNik = () => {
    const clean = manualNik.replace(/\D/g, '');
    if (clean.length !== 16) { setError('NIK harus 16 digit.'); return; }
    lookupNik(clean);
  };

  const handleSubmit = async () => {
    if (!form.nama.trim()) { setError('Nama wajib diisi.'); return; }
    setIsSaving(true);
    setError('');
    try {
      const { error: err } = await supabase.from('guest_book').insert([{
        id: `guest-${Date.now()}`,
        tenant_id: tenantId,
        nik: form.nik || null,
        nama: capitalizeWords(form.nama),
        alamat: capitalizeWords(form.alamat),
        instansi: capitalizeWords(form.instansi),
        keperluan: form.keperluan,
        tujuan_temu: capitalizeWords(form.tujuan_temu),
        tanggal_masuk: new Date().toISOString(),
        tanggal_keluar: null,
        status: 'hadir',
      }]);
      if (err) throw err;

      // Create Notification for Admin
      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`,
        tenant_id: tenantId,
        title: 'Tamu Baru',
        message: `${capitalizeWords(form.nama)} telah hadir. Keperluan: ${form.keperluan}`,
        category: 'Buku Tamu',
        type: 'info',
        is_read: false,
        timestamp: new Date().toISOString()
      }]);
      
      setStep('success');
    } catch {
      setError('Gagal menyimpan. Mohon coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 flex flex-col items-center justify-center p-4 relative">
      
      {isKioskMode && step === 'form' && (
        <div className="absolute top-8 left-8">
          <button 
            onClick={() => window.location.search = '?tab=kios'}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-colors backdrop-blur-md"
          >
            <Home className="w-5 h-5" /> Kembali ke Beranda
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8 mt-12 md:mt-0">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Buku Tamu Digital</h1>
        <p className="text-emerald-200 mt-1 font-medium">{desaName}</p>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* FORM */}
        {step === 'form' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="font-bold text-gray-900">Data Kunjungan</h2>
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 text-sm font-medium p-3 mb-4 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {isLookingUp && (
              <div className="py-4 text-center">
                <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Mencari data...</p>
              </div>
            )}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">NIK (Opsional)</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    data-no-cap
                    maxLength={16}
                    value={form.nik}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setForm(p => ({ ...p, nik: val }));
                      if (val.length === 16) {
                        lookupNik(val);
                      }
                    }}
                    placeholder="16 Digit NIK KTP..."
                    className="flex-1 h-12 px-4 border-2 border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:border-emerald-500 outline-none transition-all"
                  />
                  <button
                    onClick={(e) => {
                       e.preventDefault();
                       if (form.nik.length === 16) lookupNik(form.nik);
                       else setError('NIK harus 16 digit.');
                    }}
                    className="h-12 px-4 bg-emerald-100 text-emerald-700 font-bold rounded-xl hover:bg-emerald-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Isi NIK untuk otomatis melengkapi nama & alamat (khusus warga).</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm(p => ({ ...p, nama: capitalizeWords(e.target.value) }))}
                  placeholder="Nama Anda..."
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Asal / Instansi</label>
                <input
                  type="text"
                  value={form.instansi}
                  onChange={(e) => setForm(p => ({ ...p, instansi: capitalizeWords(e.target.value) }))}
                  placeholder="Desa / instansi asal..."
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Keperluan *</label>
                <select
                  value={form.keperluan}
                  onChange={(e) => setForm(p => ({ ...p, keperluan: e.target.value }))}
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:border-emerald-500 outline-none transition-all bg-white cursor-pointer"
                >
                  {KEPERLUAN_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Menemui Siapa / Bagian</label>
                <input
                  type="text"
                  value={form.tujuan_temu}
                  onChange={(e) => setForm(p => ({ ...p, tujuan_temu: capitalizeWords(e.target.value) }))}
                  placeholder="Nama staf / bagian yang dituju..."
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl border border-red-100 mt-3">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="mt-5 w-full py-4 bg-emerald-700 text-white font-bold rounded-2xl hover:bg-emerald-800 transition-all text-base disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
            >
              {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Daftar Hadir
            </button>
          </div>
        )}

        {/* SUCCESS */}
        {step === 'success' && (
          <div className="p-8 text-center space-y-5">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Terima Kasih!</h2>
              <p className="text-emerald-700 font-bold text-lg mt-1">{form.nama}</p>
              <p className="text-sm text-gray-500 mt-2">
                Kehadiran Anda telah tercatat.<br />
                Silakan menunggu di ruang tamu.
              </p>
            </div>
            <p className="text-xs text-gray-400">Halaman akan otomatis kembali dalam 10 detik...</p>
            <button
              onClick={() => { setStep('form'); resetForm(); }}
              className="w-full py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Kembali ke Halaman Utama
            </button>
          </div>
        )}
      </div>

      <p className="text-emerald-300 text-xs mt-6 text-center">
        Sistem Buku Tamu Digital &bull; Powered by DiDesa
      </p>
    </div>
  );
}
