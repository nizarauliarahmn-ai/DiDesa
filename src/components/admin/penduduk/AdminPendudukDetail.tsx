import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Printer, Edit2, BarChart2, User, MapPin, Users, FileText, CheckCircle2, Plus, Trash2, X, ArrowRightLeft, ShieldAlert, Calendar, Briefcase, GraduationCap, Home, Heart, CreditCard, Grid, ShieldCheck } from 'lucide-react';
import { Download, Mail, Phone, MoreVertical, Archive, HandHeart, History, AlertCircle, Eye, AlertTriangle } from 'lucide-react';
import AdminPendudukPrint from './AdminPendudukPrint';
import { showToast } from '../../../utils/toast';
import { fetchResidentLettersAsync, LetterHistory } from '../../../utils/letterHistory';
import ConfirmModal from '../../common/ConfirmModal';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../../utils/supabase';

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
  const [viewMode, setViewMode] = useState<'ektp' | 'grid'>('ektp');
  const [showAidModal, setShowAidModal] = useState(false);
  const [selectedNewProgram, setSelectedNewProgram] = useState("BLT Dana Desa");
  const [selectedNewYear, setSelectedNewYear] = useState(new Date().getFullYear().toString());
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

  const [residentLetters, setResidentLetters] = useState<LetterHistory[]>([]);

  useEffect(() => {
    if (data?.nik) {
      fetchResidentLettersAsync(data.nik, data.name || "").then(setResidentLetters);
    } else {
      setResidentLetters([]);
    }
  }, [data]);

  const ALL_AID_PROGRAMS = useMemo(() => [
    "BLT Dana Desa",
    "Program Keluarga Harapan (PKH)",
    "Bantuan Pangan Non-Tunai"
  ], []);

  const availablePrograms = useMemo(() => {
    return ALL_AID_PROGRAMS.filter(p => !data?.activeAids?.includes(`${p} (${selectedNewYear})`));
  }, [data?.activeAids, ALL_AID_PROGRAMS, selectedNewYear]);

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
            const { error } = await supabase.from('residents')
              .update({ status: 'pending_approval', status_color: 'amber' })
              .eq('nik', data.nik);
              
            if (!error) {
              await supabase.from('notifications').insert([{
                id: `notif-${Date.now()}`,
                tenant_id: data.tenant_id || data.tenantId,
                title: "Pengajuan Hapus Penduduk",
                message: `Admin Desa mengajukan penghapusan untuk data penduduk ${data.name} (NIK: ${data.nik}).`,
                category: "Residents",
                is_read: false,
                timestamp: new Date().toISOString()
              }]);
              showToast(`Pengajuan hapus data warga ${data.name} berhasil diajukan ke Super Admin!`, "success");
              if (onUpdateResident) {
                onUpdateResident({ ...data, status: 'pending_approval', status_color: 'amber' });
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
        "Pindahkan ke Tong Sampah",
        `Apakah Anda yakin ingin menghapus data warga ${data.name}? Data akan dipindahkan ke Tong Sampah dan baru akan dihapus permanen secara otomatis setelah 30 hari.`,
        async () => {
          try {
            const { error } = await supabase.from('residents')
              .update({ status: 'archived' })
              .eq('nik', data.nik);
              
            if (!error) {
              await supabase.from('notifications').insert([{
                id: `notif-${Date.now()}`,
                tenant_id: data.tenant_id || data.tenantId,
                title: "Penduduk Masuk Tong Sampah",
                message: `Data penduduk ${data.name} (NIK: ${data.nik}) dipindahkan ke Tong Sampah oleh Super Admin.`,
                category: "Residents",
                is_read: false,
                timestamp: new Date().toISOString()
              }]);
              showToast(`Data warga ${data.name} berhasil dipindahkan ke Tong Sampah!`, "success");
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
            const { error } = await supabase.from('residents')
              .update({ status: 'pending_approval', status_color: 'amber' })
              .eq('nik', data.nik);
              
            if (!error) {
              await supabase.from('notifications').insert([{
                id: `notif-${Date.now()}`,
                tenant_id: data.tenant_id || data.tenantId,
                title: "Pengajuan Mutasi Pindah",
                message: `Admin Desa mengajukan mutasi pindah keluar untuk penduduk ${data.name} (NIK: ${data.nik}).`,
                category: "Residents",
                is_read: false,
                timestamp: new Date().toISOString()
              }]);
              showToast(`Pengajuan mutasi pindah warga ${data.name} berhasil diajukan ke Super Admin!`, "success");
              if (onUpdateResident) {
                onUpdateResident({ ...data, status: 'pending_approval', status_color: 'amber' });
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
            const { error } = await supabase.from('residents')
              .delete()
              .eq('nik', data.nik);
              
            if (!error) {
              await supabase.from('notifications').insert([{
                id: `notif-${Date.now()}`,
                tenant_id: data.tenant_id || data.tenantId,
                title: "Penduduk Mutasi Pindah Keluar",
                message: `Data penduduk ${data.name} (NIK: ${data.nik}) telah dimutasikan pindah keluar dari sistem oleh Super Admin.`,
                category: "Residents",
                is_read: false,
                timestamp: new Date().toISOString()
              }]);
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
    const aidToSave = `${programName} (${selectedNewYear})`;
    const currentAids = data?.activeAids || [];
    if (currentAids.includes(aidToSave)) {
      setAidError(`Program bantuan ini sudah aktif untuk warga tersebut di tahun ${selectedNewYear}.`);
      return;
    }
    
    // Validasi Anti-Bantuan Ganda
    if (programName === "BLT Dana Desa") {
      const hasPKH = currentAids.some((a: string) => a.startsWith("Program Keluarga Harapan (PKH)"));
      const hasBPNT = currentAids.some((a: string) => a.startsWith("Bantuan Pangan Non-Tunai"));
      
      if (hasPKH || hasBPNT) {
        setAidError("Gagal: Warga sudah terdaftar sebagai penerima PKH/BPNT yang dilarang menerima BLT Dana Desa.");
        return;
      }
    }
    
    const updatedAids = [...currentAids, aidToSave];
    setIsUpdatingAid(true);
    setAidError("");
    try {
      const { error } = await supabase.from('residents')
        .update({ active_aids: JSON.stringify(updatedAids) })
        .eq('nik', data.nik);
        
      if (!error) {
        showToast("Bantuan sosial berhasil ditambahkan!", "success");
        if (onUpdateResident) onUpdateResident({ ...data, activeAids: updatedAids, active_aids: JSON.stringify(updatedAids) });
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
          const { error } = await supabase.from('residents')
            .update({ active_aids: JSON.stringify(updatedAids) })
            .eq('nik', data.nik);
            
          if (!error) {
            showToast("Bantuan sosial berhasil dihentikan!", "success");
            if (onUpdateResident) onUpdateResident({ ...data, activeAids: updatedAids, active_aids: JSON.stringify(updatedAids) });
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

  useEffect(() => {
    if (!data && residents.length > 0) {
      onBack();
    }
  }, [data, residents]);

  if (isPrinting) {
    return <AdminPendudukPrint data={data} familyMembers={familyMembers} residentLetters={residentLetters} onBack={() => setIsPrinting(false)} />;
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
                {(() => {
                  const s = (data?.status || 'Aktif').trim().toLowerCase();
                  if (s.includes('meninggal') || s === 'mati' || s === 'wafat') {
                    return (
                      <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-black flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Meninggal
                      </span>
                    );
                  }
                  if (s.includes('pindah') || s.includes('mutasi') || s === 'pindah domisili') {
                    return (
                      <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-black flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Pindah
                      </span>
                    );
                  }
                  if (s === 'pending_approval' || s === 'pending') {
                    return (
                      <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-black flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                        Pending
                      </span>
                    );
                  }
                  return (
                    <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-black flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {s === 'aktif' || s === 'hidup' || s.includes('hidup') ? 'Hidup' : (data?.status || 'Hidup')}
                    </span>
                  );
                })()}
                {data?.maritalStatus && (
                  <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-black shadow-sm">
                    {data.maritalStatus}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="font-mono text-gray-500 dark:text-slate-400 text-xs">
                  NIK: {data?.nik || "-"} • {data?.familyRelation || "Kepala Keluarga"}
                </p>
                {data?.nik && (
                  <div className="w-6 h-6 bg-white rounded border border-gray-200 flex items-center justify-center group relative cursor-help">
                    <QRCodeSVG value={data.nik} size={20} />
                    {/* Tooltip on hover */}
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      <p className="text-[10px] font-bold text-gray-500 text-center mb-1 whitespace-nowrap">Scan Kunjungan Tamu</p>
                      <QRCodeSVG value={data.nik} size={120} />
                    </div>
                  </div>
                )}
              </div>
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
                <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <button onClick={handleDeleteResident} className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors flex items-center justify-center border border-rose-100" title="Pindah ke Tong Sampah">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Format Tampilan Switcher Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Format Identitas Penduduk</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Pilih antara format Kartu e-KTP Digital atau Ringkasan Atribut</p>
            </div>
          </div>
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('ektp')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'ektp'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Tampilan Kartu e-KTP
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
              Tampilan Atribut
            </button>
          </div>
        </div>

        {viewMode === 'ektp' ? (
          /* Ultra-Modern Compact Digital e-KTP Card View */
          <div className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-sky-100 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 rounded-3xl p-5 sm:p-6 border-2 border-sky-300 dark:border-cyan-500/40 shadow-xl space-y-4 text-gray-900 dark:text-white">
            {/* Sleek Minimalist Top Header (Kop Removed as requested) */}
            <div className="flex items-center justify-between pb-3 border-b border-sky-900/15 dark:border-cyan-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-black tracking-widest uppercase text-sky-950 dark:text-cyan-200">
                  IDENTITAS DIGITAL KEPENDUDUKAN
                </span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-sky-900/10 text-sky-900 dark:bg-cyan-950 dark:text-cyan-300 border border-sky-900/20 dark:border-cyan-800">
                e-KTP INDONESIA
              </span>
            </div>

            {/* Compact NIK Header Bar */}
            <div className="flex items-center justify-between bg-sky-900/90 dark:bg-cyan-950/90 text-white px-4 sm:px-5 py-2 rounded-xl border border-sky-700 dark:border-cyan-700/60 shadow-inner">
              <span className="text-[11px] font-bold text-sky-200 dark:text-cyan-300 uppercase tracking-widest">NIK</span>
              <span className="font-mono text-base sm:text-lg font-black tracking-widest text-emerald-300 dark:text-emerald-400">{data?.nik || '-'}</span>
            </div>

            {/* High-Density Compact e-KTP Field Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 relative z-10">
              {/* Ultra-Dense Field Values List */}
              <div className="md:col-span-8 space-y-1 text-xs font-semibold">
                <div className="grid grid-cols-12 gap-2 py-0.5 border-b border-sky-900/10 dark:border-slate-800">
                  <span className="col-span-4 uppercase font-extrabold text-[11px] text-sky-950 dark:text-slate-400">Nama</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-black text-xs sm:text-sm text-gray-900 dark:text-white uppercase tracking-wide">{data?.name || '-'}</span>
                </div>

                <div className="grid grid-cols-12 gap-2 py-0.5 border-b border-sky-900/10 dark:border-slate-800">
                  <span className="col-span-4 uppercase font-extrabold text-[11px] text-sky-950 dark:text-slate-400">Tempat/Tgl Lahir</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-bold text-gray-900 dark:text-white uppercase text-xs">
                    {data?.birthPlace || '-'}{data?.birthDate ? `, ${data.birthDate}` : ''} {data?.age ? `(${data.age} THN)` : ''}
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-2 py-0.5 border-b border-sky-900/10 dark:border-slate-800">
                  <span className="col-span-4 uppercase font-extrabold text-[11px] text-sky-950 dark:text-slate-400">Jenis Kelamin</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-bold text-gray-900 dark:text-white uppercase text-xs flex items-center justify-between">
                    <span>{data?.gender || '-'}</span>
                    <span className="font-bold text-sky-950 dark:text-slate-400 text-[10px]">GOL. DARAH: <strong className="text-rose-600 dark:text-rose-400 font-extrabold">{data?.bloodType || '-'}</strong></span>
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-2 py-0.5 border-b border-sky-900/10 dark:border-slate-800">
                  <span className="col-span-4 uppercase font-extrabold text-[11px] text-sky-950 dark:text-slate-400">Alamat Jalan</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-bold text-gray-900 dark:text-white uppercase text-xs">{data?.address || '-'}</span>
                </div>

                <div className="grid grid-cols-12 gap-2 py-0.5 border-b border-sky-900/10 dark:border-slate-800">
                  <span className="col-span-4 uppercase font-extrabold text-[11px] text-sky-950 dark:text-slate-400">RT/RW & Desa</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-bold text-gray-900 dark:text-white uppercase text-xs flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono bg-sky-900/10 dark:bg-cyan-950 px-1.5 py-0.5 rounded text-[11px] font-black text-sky-950 dark:text-cyan-300">
                      RT {data?.rt || '-'} / RW {data?.rw || '-'}
                    </span>
                    <span className="text-sky-400">•</span>
                    <span>DESA {data?.desa || '-'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-2 py-0.5 border-b border-sky-900/10 dark:border-slate-800">
                  <span className="col-span-4 uppercase font-extrabold text-[11px] text-sky-950 dark:text-slate-400">Agama</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-bold text-gray-900 dark:text-white uppercase text-xs">{data?.religion || '-'}</span>
                </div>

                <div className="grid grid-cols-12 gap-2 py-0.5 border-b border-sky-900/10 dark:border-slate-800">
                  <span className="col-span-4 uppercase font-extrabold text-[11px] text-sky-950 dark:text-slate-400">Status Perkawinan</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-bold text-gray-900 dark:text-white uppercase text-xs">{data?.maritalStatus || '-'}</span>
                </div>

                <div className="grid grid-cols-12 gap-2 py-0.5 border-b border-sky-900/10 dark:border-slate-800">
                  <span className="col-span-4 uppercase font-extrabold text-[11px] text-sky-950 dark:text-slate-400">Pekerjaan</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-bold text-gray-900 dark:text-white uppercase text-xs">{data?.job || '-'}</span>
                </div>

                <div className="grid grid-cols-12 gap-2 py-0.5 border-b border-sky-900/10 dark:border-slate-800">
                  <span className="col-span-4 uppercase font-extrabold text-[11px] text-sky-950 dark:text-slate-400">Kewarganegaraan</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-bold text-gray-900 dark:text-white uppercase text-xs">{data?.citizenship || 'WNI'}</span>
                </div>

                <div className="grid grid-cols-12 gap-2 py-0.5">
                  <span className="col-span-4 uppercase font-extrabold text-[11px] text-sky-950 dark:text-slate-400">Berlaku Hingga</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider text-xs">SEUMUR HIDUP</span>
                </div>
              </div>

              {/* Photo & QR Column - Compact */}
              <div className="md:col-span-4 flex flex-col items-center justify-between space-y-3">
                {/* Pasfoto */}
                <div className="w-32 h-40 rounded-xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-md relative group bg-gradient-to-b from-blue-600 to-blue-800 shrink-0">
                  {data?.photo ? (
                    <img src={data.photo} alt={data.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center text-white ${data?.gender === 'Perempuan' ? 'bg-gradient-to-b from-pink-500 to-pink-700' : 'bg-gradient-to-b from-blue-600 to-blue-800'}`}>
                      <User className="w-16 h-16 opacity-90" fill="currentColor" />
                      <span className="text-[9px] font-bold tracking-wider mt-1 uppercase">PASFOTO</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-blue-900/10 pointer-events-none border border-white/20 rounded-xl"></div>
                </div>

                {/* QR Code Verifikasi */}
                <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-xl border border-sky-300 dark:border-cyan-800 shadow-sm text-center space-y-1 w-full max-w-[140px]">
                  <p className="text-[8px] font-extrabold text-sky-950 dark:text-cyan-300 uppercase tracking-wider flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    VERIFIKASI DIGITAL
                  </p>
                  <div className="flex justify-center p-1 bg-white rounded-lg">
                    <QRCodeSVG value={data?.nik || '6306060107770103'} size={70} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Biodata Ringkasan Individu */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-5 border-b border-gray-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Biodata Utama</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Ringkasan identitas kependudukan</p>
                  </div>
                </div>
                {data?.nik && (
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-lg">
                    NIK: {data.nik}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* Tempat, Tgl Lahir & Usia */}
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Tempat, Tgl Lahir</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5 truncate">
                      {data?.birthPlace || "Belum diisi"}, {data?.birthDate || "-"}
                    </p>
                    {data?.age && (
                      <span className="inline-block mt-1 text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        {data.age} Tahun
                      </span>
                    )}
                  </div>
                </div>

                {/* Jenis Kelamin */}
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Jenis Kelamin</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">
                      {data?.gender || "-"}
                    </p>
                  </div>
                </div>

                {/* Pekerjaan */}
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Pekerjaan</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5 truncate">
                      {data?.job || "-"}
                    </p>
                  </div>
                </div>

                {/* Pendidikan */}
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Pendidikan Terakhir</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5 truncate">
                      {data?.education || "-"}
                    </p>
                  </div>
                </div>

                {/* Agama & Golongan Darah */}
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Agama / Gol. Darah</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5 flex items-center gap-2">
                      <span>{data?.religion || "-"}</span>
                      <span className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-1.5 py-0.5 rounded font-black border border-rose-200 dark:border-rose-800">
                        Gol. {data?.bloodType || "-"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Orang Tua Kandung */}
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Orang Tua Kandung</p>
                    <p className="text-gray-700 dark:text-slate-300 mt-0.5 font-medium truncate">
                      Ayah: <strong className="text-gray-900 dark:text-white">{data?.fatherName || "-"}</strong>
                    </p>
                    <p className="text-gray-700 dark:text-slate-300 font-medium truncate">
                      Ibu: <strong className="text-gray-900 dark:text-white">{data?.motherName || "-"}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Alamat & Domisili */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-5 border-b border-gray-100 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">Alamat & Domisili</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Lokasi tempat tinggal resmi terdaftar</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="md:col-span-2 bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Alamat Jalan / Dusun</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5 leading-snug">
                      {data?.address || "Belum ada alamat jalan"}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Wilayah RT / RW & Desa</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                        RT {data?.rt || '01'} / RW {data?.rw || '01'}
                      </span>
                      <span className="font-bold text-xs bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-md border border-gray-200 dark:border-slate-700">
                        {data?.desa || 'Desa Sukamaju'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 pt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{data?.domicileStatus || 'Sesuai KTP & Domisili Terdaftar'}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Hubungan Keluarga / Anggota Kartu Keluarga */}
        {(() => {
          const otherMembers = (familyMembers || []).filter((m: any) => m && m.nik !== data?.nik && m.name !== data?.name);

          if (otherMembers.length === 0) {
            return (
              <div className="bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl p-5 border border-emerald-200/60 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm">Status Kartu Keluarga</h4>
                      <span className="px-2.5 py-0.5 bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                        KK Mandiri
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
                      Yang bersangkutan terdaftar sebagai <strong>Kepala Keluarga / Anggota Tunggal</strong> dalam Kartu Keluarga ini.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 shrink-0 self-start sm:self-auto">
                  KK: {data?.noKk || data?.no_kk || "-"}
                </span>
              </div>
            );
          }

          return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Anggota Kartu Keluarga</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Relasi dihitung terhadap Kepala Keluarga</p>
                  </div>
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
          );
        })()}

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
                  data.activeAids.map((aid: string, idx: number) => {
                    const isStopped = aid.startsWith("STOPPED:");
                    const displayAid = isStopped ? aid.split("|")[0].replace("STOPPED:", "").trim() : aid;
                    const reason = isStopped && aid.includes("| Alasan:") ? aid.split("| Alasan:")[1].trim() : (isStopped ? "Dihentikan" : "Terdaftar sebagai penerima aktif");
                    
                    return (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-4 text-sm font-medium text-gray-500 dark:text-slate-400">{isStopped ? "Selesai/Stop" : "Aktif"}</td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-900 dark:text-white">{displayAid}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-slate-400">{reason}</td>
                        <td className="px-4 py-4 text-right">
                          {isStopped ? (
                            <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-wider border border-rose-100 dark:bg-rose-900/30 dark:border-rose-800">BERHENTI</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800">AKTIF</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-sm font-medium text-gray-500 dark:text-slate-400 text-center">-</td>
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
                {data?.activeAids && data.activeAids.filter((a: string) => !a.startsWith("STOPPED:")).length > 0 ? (
                  <div className="space-y-2">
                    {data.activeAids.filter((a: string) => !a.startsWith("STOPPED:")).map((aid: string, idx: number) => (
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
                {availablePrograms.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedNewProgram}
                      onChange={(e) => setSelectedNewProgram(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {availablePrograms.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <select
                      value={selectedNewYear}
                      onChange={(e) => setSelectedNewYear(e.target.value)}
                      className="w-24 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="2023">2023</option>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
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
