import { supabase } from './supabase';

// Cache in memory so we don't query Supabase on every render
let cachedTenantId: string | null = null;
let isResolving = false;

/**
 * Mendapatkan tenant_id (ID Desa) berdasarkan Subdomain atau sesi Login.
 * Pendekatan Hybrid sesuai kesepakatan SaaS Multi-Tenant.
 */
export async function resolveCurrentTenant(): Promise<string | null> {
  if (cachedTenantId) return cachedTenantId;
  if (isResolving) {
    // Wait for resolution if already in progress
    while (isResolving) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return cachedTenantId;
  }

  isResolving = true;

  try {
    // 1. Cek Parameter URL khusus untuk testing atau QR Code
    const urlParams = new URLSearchParams(window.location.search);
    
    // Bypass query if direct UUID is provided (e.g. from QR code)
    const directId = urlParams.get('t_id');
    if (directId) {
      cachedTenantId = directId;
      isResolving = false;
      return directId;
    }

    const tenantParam = urlParams.get('tenant');
    let subdomain: string | null = tenantParam;

    // 2. Jika tidak ada parameter, Cek Subdomain
    if (!subdomain) {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        if (parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== 'didesa') {
          subdomain = parts[0];
        }
      }
    }

    // Jika subdomain ditemukan, ini menjadi prioritas utama.
    if (subdomain) {
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('domain', subdomain)
        .single();
        
      if (data && data.id) {
        cachedTenantId = data.id;
        isResolving = false;
        return data.id;
      }
    }

    // 3. Fallback: Gunakan sesi otentikasi login
    // Jika user mengakses halaman admin tanpa subdomain/parameter (atau diakses dari root domain)
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

    // (Duplicate fallback blocks removed)

    // 3. Jika tidak ada yang cocok, kembalikan null. 
    // PELANGGARAN ATURAN: Dilarang keras melakukan fallback ke ID desa tertentu (misal Sukamakmur) 
    // karena aplikasi ini adalah Multi-Tenant. Biarkan UI menangani null (misal: halaman error atau generic login).
    console.warn("Tenant Resolver: No subdomain or auth found. Returning null.");
    
    isResolving = false;
    return null;

  } catch (error) {
    console.error("Failed to resolve tenant:", error);
    isResolving = false;
    return null;
  }
}
