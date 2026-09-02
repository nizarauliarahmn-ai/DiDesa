import { useState, useRef } from 'react';
import { Upload, Camera, FileText, X, Eye, Trash2, Image } from 'lucide-react';
import { showToast } from '../../../utils/toast';

interface DocumentUploadProps {
  value: string | null;
  onChange: (data: string | null, name: string) => void;
  label?: string;
}

export default function DocumentUpload({ value, onChange, label = 'Dokumen' }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran file maksimal 10MB!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onChange(result, file.name);
      setDocumentName(file.name);
      showToast('Dokumen berhasil diunggah!', 'success');
    };
    reader.onerror = () => {
      showToast('Gagal membaca file!', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleRemove = () => {
    onChange(null, '');
    setDocumentName('');
  };

  const isImage = value && /\.(jpg|jpeg|png|gif|webp)$/i.test(documentName);
  const isPDF = value && (documentName?.toLowerCase().endsWith('.pdf') || value?.includes('application/pdf'));

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400">{label}</label>
      
      {value ? (
        <div className="relative border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {/* Preview */}
          <div className="relative bg-gray-50 dark:bg-slate-800 p-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center shrink-0">
                {isPDF ? (
                  <FileText size={20} className="text-emerald-600" />
                ) : (
                  <Image size={20} className="text-emerald-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{documentName || 'Dokumen'}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400">
                  {isPDF ? 'PDF Document' : 'Image'} • {(value.length / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={() => {
                const event = new CustomEvent('open_document_viewer', { detail: { data: value, name: documentName } });
                window.dispatchEvent(event);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              <Eye size={14} /> Lihat
            </button>
            <div className="w-px bg-gray-100 dark:bg-slate-800" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Upload size={14} /> Ganti
            </button>
            <div className="w-px bg-gray-100 dark:bg-slate-800" />
            <button
              onClick={handleRemove}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-gray-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
          }`}
        >
          <Upload size={24} className={`mx-auto mb-2 ${isDragging ? 'text-emerald-600' : 'text-gray-400'}`} />
          <p className="text-sm font-semibold text-gray-600 dark:text-slate-400">
            Klik atau seret file ke sini
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
            PDF, JPG, PNG (maks. 10MB)
          </p>
          
          {/* Camera capture button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              cameraInputRef.current?.click();
            }}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <Camera size={14} /> Ambil Foto
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
