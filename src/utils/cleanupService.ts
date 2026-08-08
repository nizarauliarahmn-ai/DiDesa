import { supabase } from './supabase';

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RETENTION_DAYS = 30;

export const performLazyCleanup = async () => {
  try {
    const lastCleanupStr = localStorage.getItem('last_resident_cleanup');
    const now = Date.now();

    if (lastCleanupStr) {
      const lastCleanup = parseInt(lastCleanupStr, 10);
      if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
        // Skip cleanup if it was done within the last 24 hours
        return;
      }
    }

    // Calculate the threshold date: 30 days ago
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - RETENTION_DAYS);
    const thresholdIso = thresholdDate.toISOString();

    // Perform the permanent deletion
    const { error } = await supabase
      .from('residents')
      .delete()
      .lt('deleted_at', thresholdIso);

    if (error) {
      console.error('Error during background resident cleanup:', error);
      return;
    }

    // Update the last cleanup time
    localStorage.setItem('last_resident_cleanup', now.toString());
    console.log('Background resident cleanup performed successfully.');

  } catch (error) {
    console.error('Failed to perform lazy cleanup:', error);
  }
};

// Also export a forced cleanup function for immediate execution in the Archive page
export const forcePerformCleanup = async () => {
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - RETENTION_DAYS);
    const thresholdIso = thresholdDate.toISOString();

    await supabase
      .from('residents')
      .delete()
      .lt('deleted_at', thresholdIso);
      
    localStorage.setItem('last_resident_cleanup', Date.now().toString());
  } catch (error) {
    console.error('Failed to perform forced cleanup:', error);
  }
};
