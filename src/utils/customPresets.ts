import { supabase } from './supabase';
import { getActiveTenantIdSync, resolveCurrentTenant } from './tenantResolver';

export interface CustomPresetRecipient {
  id: string;
  name: string;
  jabatan?: string;
  alamat?: string;
}

export interface CustomRecipientPreset {
  id: string;
  tenant_id: string;
  name: string;
  recipients: CustomPresetRecipient[];
  created_at?: string;
}

async function getTenantId(): Promise<string | null> {
  const syncId = getActiveTenantIdSync();
  if (syncId) return syncId;
  try {
    return await resolveCurrentTenant();
  } catch {
    return null;
  }
}

export async function saveCustomPreset(
  name: string,
  recipients: CustomPresetRecipient[]
): Promise<CustomRecipientPreset | null> {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await supabase
    .from('custom_recipient_presets')
    .insert([{ id, tenant_id: tenantId, name, recipients }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCustomPresets(): Promise<CustomRecipientPreset[]> {
  const tenantId = await getTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('custom_recipient_presets')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteCustomPreset(id: string): Promise<void> {
  const { error } = await supabase
    .from('custom_recipient_presets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}