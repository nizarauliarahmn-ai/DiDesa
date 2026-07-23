const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rmrctorxzprrmshorcut.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmN0b3J4enBycm1zaG9yY3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NzMwMjQsImV4cCI6MjA5OTA0OTAyNH0.Fefjmf2I6BAC-Fqwy9P8BleB25ryGy3ydV6pucxtBYA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('residents').select('name, no_kk, nik, family_relation').eq('no_kk', '320412008890001');
  console.log("Error:", error);
  console.log("Records for this KK:", data?.length);
  console.log(data);
}
check();
