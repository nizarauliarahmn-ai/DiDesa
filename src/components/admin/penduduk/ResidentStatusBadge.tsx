import React, { useState, useEffect } from 'react';
import { checkResidentDetailedStatus, reactivateResident, ResidentCheckResult } from '../../../utils/residentSync';
import { CheckCircle2, AlertTriangle, UserPlus, RefreshCw, UserCheck } from 'lucide-react';

interface ResidentStatusBadgeProps {
  nik?: string;
  name?: string;
  onOpenQuickAdd?: (nik?: string, name?: string) => void;
  onStatusVerified?: (isVerifiedActive: boolean) => void;
}

export const ResidentStatusBadge: React.FC<ResidentStatusBadgeProps> = ({
  nik,
  name,
  onOpenQuickAdd,
  onStatusVerified
}) => {
  const [checkResult, setCheckResult] = useState<ResidentCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmReactivate, setShowConfirmReactivate] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  useEffect(() => {
    const cleanNik = (nik && nik !== '-' && nik.trim() !== '') ? nik.trim() : '';
    const cleanName = (name && name !== '-' && name.trim() !== '') ? name.trim() : '';

    if (!cleanNik && !cleanName) {
      setCheckResult(null);
      if (onStatusVerified) onStatusVerified(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const res = await checkResidentDetailedStatus(cleanNik, cleanName);
      setCheckResult(res);
      setIsLoading(false);
      if (onStatusVerified) {
        onStatusVerified(res.exists);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [nik, name]);

  const handleReactivate = async () => {
    if (!nik) return;
    setIsReactivating(true);
    const success = await reactivateResident(nik);
    setIsReactivating(false);
    setShowConfirmReactivate(false);

    if (success) {
      setIsLoading(true);
      const res = await checkResidentDetailedStatus(nik, name);
      setCheckResult(res);
      setIsLoading(false);
      if (onStatusVerified) onStatusVerified(res.exists);
    }
  };

  if (!nik && !name) return null;

  return (
    <div className="mt-2 text-xs">
      {isLoading ? (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
          <span>Memeriksa status warga...</span>
        </div>
      ) : checkResult?.statusType === 'active' ? (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl font-medium shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Warga Terdaftar &amp; Aktif di Data Desa</span>
        </div>
      ) : checkResult?.statusType === 'inactive' ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-xl font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Terdaftar (Status: <strong>{checkResult.reason}</strong>)</span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmReactivate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-sm transition-all text-xs cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Aktifkan Kembali Warga</span>
          </button>
        </div>
      ) : checkResult?.statusType === 'not_found' ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-xl font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Warga Belum Terdaftar di Data Desa</span>
          </div>

          {onOpenQuickAdd && (
            <button
              type="button"
              onClick={() => onOpenQuickAdd(nik, name)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-semibold shadow-md transition-all text-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Tambah Warga Baru</span>
            </button>
          )}
        </div>
      ) : null}

      {/* Reactivate Confirmation Modal */}
      {showConfirmReactivate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Konfirmasi Aktivasi Warga
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Warga atas nama <strong>{name || checkResult?.resident?.name || 'Warga'}</strong> (NIK: <strong>{nik}</strong>) saat ini tercatat dengan status <span className="font-semibold text-amber-600">{checkResult?.reason}</span>.
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Apakah Anda yakin ingin mengubah status warga ini kembali menjadi <strong className="text-emerald-600">Aktif</strong> agar dapat diproses suratnya dan muncul di Data Desa?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmReactivate(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReactivate}
                disabled={isReactivating}
                className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {isReactivating && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Ya, Aktifkan Kembali</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
