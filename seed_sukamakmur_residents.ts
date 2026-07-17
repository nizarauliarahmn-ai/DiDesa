import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://rmrctorxzprrmshorcut.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmN0b3J4enBycm1zaG9yY3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NzMwMjQsImV4cCI6MjA5OTA0OTAyNH0.Fefjmf2I6BAC-Fqwy9P8BleB25ryGy3ydV6pucxtBYA');

const tenant_id = '22222222-2222-2222-2222-222222222222'; // Sukamakmur

// First name lists
const firstNamesM = ['Budi', 'Ahmad', 'Eko', 'Rudi', 'Andi', 'Hendra', 'Agus', 'Dwi', 'Joko', 'Yudi', 'Bagus', 'Rizky', 'Rahmat', 'Dedi'];
const firstNamesF = ['Siti', 'Ayu', 'Sri', 'Putri', 'Dewi', 'Nur', 'Dian', 'Fitri', 'Nina', 'Rina', 'Wati', 'Tari', 'Ratna', 'Lestari'];
const lastNames = ['Santoso', 'Wijaya', 'Kusuma', 'Pratama', 'Hidayat', 'Setiawan', 'Nugroho', 'Saputra', 'Siregar', 'Lestari', 'Putra'];

const statuses = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'];
const educations = ['SD / Sederajat', 'SMP / Sederajat', 'SMA / Sederajat', 'D3', 'S1', 'S2', 'Tidak Sekolah'];
const jobs = ['Petani / Pekebun', 'Wiraswasta', 'PNS', 'Karyawan Swasta', 'Buruh Harian Lepas', 'Pelajar / Mahasiswa', 'Mengurus Rumah Tangga', 'Belum / Tidak Bekerja'];

const residentsToInsert = [];

function randomArr(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

for (let i = 1; i <= 50; i++) {
  const isMale = Math.random() > 0.5;
  const gender = isMale ? 'Laki-laki' : 'Perempuan';
  const name = isMale ? randomArr(firstNamesM) + ' ' + randomArr(lastNames) : randomArr(firstNamesF) + ' ' + randomArr(lastNames);
  
  // NIK requires 16 digits
  const nik = '320101' + String(randomInt(10, 31)) + '05' + String(randomInt(50, 99)) + '000' + String(randomInt(1, 9));
  const no_kk = '32010101010100' + String(randomInt(10, 99));

  const age = randomInt(1, 80);
  const birthYear = 2026 - age;
  const birth_date = `${birthYear}-05-${String(randomInt(1, 28)).padStart(2, '0')}`;

  let status = randomArr(statuses);
  if (age < 18) status = 'Belum Kawin';

  let job = randomArr(jobs);
  if (age < 6) job = 'Belum / Tidak Bekerja';
  else if (age >= 6 && age <= 18) job = 'Pelajar / Mahasiswa';

  residentsToInsert.push({
    nik,
    no_kk,
    name: name.toUpperCase(),
    initials: name.charAt(0),
    gender,
    gender_color: isMale ? 'blue' : 'pink',
    rt_rw: `0${randomInt(1, 5)} / 0${randomInt(1, 3)}`,
    rt: `0${randomInt(1, 5)}`,
    rw: `0${randomInt(1, 3)}`,
    status,
    status_color: status === 'Belum Kawin' ? 'gray' : status === 'Kawin' ? 'green' : 'yellow',
    age,
    birth_place: 'BOGOR',
    birth_date,
    blood_type: randomArr(['A', 'B', 'AB', 'O', 'Tidak Tahu']),
    religion: randomArr(['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha']),
    job,
    address: 'KP. SUKAMAKMUR',
    desa: 'Sukamakmur',
    domicile_status: 'Sesuai KTP',
    family_relation: isMale && status === 'Kawin' ? 'Kepala Keluarga' : (age < 18 ? 'Anak' : 'Anggota Keluarga'),
    education: randomArr(educations),
    tenant_id
  });
}

async function run() {
  console.log('Inserting 50 dummy residents for Sukamakmur...');
  const { data, error } = await supabase.from('residents').insert(residentsToInsert);
  if (error) console.error(error);
  else console.log('Successfully inserted dummy data!');
}

run();
