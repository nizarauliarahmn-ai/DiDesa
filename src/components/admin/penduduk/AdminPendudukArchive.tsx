import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw, Trash2, RotateCcw, AlertCircle, ArrowLeft } from 'lucide-react';
import { showToast } from '../../../utils/toast';

interface Resident {
  nik: string;
  name: string;
  noKk?: string;
  gender: string;
  rtRw: string;
}

export default function AdminPendudukArchive({ onBack }: { onBack: () => void }) {
  const [archived, setArchived] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningNik, setActioningNik] = useState<string | null>(null);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/residents/archived');
      if (res.ok) {
        const data = await res.json();
        setArchived(data);
      } else {
        throw new Error('Gagal memuat arsip');
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

  const handleRestore = async (nik: string, name: string) => {
    if (!confirm(`Kembalikan data ${name} ke tabel utama?`)) return;
    
    setActioningNik(nik);
    try {
      const res = await fetch(`/api/residents/${nik}/restore`, { method: 'POST' });
      if (res.ok) {
        showToast(`Data ${name} berhasil dikembalikan!`, 'success');
        await fetchArchived();
      } else {
        throw new Error('Gagal mengembalikan data');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActioningNik(null);
    }
  };

  const handleHardDelete = async (nik: string, name: string) => {
    if (!confirm(`PERINGATAN! Anda yakin ingin menghapus permanen data ${name}? Data tidak dapat dikembalikan lagi.`)) return;
    
    setActioningNik(nik);
    try {
      const res = await fetch(`/api/residents/${nik}/hard-delete`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Data ${name} berhasil dihapus permanen!`, 'success');
        await fetchArchived();
      } else {
        throw new Error('Gagal menghapus permanen');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
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
          className="p-2 bg-gray-50 dark:bg-slate-800 text-gray-500 hover:text-gray-900 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Trash2 className="text-rose-500" size={24} />
          Tong Sampah (Data Terhapus)
        </h2>
      </div>

      <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 p-4 rounded-xl flex items-start gap-3 mb-6">
        <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-rose-800 dark:text-rose-300">
          Data di bawah ini adalah data penduduk yang telah disetujui penghapusannya oleh Super Admin. 
          Anda dapat memulihkannya kembali atau menghapusnya secara permanen dari server.
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-10 h-10 text-emerald-700 animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-500">Memuat arsip...</p>
        </div>
      ) : archived.length === 0 ? (
        <div className="py-24 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
          <Trash2 className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-gray-500 dark:text-slate-400">Tong sampah kosong.</p>
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
                          onClick={() => handleRestore(r.nik, r.name)}
                          disabled={actioningNik === r.nik}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 border border-emerald-100 dark:border-emerald-800/30"
                        >
                          <RotateCcw size={14} /> Restore
                        </button>
                        <button
                          onClick={() => handleHardDelete(r.nik, r.name)}
                          disabled={actioningNik === r.nik}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 border border-rose-100 dark:border-rose-800/30"
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
    </motion.div>
  );
}
