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
//  - Deteksi dibaca dari NOMOR yang tersimpan (sama seperti yang tampil di
//    daftar surat), bukan dari created_at. Tahun disaring dari angka yang
//    tertanam di nomor itu sendiri (mis. "/2026").
//  - Klasifikasi lama yang berganti nama tetap cocok via alias (SKD->SDP,
//    SKP<->SPH) agar nomor lama tetap terdeteksi.
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

function getYearIndexFromFormat(): number {
  const formatTemplate = localStorage.getItem('surat_format') || DEFAULT_SURAT_FORMAT;
  const segs = formatTemplate.split('/');
  const idx = segs.findIndex(s => s.includes('[TAHUN]') || s.includes('[TAHUN_2D]'));
  return idx >= 0 ? idx : segs.length - 1;
}

/**
 * Ambil tahun yang tertanam DI DALAM nomor surat (mis. ".../2026").
 * Deteksi ini mensejajarkan penomoran dengan angka yang TAMPAK di daftar surat,
 * alih-alih mengandalkan `created_at` yang bisa beda tahun (backdate/timezone).
 * Mengembalikan null jika tahun tidak bisa ditentukan (format kustom tanpa [TAHUN]).
 */
export function extractYearFromNomor(nomor: string): number | null {
  const parts = parseNomorParts(nomor);
  const yearIdx = getYearIndexFromFormat();
  const raw = parts[yearIdx] || '';
  const m4 = raw.match(/^(\d{4})$/);
  if (m4) return parseInt(m4[1], 10);
  const m2 = raw.match(/^(\d{2})$/);
  if (m2) return 2000 + parseInt(m2[1], 10);
  for (const p of parts) {
    const mm = p.match(/^(\d{4})$/);
    if (mm) return parseInt(mm[1], 10);
  }
  return null;
}

// Alias klasifikasi untuk kode lama yang pernah dipakai sebelum migrasi nama.
// Contoh: SKD -> SDP (SK Domisili), SKP <-> SPH, dst. Jadi nomor lama seperti
// "WHI-SKD" tetap terdeteksi saat klasifikasi sekarang "SDP".
const KLASIFIKASI_ALIASES: Record<string, string[]> = {
  'SDP': ['SKD', 'SKDPR', 'SKDP'],
  'SKD': ['SDP', 'SKDPR', 'SKDP'],
  'SKP': ['SPH'],
  'SPH': ['SKP'],
};

export function nomorMatchesKlasifikasi(nomor: string, klasifikasi: string): boolean {
  const k = (klasifikasi || '').toUpperCase().trim();
  if (!k) return true;
  const aliases = new Set([k, ...(KLASIFIKASI_ALIASES[k] || [])]);
  const parts = parseNomorParts(nomor);
  for (const p of parts) {
    const token = (p.split('-').pop() || '').replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (token && aliases.has(token)) return true;
  }
  return false;
}

export function extractSequenceFromNomor(nomor: string): number {
  const parts = parseNomorParts(nomor);
  const seqIdx = getSequenceIndexFromFormat();
  const raw = parts[seqIdx] || '';
  const m = raw.match(/^\d+/);
  if (m) return parseInt(m[0], 10);
  // Fallback: pindai segmen numerik yang bukan tahun.
  const yearIdx = getYearIndexFromFormat();
  for (let i = 0; i < parts.length; i++) {
    if (i === yearIdx) continue;
    const mm = parts[i].match(/^(\d+)$/);
    if (mm) return parseInt(mm[1], 10);
  }
  return 0;
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

  // Sumber deteksi = tabel `surat` yang SAMA dengan daftar surat (daftar surat
  // menampilkan SEMUA tahun tanpa filter). TIDAK memakai filter `created_at`
  // karena tahun yang tertanam di nomor (mis. "/2026") lebih sesuai dengan angka
  // yang terlihat di daftar; filter created_at bisa melewatkan surat backdate/
  // lintas tahun sehingga penomoran "malah kembali ke 1".
  const { data, error } = await supabase
    .from('surat')
    .select('nomor')
    .eq('tenant_id', tenantId)
    // Dua cara penghapusan yang harus dihormati:
    //  1) Hard delete => baris terhapus dari DB (tidak ikut terdeteksi).
    //  2) Batal/cancel => status 'Dibatalkan' -> DITOLAK agar nomornya diisi ulang.
    .neq('status', 'Dibatalkan')
    .neq('status', 'Dihapus')
    .limit(5000);

  if (error) throw error;

  const sequences: number[] = [];
  for (const row of data || []) {
    const nomorStr = String(row?.nomor || '');
    if (!nomorStr) continue;
    if (!nomorMatchesKlasifikasi(nomorStr, klasifikasi)) continue;
    // Batasi per tahun berdasarkan tahun yang tertanam DI NOMOR itu sendiri.
    // Jika tahun tidak bisa ditentukan, surat tetap dihitung (tidak dibuang).
    const nomorYear = extractYearFromNomor(nomorStr);
    if (nomorYear !== null && nomorYear !== targetYear) continue;
    const seq = extractSequenceFromNomor(nomorStr);
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