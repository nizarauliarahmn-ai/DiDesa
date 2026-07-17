import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://rmrctorxzprrmshorcut.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmN0b3J4enBycm1zaG9yY3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NzMwMjQsImV4cCI6MjA5OTA0OTAyNH0.Fefjmf2I6BAC-Fqwy9P8BleB25ryGy3ydV6pucxtBYA');

async function run() {
  console.log('Seeding Supabase...');
  
  // Seed tenants
  const { data: tenant, error: tenantErr } = await supabase.from('tenants').insert([
    {
      nama_desa: 'Desa Sukamakmur',
      kode_desa: '32.01.01.2001',
      domain: 'sukamakmur',
      kades_email: 'kades@sukamakmur.desa.id',
      kades_password: 'password123',
      admin_email: 'admin@sukamakmur.desa.id',
      admin_password: 'password123'
    },
    {
      nama_desa: 'Desa Mekar Jaya',
      kode_desa: '32.01.01.2002',
      domain: 'mekarjaya',
      kades_email: 'kades@mekarjaya.desa.id',
      kades_password: 'password123',
      admin_email: 'admin@mekarjaya.desa.id',
      admin_password: 'password123'
    },
    {
      nama_desa: 'Desa Suka Damai',
      kode_desa: '32.01.01.2003',
      domain: 'sukadamai',
      kades_email: 'kades@sukadamai.desa.id',
      kades_password: 'password123',
      admin_email: 'admin@sukadamai.desa.id',
      admin_password: 'password123'
    }
  ]).select();

  if (tenantErr) {
    console.error('Error inserting tenants:', tenantErr);
  } else {
    console.log('Successfully inserted tenants:', tenant);
  }
}

run();
