import { showToast } from './toast';
import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';

// ============================================================================
// WhatsApp Notification Engine — 100% GRATIS (Rp 0)
// Zero-Cost Deep Link Engine tanpa provider berbayar.
// Cukup membuka tautan wa.me/<nomor>?text=<pesan> di tab baru.
// ============================================================================

/** Normalisasi nomor HP Indonesia menjadi format internasional (08xx -> 628xx). */
export function formatPhoneForWa(phone: string): string {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  return digits;
}

/** Ambil nomor WA dari objek resident dengan berbagai kemungkinan nama kolom. */
export function getResidentWaPhone(resident: any): string {
  if (!resident) return '';
  return String(
    resident.nomor_wa ||
    resident.no_wa ||
    resident.noWhatsapp ||
    resident.no_whatsapp ||
    resident.telepon ||
    resident.phone ||
    resident.kontak ||
    ''
  ).trim();
}

/** Buka WhatsApp dengan pesan otomatis terisi (deep link gratis). */
export function openFreeWhatsAppMessage({ phone, message }: { phone: string; message: string }): boolean {
  const cleanPhone = formatPhoneForWa(phone);
  if (!cleanPhone || cleanPhone.length < 9) {
    showToast('Nomor WhatsApp warga tidak valid.', 'error');
    return false;
  }
  const encodedMessage = encodeURIComponent(message);
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  window.open(waUrl, '_blank');
  return true;
}

// ----------------------------------------------------------------------------
// Template Pesan
// ----------------------------------------------------------------------------

/** Ambil nama desa dinamis (Ketupat/Wasah Hilir/dll) dari pengaturan kop surat. */
export function getVillageName(): string {
  const rawDesa = localStorage.getItem('kop_desa') || 'Wasah Hilir';
  return rawDesa.replace(/^(desa|kelurahan)\s+/i, '').trim() || 'Wasah Hilir';
}

/** Template A — Notifikasi Surat Selesai Diterbitkan. */
export function buildSuratSelesaiMessage(opts: { nama: string; jenisSurat: string; noSurat: string }): string {
  const { nama, jenisSurat, noSurat } = opts;
  const namaWarga = (nama || '').trim() || 'Warga';
  const desa = getVillageName();
  const jenisSuratClean = String(jenisSurat || '').trim().replace(/^Surat Keterangan\s+/i, '');
  const jenisSuratFinal = jenisSuratClean ? `Surat Keterangan ${jenisSuratClean}` : 'Surat Keterangan';

  return `Pemerintah Desa ${desa}\n\nHalo Bpk/Ibu ${namaWarga},\n\n${jenisSuratFinal} Anda telah selesai diterbitkan.\n\nDetail Dokumen:\n• Jenis Surat: ${jenisSuratFinal}\n• Nomor Surat: ${noSurat}\n\nSilakan mengambil dokumen fisik di Kantor Desa ${desa} pada jam kerja pelayanan.\n\nTerima kasih.`;
}

/** Template B — Notifikasi Aspirasi Dikonversi Menjadi Usulan Desa. */
export function buildAspirasiKeUsulanMessage(opts: { nama: string; judulAspirasi: string; kodeUsulan: string }): string {
  const { nama, judulAspirasi, kodeUsulan } = opts;
  const namaWarga = (nama || '').trim() || 'Warga';
  const desa = getVillageName();

  return `Pemerintah Desa ${desa}\n\nHalo Bpk/Ibu ${namaWarga},\n\nLaporan aspirasi Anda "${judulAspirasi}" telah resmi diangkat menjadi Usulan Desa (Kode: ${kodeUsulan}) untuk dibahas dalam perencanaan RKPDes/Musrenbang.\n\nTerima kasih atas partisipasi Anda.`;
}

// ----------------------------------------------------------------------------
// Global Event Bus — memicu tombol melayang / modal dari mana saja
// ----------------------------------------------------------------------------

export const WA_NOTIFICATION_EVENT = 'wa-free-notification';

export interface WaNotificationPayload {
  message: string;
  resident?: {
    name?: string;
    nik?: string;
    phone?: string;
  } | null;
}

/** Minta tampilan notifikasi WA (tombol melayang / modal isi nomor) secara global. */
export function requestWaNotification(payload: WaNotificationPayload): void {
  window.dispatchEvent(new CustomEvent(WA_NOTIFICATION_EVENT, { detail: payload }));
}

// ----------------------------------------------------------------------------
// Utility — Simpan nomor WA ke profil penduduk (Supabase residents.no_whatsapp)
// ----------------------------------------------------------------------------

export async function saveResidentWaPhone(nik: string, phone: string): Promise<boolean> {
  if (!nik || !phone) return false;
  try {
    const tenantId = await resolveCurrentTenant();
    let query = supabase.from('residents').update({ no_whatsapp: phone.trim() }).eq('nik', nik);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { error } = await query;
    if (error) {
      console.error('Gagal menyimpan nomor WA warga:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('saveResidentWaPhone error:', e);
    return false;
  }
}

// ----------------------------------------------------------------------------
// Utility — Generate kode usulan (U-YYYY-NNN) untuk Template B
// ----------------------------------------------------------------------------

export async function generateKodeUsulan(tahun: string): Promise<string> {
  const prefix = `U-${tahun}-`;
  let max = 0;
  try {
    const tenantId = await resolveCurrentTenant();
    let builder = supabase.from('usulan_desas').select('kode_usulan').like('kode_usulan', `${prefix}%`);
    if (tenantId) builder = builder.eq('tenant_id', tenantId);
    const { data } = await builder;
    (data || []).forEach((r: any) => {
      const k = r?.kode_usulan;
      if (k && k.startsWith(prefix)) {
        const n = parseInt(k.slice(prefix.length), 10);
        if (!isNaN(n)) max = Math.max(max, n);
      }
    });
  } catch (e) {
    console.error('generateKodeUsulan error:', e);
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}