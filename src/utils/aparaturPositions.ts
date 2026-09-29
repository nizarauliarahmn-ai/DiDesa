import { supabase } from './supabase';
import { getTenure, servesInYear, formatTenure } from './tenure';

export interface AparaturLists {
  officers: any[];
  bpd: any[];
  lpm: any[];
  rt: any[];
  rw: any[];
}

export interface PositionEntry {
  lembaga: string;
  label: string;
  tenureText: string;
  start: number | null;
  end: number | null;
  active: boolean | null;
}

const APARATUR_KEYS = ['village_officers', 'village_bpd', 'village_lpm', 'village_rt_list', 'village_rw_list'] as const;

function parseList(raw: string | null): any[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function readAparaturListsFromStorage(): AparaturLists {
  try {
    return {
      officers: parseList(localStorage.getItem('village_officers')),
      bpd: parseList(localStorage.getItem('village_bpd')),
      lpm: parseList(localStorage.getItem('village_lpm')),
      rt: parseList(localStorage.getItem('village_rt_list')),
      rw: parseList(localStorage.getItem('village_rw_list')),
    };
  } catch {
    return { officers: [], bpd: [], lpm: [], rt: [], rw: [] };
  }
}

/** Muat daftar aparatur tenant: Supabase dulu, fallback localStorage. */
export async function loadAparaturLists(tenantId: string | null): Promise<AparaturLists> {
  if (tenantId) {
    try {
      const { data, error } = await supabase
        .from('saas_settings')
        .select('key,value')
        .eq('tenant_id', tenantId)
        .in('key', [...APARATUR_KEYS]);
      if (!error && data) {
        const map: Record<string, any[]> = {};
        APARATUR_KEYS.forEach(k => { map[k] = []; });
        (data as any[]).forEach(row => {
          if (row && row.key in map) map[row.key] = parseList(row.value);
        });
        return { officers: map.village_officers, bpd: map.village_bpd, lpm: map.village_lpm, rt: map.village_rt_list, rw: map.village_rw_list };
      }
    } catch {
      // fallback ke localStorage di bawah
    }
  }
  return readAparaturListsFromStorage();
}

function toEntry(raw: any, lembaga: string, label: string): PositionEntry | null {
  if (!raw) return null;
  const t = getTenure(raw);
  const curY = new Date().getFullYear();
  const s = servesInYear(raw, curY);
  return {
    lembaga,
    label,
    tenureText: formatTenure(raw),
    start: t.start,
    end: t.end,
    active: s,
  };
}

/** Cari semua jabatan yang pernah/diemban warga ber-NIK tertentu. */
export function findPositionsByNik(nik: string | null | undefined, lists: AparaturLists): PositionEntry[] {
  const target = String(nik || '').trim();
  if (!target) return [];
  const match = (o: any) => String(o?.nik || '').trim() === target || String(o?.residentId || '').trim() === target;
  const out: PositionEntry[] = [];
  lists.officers.filter(match).forEach(o => {
    const e = toEntry(o, 'Perangkat Desa', String(o.role || 'Perangkat Desa'));
    if (e) out.push(e);
  });
  lists.bpd.filter(match).forEach(o => {
    const e = toEntry(o, 'BPD', String(o.role || 'Anggota BPD'));
    if (e) out.push(e);
  });
  lists.lpm.filter(match).forEach(o => {
    const e = toEntry(o, 'LPM', String(o.role || 'Pengurus LPM'));
    if (e) out.push(e);
  });
  lists.rt.filter(match).forEach(o => {
    const e = toEntry(o, `Ketua RT ${o.no || ''}`.trim(), `${o.role || 'Ketua RT'}${o.no ? ` ${o.no}` : ''}`);
    if (e) out.push(e);
  });
  lists.rw.filter(match).forEach(o => {
    const e = toEntry(o, `Ketua RW ${o.no || ''}`.trim(), `${o.role || 'Ketua RW'}${o.no ? ` ${o.no}` : ''}`);
    if (e) out.push(e);
  });
  const curY = new Date().getFullYear();
  const rank = (p: PositionEntry) => (p.active === true ? 0 : p.active === false ? 2 : 1);
  return out.sort((a, b) => rank(a) - rank(b) || (b.start ?? -1) - (a.start ?? -1) || (b.end ?? curY + 1) - (a.end ?? curY + 1));
}
