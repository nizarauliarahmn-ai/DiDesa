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
  
  const authUserStr = localStorage.getItem('didesa_auth_user');
  let url = '/api/residents';
  if (authUserStr) {
    try {
      const authUser = JSON.parse(authUserStr);
      if (authUser && authUser.tenantId) {
        url = `/api/residents?tenant_id=${authUser.tenantId}`;
      }
    } catch(e) {}
  }
  
  const req = fetch(url).then(res => {
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  });
  
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
