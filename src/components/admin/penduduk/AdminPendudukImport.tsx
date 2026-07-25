import React, { useState, useMemo } from 'react';
import { X, Upload, Download, Check, CheckCircle, AlertCircle, ArrowRight, FileText, Database, Loader2 } from 'lucide-react';
import { read, utils } from 'xlsx';
import { showToast } from '../../../utils/toast';

interface AdminPendudukImportProps {
  onClose: () => void;
  onRefresh: () => void;
}

const FIELD_DEFINITIONS = [
  { key: 'nik', label: 'NIK (Nomor Induk Kependudukan)', required: true, synonyms: ['nik', 'ktp', 'nomor induk', 'no. ktp', 'no ktp', 'id'] },
  { key: 'name', label: 'Nama Lengkap', required: true, synonyms: ['nama', 'lengkap', 'name', 'nama lengkap', 'nama_lengkap'] },
  { key: 'noKk', label: 'Nomor Kartu Keluarga (KK)', required: false, synonyms: ['kk', 'no kk', 'no. kk', 'kartu keluarga', 'nomor kk'] },
  { key: 'gender', label: 'Jenis Kelamin', required: false, synonyms: ['kelamin', 'gender', 'sex', 'jk', 'l/p', 'jenis kelamin'] },
  { key: 'birthPlace', label: 'Tempat Lahir', required: false, synonyms: ['tempat lahir', 'tempat', 'birth place', 'tempat_lahir'] },
  { key: 'birthDate', label: 'Tanggal Lahir', required: false, synonyms: ['tanggal lahir', 'tanggal', 'birth date', 'tanggal_lahir'] },
  { key: 'bloodType', label: 'Golongan Darah', required: false, synonyms: ['golongan darah', 'goldar', 'blood', 'gol_darah'] },
  { key: 'religion', label: 'Agama', required: false, synonyms: ['agama', 'religion'] },
  { key: 'job', label: 'Pekerjaan', required: false, synonyms: ['pekerjaan', 'kerja', 'job', 'work'] },
  { key: 'maritalStatus', label: 'Status Perkawinan', required: false, synonyms: ['status', 'perkawinan', 'marital', 'status kawin', 'status_kawin'] },
  { key: 'rt', label: 'RT', required: false, synonyms: ['rt', 'rukun tetangga'] },
  { key: 'rw', label: 'RW', required: false, synonyms: ['rw', 'rukun warga'] },
  { key: 'desa', label: 'Desa', required: false, synonyms: ['desa', 'kelurahan', 'desa_kelurahan'] },
  { key: 'address', label: 'Alamat', required: false, synonyms: ['alamat', 'jalan', 'address'] },
  { key: 'domicileStatus', label: 'Status Domisili', required: false, synonyms: ['domisili', 'domicile', 'status domisili'] },
  { key: 'familyRelation', label: 'Hubungan Keluarga', required: false, synonyms: ['hubungan', 'family relation', 'hubungan keluarga'] },
  { key: 'education', label: 'Pendidikan', required: false, synonyms: ['pendidikan', 'sekolah', 'education', 'pendidikan terakhir'] },
  { key: 'fatherName', label: 'Nama Ayah', required: false, synonyms: ['ayah', 'bapak', 'father', 'nama ayah'] },
  { key: 'motherName', label: 'Nama Ibu', required: false, synonyms: ['ibu', 'mama', 'mother', 'nama ibu'] },
];

// Helper function to dynamically parse CSV with auto-detected delimiter
function parseCSV(text: string): string[][] {
  const firstLine = text.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  let delimiter = ',';
  if (semicolonCount > commaCount) delimiter = ';';
  if (tabCount > semicolonCount && tabCount > commaCount) delimiter = '\t';

  const lines: string[][] = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // skip
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      row.push("");
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }

  // Filter out completely empty rows
  return lines.filter(r => r.some(cell => cell.trim() !== ""));
}

