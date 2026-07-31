import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  // Let's get a real resident from their database to be absolutely sure.
  const { data, error } = await supabase.from('residents').select('nik, name, tenant_id').limit(1);
  console.log("DB Resident:", data);
  console.log("Error:", error);
}
test();
