import { supabase } from './supabase';

let cachedTenantId: string | null = null;
let isResolving = false;

export async function resolveCurrentTenant(): Promise<string | null> {
  if (cachedTenantId) return cachedTenantId;
  if (isResolving) {
    while (isResolving) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return cachedTenantId;
  }

  isResolving = true;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 1. Parameter t_id (UUID langsung)
    const directId = urlParams.get('t_id');
    if (directId) {
      cachedTenantId = directId;
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
        if (parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== 'didesa') {
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
        isResolving = false;
        return data.id;
      }
    }

    // 3. Fallback: Gunakan sesi otentikasi login HANYA jika tidak ada parameter ?tenant=
    if (!tenantParam) {
      const localAuth = localStorage.getItem('didesa_auth_user');
      if (localAuth) {
        try {
          const user = JSON.parse(localAuth);
          if (user && user.tenantId) {
            cachedTenantId = user.tenantId;
            isResolving = false;
            return user.tenantId;
          }
        } catch(e) {}
      }
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

export function clearTenantCache() {
  cachedTenantId = null;
}
