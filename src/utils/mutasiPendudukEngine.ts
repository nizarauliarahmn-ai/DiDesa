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

/**
 * Update status kependudukan penduduk secara tangguh.
 * - Identifier valid: prioritas ID (UUID) bila ada, fallback NIK.
 * - Kolom yang ditulis: `status_keberadaan` (utamanya) + `status_penduduk`
 *   + `status` + `status_color`. Kolom yang tak dikenal otomatis di-drop.
 * - Mengembalikan true bila update sukses; false bila gagal.
 */
export async function updateResidentStatus(
  resident: { id?: string; nik?: string },
  newStatus: 'PINDAH' | 'MENINGGAL',
): Promise<boolean> {
  const targetId = resident?.id;
  const targetNik = (resident?.nik || '').trim();
  if (!targetId && !targetNik) {
    console.error('Update dibatalkan: Data ID dan NIK warga tidak ditemukan.');
    return false;
  }

  const statusLabel = newStatus === 'MENINGGAL' ? 'Meninggal' : 'Pindah';
  const statusColor = newStatus === 'MENINGGAL' ? 'rose' : 'amber';
  const payload: Record<string, any> = {
    status_keberadaan: newStatus,
    status_penduduk: newStatus,
    status: statusLabel,
    status_color: statusColor,
  };

  return runResidentUpdate(payload, { id: targetId, nik: targetNik }, 'updateResidentStatus');
}

/**
 * Terapkan mutasi kependudukan otomatis saat surat resmi diterbitkan.
 * - SKP  => status PINDAH + tanggal_mutasi
 * - SKM  => status MENINGGAL + tanggal_kematian
 * - SKN  => marital_status KAWIN
 *
 * Mengembalikan detail kegagalan agar UI bisa menampilkan notifikasi yang jelas
 * ketika update DB gagal (mis. koneksi terputus / RLS).
 */
export async function applyResidentMutationOnLetterPublish({
  residentId,
  residentNik,
  letterTypeCode,
  publishDate,
}: ResidentMutationOptions): Promise<boolean> {
  const nik = (residentId || residentNik || '').trim();
  if (!nik || nik === '-' || nik === '') return false;

  const mutation = getLetterMutationType(letterTypeCode);
  if (!mutation) return false;

  const isoDate = toIsoDate(publishDate);

  // 1. Update kolom status keberadaan (PINDAH / MENINGGAL).
  let primaryOk = true;
  if (mutation === 'PINDAH' || mutation === 'MENINGGAL') {
    primaryOk = await updateResidentStatus({ nik }, mutation);
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

  const success = mutation === 'KAWIN' ? payloadOk : primaryOk;

  addSaaSLog({
    admin: 'Sistem',
    aksi: 'Mutasi Otomatis Kependudukan',
    target: `${nik} -> ${mutation}`,
    status: success ? 'Berhasil' : 'Gagal',
    category: 'Penduduk'
  });

  return success;
}