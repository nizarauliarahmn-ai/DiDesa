import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X, Search, Upload, Camera, Database, CheckCircle2, AlertTriangle, Loader2,
  FileSpreadsheet, FileText, Scan, UserPlus, Trash2, RefreshCw, Zap, QrCode
} from 'lucide-react';
import { read, utils } from 'xlsx';
import { supabase } from '../../../utils/supabase';
import { resolveCurrentTenant } from '../../../utils/tenantResolver';
import { showToast } from '../../../utils/toast';
import { runKtpOcr, isKtpResultValid } from '../../../utils/ktpOcr';

interface RecipientRow {
  nik: string;
  name: string;
  registered: boolean;
}

interface AdminBantuanTambahPenerimaProps {
  onClose: () => void;
  onRefresh: () => void;
  existingResidents: any[];
  initialProgram?: string;
}

const PROGRAM_OPTIONS = [
  "BLT Dana Desa",
  "Program Keluarga Harapan (PKH)",
  "Bantuan Pangan Non-Tunai",
  "Bantuan Sosial Tunai (BST)"
];

type TabId = 'manual' | 'import' | 'scan';

export default function AdminBantuanTambahPenerima({
  onClose,
  onRefresh,
  existingResidents,
  initialProgram = "BLT Dana Desa"
}: AdminBantuanTambahPenerimaProps) {
  const [tab, setTab] = useState<TabId>('manual');
  const [program, setProgram] = useState(initialProgram);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [saving, setSaving] = useState(false);

  // ── Tab 1: Manual ──
  const [manualQuery, setManualQuery] = useState("");
  const [selectedNiks, setSelectedNiks] = useState<RecipientRow[]>([]);

  // ── Tab 2: Import ──
  const [parsedRows, setParsedRows] = useState<RecipientRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);

  // ── Tab 3: Scan ──
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scannedRows, setScannedRows] = useState<RecipientRow[]>([]);

  const aidTag = `${program} (${year})`;

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch (e) {
      setCameraError('Kamera tidak dapat diakses. Gunakan unggah foto sebagai alternatif.');
    }
  }, []);

  // ── Manual autocomplete ──
  const manualResults = useMemo(() => {
    const q = manualQuery.trim().toLowerCase();
    const already = new Set(selectedNiks.map(r => r.nik));
    let list = existingResidents.filter(r => r.is_deleted !== 1 && !already.has(r.nik));
    if (q) {
      list = list.filter(r =>
        r.name?.toLowerCase().includes(q) || r.nik?.includes(q)
      );
    }
    return list.slice(0, 6);
  }, [manualQuery, existingResidents, selectedNiks]);

  const lookupResident = useCallback((nik: string) => {
    return existingResidents.find(r => r.nik === nik && r.is_deleted !== 1) || null;
  }, [existingResidents]);

  // ── File parsing (Excel / CSV / PDF) ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setParsing(true);
    setParsedRows([]);
    setFileName(file.name);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let rows: RecipientRow[] = [];
      const seen = new Set<string>();

      if (ext === 'pdf') {
        const buf = await file.arrayBuffer();
        const text = new TextDecoder('latin1').decode(buf);
        const niks = text.match(/\b\d{16}\b/g) || [];
        for (const nik of niks) {
          if (seen.has(nik)) continue;
          seen.add(nik);
          const found = lookupResident(nik);
          rows.push({ nik, name: found?.name || 'NIK Tidak Dikenali', registered: !!found });
        }
      } else {
        let workbook;
        if (ext === 'csv') {
          const text = await file.text();
          workbook = read(text, { type: 'string' });
        } else {
          const buf = await file.arrayBuffer();
          workbook = read(buf, { type: 'array' });
        }
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) throw new Error("File tidak memiliki sheet data.");
        const json = utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        if (json.length < 2) throw new Error("File kosong atau tidak memiliki data.");

        const headers = json[0].map(h => String(h).toLowerCase().trim());
        const nikIdx = headers.findIndex(h => h.includes('nik') || h.includes('ktp'));
        const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name'));
        if (nikIdx === -1 || nameIdx === -1) throw new Error("Kolom NIK dan Nama wajib ada di file Anda.");

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;
          const nik = String(row[nikIdx] || '').replace(/\D/g, '').trim();
          if (nik.length !== 16 || seen.has(nik)) continue;
          seen.add(nik);
          const name = String(row[nameIdx] || '').trim();
          const found = lookupResident(nik);
          rows.push({ nik, name: found?.name || name || 'NIK Tidak Dikenali', registered: !!found });
        }
      }

      if (rows.length === 0) {
        showToast("Tidak ada NIK (16 digit) yang ditemukan dalam file.", "error");
        setFileName("");
        return;
      }
      setParsedRows(rows);
      showToast(`Berhasil membaca ${rows.length} baris data.`, "success");
    } catch (err: any) {
      showToast(err.message || "Gagal membaca file.", "error");
      setFileName("");
    } finally {
      setParsing(false);
    }
  };

  // ── OCR Camera Scan ──
  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !cameraOn) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setIsProcessing(true);
      setProgress(0.05);
      try {
        const result = await runKtpOcr(blob, (p) => setProgress(Math.round(p * 100)));
        if (!isKtpResultValid(result)) {
          showToast("NIK (16 digit) tidak terdeteksi. Posisikan KTP lebih jelas & datar.", "error");
          setProgress(0);
          return;
        }
        const nik = result.nik;
        if (scannedRows.some(r => r.nik === nik)) {
          showToast("NIK ini sudah ditambahkan.", "info");
          return;
        }
        const found = lookupResident(nik);
        const row: RecipientRow = {
          nik,
          name: result.nama || found?.name || 'NIK Tidak Dikenali',
          registered: !!found
        };
        setScannedRows(prev => [...prev, row]);
        showToast(`✓ OCR sukses — ${row.name || nik} ditambahkan.`, "success");
      } catch (e) {
        showToast("Gagal membaca KTP. Silakan coba lagi.", "error");
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    }, 'image/jpeg', 0.9);
  }, [cameraOn, lookupResident, scannedRows]);

  const handleScanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsProcessing(true);
    setProgress(0.05);
    runKtpOcr(file, (p) => setProgress(Math.round(p * 100))).then(async (result) => {
      if (!isKtpResultValid(result)) {
        showToast("NIK (16 digit) tidak terdeteksi dari foto.", "error");
        return;
      }
      const nik = result.nik;
      if (scannedRows.some(r => r.nik === nik)) {
        showToast("NIK ini sudah ditambahkan.", "info");
        return;
      }
      const found = lookupResident(nik);
      setScannedRows(prev => [...prev, { nik, name: result.nama || found?.name || 'NIK Tidak Dikenali', registered: !!found }]);
      showToast(`✓ OCR sukses — ${result.nama || nik} ditambahkan.`, "success");
    }).catch(() => {
      showToast("Gagal membaca KTP. Silakan coba lagi.", "error");
    }).finally(() => {
      setIsProcessing(false);
      setProgress(0);
    });
  };

  // ── Save ──
  const saveRows = async (rows: RecipientRow[], source: string) => {
    const valid = rows.filter(r => r.registered);
    if (valid.length === 0) {
      showToast("Tidak ada NIK terdaftar di database penduduk yang bisa diproses.", "error");
      return;
    }
    setSaving(true);
    let added = 0;
    let skipped = 0;
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) throw new Error("Gagal mengidentifikasi tenant.");

      for (const row of valid) {
        try {
          const currentAids = await getCurrentAids(row.nik);
          if (!currentAids.includes(aidTag)) {
            await supabase
              .from('residents')
              .update({ active_aids: [...currentAids, aidTag] })
              .eq('nik', row.nik)
              .eq('tenant_id', tenantId);
          }
          await supabase.from('bansos_recipients').insert({
            tenant_id: tenantId,
            program_id: program,
            resident_id: row.nik,
            nama: row.name,
            tahun: Number(year),
            status: 'aktif',
            source,
            created_at: new Date().toISOString()
          });
          added++;
        } catch (err) {
          skipped++;
        }
      }

      showToast(
        `Berhasil menambahkan ${added} penerima ke program ${program} (${year}).${skipped > 0 ? ` ${skipped} gagal.` : ''}`,
        added > 0 ? 'success' : 'error'
      );
      onRefresh();
      onClose();
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan data.", "error");
    } finally {
      setSaving(false);
    }
  };

  const getCurrentAids = async (nik: string): Promise<string[]> => {
    const resident = existingResidents.find(r => r.nik === nik);
    if (resident) {
      return Array.isArray(resident.activeAids) ? resident.activeAids : [];
    }
    const { data } = await supabase.from('residents').select('active_aids').eq('nik', nik).maybeSingle();
    const raw = data?.active_aids;
    return typeof raw === 'string' ? JSON.parse(raw || '[]') : (raw || []);
  };

  const manualRegistered = selectedNiks.filter(r => r.registered).length;
  const parsedRegistered = parsedRows.filter(r => r.registered).length;
  const scannedRegistered = scannedRows.filter(r => r.registered).length;

  const renderBadge = (row: RecipientRow) => row.registered ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
      <CheckCircle2 className="w-3.5 h-3.5" /> Terdaftar di DB Desa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
      <AlertTriangle className="w-3.5 h-3.5" /> NIK Belum Terdaftar
    </span>
  );

  const renderRowList = (rows: RecipientRow[], onRemove: (nik: string) => void) => (
    <div className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
      <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800">
        {rows.length === 0 ? (
          <p className="p-5 text-center text-xs text-gray-400 font-medium">Belum ada data.</p>
        ) : rows.map(row => (
          <div key={row.nik} className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-gray-800 dark:text-slate-100 truncate">{row.name}</p>
              <p className="text-[11px] font-mono font-bold text-gray-500 dark:text-slate-400">NIK: {row.nik}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {renderBadge(row)}
              <button onClick={() => onRemove(row.nik)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer" title="Hapus">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const TabButton = ({ id, label, icon }: { id: TabId; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
        tab === id
          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
          : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-emerald-300 hover:text-emerald-700'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-8 border border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex justify-between items-start">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">Tambah Penerima Bantuan</span>
            <h3 className="text-xl font-extrabold mt-1.5">Import Massal & Scan Kamera</h3>
            <p className="text-xs text-emerald-100 mt-0.5">Tambahkan penerima lewat pencarian manual, file Excel/CSV/PDF, atau scan KTP.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Program & Tahun */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/50 dark:bg-slate-800/40">
          <div>
            <label className="block text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Program Bantuan Sosial</label>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {PROGRAM_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Tahun Penyaluran</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="p-6 pb-3 flex gap-2.5">
          <TabButton id="manual" label="Pilih Manual" icon={<Search className="w-4 h-4" />} />
          <TabButton id="import" label="Import File" icon={<FileSpreadsheet className="w-4 h-4" />} />
          <TabButton id="scan" label="Scan Kamera" icon={<Scan className="w-4 h-4" />} />
        </div>

        {/* Tab Content */}
        <div className="px-6 pb-6 space-y-4 max-h-[55vh] overflow-y-auto">
          {/* ─── TAB 1: MANUAL ─── */}
          {tab === 'manual' && (
            <>
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama atau NIK warga..."
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm font-semibold bg-white dark:bg-slate-900"
                />
              </div>
              {manualQuery.trim() !== "" && (
                <div className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-gray-50 dark:divide-slate-800 max-h-[240px] overflow-y-auto">
                  {manualResults.length === 0 ? (
                    <p className="p-4 text-center text-xs text-gray-400 font-medium">Warga tidak ditemukan atau sudah dipilih.</p>
                  ) : manualResults.map(r => (
                    <button
                      key={r.nik}
                      onClick={() => {
                        setSelectedNiks(prev => [...prev, { nik: r.nik, name: r.name, registered: true }]);
                        setManualQuery("");
                      }}
                      className="w-full p-3.5 text-left hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors flex justify-between items-center cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-extrabold text-gray-800 dark:text-slate-100">{r.name}</p>
                        <p className="text-[11px] font-mono font-bold text-gray-500 dark:text-slate-400">NIK: {r.nik}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-100">Pilih</span>
                    </button>
                  ))}
                </div>
              )}
              {renderRowList(selectedNiks, nik => setSelectedNiks(prev => prev.filter(r => r.nik !== nik)))}
            </>
          )}

          {/* ─── TAB 2: IMPORT ─── */}
          {tab === 'import' && (
            <>
              <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-2xl p-8 text-center hover:bg-emerald-50/30 dark:hover:bg-slate-800/40 transition-colors relative cursor-pointer bg-white dark:bg-slate-900">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf,text/csv"
                  onChange={handleFileUpload}
                  disabled={parsing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {parsing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                    <p className="text-sm font-bold text-gray-700 dark:text-slate-300">Membaca file...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-bold text-gray-800 dark:text-white mb-1">Klik atau Tarik File Kesini</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                      Format <strong>.xlsx / .xls / .csv / .pdf</strong>. Baris pertama harus berisi kolom <strong>NIK</strong> dan <strong>Nama</strong> (untuk PDF: NIK 16 digit diekstrak otomatis).
                    </p>
                  </>
                )}
              </div>

              {fileName && (
                <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300 truncate">{fileName}</span>
                  </div>
                  <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg whitespace-nowrap">{parsedRows.length} Data</span>
                </div>
              )}

              {parsedRows.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" /> ✓ {parsedRegistered} NIK Terdaftar di DB Desa
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-red-50 text-red-700 border border-red-200">
                      <AlertTriangle className="w-4 h-4" /> ⚠️ {parsedRows.length - parsedRegistered} NIK Belum Terdaftar
                    </span>
                  </div>
                  {renderRowList(parsedRows, nik => setParsedRows(prev => prev.filter(r => r.nik !== nik)))}
                  {parsedRows.length > parsedRegistered && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 font-semibold">
                      {parsedRows.length - parsedRegistered} NIK belum terdaftar di database penduduk dan akan dilewati. Daftarkan warga di Modul Penduduk terlebih dahulu.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {/* ─── TAB 3: SCAN ─── */}
          {tab === 'scan' && (
            <>
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-black relative" style={{ aspectRatio: '16/10' }}>
                {!isProcessing && cameraOn && (
                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
                )}
                {!isProcessing && cameraOn && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-[55%] border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                  </div>
                )}
                {isProcessing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/85 backdrop-blur-sm">
                    <div className="w-12 h-12 relative">
                      <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
                    </div>
                    <p className="text-white text-sm font-bold">Membaca data KTP...</p>
                    <p className="text-emerald-400 text-xs font-black">{progress}%</p>
                  </div>
                )}
                {!cameraOn && !isProcessing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-center p-6">
                    <Camera className="w-10 h-10 text-slate-500" />
                    <p className="text-white text-sm font-bold">Kamera belum aktif</p>
                    {cameraError && <p className="text-rose-400 text-xs max-w-sm font-semibold">{cameraError}</p>}
                    <button
                      onClick={startCamera}
                      className="mt-1 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" /> Nyalakan Kamera
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={handleCapture}
                  disabled={!cameraOn || isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" /> Ambil Foto KTP
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Unggah Foto KTP
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleScanUpload} />
              </div>

              {scannedRows.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" /> {scannedRegistered} Terdaftar
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-red-50 text-red-700 border border-red-200">
                      <AlertTriangle className="w-4 h-4" /> {scannedRows.length - scannedRegistered} Belum Terdaftar
                    </span>
                  </div>
                  {renderRowList(scannedRows, nik => setScannedRows(prev => prev.filter(r => r.nik !== nik)))}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50/50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500 dark:text-slate-400 font-semibold">
            {tab === 'manual' && <span>Terpilih: <strong className="text-emerald-700">{manualRegistered}</strong> penerima</span>}
            {tab === 'import' && <span>Siap diproses: <strong className="text-emerald-700">{parsedRegistered}</strong> penerima</span>}
            {tab === 'scan' && <span>Hasil scan: <strong className="text-emerald-700">{scannedRegistered}</strong> penerima</span>}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
              Batal
            </button>
            <button
              onClick={() => {
                if (tab === 'manual') saveRows(selectedNiks, 'manual');
                if (tab === 'import') saveRows(parsedRows, 'import');
                if (tab === 'scan') saveRows(scannedRows, 'scan');
              }}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {saving ? "Menyimpan..." : (
                tab === 'import' ? `🚀 Proses Impor [${parsedRegistered}] Penerima` :
                tab === 'scan' ? `Simpan [${scannedRegistered}] Hasil Scan` :
                `Simpan [${manualRegistered}] Penerima`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