export default function AdminPendudukImport({ onClose, onRefresh }: AdminPendudukImportProps) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Column Mapping, 3: Preview, 4: Success
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [importProcessing, setImportProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count: number; error?: string } | null>(null);

  // Parse CSV and enter column mapping state
  const handleCSVContentLoaded = (text: string) => {
    const parsed = parseCSV(text);
    if (parsed.length < 2) {
      showToast("Format CSV tidak valid atau data kosong. Harap sertakan baris header dan minimal satu baris data.", "error");
      return;
    }

    const headers = parsed[0].map(h => h.trim());
    const dataRows = parsed.slice(1);

    setCsvHeaders(headers);
    setCsvRows(dataRows);

    // Automap based on synonyms
    const initialMapping: Record<string, number> = {};
    FIELD_DEFINITIONS.forEach(field => {
      const matchedIdx = headers.findIndex(h => {
        const lowerH = h.toLowerCase();
        return field.synonyms.some(syn => lowerH.includes(syn) || syn.includes(lowerH));
      });
      if (matchedIdx !== -1) {
        initialMapping[field.key] = matchedIdx;
      }
    });

    setColumnMapping(initialMapping);
    setStep(2);
  };

  // Helper to process both CSV and Excel
  const processFile = (file: File) => {
    setFileName(file.name);
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          handleCSVContentLoaded(event.target.result);
        }
      };
      reader.readAsText(file, "UTF-8");
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          try {
            const data = new Uint8Array(event.target.result as ArrayBuffer);
            const workbook = read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const csvString = utils.sheet_to_csv(worksheet);
            handleCSVContentLoaded(csvString);
          } catch (error) {
            showToast("Gagal membaca file Excel", "error");
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      showToast("Mohon unggah file dengan format .csv atau .xlsx", "error");
    }
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Calculate parsed residents based on current mapping
  const mappedResidents = useMemo(() => {
    return csvRows.map((row) => {
      const res: any = {};
      FIELD_DEFINITIONS.forEach((field) => {
        const headerIdx = columnMapping[field.key];
        let val = '';
        if (headerIdx !== undefined && headerIdx !== -1 && row[headerIdx] !== undefined) {
          val = row[headerIdx].trim();
        }
        res[field.key] = val;
      });

      // Validations and Normalizations
      // NIK
      res.nik = (res.nik || '').replace(/[^0-9]/g, ''); // strip spaces/chars
      
      // Initials generator
      if (res.name) {
        const words = res.name.split(/\s+/);
        res.initials = words.slice(0, 2).map((w: string) => w[0]?.toUpperCase() || '').join('');
      } else {
        res.initials = '??';
      }

      // Gender normalization
      if (res.gender) {
        const lowerGen = res.gender.toLowerCase();
        if (lowerGen.startsWith('l') || lowerGen.includes('pria') || lowerGen.includes('laki')) {
          res.gender = 'Laki-laki';
          res.genderColor = 'blue';
        } else {
          res.gender = 'Perempuan';
          res.genderColor = 'pink';
        }
      } else {
        res.gender = 'Laki-laki';
        res.genderColor = 'blue';
      }

      // Age parse with birthDate dynamic calculation fallback
      let parsedAge = parseInt(res.age || '');
      if (isNaN(parsedAge) || !parsedAge) {
        if (res.birthDate) {
          let birthYear = NaN;
          // Format YYYY-MM-DD or YYYY/MM/DD
          const matchYmd = res.birthDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
          if (matchYmd) {
            birthYear = parseInt(matchYmd[1]);
          } else {
            // Format DD-MM-YYYY or DD/MM/YYYY
            const matchDmy = res.birthDate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
            if (matchDmy) {
              birthYear = parseInt(matchDmy[3]);
            } else {
              const parsedDate = new Date(res.birthDate);
              if (!isNaN(parsedDate.getTime())) {
                birthYear = parsedDate.getFullYear();
              }
            }
          }
          const currentYear = new Date().getFullYear();
          if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= currentYear) {
            parsedAge = currentYear - birthYear;
          }
        }
      }
      res.age = parsedAge || 30;

      // Status Perkawinan normalization
      if (res.maritalStatus) {
        const lowerStatus = res.maritalStatus.toLowerCase();
        if (lowerStatus.includes('belum') || lowerStatus.includes('single') || lowerStatus === 'b') {
          res.maritalStatus = 'Belum Kawin';
        } else if (lowerStatus.includes('cerai mati')) {
          res.maritalStatus = 'Cerai Mati';
        } else if (lowerStatus.includes('cerai')) {
          res.maritalStatus = 'Cerai Hidup';
        } else {
          res.maritalStatus = 'Kawin';
        }
      } else {
        res.maritalStatus = 'Belum Kawin';
      }

      // Default status
      res.status = 'Aktif';
      res.statusColor = 'emerald';

      // RT/RW formatting
      const rtVal = (res.rt || '').padStart(2, '0');
      const rwVal = (res.rw || '').padStart(2, '0');
      res.rt = rtVal;
      res.rw = rwVal;
      res.rtRw = `${rtVal} / ${rwVal}`;

      // Default values
      res.desa = res.desa || 'Sukamaju';
      res.activeAids = [];
      res.domicileStatus = res.domicileStatus || 'Sesuai KTP';
      res.familyRelation = res.familyRelation || 'Anggota Keluarga';
      res.education = res.education || 'SMA / Sederajat';

      return res;
    });
  }, [csvRows, columnMapping]);

  // Check validation status
  const validationResults = useMemo(() => {
    let validCount = 0;
    let invalidCount = 0;
    const details = mappedResidents.map((res, idx) => {
      const errors: string[] = [];
      if (!res.nik || res.nik.length !== 16) {
        errors.push(`NIK harus berupa 16 digit angka (Terbaca: ${res.nik?.length || 0} digit)`);
      }
      if (!res.name || res.name.trim() === '') {
        errors.push('Nama Lengkap tidak boleh kosong');
      }

      if (errors.length > 0) {
        invalidCount++;
      } else {
        validCount++;
      }

      return {
        index: idx,
        name: res.name || '(Kosong)',
        nik: res.nik || '(Kosong)',
        errors,
        isValid: errors.length === 0,
      };
    });

    return { validCount, invalidCount, details };
  }, [mappedResidents]);

  // Trigger batch upload to backend
  const handleConfirmImport = () => {
    // Only import valid rows
    const validResidents = mappedResidents.filter((_, idx) => validationResults.details[idx].isValid);

    if (validResidents.length === 0) {
      showToast("Tidak ada data valid yang siap diimpor. Harap periksa kolom pemetaan Anda.", "error");
      return;
    }

    setImportProcessing(true);
    setStep(4);

    fetch('/api/residents/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(validResidents)
    })
      .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
      .then((data) => {
        setImportProcessing(false);
        if (data.success) {
          setImportResult({ success: true, count: data.count });
          onRefresh();
        } else {
          setImportResult({ success: false, count: 0, error: data.error || 'Terjadi kesalahan saat mengimpor.' });
        }
      })
      .catch((err) => {
        setImportProcessing(false);
        setImportResult({ success: false, count: 0, error: err.message || 'Koneksi ke server gagal.' });
      });
  };

  const handleSampleTemplateDownload = () => {
    const headers = ['NIK', 'No KK', 'Nama Lengkap', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Golongan Darah', 'Agama', 'Pekerjaan', 'Status Perkawinan', 'RT', 'RW', 'Hubungan Keluarga', 'Pendidikan', 'Nama Ayah', 'Nama Ibu'];
    const sampleRow = ['3201020405060009', '320412008890009', 'Nizar Aulia Rahman', 'Laki-laki', 'Bandung', '1995-10-12', 'B', 'Islam', 'Programmer', 'Belum Kawin', '02', '01', 'Kepala Keluarga', 'Sarjana (S1)', 'Supriadi', 'Maimunah'];
    
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Data_Penduduk.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Wisaya Impor Data Penduduk</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Impor ratusan data penduduk real dari file Excel/CSV secara instan.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Progress Indicator */}
        {step < 4 && (
          <div className="px-8 py-3 border-b border-slate-50 bg-white dark:bg-slate-900 grid grid-cols-3 text-xs font-bold text-slate-400">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-emerald-700' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-emerald-700 text-white font-black' : step > 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800'}`}>1</span>
              <span>Unggah File / Tempel</span>
            </div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-emerald-700' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-emerald-700 text-white font-black' : step > 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800'}`}>2</span>
              <span>Pemetaan Kolom</span>
            </div>
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-emerald-700' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-emerald-700 text-white font-black' : 'bg-slate-100 dark:bg-slate-800'}`}>3</span>
              <span>Pratinjau & Validasi</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: Upload / Paste */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100/50 p-4 rounded-2xl">
                <div className="text-emerald-900 text-xs font-medium space-y-0.5">
                  <p className="font-bold">Tips untuk Pemula:</p>
                  <p className="text-emerald-800">Unduh template CSV, masukkan data real Anda ke Excel, lalu simpan sebagai file CSV dan unggah di sini.</p>
                </div>
                <button 
                  onClick={handleSampleTemplateDownload}
                  className="flex items-center gap-1.5 bg-white dark:bg-slate-900 text-emerald-700 hover:bg-emerald-100/30 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template CSV</span>
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-3xl p-8 text-center bg-slate-50/50 hover:bg-emerald-50/10 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] relative group"
                onClick={() => document.getElementById('modal-file-upload')?.click()}
              >
                <input 
                  type="file" 
                  id="modal-file-upload" 
                  accept=".csv, .txt, .xlsx, .xls" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-sm dark:shadow-none group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Pilih file CSV atau seret ke sini</p>
                <p className="text-xs text-slate-400 mt-1">Mendukung format file .csv (Pemisah koma atau titik koma)</p>
              </div>

              <div className="flex items-center gap-3 my-4">
                <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Atau Tempel Teks CSV</span>
                <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
              </div>

              {/* Text Area Paste */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Tempel Teks CSV Anda (Kolom pertama harus Header):</label>
                <textarea 
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="NIK,Nama Lengkap,Jenis Kelamin,RT,RW&#10;3201020405060009,Aulia Rahman,Laki-laki,01,02"
                  rows={6}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none placeholder:text-slate-300"
                />
                {csvText.trim().length > 0 && (
                  <button 
                    onClick={() => handleCSVContentLoaded(csvText)}
                    className="w-full py-3 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Lanjut dengan Teks yang Ditempel</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 text-blue-800 border border-blue-100/50 rounded-2xl text-xs font-medium space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Pencocokan Kolom Otomatis Selesai!
                </p>
                <p>Silakan sesuaikan kolom dari file Excel Anda (kiri) agar cocok dengan bidang data penduduk di sistem (kanan).</p>
              </div>

              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto shadow-sm dark:shadow-none">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-xs tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Bidang Data Penduduk</th>
                      <th className="px-5 py-3">Kolom File Excel / CSV Anda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {FIELD_DEFINITIONS.map((field) => {
                      const selectedVal = columnMapping[field.key] !== undefined ? columnMapping[field.key] : -1;
                      return (
                        <tr key={field.key} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 dark:text-slate-100">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1 font-extrabold">*</span>}
                              </span>
                              <span className="text-[10px] text-slate-400">Bidang database: `{field.key}`</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <select
                              value={selectedVal}
                              onChange={(e) => {
                                const idx = parseInt(e.target.value);
                                setColumnMapping(prev => ({ ...prev, [field.key]: idx }));
                              }}
                              className={`w-full p-2 rounded-lg border outline-none text-xs font-semibold cursor-pointer ${
                                selectedVal !== -1 
                                  ? 'border-emerald-200 bg-emerald-50/30 text-emerald-800' 
                                  : field.required 
                                    ? 'border-red-200 bg-red-50/30 text-red-800' 
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <option value={-1}>{field.required ? '-- Pilih Kolom Wajib --' : '-- Jangan Impor Bidang Ini --'}</option>
                              {csvHeaders.map((header, idx) => (
                                <option key={idx} value={idx}>{header}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button 
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors"
                >
                  Kembali
                </button>
                <button 
                  onClick={() => {
                    // Check if required fields are mapped
                    const unmappedRequired = FIELD_DEFINITIONS.filter(f => f.required && (columnMapping[f.key] === undefined || columnMapping[f.key] === -1));
                    if (unmappedRequired.length > 0) {
                      showToast(`Silakan petakan kolom wajib: ${unmappedRequired.map(f => f.label).join(', ')}`, "error");
                      return;
                    }
                    setStep(3);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold transition-colors shadow-sm dark:shadow-none flex items-center gap-1.5"
                >
                  <span>Lanjut ke Pratinjau</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Validation */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl flex items-center gap-3 border border-emerald-100/50">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs font-semibold">
                    <p className="font-extrabold text-sm">{validationResults.validCount} Data Valid</p>
                    <p className="text-emerald-700">Siap diimpor secara langsung ke dalam database.</p>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl flex items-center gap-3 border ${validationResults.invalidCount > 0 ? 'bg-amber-50 text-amber-800 border-amber-100/50' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                  {validationResults.invalidCount > 0 ? (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  ) : (
                    <Check className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                  <div className="text-xs font-semibold">
                    <p className="font-extrabold text-sm">{validationResults.invalidCount} Data Bermasalah</p>
                    <p className={validationResults.invalidCount > 0 ? 'text-amber-700' : 'text-slate-400'}>
                      {validationResults.invalidCount > 0 
                        ? 'Data ini tidak akan diimpor karena NIK tidak valid atau nama kosong.' 
                        : 'Semua data bebas dari masalah!'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  Pratinjau Data Mapped (Maksimal 10 Baris Pertama)
                </div>
                <div className="max-h-[250px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 text-slate-500 dark:text-slate-400 text-[10px] font-extrabold tracking-wider border-b border-slate-100 dark:border-slate-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">NIK</th>
                        <th className="px-4 py-2.5">Nama Lengkap</th>
                        <th className="px-4 py-2.5">Jenis Kelamin</th>
                        <th className="px-4 py-2.5">RT/RW</th>
                        <th className="px-4 py-2.5">Status Perkawinan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {mappedResidents.slice(0, 10).map((res, idx) => {
                        const validation = validationResults.details[idx];
                        return (
                          <tr key={idx} className={validation.isValid ? 'hover:bg-slate-50/30' : 'bg-red-50/10 hover:bg-red-50/20'}>
                            <td className="px-4 py-2.5">
                              {validation.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 font-bold rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700">
                                  <Check className="w-3 h-3" /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 font-bold rounded-md bg-red-50 border border-red-100 text-red-700" title={validation.errors.join(', ')}>
                                  <AlertCircle className="w-3 h-3" /> Error
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400 font-medium">{res.nik || '(Kosong)'}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{res.name || '(Kosong)'}</td>
                            <td className="px-4 py-2.5">{res.gender}</td>
                            <td className="px-4 py-2.5 font-mono">{res.rtRw}</td>
                            <td className="px-4 py-2.5">{res.maritalStatus}</td>
                          </tr>
                        );
                      })}
                      {mappedResidents.length > 10 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-center text-xs font-bold text-slate-400 bg-slate-50/30">
                            + {mappedResidents.length - 10} data lainnya disembunyikan di pratinjau...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button 
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors"
                >
                  Kembali
                </button>
                <button 
                  onClick={handleConfirmImport}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold transition-colors shadow-sm dark:shadow-none flex items-center gap-1.5"
                >
                  <span>Mulai Impor {validationResults.validCount} Data</span>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Processing / Success / Error */}
          {step === 4 && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              {importProcessing ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center animate-spin mb-2">
                    <Loader2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Sedang Mengunggah & Menyinkronkan Data...</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">Data sedang divalidasi dan diunggah ke database aktif Anda (Supabase/PostgreSQL/Memory). Mohon tunggu sebentar.</p>
                </>
              ) : importResult?.success ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 animate-bounce">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">Impor Berhasil! 🎉</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md font-medium">
                    Selamat! <span className="font-extrabold text-slate-800 dark:text-slate-100">{importResult.count} data penduduk</span> berhasil disimpan dan disinkronkan ke dalam database dengan aman.
                  </p>
                  <button 
                    onClick={() => {
                      onClose();
                    }}
                    className="mt-6 px-8 py-3 bg-emerald-700 text-white font-bold rounded-xl text-xs hover:bg-emerald-800 transition-colors shadow-md dark:shadow-none"
                  >
                    Selesai & Tutup
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">Impor Gagal</h4>
                  <p className="text-sm text-red-500 max-w-md font-semibold">
                    {importResult?.error || 'Gagal menyimpan data ke server.'}
                  </p>
                  <button 
                    onClick={() => setStep(3)}
                    className="mt-6 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors"
                  >
                    Kembali untuk Mencoba Lagi
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
