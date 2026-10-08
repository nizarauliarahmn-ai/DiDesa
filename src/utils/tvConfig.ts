import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';

export interface TvSlide {
  id: string;
  url: string;
  type: 'image' | 'video' | 'youtube';
  durasi: number; // detik, untuk gambar & YouTube
}

export interface TvConfig {
  slides: TvSlide[];
  tickerText: string;
  showStats: boolean;
  stats: { label: string; value: string }[];
}

const KEY = 'village_tv_config';

export const DEFAULT_TV_CONFIG: TvConfig = {
  slides: [],
  tickerText: 'Selamat datang di Kantor Desa — silakan ambil nomor antrean dan tunggu giliran Anda dipanggil.',
  showStats: true,
  stats: [
    { label: 'Total Penduduk', value: '-' },
    { label: 'Surat Terbit', value: '-' },
    { label: 'Pengumuman', value: '-' },
  ],
};

export function detectSlideType(url: string): 'image' | 'video' | 'youtube' {
  const clean = url.split('?')[0].toLowerCase();
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(clean)) return 'video';
  if (/youtu\.be|youtube\.com/.test(url.toLowerCase())) return 'youtube';
  return 'image';
}

/** Ambil ID video dari berbagai format URL YouTube. */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function newSlideId(): string {
  return `sl_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function sanitize(cfg: any): TvConfig {
  return {
    slides: Array.isArray(cfg?.slides)
      ? cfg.slides
          .filter((s: any) => s && typeof s.url === 'string' && s.url.trim())
          .map((s: any) => ({
            id: String(s.id || newSlideId()),
            url: s.url.trim(),
            type: s.type === 'video' || s.type === 'youtube' ? s.type : 'image',
            durasi: Math.min(300, Math.max(3, Number(s.durasi) || 8)),
          }))
      : [],
    tickerText: typeof cfg?.tickerText === 'string' && cfg.tickerText.trim()
      ? cfg.tickerText
      : DEFAULT_TV_CONFIG.tickerText,
    showStats: cfg?.showStats !== false,
    stats: Array.isArray(cfg?.stats) && cfg.stats.length > 0
      ? cfg.stats.slice(0, 6).map((s: any) => ({
          label: String(s?.label || 'Statistik'),
          value: String(s?.value ?? '-'),
        }))
      : DEFAULT_TV_CONFIG.stats,
  };
}

export function loadTvConfigLocal(): TvConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch { /* abaikan */ }
  return DEFAULT_TV_CONFIG;
}

/** Muat dari cloud (dibaca TV beda device); null bila belum ada/gagal. */
export async function loadTvConfigCloud(): Promise<TvConfig | null> {
  try {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return null;
    const { data, error } = await supabase
      .from('saas_settings')
      .select('value')
      .eq('tenant_id', tenantId)
      .eq('key', KEY)
      .maybeSingle();
    if (error || !data?.value) return null;
    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    return sanitize(parsed);
  } catch {
    return null;
  }
}

export async function saveTvConfig(cfg: TvConfig): Promise<{ ok: boolean; message: string }> {
  const clean = sanitize(cfg);
  try {
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch { /* abaikan */ }
  try {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return { ok: true, message: 'Tersimpan lokal (tenant tak terdeteksi, belum sinkron cloud).' };
    const { error } = await supabase
      .from('saas_settings')
      .upsert({ tenant_id: tenantId, key: KEY, value: JSON.stringify(clean) }, { onConflict: 'tenant_id,key' });
    if (error) throw error;
    return { ok: true, message: 'Tersimpan & tersinkron ke cloud — layar TV ikut diperbarui.' };
  } catch (e: any) {
    return { ok: true, message: `Tersimpan lokal, sinkron cloud gagal (${e?.message || 'koneksi'}).` };
  }
}

/** Statistik otomatis dari database desa (tanpa isi manual).
 *  Sengaja memakai select baris biasa (jalur yang sama dengan halaman
 *  Penduduk — terbukti jalan), bukan head-count. Tahan macet: timeout per
 *  query + tiap query gagal mandiri (parsial tetap tampil). */
const withTimeout = <T,>(p: Promise<T>, ms = 15000): Promise<T | null> =>
  Promise.race([p, new Promise<null>(resolve => setTimeout(() => resolve(null), ms))]);

const safeQuery = <T,>(p: Promise<T>): Promise<T | null> =>
  withTimeout(p.then(v => v, () => null));

export async function loadTvAutoStats(): Promise<{ label: string; value: string }[]> {
  const fallback = (label: string) => ({ label, value: '-' });
  const stats = [fallback('Total Penduduk'), fallback('Surat Terbit'), fallback('Penerima Bansos'), fallback('Pengumuman')];
  try {
    const tenantId = await withTimeout(resolveCurrentTenant(), 10000);
    if (!tenantId) return stats;
    const [sur, ban, news] = await Promise.all([
      safeQuery(supabase.from('surat').select('id').eq('tenant_id', tenantId).limit(10000)),
      safeQuery(supabase.from('bansos_recipients').select('id').eq('tenant_id', tenantId).limit(10000)),
      safeQuery(supabase.from('saas_settings').select('value').eq('tenant_id', tenantId).eq('key', 'didesa_news_list').maybeSingle()),
    ]);
    // Total Penduduk = replika persis kartu Total halaman Penduduk:
    // paginasi 1000 + buang is_deleted/archived + buang Pindah/Meninggal.
    try {
      const rows: any[] = [];
      const pageSize = 1000;
      for (let page = 0; page < 20; page++) {
        const r: any = await withTimeout(
          supabase.from('residents').select('status,is_deleted').eq('tenant_id', tenantId).order('nik', { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1)
        );
        const data = r?.data;
        if (!Array.isArray(data) || data.length === 0) break;
        rows.push(...data);
        if (data.length < pageSize) break;
      }
      if (rows.length > 0) {
        const s = (x: any) => String(x?.status || 'Aktif').toLowerCase();
        const n = rows.filter(x =>
          String(x?.is_deleted) !== '1' && x?.is_deleted !== true &&
          s(x) !== 'archived' && s(x) !== 'deleted' &&
          !s(x).includes('pindah') && !s(x).includes('meninggal') && s(x) !== 'mati'
        ).length;
        stats[0].value = n.toLocaleString('id-ID');
      }
    } catch { /* abaikan, pakai fallback '-' */ }
    if (sur && Array.isArray((sur as any).data)) {
      stats[1].value = ((sur as any).data as any[]).length.toLocaleString('id-ID');
    }
    if (ban && Array.isArray((ban as any).data)) {
      stats[2].value = ((ban as any).data as any[]).length.toLocaleString('id-ID');
    }
    try {
      const raw = (news as any)?.data?.value;
      const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(list)) stats[3].value = list.length.toLocaleString('id-ID');
    } catch { /* abaikan */ }
  } catch { /* abaikan, pakai fallback '-' */ }
  return stats;
}
