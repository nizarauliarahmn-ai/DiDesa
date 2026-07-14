import { useState, useEffect } from 'react';

export function useLetterDescription(klasifikasi: string, fallback: string) {
  const [desc, setDesc] = useState(fallback);

  useEffect(() => {
    try {
      const catalog = JSON.parse(localStorage.getItem('desa_letter_catalog') || '[]');
      let t = catalog.find((c: any) => c.klasifikasi === klasifikasi);
      if (!t) {
        const globalCatalog = JSON.parse(localStorage.getItem('saas_global_letter_catalog') || '[]');
        t = globalCatalog.find((c: any) => c.klasifikasi === klasifikasi);
      }
      if (t && t.deskripsi) {
        setDesc(t.deskripsi);
      }
    } catch (e) {}
  }, [klasifikasi]);

  return desc;
}
