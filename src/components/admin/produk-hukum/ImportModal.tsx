import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { showToast } from '../../../utils/toast';

interface ParsedRow {
  [key: string]: any;
}

interface MappedData {
  no: number;
  tahun: string;
  uraian: string;
  tanggal: string;
  tanggalDiundangkan: string;
  jenisDokumen: string;
  arsip: boolean;
  linkFile: string;
  ketArsip: string;
  ketLain: string;
  [key: string]: any;
}

interface ColumnMapping {
  no: string;
  tahun: string;
  uraian: string;
  tanggal: string;
  tanggalDiundangkan: string;
  jenisDokumen: string;
  arsip: string;
  linkFile: string;
  ketArsip: string;
  ketLain: string;
}

const DEFAULT_MAPPING: ColumnMapping = {
  no: '',
  tahun: '',
  uraian: '',
  tanggal: '',
  tanggalDiundangkan: '',
  jenisDokumen: '',
  arsip: '',
  linkFile: '',
  ketArsip: '',
  ketLain: '',
};

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  no: 'Nomor Urut',
  tahun: 'Tahun',
  uraian: 'Uraian',
  tanggal: 'Tanggal',
  tanggalDiundangkan: 'Tgl Diundangkan',
  jenisDokumen: 'Jenis Dokumen',
  arsip: 'Arsip (TRUE/FALSE)',
  linkFile: 'Link File',
  ketArsip: 'Ket Arsip',
  ketLain: 'Ket Lain',
};

const REQUIRED_FIELDS = ['uraian', 'tahun'];

function guessMapping(headers: string[]): ColumnMapping {
  const mapping = { ...DEFAULT_MAPPING };
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  const findHeader = (patterns: string[]): string => {
    for (const pattern of patterns) {
      const idx = lowerHeaders.findIndex(h => h.includes(pattern));
      if (idx !== -1) return headers[idx];
    }
    return '';
  };

  mapping.no = findHeader(['no', 'nomor', 'urut']);
  mapping.tahun = findHeader(['tahun', 'year']);
  mapping.uraian = findHeader(['uraian', 'judul', 'deskripsi', 'description', 'title']);
  mapping.tanggal = findHeader(['tanggal', 'date', 'tgl']);
  mapping.tanggalDiundangkan = findHeader(['diundangkan', 'undang', 'publish', 'terbit']);
  mapping.jenisDokumen = findHeader(['jenis', 'type', 'kategori', 'category']);
  mapping.arsip = findHeader(['arsip', 'archive']);
  mapping.linkFile = findHeader(['link', 'file', 'dokumen', 'document']);
  mapping.ketArsip = findHeader(['ket arsip', 'keterangan arsip', 'status arsip']);
  mapping.ketLain = findHeader(['ket lain', 'keterangan lain', 'catatan', 'note', 'remark']);

  return mapping;
}

function parseArsipValue(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  const str = String(val).toUpperCase().trim();
  return str === 'TRUE' || str === 'YA' || str === '1' || str === 'BENAR';
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: MappedData[]) => void;
  kategoriLabel: string;
}

