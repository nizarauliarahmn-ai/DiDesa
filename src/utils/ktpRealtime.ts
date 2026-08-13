import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// Supabase Realtime Channel untuk Remote KTP Scanner (PC Admin <-> Tablet Kiosk)
// KEBIJAKAN: Foto KTP TIDAK PERNAH diunggah ke Supabase Storage.
// Foto dikirim via broadcast realtime sebagai base64 (hanya transit, lalu
// disimpan di React State / RAM browser, dan dibersihkan dgn revokeObjectURL).
//
// CATATAN: Semua komponen (PC admin, tablet listener, halaman /kiosk/scan)
// berbagi SATU instance channel per desa (registry) agar tidak terjadi
// join ganda pada topic yang sama.
// ============================================================================

export const KTP_SCAN_CHANNEL_PREFIX = 'ktp_scan_';

export const ktpScanChannelName = (villageId: string) => `${KTP_SCAN_CHANNEL_PREFIX}${villageId}`;

export interface RequestScanPayload {
  type: 'REQUEST_SCAN';
  session_id: string;
  admin_id: string;
  timestamp: number;
}

export interface ScanCompletePayload {
  type: 'SCAN_COMPLETE';
  session_id: string;
  ocr_data: {
    nik: string;
    nama: string;
    tempatLahir: string;
    tanggalLahir: string;
    jenisKelamin: string;
    agama: string;
    pekerjaan: string;
    alamat: string;
    rtRw: string;
  };
  temp_image_base64: string;
  timestamp: number;
}

interface ChannelEntry {
  channel: RealtimeChannel;
  subscribed: boolean;
}

const channelRegistry = new Map<string, ChannelEntry>();

function getOrCreateChannel(villageId: string): ChannelEntry {
  const name = ktpScanChannelName(villageId);
  const existing = channelRegistry.get(name);
  if (existing) return existing;
  const channel = supabase.channel(name);
  const entry: ChannelEntry = { channel, subscribed: false };
  channelRegistry.set(name, entry);
  return entry;
}

/** Berlangganan (atau gunakan kembali) channel KTP scan untuk suatu desa. */
export function subscribeKtpScanChannel(
  villageId: string,
  handlers: {
    onRequestScan?: (payload: RequestScanPayload) => void;
    onScanComplete?: (payload: ScanCompletePayload) => void;
  },
  onStatus?: (status: string) => void
): RealtimeChannel {
  const entry = getOrCreateChannel(villageId);
  const { channel } = entry;

  if (handlers.onRequestScan) {
    channel.on('broadcast', { event: 'request-scan' }, ({ payload }) => {
      const p = payload as RequestScanPayload;
      if (p && p.type === 'REQUEST_SCAN') handlers.onRequestScan?.(p);
    });
  }
  if (handlers.onScanComplete) {
    channel.on('broadcast', { event: 'scan-complete' }, ({ payload }) => {
      const p = payload as ScanCompletePayload;
      if (p && p.type === 'SCAN_COMPLETE') handlers.onScanComplete?.(p);
    });
  }

  if (!entry.subscribed) {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') entry.subscribed = true;
      onStatus?.(status);
    });
  } else {
    onStatus?.('SUBSCRIBED');
  }
  return channel;
}

export function sendKtpRequestScan(channel: RealtimeChannel, payload: RequestScanPayload) {
  channel.send({ type: 'broadcast', event: 'request-scan', payload });
}

export function sendKtpScanComplete(channel: RealtimeChannel, payload: ScanCompletePayload) {
  channel.send({ type: 'broadcast', event: 'scan-complete', payload });
}

/** Menunggu sampai channel siap (SUBSCRIBED) lalu mengirim REQUEST_SCAN. */
export async function sendKtpRequestScanWhenReady(channel: RealtimeChannel, payload: RequestScanPayload): Promise<void> {
  await new Promise<void>((resolve) => {
    let resolved = false;
    const unsub = channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        sendKtpRequestScan(channel, payload);
        if (!resolved) { resolved = true; unsub.unsubscribe(); resolve(); }
      }
    });
  });
}

/** Menunggu sampai channel siap (SUBSCRIBED) lalu mengirim SCAN_COMPLETE. */
export async function sendKtpScanCompleteWhenReady(channel: RealtimeChannel, payload: ScanCompletePayload): Promise<void> {
  await new Promise<void>((resolve) => {
    let resolved = false;
    const unsub = channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        sendKtpScanComplete(channel, payload);
        if (!resolved) { resolved = true; unsub.unsubscribe(); resolve(); }
      }
    });
  });
}

/** Konversi base64 dataURL -> Blob (tetap di RAM browser, tanpa upload). */
export function base64ToBlob(dataUrl: string): Blob {
  const [meta, data] = dataUrl.split(',');
  const mime = (meta?.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
  const bin = atob(data || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Kompresi gambar (canvas) menjadi base64 kecil agar muat di payload realtime. */
export function compressImageForRealtime(blob: Blob, maxW = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas tidak didukung')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let q = quality;
      let dataUrl = canvas.toDataURL('image/jpeg', q);
      // Kurangi kualitas jika masih terlalu besar untuk payload realtime
      while (dataUrl.length > 60000 && q > 0.35) {
        q -= 0.08;
        dataUrl = canvas.toDataURL('image/jpeg', q);
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gagal memuat gambar'));
    };
    img.src = url;
  });
}

/** URL absolut untuk halaman scanner tablet (di-scan via QR). */
export function buildKioskScanUrl(sessionId: string, villageId?: string): string {
  const origin = window.location.origin;
  const query = new URLSearchParams({ session: sessionId });
  if (villageId) query.set('t_id', villageId);
  return `${origin}/kiosk/scan?${query.toString()}`;
}

export { supabase };
