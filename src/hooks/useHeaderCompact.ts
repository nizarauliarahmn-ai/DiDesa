import { useEffect, useState } from 'react';

/**
 * Deteksi scroll untuk mengecilkan header sticky (judul + subjudul).
 * Hysteresis agar tidak kecipratan buka-tutup: kecilkan saat scroll > shrinkAt,
 * kembalikan saat scroll < expandAt. Kontainer scroll utama admin adalah <main>.
 */
export function useHeaderCompact(shrinkAt = 60, expandAt = 20): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const scroller = document.querySelector('main');
    const handleScroll = () => {
      const current = scroller ? (scroller as HTMLElement).scrollTop : window.scrollY;
      setCompact(prev => {
        if (!prev && current > shrinkAt) return true;
        if (prev && current < expandAt) return false;
        return prev;
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    scroller?.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      scroller?.removeEventListener('scroll', handleScroll);
    };
  }, [shrinkAt, expandAt]);

  return compact;
}
