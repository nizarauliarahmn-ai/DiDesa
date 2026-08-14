import { useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Hook pendeteksi input berkecepatan tinggi dari USB Barcode / QR Scanner.
// Scanner fisik berperilaku seperti keyboard: mengetik kode sangat cepat
// (biasanya < 30ms antar karakter) lalu biasanya mengirim Enter.
// ============================================================================

interface UseUsbScannerOptions {
  /** Dipanggil saat kode dari scanner terdeteksi lengkap. */
  onScan: (code: string) => void;
  /** Jumlah karakter minimal agar dianggap hasil scan (bukan ketikan manual). Default 10. */
  minBuffer?: number;
  /** Selisih waktu antar karakter (ms). Di atas nilai ini dianggap ketikan manual. Default 200ms. */
  maxGapMs?: number;
  /** Panjang kode yang memicu auto-submit langsung tanpa menunggu Enter. Default 16 (NIK). */
  autoSubmitLength?: number;
}

export function useUsbScanner({
  onScan,
  minBuffer = 10,
  maxGapMs = 200,
  autoSubmitLength = 16,
}: UseUsbScannerOptions) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const now = Date.now();

    // USB scanner biasanya mengirim Enter setelah kode selesai
    if (e.key === 'Enter') {
      const code = bufferRef.current;
      if (code.length >= minBuffer) {
        e.preventDefault();
        onScanRef.current(code);
      }
      bufferRef.current = '';
      lastKeyTimeRef.current = now;
      return;
    }

    if (/^[0-9]$/.test(e.key)) {
      // Gap terlalu lama → bukan dari scanner (ketikan manual), reset buffer
      if (bufferRef.current.length > 0 && now - lastKeyTimeRef.current > maxGapMs) {
        bufferRef.current = '';
      }
      bufferRef.current += e.key;
      lastKeyTimeRef.current = now;

      // Auto-submit begitu NIK 16 digit lengkap — tanpa perlu menekan tombol cari
      if (bufferRef.current.length === autoSubmitLength) {
        const code = bufferRef.current;
        bufferRef.current = '';
        onScanRef.current(code);
      }
    } else if (e.key.length === 1) {
      // Karakter non-digit (nama / teks lain) → bukan dari scanner
      bufferRef.current = '';
      lastKeyTimeRef.current = now;
    }
  }, [minBuffer, maxGapMs, autoSubmitLength]);

  useEffect(() => () => { bufferRef.current = ''; }, []);

  return { handleKeyDown };
}
