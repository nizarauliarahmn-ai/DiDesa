import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';

let residentsCache: Promise<any[]> | null = null;
let cacheTime = 0;

export function fetchResidentsCached(force = false) {
  if (!force && residentsCache && Date.now() - cacheTime < 10000) {
    return residentsCache.then(data => ({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data)
    }));
  }
  
  const req = (async () => {
    const tenantId = await resolveCurrentTenant();
    
    if (!tenantId) return [];

    let allData: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;

    while (hasMore) {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('tenant_id', tenantId)
        .range(page * pageSize, (page + 1) * pageSize - 1);
        
      if (error) {
        console.error("Error fetching residents from Supabase for cache:", error);
        hasMore = false;
      } else if (data) {
        allData = [...allData, ...data];
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }
    return allData;
  })();
  
  residentsCache = req;
  cacheTime = Date.now();
  
  return req.then(data => ({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data)
  }));
}

export function invalidateResidentsCache() {
  residentsCache = null;
  cacheTime = 0;
}