export default function ImportModal({ isOpen, onClose, onImport, kategoriLabel }: ImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setStep('upload');
    setFileName('');
    setRawHeaders([]);
    setRawRows([]);
    setMapping(DEFAULT_MAPPING);
    setIsProcessing(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = useCallback((file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

        if (jsonData.length < 2) {
          showToast('File kosong atau tidak ada data!', 'error');
          setIsProcessing(false);
          return;
        }

        const headers = (jsonData[0] as any[]).map(h => String(h || '').trim()).filter(Boolean);
        const rows = jsonData.slice(1).filter((row: any) => {
          return row && row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '');
        }).map((row: any) => {
          const obj: ParsedRow = {};
          headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
          return obj;
        });

        setRawHeaders(headers);
        setRawRows(rows);
        setMapping(guessMapping(headers));
        setStep('mapping');
      } catch (err) {
        showToast('Gagal membaca file! Pastikan format file benar.', 'error');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.remove('border-emerald-500', 'bg-emerald-50');

    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.add('border-emerald-500', 'bg-emerald-50');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.remove('border-emerald-500', 'bg-emerald-50');
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const getMappedPreview = (): MappedData[] => {
    return rawRows.slice(0, 100).map((row, idx) => ({
      no: mapping.no ? (parseInt(String(row[mapping.no])) || idx + 1) : idx + 1,
      tahun: mapping.tahun ? String(row[mapping.tahun] || '') : new Date().getFullYear().toString(),
      uraian: mapping.uraian ? String(row[mapping.uraian] || '') : '',
      tanggal: mapping.tanggal ? String(row[mapping.tanggal] || '') : '',
      tanggalDiundangkan: mapping.tanggalDiundangkan ? String(row[mapping.tanggalDiundangkan] || '') : '',
      jenisDokumen: mapping.jenisDokumen ? String(row[mapping.jenisDokumen] || '') : '',
      arsip: mapping.arsip ? parseArsipValue(row[mapping.arsip]) : true,
      linkFile: mapping.linkFile ? String(row[mapping.linkFile] || '') : '',
      ketArsip: mapping.ketArsip ? String(row[mapping.ketArsip] || '') : '',
      ketLain: mapping.ketLain ? String(row[mapping.ketLain] || '') : '',
    }));
  };

  const handleImport = () => {
    const data = getMappedPreview();
    if (data.length === 0) {
      showToast('Tidak ada data untuk diimport!', 'error');
      return;
    }
    onImport(data);
    showToast(`${data.length} data berhasil diimport!`, 'success');
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[5vh] sm:pt-[8vh] p-4 overflow-y-auto" onClick={handleClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Import {kategoriLabel}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {step === 'upload' && 'Upload file CSV atau Excel'}
              {step === 'mapping' && 'Mapping kolom file ke field aplikasi'}
              {step === 'preview' && 'Preview data sebelum diimport'}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
          {['upload', 'mapping', 'preview'].map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-emerald-600 text-white' :
                ['upload', 'mapping', 'preview'].indexOf(step) > idx ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                'bg-gray-100 dark:bg-slate-800 text-gray-400'
              }`}>
                {['upload', 'mapping', 'preview'].indexOf(step) > idx ? <CheckCircle2 size={14} /> : idx + 1}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${
                step === s ? 'text-emerald-600' : 'text-gray-400'
              }`}>
                {s === 'upload' ? 'Upload' : s === 'mapping' ? 'Mapping' : 'Preview'}
              </span>
              {idx < 2 && <ArrowRight size={12} className="text-gray-300 mx-1" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-all"
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm font-semibold text-gray-600 dark:text-slate-400">Memproses file...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload size={28} />
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Klik atau seret file ke sini</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Mendukung format CSV, Excel (.xlsx, .xls)</p>
                    <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><FileText size={12} /> .csv</span>
                      <span className="flex items-center gap-1"><FileSpreadsheet size={12} /> .xlsx</span>
                      <span className="flex items-center gap-1"><FileSpreadsheet size={12} /> .xls</span>
                    </div>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{fileName}</span>
                </div>
                <span className="text-xs text-blue-600 dark:text-blue-400">{rawRows.length} baris ditemukan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">
                      {FIELD_LABELS[field]}
                      {REQUIRED_FIELDS.includes(field) && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <select
                      value={mapping[field]}
                      onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    >
                      <option value="">-- Pilih Kolom --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview Mapping Result */}
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">Preview (5 baris pertama):</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        {rawHeaders.slice(0, 6).map(h => (
                          <th key={h} className="px-2 py-1 text-left font-bold text-gray-500 dark:text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-slate-800">
                          {rawHeaders.slice(0, 6).map(h => (
                            <td key={h} className="px-2 py-1 text-gray-700 dark:text-slate-300 max-w-[120px] truncate">{String(row[h] || '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {getMappedPreview().length} data siap diimport
                </span>
              </div>

              <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-gray-100 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800">
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="px-3 py-2 text-left font-bold text-gray-500 dark:text-slate-400">No</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500 dark:text-slate-400">Tahun</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500 dark:text-slate-400">Uraian</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500 dark:text-slate-400">Tanggal</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500 dark:text-slate-400">Jenis</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500 dark:text-slate-400">Arsip</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500 dark:text-slate-400">Ket Arsip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getMappedPreview().map((item, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">{item.no}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{item.tahun}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-white max-w-[200px] truncate">{item.uraian || '-'}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-slate-400 whitespace-nowrap">{item.tanggal || '-'}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {item.jenisDokumen || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {item.arsip ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">Ya</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-500">Tidak</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{item.ketArsip || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex justify-between">
          <button
            onClick={step === 'upload' ? handleClose : () => setStep(step === 'preview' ? 'mapping' : 'upload')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm"
          >
            <ArrowLeft size={14} />
            {step === 'upload' ? 'Batal' : 'Kembali'}
          </button>

          {step === 'mapping' && (
            <button
              onClick={() => {
                if (!mapping.uraian) {
                  showToast('Field "Uraian" wajib di-map!', 'error');
                  return;
                }
                setStep('preview');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-sm"
            >
              Lanjut Preview
              <ArrowRight size={14} />
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-sm"
            >
              <CheckCircle2 size={14} />
              Import {getMappedPreview().length} Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
