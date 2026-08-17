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
//  - PENOMORAN GLOBAL (satu urutan untuk SEMUA jenis surat) sesuai kebijakan
//    desa. Deteksi tidak memfilter per-klasifikasi agar tidak kembali ke 001.
//  - Deteksi dibaca dari NOMOR yang tersimpan (sama seperti yang tampil di
//    daftar surat), bukan dari created_at. Tahun disaring dari angka yang
//    tertanam di nomor itu sendiri (mis. "/2026").
//  - Klasifikasi lama yang berganti nama tetap cocok via alias (SKD->SDP,
//    SKP<->SPH) agar nomor lama tetap terdeteksi.
//  - Ekstraksi urutan memakai MULTI-STRATEGY SMART EXTRACTOR (format-index,
//    angka-diantara-garis-miring, deretan-angka, scan segmen) sehingga tahan
//    variasi kapital/kecil, spasi, atau letak segmen di data lama.
//  - Jika query gagal => kembalikan 0 agar caller jatuh ke fallback counter lama.
//
// Tabel nyata di DB: `surat` (bukan `surats`). Nomor disimpan TERFORMAT, misal
// "140/061/WHI-SU/2025", jadi sequence diekstrak dari string nomor berdasarkan
// format yang dikonfigurasi (`surat_format` / DEFAULT_SURAT_FORMAT).
// ============================================================================

function parseNomorParts(nomor: string): string[] {
  return String(nomor || '').split('/').map(p => p.trim()).filter(Boolean);
}

/**
 * Normalisasi nomor surat: trim + FULL UPPERCASE.
 * Data lama di DB bisa tersimpan campur huruf (mis. "475/075/Whi-Skp/2026"),
 * sedangkan kode baru pakai "WHI-SKP". Seluruh deteksi/pembandingan dilakukan
 * pada bentuk normal ini sehingga pencarian bebas kapital/kecil.
 */
