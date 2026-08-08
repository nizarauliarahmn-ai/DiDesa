global.window = { location: { hostname: 'localhost' }, localStorage: { getItem: () => null } } as any;

import { supabase } from './src/utils/supabase';
import { resolveCurrentTenant } from './src/utils/tenantResolver';

async function test() {
  const { data: tenant } = await supabase.from('tenants').select('id').limit(1);
  const tenantId = tenant?.[0]?.id || 'd3a82f8a-92b0-4f32-840e-5a022416f316';
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
