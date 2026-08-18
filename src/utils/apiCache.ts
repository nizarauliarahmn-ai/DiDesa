import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';

let residentsCache: Promise<any[]> | null = null;
let cacheTime = 0;

// Normalize raw Supabase rows (snake_case) to also expose camelCase keys,
// so all surat forms can read `birthPlace`/`birthDate`/`noKk`/etc. safely.
function normalizeResidentRow(r: any) {
  if (!r) return r;
  return {
    ...r,
    birthPlace: r.birthPlace || r.birth_place || '',
    birthDate: r.birthDate || r.birth_date || '',
    bloodType: r.bloodType || r.blood_type || '',
    noKk: r.noKk || r.no_kk || '',
    fatherName: r.fatherName || r.father_name || '',
    motherName: r.motherName || r.mother_name || '',
    rtRw: r.rtRw || r.rt_rw || '',
    domicileStatus: r.domicileStatus || r.domicile_status || '',
    maritalStatus: r.maritalStatus || r.marital_status || '',
    statusColor: r.statusColor || r.status_color || '',
    genderColor: r.genderColor || r.gender_color || '',
    activeAids: r.activeAids || r.active_aids || [],
    isDeleted: r.isDeleted || r.is_deleted || 0
  };
}

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
        allData = [...allData, ...data.map(normalizeResidentRow)];
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
