import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { GlobalUpdatePopup } from './GlobalUpdatePopup';

interface GlobalUpdate {
  id: string;
  title: string;
  content: string;
  version: string;
  release_date: string;
  type: string;
  cta_route?: string;
  is_popup?: number;
}

interface Props {
  isBusy?: boolean;
  /** Scope guard: hanya aktif di Dashboard Admin / Super Admin Desa (mode admin & sudah login). */
  enabled?: boolean;
}

/** Baca daftar ID log pembaruan yang sudah dilihat pengguna dari localStorage. */
const readSeenIds = (): string[] => {
  try {
    const raw = localStorage.getItem('seen_changelog_ids');
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

/** Tandai log pembaruan sebagai sudah dilihat (dedup 1x per log). */
const markSeen = (id: string, version?: string) => {
  const seen = readSeenIds();
  if (!seen.includes(id)) {
    seen.push(id);
    localStorage.setItem('seen_changelog_ids', JSON.stringify(seen));
  }
  // Kunci lama (backward-compat) agar pengguna yang pernah menutup pop-up
  // versi sama tidak melihatnya lagi.
  if (version) {
    localStorage.setItem(`didesa_seen_announcement_${id}_${version}`, 'true');
  }
};

export const GlobalUpdateNotifier: React.FC<Props> = ({ isBusy = false, enabled = false }) => {
  const [latestUpdate, setLatestUpdate] = useState<GlobalUpdate | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pendingReload, setPendingReload] = useState(false);
  
  // Global Branding
  const [globalName, setGlobalName] = useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalColor, setGlobalColor] = useState(() => localStorage.getItem('global_app_color') || '#047857');

  useEffect(() => {
    const handleBrandingUpdate = () => {
      setGlobalName(localStorage.getItem('global_app_name') || 'DiDesa');
      setGlobalColor(localStorage.getItem('global_app_color') || '#047857');
    };
    
    const handleForceReload = () => {
      setPendingReload(true);
    };

    window.addEventListener('global_branding_updated', handleBrandingUpdate);
    window.addEventListener('force_reload_requested', handleForceReload);

    return () => {
      window.removeEventListener('global_branding_updated', handleBrandingUpdate);
      window.removeEventListener('force_reload_requested', handleForceReload);
    };
  }, []);

  // Pengumuman "Apa Yang Baru": hanya aktif di Dashboard Admin / Super Admin Desa.
  useEffect(() => {
    // Scope guard: modal pengumuman hanya dipicu di Dashboard Admin / Super Admin Desa.
    if (!enabled) return;

    let showTimer: ReturnType<typeof setTimeout> | undefined;

    const fetchUpdates = async () => {
      try {
        const { data, error } = await supabase
          .from('global_updates')
          .select('id, version, title, content, release_date, type, cta_route')
          .eq('is_active', 1)
          .order('release_date', { ascending: false })
          .limit(1);
        
        if (!error && data && data.length > 0) {
          const latest = data[0];
          // Tampil 1 kali per log: cek ID pada seen_changelog_ids (localStorage array).
          const alreadySeen = readSeenIds().includes(latest.id);
          
          if (!alreadySeen) {
            setLatestUpdate(latest);
            clearTimeout(showTimer);
            showTimer = setTimeout(() => setIsVisible(true), 1500);
          }
        }
      } catch (err) {
        console.error('Failed to fetch global updates from Supabase:', err);
      }
    };

    fetchUpdates();

    window.addEventListener('global_updates_updated', fetchUpdates);

    // Supabase Realtime Subscription
    const channel = supabase
      .channel('public_global_updates_notifier')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_updates' }, () => {
        fetchUpdates();
      })
      .subscribe();

    return () => {
      window.removeEventListener('global_updates_updated', fetchUpdates);
      supabase.removeChannel(channel);
      clearTimeout(showTimer);
    };
  }, [enabled]);

  // Graceful reload observer
  useEffect(() => {
    if (pendingReload) {
      if (!isBusy) {
        // Safe to reload immediately
        window.location.reload();
      }
    }
  }, [pendingReload, isBusy]);

  const handleClose = () => {
    if (latestUpdate) {
      markSeen(latestUpdate.id, latestUpdate.version);
    }
    setIsVisible(false);
  };

  /** Tombol utama CTA: tandai terlihat lalu navigasi ke fitur terkait. */
  const handlePrimaryAction = () => {
    if (latestUpdate) {
      markSeen(latestUpdate.id, latestUpdate.version);
    }
    setIsVisible(false);
    if (latestUpdate?.cta_route) {
      window.location.href = latestUpdate.cta_route;
    }
  };

  /** Link sekunder: buka modul Log Pembaruan (changelog) SaaS. */
  const handleSeeAllUpdates = () => {
    if (latestUpdate) {
      markSeen(latestUpdate.id, latestUpdate.version);
    }
    setIsVisible(false);
    window.location.href = `${window.location.origin}/?mode=admin&admin_tab=log_pembaruan`;
  };

  if (!latestUpdate && !pendingReload) return null;

  return (
    <>
      <AnimatePresence>
        {pendingReload && isBusy && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-[calc(100%-2rem)] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-blue-100 dark:border-blue-900 p-4 flex items-start gap-4"
          >
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg shrink-0">
              <Rocket className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Versi Baru Tersedia!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Sistem baru saja diperbarui. Jangan khawatir, silakan selesaikan pengisian form Anda. Aplikasi akan dimuat ulang secara otomatis saat Anda kembali ke layar utama.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isVisible && latestUpdate && (
          <GlobalUpdatePopup
            update={latestUpdate}
            globalName={globalName}
            globalColor={globalColor}
            onClose={handleClose}
            onPrimaryAction={handlePrimaryAction}
            onSeeAllUpdates={handleSeeAllUpdates}
          />
        )}
      </AnimatePresence>
    </>
  );
};
