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
  
  const req = fetch('/api/residents').then(res => {
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
