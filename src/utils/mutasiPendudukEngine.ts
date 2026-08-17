import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';
import { addSaaSLog } from './saasLogs';
import { invalidateResidentsCache } from './apiCache';

// ============================================================================
// Automated Resident Data Update Engine (Mutasi Penduduk Otomatis)
// Memperbarui status kependudukan secara otomatis saat surat resmi diterbitkan.
// ============================================================================

export type LetterMutationType = 'PINDAH' | 'MENINGGAL' | 'KAWIN' | null;

export interface ResidentMutationOptions {
  residentId?: string;      // NIK warga
  residentNik?: string;     // alias NIK
  letterTypeCode?: string;  // kode klasifikasi surat: SKP / SKM / SKN
  publishDate?: string;     // tanggal terbit (DD MMMM YYYY atau ISO)
}

/** Deteksi dampak mutasi dari kode klasifikasi surat. */
export function getLetterMutationType(letterTypeCode?: string): LetterMutationType {
  const code = (letterTypeCode || '').toUpperCase().trim();
  if (code === 'SKP') return 'PINDAH';
  if (code === 'SKM') return 'MENINGGAL';
  if (code === 'SKN') return 'KAWIN';
  return null;
}

/** Label status baru untuk ditampilkan di UI. */
export function getMutationStatusLabel(type: LetterMutationType): string {
  if (type === 'PINDAH') return 'PINDAH';
  if (type === 'MENINGGAL') return 'MENINGGAL';
  if (type === 'KAWIN') return 'KAWIN';
  return '';
}

/** Normalisasi tanggal terbit ke format ISO (YYYY-MM-DD). */
function toIsoDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const trimmed = dateStr.trim();
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const m = trimmed.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m) {
    const monthIdx = months.findIndex(x => x.toLowerCase() === m[2].toLowerCase());
    if (monthIdx >= 0) {
      const d = new Date(Date.UTC(parseInt(m[3], 10), monthIdx, parseInt(m[1], 10)));
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }
  const iso = new Date(trimmed);
  return isNaN(iso.getTime()) ? new Date().toISOString().split('T')[0] : iso.toISOString().split('T')[0];
}

/** Cetak detail error Supabase/PostgREST untuk debugging cepat (message/details/hint/code). */
function logSupabaseError(context: string, error: { message?: string; details?: string; hint?: string; code?: string } | null) {
  if (!error) return;
  console.error(`DEBUG SUPABASE UPDATE ERROR [${context}]:`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
}

/**
 * Jalankan update ke tabel `residents` secara tangguh.
 * - Identifier: prioritas `id` (UUID) bila ada, fallback `nik`.
 * - Defensif: kolom yang tidak dikenal di skema DB (PGRST204 "Could not find
 *   the '<kolom>' column") otomatis DIBUANG lalu query dicoba ulang.
 * - TIDAK mengirim `updated_at` karena kolom tersebut tidak ada di tabel
 *   `residents` (salah satu penyebab utama kegagalan update status).
 * - Error diketik penuh via logSupabaseError agar root cause terlihat.
 */
async function runResidentUpdate(
  payload: Record<string, any>,
  filter: { id?: string; nik?: string },
  context: string,
): Promise<boolean> {
  try {
    const tenantId = await resolveCurrentTenant();

    const buildQuery = () => {
      let q = supabase.from('residents').update({ ...payload });
      if (tenantId) q = q.eq('tenant_id', tenantId);
      if (filter.id) q = q.eq('id', filter.id);
      else if (filter.nik) q = q.eq('nik', filter.nik);
      return q;
    };

    let { error } = await buildQuery();

    // Defensif: kolom yang tidak ada di skema DB dibuang lalu coba lagi.
    let retries = 0;
    while (error && error.message?.includes('Could not find the') && error.message?.includes('column') && retries < 12) {
      const match = error.message.match(/'([^']+)' column/);
      if (!match || !match[1]) break;
      delete payload[match[1]];
      logSupabaseError(`${context} (drop kolom '${match[1]}')`, error);
      const retry = await buildQuery();
      error = retry.error;
      retries++;
    }

    if (error) {
      logSupabaseError(context, error);
      return false;
    }

    // Invalidate cache global supaya UI selalu re-fetch (cache lokal + event).
    invalidateResidentsCache();
    window.dispatchEvent(new Event('residents_updated'));
    return true;
  } catch (err) {
    console.error(`${context}: unexpected error:`, err);
    return false;
  }
}

export interface ForceUpdateResult {
  success: boolean;
  message?: string;
}

/**
 * Update status kependudukan dengan FALLBACK BERLAPIS (multi-kolom x multi-key):
 * - Identifier: coba ID (UUID) dulu, lalu fallback NIK.
 * - Kolom: mencoba `status_keberadaan`, `status_penduduk`, `status_warga`,
 *   lalu `status`.
 * - TIDAK mengirim `updated_at` (kolom itu TIDAK ADA di tabel `residents` —
 *   mengirimnya = kegagalan PGRST204 yang selama ini terjadi).
 * - Setiap error Supabase dicetak utuh ke console agar root cause terlihat.
 */
