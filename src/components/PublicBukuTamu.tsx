import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { capitalizeWords } from '../utils/textUtils';
import { showToast } from '../utils/toast';
import { Scanner } from '@yudiel/react-qr-scanner';
import SignatureCanvas from 'react-signature-canvas';
import {
  BookOpen, QrCode, User, MapPin, Briefcase, ChevronRight,
  CheckCircle2, RefreshCw, Keyboard, ArrowLeft, Home, Search, FileSignature, X, AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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
  const [wsStatus, setWsStatus] = useState<string>('connecting');
  const [step, setStep] = useState<KioskStep>('form');
  const [desaName, setDesaName] = useState('Desa');
  const [scanMode, setScanMode] = useState<'qr' | 'manual'>('qr');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [manualNik, setManualNik] = useState('');

  const [form, setForm] = useState({
    nik: '', nama: '', alamat: '', instansi: '',
    keperluan: KEPERLUAN_OPTIONS[0]
  });
  const [pendingResidentToConfirm, setPendingResidentToConfirm] = useState<any>(null);
  const [isDisclaimerChecked, setIsDisclaimerChecked] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [isTenantValid, setIsTenantValid] = useState<boolean | null>(null);
  
  const signatureRef = React.useRef<any>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    const tIdParam = urlParams.get('t_id');
    const tName = urlParams.get('t_name');
    
    if (urlParams.get('tab') === 'buku_tamu') {
      setIsKioskMode(true);
      if (!tenantParam && !tIdParam) {
        setIsTenantValid(false);
        return; // strictly block if accessed via Kios mode without tenant
      }
    }
    
    setIsTenantValid(true);

    resolveCurrentTenant().then(async id => {
      if (id) {
        setTenantId(id);
        if (!tName) {
          try {
            const { data } = await supabase.from('tenants').select('nama_desa').eq('id', id).single();
            if (data && data.nama_desa) {
              setDesaName(capitalizeWords(data.nama_desa));
            }
          } catch (e) {}
        }
      }
    });

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

  // Listener for incoming broadcasts from Admin Dashboard
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase.channel(`kiosk-notif-${tenantId}`, { config: { broadcast: { ack: true } } })
      .on('broadcast', { event: 'incoming-guest' }, ({ payload }) => {
        setForm(payload);
        setStep('form');
        showToast('Data diterima dari Admin. Silakan periksa dan berikan Tanda Tangan.', 'info');
        
        // Optional: you can automatically scroll to the signature field here
        setTimeout(() => {
          document.querySelector('.signatureCanvas')?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      })
      .subscribe((status) => {
        setWsStatus(status);
      });

    return () => {
      supabase.removeChannel(channel);
      setWsStatus('disconnected');
    };
  }, [tenantId]);

  // Auto-reset to welcome after 60 seconds of inactivity on success
  useEffect(() => {
    // Check for auto-redirected incoming guest payload
    const incomingPayloadStr = localStorage.getItem('kiosk_incoming_guest');
    if (incomingPayloadStr) {
      try {
        const payload = JSON.parse(incomingPayloadStr);
        setForm(payload);
        setStep('form');
        showToast('Data diterima dari Admin. Silakan periksa dan berikan Tanda Tangan.', 'info');
        localStorage.removeItem('kiosk_incoming_guest');
      } catch (e) {
        console.error(e);
      }
    }

    if (step === 'success') {
      const timer = setTimeout(() => { setStep('form'); resetForm(); }, 10000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const resetForm = () => {
    setForm({ nik: '', nama: '', alamat: '', instansi: '', keperluan: KEPERLUAN_OPTIONS[0] });
    setManualNik('');
    setError('');
    signatureRef.current?.clear();
  };

  const lookupResident = async (query: string) => {
    if (!query || query.trim().length < 3) return;
    setIsLookingUp(true);
    setError('');
    try {
      let req = supabase
        .from('residents')
        .select('nik, name, address, rt, rw')
        .eq('tenant_id', tenantId);

      if (/^\d{16}$/.test(query.trim())) {
        req = req.eq('nik', query.trim());
      } else {
        req = req.ilike('name', `%${query.trim()}%`).limit(1);
      }

      const { data, error } = await req;
      
      if (error) {
        console.error("Supabase error detail:", error);
        setError(`DB Error: ${error.message || 'Unknown error'}`);
        return;
      }
      
      console.log("Supabase data returned:", data, "TenantID:", tenantId);

      const foundData = Array.isArray(data) ? data[0] : data;

      if (foundData) {
        setPendingResidentToConfirm({
          nik: foundData.nik || query,
          nama: capitalizeWords(foundData.name || ''),
          alamat: capitalizeWords(`${foundData.address || ''} RT ${foundData.rt || ''} RW ${foundData.rw || ''}`),
        });
      } else {
        setError(`Data warga tidak ditemukan. (Tenant: ${tenantId ? 'OK' : 'MISSING'})`);
      }
    } catch (err: any) {
      console.error(err);
      setError(`Terjadi kesalahan sistem: ${err.message || 'Unknown'}`);
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
      lookupResident(nikMatch[1]);
    } else {
      try {
        const p = JSON.parse(result);
        if (p.nik) lookupResident(p.nik);
      } catch (e) {
        console.log("Not JSON format");
      }
      setError('QR tidak dikenali. Coba scan ulang atau masukkan NIK manual.');
    }
  };

  const handleManualNik = () => {
    const clean = manualNik.replace(/\D/g, '');
    if (clean.length !== 16) { setError('NIK harus 16 digit.'); return; }
    lookupResident(clean);
  };

  const handleSubmit = async () => {
    if (!form.nama || !form.keperluan) {
      setError('Mohon lengkapi Nama dan Keperluan.');
      return;
    }
    
    setIsSaving(true);
    setError('');
    try {
      let signatureUrl = null;
      if (signatureRef.current && !signatureRef.current.isEmpty()) {
        const dataUrl = signatureRef.current.getTrimmedCanvas().toDataURL('image/png');
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const fileName = `${tenantId}/${Date.now()}-ttd.png`;
          const { error: uploadError } = await supabase.storage
            .from('signatures')
            .upload(fileName, blob, { contentType: 'image/png', cacheControl: '3600' });
            
          if (uploadError) {
            console.error('Failed to upload signature', uploadError);
          } else {
            const { data: publicUrlData } = supabase.storage.from('signatures').getPublicUrl(fileName);
            signatureUrl = publicUrlData.publicUrl;
          }
        } catch (e) {
          console.error('Error processing signature', e);
        }
      }

      const { error: err } = await supabase.from('guest_book').insert([{
        id: `guest-${Date.now()}`,
        tenant_id: tenantId,
        nik: form.nik || null,
        nama: capitalizeWords(form.nama),
        alamat: capitalizeWords(form.alamat),
        instansi: capitalizeWords(form.instansi),
        keperluan: form.keperluan,
        tujuan_temu: '-',
        signature_url: signatureUrl,
        tanggal_masuk: new Date().toISOString(),
        tanggal_keluar: null,
        status: 'hadir',
      }]);
      if (err) throw err;

      // Create Notification for Admin
      const { error: notifErr } = await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`,
        tenant_id: tenantId,
        title: 'Tamu Baru',
        message: `${capitalizeWords(form.nama)} telah hadir. Keperluan: ${form.keperluan}`,
        category: 'Buku Tamu',
        is_read: false,
        timestamp: new Date().toISOString()
      }]);
      if (notifErr) console.error('Gagal membuat notifikasi tamu:', notifErr);
      
      setStep('success');
    } catch {
      setError('Gagal menyimpan. Mohon coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 flex flex-col items-center justify-center p-4 relative">
      
      {isTenantValid === false && (
        <div className="absolute inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-3xl p-10 max-w-lg text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🔒</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Akses Ditolak</h2>
            <p className="text-slate-600 text-lg mb-8">Kios Belum Dikonfigurasi. Silakan buka tautan Kios melalui Dashboard Admin Desa Anda agar kode desa dapat terbaca dengan benar.</p>
          </div>
        </div>
      )}

      {/* Debug Indicator */}
      {isKioskMode && tenantId && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full z-50">
          <div className={`w-2.5 h-2.5 rounded-full ${wsStatus === 'SUBSCRIBED' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          <span className="text-[10px] text-white/90 font-mono font-medium">{wsStatus}</span>
        </div>
      )}

      {isKioskMode && step === 'form' && (
        <div className="absolute top-8 left-8">
          <button 
            onClick={() => { const p = new URLSearchParams(window.location.search); const t = p.get('tenant') || p.get('t_id'); window.location.search = t ? `?tenant=${t}&tab=kios` : '?tab=kios'; }}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-colors backdrop-blur-md"
          >
            <Home className="w-5 h-5" /> Kembali ke Beranda
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8 mt-12 md:mt-0 relative">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Buku Tamu Digital</h1>
        <p className="text-emerald-200 mt-1 font-medium">{desaName}</p>

        {isKioskMode && (
          <button 
            onClick={() => setShowQrCode(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-semibold transition-all backdrop-blur-md border border-white/20 shadow-lg"
          >
            <QrCode className="w-5 h-5" /> Isi Buku Tamu di HP Sendiri
          </button>
        )}
      </div>

      {/* QR Code Modal */}
      {showQrCode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowQrCode(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Scan untuk Mengisi</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Gunakan kamera HP Anda untuk memindai kode QR ini. Anda dapat mengisi buku tamu secara mandiri tanpa perlu antre di tablet.
            </p>
            
            <div className="bg-white border-2 border-dashed border-gray-200 p-4 rounded-2xl inline-block mx-auto mb-2">
              <QRCodeSVG value={window.location.href} size={200} />
            </div>
          </div>
        </div>
      )}

      {/* Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* FORM */}
        {step === 'form' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="font-bold text-gray-900">Data Kunjungan</h2>
            </div>
            
            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl mb-6 text-sm font-medium border border-rose-100 flex items-center gap-3">
                <AlertCircle size={20} className="shrink-0" />
                {error}
              </div>
            )}

            {isLookingUp && (
              <div className="py-4 text-center">
                <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Mencari data...</p>
              </div>
            )}

            {pendingResidentToConfirm && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-8 shadow-sm animate-in fade-in slide-in-from-top-4">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Konfirmasi Identitas</h3>
                <p className="text-slate-600 mb-6">Apakah ini data diri Anda?</p>
                
                <div className="bg-white rounded-xl p-5 mb-6 border border-blue-100">
                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                    <p className="text-xl font-black text-slate-800">{pendingResidentToConfirm.nama}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">NIK</p>
                    <p className="text-lg font-medium text-slate-700 font-mono tracking-widest">{pendingResidentToConfirm.nik}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Alamat</p>
                    <p className="text-md font-medium text-slate-700">{pendingResidentToConfirm.alamat}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setPendingResidentToConfirm(null);
                      setForm(p => ({ ...p, nik: '' }));
                    }}
                    className="w-1/3 py-4 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-xl transition-colors"
                  >
                    Bukan
                  </button>
                  <button 
                    onClick={() => {
                      setForm(p => ({
                        ...p,
                        nik: pendingResidentToConfirm.nik,
                        nama: pendingResidentToConfirm.nama,
                        alamat: pendingResidentToConfirm.alamat,
                        instansi: 'Warga Desa',
                        keperluan: KEPERLUAN_OPTIONS[0]
                      }));
                      setPendingResidentToConfirm(null);
                    }}
                    className="w-2/3 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/30"
                  >
                    Ya, Isi Otomatis
                  </button>
                </div>
              </div>
            )}

            <div className={`space-y-4 max-h-[60vh] overflow-y-auto pr-1 ${pendingResidentToConfirm ? 'opacity-50 pointer-events-none blur-sm transition-all' : 'transition-all'}`}>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Cari NIK / Nama Warga (Opsional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      data-no-cap
                      value={form.nik}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm(p => ({ ...p, nik: val }));
                        // Auto-search jika NIK sudah 16 digit
                        if (/^\d{16}$/.test(val.trim())) {
                          lookupResident(val.trim());
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (form.nik.trim().length >= 3) lookupResident(form.nik);
                          else setError('Ketikkan NIK atau minimal 3 huruf nama warga.');
                        }
                      }}
                      placeholder="Masukkan 16 Digit NIK atau Nama..."
                      className="flex-1 h-12 px-4 border-2 border-gray-200 rounded-xl text-sm text-gray-900 focus:border-emerald-500 outline-none transition-all"
                    />
                    <button
                      onClick={(e) => {
                         e.preventDefault();
                         if (form.nik.trim().length >= 3) lookupResident(form.nik);
                         else setError('Ketikkan NIK atau minimal 3 huruf nama warga.');
                      }}
                      className="h-12 px-4 bg-emerald-100 text-emerald-700 font-bold rounded-xl hover:bg-emerald-200 transition-all flex items-center justify-center gap-2"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Ketikkan NIK atau Nama lalu klik ikon pencarian atau Enter untuk auto-lengkapi.</p>
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
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Asal / Alamat / Instansi</label>
                <input
                  type="text"
                  value={form.instansi}
                  onChange={(e) => setForm(p => ({ ...p, instansi: capitalizeWords(e.target.value), alamat: capitalizeWords(e.target.value) }))}
                  placeholder="Desa / kota / instansi asal..."
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
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Tanda Tangan</label>
                <div className="border-2 border-gray-200 rounded-xl bg-gray-50 h-32 relative overflow-hidden">
                  <SignatureCanvas 
                    ref={signatureRef}
                    clearOnResize={false}
                    canvasProps={{className: 'signatureCanvas w-full h-32 cursor-crosshair'}}
                  />
                  <button 
                    type="button"
                    onClick={() => signatureRef.current?.clear()}
                    className="absolute top-2 right-2 text-[10px] font-bold bg-white text-gray-500 px-2 py-1 rounded shadow border hover:text-red-500"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl border border-red-100 mt-3">
                {error}
              </div>
            )}

            <div className="mt-4">
              <label className="flex items-start gap-3 p-4 bg-rose-50 rounded-xl border border-rose-100 cursor-pointer hover:bg-rose-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={isDisclaimerChecked}
                  onChange={(e) => setIsDisclaimerChecked(e.target.checked)}
                  className="mt-0.5 w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-rose-900 leading-snug">
                  Saya menyatakan bertanggung jawab penuh atas kebenaran data dan informasi yang saya berikan. Segala bentuk pemalsuan data dapat diproses sesuai hukum yang berlaku.
                </span>
              </label>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSaving || !isDisclaimerChecked}
              className={`mt-5 w-full py-4 text-white font-bold rounded-2xl transition-all text-base flex items-center justify-center gap-2 shadow-sm ${(!isSaving && isDisclaimerChecked) ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-gray-400 cursor-not-allowed'}`}
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
