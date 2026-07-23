const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://rmrctorxzprrmshorcut.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmN0b3J4enBycm1zaG9yY3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NzMwMjQsImV4cCI6MjA5OTA0OTAyNH0.Fefjmf2I6BAC-Fqwy9P8BleB25ryGy3ydV6pucxtBYA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function update() {
  const { data, error } = await supabase.from('tenants').update({ admin_password: 'wasah123', kades_password: 'kadeswasah123' }).eq('domain', 'wasahhilir');
  console.log("Update Wasah Hilir:", data, error);
}
update();
