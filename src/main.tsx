import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Client-side API Mock for Serverless environments (like Vercel)
if (
  window.location.hostname.includes('vercel') || 
  window.location.hostname.includes('netlify') || 
  window.location.hostname.includes('github') || 
  !window.location.port
) {
  const originalFetch = window.fetch;
  
  const DEFAULT_RESIDENTS = [
    { nik: "3201020405060001", initials: "AB", name: "Ahmad Bukhori", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 02", rt: "01", rw: "02", status: "Kawin", statusColor: "emerald", age: 40, birthPlace: "Bandung", birthDate: "1986-05-12", bloodType: "O", religion: "Islam", job: "Wiraswasta", address: "Jl. Cempaka No. 42", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "Sarjana (S1)", photo: null, noKk: "320412008890001", fatherName: "Budi Santoso", motherName: "Ratna Sari", activeAids: ["BLT Dana Desa", "Bantuan Pangan Non-Tunai"] },
    { nik: "3201020405060002", initials: "SN", name: "Siti Nurhaliza", gender: "Perempuan", genderColor: "pink", rtRw: "03 / 01", rt: "03", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 24, birthPlace: "Bandung", birthDate: "2002-11-20", bloodType: "AB", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Melati No. 10", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "Sarjana (S1)", photo: null, noKk: "320412008890002", fatherName: "Ahmad Bukhori", motherName: "Siti Aminah", activeAids: ["Program Keluarga Harapan (PKH)"] },
    { nik: "3201020405060003", initials: "DS", name: "Deddy Setiawan", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 01", rt: "01", rw: "01", status: "Kawin", statusColor: "emerald", age: 35, birthPlace: "Jakarta", birthDate: "1991-08-15", bloodType: "B", religion: "Islam", job: "Karyawan Swasta", address: "Jl. Mawar No. 5", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "Sarjana (S1)", photo: null, noKk: "320412008890003", fatherName: "Suradi", motherName: "Sumiati", activeAids: [] },
    { nik: "3201020405060004", initials: "RW", name: "Rina Wulandari", gender: "Perempuan", genderColor: "pink", rtRw: "02 / 02", rt: "02", rw: "02", status: "Kawin", statusColor: "emerald", age: 32, birthPlace: "Bandung", birthDate: "1994-03-24", bloodType: "A", religion: "Islam", job: "Mengurus Rumah Tangga", address: "Jl. Anggrek No. 15", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Istri", education: "SMA / Sederajat", photo: null, noKk: "320412008890004", fatherName: "Suparman", motherName: "Warsih", activeAids: ["Bantuan Pangan Non-Tunai"] },
    { nik: "3201020405060005", initials: "HS", name: "Hendra Saputra", gender: "Laki-laki", genderColor: "blue", rtRw: "05 / 03", rt: "05", rw: "03", status: "Cerai Mati", statusColor: "gray", age: 60, birthPlace: "Bogor", birthDate: "1966-02-10", bloodType: "O", religion: "Islam", job: "Pensiunan", address: "Jl. Kamboja No. 3", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "Sarjana (S1)", photo: null, noKk: "320412008890005", fatherName: "Taufik Hidayat", motherName: "Siti Rahma", activeAids: ["BLT Dana Desa"] },
    { nik: "6306021212990001", initials: "NAR", name: "Nizar Aulia Rahman", gender: "Laki-laki", genderColor: "blue", rtRw: "02 / 01", rt: "02", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 27, birthPlace: "Kandangan", birthDate: "1999-12-12", bloodType: "B", religion: "Islam", job: "Wiraswasta", address: "Jl. Keramat RT.002 RW.001", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "Diploma III (D3)", photo: null, noKk: "6306021111990002", fatherName: "Fazakkir Rahmad", motherName: "Siti Aminah", activeAids: [] },
    { nik: "6306022005020002", initials: "DL", name: "Dewi Lestari", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 24, birthPlace: "Simpur", birthDate: "2002-05-20", bloodType: "A", religion: "Islam", job: "Guru", address: "Jl. Anggrek No. 12 RT.001 RW.001", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "Sarjana (S1)", photo: null, noKk: "6306021111990010", fatherName: "Ahmad Bukhori", motherName: "Rina Wulandari", activeAids: [] },
    { nik: "6306021508930003", initials: "MY", name: "Muhammad Yusuf", gender: "Laki-laki", genderColor: "blue", rtRw: "03 / 01", rt: "03", rw: "01", status: "Cerai Hidup", statusColor: "gray", age: 33, birthPlace: "Wasah Hilir", birthDate: "1993-08-15", bloodType: "O", religion: "Islam", job: "Petani", address: "Jl. Mawar RT.003 RW.001", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "SMA / Sederajat", photo: null, noKk: "6306021111990022", fatherName: "Supian", motherName: "Siti Rahmah", activeAids: ["Bantuan Pangan Non-Tunai"] },
    { nik: "6306022802010004", initials: "FW", name: "Fatima Wardah", gender: "Perempuan", genderColor: "pink", rtRw: "02 / 01", rt: "02", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 25, birthPlace: "Wasah Hilir", birthDate: "2001-02-28", bloodType: "O", religion: "Islam", job: "Karyawan Swasta", address: "Jl. Keramat No. 24 RT.002 RW.001", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMA / Sederajat", photo: null, noKk: "6306021111990033", fatherName: "Rahmadi", motherName: "Sri Wahyuni", activeAids: [] }
  ];

  const getLocalResidents = () => {
    const data = localStorage.getItem('local_residents');
    if (!data) {
      localStorage.setItem('local_residents', JSON.stringify(DEFAULT_RESIDENTS));
      return DEFAULT_RESIDENTS;
    }
    return JSON.parse(data);
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
    <App />
  </StrictMode>,
);
