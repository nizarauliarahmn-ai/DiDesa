import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, X, Rocket, ShieldCheck, Zap, Info } from 'lucide-react';
import Markdown from 'react-markdown';

export interface GlobalUpdatePopupData {
  id?: string;
  title: string;
  content: string;
  version: string;
  release_date: string;
  type: string;
  cta_route?: string;
}

interface Props {
  update: GlobalUpdatePopupData;
  globalName: string;
  globalColor: string;
  onClose: () => void;
  onPrimaryAction: () => void;
  onSeeAllUpdates: () => void;
}

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

/**
 * Modal pop-up "Apa Yang Baru" — SATU-SATUNYA tampilan resmi pop-up.
 * Dipakai bersama oleh GlobalUpdateNotifier (admin desa) dan Preview Pop-up (SaaS admin)
 * agar keduanya selalu identik.
 */
export const GlobalUpdatePopup: React.FC<Props> = ({ update, globalName, globalColor, onClose, onPrimaryAction, onSeeAllUpdates }) => {
  return (
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
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Apa Yang Baru di {globalName}?</h2>
              <p className="text-white/80 text-xs font-medium">Versi {update.version} • {new Date(update.release_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
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
              {getIcon(update.type)}
            </div>
            <div>
              <span
                className="inline-block px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-[10px] font-bold border mb-1"
                style={{ color: globalColor, borderColor: `${globalColor}30` }}
              >
                {getTypeLabel(update.type)}
              </span>
              <h3 className="font-bold text-lg leading-tight" style={{ color: globalColor }}>{update.title}</h3>
            </div>
          </div>

          <div className="prose prose-slate max-w-none text-gray-600 dark:text-slate-400 text-sm leading-relaxed">
            <Markdown>{update.content}</Markdown>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={onSeeAllUpdates}
              className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Lihat Semua Log Pembaruan
            </button>
          </div>
          <button
            onClick={onPrimaryAction}
            className="px-8 py-3 text-white rounded-xl font-bold shadow-lg dark:shadow-none transition-all active:scale-95 cursor-pointer"
            style={{ backgroundColor: globalColor, boxShadow: `0 4px 12px ${globalColor}33` }}
          >
            {update.cta_route ? 'Coba Sekarang ➔' : 'Mengerti & Lanjutkan'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};