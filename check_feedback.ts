import { supabase } from './src/utils/supabase.ts'; 
async function getCol() { 
  const { data, error } = await supabase.from('feedback').select('*').limit(1); 
  console.log('Data:', data, 'Error:', error); 
} 
getCol();