export async function forceUpdateStatusPenduduk(
  residentData: { id?: string; nik?: string },
  newStatus: 'PINDAH' | 'MENINGGAL',
): Promise<ForceUpdateResult> {
  const targetId = residentData?.id;
  const targetNik = (residentData?.nik || '').trim();

  if (!targetId && !targetNik) {
    console.error("ERROR: Data ID maupun NIK pemohon tidak ditemukan pada form.");
    return { success: false, message: "ID/NIK Pemohon tidak ditemukan di form" };
  }

  const tenantId = await resolveCurrentTenant();

  // Daftar skenario nama kolom di database Supabase (tabel `residents`).
  const candidateColumns = ['status_keberadaan', 'status_penduduk', 'status_warga', 'status'];

  for (const colName of candidateColumns) {
    const colValue = colName === 'status' ? (newStatus === 'MENINGGAL' ? 'Meninggal' : 'Pindah') : newStatus;
    const payload: Record<string, any> = { [colName]: colValue };

    const attempt = (key: 'id' | 'nik', value: string) => {
      let q = supabase.from('residents').update({ ...payload });
      if (tenantId) q = q.eq('tenant_id', tenantId);
      return q.eq(key, value);
    };

    // 1. Coba update via ID
    if (targetId) {
      const { error } = await attempt('id', targetId);
      if (!error) {
        console.log(`✅ Berhasil update status via kolom '${colName}' menggunakan ID.`);
        return { success: true, message: `Status diperbarui via kolom '${colName}' (ID)` };
      }
      console.error(`SUPABASE UPDATE ERROR DETAILED [id, ${colName}]:`, error);
    }

    // 2. Fallback: Coba update via NIK
    if (targetNik) {
      const { error } = await attempt('nik', targetNik);
      if (!error) {
        console.log(`✅ Berhasil update status via kolom '${colName}' menggunakan NIK.`);
        return { success: true, message: `Status diperbarui via kolom '${colName}' (NIK)` };
      }
      console.error(`SUPABASE UPDATE ERROR DETAILED [nik, ${colName}]:`, error);
    }
  }

  return {
    success: false,
    message: "Seluruh percobaan kolom DB (status_keberadaan, status_penduduk, status_warga, status) gagal. Periksa RLS / Schema Supabase.",
  };
}

export interface MutationResult {
  ok: boolean;
  message?: string;
}

/**
 * Terapkan mutasi kependudukan otomatis saat surat resmi diterbitkan.
 * - SKP  => status PINDAH + tanggal_mutasi
 * - SKM  => status MENINGGAL + tanggal_kematian
 * - SKN  => marital_status KAWIN
 *
 * Mengembalikan `{ ok, message }` agar UI bisa menampilkan error spesifik
 * Supabase di dalam toast notifikasi.
 */
export async function applyResidentMutationOnLetterPublish({
  residentId,
  residentNik,
  letterTypeCode,
  publishDate,
}: ResidentMutationOptions): Promise<MutationResult> {
  const nik = (residentId || residentNik || '').trim();
  if (!nik || nik === '-' || nik === '') {
    return { ok: false, message: 'NIK pemohon kosong, tidak bisa update status.' };
  }

  const mutation = getLetterMutationType(letterTypeCode);
  if (!mutation) return { ok: true };

  const isoDate = toIsoDate(publishDate);

  // 1. Update kolom status keberadaan (multi-kolom fallback).
  let primary: ForceUpdateResult = { success: true };
  if (mutation === 'PINDAH' || mutation === 'MENINGGAL') {
    primary = await forceUpdateStatusPenduduk({ nik }, mutation);
  }

  // 2. Kolom pendukung mutasi (status, tanggal_mutasi/kematian, marital_status).
  const updatePayload: Record<string, any> = {};
  if (mutation === 'PINDAH') {
    updatePayload.status = 'Pindah';
    updatePayload.status_color = 'amber';
    updatePayload.is_deleted = false;
    updatePayload.tanggal_mutasi = isoDate;
  } else if (mutation === 'MENINGGAL') {
    updatePayload.status = 'Meninggal';
    updatePayload.status_color = 'rose';
    updatePayload.is_deleted = false;
    updatePayload.tanggal_kematian = isoDate;
  } else if (mutation === 'KAWIN') {
    updatePayload.marital_status = 'Kawin';
    updatePayload.status_perkawinan = 'KAWIN';
  }

  let payloadOk = true;
  if (Object.keys(updatePayload).length > 0) {
    payloadOk = await runResidentUpdate(updatePayload, { nik }, 'applyResidentMutationOnLetterPublish');
  }

  const ok = mutation === 'KAWIN' ? payloadOk : primary.success;
  const message = ok
    ? undefined
    : mutation === 'KAWIN'
      ? 'Gagal memperbarui status perkawinan (marital_status). Periksa RLS / Schema Supabase.'
      : primary.message || 'Gagal memperbarui status kependudukan. Periksa RLS / Schema Supabase.';

  addSaaSLog({
    admin: 'Sistem',
    aksi: 'Mutasi Otomatis Kependudukan',
    target: `${nik} -> ${mutation}`,
    status: ok ? 'Berhasil' : 'Gagal',
    category: 'Penduduk'
  });

  return { ok, message };
}