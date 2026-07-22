import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { SupabaseSync } from './components/SupabaseSync';
import './index.css';

// Unregister any rogue Service Workers from previous PWA setups to prevent aggressive caching
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('Unregistered rogue service worker:', registration);
    }
  });
}


// Client-side API Mock for Serverless environments (like Vercel)
if (
  window.location.hostname.includes('vercel') || 
  window.location.hostname.includes('netlify') || 
  window.location.hostname.includes('github') || 
  !window.location.port
) {
  const originalFetch = window.fetch;
  
  const DEFAULT_RESIDENTS: any[] = [];

  const getLocalResidents = () => {
    const data = localStorage.getItem('local_residents');
    if (!data) {
      localStorage.setItem('local_residents', JSON.stringify(DEFAULT_RESIDENTS));
      return DEFAULT_RESIDENTS;
    }
    try {
      const list = JSON.parse(data);
      let updated = false;
      DEFAULT_RESIDENTS.forEach(res => {
        if (!list.some((r: any) => r.nik === res.nik)) {
          list.push(res);
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem('local_residents', JSON.stringify(list));
      }
      return list;
    } catch (e) {
      localStorage.setItem('local_residents', JSON.stringify(DEFAULT_RESIDENTS));
      return DEFAULT_RESIDENTS;
    }
  };

  const saveLocalResidents = (list: any[]) => {
    localStorage.setItem('local_residents', JSON.stringify(list));
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // GET residents
    if (url.includes('/api/residents') && (!init || init.method === 'GET')) {
      const list = getLocalResidents();
      return new Response(JSON.stringify(list), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    // POST batch inserts
    if (url.includes('/api/residents/batch') && init && init.method === 'POST') {
      const body = JSON.parse(init.body as string);
      const list = getLocalResidents();
      body.forEach((newRes: any) => {
        if (!list.some((r: any) => r.nik === newRes.nik)) {
          list.push(newRes);
        }
      });
      saveLocalResidents(list);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // POST approve/reject/request-approval
    if (url.includes('/api/residents/') && init && init.method === 'POST') {
      const match = url.match(/\/api\/residents\/([^\/]+)\/(approve|reject|request-approval)/);
      if (match) {
        const nik = match[1];
        const action = match[2];
        const list = getLocalResidents();
        const resIndex = list.findIndex((r: any) => r.nik === nik);
        if (resIndex !== -1) {
          if (action === 'approve') {
            list[resIndex].status = 'Aktif';
          } else if (action === 'reject') {
            list[resIndex].status = 'Ditolak';
          } else if (action === 'request-approval') {
            list[resIndex].status = 'pending_approval';
          }
          saveLocalResidents(list);
          return new Response(JSON.stringify(list[resIndex]), { status: 200 });
        }
      }
    }
    
    // PUT update resident
    if (url.includes('/api/residents/') && init && init.method === 'PUT') {
      const match = url.match(/\/api\/residents\/([^\/]+)/);
      if (match) {
        const nik = match[1];
        const body = JSON.parse(init.body as string);
        const list = getLocalResidents();
        const resIndex = list.findIndex((r: any) => r.nik === nik);
        if (resIndex !== -1) {
          list[resIndex] = { ...list[resIndex], ...body };
          saveLocalResidents(list);
          return new Response(JSON.stringify(list[resIndex]), { status: 200 });
        }
      }
    }

    // POST insert resident
    if (url.includes('/api/residents') && init && init.method === 'POST') {
      const body = JSON.parse(init.body as string);
      const list = getLocalResidents();
      if (!list.some((r: any) => r.nik === body.nik)) {
        list.push(body);
      }
      saveLocalResidents(list);
      return new Response(JSON.stringify(body), { status: 200 });
    }
    
    // DELETE resident
    if (url.includes('/api/residents/') && init && init.method === 'DELETE') {
      const match = url.match(/\/api\/residents\/([^\/]+)/);
      if (match) {
        const nik = match[1];
        let list = getLocalResidents();
        list = list.filter((r: any) => r.nik !== nik);
        saveLocalResidents(list);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
    }
    
    // GET supabase status
    if (url.includes('/api/supabase-status')) {
      return new Response(JSON.stringify({ configured: false }), { status: 200 });
    }
    
    // GET db status
    if (url.includes('/api/db-status')) {
      return new Response(JSON.stringify({ engine: 'local_memory' }), { status: 200 });
    }
    
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SupabaseSync />
    <App />
  </StrictMode>,
);
window.addEventListener('error', e => alert('ERROR: ' + e.message + ' at ' + e.filename + ':' + e.lineno)); window.addEventListener('unhandledrejection', e => alert('PROMISE ERROR: ' + e.reason));
