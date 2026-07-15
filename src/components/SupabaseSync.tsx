import { useEffect } from 'react';
import { supabase } from '../utils/supabase';

export function SupabaseSync() {
  useEffect(() => {
    let isMounted = true;

    // 1. Initial Fetch (Sync from Cloud to Local)
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from('saas_settings').select('*');
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

    // 2. Realtime Subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saas_settings',
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
  }, []);

  return null;
}
