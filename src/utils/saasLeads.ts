import { supabase } from './supabase';

export interface SaaSTenantRequest {
  id: string;
  subdomain: string;
  villageName: string;
  applicantName: string;
  phone: string;
  jobTitle: string;
  timestamp: string;
  status: 'Menunggu' | 'Dihubungi' | 'Diterima' | 'Ditolak';
}

export const fetchSaaSTenantRequests = async (): Promise<SaaSTenantRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('saas_settings')
      .select('value')
      .eq('key', 'saas_tenant_requests')
      .limit(1)
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error fetching SaaS tenant requests:', e);
  }
  return [];
};

export const addSaaSTenantRequest = async (request: Omit<SaaSTenantRequest, 'id' | 'timestamp' | 'status'>) => {
  try {
    const now = new Date();
    const newRequest: SaaSTenantRequest = {
      ...request,
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: now.toISOString(),
      status: 'Menunggu',
    };

    const currentRequests = await fetchSaaSTenantRequests();
    const updatedRequests = [newRequest, ...currentRequests];
    const jsonStr = JSON.stringify(updatedRequests);

    // We must use master tenant ID or a fixed ID for global SaaS settings
    const masterTenantId = '11111111-1111-1111-1111-111111111111';

    const { data: existing } = await supabase
      .from('saas_settings')
      .select('key')
      .eq('key', 'saas_tenant_requests')
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('saas_settings')
        .update({ value: jsonStr })
        .eq('key', 'saas_tenant_requests');
    } else {
      await supabase
        .from('saas_settings')
        .insert({ tenant_id: masterTenantId, key: 'saas_tenant_requests', value: jsonStr });
    }
    
    // Broadcast real-time update
    const broadcastChannel = supabase.channel('public:saas_leads_broadcast');
    broadcastChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        broadcastChannel.send({
          type: 'broadcast',
          event: 'new_tenant_request',
          payload: { requests: updatedRequests }
        }).then(() => supabase.removeChannel(broadcastChannel));
      }
    });
  } catch (e) {
    console.error('Error adding SaaS tenant request:', e);
  }
};

export const updateSaaSTenantRequestStatus = async (id: string, newStatus: SaaSTenantRequest['status']) => {
  try {
    const currentRequests = await fetchSaaSTenantRequests();
    const updatedRequests = currentRequests.map(req => 
      req.id === id ? { ...req, status: newStatus } : req
    );
    const jsonStr = JSON.stringify(updatedRequests);

    await supabase
      .from('saas_settings')
      .update({ value: jsonStr })
      .eq('key', 'saas_tenant_requests');
      
    // Broadcast real-time update
    const broadcastChannel = supabase.channel('public:saas_leads_broadcast');
    broadcastChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        broadcastChannel.send({
          type: 'broadcast',
          event: 'new_tenant_request',
          payload: { requests: updatedRequests }
        }).then(() => supabase.removeChannel(broadcastChannel));
      }
    });
  } catch (e) {
    console.error('Error updating SaaS tenant request status:', e);
  }
};
