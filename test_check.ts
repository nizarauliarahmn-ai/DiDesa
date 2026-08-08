import { checkResidentExists } from './src/utils/residentSync';
import { supabase } from './src/utils/supabase';

async function test() {
  const exists = await checkResidentExists('3204121508850003', 'Budi Santoso');
  console.log('checkResidentExists returned:', exists);
  
  // Also dump exactly what supabase returns for that NIK
  const { data } = await supabase.from('residents').select('*').eq('nik', '3204121508850003');
  console.log('Supabase Data for NIK:', data);
}

test();
