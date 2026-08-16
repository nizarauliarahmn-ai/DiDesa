import {
  X, MapPin, User, FolderOpen, AlertTriangle, CheckCircle2, Ban,
  Layers, Link2, CalendarDays, Edit2, FileText, Clock
} from 'lucide-react';
import type { UsulanDesa } from './AdminUsulanDesa';
import { findSimilarUsulan, tokenOverlapSimilarity } from '../../utils/similarity';

interface Props {
  usulan: UsulanDesa;
  allUsulan: UsulanDesa[];
  onClose: () => void;
  onEdit: (u: UsulanDesa) => void;
}

export default function UsulanDetailModal({ usulan, allUsulan, onClose, onEdit }: Props) {
  const similar = findSimilarUsulan(allUsulan, usulan);

  const tagColor = (tag: string) => {
    const t = (tag || '').toLowerCase();
    if (t.includes('rkpdes')) return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    if (t.includes('musrenbang')) return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  };

  // ── Kronologi status (timeline) ──
  const steps: { label: string; detail: string; color: string }[] = [];
  steps.push({
    label: 'Usulan diajukan',
    detail: new Date(usulan.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
    color: 'bg-gray-100 dark:bg-slate-800',
  });
  (usulan.diteruskan_tags || []).forEach(tag => {
    const t = (tag || '').toLowerCase();
    if (t.includes('rkpdes')) {
      steps.push({ label: 'Ditarik ke RKPDes', detail: tag, color: 'bg-purple-100 dark:bg-purple-950/40' });
    } else if (t.includes('musrenbang')) {
      steps.push({ label: 'Diusulkan ke Musrenbang', detail: tag, color: 'bg-blue-100 dark:bg-blue-950/40' });
    }
  });
  if (usulan.status_terakomodir && usulan.status_terakomodir !== 'Belum') {
    steps.push({
      label: usulan.status_terakomodir === 'Ditolak' ? 'Ditolak' : 'Terakomodir (APBDes)',
      detail: usulan.status_terakomodir,
      color: usulan.status_terakomodir === 'Ditolak'
        ? 'bg-gray-100 dark:bg-slate-800'
        : 'bg-emerald-100 dark:bg-emerald-950/40',
    });
  }
  if (steps.length === 1) {
    steps.push({ label: 'Belum diteruskan', detail: 'Menunggu peninjauan RKPDes / Musrenbang', color: 'bg-gray-100 dark:bg-slate-800' });
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{usulan.uraian_usulan}</span>
            </h3>
            <p className="text-[11px] font-mono font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{usulan.kode_usulan}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Detail ringkas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3.5">
              <p className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3" /> Sektor
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-100 mt-1">{usulan.kategori}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3.5">
              <p className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Lokasi RT/RW / Dusun
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-100 mt-1">{usulan.lokasi_rt_rw || '—'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3.5">
              <p className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" /> Pengusul
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-100 mt-1">{usulan.pengusul || '—'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3.5">
              <p className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Dibuat
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-100 mt-1">
                {new Date(usulan.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Status terakomodir + diteruskan */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
              usulan.status_terakomodir === 'Belum'
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                : usulan.status_terakomodir === 'Ditolak'
                  ? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            }`}>
              {usulan.status_terakomodir === 'Belum' ? <AlertTriangle className="w-3 h-3" /> : usulan.status_terakomodir === 'Ditolak' ? <Ban className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              {usulan.status_terakomodir}
            </span>
            {(usulan.diteruskan_tags || []).map((tag, i) => (
              <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${tagColor(tag)}`}>
                <Link2 className="w-3 h-3" /> {tag}
              </span>
            ))}
            {usulan.skala_prioritas != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                Prioritas {usulan.skala_prioritas}
              </span>
            )}
          </div>

          {/* Kronologi */}
          <div>
            <p className="text-xs font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Kronologi Status
            </p>
            <div className="space-y-0">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${s.color.split(' ')[0]}`} />
                    {i < steps.length - 1 && <span className="w-px flex-1 bg-gray-200 dark:bg-slate-700" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{s.label}</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Foto / Lampiran */}
          <div>
            <p className="text-xs font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
              <FolderOpen className="w-3.5 h-3.5" /> Foto &amp; Lampiran Dokumen
            </p>
            {usulan.foto_url || usulan.google_drive_view_url ? (
              <div className="flex flex-wrap items-start gap-3">
                {usulan.foto_url && (
                  <img src={usulan.foto_url} alt="Dokumentasi lokasi" className="w-40 h-40 rounded-xl object-cover border border-gray-200 dark:border-slate-700" />
                )}
                <div className="flex flex-col gap-2">
                  {usulan.google_drive_view_url && (
                    <a
                      href={usulan.google_drive_view_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> Buka di Google Drive Desa
                    </a>
                  )}
                  {usulan.google_drive_download_url && (
                    <a
                      href={usulan.google_drive_download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> Unduh Lampiran
                    </a>
                  )}
                  {!usulan.google_drive_view_url && (
                    <span className="text-[11px] text-gray-400">Tidak ada lampiran Google Drive.</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-4 text-center text-xs text-gray-400 dark:text-slate-500">
                Belum ada foto / lampiran dokumen untuk usulan ini.
              </div>
            )}
          </div>

          {/* Keterangan */}
          <div>
            <p className="text-xs font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Keterangan Tambahan</p>
            {usulan.keterangan ? (
              <p className="text-sm text-gray-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{usulan.keterangan}</p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-slate-500">— Tidak ada catatan —</p>
            )}
          </div>

          {/* Similarity warning */}
          {similar.length > 0 && (
            <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 p-4">
              <p className="text-xs font-black text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> {similar.length} Usulan Serupa Terdeteksi
              </p>
              <div className="mt-2.5 space-y-1.5">
                {similar.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-orange-100 dark:border-orange-900/50">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono font-black text-emerald-700 dark:text-emerald-300">{s.kode_usulan}</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-slate-300 truncate">{s.uraian_usulan}</p>
                    </div>
                    <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 whitespace-nowrap shrink-0">
                      {Math.round(tokenOverlapSimilarity(usulan.uraian_usulan, s.uraian_usulan) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            onClick={() => onEdit(usulan)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white bg-emerald-700 hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4" /> Edit Usulan
          </button>
        </div>
      </div>
    </div>
  );
}