export function normalizeNomorSurat(nomor: string): string {
  return String(nomor || '').trim().toUpperCase();
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
 * Reset otomatis per tahun hanya aktif bila user SECARA EKSPLISIT menyimpan
 * toggle "Reset Setiap Awal Tahun" = ON di Pengaturan Penomoran Surat
 * (`surat_autoreset === 'true'`). Default (belum diatur / 'false') = NONAKTIF,
 * sehingga penomoran meneruskan nomor dari daftar surat (mis. 060 -> 061)
 * dan tidak "kembali ke 001" saat tahun berganti.
 */
export function isAutoResetEnabled(): boolean {
  return localStorage.getItem('surat_autoreset') === 'true';
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
  const parts = parseNomorParts(normalizeNomorSurat(nomor));
  for (const p of parts) {
    const token = (p.split('-').pop() || '').replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (token && aliases.has(token)) return true;
  }
  return false;
}

/**
 * Multi-Strategy Smart Number Extractor.
 * Mencoba beberapa strategi berurutan sampai menemukan nomor urut yang valid,
 * supaya urutan tetap konsisten & berlanjut meski format string bervariasi
 * (kapital/kecil, spasi, atau letak segmen yang berubah di data lama).
 * Tahun (angka 4 digit) sengaja diabaikan agar tidak tersangkut sebagai urutan.
 */
export function extractSequenceFromNomor(nomor: string): number {
  const normalized = normalizeNomorSurat(nomor);
  const parts = parseNomorParts(normalized);
  const seqIdx = getSequenceIndexFromFormat();
  const yearIdx = getYearIndexFromFormat();

  // STRATEGY A: segmen sesuai format yang dikonfigurasi (paling otoritatif,
  // cocok dengan cara aplikasi ini membuat nomor).
  const rawA = parts[seqIdx] || '';
  const mA = rawA.match(/^\d+/);
  if (mA) {
    const v = parseInt(mA[0], 10);
    if (v > 0 && v < 2000) return v;
  }

  // STRATEGY B: angka pertama yang diapit dua garis miring.
  // "475/075/Whi-Skp/2026" -> 075; "474/060/WHI-SKN/2026" -> 060.
  const mB = normalized.match(/\/\s*(\d{1,3})\s*\//);
  if (mB && mB[1]) {
    const v = parseInt(mB[1], 10);
    if (v > 0 && v < 2000) return v;
  }

  // STRATEGY C: seluruh deretan angka; angka kedua (indeks >= 1) biasanya nomor
  // urut di format Indonesia (mis. [475, 60, 2026] -> 60). Angka 4 digit (tahun)
  // dilewati.
  const allNums = normalized.match(/\d+/g) || [];
  for (let i = 1; i < allNums.length; i++) {
    const v = parseInt(allNums[i], 10);
    if (!isNaN(v) && v > 0 && v < 2000) return v;
  }

  // STRATEGY D: pindai segmen numerik yang bukan tahun.
  for (let i = 0; i < parts.length; i++) {
    if (i === yearIdx) continue;
    const mm = parts[i].match(/^(\d+)$/);
    if (mm) {
      const v = parseInt(mm[1], 10);
      if (v > 0 && v < 2000) return v;
    }
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
 * `surat`. Mengembalikan array kosong jika query gagal sehingga caller bisa
 * mendeteksi fallback.
 *
 * Pembatasan per tahun HANYA berlaku bila "Reset Setiap Awal Tahun" aktif
 * (`surat_autoreset === 'true'`). Default = semua surat aktif lintas tahun
 * ikut dihitung agar penomoran meneruskan (060 -> 061), tidak kembali ke 001.
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
  //
  // PENTING (kebijakan desa): penomoran memakai SATU URUTAN GLOBAL yang
  // diakumulasikan untuk SEMUA jenis surat (lihat AdminSuratPenomoran
  // "Sistem Penomoran Urut Tunggal (Global) Aktif"). Oleh karena itu parameter
  // `klasifikasi` TIDAK dipakai untuk memfilter — seluruh surat aktif tahun
  // berjalan ikut dihitung, agar nomor berikutnya selalu MAX global + 1
  // (gap-filling) dan tidak "malah kembali ke 001" saat membuat jenis lain.
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
    const nomorStr = normalizeNomorSurat(String(row?.nomor || ''));
    if (!nomorStr) continue;
    // Batasi per tahun hanya bila "Reset Setiap Awal Tahun" AKTIF
    // (surat_autoreset === 'true'). Tahun dibaca DARI NOMOR itu sendiri;
    // jika tidak bisa ditentukan, surat tetap dihitung (tidak dibuang).
    if (isAutoResetEnabled()) {
      const nomorYear = extractYearFromNomor(nomorStr);
      if (nomorYear !== null && nomorYear !== targetYear) continue;
    }
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

// ============================================================================
// SINGLE SOURCE OF TRUTH (SSOT) — SATU-SATUNYA TEMPAT KALKULASI NOMOR URUT
// ----------------------------------------------------------------------------
// ATURAN BAKU:
//  - SEMUA modul (kartu jenis surat, form pembuat, header modal, pratinjau,
//    payload simpan) WAJIB mengambil nomor urut berikutnya dari sini.
//    DILARANG menghitung urutan sendiri di luar file ini.
//  - Urutan GLOBAL: satu urutan untuk SEMUA jenis surat (kebijakan desa).
//  - Gap-filling: nomor urut terkecil yang belum dipakai di daftar surat aktif.
//  - "Reset Setiap Awal Tahun" hanya aktif bila toggle disimpan EKSPLISIT ON
//    (`surat_autoreset === 'true'`); default = meneruskan nomor dari daftar.
// ============================================================================

const GLOBAL_SEQ_KEY = 'global_letter_sequence_number';
const LAST_YEAR_KEY = 'last_year_global';

export function getGlobalSequenceCounter(): number {
  const stored = localStorage.getItem(GLOBAL_SEQ_KEY);
  if (stored !== null) {
    const n = parseInt(stored, 10);
    if (!isNaN(n)) return n;
  }
  return 0;
}

export function saveGlobalSequenceCounter(num: number): void {
  localStorage.setItem(GLOBAL_SEQ_KEY, String(num));
  // Jaga klasifikasi tetap sinkron dengan counter global (badge lama).
  const stored = localStorage.getItem('letter_classifications');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Array<Record<string, unknown>>;
      if (Array.isArray(parsed)) {
        localStorage.setItem('letter_classifications', JSON.stringify(parsed.map(c => ({ ...c, noUrutTerakhir: num }))));
      }
    } catch (e) {}
  }
}

export function getLastGlobalSequenceYear(): number {
  const stored = localStorage.getItem(LAST_YEAR_KEY);
  return stored !== null ? parseInt(stored, 10) : NaN;
}

export function setLastGlobalSequenceYear(year: number): void {
  localStorage.setItem(LAST_YEAR_KEY, String(year));
}

/**
 * HITUNGAN TUNGGAL nomor urut berikutnya (SSOT, async berbasis DB).
 * 1) Tahun berganti + autoReset ON  => 1 (mulai siklus tahun baru).
 * 2) DB  => nomor urut terkecil yang belum dipakai (gap-filling, global).
 * 3) Query gagal                    => fallback counter lama.
 */
export async function getNextNomorSurat(klasifikasi: string, year?: number): Promise<number> {
  const currentYear = year || new Date().getFullYear();
  const lastYear = getLastGlobalSequenceYear();

  if (isAutoResetEnabled() && !isNaN(lastYear) && lastYear !== currentYear) {
    return 1;
  }

  try {
    const nextAvailable = await getNextAvailableNomorUrut(klasifikasi, currentYear);
    if (nextAvailable > 0) return nextAvailable;
  } catch (e) {
    console.error('getNextNomorSurat: query gagal, fallback ke counter lama:', e);
  }

  return getGlobalSequenceCounter() + 1;
}

/**
 * Versi SINKRON (hanya localStorage) — fallback last-resort bagi formatter
 * `generateLetterNumber` bila nomor tidak disuplai. Aturan SSOT sama.
 */
export function getNextNomorSuratSync(klasifikasi: string, year?: number): number {
  const currentYear = year || new Date().getFullYear();
  const lastYear = getLastGlobalSequenceYear();

  if (isAutoResetEnabled() && !isNaN(lastYear) && lastYear !== currentYear) {
    return 1;
  }

  return getGlobalSequenceCounter() + 1;
}

/**
 * Naikkan counter global setelah surat disimpan (SSOT), lalu sinkronkan ke
 * Supabase (best effort). Dipanggil oleh modul pembuat surat — bukan backdate.
 */
export async function incrementGlobalSequenceNumber(klasifikasi: string, year?: number): Promise<void> {
  const currentYear = year || new Date().getFullYear();
  const lastYear = getLastGlobalSequenceYear();

  let nextVal = getGlobalSequenceCounter() + 1;
  if (isAutoResetEnabled() && !isNaN(lastYear) && lastYear !== currentYear) {
    nextVal = 1;
  }

  setLastGlobalSequenceYear(currentYear);
  saveGlobalSequenceCounter(nextVal);

  setTimeout(async () => {
    try {
      const tenantId = await resolveCurrentTenant();
      if (tenantId) {
        await supabase.from('letter_classifications').update({ no_urut_terakhir: nextVal }).eq('tenant_id', tenantId);
      }
    } catch (e) {
      console.error('Failed to sync sequence number to Supabase:', e);
    }
  }, 10);

  window.dispatchEvent(new Event('letter_classifications_updated'));
}