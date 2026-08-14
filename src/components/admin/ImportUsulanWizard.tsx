import React, { useState, useMemo } from 'react';
import {
  X, Upload, FileSpreadsheet, Loader2, Check, ChevronLeft, ChevronRight,
  Sparkles, ArrowRight, CheckCircle2, AlertTriangle, Link2
} from 'lucide-react';
import { read, utils } from 'xlsx';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { normalizeText } from '../../utils/similarity';

export type ImportFieldKey =
  | 'kode_usulan'
  | 'uraian_usulan'
  | 'lokasi_rt_rw'
  | 'diteruskan_tags'
  | 'status_terakomodir'
  | 'skala_prioritas'
  | 'keterangan';

interface ImportField {
  key: ImportFieldKey;
  label: string;
  hint: string;
  required: boolean;
  keywords: string[];
}

const FIELDS: ImportField[] = [
  { key: 'kode_usulan', label: 'Kode / ID Usulan', hint: 'Contoh: U-2026-001', required: false, keywords: ['kode', 'id usulan', 'usulan id', 'no usulan', 'nomor'] },
  { key: 'uraian_usulan', label: 'Uraian Usulan', hint: 'Judul / rincian usulan (wajib)', required: true, keywords: ['uraian', 'usulan', 'kegiatan', 'judul', 'rincian'] },
  { key: 'lokasi_rt_rw', label: 'Lokasi / RT RW', hint: 'Lokasi, RT/RW, dusun', required: false, keywords: ['lokasi', 'rt', 'rw', 'dusun', 'alamat', 'tempat'] },
  { key: 'diteruskan_tags', label: 'Status Diteruskan', hint: 'Tag RKPDes / Musrenbang', required: false, keywords: ['diteruskan', 'tag', 'disposisi', 'penerusan'] },
  { key: 'status_terakomodir', label: 'Status Terakomodir', hint: 'Belum / Desa / Kab / Ditolak', required: false, keywords: ['terakomodir', 'status', 'akomodasi', 'realisasi'] },
  { key: 'skala_prioritas', label: 'Skala Prioritas', hint: 'Angka 1–5', required: false, keywords: ['prioritas', 'skala', 'urgensi'] },
  { key: 'keterangan', label: 'Keterangan / Foto', hint: 'Catatan tambahan', required: false, keywords: ['keterangan', 'catatan', 'foto', 'note', 'info'] },
];

interface ParsedFile {
  headers: string[];
  rows: (string | number)[][];
  fileName: string;
}

type Mapping = Record<ImportFieldKey, number>;

const EMPTY_MAPPING: Mapping = {
  kode_usulan: -1,
  uraian_usulan: -1,
  lokasi_rt_rw: -1,
  diteruskan_tags: -1,
  status_terakomodir: -1,
  skala_prioritas: -1,
  keterangan: -1,
};

const norm = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const autoGuess = (headers: string[]): Mapping => {
  const result: Mapping = { ...EMPTY_MAPPING };
  const used = new Set<number>();
  const score = (header: string, field: ImportField) => {
    const nh = norm(header);
    let best = 0;
    for (const kw of field.keywords) {
      const nk = norm(kw);
      if (nh === nk) best = Math.max(best, 100);
      else if (nh.includes(nk)) best = Math.max(best, 60);
      else if (nk.includes(nh)) best = Math.max(best, 30);
    }
    return best;
  };
  for (const field of FIELDS) {
    let bestIdx = -1;
    let bestScore = 40;
    headers.forEach((h, i) => {
      if (used.has(i)) return;
      const s = score(h, field);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0) {
      result[field.key] = bestIdx;
      used.add(bestIdx);
    }
  }
  return result;
};

const normalizeTags = (val: string): string[] => {
  if (!val.trim()) return [];
  return val.split(/[;,'"|\n]/).map(t => t.trim()).filter(Boolean).map(t => {
    const tl = t.toLowerCase();
    const yearMatch = t.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : String(new Date().getFullYear());
    if (tl.includes('musrenbang')) return `Musrenbang ${year}`;
    if (tl.includes('rkpdes')) return `RKPDes ${year}`;
    return t;
  });
};

const normalizeStatus = (val: string): string => {
  const v = val.trim().toLowerCase();
  const yearMatch = val.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : String(new Date().getFullYear());
  if (!v || /belum/.test(v)) return 'Belum';
  if (/ditolak/.test(v)) return 'Ditolak';
  if (/kab/.test(v)) return `Kab ${year}`;
  if (/desa|apbdes/.test(v)) return `Desa ${year}`;
  return 'Belum';
};

const parsePriority = (val: string): number | null => {
  const n = parseInt(val.replace(/[^\d]/g, ''), 10);
  if (isNaN(n) || n < 1 || n > 5) return null;
  return n;
};

interface PreviewRow {
  kode_usulan: string;
  uraian_usulan: string;
  lokasi_rt_rw: string;
  diteruskan_tags: string[];
  status_terakomodir: string;
  skala_prioritas: number | null;
  keterangan: string;
}

const tagColor = (tag: string) => {
  const t = (tag || '').toLowerCase();
  if (t.includes('rkpdes')) return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
  if (t.includes('musrenbang')) return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
  return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
};

const statusBadge = (status: string) => {
  if (status === 'Belum') return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
  if (status === 'Ditolak') return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  if (status.toLowerCase().startsWith('desa')) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
};

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  existingKodes: string[];
  existingItems?: ExistingUsulan[];
}

