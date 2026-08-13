import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Upload, Zap, Loader2, Scan, ImageIcon, RefreshCw } from 'lucide-react';
import { runKtpOcr, KtpOcrResult, isKtpResultValid } from '../../../utils/ktpOcr';
import { showToast } from '../../../utils/toast';

interface KTPScannerModalProps {
  open: boolean;
  onClose: () => void;
  onResult: (result: KtpOcrResult, imageBlob: Blob) => void;
}

export default function KTPScannerModal({ open, onClose, onResult }: KTPScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  useEffect(() => {
    if (open) startCamera();
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      setTorchOn(false);
      setProgress(0);
      setIsProcessing(false);
      setCameraError('');
    }
  }, [open]);

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  // OCR dari blob dan kirim hasil ke parent
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
        onResult(result, blob);
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
  }, [onResult]);

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
        setPreviewUrl(canvas.toDataURL('image/jpeg', 0.9));
        processImage(blob, 'ktp_capture.jpg');
      }
    }, 'image/jpeg', 0.9);
  }, [cameraOn, processImage]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    processImage(file, file.name);
  }, [processImage]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-900/90 border-b border-slate-800 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-black text-sm">Scan KTP / KK Warga</h3>
            <p className="text-[10px] text-slate-400 font-semibold">OCR Otomatis — data terisi cepat & akurat</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera / Preview Area */}
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

      {/* Action Bar */}
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
      </div>
    </div>,
    document.body
  );
}