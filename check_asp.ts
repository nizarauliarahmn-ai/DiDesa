import { supabase } from './src/utils/supabase.ts'; 
async function getCol() { 
  const { data } = await supabase.from('aspirasi').select('*').limit(1); 
  console.log(data); 
} 
getCol();
