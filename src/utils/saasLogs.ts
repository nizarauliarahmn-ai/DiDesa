import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';

// ==========================================
// 1. SAAS ACTIVITY LOGS (SUPABASE-FIRST via saas_settings + REALTIME BROADCAST)
// ==========================================

export interface SaaSLog {
  id: string;
  admin: string; // Actor (SaaS Admin / Admin Desa)
  aksi: string;
  target: string;
  tanggal: string;
  waktu: string;
  status: 'Berhasil' | 'Gagal' | 'Peringatan';
  category?: 'SaaS Admin' | 'Desa' | 'System' | 'Surat' | 'Penduduk';
  tenant_name?: string; // Nama desa
}

export const fetchSaaSLogs = async (): Promise<SaaSLog[]> => {
  try {
    const { data, error } = await supabase
      .from('saas_settings')
      .select('value')
      .eq('key', 'saas_global_activity_logs')
      .limit(1)
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed)) {
        localStorage.setItem('saas_global_activity_logs', data.value);
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error fetching SaaS logs from Supabase:', e);
  }

  const stored = localStorage.getItem('saas_global_activity_logs');
  return stored ? JSON.parse(stored) : [];
};

export const addSaaSLog = async (log: Omit<SaaSLog, 'id' | 'tanggal' | 'waktu' | 'tenant_name'>) => {
  try {
    const tenantId = await resolveCurrentTenant();
    
    // Resolve Village Name dynamically from DB or local storage
    let villageName = log.category === 'SaaS Admin' ? 'Platform SaaS' : '';
    if (!villageName) {
      villageName = localStorage.getItem('village_name') || '';
    }

    if (tenantId && tenantId !== '11111111-1111-1111-1111-111111111111') {
      const { data } = await supabase.from('tenants').select('nama_desa').eq('id', tenantId).single();
      if (data && data.nama_desa) {
        villageName = data.nama_desa || villageName;
      }
    }

    if (!villageName) {
      villageName = tenantId ? 'Desa Client' : 'Platform SaaS';
    }

    const now = new Date();
    const newLog: SaaSLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      admin: log.admin || (tenantId ? 'Admin Desa' : 'SaaS Admin'),
      aksi: log.aksi,
      target: log.target,
      tanggal: now.toISOString().split('T')[0],
      waktu: now.toTimeString().split(' ')[0],
      status: log.status || 'Berhasil',
      category: log.category || (tenantId ? 'Desa' : 'SaaS Admin'),
      tenant_name: villageName,
    };

    const currentLogs = await fetchSaaSLogs();
    const updatedLogs = [newLog, ...currentLogs].slice(0, 300);
    const jsonStr = JSON.stringify(updatedLogs);

    const masterTenantId = tenantId || '11111111-1111-1111-1111-111111111111';

    const { data: existing } = await supabase
      .from('saas_settings')
      .select('key')
      .eq('key', 'saas_global_activity_logs')
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('saas_settings')
        .update({ value: jsonStr })
        .eq('key', 'saas_global_activity_logs');
    } else {
      await supabase
        .from('saas_settings')
        .insert({ tenant_id: masterTenantId, key: 'saas_global_activity_logs', value: jsonStr });
    }

    // Sync to all other tenant rows if any
    const { data: allRows } = await supabase
      .from('saas_settings')
      .select('tenant_id')
      .eq('key', 'saas_global_activity_logs');

    if (allRows && allRows.length > 1) {
      for (const row of allRows) {
        if (row.tenant_id !== masterTenantId) {
          await supabase
            .from('saas_settings')
            .update({ value: jsonStr })
            .eq('key', 'saas_global_activity_logs')
            .eq('tenant_id', row.tenant_id);
        }
      }
    }

    localStorage.setItem('saas_global_activity_logs', jsonStr);
    window.dispatchEvent(new Event('saas_logs_updated'));

    // Realtime Broadcast across all connected clients & tenants
    const channel = getLogsChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'new_saas_log',
        payload: { logs: updatedLogs }
      }).catch((err: any) => console.warn('Broadcast send error:', err));
    }
  } catch (e) {
    console.error('Error adding SaaS log:', e);
  }
};

let _logsChannel: any = null;

const getLogsChannel = () => {
  if (!_logsChannel) {
    _logsChannel = supabase.channel('public:saas_logs_realtime_broadcast');
    _logsChannel.subscribe();
  }
  return _logsChannel;
};

export function subscribeSaaSLogsRealtime(): () => void {
  const channel = getLogsChannel();
  
  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'saas_settings' },
      (payload: any) => {
        if (payload.new && payload.new.key === 'saas_global_activity_logs') {
          if (payload.new.value) {
            localStorage.setItem('saas_global_activity_logs', payload.new.value);
          }
          window.dispatchEvent(new Event('saas_logs_updated'));
        }
      }
    )
    .on('broadcast', { event: 'new_saas_log' }, (payload: any) => {
      if (payload?.payload?.logs) {
        localStorage.setItem('saas_global_activity_logs', JSON.stringify(payload.payload.logs));
      }
      window.dispatchEvent(new Event('saas_logs_updated'));
    });

  return () => {
    // We don't remove channel here because we still need it to send logs
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
  const { error } = await supabase.from('notifications').insert([{
    id: 'notif-saas-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    title: title,
    message: message,
    category: 'SaaS Global', // Changed to SaaS Global to ensure SaaS Admin sees it
    time: 'Baru saja',
    is_read: false,
    tenant_id: null, // SaaS notifications belong to SaaS Admin
  }]);

  if (error) {
    console.error('Error adding SaaS notification:', error);
  }
};

// DEPRECATED for compatibility during transition
export const getSaaSLogs = (): SaaSLog[] => [];
