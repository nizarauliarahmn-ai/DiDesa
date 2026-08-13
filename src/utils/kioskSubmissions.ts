import { supabase } from './supabase';

/**
 * Conditional Auto-Record Buku Tamu (Kiosk Tablet)
 *
 * Alur 1 – Warga hanya mengisi Buku Tamu: simpan HANYA ke tabel `guest_book`
 *   (tidak membuat record di `surat`). Ditangani langsung oleh PublicBukuTamu.
 *
 * Alur 2 – Warga mengisi/menyetujui Permohonan Surat (mandiri / bantuan admin):
 *   SIMPAN GANDA (Dual Record):
 *   - Record A: permohonan lengkap ke tabel `surat` (status 'Menunggu Persetujuan').
 *   - Record B: buku tamu otomatis hari ini di tabel `guest_book` dengan NIK/Nama
 *     sama, keperluan "Permohonan Surat: <Jenis Surat>", dan TTD yang sama.
 */

export async function uploadSignatureToStorage(
  tenantId: string,
  prefix: string,
  canvas: any
): Promise<string | null> {
  if (!canvas || typeof canvas.isEmpty !== 'function' || canvas.isEmpty()) return null;
  try {
    const dataUrl = canvas.getTrimmedCanvas().toDataURL('image/png');
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = `${tenantId}/${Date.now()}-${prefix}.png`;
    const { error: uploadError } = await supabase.storage
      .from('signatures')
      .upload(fileName, blob, { contentType: 'image/png', cacheControl: '3600' });
    if (uploadError) {
      console.error('Failed to upload signature', uploadError);
      return null;
    }
    const { data: publicUrlData } = supabase.storage.from('signatures').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  } catch (e) {
    console.error('Error processing signature', e);
    return null;
  }
}

export interface PermohonanRecord {
  tenantId: string;
  jenisSurat: string;
  keterangan: string;
  nomor: string;
  nik: string | null;
  nama: string;
  data?: any;
  signatureUrl?: string | null;
  signedAt?: string;
}

/**
 * Alur 2 – Simpan Ganda permohonan surat (+ auto-record buku tamu).
 * Mengembalikan id record permohonan (`surat`) atau null jika gagal.
 */
export async function savePermohonanWithGuestRecord(p: PermohonanRecord): Promise<string | null> {
  // Record A: Permohonan -> tabel surat (status 'Menunggu Persetujuan' = 'pending')
  const insertData: any = {
    tenant_id: p.tenantId,
    jenis_surat: p.jenisSurat,
    keterangan: p.keterangan,
    status: 'pending',
    nomor: p.nomor,
    nik: p.nik || null,
    nama: p.nama,
    data: {
      ...(p.data || {}),
      signature_url: p.signatureUrl || null,
      signed_at: p.signedAt || new Date().toISOString()
    }
  };

  const { data, error } = await supabase
    .from('surat')
    .insert([insertData])
    .select('id')
    .single();

  if (error) {
    console.error('Gagal menyimpan permohonan surat:', error);
    throw error;
  }

  // Record B: Buku Tamu Otomatis -> tabel guest_book
  const guestPayload: any = {
    id: `guest-auto-${Date.now()}`,
    tenant_id: p.tenantId,
    nik: p.nik || null,
    nama: p.nama,
    alamat: null,
    instansi: 'Warga Desa',
    keperluan: `Permohonan Surat: ${p.jenisSurat}`,
    tujuan_temu: 'Permohonan Surat',
    signature_url: p.signatureUrl || null,
    tanggal_masuk: new Date().toISOString(),
    tanggal_keluar: null,
    status: 'hadir'
  };

  const { error: guestErr } = await supabase.from('guest_book').insert([guestPayload]);
  if (guestErr) {
    console.error('Gagal auto-record buku tamu:', guestErr);
  } else {
    window.dispatchEvent(new Event('didesa_guest_auto_recorded'));
  }

  return data?.id || null;
}