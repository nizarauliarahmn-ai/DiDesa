import React, { useRef, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, QrCode, Keyboard } from 'lucide-react';

interface AdminQRScannerProps {
  onResult: (nik: string) => void;
  onClose: () => void;
}

export default function AdminQRScanner({ onResult, onClose }: AdminQRScannerProps) {
  const [manualNik, setManualNik] = useState('');
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [error, setError] = useState('');

  const handleScan = (results: any) => {
    if (!results || results.length === 0) return;
    const result = results[0].rawValue;
    if (!result) return;
    // Extract NIK: could be raw NIK (16 digits), or JSON/URL containing NIK
    const nikMatch = result.match(/\b(\d{16})\b/);
    if (nikMatch) {
      onResult(nikMatch[1]);
    } else {
      // Try to parse JSON
      try {
        const parsed = JSON.parse(result);
        if (parsed.nik) { onResult(parsed.nik); return; }
      } catch {}
      setError(`QR tidak dikenali. Pastikan Anda scan QR DiDesa atau KTP yang valid.`);
    }
  };

  const handleManualSubmit = () => {
    const clean = manualNik.replace(/\D/g, '');
    if (clean.length !== 16) {
      setError('NIK harus 16 digit angka.');
      return;
    }
    onResult(clean);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-gray-900 dark:text-white">Scan QR / Input NIK</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex p-4 gap-2">
          <button
            onClick={() => setMode('scan')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'scan' ? 'bg-emerald-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}
          >
            <QrCode className="w-4 h-4" />
            Scan QR
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'manual' ? 'bg-emerald-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}
          >
            <Keyboard className="w-4 h-4" />
            Input NIK
          </button>
        </div>

        {/* Scanner or Manual */}
        <div className="px-4 pb-4">
          {mode === 'scan' ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-emerald-200 dark:border-emerald-800">
              <Scanner
                onScan={handleScan}
                onError={(e) => setError(String(e))}
              />
              {/* Scanning overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-emerald-400 rounded-xl opacity-70 animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">NIK Tamu</label>
                <input
                  type="tel"
                  data-no-cap
                  maxLength={16}
                  value={manualNik}
                  onChange={(e) => { setManualNik(e.target.value.replace(/\D/g, '')); setError(''); }}
                  placeholder="Masukkan 16 digit NIK..."
                  className="mt-1 w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                />
              </div>
              <button
                onClick={handleManualSubmit}
                className="w-full py-2.5 bg-emerald-700 text-white text-sm font-bold rounded-xl hover:bg-emerald-800 transition-all active:scale-95"
              >
                Cari Data Tamu
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg font-medium">
              {error}
            </p>
          )}

          <p className="mt-3 text-[10px] text-gray-400 text-center">
            Arahkan kamera ke QR Code DiDesa atau KTP tamu.<br/>
            Jika gagal, gunakan mode Input NIK Manual.
          </p>
        </div>
      </div>
    </div>
  );
}
