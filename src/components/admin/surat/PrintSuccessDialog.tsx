import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, FileText, ArrowLeft } from 'lucide-react';

interface PrintSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nomorSurat: string;
  namaWarga: string;
  jenisSurat: string;
  onBackToTemplates: () => void;
}

export default function PrintSuccessDialog({
  isOpen,
  onClose,
  nomorSurat,
  namaWarga,
  jenisSurat,
  onBackToTemplates,
}: PrintSuccessDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-6 text-center"
          >
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Surat Berhasil Dicetak!</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {jenisSurat} dengan nomor <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-xs">{nomorSurat}</span> atas nama <strong className="text-slate-800 font-semibold">{namaWarga}</strong> telah berhasil diregistrasi dan dicetak.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new CustomEvent('set_admin_surat_tab', { detail: 'dashboard' }));
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
              >
                <FileText className="h-4 w-4" />
                Buka Buku Agenda (Dashboard)
              </button>
              <button
                onClick={() => {
                  onClose();
                  onBackToTemplates();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Template
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Tutup & Tetap di Halaman Ini
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
