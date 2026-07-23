const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rmrctorxzprrmshorcut.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmN0b3J4enBycm1zaG9yY3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NzMwMjQsImV4cCI6MjA5OTA0OTAyNH0.Fefjmf2I6BAC-Fqwy9P8BleB25ryGy3ydV6pucxtBYA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('residents').select('*').limit(10000);
  console.log("Error:", error);
  console.log("Total records returned with limit 10000:", data?.length);
}
check();
