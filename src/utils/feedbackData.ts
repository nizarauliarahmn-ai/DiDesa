import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';

export interface Feedback {
  id: string;
  nama: string;
  desa: string;
  email: string;
  pesan: string;
  tanggal: string;
  status: 'Baru' | 'Dibaca' | 'Selesai';
  kategori: 'Saran' | 'Kritik' | 'Bug';
}

export const fetchFeedbacksAsync = async (): Promise<Feedback[]> => {
  const tenantId = await resolveCurrentTenant();
  if (!tenantId) return [];
  
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
    
  if (error || !data) {
    console.error('Error fetching feedbacks:', error);
    return [];
  }
  
  return data.map((f: any) => ({
    id: f.id,
    nama: f.nama,
    desa: f.desa,
    email: f.email,
    pesan: f.pesan,
    tanggal: new Date(f.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    status: f.status,
    kategori: f.kategori
  }));
};

export const addFeedbackAsync = async (feedback: Omit<Feedback, 'id' | 'status' | 'tanggal'>) => {
  const tenantId = await resolveCurrentTenant();
  if (!tenantId) return;

  const { error } = await supabase.from('feedback').insert([{
    tenant_id: tenantId,
    nama: feedback.nama,
    desa: feedback.desa,
    email: feedback.email,
    pesan: feedback.pesan,
    kategori: feedback.kategori,
    status: 'Baru'
  }]);

  if (error) {
    console.error('Error adding feedback:', error);
  } else {
    window.dispatchEvent(new Event('feedback_updated'));
  }
};

export const updateFeedbackStatusAsync = async (id: string, status: Feedback['status']) => {
  const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
  if (error) {
    console.error('Error updating feedback status:', error);
  } else {
    window.dispatchEvent(new Event('feedback_updated'));
  }
};

export const deleteFeedbackAsync = async (id: string) => {
  const { error } = await supabase.from('feedback').delete().eq('id', id);
  if (error) {
    console.error('Error deleting feedback:', error);
  } else {
    window.dispatchEvent(new Event('feedback_updated'));
  }
};

// DEPRECATED implementations to prevent build crashes during transition
export const getFeedbacks = (): Feedback[] => [];
export const addFeedback = (f: any) => {};
export const updateFeedbackStatus = (id: any, status: any) => {};
export const deleteFeedback = (id: any) => {};
