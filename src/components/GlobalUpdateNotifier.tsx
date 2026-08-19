import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Rocket, ShieldCheck, Zap, Info } from 'lucide-react';
import Markdown from 'react-markdown';
import { supabase } from '../utils/supabase';

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
          .select('id, version, title, content, release_date, type, cta_route, is_popup')
          .eq('is_active', 1)
          .eq('is_popup', 1)
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'feature': return <Rocket className="w-6 h-6 text-blue-500" />;
      case 'fix': return <ShieldCheck className="w-6 h-6 text-emerald-500" />;
      case 'improvement': return <Zap className="w-6 h-6 text-amber-500" />;
      default: return <Info className="w-6 h-6 text-gray-500 dark:text-slate-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'feature': return 'Fitur Baru';
      case 'fix': return 'Perbaikan Sistem';
      case 'improvement': return 'Peningkatan';
      default: return 'Pembaruan';
    }
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 dark:border-slate-800"
          >
            {/* Header */}
            <div 
              className="relative p-6 text-white"
              style={{ background: `linear-gradient(135deg, ${globalColor}, ${globalColor}dd)` }}
            >
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Apa Yang Baru di {globalName}?</h2>
                  <p className="text-white/80 text-xs font-medium">Versi {latestUpdate.version} • {new Date(latestUpdate.release_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto text-gray-700 dark:text-slate-300">
              <div 
                className="flex items-start gap-4 mb-6 p-4 rounded-xl border"
                style={{ backgroundColor: `${globalColor}08`, borderColor: `${globalColor}20` }}
              >
                <div className="shrink-0">
                  {getIcon(latestUpdate.type)}
                </div>
                <div>
                  <span 
                    className="inline-block px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-[10px] font-bold border mb-1"
                    style={{ color: globalColor, borderColor: `${globalColor}30` }}
                  >
                    {getTypeLabel(latestUpdate.type)}
                  </span>
                  <h3 className="font-bold text-lg leading-tight" style={{ color: globalColor }}>{latestUpdate.title}</h3>
                </div>
              </div>

              <div className="prose prose-slate max-w-none text-gray-600 dark:text-slate-400 text-sm leading-relaxed">
                <Markdown>{latestUpdate.content}</Markdown>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={handleSeeAllUpdates}
                  className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Lihat Semua Log Pembaruan
                </button>
              </div>
              <button
                onClick={latestUpdate.cta_route ? handlePrimaryAction : handleClose}
                className="px-8 py-3 text-white rounded-xl font-bold shadow-lg dark:shadow-none transition-all active:scale-95"
                style={{ backgroundColor: globalColor, boxShadow: `0 4px 12px ${globalColor}33` }}
              >
                {latestUpdate.cta_route ? 'Coba Sekarang ➔' : 'Mengerti & Lanjutkan'}
              </button>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>
    </>
  );
};