interface ExistingUsulan {
  id: string;
  kode_usulan: string;
  uraian_usulan: string;
}

export default function ImportUsulanWizard({ open, onClose, onImported, existingKodes, existingItems }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Mapping>({ ...EMPTY_MAPPING });
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showDupDialog, setShowDupDialog] = useState(false);
  const [dupMode, setDupMode] = useState<'skip' | 'overwrite' | 'keep'>('skip');

  const handleFile = async (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      showToast('Format file harus .xlsx, .xls, atau .csv.', 'error');
      return;
    }
    setReading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' }) as any[][];
      if (!data || data.length < 2) {
        showToast('File kosong atau tidak memiliki baris data.', 'error');
        return;
      }
      const headers = data[0].map((h, i) => String(h == null ? '' : h).trim() || `Kolom ${i + 1}`);
      const rows = data.slice(1).filter(r => r.some(c => String(c == null ? '' : c).trim() !== ''));
      if (rows.length === 0) {
        showToast('Tidak ditemukan baris data pada file.', 'error');
        return;
      }
      const p: ParsedFile = { headers, rows, fileName: file.name };
      setParsed(p);
      setMapping(autoGuess(headers));
      setStep(2);
      showToast(`File terbaca: ${headers.length} kolom, ${rows.length} baris. Periksa pemetaan kolom.`, 'info');
    } catch (e: any) {
      console.error('Import parse error:', e);
      showToast('Gagal membaca file. Periksa format file.', 'error');
    } finally {
      setReading(false);
    }
  };

  const cell = (row: (string | number)[], idx: number) => (idx >= 0 ? String(row[idx] ?? '').trim() : '');

  const mapRow = (row: (string | number)[]): PreviewRow | null => {
    const uraian = cell(row, mapping.uraian_usulan);
    if (!uraian) return null;
    const kodeInput = cell(row, mapping.kode_usulan);
    return {
      kode_usulan: kodeInput || '',
      uraian_usulan: uraian,
      lokasi_rt_rw: cell(row, mapping.lokasi_rt_rw),
      diteruskan_tags: normalizeTags(cell(row, mapping.diteruskan_tags)),
      status_terakomodir: normalizeStatus(cell(row, mapping.status_terakomodir)),
      skala_prioritas: parsePriority(cell(row, mapping.skala_prioritas)),
      keterangan: cell(row, mapping.keterangan),
    };
  };

  const validRows = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.map(mapRow).filter((r): r is PreviewRow => r !== null);
  }, [parsed, mapping]);

  // Deteksi duplikat terhadap data yang sudah ada di database (kode / judul usulan)
  const dupRows = useMemo(() => {
    if (!parsed) return [];
    const items = existingItems || [];
    const kodeSet = new Set(items.map(i => i.kode_usulan).filter(Boolean));
    const uraianSet = new Set(items.map(i => normalizeText(i.uraian_usulan)).filter(Boolean));
    return validRows.filter(r => {
      const kodeDup = !!r.kode_usulan && kodeSet.has(r.kode_usulan);
      const uraianDup = uraianSet.has(normalizeText(r.uraian_usulan));
      return kodeDup || uraianDup;
    });
  }, [parsed, mapping, existingItems, validRows]);

  const mappedCount = Object.values(mapping).filter(v => v >= 0).length;
  const confirmed = mapping.uraian_usulan >= 0 ? 'uraian' : null;
  const canConfirm = confirmed !== null && validRows.length > 0;

  const doImport = async (mode: 'skip' | 'overwrite' | 'keep') => {
    if (!parsed || !canConfirm) return;
    setImporting(true);
    try {
      const tenantId = await resolveCurrentTenant();
      const year = String(new Date().getFullYear());
      const taken = new Set<string>(existingKodes.filter(Boolean));
      let next = 1;
      existingKodes.forEach(k => {
        const m = k.match(/U-(\d{4})-(\d{3})/);
        if (m && m[1] === year) next = Math.max(next, parseInt(m[2], 10) + 1);
      });
      const items = existingItems || [];
      const byKode = new Map<string, ExistingUsulan>();
      const byUraian = new Map<string, ExistingUsulan>();
      items.forEach(i => {
        if (i.kode_usulan) byKode.set(i.kode_usulan, i);
        byUraian.set(normalizeText(i.uraian_usulan), i);
      });

      const inserts: any[] = [];
      const updates: any[] = [];
      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const row of parsed.rows) {
        const obj = mapRow(row);
        if (!obj) continue;
        const existing = (obj.kode_usulan && byKode.get(obj.kode_usulan)) || byUraian.get(normalizeText(obj.uraian_usulan));
        if (existing) {
          if (mode === 'skip') {
            skipped += 1;
            continue;
          }
          if (mode === 'overwrite') {
            updates.push({
              id: existing.id,
              uraian_usulan: obj.uraian_usulan,
              lokasi_rt_rw: obj.lokasi_rt_rw || null,
              diteruskan_tags: obj.diteruskan_tags,
              status_terakomodir: obj.status_terakomodir,
              skala_prioritas: obj.skala_prioritas,
              keterangan: obj.keterangan || null,
            });
            updated += 1;
            continue;
          }
          // mode 'keep' → jatuh ke insert sebagai usulan baru
        }
        let kode = obj.kode_usulan;
        if (!kode || taken.has(kode)) {
          let candidate = `U-${year}-${String(next).padStart(3, '0')}`;
          while (taken.has(candidate)) {
            next += 1;
            candidate = `U-${year}-${String(next).padStart(3, '0')}`;
          }
          kode = candidate;
        }
        taken.add(kode);
        inserts.push({
          tenant_id: tenantId,
          kode_usulan: kode,
          uraian_usulan: obj.uraian_usulan,
          kategori: 'Infrastruktur',
          lokasi_rt_rw: obj.lokasi_rt_rw || null,
          pengusul: null,
          diteruskan_tags: obj.diteruskan_tags,
          status_terakomodir: obj.status_terakomodir,
          skala_prioritas: obj.skala_prioritas,
          keterangan: obj.keterangan || null,
          foto_url: null,
        });
        inserted += 1;
      }

      if (inserted === 0 && updated === 0) {
        showToast('Tidak ada baris valid untuk diimpor.', 'error');
        return;
      }

      if (updates.length > 0) {
        const { error } = await supabase.from('usulan_desas').upsert(updates, { onConflict: 'id' });
        if (error) throw error;
      }
      if (inserts.length > 0) {
        const { error } = await supabase.from('usulan_desas').insert(inserts);
        if (error) throw error;
      }

      const parts: string[] = [];
      if (inserted > 0) parts.push(`${inserted} baru`);
      if (updated > 0) parts.push(`${updated} diperbarui`);
      if (skipped > 0) parts.push(`${skipped} dilewati`);
      showToast(`✓ Impor selesai: ${parts.join(', ')}.`, 'success');
      setStep(1);
      setParsed(null);
      setMapping({ ...EMPTY_MAPPING });
      onImported();
      onClose();
    } catch (e: any) {
      console.error('Import save error:', e);
      showToast(e?.message || 'Gagal menyimpan data impor.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmClick = () => {
    if (dupRows.length > 0) {
      setShowDupDialog(true);
    } else {
      doImport('skip');
    }
  };

  const reset = () => {
    setStep(1);
    setParsed(null);
    setMapping({ ...EMPTY_MAPPING });
    setImporting(false);
    setReading(false);
    onClose();
  };

  if (!open) return null;

  const divClass = 'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ' +
    (dragging
      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40'
      : 'border-gray-300 dark:border-slate-700 hover:border-sky-400 hover:bg-sky-50/30 dark:hover:bg-sky-950/20');

  const stepLabel = (n: number, title: string) => (
    <div className={`flex items-center gap-2 ${step === n ? 'text-sky-600 dark:text-sky-400' : step > n ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-500'}`}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black border ${step === n ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40' : step > n ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800'}`}>
        {step > n ? <Check className="w-3.5 h-3.5" /> : n}
      </span>
      <span className="text-[11px] font-extrabold uppercase tracking-wider hidden sm:block">{title}</span>
    </div>
  );

  return (
    <>
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              Impor Usulan dari Excel/CSV
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Wizard 3 langkah dengan konfirmasi pemetaan kolom</p>
          </div>
          <button onClick={reset} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
          {stepLabel(1, 'Upload')}
          <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
          {stepLabel(2, 'Map Columns')}
          <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
          {stepLabel(3, 'Preview & Impor')}
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex-1 overflow-y-auto space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                className={divClass}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  id="import-usulan-input"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                />
                <label htmlFor="import-usulan-input" className="block cursor-pointer">
                  {reading ? (
                    <div className="flex items-center justify-center gap-2 text-sm font-bold text-sky-700">
                      <Loader2 className="w-5 h-5 animate-spin" /> Membaca file...
                    </div>
                  ) : (
                    <div className="text-gray-400 dark:text-slate-500">
                      <Upload className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-sm font-bold">Seret file ke sini atau klik untuk memilih</p>
                      <p className="text-[11px] mt-1">Format .xlsx, .xls, .csv — baris pertama harus berisi header kolom</p>
                    </div>
                  )}
                </label>
              </div>
              <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl p-4 text-xs text-sky-700 dark:text-sky-300 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Setelah file dipilih, Anda akan diminta mengonfirmasi pemetaan kolom Excel ke field database
                  DiDesa pada langkah berikutnya. Kolom yang belum dipetakan akan diisi nilai otomatis
                  (contoh: Kategori → Infrastruktur, Status → Belum).
                </p>
              </div>
            </div>
          )}

          {step === 2 && parsed && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-700 dark:text-slate-300">
                  Konfirmasi Pemetaan Kolom — <span className="text-sky-600 dark:text-sky-400">{parsed.fileName}</span>
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 px-2 py-1 rounded-full">
                  <Sparkles className="w-3 h-3" /> Auto-Guess {mappedCount}/{FIELDS.length}
                </span>
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="grid grid-cols-[200px_1fr] gap-0 text-[11px]">
                  <div className="bg-gray-50 dark:bg-slate-800/60 px-3 py-2 font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Field DiDesa</div>
                  <div className="bg-gray-50 dark:bg-slate-800/60 px-3 py-2 font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Kolom Excel</div>
                  {FIELDS.map(field => (
                    <React.Fragment key={field.key}>
                      <div className="px-3 py-2 border-t border-gray-50 dark:border-slate-800/60">
                        <p className={`font-bold ${field.required ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-300'}`}>
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500">{field.hint}</p>
                      </div>
                      <div className="px-3 py-2 border-t border-gray-50 dark:border-slate-800/60">
                        <select
                          value={mapping[field.key]}
                          onChange={e => setMapping(prev => ({ ...prev, [field.key]: parseInt(e.target.value, 10) }))}
                          className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold outline-none border bg-white dark:bg-slate-900 cursor-pointer ${
                            mapping[field.key] >= 0
                              ? 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                              : field.required
                                ? 'border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                                : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400'
                          }`}
                        >
                          <option value={-1}>{field.required ? '— Pilih kolom (wajib) —' : '— (Tidak dipetakan) —'}</option>
                          {parsed.headers.map((h, i) => (
                            <option key={i} value={i}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {mapping.uraian_usulan < 0 && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Kolom "Uraian Usulan" wajib dipetakan sebelum lanjut.</p>
              )}
            </div>
          )}

          {step === 3 && parsed && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-700 dark:text-slate-300">Pratinjau Data — <span className="text-sky-600 dark:text-sky-400">{parsed.fileName}</span></p>
                <button
                  onClick={() => setStep(2)}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Ubah Pemetaan
                </button>
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[820px]">
                    <thead>
                      <tr className="bg-gray-50/60 dark:bg-slate-800/40">
                        <th className="px-3 py-2.5 text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Kode</th>
                        <th className="px-3 py-2.5 text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Uraian Usulan</th>
                        <th className="px-3 py-2.5 text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Lokasi</th>
                        <th className="px-3 py-2.5 text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Diteruskan</th>
                        <th className="px-3 py-2.5 text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2.5 text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Prioritas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-t border-gray-50 dark:border-slate-800/60">
                          <td className="px-3 py-2.5 text-xs font-mono font-black text-emerald-700 dark:text-emerald-300">{r.kode_usulan || <span className="text-gray-300 dark:text-slate-600">auto</span>}</td>
                          <td className="px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-slate-200">{r.uraian_usulan}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-slate-400">{r.lokasi_rt_rw || '—'}</td>
                          <td className="px-3 py-2.5">
                            {r.diteruskan_tags.length ? (
                              <div className="flex flex-wrap gap-1">
                                {r.diteruskan_tags.map((t, ti) => (
                                  <span key={ti} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black border ${tagColor(t)}`}>
                                    <Link2 className="w-2.5 h-2.5" /> {t}
                                  </span>
                                ))}
                              </div>
                            ) : <span className="text-xs text-gray-400">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border whitespace-nowrap ${statusBadge(r.status_terakomodir)}`}>{r.status_terakomodir}</span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-slate-400">{r.skala_prioritas ?? '—'}</td>
                        </tr>
                      ))}
                      {validRows.length > 5 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-2.5 text-xs text-gray-400 font-semibold text-center">
                            ... dan {validRows.length - 5} baris lainnya
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {dupRows.length > 0 && (
                <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 px-4 py-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-orange-800 dark:text-orange-300">
                      {dupRows.length} baris terdeteksi duplikat dengan data yang sudah ada di database.
                    </p>
                    <p className="text-[11px] text-orange-700 dark:text-orange-400 mt-0.5">
                      Duplikat dideteksi dari kode usulan atau judul usulan yang sama. Klik tombol impor untuk memilih cara penanganan.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  Siap mengimpor <span className="font-black text-emerald-600 dark:text-emerald-200">{validRows.length}</span> baris data usulan.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-[11px] text-gray-500 dark:text-slate-400 space-y-1">
                <p><span className="font-bold">Catatan impor:</span></p>
                <p>• Kode usulan kosong akan dibuat otomatis (format U-Tahun-XXX).</p>
                <p>• Kategori diisi default <b>Infrastruktur</b>; status terjangkau yang tidak dikenali dianggap <b>Belum</b>.</p>
                <p>• Baris tanpa Uraian Usulan akan dilewati (tidak diimpor).</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={step === 1 ? reset : () => setStep(s => (s === 3 ? 2 : 1))}
            disabled={importing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {step !== 1 && <ChevronLeft className="w-4 h-4" />}
            {step === 1 ? 'Batal' : 'Kembali'}
          </button>

          {step === 1 && (
            <p className="text-[11px] text-gray-400 dark:text-slate-500">Pilih file untuk memulai pemetaan kolom</p>
          )}

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={mapping.uraian_usulan < 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white bg-sky-700 hover:bg-sky-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Lanjut ke Pratinjau <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 3 && (
            <div className="flex items-center gap-3">
              {confirmed && (
                <button
                  onClick={handleConfirmClick}
                  disabled={importing || !canConfirm}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white bg-emerald-700 hover:bg-emerald-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {importing ? 'Mengimpor...' : `Konfirmasi & Impor Data (${validRows.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Dialog Konfirmasi Penanganan Duplikat */}
    {showDupDialog && (
      <div className="fixed inset-0 z-[10001] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Data Duplikat Ditemukan
            </h3>
            <button onClick={() => setShowDupDialog(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Sebanyak <span className="font-black text-gray-900 dark:text-white">{dupRows.length} baris</span> dari file terdeteksi
              sudah pernah diimpor (kode/judul usulan sama dengan data di database). Pilih cara penanganan:
            </p>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-100 dark:border-slate-800 divide-y divide-gray-50 dark:divide-slate-800">
              {dupRows.slice(0, 10).map((r, i) => (
                <div key={i} className="px-3 py-2">
                  <p className="text-[10px] font-mono font-black text-emerald-700 dark:text-emerald-300">{r.kode_usulan || 'auto'}</p>
                  <p className="text-xs font-bold text-gray-700 dark:text-slate-300 truncate">{r.uraian_usulan}</p>
                </div>
              ))}
              {dupRows.length > 10 && (
                <p className="px-3 py-2 text-[11px] text-gray-400 font-semibold">... dan {dupRows.length - 10} baris lainnya</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setDupMode('skip'); setShowDupDialog(false); doImport('skip'); }}
                disabled={importing}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-black border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>⏩ Lewati Data Duplikat (Skip)</span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded">DEFAULT</span>
              </button>
              <button
                onClick={() => { setDupMode('overwrite'); setShowDupDialog(false); doImport('overwrite'); }}
                disabled={importing}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>🔄 Timpa Data Lama (Update/Overwrite)</span>
              </button>
              <button
                onClick={() => { setDupMode('keep'); setShowDupDialog(false); doImport('keep'); }}
                disabled={importing}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>➕ Tetap Simpan Sebagai Usulan Baru</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}