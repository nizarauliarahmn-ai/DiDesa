import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';
import { addSaaSLog } from './saasLogs';

export interface LetterHistory {
  id: string;
  nomor: string;
  jenis: string;
  nik: string;
  nama: string;
  tanggal: string;
  keperluan: string;
  status: 'Selesai' | 'Proses' | 'Dibatalkan' | 'pending';
  data?: any;
}

export async function fetchLetterHistoryAsync(): Promise<LetterHistory[]> {
  const tenantId = await resolveCurrentTenant();
  if (!tenantId) return [];
  
  try {
    const { data, error } = await supabase
      .from('surat')
      .select('*')
      .eq('tenant_id', tenantId)
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
        nomor: letter.nomor,
        jenis_surat: letter.jenis,
        nik: letter.nik,
        nama: letter.nama,
        keterangan: letter.keperluan,
        status: letter.status === 'Proses' ? 'pending' : (letter.status || 'pending'),
        data: letter.data
      };

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
        const { autoSyncResidentFromLetter } = await import('./residentSync');
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
    if (updatedFields.nomor !== undefined) updatePayload.nomor = updatedFields.nomor;
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
