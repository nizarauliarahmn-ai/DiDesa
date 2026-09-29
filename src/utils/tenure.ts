/** Helper terstruktur masa jabatan — dipakai arsip Aparatur & badge penduduk. */

export interface TenureHolder {
  periodStart?: any;
  periodEnd?: any;
  period?: string;
}

export const toYearNumber = (v: any): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v !== undefined && v !== null && String(v).trim() !== '' && !isNaN(Number(v))) return Number(v);
  return null;
};

export function parsePeriodYears(period?: string): { start: number | null; end: number | null } {
  if (!period) return { start: null, end: null };
  const years = (String(period).match(/\b(19|20)\d{2}\b/g) || []).map(Number);
  const openEnded = /sekaran|aktif|active|present|now|sampai|sd\.?$/i.test(String(period));
  return { start: years[0] ?? null, end: openEnded ? null : (years[1] ?? null) };
}

export function getTenure(o: TenureHolder): { start: number | null; end: number | null } {
  const start = toYearNumber(o.periodStart) ?? parsePeriodYears(o.period).start;
  const end = toYearNumber(o.periodEnd) ?? parsePeriodYears(o.period).end;
  return { start, end };
}

/** true = menjabat, false = tidak, null = periode tidak diketahui */
export function servesInYear(o: TenureHolder, year: number): boolean | null {
  const { start, end } = getTenure(o);
  if (start == null && end == null) return null;
  if (start != null && year < start) return false;
  if (end != null && year > end) return false;
  return true;
}

export function formatTenure(o: TenureHolder): string {
  const s = toYearNumber(o.periodStart);
  if (s != null) {
    const e = toYearNumber(o.periodEnd);
    return `${s}–${e ?? 'Sekarang'}`;
  }
  return o.period || '';
}

/** Susun teks `period` dari tahun terstruktur; bersihkan teks auto lama bila tahun dikosongkan. */
export function composePeriod<T extends TenureHolder>(form: T): T {
  const next: any = { ...form };
  if (toYearNumber(next.periodStart) != null) {
    const s = toYearNumber(next.periodStart)!;
    const e = toYearNumber(next.periodEnd);
    next.periodStart = s;
    next.periodEnd = e ?? undefined;
    next.period = `${s}–${e ?? 'Sekarang'}`;
  } else if (next.period && /^\d{4}\s*[–—-]\s*(\d{4}|Sekarang)$/.test(next.period)) {
    delete next.period;
  }
  return next as T;
}
