import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';
import { addSaaSLog } from './saasLogs';
import { autoSyncResidentFromLetter, updateResidentMaritalStatus } from './residentSync';
import { normalizeNomorSurat, getAllActiveNomorUrut, extractSequenceFromNomor } from '../services/penomoranSuratService';

export interface LetterHistory {
  id: string;
  nomor: string;
  jenis: string;
  nik: string;
  nama: string;
  tanggal: string;
  keperluan: string;
  status: 'Selesai' | 'Proses' | 'Dibatalkan' | 'Dihapus' | 'pending';
  data?: any;
}

export async function fetchLetterHistoryAsync(): Promise<LetterHistory[]> {
  const tenantId = await resolveCurrentTenant();
  if (!tenantId) return [];
  
  try {
    const { data, error } = await supabase
      .from('surat')
      .select('id, nomor, jenis_surat, nik, nama, created_at, keterangan, status, data')
      .eq('tenant_id', tenantId)
      // Surat yang di-soft-delete (nomor tengah) disembunyikan dari daftar aktif.
      .neq('status', 'Dihapus')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    if (data) {
      return data.map((r: any) => ({
        id: r.id,
        nomor: r.nomor || '-',
        jenis: r.jenis_surat,
        nik: r.nik || '-',
        nama: r.nama || '-',
        tanggal: new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        keperluan: r.keterangan || '-',
        status: r.status === 'pending' ? 'Proses' : r.status,
        data: r.data
      }));
    }
  } catch (e) {
    console.error("Error fetching letter history:", e);
  }
  return [];
}

export function getLetterHistory(): LetterHistory[] {
  // DEPRECATED: Returns empty array, use fetchLetterHistoryAsync instead
  return [];
}

export async function saveLetterHistory(history: LetterHistory[]) {
  // DEPRECATED
}

export function addLetterHistory(letter: Omit<LetterHistory, 'id'>): LetterHistory {
  const id = 'temp-' + Date.now();
  (async () => {
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) return;
      
      const insertData: any = {
        tenant_id: tenantId,
        // Simpan nomor dalam bentuk String Kapital Murni agar pencarian
        // berikutnya konsisten (mis. "475/076/WHI-SKP/2026").
        nomor: normalizeNomorSurat(letter.nomor),
        jenis_surat: letter.jenis,
        nik: letter.nik,
        nama: letter.nama,
        keterangan: letter.keperluan,
        status: letter.status === 'Proses' ? 'pending' : (letter.status || 'pending'),
        data: letter.data
      };

      // Data pejabat penandatangan disimpan DI DALAM kolom `data` (JSON) —
      // tabel `surat` TIDAK memiliki kolom terpisah pejabat_nama/jabatan/nip,
      // sehingga insert kolom yang tidak ada akan membuat seluruh penyimpanan
      // surat baru GAGAL diam-diam (PGRST204) dan surat tidak pernah masuk DB.
      // Halaman verifikasi publik membaca dari data.data.namaPejabat/jabatanPejabat.

      // Gunakan custom date untuk backdate jika ada, dengan validasi format tanggal ISO
      if (letter.tanggal && !letter.tanggal.includes(' ')) {
        const parsedDate = new Date(letter.tanggal);
        if (!isNaN(parsedDate.getTime())) {
          insertData.created_at = parsedDate.toISOString();
        }
      }

      await supabase.from('surat').insert([insertData]);
      
      // Auto-sync resident data
      try {
        await autoSyncResidentFromLetter(letter.nik, letter.data || { name: letter.nama }, letter.jenis);
      } catch (err) {
        console.error("Auto sync resident failed:", err);
      }
      
      let adminName = 'Admin Desa';
      try {
        const authStr = localStorage.getItem('didesa_auth_user');
        if (authStr) {
          adminName = JSON.parse(authStr).name || 'Admin Desa';
        }
      } catch (e) {}

      addSaaSLog({
        admin: adminName,
        aksi: 'Pembuatan Surat',
        target: `${letter.jenis} untuk ${letter.nama}`,
        status: 'Berhasil',
        category: 'Surat'
      });

    } catch (e) {
      console.error("Error adding letter history silently:", e);
    }
  })();
  return { ...letter, id } as LetterHistory;
}

