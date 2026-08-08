global.window = { location: { hostname: 'localhost' } } as any;

import { supabase } from './src/utils/supabase';
import { resolveCurrentTenant } from './src/utils/tenantResolver';

async function test() {
  const tenantId = await resolveCurrentTenant();
  console.log('Tenant:', tenantId);
  
  const { data, error } = await supabase
    .from('residents')
    .select('nik, is_deleted, status')
    .eq('tenant_id', tenantId)
    .eq('nik', '9999999999999999')
    .limit(10);
    
  console.log('Error:', error);
  console.log('Data:', data);
}

test();
