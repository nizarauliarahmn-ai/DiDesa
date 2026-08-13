import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Upload, Zap, Loader2, Scan, RefreshCw, MonitorSmartphone, TabletSmartphone, QrCode, Radio, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { runKtpOcr, KtpOcrResult, isKtpResultValid, emptyKtpResult } from '../../../utils/ktpOcr';
import { showToast } from '../../../utils/toast';
import { resolveCurrentTenant } from '../../../utils/tenantResolver';
import {
  subscribeKtpScanChannel, sendKtpRequestScanWhenReady, sendKtpScanCompleteWhenReady,
  base64ToBlob, compressImageForRealtime, buildKioskScanUrl,
  RequestScanPayload, ScanCompletePayload
} from '../../../utils/ktpRealtime';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { playKtpRequestBeep, playKtpSuccessChime } from '../../../utils/sounds';

interface KTPScannerModalProps {
  open: boolean;
  onClose: () => void;
  onResult: (result: KtpOcrResult, imageBlob: Blob) => void;
  /** 'admin' = di PC Admin (ada pilihan mode). 'tablet' = di tablet/kiosk (langsung kamera, hasil dibroadcast). */
  variant?: 'admin' | 'tablet';
  /** Hanya dipakai saat variant='tablet': id sesi scan yang sedang ditangani. */
  sessionId?: string;
}

type ScanMode = 'select' | 'local' | 'remote';