export async function fetchResidentLettersAsync(nik: string, name: string): Promise<LetterHistory[]> {
  const all = await fetchLetterHistoryAsync();
  return all.filter(item => 
    (item.nik && item.nik === nik) || 
    (item.nama && (item.nama || '').toLowerCase() === (name || '').toLowerCase())
  );
}

export function getResidentLetters(nik: string, name: string): LetterHistory[] {
  // DEPRECATED
  return [];
}

export async function deleteLetterHistoryAsync(id: string): Promise<LetterHistory[]> {
  try {
    await supabase.from('surat').delete().eq('id', id);
    return await fetchLetterHistoryAsync();
  } catch (e) {
    console.error("Error deleting letter:", e);
    return await fetchLetterHistoryAsync();
  }
}

export interface SmartDeleteResult {
  type: 'HARD_DELETE' | 'SOFT_DELETE';
  message: string;
}

/**
 * PENGHAPUSAN DUAL-MODE (Daftar Surat Aktif sebagai SSOT):
 * 1) NOMOR TERAKHIR (Tail Delete): surat memegang nomor urut tertinggi (MAX)
 *    yang aktif di daftar => HARD DELETE permanen. MAX otomatis turun sehingga
 *    surat berikutnya memakai nomor yang baru dibebaskan (mis. 060).
 * 2) NOMOR TENGAH/AWAL (Middle Delete): bukan nomor terakhir => SOFT DELETE
 *    (status 'Dihapus'). Baris tetap tersimpan agar MAX tidak berubah sehingga
 *    surat berikutnya tetap berlanjut ke MAX + 1 (mis. 061).
 *
 * Tabel nyata `surat` tidak punya kolom `nomor_urut`/`tahun`/`is_deleted`/`updated_at`,
 * jadi:
 *  - MAX dihitung dari daftar surat aktif via ekstraktor SSOT (extractSequenceFromNomor).
 *  - Soft delete cukup mengubah kolom `status` menjadi 'Dihapus'.
 */
export async function deleteSuratSmart(surat: { id: string; nomor?: string }, tahun?: number): Promise<SmartDeleteResult> {
  const nomorUrutTarget = extractSequenceFromNomor(normalizeNomorSurat(surat.nomor || ''));

  // Baca data surat (jenis + payload) SEBELUM dihapus agar dampak di data penduduk
  // bisa dibatalkan (rollback) setelah penghapusan.
  let jenisSurat = '';
  let letterData: any = null;
  try {
    const { data: row } = await supabase
      .from('surat')
      .select('jenis_surat, data')
      .eq('id', surat.id)
      .maybeSingle();
    if (row) {
      jenisSurat = row.jenis_surat || '';
      letterData = row.data || {};
    }
  } catch (e) {
    console.error('deleteSuratSmart: gagal membaca data surat untuk rollback:', e);
  }

  // 1. Nomor urut tertinggi (MAX) yang aktif di daftar saat ini (SSOT).
  let currentMaxNum = 0;
  try {
    const sequences = await getAllActiveNomorUrut('', tahun);
    currentMaxNum = sequences.length > 0 ? Math.max(...sequences) : 0;
  } catch (e) {
    console.error('deleteSuratSmart: gagal membaca MAX dari daftar aktif:', e);
  }

  // 2. Nomor tak bisa diekstrak => pertahankan perilaku lama (hapus permanen).
  //    ATAU surat adalah NOMOR TERAKHIR (Tail Delete) => HARD DELETE PERMANEN.
  if (nomorUrutTarget === 0 || nomorUrutTarget >= currentMaxNum) {
    const { error } = await supabase.from('surat').delete().eq('id', surat.id);
    if (error) throw error;
    // Rollback data penduduk (Surat Nikah): kembalikan status perkawinan.
    await rollbackResidentFromNikah(jenisSurat, letterData);
    return { type: 'HARD_DELETE', message: 'Nomor terakhir dihapus permanen. Penomoran mundur.' };
  }

  // 3. NOMOR TENGAH/AWAL (Middle Delete) => SOFT DELETE (simpan histori).
  const { error } = await supabase
    .from('surat')
    .update({ status: 'Dihapus' })
    .eq('id', surat.id);
  if (error) throw error;
  // Rollback data penduduk (Surat Nikah): kembalikan status perkawinan.
  await rollbackResidentFromNikah(jenisSurat, letterData);
  return { type: 'SOFT_DELETE', message: 'Surat tengah disembunyikan. Urutan nomor utama tetap berlanjut.' };
}

