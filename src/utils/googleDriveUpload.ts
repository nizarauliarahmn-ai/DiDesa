import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';

interface GoogleDriveUploadResult {
  fileId: string;
  viewUrl: string;
  downloadUrl: string;
}

export interface GoogleDriveFolderTestResult {
  ok: boolean;
  message: string;
}

const GOOGLE_DRIVE_FOLDER_ID_PATTERN = /^[A-Za-z0-9_\-]{15,128}$/;

export async function getVillageGoogleDriveFolderId(): Promise<string | null> {
  const local = localStorage.getItem('google_drive_folder_id');
  if (local && local.trim()) return local.trim();
  try {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return null;
    const { data } = await supabase
      .from('saas_settings')
      .select('value')
      .eq('tenant_id', tenantId)
      .eq('key', 'google_drive_folder_id')
      .maybeSingle();
    const value = (data as any)?.value;
    if (value && String(value).trim()) {
      localStorage.setItem('google_drive_folder_id', String(value).trim());
      return String(value).trim();
    }
  } catch (e) {
    console.warn('Gagal membaca konfigurasi Google Drive dari Supabase:', e);
  }
  return null;
}

export async function getVillageGoogleDriveApiKey(): Promise<string | null> {
  const local = localStorage.getItem('google_drive_api_key');
  if (local && local.trim()) return local.trim();
  try {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return null;
    const { data } = await supabase
      .from('saas_settings')
      .select('value')
      .eq('tenant_id', tenantId)
      .eq('key', 'google_drive_api_key')
      .maybeSingle();
    const value = (data as any)?.value;
    if (value && String(value).trim()) {
      localStorage.setItem('google_drive_api_key', String(value).trim());
      return String(value).trim();
    }
  } catch (e) {
    console.warn('Gagal membaca API key Google Drive dari Supabase:', e);
  }
  return null;
}

function getApiKeyFromStorage(): string {
  return localStorage.getItem('google_drive_api_key') || '';
}

export async function testGoogleDriveFolder(folderId: string): Promise<GoogleDriveFolderTestResult> {
  const id = (folderId || '').trim();
  if (!id) {
    return { ok: false, message: 'ID Folder Google Drive masih kosong. Silakan isi terlebih dahulu.' };
  }
  if (!GOOGLE_DRIVE_FOLDER_ID_PATTERN.test(id)) {
    return { ok: false, message: 'Format ID Folder tidak valid. Salin ID dari URL folder (bagian setelah /folders/).' };
  }
  const apiKey = getApiKeyFromStorage();
  if (!apiKey) {
    return { ok: false, message: 'API Key Google Drive belum diatur. Silakan masukkan API Key di halaman Pengaturan.' };
  }
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,mimeType,webViewLink&supportsAllDrives=true&key=${encodeURIComponent(apiKey)}`);
    if (res.ok) {
      const data = await res.json();
      return { ok: true, message: `Koneksi berhasil! Folder: "${data.name}" siap menerima unggahan.` };
    }
    if (res.status === 404) {
      return { ok: false, message: 'Folder tidak ditemukan. Pastikan ID benar dan folder di-share publik ("Siapa saja yang memiliki link").' };
    }
    const errText = await res.text().catch(() => '');
    return { ok: false, message: `Google Drive merespons error (${res.status}): ${errText.slice(0, 120)}. Pastikan folder di-share publik.` };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Gagal terhubung ke Google Drive. Periksa koneksi internet.' };
  }
}

export async function uploadToVillageGoogleDrive(file: File, villageFolderId: string): Promise<GoogleDriveUploadResult> {
  const folderId = (villageFolderId || '').trim();
  if (!folderId) {
    throw new Error('Folder Google Drive desa belum dikonfigurasi. Atur di Pengaturan Desa.');
  }
  const apiKey = getApiKeyFromStorage();
  if (!apiKey) {
    throw new Error('API Key Google Drive belum diatur. Silakan atur di halaman Pengaturan.');
  }
  const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const metadata = { name: uniqueName, parents: [folderId] };

  const body = new FormData();
  body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  body.append('file', file);

  const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink&supportsAllDrives=true&key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Gagal unggah ke Google Drive (${res.status}). Pastikan folder di-share "Siapa saja yang memiliki link". (${errText.slice(0, 120)})`
    );
  }

  const data = await res.json();
  const viewUrl = data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`;
  const downloadUrl = data.webContentLink || `https://drive.google.com/uc?export=download&id=${data.id}`;
  return { fileId: data.id, viewUrl, downloadUrl };
}