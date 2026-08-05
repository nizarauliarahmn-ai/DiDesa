import { supabase } from './supabase';

export const DEFAULT_MONTHLY_QUOTA = 500;

export interface AiKeyQuotaInfo {
  apiKey: string;
  isMasterKey: boolean;
  usedQuota: number;
  totalQuota: number;
  remainingQuota: number;
  hasQuota: boolean;
}

const getMonthKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}_${month}`;
};

/**
 * Mendapatkan jumlah penggunaan AI desa pada bulan berjalan.
 */
export const getMonthlyUsage = (tenantId: string): number => {
  const key = `didesa_ai_usage_${tenantId}_${getMonthKey()}`;
  const val = localStorage.getItem(key);
  return val ? parseInt(val, 10) : 0;
};

/**
 * Menambahkan 1 penggunaan AI untuk desa pada bulan berjalan.
 */
export const incrementMonthlyUsage = (tenantId: string): number => {
  const key = `didesa_ai_usage_${tenantId}_${getMonthKey()}`;
  const current = getMonthlyUsage(tenantId);
  const next = current + 1;
  localStorage.setItem(key, String(next));
  window.dispatchEvent(new Event('didesa_ai_usage_updated'));
  return next;
};

/**
 * Memuat Master Key dari Supabase saas_settings jika ada.
 */
export const fetchMasterKeyFromSupabase = async (): Promise<string | null> => {
  try {
    const { data } = await supabase
      .from('saas_settings')
      .select('value')
      .eq('key', 'master_gemini_api_key')
      .single();
    if (data && data.value) {
      return data.value.trim();
    }
  } catch (e) {
    // ignore
  }
  return null;
};

/**
 * Menyelesaikan API Key terbaik (Custom Key vs Master Key) beserta info kuotanya.
 */
export const resolveAiKeyAndQuota = async (tenantId: string): Promise<AiKeyQuotaInfo> => {
  // 1. Cek Custom Key milik Desa sendiri
  const customKey = localStorage.getItem(`desi_api_key_${tenantId}`);
  if (customKey && customKey.trim().length > 0) {
    return {
      apiKey: customKey.trim(),
      isMasterKey: false,
      usedQuota: getMonthlyUsage(tenantId),
      totalQuota: Infinity,
      remainingQuota: Infinity,
      hasQuota: true,
    };
  }

  // 2. Cek Master Key dari Supabase saas_settings
  const supabaseMasterKey = await fetchMasterKeyFromSupabase();
  let masterKey = supabaseMasterKey || import.meta.env.VITE_GEMINI_API_KEY || '';

  masterKey = masterKey.trim();

  const used = getMonthlyUsage(tenantId);
  const total = DEFAULT_MONTHLY_QUOTA;
  const remaining = Math.max(0, total - used);

  return {
    apiKey: masterKey,
    isMasterKey: true,
    usedQuota: used,
    totalQuota: total,
    remainingQuota: remaining,
    hasQuota: remaining > 0,
  };
};
