import { X, Download, Link2, Share2, Edit3, Eye, FileText } from 'lucide-react';

export interface ProdukHukumDetailItem {
  id: string;
  no: number;
  tahun: string;
  uraian: string;
  tanggal: string;
  tanggalDiundangkan: string;
  jenisDokumen: string;
  arsip: boolean;
  ketArsip: string;
  ketLain: string;
  linkFile: string;
  documentData: string | null;
  documentName: string;
}

interface Props {
  item: ProdukHukumDetailItem | null;
  kindLabel: string;
  onClose: () => void;
  onEdit: (item: ProdukHukumDetailItem) => void;
  onShare: (item: ProdukHukumDetailItem) => void;
  onViewDocument: (data: string | null, name: string) => void;
}

function formatDateID(dateStr: string): string {
  if (!dateStr || dateStr === '-' || dateStr === 'Tidak Tahu') return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function downloadDocument(item: ProdukHukumDetailItem) {
  if (!item.documentData) return;
  try {
    const byteCharacters = atob(item.documentData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.documentName || 'Dokumen.pdf';
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // abaikan
  }
}

export default function ProdukHukumDetailModal({ item, kindLabel, onClose, onEdit, onShare, onViewDocument }: Props) {
  if (!item) return null;

  const rows: Array<[string, string]> = [
    ['Nomor', item.no != null && item.no !== undefined ? String(item.no) : '-'],
    ['Tahun', item.tahun || '-'],
    ['Tanggal Penetapan', formatDateID(item.tanggal)],
    ['Tanggal Diundangkan', formatDateID(item.tanggalDiundangkan)],
    ['Jenis Dokumen', item.jenisDokumen || '-'],
    ['Status Arsip', item.arsip ? `Arsip${item.ketArsip ? ` • ${item.ketArsip}` : ''}` : 'Aktif'],
    ['Keterangan Lain', item.ketLain || '-'],
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {kindLabel}
              </span>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1 leading-snug">
                {item.uraian || 'Tanpa keterangan'}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <dl className="divide-y divide-gray-100 dark:divide-slate-800">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 py-2">
                <dt className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider shrink-0 pt-0.5">{label}</dt>
                <dd className="text-xs font-semibold text-gray-900 dark:text-white text-right">{value}</dd>
              </div>
            ))}
            <div className="flex items-start justify-between gap-4 py-2">
              <dt className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider shrink-0 pt-0.5">Tautan File</dt>
              <dd className="text-xs font-semibold text-right">
                {item.linkFile ? (
                  <a href={item.linkFile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gray-700 dark:text-slate-200 hover:underline">
                    <Link2 className="w-3.5 h-3.5" /> Buka Link
                  </a>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-2">
              <dt className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider shrink-0 pt-0.5">Lampiran</dt>
              <dd className="text-xs font-semibold text-gray-900 dark:text-white text-right">
                {item.documentData ? (item.documentName || 'Ada file') : '-'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40">
          {item.documentData && (
            <>
              <button
                onClick={() => onViewDocument(item.documentData, item.documentName)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Lihat Dokumen
              </button>
              <button
                onClick={() => downloadDocument(item)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Unduh
              </button>
            </>
          )}
          <button
            onClick={() => onShare(item)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" /> Salin Link
          </button>
          <button
            onClick={() => onEdit(item)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
