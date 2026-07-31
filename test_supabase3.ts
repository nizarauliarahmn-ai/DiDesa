import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const query = 'saleh';
  
  let req = supabase
    .from('residents')
    .select('nik, name, address, rt, rw')
    .eq('tenant_id', tenantId);

  if (/^\d{16}$/.test(query.trim())) {
    req = req.eq('nik', query.trim());
  } else {
    req = req.ilike('name', '%' + query.trim() + '%').limit(1);
  }

  const { data, error } = await req;
  console.log("Data:", data);
  console.log("Error:", error);
}
test();
