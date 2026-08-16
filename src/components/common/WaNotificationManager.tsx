import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X } from 'lucide-react';
import { WA_NOTIFICATION_EVENT, WaNotificationPayload, getResidentWaPhone, openFreeWhatsAppMessage } from '../../utils/waFreeEngine';
import WANumberInputModal from './WANumberInputModal';
import { showToast } from '../../utils/toast';

export default function WaNotificationManager() {
  const [payload, setPayload] = useState<WaNotificationPayload | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as WaNotificationPayload;
      if (!detail) return;
      setPayload(detail);
      setShowModal(false);
    };
    window.addEventListener(WA_NOTIFICATION_EVENT, handler);
    return () => window.removeEventListener(WA_NOTIFICATION_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!payload) return;
    const phone = getResidentWaPhone({ nomor_wa: payload.resident?.phone, no_wa: payload.resident?.phone });
    if (!phone) {
      setShowModal(true);
    } else {
      showToast('Notifikasi WA siap dikirim ke warga (Gratis, Rp 0).', 'success');
    }
  }, [payload]);

  if (!payload) return null;

  const phone = getResidentWaPhone({ nomor_wa: payload.resident?.phone, no_wa: payload.resident?.phone });
  const showFloating = !!phone && !showModal;

  return (
    <>
      <AnimatePresence>
        {showFloating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-[9998]"
          >
            <div className="relative">
              <button
                onClick={() => { openFreeWhatsAppMessage({ phone, message: payload.message }); setPayload(null); }}
                className="flex items-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold shadow-2xl shadow-emerald-600/30 dark:shadow-none transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <MessageCircle className="w-5 h-5" />
                📱 Klik Kirim WA ke Warga (Gratis)
              </button>
              <button
                onClick={() => setPayload(null)}
                className="absolute -top-2 -right-2 p-1 bg-gray-900/80 hover:bg-gray-900 text-white rounded-full shadow-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <WANumberInputModal
        open={showModal}
        onClose={() => { setShowModal(false); setPayload(null); }}
        residentName={payload.resident?.name}
        residentNik={payload.resident?.nik}
        message={payload.message}
      />
    </>
  );
}