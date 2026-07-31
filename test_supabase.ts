import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log("Querying NIK: 6306062505820001");
  const { data, error } = await supabase
    .from('residents')
    .select('nik, name, tenant_id')
    .eq('nik', '6306062505820001');
    
  console.log("Result:", data);
  console.log("Error:", error);
}
test();
