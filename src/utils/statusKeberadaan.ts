// Standar opsi Status Kependudukan / Status Keberadaan (status_keberadaan)
export const STATUS_KEBERADAAN_OPTIONS = ['TETAP', 'SEMENTARA', 'PINDAH', 'MENINGGAL', 'GANDA'];

// Nilai internal alur kerja yang TIDAK boleh diubah formatnya (workflow status)
const WORKFLOW_STATUSES = ['pending_approval', 'pending', 'archived', 'deleted'];

// Normalisasi nilai legacy -> standar. 'Aktif'/'AKTIF'/'Belum Kawin' => 'TETAP',
// selain itu di-uppercase (nilai alur kerja dibiarkan apa adanya).
export const normalizeStatusKeberadaan = (val?: string): string => {
  if (!val || !String(val).trim()) return 'TETAP';
  const trimmed = String(val).trim();
  if (WORKFLOW_STATUSES.includes(trimmed.toLowerCase())) return trimmed;
  const upper = trimmed.toUpperCase();
  if (upper === 'AKTIF' || trimmed === 'Belum Kawin') return 'TETAP';
  return upper;
};