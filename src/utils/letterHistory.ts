import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';

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
  // DEPRECATED
  return { ...letter, id: 'temp' } as LetterHistory;
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
    if (updatedFields.status) {
      updatePayload.status = updatedFields.status === 'Proses' ? 'pending' : updatedFields.status;
    }
    if (updatedFields.nomor) updatePayload.nomor = updatedFields.nomor;
    
    await supabase.from('surat').update(updatePayload).eq('id', id);
    return await fetchLetterHistoryAsync();
  } catch (e) {
    return await fetchLetterHistoryAsync();
  }
}

export function updateLetterHistory(id: string, updatedFields: Partial<LetterHistory>): LetterHistory[] {
  // DEPRECATED
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
