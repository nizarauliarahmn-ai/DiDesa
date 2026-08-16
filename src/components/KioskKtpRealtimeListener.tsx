import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio } from 'lucide-react';
import KTPScannerModal from './admin/surat/KTPScannerModal';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { subscribeKtpScanChannel, RequestScanPayload, ktpScanChannelName } from '../utils/ktpRealtime';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { playKtpRequestBeep } from '../utils/sounds';
import { KtpOcrResult } from '../utils/ktpOcr';

/**
 * Listener global untuk kiosk/tablet desa.
 * Dipasang di halaman Kiosk (PublicKiosPortal) agar tablet tetap mendengarkan
 * permintaan scan KTP dari PC Admin walau sedang di halaman portal.
 * Saat REQUEST_SCAN diterima: berbunyi lembut + otomatis membuka modal kamera.
 */
export default function KioskKtpRealtimeListener() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [channelName, setChannelName] = useState('');

  useEffect(() => {
    let cancelled = false;
    resolveCurrentTenant().then((tid) => {
      if (cancelled || !tid) return;
      setChannelName(ktpScanChannelName(tid));
      const channel = subscribeKtpScanChannel(tid, {
        onRequestScan: (payload: RequestScanPayload) => {
          if (!payload || !payload.session_id) return;
          playKtpRequestBeep();
          setActiveSession(payload.session_id);
          setScannerOpen(true);
          setBannerVisible(true);
        }
      });
      channelRef.current = channel;
    });

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    setScannerOpen(false);
    setActiveSession(null);
    setBannerVisible(false);
  }, []);

  const handleResult = useCallback((_result: KtpOcrResult, _blob: Blob) => {
    setScannerOpen(false);
    setBannerVisible(false);
    setActiveSession(null);
  }, []);

  return (
    <>
      {/* Banner kecil saat ada permintaan scan masuk (tampil di atas portal) */}
      <AnimatePresence>
        {bannerVisible && !scannerOpen && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/95 border border-emerald-500/50 shadow-2xl shadow-emerald-900/40 backdrop-blur-xl"
          >
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <div>
              <p className="text-white text-sm font-black">Permintaan Scan KTP dari Admin</p>
              <p className="text-slate-400 text-xs">Kamera sedang dibuka...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Scanner Tablet (otomatis terbuka saat REQUEST_SCAN) */}
      <KTPScannerModal
        open={scannerOpen}
        onClose={handleClose}
        onResult={handleResult}
        variant="tablet"
        sessionId={activeSession || undefined}
      />
    </>
  );
}
