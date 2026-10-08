import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';

export interface TvSlide {
  id: string;
  url: string;
  type: 'image' | 'video';
  durasi: number; // detik, untuk gambar
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

export function detectSlideType(url: string): 'image' | 'video' {
  const clean = url.split('?')[0].toLowerCase();
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(clean)) return 'video';
  return 'image';
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
            type: s.type === 'video' ? 'video' : 'image',
            durasi: Math.min(120, Math.max(3, Number(s.durasi) || 8)),
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
