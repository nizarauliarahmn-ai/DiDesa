import { supabase } from './supabase';

let cachedTenantId: string | null = null;
let isResolving = false;

export async function resolveCurrentTenant(): Promise<string | null> {
  if (cachedTenantId) {
    persistActiveTenantId(cachedTenantId);
    return cachedTenantId;
  }
  if (isResolving) {
    while (isResolving) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (cachedTenantId) persistActiveTenantId(cachedTenantId);
    return cachedTenantId;
  }

  isResolving = true;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 1. Parameter t_id (UUID langsung)
    const directId = urlParams.get('t_id');
    if (directId) {
      cachedTenantId = directId;
      persistActiveTenantId(directId);
      isResolving = false;
      return directId;
    }

    // 2. Parameter ?tenant= atau Subdomain Hostname
    const tenantParam = urlParams.get('tenant');
    let targetDomain: string | null = tenantParam;

    if (!targetDomain) {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        if (parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== 'didesa' && parts[0] !== 'dev' && parts[0] !== 'staging' && parts[0] !== 'preview') {
          targetDomain = parts[0];
        }
      }
    }

    if (targetDomain) {
      const raw = targetDomain.toLowerCase().trim();
      const slug = raw.replace(/\s+/g, '').replace(/^https?:\/\//, '').split('.')[0];

      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .or(`domain.ilike.${slug},domain.ilike.${raw},domain.ilike.${slug}.%`)
        .maybeSingle();
        
      if (data && data.id) {
        cachedTenantId = data.id;
        persistActiveTenantId(data.id);
        isResolving = false;
        return data.id;
      } else {
        // If an explicit target domain was provided but not found, DO NOT fallback.
        // It means the subdomain is unregistered.
        isResolving = false;
        return null;
      }
    }

    // 3. Fallback: Gunakan sesi otentikasi login jika tidak ada parameter dan bukan subdomain spesifik
    const localAuth = localStorage.getItem('didesa_auth_user');
    if (localAuth) {
      try {
        const user = JSON.parse(localAuth);
        if (user && user.tenantId) {
          cachedTenantId = user.tenantId;
          persistActiveTenantId(user.tenantId);
          isResolving = false;
          return user.tenantId;
        }
      } catch(e) {}
    }

    console.warn("Tenant Resolver: No subdomain or auth found. Returning null.");
    isResolving = false;
    return null;

  } catch (error) {
    console.error("Failed to resolve tenant:", error);
    isResolving = false;
    return null;
  }
}

// Simpan tenant aktif hasil resolve ke localStorage agar fungsi SINKRON lain
// (mis. pembuat QR TTE saat cetak surat) memakai sumber tenant yang SAMA
// dengan yang dipakai penyimpanan surat (`resolveCurrentTenant`).
function persistActiveTenantId(id: string) {
  try {
    if (id && localStorage.getItem('didesa_active_tenant_id') !== id) {
      localStorage.setItem('didesa_active_tenant_id', id);
    }
  } catch (e) {}
}

/**
 * Versi SINKRON dari resolveCurrentTenant — dipakai saat membuat QR TTE
 * yang TIDAK boleh async (fungsi cetak sinkron). Prioritas:
 * 1. Parameter URL `t_id`
 * 2. `didesa_auth_user.tenantId` (login kades/admin LANGSUNG sebagai tenant
 *    — sumber paling otoritatif; tidak mungkin basi dari kunjungan desa lain)
 * 3. `didesa_active_tenant_id` (cache hasil resolveCurrentTenant, dipakai
 *    saat admin SaaS tanpa tenantId mengelola portal desa via subdomain/param)
 */
export function getActiveTenantIdSync(): string {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const directId = urlParams.get('t_id');
    if (directId) return directId;
  } catch (e) {}

  try {
    const localAuth = localStorage.getItem('didesa_auth_user');
    if (localAuth) {
      const user = JSON.parse(localAuth);
      if (user && user.tenantId) return String(user.tenantId);
    }
  } catch (e) {}

  try {
    const cached = localStorage.getItem('didesa_active_tenant_id');
    if (cached) return cached;
  } catch (e) {}

  return '';
}

export function clearTenantCache() {
  cachedTenantId = null;
  try {
    localStorage.removeItem('didesa_active_tenant_id');
  } catch (e) {}
}
