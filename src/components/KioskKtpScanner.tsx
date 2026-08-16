import { useState, useEffect, useRef, useCallback } from 'react';
import { Scan, Radio, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import KTPScannerModal from './admin/surat/KTPScannerModal';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { subscribeKtpScanChannel, RequestScanPayload, ktpScanChannelName } from '../utils/ktpRealtime';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { playKtpRequestBeep } from '../utils/sounds';
import { KtpOcrResult } from '../utils/ktpOcr';

/**
 * Halaman Scanner KTP di Tablet/Kiosk Desa.
 * Route: /kiosk/scan?session=xxx&t_id=yyy
 * - Mendengarkan event REQUEST_SCAN dari PC Admin via Supabase Realtime.
 * - Saat menerima: berbunyi lembut + OTOMATIS membuka modal kamera KTP.
 * - Setelah OCR selesai di tablet, mengirim SCAN_COMPLETE kembali ke PC Admin.
 * - Foto KTP hanya ada di RAM tablet (Zero Supabase Storage).
 */
export default function KioskKtpScanner() {
  const [desaName, setDesaName] = useState('');
  const [villageId, setVillageId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'ready' | 'scanning' | 'done'>('idle');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingSessionRef = useRef<string | null>(null);
  const [flash, setFlash] = useState(false);

  // Resolve tenant + subscribe channel
  useEffect(() => {
    let cancelled = false;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');

    resolveCurrentTenant().then(async (tid) => {
      if (cancelled || !tid) return;
      setVillageId(tid);

      const storedDesa = localStorage.getItem('kop_desa') || localStorage.getItem('village_name');
      if (storedDesa) setDesaName(storedDesa);

      const channel = subscribeKtpScanChannel(tid, {
        onRequestScan: (payload: RequestScanPayload) => {
          if (!payload || !payload.session_id) return;
          pendingSessionRef.current = payload.session_id;
          playKtpRequestBeep();
          setActiveSession(payload.session_id);
          setStatus('scanning');
          setScannerOpen(true);
        }
      });
      channelRef.current = channel;
      setStatus('ready');

      // Jika dibuka langsung via QR (sudah ada session di URL), langsung aktifkan scanner
      if (sessionParam) {
        pendingSessionRef.current = sessionParam;
        playKtpRequestBeep();
        setActiveSession(sessionParam);
        setStatus('scanning');
        setScannerOpen(true);
      }
    });

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const handleScannerClose = useCallback(() => {
    setScannerOpen(false);
    setStatus('idle');
    setActiveSession(null);
    pendingSessionRef.current = null;
  }, []);

  const handleScannerResult = useCallback((_result: KtpOcrResult, _blob: Blob) => {
    // Di mode tablet, hasil OCR dibroadcast oleh KTPScannerModal sendiri.
    // Callback ini hanya untuk memberi umpan balik visual.
    setStatus('done');
    setScannerOpen(false);
    setFlash(true);
    setTimeout(() => {
      setFlash(false);
      setStatus('idle');
      setActiveSession(null);
      pendingSessionRef.current = null;
    }, 2200);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col font-sans select-none overflow-hidden relative text-slate-200">
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      {/* Flash overlay saat berhasil */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8 }}
            className="absolute inset-0 z-40 bg-emerald-400 pointer-events-none flex items-center justify-center"
          >
            <div className="text-center">
              <CheckCircle2 className="w-24 h-24 text-white mx-auto mb-4" />
              <p className="text-white text-3xl font-black">Data Terkirim ke Admin!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="relative z-10 pt-16 pb-10 px-8 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-emerald-500/40 backdrop-blur-md mb-6">
          <Scan className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold tracking-wide text-emerald-300">REMOTE KTP SCANNER — TABLET DESA</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black mb-3 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
          Scanner KTP Warga
        </h1>
        <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl">
          {desaName ? `Pemerintah Desa ${desaName}` : 'Pemerintah Desa'}
        </p>
        <p className="text-slate-500 text-sm mt-2">
          Siap menerima permintaan scan dari Admin — koneksi realtime aktif.
        </p>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 px-6 pb-16">
        {/* Status Card */}
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            {status === 'ready' && (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-ping" />
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Radio className="w-9 h-9 text-emerald-400" />
                </div>
              </>
            )}
            {status === 'scanning' && (
              <div className="absolute inset-0 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Loader2 className="w-9 h-9 text-blue-400 animate-spin" />
              </div>
            )}
            {status === 'done' && (
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              </div>
            )}
          </div>

          {status === 'ready' && (
            <>
              <h2 className="text-2xl font-black text-white mb-2">Menunggu Permintaan</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ketika Admin mengklik <b className="text-emerald-300">"Panggil Tablet Scanner"</b> di komputer,
                tablet ini akan berbunyi & otomatis membuka kamera. Arahkan kamera ke KTP warga.
              </p>
            </>
          )}
          {status === 'scanning' && (
            <>
              <h2 className="text-2xl font-black text-white mb-2">📱 Kamera Dibuka!</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ambil foto KTP warga menggunakan kamera belakang. Data dibaca otomatis di tablet & dikirim ke Admin.
              </p>
            </>
          )}
          {status === 'done' && (
            <>
              <h2 className="text-2xl font-black text-white mb-2">✓ Terkirim ke Admin</h2>
              <p className="text-slate-400 text-sm leading-relaxed">Silakan tunggu permintaan scan berikutnya.</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Realtime Channel: <code className="text-emerald-400 font-mono">{villageId ? ktpScanChannelName(villageId) : 'ktp_scan_...'}</code>
        </div>

        <button
          onClick={() => {
            playKtpRequestBeep();
            setStatus('scanning');
            setScannerOpen(true);
          }}
          className="mt-2 px-6 py-3 rounded-2xl text-sm font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer flex items-center gap-2"
        >
          <Camera className="w-4 h-4" /> Buka Kamera Manual (Tes)
        </button>
      </main>

      {/* Modal Scanner Tablet */}
      <KTPScannerModal
        open={scannerOpen}
        onClose={handleScannerClose}
        onResult={handleScannerResult}
        variant="tablet"
        sessionId={activeSession || undefined}
      />
    </div>
  );
}
