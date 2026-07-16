import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { resolveCurrentTenant } from '../utils/tenantResolver';

export function SupabaseSync() {
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Resolve Tenant ID First
    const initTenant = async () => {
      const resolvedId = await resolveCurrentTenant();
      if (isMounted) {
        setTenantId(resolvedId);
      }
    };
    initTenant();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!tenantId) return;

    let isMounted = true;

    // 2. Initial Fetch (Sync from Cloud to Local, Scoped to Tenant)
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('saas_settings')
          .select('*')
          .eq('tenant_id', tenantId);

        if (error) {
          console.error('Error fetching Supabase settings:', error);
          return;
        }

        if (data && data.length > 0 && isMounted) {
          let changed = false;
          data.forEach((row) => {
            if (localStorage.getItem(row.key) !== row.value) {
              localStorage.setItem(row.key, row.value);
              changed = true;
            }
          });

          if (changed) {
            // Trigger all known re-render events in the app
            window.dispatchEvent(new Event('village_settings_updated'));
            window.dispatchEvent(new Event('app_theme_updated'));
            window.dispatchEvent(new Event('settingsUpdated'));
            window.dispatchEvent(new Event('brandingUpdated'));
          }
        }
      } catch (e) {
        console.error('Failed to sync settings:', e);
      }
    };

    fetchSettings();

    // 3. Realtime Subscription (Scoped to Tenant)
    const channel = supabase
      .channel(`schema-db-changes-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saas_settings',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          const newRow = payload.new as { key: string; value: string };
          if (newRow && newRow.key) {
            const currentVal = localStorage.getItem(newRow.key);
            if (currentVal !== newRow.value) {
              localStorage.setItem(newRow.key, newRow.value);
              // Trigger UI re-render on the fly
              window.dispatchEvent(new Event('village_settings_updated'));
              window.dispatchEvent(new Event('app_theme_updated'));
              window.dispatchEvent(new Event('settingsUpdated'));
              window.dispatchEvent(new Event('brandingUpdated'));
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  return null;
}
