import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Printer, MessageCircle, Phone, AlertTriangle } from 'lucide-react';

interface SuratSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomorSurat: string;
  namaWarga: string;
  jenisSurat: string;
  waPhone?: string;
  onPrint?: () => void;
  onSendWa?: () => void;
}

export default function SuratSuccessModal({
  isOpen,
  onClose,
  nomorSurat,
  namaWarga,
  jenisSurat,
  waPhone,
  onPrint,
  onSendWa,
}: SuratSuccessModalProps) {
  const hasWa = !!(waPhone && String(waPhone).trim() !== '');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
          >
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                ✅ Surat Berhasil Diterbitkan!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Surat telah disimpan &amp; diarsipkan. Silakan cetak atau kirim notifikasi WhatsApp ke pemohon.
              </p>

              {/* Detail Surat */}
              <div className="space-y-2 text-left bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Pemohon</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100 text-right">{namaWarga}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Jenis Surat</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 text-right">{jenisSurat}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Nomor Surat</span>
                  <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">{nomorSurat}</span>
                </div>
                <div className="flex justify-between items-center gap-2 border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Status WA
                  </span>
                  {hasWa ? (
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      No. WA: {waPhone}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> No. WA belum terisi
                    </span>
                  )}
                </div>
              </div>

              {/* Tombol Aksi Utama */}
              <div className="grid grid-cols-2 gap-3">
                {onPrint && (
                  <button
                    onClick={() => { onClose(); onPrint(); }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-sm font-bold rounded-xl transition-all shadow-sm dark:shadow-none"
                  >
                    <Printer className="w-4 h-4" /> Cetak PDF / Surat
                  </button>
                )}
                {onSendWa && (
                  <button
                    onClick={() => { onSendWa(); }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/25 dark:shadow-none"
                  >
                    <MessageCircle className="w-4 h-4" /> Kirim WA ke Pemohon
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-t border-slate-100 dark:border-slate-800"
            >
              Tutup
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}