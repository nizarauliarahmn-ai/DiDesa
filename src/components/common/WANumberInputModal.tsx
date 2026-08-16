import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, MessageCircle, CheckCircle } from 'lucide-react';
import { openFreeWhatsAppMessage, saveResidentWaPhone } from '../../utils/waFreeEngine';
import { showToast } from '../../utils/toast';

interface WANumberInputModalProps {
  open: boolean;
  onClose: () => void;
  residentName?: string;
  residentNik?: string;
  message: string;
  title?: string;
}

export default function WANumberInputModal({
  open,
  onClose,
  residentName,
  residentNik,
  message,
  title = 'Nomor WhatsApp Warga'
}: WANumberInputModalProps) {
  const [waNumber, setWaNumber] = useState('');
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setWaNumber('');
      setSaveToProfile(true);
      setSaving(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    const digits = waNumber.replace(/\D/g, '');
    if (digits.length < 9) {
      showToast('Nomor WhatsApp tidak valid.', 'error');
      return;
    }
    setSaving(true);
    let savedOk = true;
    if (saveToProfile && residentNik) {
      savedOk = await saveResidentWaPhone(residentNik, digits);
      if (!savedOk) {
        showToast('Nomor gagal disimpan ke profil, WhatsApp tetap dibuka.', 'info');
      } else {
        showToast('Nomor WA berhasil disimpan ke profil penduduk.', 'success');
      }
    }
    const opened = openFreeWhatsAppMessage({ phone: digits, message });
    setSaving(false);
    if (opened) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 z-10"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                    <Phone className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{title}</h3>
                    {residentName && (
                      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                        untuk: {residentName}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-all focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-4">
                Nomor WhatsApp warga belum terisi. Masukkan nomor untuk mengirim notifikasi gratis via WhatsApp.
              </p>

              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Nomor WhatsApp Warga
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Contoh: 081234567890"
                className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white dark:bg-slate-800 transition-all"
                autoFocus
              />

              <label className="flex items-center gap-3 mt-4 p-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveToProfile}
                  onChange={(e) => setSaveToProfile(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600"
                />
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                  Simpan nomor ini ke Profil Penduduk
                </span>
              </label>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 animate-pulse" /> Menyimpan...
                  </span>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Simpan &amp; Kirim WhatsApp
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}