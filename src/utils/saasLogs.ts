import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';

// ==========================================
// 1. SAAS ACTIVITY LOGS
// ==========================================

export interface SaaSLog {
  id: string;
  admin: string; // Actor (bisa SaaS Admin atau nama user desa)
  aksi: string;
  target: string;
  tanggal: string;
  waktu: string;
  status: 'Berhasil' | 'Gagal' | 'Peringatan';
  category?: 'SaaS Admin' | 'Desa' | 'System' | 'Surat' | 'Penduduk';
  tenant_name?: string; // Nama desa jika aksinya dari desa
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
      admin: log.tenant_name || 'System', // Backward compatibility for old records where actor was in tenant_name
      aksi: log.action,
      target: log.details || '-',
      tanggal: d.toISOString().split('T')[0],
      waktu: d.toTimeString().split(' ')[0],
      status: log.status || 'Berhasil',
      category: log.category || 'System',
      tenant_name: log.village_name || log.tenant_name || '-',
    };
  });
};

export const addSaaSLog = async (log: Omit<SaaSLog, 'id' | 'tanggal' | 'waktu' | 'tenant_name'>) => {
  const tenantId = await resolveCurrentTenant();
  let villageName = '';

  if (tenantId) {
    const { data } = await supabase.from('tenants').select('village_name, name').eq('id', tenantId).single();
    if (data) villageName = data.village_name || data.name || '';
  }

  const { error } = await supabase.from('saas_logs').insert([{
    action: log.aksi,
    tenant_name: log.admin, // The actor name
    details: log.target,
    status: log.status || 'Berhasil',
    category: log.category || (tenantId ? 'Desa' : 'SaaS Admin'),
    tenant_id: tenantId || null,
    village_name: villageName || null
  }]);

  if (error) {
    console.error('Error adding SaaS log:', error);
  } else {
    window.dispatchEvent(new Event('saas_logs_updated'));
  }
};

let _logsChannel: any = null;
export function subscribeSaaSLogsRealtime(): () => void {
  if (!_logsChannel) {
    _logsChannel = supabase
      .channel('public:saas_logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saas_logs' },
        () => {
          window.dispatchEvent(new Event('saas_logs_updated'));
        }
      )
      .subscribe();
  }

  return () => {
    if (_logsChannel) {
      supabase.removeChannel(_logsChannel);
      _logsChannel = null;
    }
  };
}

// ==========================================
// 2. SAAS GLOBAL NOTIFICATIONS (BELL)
// ==========================================

export const addSaaSNotification = async (
  type: 'letter_request' | 'feedback' | 'aspirasi' | 'system',
  title: string,
  message: string,
  villageName?: string
) => {
  // SaaS Admin notifications are distinguished by category = 'System' or 'SaaS Global'
  // Using 'System' to be compatible with how AdminHeader.tsx currently filters SaaS admin notifs
  const tenantId = await resolveCurrentTenant();
  
  const vName = villageName || (tenantId ? 'Desa Klien' : 'Sistem SaaS');

  const { error } = await supabase.from('notifications').insert([{
    title: title,
    message: message,
    category: 'System', // Special category to fetch for SaaS Admin
    time: 'Baru saja',
    is_read: false,
    tenant_id: null, // Null means it's a global notification for SaaS Admin
  }]);

  if (error) {
    console.error('Error adding SaaS notification:', error);
  }
};

// DEPRECATED for compatibility during transition
export const getSaaSLogs = (): SaaSLog[] => [];