export default function KTPScannerModal({ open, onClose, onResult, variant = 'admin', sessionId }: KTPScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingObjectUrlRef = useRef<string | null>(null);

  const [mode, setMode] = useState<ScanMode>('select');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Remote pairing states
  const [villageId, setVillageId] = useState<string | null>(null);
  const [remoteSession, setRemoteSession] = useState<string | null>(null);
  const [pairStatus, setPairStatus] = useState<'idle' | 'waiting' | 'received'>('idle');
  const [remotePreview, setRemotePreview] = useState<string | null>(null);
  const remoteSessionRef = useRef<string | null>(null);

  const cleanupPreview = useCallback(() => {
    if (pendingObjectUrlRef.current) {
      URL.revokeObjectURL(pendingObjectUrlRef.current);
      pendingObjectUrlRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setPreviewUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      streamRef.current = stream;
      setTorchSupported(stream.getVideoTracks().some((t: any) => {
        const caps = t.getCapabilities ? t.getCapabilities() : {};
        const advanced: any = caps.advanced || [];
        return advanced.some((a: any) => 'torch' in a);
      }));
      setCameraOn(true);
    } catch (e: any) {
      setCameraError('Kamera tidak dapat diakses. Gunakan tombol "Unggah File Foto" di bawah sebagai alternatif.');
    }
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0] as any;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(prev => !prev);
    } catch (e) {
      showToast('Torch tidak didukung oleh kamera ini.', 'error');
    }
  }, [torchOn]);

  // Resolve tenant saat modal dibuka (untuk nama channel realtime)
  useEffect(() => {
    if (open) {
      resolveCurrentTenant().then(id => {
        if (id) setVillageId(id);
      });
    }
  }, [open]);

  // Auto-start kamera di tablet (variant='tablet'): tanpa layar pemilihan mode
  useEffect(() => {
    if (open && variant === 'tablet') {
      setMode('local');
      startCamera();
    }
    return () => stopCamera();
  }, [open, variant, startCamera, stopCamera]);

  // Mode lokal admin
  useEffect(() => {
    if (open && variant === 'admin' && mode === 'local') {
      startCamera();
    }
    if (!open || variant === 'tablet') return;
    return () => {
      if (mode !== 'local') stopCamera();
    };
  }, [open, variant, mode, startCamera, stopCamera]);

  // Bersihkan preview & objectURL saat modal ditutup (ZERO STORAGE POLICY)
  useEffect(() => {
    if (!open) {
      cleanupPreview();
      setPreviewUrl(null);
      setRemotePreview(null);
      setTorchOn(false);
      setProgress(0);
      setIsProcessing(false);
      setCameraError('');
      setMode(variant === 'tablet' ? 'local' : 'select');
      setPairStatus('idle');
    }
  }, [open, variant, cleanupPreview]);

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  // ── ALIRAN TABLET: broadcast SCAN_COMPLETE setelah OCR lokal sukses ──
  const handleTabletScanComplete = useCallback(async (result: KtpOcrResult, blob: Blob) => {
    if (!villageId || !sessionId) return;
    try {
      const tempImageBase64 = await compressImageForRealtime(blob);
      const channel = subscribeKtpScanChannel(villageId, {});
      channelRef.current = channel;
      const payload: ScanCompletePayload = {
        type: 'SCAN_COMPLETE',
        session_id: sessionId,
        ocr_data: {
          nik: result.nik,
          nama: result.nama,
          tempatLahir: result.tempatLahir,
          tanggalLahir: result.tanggalLahir,
          jenisKelamin: result.jenisKelamin,
          agama: result.agama,
          pekerjaan: result.pekerjaan,
          alamat: result.alamat,
          rtRw: result.rtRw
        },
        temp_image_base64: tempImageBase64,
        timestamp: Date.now()
      };
      await sendKtpScanCompleteWhenReady(channel, payload);
      playKtpSuccessChime();
      showToast(`✓ OCR selesai — data ${result.nama || 'warga'} terkirim ke Admin.`, 'success');
      onClose();
    } catch (e) {
      console.error('Tablet scan complete error:', e);
      showToast('Gagal mengirim hasil scan ke Admin.', 'error');
    }
  }, [villageId, sessionId, onClose]);

  // ── ALIRAN PC ADMIN REMOTE: broadcast REQUEST_SCAN + tunggu SCAN_COMPLETE ──
  const startRemotePairing = useCallback(async () => {
    setPairStatus('waiting');
    setRemotePreview(null);
    const sid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    remoteSessionRef.current = sid;
    setRemoteSession(sid);

    const tid = villageId || await resolveCurrentTenant();
    if (!tid) {
      showToast('Kode desa tidak terdeteksi. Buka lewat subdomain desa.', 'error');
      setPairStatus('idle');
      return;
    }
    setVillageId(tid);

    const channel = subscribeKtpScanChannel(tid, {
      onScanComplete: (payload: ScanCompletePayload) => {
        if (payload.session_id !== remoteSessionRef.current) return;
        const blob = base64ToBlob(payload.temp_image_base64);
        pendingObjectUrlRef.current = URL.createObjectURL(blob);
        setRemotePreview(pendingObjectUrlRef.current);
        setPairStatus('received');

        const result: KtpOcrResult = {
          ...emptyKtpResult(),
          nik: payload.ocr_data?.nik || '',
          nama: payload.ocr_data?.nama || '',
          tempatLahir: payload.ocr_data?.tempatLahir || '',
          tanggalLahir: payload.ocr_data?.tanggalLahir || '',
          jenisKelamin: (payload.ocr_data?.jenisKelamin || '') as KtpOcrResult['jenisKelamin'],
          agama: payload.ocr_data?.agama || '',
          pekerjaan: payload.ocr_data?.pekerjaan || '',
          alamat: payload.ocr_data?.alamat || '',
          rtRw: payload.ocr_data?.rtRw || ''
        };
        playKtpSuccessChime();
        // Beri jeda agar user melihat preview sukses
        setTimeout(() => {
          onResult(result, blob);
          onClose();
        }, 900);
      }
    });
    channelRef.current = channel;

    const req: RequestScanPayload = {
      type: 'REQUEST_SCAN',
      session_id: sid,
      admin_id: 'pc-admin',
      timestamp: Date.now()
    };
    await sendKtpRequestScanWhenReady(channel, req);
  }, [villageId, onResult, onClose]);

  // Channel realtime dibagi via registry (jangan di-unsubscribe di sini —
  // listener tablet/PC lain memakai channel yang sama per desa).
  useEffect(() => {
    return () => {
      channelRef.current = null;
    };
  }, [open]);

  // OCR dari blob dan kirim hasil ke parent (mode lokal / tablet)
  const processImage = useCallback(async (blob: Blob, filename = 'ktp.jpg'): Promise<void> => {
    if (!blob.type.startsWith('image/')) {
      showToast('File harus berupa gambar (JPG/PNG/WebP).', 'error');
      return;
    }
    setIsProcessing(true);
    setProgress(0.05);
    try {
      const result = await runKtpOcr(blob, (p) => setProgress(Math.round(p * 100)));
      if (isKtpResultValid(result)) {
        if (variant === 'tablet') {
          await handleTabletScanComplete(result, blob);
        } else {
          onResult(result, blob);
        }
      } else {
        showToast('NIK (16 digit) tidak terdeteksi dari foto. Coba posisikan KTP lebih jelas & datar.', 'error');
        setProgress(0);
      }
    } catch (e) {
      console.error('OCR error:', e);
      showToast('Gagal membaca KTP. Silakan coba lagi.', 'error');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  }, [onResult, variant, handleTabletScanComplete]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraOn) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        cleanupPreview();
        pendingObjectUrlRef.current = canvas.toDataURL('image/jpeg', 0.9);
        setPreviewUrl(pendingObjectUrlRef.current);
        processImage(blob, 'ktp_capture.jpg');
      }
    }, 'image/jpeg', 0.9);
  }, [cameraOn, processImage, cleanupPreview]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    cleanupPreview();
    pendingObjectUrlRef.current = URL.createObjectURL(file);
    setPreviewUrl(pendingObjectUrlRef.current);
    processImage(file, file.name);
  }, [processImage, cleanupPreview]);

  if (!open) return null;

  const qrUrl = remoteSession ? buildKioskScanUrl(remoteSession, villageId || undefined) : '';

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-900/90 border-b border-slate-800 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-black text-sm">
              {variant === 'tablet' ? 'Scanner KTP — Tablet Desa' : 'Scan KTP / KK Warga'}
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold">
              {variant === 'tablet' ? 'OCR Lokal — hasil dikirim otomatis ke Admin' : 'OCR Otomatis — data terisi cepat & akurat'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Select (hanya admin) */}
      {variant === 'admin' && mode === 'select' && pairStatus === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 bg-slate-950 overflow-y-auto">
          <div className="text-center mb-2">
            <h4 className="text-white text-lg font-black mb-1">Pilih Metode Scan KTP</h4>
            <p className="text-slate-400 text-xs font-semibold">Data & foto tetap aman di memori perangkat (tidak diunggah ke server).</p>
          </div>
          <button
            onClick={() => { setMode('local'); }}
            className="w-full max-w-md flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/40 hover:border-emerald-400 text-white transition-all cursor-pointer text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <MonitorSmartphone className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-black text-sm">💻 Kamera PC Ini</p>
              <p className="text-xs text-slate-400 mt-0.5">Gunakan webcam PC/laptop ini langsung di depan KTP warga.</p>
            </div>
          </button>
          <button
            onClick={startRemotePairing}
            className="w-full max-w-md flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/40 hover:border-blue-400 text-white transition-all cursor-pointer text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <TabletSmartphone className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="font-black text-sm">📱 Panggil Tablet Scanner</p>
              <p className="text-xs text-slate-400 mt-0.5">Kamera belakang tablet desa — ideal untuk scan KTP tanpa repot.</p>
            </div>
          </button>
        </div>
      )}

      {/* Remote Pairing (menunggu tablet) */}
      {variant === 'admin' && mode === 'select' && pairStatus === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 bg-slate-950 overflow-y-auto">
          <div className="flex items-center gap-2 text-blue-400">
            <Radio className="w-5 h-5 animate-pulse" />
            <p className="text-white font-black text-sm">Menunggu Tablet Mengambil Foto KTP...</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-xl shadow-blue-500/20">
            {qrUrl ? <QRCodeSVG value={qrUrl} size={220} /> : <div className="w-[220px] h-[220px] bg-slate-800 rounded-lg animate-pulse" />}
          </div>
          <p className="text-slate-400 text-xs text-center max-w-sm leading-relaxed">
            Arahkan kamera <b className="text-white">tablet desa</b> ke QR ini, atau buka langsung:
          </p>
          <code className="px-3 py-1.5 rounded-lg bg-slate-800 text-emerald-400 text-[10px] font-mono break-all max-w-sm text-center">
            {qrUrl}
          </code>
          <button
            onClick={() => { setPairStatus('idle'); setRemoteSession(null); }}
            className="mt-2 px-5 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
          >
            Batalkan & Pilih Mode Lain
          </button>
        </div>
      )}

      {/* Remote Received (foto dari tablet diterima) */}
      {variant === 'admin' && mode === 'select' && pairStatus === 'received' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 bg-slate-950 overflow-y-auto">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
            <p className="text-white font-black text-sm">Foto KTP diterima dari Tablet!</p>
          </div>
          {remotePreview && <img src={remotePreview} alt="Preview KTP dari tablet" className="max-h-[55vh] rounded-2xl border-4 border-emerald-500/50 shadow-2xl shadow-emerald-500/20" />}
          <p className="text-emerald-400 text-xs font-bold animate-pulse">Mengisi formulir surat otomatis...</p>
        </div>
      )}

      {/* Camera / Preview Area (local + tablet) */}
      {mode === 'local' && (
        <div className="flex-1 relative overflow-hidden bg-black">
          {!isProcessing && (
            <>
              {cameraOn && !previewUrl && (
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                />
              )}
              {previewUrl ? (
                <img src={previewUrl} alt="Preview KTP" className="absolute inset-0 w-full h-full object-contain" />
              ) : cameraOn ? (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Overlay Kotak Acuan KTP (posisi umum KTP landscape) */}
                  <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-[46%] border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                  <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-[46%] border-2 border-emerald-400/80 rounded-2xl" />
                  {/* Corner marks */}
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 border-t-4 border-l-4 border-emerald-300 rounded-tl-lg mt-0" />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 border-t-4 border-r-4 border-emerald-300 rounded-tr-lg" />
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 border-b-4 border-l-4 border-emerald-300 rounded-bl-lg" />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 border-b-4 border-r-4 border-emerald-300 rounded-br-lg" />
                  <div className="absolute bottom-6 inset-x-0 flex justify-center">
                    <span className="px-4 py-1.5 rounded-full bg-black/60 border border-white/20 text-white text-[10px] font-bold tracking-widest uppercase backdrop-blur-sm">
                      Posisikan KTP di dalam bingkai
                    </span>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* Loading / Progress */}
          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/85 backdrop-blur-sm z-10">
              <div className="w-14 h-14 relative">
                <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
              </div>
              <p className="text-white text-sm font-bold">Membaca data KTP...</p>
              <p className="text-emerald-400 text-xs font-black">{progress}%</p>
            </div>
          )}

          {cameraError && !isProcessing && (
            <div className="absolute inset-x-4 top-6 p-4 bg-rose-950/80 border border-rose-500/30 rounded-2xl text-rose-100 text-xs font-semibold text-center">
              {cameraError}
            </div>
          )}
        </div>
      )}

      {/* Action Bar (local + tablet) */}
      {mode === 'local' && (
        <div className="px-5 py-5 bg-slate-900/90 border-t border-slate-800 z-20 flex items-center justify-center gap-3 flex-wrap">
          {cameraOn && (
            <button
              onClick={toggleTorch}
              disabled={!torchSupported || isProcessing}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer disabled:opacity-40 ${
                torchOn
                  ? 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/30'
                  : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Zap className="w-4 h-4" /> {torchOn ? 'Torch ON' : 'Torch'}
            </button>
          )}

          {cameraOn && !isProcessing ? (
            <button
              onClick={handleCapture}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white border-4 border-emerald-400/40 flex items-center justify-center shadow-xl shadow-emerald-500/30 transition-all active:scale-90 cursor-pointer"
              aria-label="Ambil Foto KTP"
            >
              <Camera className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={() => { if (!cameraOn) startCamera(); }}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className="w-4 h-4" /> Nyalakan Kamera
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all cursor-pointer disabled:opacity-40"
          >
            <Upload className="w-4 h-4" /> Unggah File Foto
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleFileUpload} />

          {variant === 'admin' && (
            <button
              onClick={() => setMode('select')}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer disabled:opacity-40"
            >
              <QrCode className="w-4 h-4" /> Ganti Mode
            </button>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
