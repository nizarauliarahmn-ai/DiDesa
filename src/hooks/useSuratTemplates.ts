import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { getLetterClassifications, LetterClassification } from '../utils/letterClassifications';

export interface ActiveTemplate extends LetterClassification {}

/**
 * Memuat Master Template Surat AKTIF secara dinamis dari database (Supabase):
 *  - Sumber utama: tabel `letter_classifications` tenant dengan is_visible = true
 *    dan tidak dinonaktifkan oleh SaaS (is_saas_disabled != true).
 *  - Fallback: katalog global `saas_global_letter_catalog` + default lokal
 *    (via getLetterClassifications()) bila tabel kosong / terjadi error.
 *  - Realtime: berlangganan perubahan tabel `letter_classifications` agar
 *    daftar surat selalu sinkron tanpa reload.
 */
export function useSuratTemplates() {
  const [templates, setTemplates] = useState<ActiveTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromDb = useCallback(async () => {
    setLoading(true);
    let tenantId: string | null = null;
    try {
      tenantId = await resolveCurrentTenant();
    } catch (e) {
      console.warn('[useSuratTemplates] Gagal resolve tenant:', e);
    }

    try {
      if (tenantId) {
        let builder = supabase
          .from('letter_classifications')
          .select('*')
          .eq('tenant_id', tenantId)
          .neq('is_visible', false);

        // Hanya tampilkan template yang tidak dinonaktifkan SaaS
        const { data, error: dbErr } = await builder.or('is_saas_disabled.is.null,is_saas_disabled.eq.false').order('id', { ascending: true });

        if (!dbErr && data && data.length > 0) {
          const mapped: ActiveTemplate[] = data.map((c: any) => ({
            id: c.id,
            jenis: c.jenis,
            klasifikasi: c.klasifikasi,
            kodeKlasifikasi: c.kode_klasifikasi,
            deskripsi: c.deskripsi,
            noUrutTerakhir: c.no_urut_terakhir,
            isVisible: c.is_visible,
            isSaaSDisabled: c.is_saas_disabled,
            fields: c.fields,
          }));
          setTemplates(mapped);
          setError(null);
          return;
        }
      }

      // Fallback: katalog global + default, filter yang aktif
      const local = getLetterClassifications();
      const active = local.filter((t) => t.isVisible !== false && t.isSaaSDisabled !== true);
      setTemplates(active as ActiveTemplate[]);
      setError(null);
    } catch (e) {
      console.error('[useSuratTemplates] Gagal memuat template:', e);
      try {
        const local = getLetterClassifications();
        setTemplates(local.filter((t) => t.isVisible !== false && t.isSaaSDisabled !== true) as ActiveTemplate[]);
      } catch {}
      setError('Gagal memuat template surat. Menampilkan daftar lokal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromDb();

    // Realtime: sinkronkan otomatis saat template berubah di database
    const channel = supabase
      .channel('use-surat-templates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'letter_classifications' }, () => {
        loadFromDb();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadFromDb]);

  return { templates, loading, error, reload: loadFromDb };
}

/** Petakan kode klasifikasi -> tab AdminSurat (bila ada form khusus). Utk selain itu 'buat'. */
export const SURAT_FORM_TAB: Record<string, string> = {
  SKN: 'nikah',
  UND: 'undangan',
  '005': 'undangan',
  SKTM: 'sktm',
  SKBM: 'skbm',
  SKU: 'sku',
  SKPH: 'skph',
  SKD: 'skd',
  SKDPR: 'skd',
  SDP: 'skd',
  SDU: 'sdu',
  SKM: 'skm',
  SKH: 'skh',
  SKL: 'skl',
  SKP: 'skp',
  SPT: 'spt',
  SPPD: 'sppd',
  SKKT: 'skkt',
};

export function getSuratFormTab(klasifikasi: string): string {
  return SURAT_FORM_TAB[klasifikasi] || 'buat';
}