import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw, Trash2, RotateCcw, AlertCircle, ArrowLeft } from 'lucide-react';
import { showToast } from '../../../utils/toast';
import { supabase } from '../../../utils/supabase';
import { resolveCurrentTenant } from '../../../utils/tenantResolver';

interface Resident {
  nik: string;
  name: string;
  noKk?: string;
  gender?: string;
  rtRw?: string;
}

export default function AdminPendudukArchive({ onBack }: { onBack: () => void }) {
  const [archived, setArchived] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningNik, setActioningNik] = useState<string | null>(null);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) {
        setArchived([]);
        return;
      }

      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('tenant_id', tenantId)
        .or('is_deleted.eq.1,status.eq.archived,status.eq.deleted');

      if (!error && data) {
        setArchived(data.map((r: any) => ({
          nik: r.nik,
          name: r.name,
          noKk: r.no_kk || r.noKk,
          gender: r.gender,
          rtRw: r.rt_rw || r.rtRw
        })));
      } else {
        throw error || new Error('Gagal memuat arsip');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Gagal memuat tong sampah data penduduk', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, []);

  const [confirmModal, setConfirmModal] = useState<{ action: 'restore' | 'delete', nik: string, name: string } | null>(null);

  const executeRestore = async (nik: string, name: string) => {
    setActioningNik(nik);
    try {
      const tenantId = await resolveCurrentTenant();
      const { error } = await supabase
        .from('residents')
        .update({ is_deleted: 0, status: 'Aktif', status_color: 'emerald' })
        .eq('nik', nik)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      showToast(`Data ${name} berhasil dipulihkan dari Tong Sampah!`, 'success');
      
      // Log notification
      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`,
        tenant_id: tenantId,
        title: "Penduduk Dipulihkan",
        message: `Data penduduk ${name} (NIK: ${nik}) telah dipulihkan (Restore) dari Tong Sampah.`,
        category: "Residents",
        is_read: false,
        timestamp: new Date().toISOString()
      }]);
      window.dispatchEvent(new Event('notifications_updated'));

      await fetchArchived();
      window.dispatchEvent(new Event('village_settings_updated'));
      setConfirmModal(null);
    } catch (err: any) {
      showToast(`Gagal memulihkan: ${err.message}`, 'error');
    } finally {
      setActioningNik(null);
    }
  };

  const executeHardDelete = async (nik: string, name: string) => {
    setActioningNik(nik);
    try {
      const tenantId = await resolveCurrentTenant();
      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('nik', nik)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      showToast(`Data ${name} berhasil dihapus permanen!`, 'success');
      
      // Log notification
      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`,
        tenant_id: tenantId,
        title: "Data Penduduk Dihapus Permanen",
        message: `Data penduduk ${name} (NIK: ${nik}) telah dihapus permanen dari sistem.`,
        category: "Residents",
        is_read: false,
        timestamp: new Date().toISOString()
      }]);
      window.dispatchEvent(new Event('notifications_updated'));

      await fetchArchived();
      setConfirmModal(null);
    } catch (err: any) {
      showToast(`Gagal menghapus: ${err.message}`, 'error');
    } finally {
      setActioningNik(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-none"
    >
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack}
          className="p-2 bg-gray-50 dark:bg-slate-800 text-gray-500 hover:text-gray-900 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Trash2 className="text-rose-500" size={24} />
          Tong Sampah (Recycle Bin Data Penduduk)
        </h2>
      </div>

      <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 p-4 rounded-xl flex items-start gap-3 mb-6">
        <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-rose-800 dark:text-rose-300">
          Data di bawah ini adalah data penduduk yang telah dipindahkan ke <strong>Tong Sampah (Recycle Bin)</strong>. 
          Data ini akan terhapus otomatis secara permanen setelah 30 hari. Super Admin dapat memulihkannya (*Restore*) kembali ke tabel utama atau menghapusnya secara permanen.
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-10 h-10 text-emerald-700 animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-500">Memuat tong sampah...</p>
        </div>
      ) : archived.length === 0 ? (
        <div className="py-24 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
          <Trash2 className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-gray-500 dark:text-slate-400">Tong sampah kosong. Tidak ada data penduduk yang terhapus.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-100 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">NIK / No. KK</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nama Penduduk</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {archived.map(r => (
                  <motion.tr 
                    key={r.nik}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{r.nik}</div>
                      <div className="text-[10px] text-gray-400 font-mono">KK: {r.noKk || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                      {r.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setConfirmModal({ action: 'restore', nik: r.nik, name: r.name })}
                          disabled={actioningNik === r.nik}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 border border-emerald-100 dark:border-emerald-800/30 cursor-pointer"
                        >
                          <RotateCcw size={14} /> Restore (Pulihkan)
                        </button>
                        <button
                          onClick={() => setConfirmModal({ action: 'delete', nik: r.nik, name: r.name })}
                          disabled={actioningNik === r.nik}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 border border-rose-100 dark:border-rose-800/30 cursor-pointer"
                        >
                          <Trash2 size={14} /> Hapus Permanen
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Konfirmasi Restore / Hard Delete */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" 
              onClick={() => setConfirmModal(null)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-md border border-gray-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-4 mb-5">
                <div className={`p-4 rounded-2xl shrink-0 ${confirmModal.action === 'restore' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                  {confirmModal.action === 'restore' ? (
                    <RotateCcw className="w-8 h-8" strokeWidth={2.5} />
                  ) : (
                    <Trash2 className="w-8 h-8" strokeWidth={2.5} />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                    {confirmModal.action === 'restore' ? 'Pulihkan Data?' : 'Hapus Permanen?'}
                  </h3>
                  <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mt-1">
                    Aksi oleh Super Admin
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800/80 p-5 rounded-2xl mb-8 border border-gray-100 dark:border-slate-700/50">
                <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                  Apakah Anda yakin ingin {confirmModal.action === 'restore' ? 'memulihkan' : 'menghapus permanen'} data penduduk <strong>{confirmModal.name}</strong> (NIK: <span className={`font-mono font-bold ${confirmModal.action === 'restore' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{confirmModal.nik}</span>)?
                </p>
                
                {confirmModal.action === 'delete' && (
                  <div className="mt-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 p-4 rounded-xl flex gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-800 dark:text-rose-300 font-medium leading-relaxed">
                      Data yang dihapus permanen akan hilang selamanya dan tidak dapat dikembalikan lagi dalam bentuk apa pun.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-3.5 px-4 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal.action === 'restore') executeRestore(confirmModal.nik, confirmModal.name);
                    else executeHardDelete(confirmModal.nik, confirmModal.name);
                  }}
                  disabled={actioningNik !== null}
                  className={`flex-1 py-3.5 px-4 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                    confirmModal.action === 'restore' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {actioningNik ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : confirmModal.action === 'restore' ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Pulihkan
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Hapus
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