// Bila surat yang dihapus adalah Surat Nikah, batalkan dampaknya di data penduduk:
// status perkawinan suami & istri (yang berdomisili di desa admin) dikembalikan ke 'Belum Kawin'.
async function rollbackResidentFromNikah(jenisSurat: string, letterData: any) {
  if (!jenisSurat || !letterData) return;
  const isNikah = jenisSurat.toLowerCase().includes('nikah');
  if (!isNikah) return;

  const niks: string[] = [];
  if (letterData.nikSuami && letterData.nikSuami !== '-') niks.push(letterData.nikSuami);
  if (letterData.nikIstri && letterData.nikIstri !== '-') niks.push(letterData.nikIstri);

  for (const nik of niks) {
    try {
      await updateResidentMaritalStatus(nik, 'Belum Kawin', 'Penghapusan Surat Nikah');
    } catch (e) {
      console.error(`Rollback status perkawinan NIK ${nik} gagal:`, e);
    }
  }
}

export function deleteLetterHistory(id: string): LetterHistory[] {
  // DEPRECATED
  return [];
}

export async function updateLetterHistoryAsync(id: string, updatedFields: Partial<LetterHistory>): Promise<LetterHistory[]> {
  try {
    const updatePayload: any = {};
    if (updatedFields.status !== undefined) {
      updatePayload.status = updatedFields.status === 'Proses' ? 'pending' : updatedFields.status;
    }
    if (updatedFields.nomor !== undefined) updatePayload.nomor = normalizeNomorSurat(updatedFields.nomor);
    if (updatedFields.nama !== undefined) updatePayload.nama = updatedFields.nama;
    if (updatedFields.nik !== undefined) updatePayload.nik = updatedFields.nik;
    if (updatedFields.keperluan !== undefined) updatePayload.keterangan = updatedFields.keperluan;
    if (updatedFields.jenis !== undefined) updatePayload.jenis_surat = updatedFields.jenis;
    if (updatedFields.data !== undefined) updatePayload.data = updatedFields.data;
    
    const { error } = await supabase.from('surat').update(updatePayload).eq('id', id);
    if (error) {
      console.error("Error updating letter in Supabase:", error);
    }
    return await fetchLetterHistoryAsync();
  } catch (e) {
    console.error("Error updating letter:", e);
    return await fetchLetterHistoryAsync();
  }
}

export function updateLetterHistory(id: string, updatedFields: Partial<LetterHistory>): LetterHistory[] {
  // Fire and forget since legacy components use this synchronously
  updateLetterHistoryAsync(id, updatedFields).catch(e => console.error(e));
  return [];
}

export async function cancelLetterHistoryAsync(id: string): Promise<LetterHistory[]> {
  return updateLetterHistoryAsync(id, { status: 'Dibatalkan' });
}

export function cancelLetterHistory(id: string): LetterHistory[] {
  // DEPRECATED
  return [];
}

export async function getLetterFullData(letter: LetterHistory): Promise<any> {
  if (letter.data) return letter.data;
  
  try {
    const { data } = await supabase.from('surat').select('data').eq('id', letter.id).single();
    if (data && data.data) return data.data;
  } catch (e) {}

  return {
    nomorSurat: letter.nomor,
    nama: letter.nama,
    nik: letter.nik,
    keperluan: letter.keperluan
  };
}
