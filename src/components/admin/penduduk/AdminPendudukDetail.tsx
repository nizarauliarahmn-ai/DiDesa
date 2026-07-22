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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeAids: updatedAids })
      });
      if (res.ok) {
        showToast("Bantuan sosial berhasil ditambahkan!", "success");
        if (onUpdateResident) onUpdateResident({ ...data, activeAids: updatedAids });
      } else {
        throw new Error("Gagal menambah bantuan");
      }
    } catch (e: any) {
      setAidError(e.message || "Terjadi kesalahan saat memproses data.");
    } finally {
      setIsUpdatingAid(false);
    }
  };

  const handleRemoveAidDirect = async (programName: string) => {
    showConfirm(
      "Hentikan Bantuan Sosial",
      `Apakah Anda yakin ingin menghentikan bantuan ${programName} untuk warga ini?`,
      async () => {
        const currentAids = data?.activeAids || [];
        const updatedAids = currentAids.filter((p: string) => p !== programName);
        setIsUpdatingAid(true);
        try {
          const res = await fetch(`/api/residents/${data.nik}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activeAids: updatedAids })
          });
          if (res.ok) {
            showToast("Bantuan sosial berhasil dihentikan!", "success");
            if (onUpdateResident) onUpdateResident({ ...data, activeAids: updatedAids });
          } else {
            throw new Error("Gagal menghentikan bantuan");
          }
        } catch (e: any) {
          showToast(e.message || "Terjadi kesalahan", "error");
        } finally {
          setIsUpdatingAid(false);
        }
      }
    );
  };

  // FIX FOR BUG DUPLIKASI HUBUNGAN KELUARGA
  const familyMembers = useMemo(() => {
    let currentResident = data;
    
    // Jika data yang diklik tidak memiliki noKk (karena snippet), cari data aslinya di residents
    if (!currentResident?.noKk && !currentResident?.no_kk && currentResident?.nik && residents.length > 0) {
      const found = residents.find((r: any) => r.nik === currentResident.nik);
      if (found) {
        currentResident = found;
      }
    }

    const noKk = currentResident?.noKk || currentResident?.no_kk;
    
    if (!noKk) {
      // Jika benar-benar tidak ada noKK, kembalikan data itu sendiri saja, tanpa menduplikasi mock.
      return [currentResident];
    }

    const filtered = residents.filter((r: any) => (r.noKk === noKk || r.no_kk === noKk));
    
    if (filtered.length === 0) {
      return [currentResident];
    }

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
  const isFemale = data?.gender === 'Perempuan';

  return (
    <div className="max-w-4xl mx-auto pb-24 relative">
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm dark:shadow-none animate-pulse mb-6">
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

      {/* STICKY HEADER PROFILE - STATIC DI ATAS */}
      <div className="sticky top-16 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-100 dark:border-slate-800 shadow-sm rounded-2xl p-4 mb-6 transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="w-10 h-10 flex shrink-0 items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-slate-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="relative shrink-0">
              {data?.photo ? (
                <img src={data.photo} alt={data.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover" />
              ) : (
                <div className={`w-12 h-12 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white ${isFemale ? 'bg-gradient-to-br from-pink-400 to-pink-500' : 'bg-gradient-to-br from-emerald-500 to-emerald-600'}`}>
                  <User className="w-6 h-6" fill="currentColor" />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                {data?.name || "Nama Penduduk"}
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                  {data?.status || 'Aktif'}
                </span>
              </h2>
              <p className="font-mono text-gray-500 dark:text-slate-400 text-xs mt-0.5">
                NIK: {data?.nik || "-"} • {data?.familyRelation || "Kepala Keluarga"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:pl-4 md:border-l border-gray-100 dark:border-slate-800">
            <button 
              onClick={() => {
                if (onSetPresetResident && onNavigateToTab) {
                  onSetPresetResident(data);
                  onNavigateToTab('surat');
                }
              }}
              className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex items-center justify-center"
              title="Buat Surat"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsPrinting(true)}
              className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center justify-center"
              title="Cetak Profil"
            >
              <Printer className="w-4 h-4" />
            </button>
            {!isPending && (
              <>
                <button onClick={onEdit} className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors flex items-center gap-2 text-xs shadow-sm">
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Data
                </button>
                <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1"></div>
                <button onClick={handleMoveResident} className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors flex items-center justify-center" title="Mutasi Warga">
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
                <button onClick={handleDeleteResident} className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors flex items-center justify-center" title="Hapus Warga">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
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
                  {data?.birthPlace || "Belum ada data"}, {data?.birthDate || "-"} {data?.age ? `(${data.age} Thn)` : ''}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Jenis Kelamin</p>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.gender || "-"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Agama</p>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.religion || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Pendidikan</p>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.education || "-"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Pekerjaan</p>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.job || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Golongan Darah</p>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.bloodType || "-"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Nama Ayah Kandung</p>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.fatherName || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Nama Ibu Kandung</p>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.motherName || "-"}</p>
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
                {data?.address || "-"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">RT / RW</p>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.rtRw || `${data?.rt || "-"} / ${data?.rw || "-"}`}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Desa</p>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{data?.desa || "-"}</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl flex items-center gap-3 border border-gray-100 dark:border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <p className="text-[11px] font-bold text-gray-600 dark:text-slate-400">Sesuai KTP & Domisili Terdaftar</p>
            </div>
          </div>
        </div>

        {/* Hubungan Keluarga - TAMPILAN DISEMPURNAKAN TAPI TETAP SAMA */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-700" />
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white text-lg">Hubungan Keluarga</h4>
            </div>
            <span className="text-sm font-bold text-gray-500 dark:text-slate-400 font-mono bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-slate-700">
              KK: {data?.noKk || data?.no_kk || "-"}
            </span>
          </div>
          
          <div className="space-y-3 relative pl-6 pb-2">
            {/* Vertical line connector - adjusted */}
            <div className="absolute left-[38px] top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-slate-700 z-0"></div>
            
            {familyMembers.map((member: any, index: number) => {
              const isCurrent = member.nik === data?.nik;
              const isKepalaKeluarga = (member.familyRelation || '').toLowerCase().includes('kepala');
              const memberIsFemale = member.gender === 'Perempuan';
              
              return (
                <div 
                  key={member.nik}
                  id={`family-member-${member.nik}`}
                  onClick={() => {
                    if (!isCurrent && onSelectResident) {
                      onSelectResident(member);
                    }
                  }}
                  className={`flex items-center gap-4 relative z-10 p-4 rounded-xl border transition-all duration-200 ${
                    isCurrent 
                      ? 'bg-emerald-50/40 border-emerald-200 dark:border-emerald-800/50 shadow-sm dark:shadow-none cursor-default ring-1 ring-emerald-500/20' 
                      : 'bg-white dark:bg-slate-900 hover:bg-emerald-50/20 border-gray-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800/50 hover:shadow-sm cursor-pointer group'
                  } ${index > 0 ? 'ml-6' : ''}`}
                >
                  {/* Horizontal connection line for child nodes */}
                  {index > 0 && (
                    <div className="absolute -left-[24px] top-1/2 w-[24px] h-0.5 bg-gray-200 dark:bg-slate-700"></div>
                  )}
                  
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm dark:shadow-none shrink-0 ${
                    memberIsFemale 
                      ? 'bg-gradient-to-br from-pink-400 to-pink-500 text-white' 
                      : 'bg-gradient-to-br from-blue-400 to-blue-500 text-white'
                  }`}>
                    <User className="w-6 h-6" fill="currentColor" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-[15px] truncate ${isCurrent ? 'text-emerald-800 dark:text-emerald-400' : 'text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors'}`}>
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-medium truncate flex items-center gap-1.5">
                      <span className={`${isCurrent ? 'text-emerald-700 dark:text-emerald-500 font-bold' : ''}`}>{member.familyRelation || 'Anggota'}</span>
                      <span className="opacity-50">•</span> 
                      <span className="font-mono">{member.nik}</span>
                    </p>
                  </div>

                  {isCurrent ? (
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 border border-emerald-200 dark:border-emerald-800">
                      Sedang Dilihat
                    </span>
                  ) : isKepalaKeluarga ? (
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 border border-blue-100 dark:border-blue-800 group-hover:hidden">
                      Kepala Keluarga
                    </span>
                  ) : null}

                  {!isCurrent && (
                    <span className={`${isKepalaKeluarga ? 'hidden group-hover:inline-block' : 'inline-block opacity-0 group-hover:opacity-100'} text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0 transition-all duration-200 translate-x-2 group-hover:translate-x-0`}>
                      Lihat Profil →
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Riwayat Administrasi */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Buat Surat
            </button>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jenis Layanan</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Keterangan</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {residentLetters.length > 0 ? (
                  residentLetters.map((letter) => (
                    <tr key={letter.id} className="hover:bg-gray-50/50 dark:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-gray-600 dark:text-slate-400">{letter.tanggal}</td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900 dark:text-white">{letter.jenis}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-slate-400">{letter.keperluan}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          letter.status === 'Selesai' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:border-amber-800'
                        }`}>{letter.status}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-sm text-gray-400 text-center italic bg-gray-50/30 dark:bg-slate-900/30">
                      Belum ada riwayat penerbitan surat untuk warga ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Riwayat Bantuan */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Kelola Bantuan
            </button>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jenis Bantuan</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Keterangan</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {data?.activeAids && data.activeAids.length > 0 ? (
                  data.activeAids.map((aid: string, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-gray-500 dark:text-slate-400">Aktif</td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900 dark:text-white">{aid}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-slate-400">Terdaftar sebagai penerima aktif</td>
                      <td className="px-4 py-4 text-right">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800">AKTIF</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
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

      {showAidModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-xl border border-slate-100 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Kelola Bantuan Sosial</h3>
              <button 
                onClick={() => setShowAidModal(false)}
                className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Penerima Manfaat</p>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{data?.name}</p>
                <p className="text-xs font-mono text-gray-500 dark:text-slate-400">{data?.nik}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Program Bantuan Aktif</p>
                {data?.activeAids && data.activeAids.length > 0 ? (
                  <div className="space-y-2">
                    {data.activeAids.map((aid: string, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                        <span className="text-sm font-bold text-emerald-800 dark:text-emerald-400">{aid}</span>
                        <button 
                          onClick={() => handleRemoveAidDirect(aid)}
                          disabled={isUpdatingAid}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors disabled:opacity-50"
                          title="Hentikan Bantuan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-slate-400 italic bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                    Tidak ada program bantuan yang sedang aktif.
                  </p>
                )}
              </div>

              {aidError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-xs font-medium text-rose-700 dark:text-rose-400">
                  {aidError}
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tambah Program Bantuan</p>
                {ALL_AID_PROGRAMS.filter(p => !data?.activeAids?.includes(p)).length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedNewProgram}
                      onChange={(e) => setSelectedNewProgram(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {ALL_AID_PROGRAMS.filter(p => !data?.activeAids?.includes(p)).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAddAid(selectedNewProgram)}
                      disabled={isUpdatingAid}
                      className="bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-800 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 italic font-medium bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-dashed border-emerald-100 dark:border-emerald-900/30">
                    Semua program bantuan ketersediaan sudah aktif.
                  </p>
                )}
              </div>
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
