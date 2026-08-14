import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';

// ============================================================================
// Pencarian warga berdasarkan NIK — dipanggil otomatis oleh USB Barcode/QR
// Scanner begitu 16 digit NIK terdeteksi (tanpa menekan tombol cari).
// ============================================================================

export interface SearchResidentByNIKResult {
  found: boolean;
  resident?: any;
  error?: string;
}

export async function searchResidentByNIK(nik: string): Promise<SearchResidentByNIKResult> {
  const clean = String(nik || '').replace(/\D/g, '').trim();
  if (clean.length !== 16) {
    return { found: false, error: 'NIK harus 16 digit.' };
  }
  try {
    const tenantId = await resolveCurrentTenant();
    let builder = supabase
      .from('residents')
      .select('*')
      .eq('nik', clean);
    if (tenantId) builder = builder.eq('tenant_id', tenantId);
    const { data, error } = await builder.maybeSingle();
    if (error) {
      console.error('searchResidentByNIK error:', error);
      return { found: false, error: error.message };
    }
    if (data && (String(data.is_deleted) === '1' || data.is_deleted === true)) {
      return { found: false };
    }
    return data ? { found: true, resident: data } : { found: false };
  } catch (e: any) {
    console.error('searchResidentByNIK exception:', e);
    return { found: false, error: e?.message || 'Gagal mencari warga.' };
  }
}
