import React from 'react';
import { ArrowLeft, Printer, Save, Loader2 } from 'lucide-react';
import { getLetterClassifications } from '../../../utils/letterClassifications';
import { extractSequenceFromNomor } from '../../../services/penomoranSuratService';
import { getSuratConfig } from '../../../config/suratConfig';

export interface SuratEditorTemplate {
  title: string;
  description?: string;
  kode?: string;
  classificationCode?: string;
  sequenceNo?: string;
}

interface SuratEditorHeaderProps {
  template: SuratEditorTemplate;
  icon?: React.ReactNode;
  isSaving?: boolean;
  onBack: () => void;
  onPrint?: () => void;
  onSave?: () => void;
  printLabel?: string;
  saveLabel?: string;
  children?: React.ReactNode;
}

const toTitleCase = (s: string) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .map((w) =>
      /^[a-z]{2,4}$/.test(w)
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(' ');

export function getLetterHeaderTemplate(
  klasifikasi: string,
  fallback: { kode?: string; jenis?: string; deskripsi?: string; nomorSurat?: string } = {}
): SuratEditorTemplate {
  // SINGLE SOURCE OF TRUTH: Use centralized suratConfig as primary source
  const config = getSuratConfig(klasifikasi);
  const t = getLetterClassifications().find((c) => c.klasifikasi === klasifikasi);
  
  // Priority: config (suratConfig.ts) > fallback > letterClassifications > fallback values
  const jenis = config?.jenis || fallback.jenis || (t?.jenis ? toTitleCase(t.jenis) : 'Surat');
  const deskripsi = config?.deskripsi || fallback.deskripsi || t?.deskripsi || '';
  const kodeKlasifikasi = config?.kodeKlasifikasi || t?.kodeKlasifikasi || fallback.kode || '';
  
  // SINGLE SOURCE OF TRUTH: jika nomor surat aktual dari state form disediakan,
  // tampilkan urutannya (mis. "475/059/WHI-SKP/2026" -> "059") sehingga header
  // selalu sinkron dengan pratinjau & database. Fallback ke counter bila kosong.
  let sequenceNo = '';
  if (fallback.nomorSurat && fallback.nomorSurat.trim()) {
    const seq = extractSequenceFromNomor(fallback.nomorSurat);
    if (seq > 0) sequenceNo = String(seq).padStart(3, '0');
  }
  if (!sequenceNo && t?.noUrutTerakhir) {
    sequenceNo = String(t.noUrutTerakhir).padStart(3, '0');
  }
  return {
    title: `Buat ${jenis}`,
    description: config?.deskripsi || fallback.deskripsi || t?.deskripsi || '',
    kode: klasifikasi,
    classificationCode: config?.kodeKlasifikasi || t?.kodeKlasifikasi || fallback.kode || '',
    sequenceNo,
  };
}

export default function SuratEditorHeader({
  template,
  icon,
  isSaving = false,
  onBack,
  onPrint,
  onSave,
  printLabel = "Cetak Surat",
  saveLabel = "Simpan",
  children
}: SuratEditorHeaderProps) {
  const { title, description, kode, classificationCode, sequenceNo } = template;
  return (
    <div className="sticky top-20 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none mb-6">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onBack}
          className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all shrink-0"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>

        {icon && (
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {kode && (
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold rounded">
                {kode}
              </span>
            )}
            {classificationCode && (
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-semibold font-mono rounded border border-slate-200/60 dark:border-slate-700/60">
                Kode: {classificationCode}
              </span>
            )}
            {sequenceNo && (
              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[11px] font-semibold font-mono rounded">
                No: {sequenceNo}
              </span>
            )}
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white leading-snug truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
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
            onClick={() => onPrint()}
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
