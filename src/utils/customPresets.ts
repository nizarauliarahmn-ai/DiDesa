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
  created_by?: string;
  name: string;
  recipients: CustomPresetRecipient[];
  created_at?: string;
}

// Identitas admin yang login (email unik per akun). Preset bersifat PRIVAT
// per admin — tidak terlihat admin lain walau di desa yang sama.
function getCurrentAdminEmail(): string {
  try {
    const raw = localStorage.getItem('didesa_auth_user');
    if (raw) {
      const user = JSON.parse(raw);
      return String(user.email || '').trim().toLowerCase();
    }
  } catch {}
  return '';
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
    .insert([{
      id,
      tenant_id: tenantId,
      created_by: getCurrentAdminEmail(),
      name,
      recipients
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCustomPresets(): Promise<CustomRecipientPreset[]> {
  const tenantId = await getTenantId();
  if (!tenantId) return [];

  const adminEmail = getCurrentAdminEmail();

  // Filter ketat: hanya preset milik tenant INI dan admin INI.
  let query = supabase
    .from('custom_recipient_presets')
    .select('*')
    .eq('tenant_id', tenantId);

  if (adminEmail) {
    query = query.eq('created_by', adminEmail);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteCustomPreset(id: string): Promise<void> {
  const tenantId = await getTenantId();
  const adminEmail = getCurrentAdminEmail();
  const { error } = await supabase
    .from('custom_recipient_presets')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('created_by', adminEmail);

  if (error) throw error;
}