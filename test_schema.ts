import { supabase } from './src/utils/supabase';

async function test() {
  const { data, error } = await supabase.from('residents').select('*').limit(1);
  console.log('Error:', error);
  console.log('Keys:', data && data.length > 0 ? Object.keys(data[0]) : 'no data');
}

test();
