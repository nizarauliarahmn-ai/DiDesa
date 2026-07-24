import { supabase } from './supabase';

export interface SaaSLog {
  id: string;
  admin: string;
  aksi: string;
  target: string;
  tanggal: string;
  waktu: string;
  status: 'Berhasil' | 'Gagal' | 'Peringatan';
}

export const fetchSaaSLogs = async (): Promise<SaaSLog[]> => {
  const { data, error } = await supabase
    .from('saas_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching SaaS logs:', error);
    return [];
  }

  return data.map((log: any) => {
    const d = new Date(log.created_at);
    return {
      id: log.id,
      admin: log.tenant_name || 'System',
      aksi: log.action,
      target: log.details || '-',
      tanggal: d.toISOString().split('T')[0],
      waktu: d.toTimeString().split(' ')[0],
      status: 'Berhasil'
    };
  });
};

export const addSaaSLog = async (log: Omit<SaaSLog, 'id' | 'tanggal' | 'waktu'>) => {
  const { error } = await supabase.from('saas_logs').insert([{
    action: log.aksi,
    tenant_name: log.admin,
    details: log.target
  }]);

  if (error) {
    console.error('Error adding SaaS log:', error);
  } else {
    window.dispatchEvent(new Event('saas_logs_updated'));
  }
};

// DEPRECATED for compatibility during transition
export const getSaaSLogs = (): SaaSLog[] => [];
