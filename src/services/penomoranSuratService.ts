import { supabase } from '../utils/supabase';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { DEFAULT_SURAT_FORMAT } from '../utils/generateSuratNumber';

// ============================================================================
// Layanan Penomoran Surat Berbasis MAX(nomor_urut) + 1
// ----------------------------------------------------------------------------
// ATURAN:
//  - Hapus nomor terakhir (001-006, hapus 006) => tertinggi tersisa 005 => berikutnya 006.
//  - Hapus nomor tengah (001-005, hapus 003)   => tertinggi tersisa 005 => tetap lanjut 006
//    (TIDAK mengisi sela tengah).
//  - Nomor berikutnya = MAX(sequence aktif) + 1, tanpa mengisi celah yang kosong.
//
// Tabel nyata di DB: `surat` (bukan `surats`). Nomor disimpan TERFORMAT, misal
// "140/061/WHI-SU/2025", jadi sequence diekstrak dari string nomor berdasarkan
// format yang dikonfigurasi (`surat_format` / DEFAULT_SURAT_FORMAT).
// ============================================================================

function parseNomorParts(nomor: string): string[] {
  return String(nomor || '').split('/').map(p => p.trim()).filter(Boolean);
}

function getSequenceIndexFromFormat(): number {
  const formatTemplate = localStorage.getItem('surat_format') || DEFAULT_SURAT_FORMAT;
  const segs = formatTemplate.split('/');
  const idx = segs.findIndex(s => s.includes('[NO URUT SURAT]') || s.includes('[NO]'));
  return idx >= 0 ? idx : 1;
}

export function extractSequenceFromNomor(nomor: string): number {
  const parts = parseNomorParts(nomor);
  const seqIdx = getSequenceIndexFromFormat();
  const raw = parts[seqIdx] || '';
  const m = raw.match(/^\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

export function nomorMatchesKlasifikasi(nomor: string, klasifikasi: string): boolean {
  const k = (klasifikasi || '').toUpperCase();
  if (!k) return true;
  const parts = parseNomorParts(nomor);
  for (const p of parts) {
    const token = (p.split('-').pop() || '').replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (token === k) return true;
  }
  return false;
}

/**
 * Ambil nomor urut tertinggi (MAX) yang masih aktif pada tabel `surat`
 * untuk klasifikasi & tahun tertentu. Mengembalikan -1 jika query gagal.
 */
export async function getMaxActiveNomorUrut(klasifikasi: string, tahun?: number): Promise<number> {
  try {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return -1;
    const targetYear = tahun || new Date().getFullYear();
    const startOfYear = new Date(targetYear, 0, 1).toISOString();
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999).toISOString();

    const { data, error } = await supabase
      .from('surat')
      .select('nomor')
      .eq('tenant_id', tenantId)
      // Hanya surat aktif: tolak yang dibatalkan, dihapus, atau di-soft-delete (is_deleted=1)
      .neq('status', 'Dibatalkan')
      .neq('status', 'Dihapus')
      .or('is_deleted.is.null,is_deleted.eq.0')
      .gte('created_at', startOfYear)
      .lte('created_at', endOfYear)
      .limit(5000);

    if (error) throw error;

    let maxNomor = 0;
    for (const row of data || []) {
      if (!row?.nomor) continue;
      if (!nomorMatchesKlasifikasi(String(row.nomor), klasifikasi)) continue;
      const seq = extractSequenceFromNomor(String(row.nomor));
      if (seq > maxNomor) maxNomor = seq;
    }
    return maxNomor;
  } catch (e) {
    console.error('getMaxActiveNomorUrut error:', e);
    return -1;
  }
}

/**
 * Nomor urut berikutnya = MAX(nomor_urut aktif) + 1, diformat 3 digit (padStart).
 * Jika belum ada surat aktif => "001". Jika query gagal => "001" (caller fallback).
 */
export const getNextNomorSurat = async (kodeFormat: string, tahun: number): Promise<string> => {
  const maxNomor = await getMaxActiveNomorUrut(kodeFormat, tahun);
  const safeMax = maxNomor > 0 ? maxNomor : 0;
  const nextNomor = safeMax + 1;
  return String(nextNomor).padStart(3, '0');
};