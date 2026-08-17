import { supabase } from '../utils/supabase';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { DEFAULT_SURAT_FORMAT } from '../utils/generateSuratNumber';

// ============================================================================
// Layanan Penomoran Surat Berbasis Nomor Aktif dari DB (SMART GAP-FILLING)
// ----------------------------------------------------------------------------
// ATURAN:
//  - Nomor berikutnya diambil dari NOMOR URUT TERKECIL YANG BELUM DIPAKAI
//    (gap-filling). Contoh:
//    - Surat aktif: 001-006, lalu 003 dihapus  => berikutnya 003 (sela diisi).
//    - Surat aktif: 001-005 (006 dihapus)       => berikutnya 006.
//    - Surat aktif: 001-006 (semua lengkap)     => berikutnya 007.
//  - Nomor yang Dibatalkan/Dihapus diabaikan sehingga celahnya otomatis diisi.
//  - Jika query gagal => kembalikan 0 agar caller jatuh ke fallback counter lama.
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
 * untuk klasifikasi & tahun tertentu. Mengembalikan 0 jika query gagal.
 */
export async function getMaxActiveNomorUrut(klasifikasi: string, tahun?: number): Promise<number> {
  try {
    const sequences = await getAllActiveNomorUrut(klasifikasi, tahun);
    if (sequences.length === 0) return 0;
    return Math.max(...sequences);
  } catch (e) {
    console.error('getMaxActiveNomorUrut error:', e);
    return 0;
  }
}

/**
 * Kumpulkan semua nomor urut aktif (yang belum dibatalkan/dihapus) pada tabel
 * `surat` untuk klasifikasi & tahun tertentu. Mengembalikan array kosong jika
 * query gagal sehingga caller bisa mendeteksi fallback.
 */
export async function getAllActiveNomorUrut(klasifikasi: string, tahun?: number): Promise<number[]> {
  const tenantId = await resolveCurrentTenant();
  if (!tenantId) return [];
  const targetYear = tahun || new Date().getFullYear();
  const startOfYear = new Date(targetYear, 0, 1).toISOString();
  const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999).toISOString();

  const { data, error } = await supabase
    .from('surat')
    .select('nomor')
    .eq('tenant_id', tenantId)
    // Hanya surat aktif: tolak yang dibatalkan/dihapus.
    // CATATAN: tabel `surat` TIDAK punya kolom is_deleted (lihat SCHEMA_SUPABASE.sql),
    // jadi filter is_deleted dihapus agar query tidak error -> tidak jatuh ke counter lama.
    .neq('status', 'Dibatalkan')
    .neq('status', 'Dihapus')
    .gte('created_at', startOfYear)
    .lte('created_at', endOfYear)
    .limit(5000);

  if (error) throw error;

  const sequences: number[] = [];
  for (const row of data || []) {
    if (!row?.nomor) continue;
    if (!nomorMatchesKlasifikasi(String(row.nomor), klasifikasi)) continue;
    const seq = extractSequenceFromNomor(String(row.nomor));
    if (seq > 0) sequences.push(seq);
  }
  return sequences;
}

/**
 * Nomor urut berikutnya = NOMOR URUT TERKECIL YANG BELUM DIPAKAI (gap-filling).
 * - Jika ada celah (mis. 003 dihapus), celah terkecil diisi.
 * - Jika semua lengkap, lanjut ke MAX + 1.
 * - Jika query gagal => 0 (caller fallback ke counter lama).
 */
export async function getNextAvailableNomorUrut(klasifikasi: string, tahun?: number): Promise<number> {
  const sequences = await getAllActiveNomorUrut(klasifikasi, tahun);
  const used = new Set(sequences);
  let candidate = 1;
  while (used.has(candidate)) candidate++;
  return candidate;
}

/**
 * Nomor urut berikutnya (gap-filling), diformat 3 digit (padStart).
 * Jika query gagal => "001" (caller fallback).
 */
export const getNextNomorSurat = async (kodeFormat: string, tahun: number): Promise<string> => {
  const nextNomor = await getNextAvailableNomorUrut(kodeFormat, tahun);
  const safeNext = nextNomor > 0 ? nextNomor : 1;
  return String(safeNext).padStart(3, '0');
};