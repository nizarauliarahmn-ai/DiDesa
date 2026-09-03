import { supabase } from './supabase';

export interface GoogleDriveUploadResult {
  fileId: string;
  viewUrl: string;
  downloadUrl: string;
}

/**
 * Unggah file ke Supabase Storage bucket publik.
 * Mengembalikan URL publik untuk dibaca di browser.
 */
export async function uploadToSupabaseStorage(file: File, bucketName: string = 'buku-tamu'): Promise<GoogleDriveUploadResult> {
  const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

  // Upload file ke bucket Supabase
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(uniqueName, file, {
      cacheControl: 'public, max-age: 31536000',
      upsert: false,
    });

  if (error) {
    throw new Error(`Gagal unggah ke Supabase Storage: ${error.message}`);
  }

  // Dapatkan URL publik
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(uniqueName);

  return {
    fileId: uniqueName,
    viewUrl: urlData.publicUrl,
    downloadUrl: urlData.publicUrl,
  };
}

/**
 * Baca URL file dari Supabase Storage.
 * Berguna untuk menampilkan file yang sudah diunggah sebelumnya.
 */
export async function getSupabaseStorageUrl(fileId: string, bucketName: string = 'buku-tamu'): Promise<string> {
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileId);

  return urlData.publicUrl;
}

/**
 * Hapus file dari Supabase Storage.
 */
export async function deleteSupabaseStorageFile(fileId: string, bucketName: string = 'buku-tamu'): Promise<void> {
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([fileId]);

  if (error) {
    throw new Error(`Gagal hapus file dari Supabase: ${error.message}`);
  }
}

// Fungsi bantu: cek apakah Supabase Storage sudah konfigurasi
export async function checkSupabaseStorageConfig(bucketName: string = 'buku-tamu'): Promise<{ ok: boolean; message: string }> {
  try {
    // Coba list file di bucket (akan return error jika bucket tidak ada atau tidak bisa diakses)
    const { error } = await supabase.storage.from(bucketName).list('', { limit: 1 });
    if (error) {
      return { ok: false, message: 'Bucket Supabase Storage belum dikonfigurasi atau tidak memiliki akses publik. Bucket perlu di-set "Public" di Dashboard Supabase.' };
    }
    return { ok: true, message: 'Supabase Storage terkonfigurasi dengan benar.' };
  } catch (e: any) {
    return { ok: false, message: 'Gagal cek konfigurasi Supabase Storage: ' + e.message };
  }
}