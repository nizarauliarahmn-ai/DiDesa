import React from 'react';
import { ArrowLeft, Printer, Save, Loader2 } from 'lucide-react';

interface SuratEditorHeaderProps {
  title: string;
  templateKode?: string;
  templateDesc?: string;
  isSaving?: boolean;
  onBack: () => void;
  onPrint?: () => void;
  onSave?: () => void;
  printLabel?: string;
  saveLabel?: string;
  children?: React.ReactNode;
}

export default function SuratEditorHeader({
  title,
  templateKode,
  templateDesc,
  isSaving = false,
  onBack,
  onPrint,
  onSave,
  printLabel = "Cetak Surat",
  saveLabel = "Simpan",
  children
}: SuratEditorHeaderProps) {
  return (
    <div className="sticky top-20 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none mb-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack} 
          className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </h1>
          {(templateKode || templateDesc) && (
            <div className="flex items-center mt-1.5 gap-2">
              {templateKode && (
                <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold font-mono rounded-md border border-slate-200 dark:border-slate-700 tracking-wide">
                  Kode: {templateKode}
                </span>
              )}
              {templateDesc && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {templateDesc}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saveLabel}</span>
          </button>
        )}
        
        {onPrint && (
          <button
            onClick={onPrint}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 dark:shadow-none transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>{printLabel}</span>
          </button>
        )}
        
        {children}
      </div>
    </div>
  );
}
