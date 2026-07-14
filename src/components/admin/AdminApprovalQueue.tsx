import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X, ShieldAlert, User, Calendar, Trash2, ArrowRightLeft, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { showToast } from '../../utils/toast';

interface PendingApprovalItem {
  nik: string;
  name: string;
  gender: string;
  rtRw: string;
  birthPlace: string;
  birthDate: string;
  pendingMeta: {
    nik: string;
    name: string;
    actionType: 'delete' | 'move' | 'edit' | 'status_change';
    originalStatus: string;
    requestDate: string;
    details?: any;
  };
}

export default function AdminApprovalQueue() {
  const [approvals, setApprovals] = useState<PendingApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningNik, setActioningNik] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<PendingApprovalItem | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/approvals', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setApprovals(data);
      } else {
        throw new Error('Gagal mengambil antrean konfirmasi');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal memuat antrean konfirmasi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (nik: string, name: string, actionType: 'delete' | 'move' | 'edit' | 'status_change') => {
    setActioningNik(nik);
    try {
      const res = await fetch(`/api/residents/${nik}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        showToast(
          `Pengajuan ${actionType === 'delete' ? 'Hapus' : actionType === 'move' ? 'Pindah' : 'Perubahan'} untuk warga ${name} berhasil disetujui!`,
          'success'
        );
        // Refresh
        await fetchApprovals();
        // Dispatch global event to update notifications count if any
        window.dispatchEvent(new Event('notifications_updated'));
      } else {
        throw new Error('Gagal memproses persetujuan.');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses persetujuan.', 'error');
    } finally {
      setActioningNik(null);
    }
  };

  const handleReject = async (nik: string, name: string, actionType: 'delete' | 'move' | 'edit' | 'status_change') => {
    setActioningNik(nik);
    try {
      const res = await fetch(`/api/residents/${nik}/reject`, {
        method: 'POST',
      });
      if (res.ok) {
        showToast(
          `Pengajuan ${actionType === 'delete' ? 'Hapus' : actionType === 'move' ? 'Pindah' : 'Perubahan'} untuk warga ${name} telah ditolak. Status kembali normal.`,
          'info'
        );
        // Refresh
        await fetchApprovals();
        // Dispatch global event
        window.dispatchEvent(new Event('notifications_updated'));
      } else {
        throw new Error('Gagal memproses penolakan.');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses penolakan.', 'error');
    } finally {
      setActioningNik(null);
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WITA';
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6">
      {/* Header section */}
      <div className="sticky top-16 z-40 bg-slate-50/60 dark:bg-slate-900/80 backdrop-blur-xl pb-4 -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Antrean Konfirmasi (Maker-Checker)</h1>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm dark:shadow-none">
              <ShieldAlert size={12} /> Verifikator Mode
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Daftar pengajuan aksi kependudukan dari operator admin yang memerlukan persetujuan Super Admin.
          </p>
        </div>
        <button
          onClick={fetchApprovals}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 text-sm font-bold rounded-xl shadow-sm dark:shadow-none transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={15} className={`${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Antrean</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-10 h-10 text-emerald-700 animate-spin mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-500 dark:text-slate-400">Memuat data antrean persetujuan...</p>
          </div>
        ) : approvals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/80 border-b border-gray-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Detail Warga</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Tipe Aksi</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Dibuat Oleh</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Tanggal Pengajuan</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap text-center">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                {approvals.map((item) => {
                  const actionType = item.pendingMeta?.actionType || 'delete';
                  const isDelete = actionType === 'delete';
                  const isMove = actionType === 'move';
                  const isEdit = actionType === 'edit';
                  const isStatus = actionType === 'status_change';

                  return (
                    <motion.tr key={item.nik} initial={{ opacity: 0, height: 0, scale: 0.95 }} animate={{ opacity: 1, height: "auto", scale: 1 }} exit={{ opacity: 0, scale: 0.9, height: 0, transition: { duration: 0.3 } }} className="hover:bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${item.gender === 'Perempuan' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                            {item.name ? item.name.substring(0, 2).toUpperCase() : 'WD'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</p>
                            <p className="text-xs font-mono text-gray-500 dark:text-slate-400">NIK: {item.nik} • RT/RW {item.rtRw}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm dark:shadow-none ${
                          isDelete ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                          isMove ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {isDelete ? <Trash2 size={13} /> : isMove ? <ArrowRightLeft size={13} /> : <FileText size={13} />}
                          <span>{isDelete ? 'Hapus' : isMove ? 'Pindah' : isEdit ? 'Edit Data' : 'Status'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                          <User size={14} className="text-gray-400" />
                          <span className="font-semibold">Operator (Staf Desa)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 font-medium">
                          <Calendar size={14} className="text-gray-400" />
                          <span>{formatDate(item.pendingMeta?.requestDate)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {(isEdit || isStatus) && item.pendingMeta?.details && (
                            <button
                              onClick={() => setSelectedDetails(item)}
                              className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm dark:shadow-none transition-all cursor-pointer"
                            >
                              <FileText size={14} />
                              <span>Lihat Detail</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleApprove(item.nik, item.name, actionType)}
                            disabled={actioningNik !== null}
                            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                          >
                            <Check size={14} />
                            <span>Setujui</span>
                          </button>
                          <button
                            onClick={() => handleReject(item.nik, item.name, actionType)}
                            disabled={actioningNik !== null}
                            className="px-3.5 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                          >
                            <X size={14} />
                            <span>Tolak</span>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm dark:shadow-none text-emerald-800">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Antrean Bersih</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
              Tidak ada pengajuan persetujuan data kependudukan yang tertunda saat ini. Semua pengajuan telah diverifikasi.
            </p>
          </div>
        )}
      </div>

      {/* Info Notice Box */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm dark:shadow-none max-w-4xl">
        <AlertCircle className="text-amber-700 w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-amber-900">Petunjuk Kebijakan Maker-Checker</h4>
          <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
            Sesuai regulasi keamanan data kependudukan desa, operator biasa (Admin) hanya bertindak sebagai <strong>Pembuat Pengajuan (Maker)</strong>. 
            Semua aksi perubahan, penghapusan, dan perpindahan warga harus divalidasi oleh <strong>Verifikator (Checker)</strong> yang merupakan Super Admin. 
            Aksi persetujuan bersifat permanen dan tidak dapat dibatalkan.
          </p>
        </div>
      </div>

      {/* Details Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Detail Perubahan Data</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Menampilkan perubahan yang diajukan untuk warga {selectedDetails.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDetails(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1 bg-white dark:bg-slate-900">
              <div className="divide-y divide-slate-100/80">
                {/* Header comparison row */}
                <div className="grid grid-cols-2 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200/60">
                  <div className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 dark:border-slate-800">
                    Data Saat Ini (Original)
                  </div>
                  <div className="p-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                    Data Baru (Diajukan)
                  </div>
                </div>

                {/* Comparison rows */}
                {[
                  { key: 'name', label: 'Nama Lengkap', current: selectedDetails.name, proposed: selectedDetails.pendingMeta?.details?.name },
                  { key: 'nik', label: 'NIK', current: selectedDetails.nik, proposed: selectedDetails.pendingMeta?.details?.nik },
                  { key: 'noKk', label: 'Nomor KK', current: (selectedDetails as any).noKk, proposed: selectedDetails.pendingMeta?.details?.noKk },
                  { key: 'gender', label: 'Jenis Kelamin', current: selectedDetails.gender, proposed: selectedDetails.pendingMeta?.details?.gender },
                  { key: 'birthPlace', label: 'Tempat Lahir', current: (selectedDetails as any).birthPlace, proposed: selectedDetails.pendingMeta?.details?.birthPlace },
                  { key: 'birthDate', label: 'Tanggal Lahir', current: (selectedDetails as any).birthDate, proposed: selectedDetails.pendingMeta?.details?.birthDate },
                  { key: 'rtRw', label: 'RT/RW', current: selectedDetails.rtRw, proposed: selectedDetails.pendingMeta?.details?.rtRw },
                  { key: 'status', label: 'Status Domisili', current: selectedDetails.pendingMeta?.originalStatus, proposed: selectedDetails.pendingMeta?.details?.status },
                  { key: 'job', label: 'Pekerjaan', current: (selectedDetails as any).job, proposed: selectedDetails.pendingMeta?.details?.job },
                  { key: 'address', label: 'Alamat', current: (selectedDetails as any).address, proposed: selectedDetails.pendingMeta?.details?.address },
                  { key: 'fatherName', label: 'Nama Ayah Kandung', current: (selectedDetails as any).fatherName, proposed: selectedDetails.pendingMeta?.details?.fatherName },
                  { key: 'motherName', label: 'Nama Ibu Kandung', current: (selectedDetails as any).motherName, proposed: selectedDetails.pendingMeta?.details?.motherName },
                  { key: 'religion', label: 'Agama', current: (selectedDetails as any).religion, proposed: selectedDetails.pendingMeta?.details?.religion },
                  { key: 'education', label: 'Pendidikan', current: (selectedDetails as any).education, proposed: selectedDetails.pendingMeta?.details?.education },
                  { key: 'maritalStatus', label: 'Status Perkawinan', current: (selectedDetails as any).maritalStatus, proposed: selectedDetails.pendingMeta?.details?.maritalStatus },
                  { key: 'bloodType', label: 'Golongan Darah', current: (selectedDetails as any).bloodType, proposed: selectedDetails.pendingMeta?.details?.bloodType },
                ]
                .filter(field => field.proposed !== undefined && field.proposed !== field.current)
                .map((field) => {
                  const isChanged = true; // Since we filtered, all are changed

                  return (
                    <div key={field.key} className="grid grid-cols-2 group transition-all duration-200 bg-amber-50/20">
                      <div className="p-4 border-r border-slate-100/80 bg-rose-50/20">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">{field.label}</p>
                        <p className="text-sm text-rose-600 font-bold">
                          {field.current || '-'}
                        </p>
                      </div>
                      <div className="p-4 bg-emerald-50/30">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">{field.label}</p>
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-emerald-700 font-bold">
                            {field.proposed || '-'}
                          </p>
                          <span className="animate-in fade-in zoom-in duration-300 text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tight shadow-sm dark:shadow-none shadow-emerald-200">
                            Berubah
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedDetails(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Tutup Detail
              </button>
              <button
                onClick={() => {
                  handleApprove(selectedDetails.nik, selectedDetails.name, selectedDetails.pendingMeta?.actionType || 'edit');
                  setSelectedDetails(null);
                }}
                disabled={actioningNik !== null}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-sm dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Check size={16} />
                <span>Setujui Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
