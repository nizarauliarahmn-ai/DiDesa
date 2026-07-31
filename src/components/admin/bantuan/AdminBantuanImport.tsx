import React, { useState } from 'react';
import { X, Upload, CheckCircle, Database, FileText, Loader2, AlertCircle } from 'lucide-react';
import { read, utils } from 'xlsx';
import { supabase } from '../../../utils/supabase';
import { resolveCurrentTenant } from '../../../utils/tenantResolver';
import { showToast } from '../../../utils/toast';

interface AdminBantuanImportProps {
  onClose: () => void;
  onRefresh: () => void;
  existingResidents: any[];
}

export default function AdminBantuanImport({ onClose, onRefresh, existingResidents }: AdminBantuanImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [program, setProgram] = useState('BLT Dana Desa');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: number; newResidents: number; failed: number } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (json.length < 2) throw new Error("File kosong atau tidak memiliki data");

      const headers = json[0].map(h => String(h).toLowerCase().trim());
      const nikIdx = headers.findIndex(h => h.includes('nik') || h.includes('ktp'));
      const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name'));

      if (nikIdx === -1 || nameIdx === -1) {
        throw new Error("Kolom NIK dan Nama wajib ada di file Excel/CSV Anda.");
      }

      const rows = [];
      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length === 0) continue;
        const nik = String(row[nikIdx] || '').trim();
        const name = String(row[nameIdx] || '').trim();
        if (nik && name) {
          rows.push({ nik, name });
        }
      }

      setParsedData(rows);
      setStep(2);
    } catch (err: any) {
      showToast(err.message || 'Gagal membaca file', 'error');
      setFile(null);
    }
  };

  const handleImport = async () => {
    setProcessing(true);
    let successCount = 0;
    let newResidentCount = 0;
    let failedCount = 0;
    
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) throw new Error("Gagal mengidentifikasi tenant.");

      const aidToSave = `${program} (${year})`;

      for (const row of parsedData) {
        try {
          const existing = existingResidents.find(r => r.nik === row.nik);
          
          if (existing) {
            // Update existing resident
            const currentAids = typeof existing.activeAids === 'string' ? JSON.parse(existing.activeAids) : (existing.activeAids || []);
            if (!currentAids.includes(aidToSave)) {
              const updatedAids = [...currentAids, aidToSave];
              await supabase.from('residents').update({ active_aids: updatedAids }).eq('nik', row.nik).eq('tenant_id', tenantId);
            }
            successCount++;
          } else {
            // Insert new resident
            const newResident = {
              tenant_id: tenantId,
              nik: row.nik,
              name: row.name,
              gender: 'Laki-laki',
              active_aids: [aidToSave]
            };
            await supabase.from('residents').insert([newResident]);
            newResidentCount++;
            successCount++;
          }
        } catch (e) {
          console.error("Gagal memproses NIK:", row.nik, e);
          failedCount++;
        }
      }
      
      setResult({ success: successCount, newResidents: newResidentCount, failed: failedCount });
      setStep(3);
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm font-sans">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Database className="text-emerald-600" /> Import Massal Bantuan Sosial
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Program Bantuan</label>
                  <select 
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="BLT Dana Desa">BLT Dana Desa</option>
                    <option value="Program Keluarga Harapan (PKH)">Program Keluarga Harapan (PKH)</option>
                    <option value="Bantuan Pangan Non-Tunai">Bantuan Pangan Non-Tunai (BPNT)</option>
                    <option value="Bantuan Sosial Tunai (BST)">Bantuan Sosial Tunai (BST)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tahun Penyaluran</label>
                  <input 
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative cursor-pointer">
                <input 
                  type="file" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Klik atau Tarik File Excel/CSV Kesini</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                  Pastikan file Anda memiliki header baris pertama yang memuat kolom <span className="font-bold">NIK</span> dan <span className="font-bold">Nama</span>.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl flex gap-3">
                <AlertCircle className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Verifikasi Data</p>
                  <p className="text-sm mt-1">Ditemukan <strong>{parsedData.length}</strong> data penerima {program} tahun {year}. NIK yang belum ada di database akan otomatis ditambahkan sebagai penduduk baru.</p>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">No</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">NIK</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">Nama</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">Status Penduduk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {parsedData.map((row, idx) => {
                      const isExisting = existingResidents.some(r => r.nik === row.nik);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{row.nik}</td>
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{row.name}</td>
                          <td className="px-4 py-3">
                            {isExisting ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Terdaftar</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Baru (Akan Ditambahkan)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button 
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleImport}
                  disabled={processing}
                  className="px-8 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 dark:shadow-none flex items-center gap-2 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="animate-spin w-5 h-5" /> : <Database className="w-5 h-5" />}
                  {processing ? 'Memproses...' : 'Mulai Sinkronisasi'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div className="text-center py-10">
              <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={48} />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">Import Selesai!</h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-lg mx-auto">
                Berhasil mensinkronkan <strong>{result.success}</strong> data penerima {program} tahun {year}.
                {result.newResidents > 0 && <span> Termasuk <strong>{result.newResidents}</strong> penduduk baru yang ditambahkan otomatis.</span>}
                {result.failed > 0 && <span className="text-red-500 block mt-2">Gagal memproses {result.failed} baris (cek konsol/log).</span>}
              </p>
              <button 
                onClick={onClose}
                className="px-8 py-3 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
              >
                Tutup & Kembali
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
