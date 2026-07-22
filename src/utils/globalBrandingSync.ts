/**
 * globalBrandingSync.ts
 * 
 * SINGLE SOURCE OF TRUTH untuk semua setting global SaaS (logo, nama, warna, footer).
 * 
 * Fitur Utama:
 * 1. Initial Sync saat app dimuat
 * 2. Supabase Realtime Subscriptions (Push update instan via WebSocket ke semua client < 100ms)
 * 3. Tab Focus listener & Periodic Polling fallback (15 detik) untuk memastikan data 100% segar
 * 4. Atomic Save ke Supabase & LocalStorage
 */

import { supabase } from './supabase';

const GLOBAL_BRANDING_KEYS = [
  'global_app_name',
  'global_app_logo', 
  'global_app_color',
  'global_print_footer',
  'global_footer_desc',
  'global_footer_email',
  'global_footer_phone',
  'global_footer_affiliate_title',
  'global_footer_affiliate_subtitle',
  'global_footer_affiliate_link',
  'global_footer_social1_icon',
  'global_footer_social1_link',
  'global_footer_social2_icon',
  'global_footer_social2_link',
  'global_footer_copyright',
];

let _isSyncing = false;
let _lastSynced: number | null = null;
let _realtimeChannel: any = null;

/**
 * Syncs global_settings table (SaaS-wide) from Supabase into localStorage.
 * Only overwrites localStorage if Supabase returns a non-empty value.
 * Dispatches 'global_branding_updated' when complete.
 */
export async function syncGlobalBrandingFromSupabase(force = false): Promise<void> {
  if (_isSyncing) return;
  if (!force && _lastSynced && Date.now() - _lastSynced < 5000) return;

  _isSyncing = true;
  try {
    const { data, error } = await supabase
      .from('global_settings')
      .select('key, value');

    if (error) {
      console.warn('[GlobalBranding] Supabase fetch error:', error.message);
      return;
    }

    if (!data || data.length === 0) return;

    let changed = false;
    data.forEach((row: { key: string; value: string }) => {
      if (!GLOBAL_BRANDING_KEYS.includes(row.key)) return;
      if (row.value === null || row.value === undefined || row.value.trim() === '') return;
      
      const current = localStorage.getItem(row.key);
      if (current !== row.value) {
        localStorage.setItem(row.key, row.value);
        changed = true;
      }
    });

    _lastSynced = Date.now();

    if (changed) {
      window.dispatchEvent(new Event('global_branding_updated'));
    }
  } catch (err) {
    console.warn('[GlobalBranding] Sync failed:', err);
  } finally {
    _isSyncing = false;
  }
}

/**
 * Subscribes to Supabase Realtime channel for instant (<100ms) live updates
 * across all connected devices worldwide whenever SaaS settings change.
 */
export function subscribeGlobalBrandingRealtime(): () => void {
  // Sync immediately
  syncGlobalBrandingFromSupabase(true);

  // Set up Realtime listener
  if (!_realtimeChannel) {
    _realtimeChannel = supabase
      .channel('public:global_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'global_settings' },
        (payload: any) => {
          if (payload.new && payload.new.key && payload.new.value !== undefined) {
            const { key, value } = payload.new;
            if (GLOBAL_BRANDING_KEYS.includes(key) && value && value.trim() !== '') {
              localStorage.setItem(key, value);
              window.dispatchEvent(new Event('global_branding_updated'));
            }
          }
          // Also trigger a full sync to catch any batch changes
          syncGlobalBrandingFromSupabase(true);
        }
      )
      .subscribe();
  }

  // Window Focus Listener (instant sync when user switches back to tab)
  const handleFocus = () => syncGlobalBrandingFromSupabase(true);
  window.addEventListener('focus', handleFocus);

  // Background Polling Fallback (every 15 seconds)
  const interval = setInterval(() => {
    syncGlobalBrandingFromSupabase(false);
  }, 15000);

  // Cleanup
  return () => {
    window.removeEventListener('focus', handleFocus);
    clearInterval(interval);
    if (_realtimeChannel) {
      supabase.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }
  };
}

/**
 * Saves global settings to Supabase STRICTLY ONLINE.
 * Updates localStorage and dispatches event ONLY when Supabase cloud accepts the write.
 */
export async function saveGlobalBrandingToSupabase(
  settings: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
    const { error } = await supabase
      .from('global_settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) {
      console.error('[GlobalBranding] Supabase online save failed:', error.message);
      return { success: false, error: error.message };
    }

    // Only update localStorage cache IF online Supabase write succeeded
    Object.entries(settings).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    window.dispatchEvent(new Event('global_branding_updated'));

    _lastSynced = Date.now();
    return { success: true };
  } catch (err: any) {
    console.error('[GlobalBranding] Online save failed:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Gets a global branding value.
 * Always prefers localStorage (which is kept in sync by syncGlobalBrandingFromSupabase).
 */
export function getGlobalBranding(
  key: string,
  fallback = ''
): string {
  return localStorage.getItem(key) || fallback;
}

/**
 * Helper hook-like function to read all branding values at once.
 */
export function getAllGlobalBranding() {
  return {
    name: getGlobalBranding('global_app_name', 'DiDesa'),
    logo: getGlobalBranding('global_app_logo', ''),
    color: getGlobalBranding('global_app_color', '#047857'),
    printFooter: getGlobalBranding('global_print_footer', 'Dokumen ini dibuat & dicetak melalui <strong>Sistem DiDesa</strong>'),
    footerDesc: getGlobalBranding('global_footer_desc', 'Solusi Digital Terpadu untuk Tata Kelola & Administrasi Desa Mandiri yang Modern dan Transparan.'),
    footerEmail: getGlobalBranding('global_footer_email', 'info@didesa.id'),
    footerPhone: getGlobalBranding('global_footer_phone', '+62 813-4686-7519'),
    footerAffiliateTitle: getGlobalBranding('global_footer_affiliate_title', 'AFFILIATOR'),
    footerAffiliateSubtitle: getGlobalBranding('global_footer_affiliate_subtitle', 'Mendigitalisasi desa & raih komisi nyata.'),
    footerAffiliateLink: getGlobalBranding('global_footer_affiliate_link', 'https://wa.me/6281346867519?text=Affiliator'),
    footerSocial1Icon: getGlobalBranding('global_footer_social1_icon', 'instagram'),
    footerSocial1Link: getGlobalBranding('global_footer_social1_link', 'https://instagram.com/didesa.id'),
    footerSocial2Icon: getGlobalBranding('global_footer_social2_icon', 'tiktok'),
    footerSocial2Link: getGlobalBranding('global_footer_social2_link', 'https://tiktok.com/@didesa.id'),
    footerCopyright: getGlobalBranding('global_footer_copyright', '© 2026 • HAK CIPTA DILINDUNGI'),
  };
}
