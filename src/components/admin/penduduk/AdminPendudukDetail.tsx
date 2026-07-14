import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Printer, Edit2, BarChart2, User, MapPin, Users, FileText, CheckCircle2, Plus, Trash2, X, ArrowRightLeft, ShieldAlert } from 'lucide-react';
import AdminPendudukPrint from './AdminPendudukPrint';
import { showToast } from '../../../utils/toast';
import { getResidentLetters } from '../../../utils/letterHistory';
import ConfirmModal from '../../common/ConfirmModal';

interface AdminPendudukDetailProps {
  onBack: () => void;
  onEdit?: () => void;
  data: any;
  residents?: any[];
  onSelectResident?: (resident: any) => void;
  onUpdateResident?: (updatedResident: any) => void;
  onNavigateToTab?: (tab: string) => void;
  onSetPresetResident?: (resident: any) => void;
}

export default function AdminPendudukDetail({ 
  onBack, 
  onEdit, 
  data, 
  residents = [], 
  onSelectResident,
  onUpdateResident,
  onNavigateToTab,
  onSetPresetResident
}: AdminPendudukDetailProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [showAidModal, setShowAidModal] = useState(false);
  const [selectedNewProgram, setSelectedNewProgram] = useState("BLT Dana Desa");
  const [isUpdatingAid, setIsUpdatingAid] = useState(false);
  const [aidError, setAidError] = useState("");

  // Custom confirm state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const residentLetters = useMemo(() => {
    if (!data?.nik) return [];
    return getResidentLetters(data.nik, data.name || "");
  }, [data]);

  const ALL_AID_PROGRAMS = useMemo(() => [
    "BLT Dana Desa",
    "Program Keluarga Harapan (PKH)",
    "Bantuan Pangan Non-Tunai"
  ], []);

  const availablePrograms = useMemo(() => {
    return ALL_AID_PROGRAMS.filter(p => !data?.activeAids?.includes(p));
  }, [data?.activeAids, ALL_AID_PROGRAMS]);

  useEffect(() => {
    if (availablePrograms.length > 0) {
      setSelectedNewProgram(availablePrograms[0]);
    }
  }, [availablePrograms]);

  const handleDeleteResident = () => {
    const authUser = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
    
    if (authUser.role === 'admin') {
      showConfirm(
        "Ajukan Penghapusan Warga",
        `Apakah Anda yakin ingin mengajukan permohonan hapus data warga ${data.name}? Pengajuan ini memerlukan persetujuan dari Super Admin (Verifikator).`,
        async () => {
          try {
            const res = await fetch(`/api/residents/${data.nik}/request-approval`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                actionType: 'delete',
                originalStatus: data.status || 'Belum Kawin'
              })
            });
            if (res.ok) {
              const result = await res.json();
              showToast(`Pengajuan hapus data warga ${data.name} berhasil diajukan ke Super Admin!`, "success");
              if (onUpdateResident) {
                onUpdateResident(result.resident);
              }
              onBack();
            } else {
              throw new Error("Gagal mengajukan permohonan hapus.");
            }
          } catch (e: any) {
            showToast(e.message || "Gagal mengajukan permohonan.", "error");
          }
        }
      );
    } else {
      // Super Admin deletes immediately
      showConfirm(
        "Hapus Data Penduduk (Permanen)",
        `Apakah Anda yakin ingin menghapus data warga ${data.name} secara langsung? Tindakan ini bersifat permanen dan seketika.`,
        async () => {
          try {
            const res = await fetch(`/api/residents/${data.nik}`, {
              method: 'DELETE',
            });
            if (res.ok) {
              showToast(`Data warga ${data.name} berhasil dihapus permanen!`, "success");
              onBack();
            } else {
              throw new Error("Gagal menghapus data warga.");
            }
          } catch (e: any) {
            showToast(e.message || "Gagal menghapus data warga.", "error");
          }
        }
      );
    }
  };

  const handleMoveResident = () => {
    const authUser = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
    
    if (authUser.role === 'admin') {
      showConfirm(
        "Ajukan Mutasi (Pindah) Warga",
        `Apakah Anda yakin ingin mengajukan permohonan mutasi pindah keluar wilayah untuk warga ${data.name}? Pengajuan ini memerlukan persetujuan dari Super Admin (Verifikator).`,
        async () => {
          try {
            const res = await fetch(`/api/residents/${data.nik}/request-approval`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                actionType: 'move',
                originalStatus: data.status || 'Belum Kawin'
              })
            });
            if (res.ok) {
              const result = await res.json();
              showToast(`Pengajuan mutasi pindah warga ${data.name} berhasil diajukan ke Super Admin!`, "success");
              if (onUpdateResident) {
                onUpdateResident(result.resident);
              }
              onBack();
            } else {
              throw new Error("Gagal mengajukan permohonan mutasi.");
            }
          } catch (e: any) {
            showToast(e.message || "Gagal mengajukan permohonan.", "error");
          }
        }
      );
    } else {
      // Super Admin moves/deletes immediately
      showConfirm(
        "Mutasi Warga (Pindah Keluar)",
        `Apakah Anda yakin ingin memproses mutasi pindah keluar secara langsung untuk warga ${data.name}? Data warga akan langsung dihapus dari sistem kependudukan aktif.`,
        async () => {
          try {
            const res = await fetch(`/api/residents/${data.nik}`, {
              method: 'DELETE',
            });
            if (res.ok) {
              showToast(`Data warga ${data.name} berhasil dimutasikan keluar!`, "success");
              onBack();
            } else {
              throw new Error("Gagal memproses mutasi warga.");
            }
          } catch (e: any) {
            showToast(e.message || "Gagal memproses mutasi warga.", "error");
          }
        }
      );
    }
  };

  const handleAddAid = async (programName: string) => {
    const currentAids = data?.activeAids || [];
    if (currentAids.includes(programName)) {
      setAidError("Program bantuan ini sudah aktif untuk warga tersebut.");
      return;
    }
    const updatedAids = [...currentAids, programName];
    setIsUpdatingAid(true);
    setAidError("");
    try {
      const res = await fetch(`/api/residents/${data.nik}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeAids: updatedAids })
      });
      if (res.ok) {
        const updatedResident = await res.json();
        if (onUpdateResident) {
          onUpdateResident(updatedResident);
        }
        showToast(`Program bantuan "${programName}" berhasil diaktifkan untuk ${data.name}!`, "success");
      } else {
        throw new Error("Gagal menyimpan data bantuan.");
      }
    } catch (e: any) {
      setAidError(e.message || "Gagal menyambung ke server.");
      showToast(`Gagal mengaktifkan program bantuan: ${e.message || "Gagal menyambung ke server"}`, "error");
    } finally {
      setIsUpdatingAid(false);
    }
  };

  const handleRemoveAidDirect = (programName: string) => {
    showConfirm(
      "Hentikan Program Bantuan",
      `Apakah Anda yakin ingin menghentikan bantuan "${programName}" untuk warga ${data.name}?`,
      async () => {
        const currentAids = data?.activeAids || [];
        const updatedAids = currentAids.filter((aid: string) => aid !== programName);
        setIsUpdatingAid(true);
        setAidError("");
        try {
          const res = await fetch(`/api/residents/${data.nik}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activeAids: updatedAids })
          });
          if (res.ok) {
            const updatedResident = await res.json();
            if (onUpdateResident) {
              onUpdateResident(updatedResident);
            }
            showToast(`Program bantuan "${programName}" berhasil dihentikan untuk ${data.name}!`, "success");
          } else {
            throw new Error("Gagal memperbarui data bantuan.");
          }
        } catch (e: any) {
          setAidError(e.message || "Gagal menyambung ke server.");
          showToast(`Gagal menghentikan program bantuan: ${e.message || "Gagal menyambung ke server"}`, "error");
        } finally {
          setIsUpdatingAid(false);
        }
      }
    );
  };

  // Dynamically calculate family members with the same noKk from the entire residents list
  const familyMembers = useMemo(() => {
    const noKk = data?.noKk || data?.no_kk;
    if (!noKk) {
      // Fallback/Mock list if no real data is loaded
      return [
        {
          nik: data?.nik || "320412003840001",
          name: data?.name || "Ahmad Bukhori",
          familyRelation: data?.familyRelation || "Kepala Keluarga",
          gender: data?.gender || "Laki-laki"
        },
        {
          nik: "320412003850002",
          name: "Siti Aminah",
          familyRelation: "Istri",
          gender: "Perempuan"
        },
        {
          nik: "320412005080003",
          name: "Rizky Pratama",
          familyRelation: "Anak",
          gender: "Laki-laki"
        }
      ];
    }

    // Filter residents with the same KK number
    const filtered = residents.filter((r: any) => (r.noKk === noKk || r.no_kk === noKk));
    
    if (filtered.length === 0) {
      // If we only have the current resident, return them
      return [
        {
          nik: data.nik,
          name: data.name,
          familyRelation: data.familyRelation || "Kepala Keluarga",
          gender: data.gender || "Laki-laki"
        }
      ];
    }

    // Sort so 'Kepala Keluarga' is at the top, followed by 'Istri', followed by others (like 'Anak')
    return [...filtered].sort((a: any, b: any) => {
      const relationPriority = (relation: string) => {
        const r = (relation || '').toLowerCase();
        if (r.includes('kepala')) return 1;
        if (r.includes('istri')) return 2;
        if (r.includes('anak')) return 3;
        return 4;
      };
      return relationPriority(a.familyRelation) - relationPriority(b.familyRelation);
    });
  }, [data, residents]);

  if (isPrinting) {
    return <AdminPendudukPrint data={data} onBack={() => setIsPrinting(false)} />;
  }

  const isPending = data?.status === 'pending_approval';

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6">
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm dark:shadow-none animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-950 uppercase tracking-wider">Pengajuan Verifikasi Tertunda (Maker-Checker)</h4>
            <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
              Data warga ini sedang dalam proses review oleh <strong>Super Admin (Verifikator)</strong>. Tindakan modifikasi, mutasi, atau penghapusan dinonaktifkan sementara sampai pengajuan disetujui atau ditolak.
            </p>
          </div>
        </div>
      )}

      {/* Header Actions & Navigation */}
      <div className="sticky top-16 z-40 bg-slate-50/60 backdrop-blur-xl pb-4 -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8 border-b border-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-all text-gray-600 dark:text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Detail Data Penduduk</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (onSetPresetResident && onNavigateToTab) {
                onSetPresetResident(data);
                onNavigateToTab('surat');
              }
            }}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm dark:shadow-none transition-all flex items-center gap-2 text-sm"
          >
            <FileText className="w-4 h-4" />
            Buat Surat
          </button>
          <button 
            onClick={() => setIsPrinting(true)}
            className="px-5 py-2.5 rounded-lg border border-emerald-700 text-emerald-700 font-bold hover:bg-emerald-50 transition-all flex items-center gap-2 text-sm shadow-sm dark:shadow-none bg-white dark:bg-slate-900"
          >
            <Printer className="w-4 h-4" />
            Cetak Profil
          </button>
          {!isPending && (
            <>
              <button onClick={onEdit} className="px-5 py-2.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 shadow-sm dark:shadow-none transition-all flex items-center gap-2 text-sm">
                <Edit2 className="w-4 h-4" />
                Edit Data
              </button>
              <button onClick={handleMoveResident} className="px-5 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-bold hover:bg-amber-100 shadow-sm dark:shadow-none transition-all flex items-center gap-2 text-sm">
                <ArrowRightLeft className="w-4 h-4" />
                Mutasi Warga
              </button>
              <button onClick={handleDeleteResident} className="px-5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold hover:bg-rose-100 shadow-sm dark:shadow-none transition-all flex items-center gap-2 text-sm">
                <Trash2 className="w-4 h-4" />
                Hapus Warga
              </button>
              <button 
                onClick={() => {
                  const authUser = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
                  if (authUser.role === 'admin') {
                    showConfirm(
                      "Ajukan Status Meninggal",
                      `Apakah Anda yakin ingin mengajukan permohonan status 'Meninggal' untuk warga ${data.name}? Pengajuan ini memerlukan persetujuan dari Super Admin (Verifikator).`,
                      async () => {
                        const updated = { ...data, status: 'Meninggal', statusColor: 'gray' };
                        try {
                          const res = await fetch(`/api/residents/${data.nik}/request-approval`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ actionType: 'status_change', originalStatus: data.status, details: updated })
                          });
                          if (res.ok) {
                            showToast(`Pengajuan status meninggal ${data.name} berhasil!`, "success");
                            onBack();
                          } else {
                            throw new Error("Gagal mengajukan permohonan.");
                          }
                        } catch (e: any) {
                          showToast(e.message || "Gagal mengajukan permohonan.", "error");
                        }
                      }
                    );
                  } else {
                    showConfirm(
                      "Tandai Meninggal",
                      `Apakah Anda yakin ingin menandai warga ${data.name} sebagai 'Meninggal'?`,
                      async () => {
                        const updated = { ...data, status: 'Meninggal', statusColor: 'gray' };
                        try {
                          const res = await fetch(`/api/residents/${data.nik}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updated)
                          });
                          if (res.ok) {
                            showToast(`Data ${data.name} berhasil diperbarui sebagai 'Meninggal'!`, "success");
                            onBack();
                          } else {
                            throw new Error("Gagal memperbarui data.");
                          }
                        } catch (e: any) {
                          showToast(e.message || "Gagal memperbarui data.", "error");
                        }
                      }
                    );
                  }
                }}
                className="px-5 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 shadow-sm dark:shadow-none transition-all flex items-center gap-2 text-sm"
              >
                <X className="w-4 h-4" />
                Tandai Meninggal
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Identity Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>
            <div className="relative inline-block mb-4 mt-2">
              {data?.photo ? (
                <img src={data.photo} alt={data.name} className="w-32 h-32 rounded-2xl mx-auto border-4 border-white shadow-md dark:shadow-none object-cover" />
              ) : (
                <div className={`w-32 h-32 rounded-2xl mx-auto border-4 border-white shadow-md dark:shadow-none flex items-center justify-center bg-gradient-to-b text-white ${data?.gender === 'Perempuan' ? 'from-pink-300 to-pink-400' : 'from-blue-300 to-blue-400'}`}>
                  <User className="w-16 h-16" fill="currentColor" />
                </div>
              )}
              <span className="absolute bottom-2 -right-2 bg-emerald-700 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest border-2 border-white shadow-sm dark:shadow-none">
                Aktif
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{data?.name || "Ahmad Bukhori"}</h3>
            <p className="font-mono text-gray-500 dark:text-slate-400 text-sm mt-1">NIK: {data?.nik || "320412003840001"}</p>
            <div className="mt-3">
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
                {data?.familyRelation || "Kepala Keluarga"}
              </span>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">No. KK</p>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{data?.noKk || data?.no_kk || "320412008890001"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Agama</p>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.religion || "Islam"}</p>
              </div>
            </div>
          </div>

          {/* Ringkasan */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 border-l-4 border-l-emerald-600 relative overflow-hidden">
            <h4 className="font-bold text-gray-700 dark:text-slate-300 flex items-center gap-2 mb-4 text-sm">
              <BarChart2 className="w-5 h-5 text-emerald-600" />
              Ringkasan
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-slate-400 font-medium">Kelengkapan Data</span>
                <span className="font-bold text-emerald-700">92%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full w-[92%]"></div>
              </div>
              <p className="text-[11px] text-gray-400 italic mt-2">
                Data verifikasi terakhir pada 12 Sept 2023 oleh Admin 01
              </p>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Biodata */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-700" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">Biodata</h4>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Tempat, Tgl Lahir</p>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {data?.birthPlace || "Bandung"}, {data?.birthDate || "12-05-1984"} ({data?.age || 40} Thn)
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Jenis Kelamin</p>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.gender || "Laki-Laki"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Golongan Darah</p>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.bloodType || "O"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Pendidikan</p>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.education || "S1 - Ekonomi"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Pekerjaan</p>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.job || "Karyawan Swasta"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Nama Ayah Kandung</p>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.fatherName || "Budi Santoso"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Nama Ibu Kandung</p>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.motherName || "Ratna Sari"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Alamat & Domisili */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-700" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">Alamat & Domisili</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Alamat Lengkap</p>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {data?.address || "Jl. Mawar No. 45, Desa Sukamaju, Kec. Cimasuk, Kab. Bandung"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">RT / RW</p>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.rtRw || `${data?.rt || "004"} / ${data?.rw || "012"}`}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Desa</p>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.desa || "Desa Sukamaju"}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl flex items-center gap-3 border border-gray-100 dark:border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <p className="text-[11px] font-bold text-gray-600 dark:text-slate-400">Sesuai KTP & Domisili Terdaftar</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hubungan Keluarga */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-700" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">Hubungan Keluarga</h4>
              </div>
              <span className="text-sm font-bold text-gray-500 dark:text-slate-400 font-mono">KK: {data?.noKk || data?.no_kk || "320412008890001"}</span>
            </div>
            
            <div className="space-y-4 relative pl-4 pb-2">
              {/* Vertical line connector */}
              <div className="absolute left-8 top-10 bottom-6 w-0.5 bg-gray-200 z-0"></div>
              
              {familyMembers.map((member: any, index: number) => {
                const isCurrent = member.nik === data?.nik;
                const isKepalaKeluarga = (member.familyRelation || '').toLowerCase().includes('kepala');
                const isFemale = member.gender === 'Perempuan';
                
                return (
                  <div 
                    key={member.nik}
                    id={`family-member-${member.nik}`}
                    onClick={() => {
                      if (!isCurrent && onSelectResident) {
                        onSelectResident(member);
                      }
                    }}
                    className={`flex items-center gap-4 relative z-10 p-4 rounded-xl border transition-all ${
                      isCurrent 
                        ? 'bg-emerald-50/40 border-l-4 border-l-emerald-600 border-emerald-100 shadow-sm dark:shadow-none cursor-default' 
                        : 'bg-white dark:bg-slate-900 hover:bg-emerald-50/20 border-gray-100 dark:border-slate-800 hover:border-emerald-100 hover:shadow-md cursor-pointer active:scale-[0.99] group'
                    } ${index > 0 ? 'ml-4' : ''}`}
                  >
                    {/* Horizontal connection line for child nodes */}
                    {index > 0 && (
                      <div className="absolute -left-[20px] top-1/2 w-[20px] h-0.5 bg-gray-200"></div>
                    )}
                    
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm dark:shadow-none shrink-0 ${
                      isFemale 
                        ? 'bg-gradient-to-b from-pink-300 to-pink-400 text-white' 
                        : 'bg-gradient-to-b from-blue-300 to-blue-400 text-white'
                    }`}>
                      <User className="w-5 h-5" fill="currentColor" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate ${isCurrent ? 'text-emerald-800' : 'text-gray-900 dark:text-white group-hover:text-emerald-700'}`}>
                        {member.name}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                        {member.familyRelation || 'Anggota'} • {member.nik}
                      </p>
                    </div>

                    {isCurrent ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded uppercase tracking-wider shrink-0">
                        Sedang Dilihat
                      </span>
                    ) : isKepalaKeluarga ? (
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider shrink-0 border border-blue-100 group-hover:hidden">
                        Kepala Keluarga
                      </span>
                    ) : null}

                    {!isCurrent && (
                      <span className={`${isKepalaKeluarga ? 'hidden group-hover:inline-block' : 'inline-block opacity-0 group-hover:opacity-100'} text-xs font-bold text-emerald-700 shrink-0 transition-opacity`}>
                        Lihat Profil →
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Riwayat Administrasi */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-700" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">Riwayat Administrasi</h4>
              </div>
              <button 
                onClick={() => {
                  if (onSetPresetResident && onNavigateToTab) {
                    onSetPresetResident(data);
                    onNavigateToTab('surat');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-sm dark:shadow-none"
              >
                <Plus className="w-3.5 h-3.5" />
                Buat Surat
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider rounded-l-lg">Tanggal</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jenis Layanan</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Keterangan</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right rounded-r-lg">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {residentLetters.length > 0 ? (
                    residentLetters.map((letter) => (
                      <tr key={letter.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-4 text-sm font-medium text-gray-600 dark:text-slate-400">{letter.tanggal}</td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-900 dark:text-white">{letter.jenis}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-slate-400">{letter.keperluan}</td>
                        <td className="px-4 py-4 text-right">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            letter.status === 'Selesai' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>{letter.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td colSpan={4} className="px-4 py-8 text-sm text-gray-400 text-center italic">
                        Belum ada riwayat penerbitan surat untuk warga ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Riwayat Bantuan */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">Riwayat Bantuan Sosial</h4>
              </div>
              <button 
                onClick={() => {
                  setAidError("");
                  setShowAidModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 active:scale-95 transition-all shadow-sm dark:shadow-none"
              >
                <Plus className="w-3.5 h-3.5" />
                Kelola Bantuan
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider rounded-l-lg">Tanggal</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jenis Bantuan</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Keterangan</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right rounded-r-lg">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.activeAids && data.activeAids.length > 0 ? (
                    data.activeAids.map((aid: string, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-4 text-sm font-medium text-gray-500 dark:text-slate-400">Aktif</td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-900 dark:text-white">{aid}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-slate-400">Terdaftar sebagai penerima aktif</td>
                        <td className="px-4 py-4 text-right">
                          <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">AKTIF</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-gray-500 dark:text-slate-400">-</td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-400">Tidak Ada Bantuan Aktif</td>
                      <td className="px-4 py-4 text-sm text-gray-400">Penduduk ini tidak terdaftar di program bansos aktif</td>
                      <td className="px-4 py-4 text-right">
                        <span className="px-2.5 py-1 rounded-md bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider border border-gray-100 dark:border-slate-800">NIHIL</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {showAidModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-xl border border-slate-100 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Kelola Bantuan Sosial</h3>
              <button 
                onClick={() => setShowAidModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Penerima Manfaat</p>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{data?.name}</p>
                <p className="text-xs font-mono text-gray-500 dark:text-slate-400">{data?.nik}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Program Bantuan Aktif</p>
                {data?.activeAids && data.activeAids.length > 0 ? (
                  <div className="space-y-2">
                    {data.activeAids.map((aid: string, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl animate-in fade-in duration-250">
                        <span className="text-xs font-bold text-emerald-800">{aid}</span>
                        <button 
                          onClick={() => handleRemoveAidDirect(aid)}
                          disabled={isUpdatingAid}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Hentikan Bantuan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-slate-400 italic bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                    Tidak ada program bantuan yang sedang aktif.
                  </p>
                )}
              </div>

              {aidError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-medium text-rose-700">
                  {aidError}
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tambah Program Bantuan</p>
                {ALL_AID_PROGRAMS.filter(p => !data?.activeAids?.includes(p)).length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedNewProgram}
                      onChange={(e) => setSelectedNewProgram(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {ALL_AID_PROGRAMS.filter(p => !data?.activeAids?.includes(p)).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAddAid(selectedNewProgram)}
                      disabled={isUpdatingAid}
                      className="bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm dark:shadow-none hover:bg-emerald-800 active:scale-95 transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-700 italic font-medium bg-emerald-50/50 p-3 rounded-xl border border-dashed border-emerald-100">
                    Semua program bantuan ketersediaan sudah aktif untuk warga ini.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowAidModal(false)}
                className="px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elegant ConfirmModal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        type="danger"
        confirmText="Ya, Lanjutkan"
        cancelText="Batal"
      />
    </div>
  );
}
