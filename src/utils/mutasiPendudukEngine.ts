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

/**
 * Terapkan mutasi kependudukan otomatis saat surat resmi diterbitkan.
 * - SKP  => status PINDAH + tanggal_mutasi
 * - SKM  => status MENINGGAL + tanggal_kematian
 * - SKN  => marital_status KAWIN
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
  const updatePayload: Record<string, any> = {};

  if (mutation === 'PINDAH') {
    updatePayload.status = 'Pindah';
    updatePayload.status_color = 'gray';
    updatePayload.is_deleted = false;
    updatePayload.status_keberadaan = 'PINDAH';
    updatePayload.status_penduduk = 'PINDAH';
    updatePayload.tanggal_mutasi = isoDate;
  } else if (mutation === 'MENINGGAL') {
    updatePayload.status = 'Meninggal';
    updatePayload.status_color = 'gray';
    updatePayload.is_deleted = false;
    updatePayload.status_keberadaan = 'MENINGGAL';
    updatePayload.status_penduduk = 'MENINGGAL';
    updatePayload.tanggal_kematian = isoDate;
  } else if (mutation === 'KAWIN') {
    updatePayload.marital_status = 'Kawin';
    updatePayload.status_perkawinan = 'KAWIN';
  }

  try {
    const tenantId = await resolveCurrentTenant();
    let query = supabase.from('residents').update(updatePayload);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    query = query.eq('nik', nik);

    let { error } = await query;

    // Defensif: kolom yang tidak ada di skema DB akan dibuang lalu coba lagi
    let retries = 0;
    while (error && error.message?.includes('Could not find the') && error.message?.includes('column') && retries < 10) {
      const match = error.message.match(/'([^']+)' column/);
      if (match && match[1]) {
        delete updatePayload[match[1]];
        let retryQuery = supabase.from('residents').update(updatePayload);
        if (tenantId) retryQuery = retryQuery.eq('tenant_id', tenantId);
        retryQuery = retryQuery.eq('nik', nik);
        const retry = await retryQuery;
        error = retry.error;
        retries++;
      } else {
        break;
      }
    }

    if (error) {
      console.error('Gagal menerapkan mutasi penduduk otomatis:', error);
      return false;
    }

    invalidateResidentsCache();
    window.dispatchEvent(new Event('residents_updated'));

    addSaaSLog({
      admin: 'Sistem',
      aksi: 'Mutasi Otomatis Kependudukan',
      target: `${nik} -> ${mutation}`,
      status: 'Berhasil',
      category: 'Penduduk'
    });

    return true;
  } catch (err) {
    console.error('applyResidentMutationOnLetterPublish error:', err);
    return false;
  }
}