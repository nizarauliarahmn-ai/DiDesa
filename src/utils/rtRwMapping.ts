export interface RtRwEntry {
  rt: string;
  rw: string;
}

const STORAGE_KEY = 'village_rt_rw_mapping';

export function getRtRwMapping(): RtRwEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRtRwMapping(entries: RtRwEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent('rt_rw_mapping_updated'));
}

export function getRwForRt(rt: string): string {
  const cleanRt = rt.replace(/^0+/, '') || '0';
  const entries = getRtRwMapping();
  const found = entries.find(e => e.rt.replace(/^0+/, '') || '0' === cleanRt);
  return found ? found.rw : '';
}

export function addRtRwEntry(rt: string, rw: string): void {
  const entries = getRtRwMapping();
  const cleanRt = rt.replace(/^0+/, '') || '0';
  const existing = entries.findIndex(e => (e.rt.replace(/^0+/, '') || '0') === cleanRt);
  if (existing >= 0) {
    entries[existing].rw = rw;
  } else {
    entries.push({ rt, rw });
  }
  entries.sort((a, b) => {
    const numA = parseInt(a.rt.replace(/^0+/, '') || '0', 10);
    const numB = parseInt(b.rt.replace(/^0+/, '') || '0', 10);
    return numA - numB;
  });
  saveRtRwMapping(entries);
}

export function removeRtRwEntry(rt: string): void {
  const entries = getRtRwMapping();
  const cleanRt = rt.replace(/^0+/, '') || '0';
  const filtered = entries.filter(e => (e.rt.replace(/^0+/, '') || '0') !== cleanRt);
  saveRtRwMapping(filtered);
}
