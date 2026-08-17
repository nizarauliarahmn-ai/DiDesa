import { useCallback, useEffect, useState } from 'react';
import { getNextNomorSurat } from '../services/penomoranSuratService';

/**
 * Hook terpusat (SSOT) untuk mengambil nomor urut berikutnya.
 * Memanggil `getNextNomorSurat()` dari `penomoranSuratService.ts` — satu-satunya
 * tempat kalkulasi urutan surat. Modul lain TIDAK boleh menghitung urutan sendiri.
 */
export function useNextNomorSurat(klasifikasi?: string, year?: number) {
  const [nomor, setNomor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!klasifikasi) {
      setNomor(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getNextNomorSurat(klasifikasi, year)
      .then((n) => {
        if (!cancelled) setNomor(n);
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [klasifikasi, year, refreshKey]);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { nomor, loading, error, refetch };
}