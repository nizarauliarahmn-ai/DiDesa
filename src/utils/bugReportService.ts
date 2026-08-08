import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';
import { addSaaSLog } from './saasLogs';

export interface BugReport {
  id: string;
  tenant_id: string;
  tenant_name: string;
  reporter_name: string;
  reporter_role: string;
  reporter_email?: string;
  title: string;
  description: string;
  type: 'bug' | 'feature_request' | 'question' | string;
  module: string;
  urgency: 'Rendah' | 'Sedang' | 'Tinggi' | 'Mendesak';
  status: 'Menunggu' | 'Diproses' | 'Selesai';
  admin_reply?: string;
  created_at: string;
  updated_at?: string;
  page_url?: string;
}

const SETTINGS_KEY = 'saas_global_bug_reports';
const GLOBAL_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Fetch all bug reports from Supabase Cloud (online across all villages)
 */
export const fetchBugReportsOnline = async (): Promise<BugReport[]> => {
  try {
    const { data, error } = await supabase
      .from('saas_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .eq('tenant_id', GLOBAL_TENANT_ID)
      .limit(1)
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed)) {
        localStorage.setItem(SETTINGS_KEY, data.value);
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error fetching online bug reports:', e);
  }

  // Fallback to local storage
  const stored = localStorage.getItem(SETTINGS_KEY);
  return stored ? JSON.parse(stored) : [];
};

/**
 * Submit a new bug report from village admin to Supabase Cloud
 */
export const submitBugReportOnline = async (
  report: Omit<BugReport, 'id' | 'created_at' | 'status' | 'tenant_id' | 'tenant_name'>
): Promise<BugReport | null> => {
  try {
    const tenantId = (await resolveCurrentTenant()) || '11111111-1111-1111-1111-111111111111';
    
    // Resolve Tenant / Village Name
    const storedTenant = localStorage.getItem('didesa_current_tenant');
    let villageName = 'Desa';
    if (storedTenant) {
      try {
        const parsed = JSON.parse(storedTenant);
        villageName = parsed.nama_desa || villageName;
      } catch (e) {}
    }

    const newReport: BugReport = {
      ...report,
      id: `bug-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenant_id: tenantId,
      tenant_name: villageName,
      status: 'Menunggu',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const currentReports = await fetchBugReportsOnline();
    const updatedReports = [newReport, ...currentReports];
    const stringified = JSON.stringify(updatedReports);

    // Save online to Supabase saas_settings globally
    const { data: existing } = await supabase
      .from('saas_settings')
      .select('key')
      .eq('key', SETTINGS_KEY)
      .eq('tenant_id', GLOBAL_TENANT_ID)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('saas_settings')
        .update({ value: stringified, updated_at: new Date().toISOString() })
        .eq('key', SETTINGS_KEY)
        .eq('tenant_id', GLOBAL_TENANT_ID);
      if (error) console.warn('Update bug report warning:', error);
    } else {
      const { error } = await supabase
        .from('saas_settings')
        .insert({
          key: SETTINGS_KEY,
          tenant_id: GLOBAL_TENANT_ID,
          value: stringified,
          updated_at: new Date().toISOString()
        });
      if (error) console.warn('Insert bug report warning:', error);
    }

    // Save locally
    localStorage.setItem(SETTINGS_KEY, stringified);

    // Dispatch realtime DOM event
    window.dispatchEvent(new Event('bug_reports_updated'));

    // Add SaaS Log
    await addSaaSLog({
      admin: report.reporter_name || 'Admin Desa',
      aksi: 'Laporkan Kendala / Bug',
      target: `${villageName}: ${report.title}`,
      status: 'Berhasil',
      category: 'Desa'
    });

    return newReport;
  } catch (e: any) {
    console.error('Error submitting bug report online:', e);
    return null;
  }
};

/**
 * Update bug report status or add SaaS Admin reply note
 */
export const updateBugReportStatusOnline = async (
  reportId: string,
  newStatus: BugReport['status'],
  adminReply?: string
): Promise<boolean> => {
  try {
    const currentReports = await fetchBugReportsOnline();
    const index = currentReports.findIndex(r => r.id === reportId);
    
    if (index === -1) return false;

    currentReports[index].status = newStatus;
    if (adminReply !== undefined) {
      currentReports[index].admin_reply = adminReply;
    }
    currentReports[index].updated_at = new Date().toISOString();

    const stringified = JSON.stringify(currentReports);
    const { data: existing } = await supabase
      .from('saas_settings')
      .select('key')
      .eq('key', SETTINGS_KEY)
      .eq('tenant_id', GLOBAL_TENANT_ID)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('saas_settings')
        .update({ value: stringified, updated_at: new Date().toISOString() })
        .eq('key', SETTINGS_KEY)
        .eq('tenant_id', GLOBAL_TENANT_ID);
      if (error) console.warn('Update bug report status warning:', error);
    } else {
      const { error } = await supabase
        .from('saas_settings')
        .insert({
          key: SETTINGS_KEY,
          tenant_id: GLOBAL_TENANT_ID,
          value: stringified,
          updated_at: new Date().toISOString()
        });
      if (error) console.warn('Insert bug report status warning:', error);
    }

    localStorage.setItem(SETTINGS_KEY, stringified);
    window.dispatchEvent(new Event('bug_reports_updated'));
    return true;
  } catch (e) {
    console.error('Error updating bug report status:', e);
    return false;
  }
};
