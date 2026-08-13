import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';
import { addSaaSLog } from './saasLogs';

export interface BugReportMessage {
  sender: string;
  role: string;
  text: string;
  timestamp: string;
  attachment_url?: string;
  attachment_type?: 'image' | 'document';
  file_name?: string;
}

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
  messages?: BugReportMessage[];
  created_at: string;
  updated_at?: string;
  page_url?: string;
}

export const SETTINGS_KEY = 'saas_global_bug_reports';

export const UNREAD_TICKETS_KEY = 'saas_unread_tickets';

export const getBugReportReadState = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(UNREAD_TICKETS_KEY) || '{}');
  } catch {
    return {};
  }
};

export const markBugReportsAsRead = (reportIds: string[]) => {
  try {
    if (!reportIds || reportIds.length === 0) return;
    const read = getBugReportReadState();
    reportIds.forEach(id => { read[id] = Date.now(); });
    localStorage.setItem(UNREAD_TICKETS_KEY, JSON.stringify(read));
    window.dispatchEvent(new Event('bug_reports_read'));
  } catch (e) {
    console.error('Gagal menandai laporan bug terbaca:', e);
  }
};

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
 * Fetch bug reports specific to the current village tenant
 */
export const fetchVillageBugReportsOnline = async (): Promise<BugReport[]> => {
  const allReports = await fetchBugReportsOnline();
  const tenantId = await resolveCurrentTenant();
  return allReports.filter(r => r.tenant_id === tenantId);
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
      messages: [{
        sender: report.reporter_name || 'Admin Desa',
        role: report.reporter_role || 'Admin Desa',
        text: report.description,
        timestamp: new Date().toISOString()
      }],
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

/**
 * Reply to a bug report (2-way chat)
 */
export const replyToBugReportOnline = async (
  reportId: string,
  reply: { sender: string; role: string; text: string; attachment_url?: string; attachment_type?: string; file_name?: string }
): Promise<boolean> => {
  try {
    const currentReports = await fetchBugReportsOnline();
    const index = currentReports.findIndex(r => r.id === reportId);
    
    if (index !== -1) {
      const report = currentReports[index];
      const newMessages = [...(report.messages || []), {
        ...reply,
        timestamp: new Date().toISOString()
      }];

      currentReports[index] = {
        ...report,
        messages: newMessages,
        status: reply.role === 'SaaS Admin' ? 'Diproses' : 'Menunggu',
        updated_at: new Date().toISOString()
      };

      const stringified = JSON.stringify(currentReports);

      const { error } = await supabase
        .from('saas_settings')
        .update({ value: stringified, updated_at: new Date().toISOString() })
        .eq('key', SETTINGS_KEY)
        .eq('tenant_id', GLOBAL_TENANT_ID);

      if (error) {
          // fallback insert if update fails due to missing row (edge case but handled above mostly)
          await supabase.from('saas_settings').insert({
            key: SETTINGS_KEY,
            tenant_id: GLOBAL_TENANT_ID,
            value: stringified,
            updated_at: new Date().toISOString()
          });
      }

      localStorage.setItem(SETTINGS_KEY, stringified);
      window.dispatchEvent(new Event('bug_reports_updated'));
      
      // Notify Admin
      if (reply.role === 'SaaS Admin') {
        await supabase.from('notifications').insert([{
           id: `notif-chat-${Date.now()}`,
           tenant_id: report.tenant_id,
           title: "Balasan Tiket Bantuan",
           message: `SaaS Admin merespon tiket Anda: "${report.title}".`,
           category: "Assistance",
           is_read: false,
           timestamp: new Date().toISOString()
        }]);
      } else {
        // Notify SaaS (Global notification trigger will be caught by AdminHeader)
      }

      return true;
    }
    return false;
  } catch (e: any) {
    console.error('Error replying to bug report online:', e);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Lampiran Chat (Upload & Kompresi Client-Side)
// ---------------------------------------------------------------------------

export const CHAT_ATTACHMENT_BUCKET = 'chat-attachments';

const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_COMPRESS_QUALITY = 0.68;
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5 MB

const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal memuat gambar')); };
    img.src = url;
  });
};

/**
 * Kompresi gambar client-side via Canvas -> WebP/JPEG (max 1200px, quality ~0.68).
 * Menjaga aspek rasio. Hasil diharapkan di bawah 200 KB.
 */
export const compressImage = async (file: File): Promise<Blob> => {
  const img = await loadImageFromFile(file);

  let { width, height } = img;
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, width, height);

  // Coba WebP dulu; fallback ke JPEG bila tidak didukung.
  const webpBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', IMAGE_COMPRESS_QUALITY));
  if (webpBlob) return webpBlob;

  const jpegBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', IMAGE_COMPRESS_QUALITY));
  return jpegBlob || file;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Upload lampiran (gambar sudah dikompres) ke Supabase Storage bucket chat-attachments
 * dengan path: chat_files/{ticket_id}/{timestamp}_{filename}
 */
export const uploadChatAttachment = async (
  ticketId: string,
  file: File
): Promise<{ url: string; type: 'image' | 'document'; name: string }> => {
  const isImage = file.type.startsWith('image/');

  let blob: Blob = file;
  let contentType: string = file.type || 'application/octet-stream';

  if (isImage) {
    blob = await compressImage(file);
    contentType = blob.type || 'image/webp';
  } else if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error('Ukuran dokumen maksimal 5 MB agar sistem tetap ringan.');
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `chat_files/${ticketId}/${timestamp}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(CHAT_ATTACHMENT_BUCKET)
    .upload(path, blob, { contentType, upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message || 'Gagal mengunggah lampiran');
  }

  const { data } = supabase.storage.from(CHAT_ATTACHMENT_BUCKET).getPublicUrl(path);
  return {
    url: data.publicUrl,
    type: isImage ? 'image' : 'document',
    name: file.name
  };
};
