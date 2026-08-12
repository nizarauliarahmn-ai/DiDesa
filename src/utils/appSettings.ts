// App-wide settings loader.
// Content legal (Syarat & Ketentuan / Kebijakan Privasi) hanya boleh dikelola
// oleh akun pengelola SaaS melalui Dashboard/CMS. Nilai diambil dari:
//   1) JSON objek di localStorage 'global_app_settings' (mis. termsUrl, termsContent, ...)
//   2) Key top-level di localStorage yang disinkronkan dari tabel Supabase 'saas_settings'
export interface AppSettings {
  termsUrl?: string;
  privacyUrl?: string;
  termsContent?: string;
  privacyContent?: string;
}

export const defaultAppSettings: AppSettings = {
  termsUrl: '/syarat-ketentuan',
  privacyUrl: '/kebijakan-privasi',
  termsContent: '',
  privacyContent: '',
};

export function loadAppSettings(): AppSettings {
  let fromJson: Partial<AppSettings> = {};
  try {
    const stored = localStorage.getItem('global_app_settings');
    if (stored) fromJson = JSON.parse(stored);
  } catch {
    fromJson = {};
  }

  return {
    termsUrl: fromJson.termsUrl || localStorage.getItem('terms_url') || defaultAppSettings.termsUrl,
    privacyUrl: fromJson.privacyUrl || localStorage.getItem('privacy_url') || defaultAppSettings.privacyUrl,
    termsContent: fromJson.termsContent || localStorage.getItem('terms_content') || '',
    privacyContent: fromJson.privacyContent || localStorage.getItem('privacy_content') || '',
  };
}