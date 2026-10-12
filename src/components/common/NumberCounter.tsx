import { useState, useEffect } from 'react';

interface NumberCounterProps {
  end: number;
  duration?: number; // duration in ms
  prefix?: string;
  suffix?: string;
  formatter?: (val: number) => string;
}

export default function NumberCounter({ end, duration = 1500, prefix = '', suffix = '', formatter }: NumberCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Pengguna dengan preferensi reduce-motion: langsung tampil nilai akhir tanpa animasi
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || end === 0) {
      setCount(end);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;
    let lastUpdate = 0;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      // Batasi update ~20x/detik (bukan tiap frame) — jauh mengurangi re-render/reflow
      // saat banyak counter berjalan serentak, anti-jitter di perangkat mobile.
      if (timestamp - lastUpdate >= 50 || progress === 1) {
        lastUpdate = timestamp;
        setCount(Math.floor(easeProgress * end));
      }

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [end, duration]);

  const displayValue = formatter ? formatter(count) : count.toLocaleString();

  // tabular-nums: lebar digit seragam sehingga teks tidak "bergoyang" saat angka berubah
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{prefix}{displayValue}{suffix}</span>;
}
