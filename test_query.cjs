const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://rmrctorxzprrmshorcut.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmN0b3J4enBycm1zaG9yY3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NzMwMjQsImV4cCI6MjA5OTA0OTAyNH0.Fefjmf2I6BAC-Fqwy9P8BleB25ryGy3ydV6pucxtBYA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const email = "admin@sukamakmur";
  
  console.log("Testing with email:", email);
  const { data: tenantMatches, error } = await supabase
    .from('tenants')
    .select('*')
    //.eq('id', '11111111-1111-1111-1111-111111111111') // Sukamakmur ID
    .or(`admin_email.eq."${email}",kades_email.eq."${email}"`);
    
  console.log("Error:", error);
  console.log("Matches:", tenantMatches?.map(t => ({ email: t.admin_email, id: t.id })));
}
check();
