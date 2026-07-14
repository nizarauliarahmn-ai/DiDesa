import { useState, useEffect } from 'react';

export function useLetterKode(klasifikasi: string) {
  const [kode, setKode] = useState('');

  useEffect(() => {
    try {
      const catalog = JSON.parse(localStorage.getItem('desa_letter_catalog') || '[]');
      let t = catalog.find((c: any) => c.klasifikasi === klasifikasi);
      if (!t) {
        const globalCatalog = JSON.parse(localStorage.getItem('saas_global_letter_catalog') || '[]');
        t = globalCatalog.find((c: any) => c.klasifikasi === klasifikasi);
      }
      if (t && t.kodeKlasifikasi) {
        setKode(t.kodeKlasifikasi);
      }
    } catch (e) {}
  }, [klasifikasi]);

  return kode;
}
