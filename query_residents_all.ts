import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://rmrctorxzprrmshorcut.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmN0b3J4enBycm1zaG9yY3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NzMwMjQsImV4cCI6MjA5OTA0OTAyNH0.Fefjmf2I6BAC-Fqwy9P8BleB25ryGy3ydV6pucxtBYA');

async function run() {
  console.log('Querying residents schema...');
  const { data: residents, error } = await supabase.from('residents').select('*').limit(1);
  if (error) console.error(error);
  else console.log(residents);
}

run();
