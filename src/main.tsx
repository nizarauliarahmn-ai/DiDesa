import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { SupabaseSync } from './components/SupabaseSync';
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
    // --- KELUARGA 1: 11 ANGGOTA (noKk: "1111111111111111") ---
    { nik: "1111111111110001", initials: "SH", name: "Suherman", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 01", rt: "01", rw: "01", status: "Kawin", statusColor: "emerald", age: 55, birthPlace: "Kandangan", birthDate: "1971-04-10", bloodType: "A", religion: "Islam", job: "Wiraswasta", address: "Jl. Merdeka No. 11", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "Sarjana (S1)", photo: null, noKk: "1111111111111111", fatherName: "Kadir", motherName: "Siti", activeAids: ["BLT Dana Desa", "Bantuan Pangan Non-Tunai"] },
    { nik: "1111111111110002", initials: "SM", name: "Sumiati", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Kawin", statusColor: "emerald", age: 50, birthPlace: "Simpur", birthDate: "1976-08-15", bloodType: "B", religion: "Islam", job: "Mengurus Rumah Tangga", address: "Jl. Merdeka No. 11", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Istri", education: "SMA / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Hamid", motherName: "Mariam", activeAids: [] },
    { nik: "1111111111110003", initials: "BS", name: "Budi Suherman", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 01", rt: "01", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 28, birthPlace: "Sukamakmur", birthDate: "1998-02-12", bloodType: "O", religion: "Islam", job: "Wiraswasta", address: "Jl. Merdeka No. 11", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "Sarjana (S1)", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
    { nik: "1111111111110004", initials: "AS", name: "Ani Suherman", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 26, birthPlace: "Sukamakmur", birthDate: "2000-05-20", bloodType: "A", religion: "Islam", job: "Guru", address: "Jl. Merdeka No. 11", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "Sarjana (S1)", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
    { nik: "1111111111110005", initials: "CS", name: "Cici Suherman", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 24, birthPlace: "Sukamakmur", birthDate: "2002-11-25", bloodType: "AB", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Merdeka No. 11", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "Sarjana (S1)", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
    { nik: "1111111111110006", initials: "DS", name: "Dedi Suherman", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 01", rt: "01", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 22, birthPlace: "Sukamakmur", birthDate: "2004-09-30", bloodType: "B", religion: "Islam", job: "Belum / Tidak Bekerja", address: "Jl. Merdeka No. 11", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMA / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
    { nik: "1111111111110007", initials: "ES", name: "Efi Suherman", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 20, birthPlace: "Sukamakmur", birthDate: "2006-03-14", bloodType: "O", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Merdeka No. 11", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMA / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
    { nik: "1111111111110008", initials: "FS", name: "Fani Suherman", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 18, birthPlace: "Sukamakmur", birthDate: "2008-07-22", bloodType: "A", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Merdeka No. 11", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMA / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
    { nik: "1111111111110009", initials: "GS", name: "Gani Suherman", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 01", rt: "01", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 16, birthPlace: "Sukamakmur", birthDate: "2010-12-05", bloodType: "B", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Merdeka No. 11", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMP / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
    { nik: "1111111111110010", initials: "HS", name: "Hani Suherman", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 14, birthPlace: "Sukamakmur", birthDate: "2012-06-18", bloodType: "O", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Merdeka No. 11", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMP / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
    { nik: "1111111111110011", initials: "IS", name: "Ipan Suherman", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 01", rt: "01", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 12, birthPlace: "Sukamakmur", birthDate: "2014-10-09", bloodType: "AB", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Merdeka No. 11", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SD / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },

    // --- KELUARGA 2: 4 ANGGOTA (noKk: "2222222222222222") ---
    { nik: "2222222222220001", initials: "BW", name: "Bambang Wijaya", gender: "Laki-laki", genderColor: "blue", rtRw: "02 / 01", rt: "02", rw: "01", status: "Kawin", statusColor: "emerald", age: 42, birthPlace: "Surabaya", birthDate: "1984-03-24", bloodType: "B", religion: "Islam", job: "Karyawan Swasta", address: "Jl. Mawar No. 24", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "Sarjana (S1)", photo: null, noKk: "2222222222222222", fatherName: "Subianto", motherName: "Hartini", activeAids: [] },
    { nik: "2222222222220002", initials: "RK", name: "Ratih Kumala", gender: "Perempuan", genderColor: "pink", rtRw: "02 / 01", rt: "02", rw: "01", status: "Kawin", statusColor: "emerald", age: 38, birthPlace: "Kandangan", birthDate: "1988-07-15", bloodType: "O", religion: "Islam", job: "Tenaga Kesehatan (Bidan)", address: "Jl. Mawar No. 24", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Istri", education: "Sarjana (S1)", photo: null, noKk: "2222222222222222", fatherName: "Wahyudi", motherName: "Endang", activeAids: [] },
    { nik: "2222222222220003", initials: "DW", name: "Dafa Wijaya", gender: "Laki-laki", genderColor: "blue", rtRw: "02 / 01", rt: "02", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 15, birthPlace: "Sukamakmur", birthDate: "2011-09-05", bloodType: "B", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Mawar No. 24", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMP / Sederajat", photo: null, noKk: "2222222222222222", fatherName: "Bambang Wijaya", motherName: "Ratih Kumala", activeAids: [] },
    { nik: "2222222222220004", initials: "KW", name: "Keysha Wijaya", gender: "Perempuan", genderColor: "pink", rtRw: "02 / 01", rt: "02", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 10, birthPlace: "Sukamakmur", birthDate: "2016-01-20", bloodType: "A", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Mawar No. 24", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SD / Sederajat", photo: null, noKk: "2222222222222222", fatherName: "Bambang Wijaya", motherName: "Ratih Kumala", activeAids: ["Program Keluarga Harapan (PKH)"] },

    // --- KELUARGA 3: 7 ANGGOTA (noKk: "3333333333333333") ---
    { nik: "3333333333330001", initials: "KT", name: "Kartono", gender: "Laki-laki", genderColor: "blue", rtRw: "03 / 02", rt: "03", rw: "02", status: "Kawin", statusColor: "emerald", age: 48, birthPlace: "Sukamakmur", birthDate: "1978-11-12", bloodType: "O", religion: "Islam", job: "Petani", address: "Jl. Tani Indah RT.003 RW.002", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "SMA / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Sardji", motherName: "Ponirah", activeAids: ["Bantuan Pangan Non-Tunai"] },
    { nik: "3333333333330002", initials: "WS", name: "Warsiah", gender: "Perempuan", genderColor: "pink", rtRw: "03 / 02", rt: "03", rw: "02", status: "Kawin", statusColor: "emerald", age: 44, birthPlace: "Sukamakmur", birthDate: "1982-05-18", bloodType: "A", religion: "Islam", job: "Petani", address: "Jl. Tani Indah RT.003 RW.002", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Istri", education: "SMA / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Kromo", motherName: "Warni", activeAids: [] },
    { nik: "3333333333330003", initials: "DK", name: "Doni Kartono", gender: "Laki-laki", genderColor: "blue", rtRw: "03 / 02", rt: "03", rw: "02", status: "Belum Kawin", statusColor: "gray", age: 22, birthPlace: "Sukamakmur", birthDate: "2004-04-22", bloodType: "O", religion: "Islam", job: "Buruh Harian Lepas", address: "Jl. Tani Indah RT.003 RW.002", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMA / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Kartono", motherName: "Warsiah", activeAids: [] },
    { nik: "3333333333330004", initials: "DI", name: "Dina Kartono", gender: "Perempuan", genderColor: "pink", rtRw: "03 / 02", rt: "03", rw: "02", status: "Belum Kawin", statusColor: "gray", age: 19, birthPlace: "Sukamakmur", birthDate: "2007-06-25", bloodType: "B", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Tani Indah RT.003 RW.002", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMA / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Kartono", motherName: "Warsiah", activeAids: [] },
    { nik: "3333333333330005", initials: "DD", name: "Didi Kartono", gender: "Laki-laki", genderColor: "blue", rtRw: "03 / 02", rt: "03", rw: "02", status: "Belum Kawin", statusColor: "gray", age: 17, birthPlace: "Sukamakmur", birthDate: "2009-08-11", bloodType: "AB", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Tani Indah RT.003 RW.002", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMP / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Kartono", motherName: "Warsiah", activeAids: [] },
    { nik: "3333333333330006", initials: "DT", name: "Dita Kartono", gender: "Perempuan", genderColor: "pink", rtRw: "03 / 02", rt: "03", rw: "02", status: "Belum Kawin", statusColor: "gray", age: 15, birthPlace: "Sukamakmur", birthDate: "2011-10-09", bloodType: "A", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Tani Indah RT.003 RW.002", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMP / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Kartono", motherName: "Warsiah", activeAids: [] },
    { nik: "3333333333330007", initials: "DA", name: "Danu Kartono", gender: "Laki-laki", genderColor: "blue", rtRw: "03 / 02", rt: "03", rw: "02", status: "Belum Kawin", statusColor: "gray", age: 10, birthPlace: "Sukamakmur", birthDate: "2016-12-14", bloodType: "O", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Tani Indah RT.003 RW.002", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SD / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Kartono", motherName: "Warsiah", activeAids: [] },

    // --- WARGA TAMBAHAN ---
    { nik: "3201020405060001", initials: "AB", name: "Ahmad Bukhori", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 02", rt: "01", rw: "02", status: "Kawin", statusColor: "emerald", age: 40, birthPlace: "Bandung", birthDate: "1986-05-12", bloodType: "O", religion: "Islam", job: "Wiraswasta", address: "Jl. Cempaka No. 42", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "Sarjana (S1)", photo: null, noKk: "320412008890001", fatherName: "Budi Santoso", motherName: "Ratna Sari", activeAids: ["BLT Dana Desa", "Bantuan Pangan Non-Tunai"] },
    { nik: "3201020405060002", initials: "SN", name: "Siti Nurhaliza", gender: "Perempuan", genderColor: "pink", rtRw: "03 / 01", rt: "03", rw: "01", status: "Belum Kawin", statusColor: "gray", age: 24, birthPlace: "Bandung", birthDate: "2002-11-20", bloodType: "AB", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Melati No. 10", desa: "Sukamakmur", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "Sarjana (S1)", photo: null, noKk: "320412008890002", fatherName: "Ahmad Bukhori", motherName: "Siti Aminah", activeAids: ["Program Keluarga Harapan (PKH)"] }
  ];

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
