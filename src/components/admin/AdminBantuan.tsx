import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  UserPlus, 
  Banknote, 
  Users, 
  ShoppingBasket, 
  AlertTriangle,
  Save,
  Filter,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Trash2,
  Database,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { showToast } from '../../utils/toast';
import ConfirmModal from '../common/ConfirmModal';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import AdminPendudukDetail from './penduduk/AdminPendudukDetail';
import AdminBantuanImport from './bantuan/AdminBantuanImport';

export default function AdminBantuan({
  searchQuery: externalSearchQuery,
  setSearchQuery: externalSetSearchQuery,
  debouncedSearchQuery: externalDebouncedSearchQuery
}: {
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  debouncedSearchQuery?: string;
} = {}) {
  const [residents, setResidents] = useState<any[]>([]);
  const [dbEngine, setDbEngine] = useState<string>("Loading...");
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>("BLT Dana Desa");
  
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
  const [showOverlapOnly, setShowOverlapOnly] = useState<boolean>(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [localDebouncedSearchQuery, setLocalDebouncedSearchQuery] = useState("");
  
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = externalSetSearchQuery !== undefined ? externalSetSearchQuery : setLocalSearchQuery;

  // Handle local debouncing if no external debounced query is provided
  useEffect(() => {
    if (externalDebouncedSearchQuery !== undefined) return;
    const timer = setTimeout(() => {
      setLocalDebouncedSearchQuery(localSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery, externalDebouncedSearchQuery]);

  const debouncedSearchQuery = externalDebouncedSearchQuery !== undefined ? externalDebouncedSearchQuery : localDebouncedSearchQuery;
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showBaModal, setShowBaModal] = useState(false);
  const [disbursedNiks, setDisbursedNiks] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`disbursed_niks_${selectedProgram}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  });

  // Sync disbursement state to localStorage when program changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`disbursed_niks_${selectedProgram}`);
      setDisbursedNiks(stored ? JSON.parse(stored) : []);
    } catch (e) {
      setDisbursedNiks([]);
    }
  }, [selectedProgram]);

  // Sync disbursement state to localStorage when list changes
  useEffect(() => {
    try {
      if (selectedProgram) {
        localStorage.setItem(`disbursed_niks_${selectedProgram}`, JSON.stringify(disbursedNiks));
      }
    } catch (e) {}
  }, [disbursedNiks, selectedProgram]);
  const [searchResidentQuery, setSearchResidentQuery] = useState("");
  const [selectedResidentNik, setSelectedResidentNik] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Dedicated view states for "Tambah Penerima Bantuan"
  const [showAddView, setShowAddView] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [formProgram, setFormProgram] = useState("");
  const [formAmount, setFormAmount] = useState("300000");
  const [formFunding, setFormFunding] = useState("");
  const [criteriaChecked, setCriteriaChecked] = useState<Record<string, boolean>>({});
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [filterYear, setFilterYear] = useState("Semua Tahun");
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [selectedResidentDetailModal, setSelectedResidentDetailModal] = useState<any | null>(null);

  // Close recommendations dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowRecommendations(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper for scoring
  const calculateVulnerabilityScore = (r: any) => {
    let score = 0;
    
    // Age calculation
    if (r.birthDate) {
      const birthYear = new Date(r.birthDate).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      if (age >= 60) score += 30;
      else if (age >= 50) score += 15;
    }
    
    // Job scoring
    const job = (r.job || '').toLowerCase();
    if (job.includes('belum') || job.includes('tidak bekerja')) score += 40;
    if (job.includes('mengurus rumah tangga')) score += 20;
    if (job.includes('buruh harian lepas') || job.includes('buruh tani')) score += 30;
    if (job.includes('pensiunan')) score += 10;
    
    // Already receiving aids (Penalty)
    if (r.activeAids && r.activeAids.length > 0) score -= 50;

    return score;
  };

  // Filter residents for search in the dedicated Add Recipient view
  const searchResultsForAddView = useMemo(() => {
    if (!formProgram) return [];
    let list = [...residents];
    
    if (searchResidentQuery.trim() !== "") {
      const q = searchResidentQuery.toLowerCase();
      list = list.filter(r => 
        r.name?.toLowerCase().includes(q) || 
        r.nik?.includes(q)
      );
      return list.slice(0, 5); // Limit search results to 5
    } else if (showRecommendations) {
      // Smart Recommendation Mode (when toggled on)
      // Filter out people who already have THIS program for THIS year
      list = list.filter(r => !(r.activeAids || []).includes(`${formProgram} (${formYear})`));
      
      // Calculate scores
      const scoredList = list.map(r => ({
        ...r,
        vulnerabilityScore: calculateVulnerabilityScore(r)
      }));
      
      // Sort by highest score
      scoredList.sort((a, b) => b.vulnerabilityScore - a.vulnerabilityScore);
      
      // Return top 5
      return scoredList.slice(0, 5);
    }
    
    return [];
  }, [residents, formProgram, searchResidentQuery, showRecommendations]);

  // Fetch residents and DB status
  const fetchData = async () => {
    try {
      setLoading(true);
      const resolvedTenant = await resolveCurrentTenant();
      setTenantId(resolvedTenant);

      if (resolvedTenant) {
        const { data, error } = await supabase
          .from('residents')
          .select('*')
          .eq('tenant_id', resolvedTenant)
          .order('name', { ascending: true });

        if (data && !error) {
           const formatted = data.map(r => ({
             ...r,
             noKk: r.no_kk,
             rtRw: r.rt_rw,
             birthPlace: r.birth_place,
             birthDate: r.birth_date,
             bloodType: r.blood_type,
             domicileStatus: r.domicile_status,
             familyRelation: r.family_relation,
             fatherName: r.father_name,
             motherName: r.mother_name,
             activeAids: typeof r.active_aids === 'string' ? JSON.parse(r.active_aids) : (r.active_aids || []),
             genderColor: r.gender_color,
             statusColor: r.status_color
           }));
           setResidents(formatted.filter(r => r.is_deleted !== 1));
        }
      }
      setDbEngine("Supabase (Multi-Tenant)");
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute stats dynamically
  const stats = useMemo(() => {
    // Determine the string to match for year filtering
    const yearMatchStr = filterYear === "Semua Tahun" ? "" : `(${filterYear})`;

    const bltCount = residents.filter(r => r.activeAids?.some((a: string) => a.startsWith("BLT Dana Desa") && a.includes(yearMatchStr))).length;
    const pkhCount = residents.filter(r => r.activeAids?.some((a: string) => a.startsWith("Program Keluarga Harapan (PKH)") && a.includes(yearMatchStr))).length;
    const bpntCount = residents.filter(r => r.activeAids?.some((a: string) => a.startsWith("Bantuan Pangan Non-Tunai") && a.includes(yearMatchStr))).length;
    
    // Residents with multiple aids (Overlap / Tumpang Tindih) for the selected year
    const overlapResidents = residents.filter(r => {
      if (!r.activeAids) return false;
      const aidsInYear = filterYear === "Semua Tahun" 
        ? r.activeAids 
        : r.activeAids.filter((a: string) => a.includes(`(${filterYear})`));
      return aidsInYear.length > 1;
    });
    
    return {
      blt: bltCount,
      pkh: pkhCount,
      bpnt: bpntCount,
      overlaps: overlapResidents
    };
  }, [residents, filterYear]);

  // Filtered list of residents based on search and selected program
  const filteredResidents = useMemo(() => {
    let list = residents;

    if (showOverlapOnly) {
      // Show only residents with overlap
      list = stats.overlaps;
    } else {
      // Filter by currently selected program and year
      const yearMatchStr = filterYear === "Semua Tahun" ? "" : `(${filterYear})`;
      list = residents.filter(r => r.activeAids?.some((a: string) => a.startsWith(selectedProgram) && a.includes(yearMatchStr)));
    }

    // Filter by search query
    if (debouncedSearchQuery.trim() !== "") {
      const q = debouncedSearchQuery.toLowerCase();
      list = list.filter(r => 
        r.name?.toLowerCase().includes(q) || 
        r.nik?.includes(q) || 
        r.rtRw?.includes(q)
      );
    }

    return list;
  }, [residents, selectedProgram, showOverlapOnly, debouncedSearchQuery, stats.overlaps]);

  // Remove aid program from a resident
  const handleRemoveAid = (nik: string, programToRemove: string) => {
    const targetResident = residents.find(r => r.nik === nik);
    if (!targetResident) return;

    showConfirm(
      "Hentikan Bantuan Sosial",
      `Apakah Anda yakin ingin menghentikan bantuan "${programToRemove}" dari warga ${targetResident.name}?`,
      async () => {
        const reason = window.prompt(`Masukkan alasan penghentian bantuan untuk ${targetResident.name} (wajib diisi):`, "Meninggal Dunia / Pindah / Mampu");
        if (!reason || reason.trim() === "") {
          showToast("Penghentian dibatalkan: Alasan wajib diisi.", "error");
          return;
        }

        const currentAids = targetResident.activeAids || [];
        const updatedAids = currentAids.map((aid: string) => {
          if (aid === programToRemove) {
            return `STOPPED: ${programToRemove} | Alasan: ${reason.trim()}`;
          }
          return aid;
        });

        try {
          if (!tenantId) throw new Error("Tenant ID tidak ditemukan");
          
          const { error } = await supabase
            .from('residents')
            .update({ active_aids: updatedAids })
            .eq('nik', nik)
            .eq('tenant_id', tenantId);

          if (!error) {
            // Update local state directly
            setResidents(prev => prev.map(r => r.nik === nik ? { ...r, activeAids: updatedAids } : r));
            showToast(`Berhasil menghentikan ${targetResident.name} dari program ${programToRemove}`, "success");
          } else {
            throw error;
          }
        } catch (err: any) {
          showToast(err.message || "Gagal menghentikan warga dari program bantuan", "error");
        }
      }
    );
  };

  // Add aid program to a resident
  const handleAddAid = async () => {
    if (!selectedResidentNik) return;
    const targetResident = residents.find(r => r.nik === selectedResidentNik);
    if (!targetResident) return;

    const aidToSave = `${selectedProgram} (${formYear})`;
    const currentAids = targetResident.activeAids || [];
    if (currentAids.includes(aidToSave)) {
      showToast(`Warga ini sudah menerima bantuan program ini untuk tahun ${formYear}.`, "error");
      return;
    }

    const updatedAids = [...currentAids, aidToSave];

    // Poin 1: Validasi Anti-Bantuan Ganda
    if (selectedProgram === "BLT Dana Desa") {
      const hasPKH = currentAids.some((a: string) => a.startsWith("Program Keluarga Harapan (PKH)"));
      const hasBPNT = currentAids.some((a: string) => a.startsWith("Bantuan Pangan Non-Tunai"));
      
      if (hasPKH || hasBPNT) {
        showToast("Penyaluran ditolak: Warga sudah terdaftar sebagai penerima PKH/BPNT yang tidak boleh menerima BLT Dana Desa (Tumpang Tindih Terlarang).", "error");
        return;
      }
    }

    setIsSaving(true);

    try {
      if (!tenantId) throw new Error("Tenant ID tidak ditemukan");
      
      const { error } = await supabase
        .from('residents')
        .update({ active_aids: updatedAids })
        .eq('nik', selectedResidentNik)
        .eq('tenant_id', tenantId);

      if (!error) {
        setResidents(prev => prev.map(r => r.nik === selectedResidentNik ? { ...r, activeAids: updatedAids } : r));
        setShowModal(false);
        setSelectedResidentNik("");
        setSearchResidentQuery("");
        showToast(`Berhasil menambahkan ${targetResident.name} ke program ${selectedProgram}`, "success");
      } else {
        throw error;
      }
    } catch (err: any) {
      showToast(err.message || "Gagal menambahkan warga ke program bantuan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Save aid program to selected resident from dedicated view
  const handleSaveAddForm = async () => {
    if (!selectedResidentNik) {
      showToast("Silakan pilih penduduk terlebih dahulu", "error");
      return;
    }
    if (!formProgram) {
      showToast("Silakan pilih program bantuan terlebih dahulu", "error");
      return;
    }

    const targetResident = residents.find(r => r.nik === selectedResidentNik);
    if (!targetResident) return;

    const currentAids = targetResident.activeAids || [];
    const updatedAids = currentAids.includes(formProgram) ? currentAids : [...currentAids, formProgram];
    setIsSaving(true);

    try {
      if (!tenantId) throw new Error("Tenant ID tidak ditemukan");
      
      const { error } = await supabase
        .from('residents')
        .update({ active_aids: updatedAids })
        .eq('nik', selectedResidentNik)
        .eq('tenant_id', tenantId);

      if (!error) {
        setResidents(prev => prev.map(r => r.nik === selectedResidentNik ? { ...r, activeAids: updatedAids } : r));
        
        // Reset form
        setSelectedResidentNik("");
        setSearchResidentQuery("");
        setFormProgram("");
        setFormAmount("300000");
        setFormFunding("");
        setCriteriaChecked({});
        setShowAddView(false);
        
        showToast(`Berhasil menambahkan ${targetResident.name} ke program ${formProgram}`, "success");
      } else {
        throw error;
      }
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan data", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter residents available to be added (who aren't already in the selected program)
  const availableResidentsForModal = useMemo(() => {
    let list = residents.filter(r => !r.activeAids?.includes(selectedProgram));
    
    if (searchResidentQuery.trim() !== "") {
      const q = searchResidentQuery.toLowerCase();
      list = list.filter(r => 
        r.name?.toLowerCase().includes(q) || 
        r.nik?.includes(q)
      );
    }
    return list.slice(0, 5); // Limit search results to 5
  }, [residents, selectedProgram, searchResidentQuery]);

  const selectedResidentDetail = useMemo(() => {
    return residents.find(r => r.nik === selectedResidentNik) || null;
  }, [residents, selectedResidentNik]);

  if (showAddView) {
    return (
      <div className="max-w-5xl mx-auto pb-24 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header Section */}
        <div className="sticky top-16 z-40 bg-slate-50/60 dark:bg-slate-900/80 backdrop-blur-xl pb-4 -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => {
                setShowAddView(false);
                setSelectedResidentNik("");
                setSearchResidentQuery("");
                setFormProgram("");
                setCriteriaChecked({});
              }}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 shadow-sm dark:shadow-none border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:text-emerald-700 hover:border-emerald-200 transition-all active:scale-95"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tambah Penerima Bantuan</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Input data warga baru untuk program bantuan sosial desa.</p>
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-sm dark:shadow-none"
            >
              <Database className="w-5 h-5" />
              Import Massal
            </button>
            <button 
              onClick={() => {
                setShowAddView(false);
                setSelectedResidentNik("");
                setSearchResidentQuery("");
                setFormProgram("");
                setCriteriaChecked({});
              }}
              className="flex-1 sm:flex-none px-6 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all active:scale-95 bg-white dark:bg-slate-900"
            >
              Batal
            </button>
            <button 
              onClick={handleSaveAddForm}
              disabled={isSaving || !selectedResidentNik || !formProgram}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm dark:shadow-none hover:bg-emerald-800 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </div>

        {/* Main Form Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-8 space-y-6">
            {/* Section 1: Pilih Penduduk */}
            <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">1. Pilih Penduduk</h3>
              </div>

              <div className="space-y-4">
                <div ref={searchContainerRef} className="space-y-1.5 relative">
                  <div className="flex items-center justify-between ml-1 mb-1">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Cari Berdasarkan NIK atau Nama
                    </label>
                    <button 
                      onClick={() => setShowRecommendations(!showRecommendations)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${
                        showRecommendations 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100'
                      }`}
                    >
                      ✨ {showRecommendations ? 'Tutup Rekomendasi' : 'Rekomendasi AI'}
                    </button>
                  </div>
                  <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-700 transition-colors w-5 h-5" />
                    <input 
                      type="text" 
                      placeholder="Masukkan NIK 16 digit atau nama warga..."
                      value={searchResidentQuery}
                      onChange={(e) => {
                        setSearchResidentQuery(e.target.value);
                        if (selectedResidentNik) {
                          setSelectedResidentNik(""); // Clear selection if user types again
                        }
                      }}
                      className="w-full h-12 pl-11 pr-4 border border-gray-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none text-sm font-semibold text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-900 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 italic ml-1">Ketik nama/NIK, atau klik tombol Rekomendasi AI di atas.</p>

                  {/* Suggestion Dropdown */}
                  {(searchResidentQuery.trim() !== "" || showRecommendations) && !selectedResidentNik && (
                    <div className="absolute left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                      {searchResidentQuery.trim() === "" && searchResultsForAddView.length > 0 && (
                        <div className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider flex items-center gap-1.5">
                          ✨ Rekomendasi Cerdas AI
                        </div>
                      )}
                      {searchResultsForAddView.length === 0 ? (
                        <p className="p-4 text-xs text-gray-400 text-center font-medium">Warga tidak ditemukan</p>
                      ) : (
                        searchResultsForAddView.map(r => (
                          <button 
                            key={r.nik}
                            type="button"
                            onClick={() => {
                              setSelectedResidentNik(r.nik);
                              setSearchResidentQuery(r.name);
                              setShowRecommendations(false);
                            }}
                            className="w-full p-3.5 text-left hover:bg-emerald-50/40 cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-extrabold text-gray-800 dark:text-slate-100">{r.name}</p>
                                {r.vulnerabilityScore !== undefined && searchResidentQuery.trim() === "" && (
                                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                    Skor: {r.vulnerabilityScore}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 font-mono">NIK: {r.nik}</p>
                              {r.status?.toLowerCase().includes('meninggal') && (
                                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded">
                                  <AlertCircle className="w-3 h-3" />
                                  {r.status}
                                </span>
                              )}
                              {r.activeAids && r.activeAids.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {r.activeAids.map((aid: string, index: number) => (
                                    <span key={index} className="text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5">
                                      {aid}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">Pilih</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Resident Info Preview Card */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-gray-200/60 flex gap-4 items-start shadow-inner">
                  <div className="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                    <Users className="w-8 h-8" />
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Nama Lengkap</p>
                      <p className="font-bold text-gray-800 dark:text-slate-100 text-sm">{selectedResidentDetail ? selectedResidentDetail.name : "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">NIK</p>
                      <p className="font-bold text-gray-800 dark:text-slate-100 text-sm font-mono">{selectedResidentDetail ? selectedResidentDetail.nik : "-"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Alamat</p>
                      <p className="text-xs text-gray-600 dark:text-slate-400 font-semibold leading-relaxed">
                        {selectedResidentDetail 
                          ? `RT ${selectedResidentDetail.rt || "-"} / RW ${selectedResidentDetail.rw || "-"}, Desa ${selectedResidentDetail.desa || "Sukamaju"}, ${selectedResidentDetail.address || ""}`
                          : "Pilih warga terlebih dahulu..."}
                      </p>
                    </div>
                    {selectedResidentDetail && selectedResidentDetail.activeAids && selectedResidentDetail.activeAids.length > 0 && (
                      <div className="sm:col-span-2 mt-1">
                        <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Bantuan Aktif Saat Ini</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {selectedResidentDetail.activeAids.map((aid: string, index: number) => (
                            <span key={index} className="text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2.5 py-1">
                              {aid}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Overlap Info inside Card */}
                {selectedResidentDetail && selectedResidentDetail.activeAids && selectedResidentDetail.activeAids.length > 0 && (
                  <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-blue-800 text-sm">Penerima Beberapa Program Bantuan</p>
                      <p className="text-xs text-blue-600 mt-1 leading-relaxed">
                        Warga ini tercatat memiliki beberapa bantuan aktif: <strong className="font-extrabold">{selectedResidentDetail.activeAids.join(", ")}</strong>. Program baru akan ditambahkan dan diarsipkan secara aman ke dalam data penerima bantuan warga tsb.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Section 2: Detail Bantuan */}
            <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">2. Detail Program Bantuan</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Program Bantuan</label>
                  <select 
                    value={formProgram}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormProgram(val);
                      // Set dynamic defaults for amount and funding
                      if (val === "BLT Dana Desa") {
                        setFormAmount("300000");
                        setFormFunding("Dana Desa");
                      } else if (val === "Bantuan Pangan Non-Tunai") {
                        setFormAmount("200000");
                        setFormFunding("APBN");
                      } else if (val === "Program Keluarga Harapan (PKH)") {
                        setFormAmount("600000");
                        setFormFunding("APBN");
                      } else if (val === "Bansos Tunai Kemensos") {
                        setFormAmount("300000");
                        setFormFunding("APBN");
                      }
                    }}
                    className="w-full h-12 px-4 border border-gray-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none text-sm font-semibold text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                  >
                    <option value="">Pilih Program</option>
                    <option value="BLT Dana Desa">BLT Dana Desa</option>
                    <option value="Program Keluarga Harapan (PKH)">PKH (Program Keluarga Harapan)</option>
                    <option value="Bantuan Pangan Non-Tunai">BPNT (Bantuan Pangan Non-Tunai)</option>
                    <option value="Bansos Tunai Kemensos">Bansos Tunai Kemensos</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Tahun Anggaran</label>
                  <select 
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full h-12 px-4 border border-gray-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none text-sm font-semibold text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                  >
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Status Pengajuan</label>
                  <div className="w-full h-12 px-4 flex items-center bg-amber-50/50 border border-amber-100 rounded-xl text-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                    <span className="text-sm font-bold">Proses Verifikasi</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Besaran Bantuan</label>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 font-bold text-sm">Rp</span>
                    <input 
                      type="text"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="300.000"
                      className="w-full h-12 pl-10 pr-4 border border-gray-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none text-sm font-semibold text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Sumber Dana</label>
                  <select 
                    value={formFunding}
                    onChange={(e) => setFormFunding(e.target.value)}
                    className="w-full h-12 px-4 border border-gray-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none text-sm font-semibold text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                  >
                    <option value="">Pilih Sumber Dana</option>
                    <option value="Dana Desa">Dana Desa</option>
                    <option value="APBD Kabupaten">APBD Kabupaten</option>
                    <option value="APBN">APBN</option>
                    <option value="Bantuan Provinsi">Bantuan Provinsi</option>
                  </select>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Criteria & Actions */}
          <div className="lg:col-span-4">
            <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">3. Kriteria</h3>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Dinamis
                  </span>
                </div>

                {/* Empty State */}
                {!formProgram ? (
                  <div className="flex mb-6 flex-col items-center justify-center py-12 text-center border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50/40 px-4">
                    <AlertCircle className="w-12 h-12 text-gray-300 mb-3 animate-pulse" />
                    <p className="text-xs text-gray-500 dark:text-slate-400 italic max-w-[200px] leading-relaxed">
                      Pilih program bantuan terlebih dahulu untuk melihat kriteria yang relevan.
                    </p>
                  </div>
                ) : (
                  /* Dynamic Criteria Checklists */
                  <div className="space-y-3">
                    {formProgram === "BLT Dana Desa" && (
                      <>
                        <label className="flex items-start gap-3.5 p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer group border border-transparent hover:border-gray-100">
                          <input 
                            type="checkbox"
                            checked={!!criteriaChecked["low_income"]}
                            onChange={(e) => setCriteriaChecked({ ...criteriaChecked, "low_income": e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-emerald-700 focus:ring-emerald-500 focus:ring-offset-0 mt-0.5" 
                          />
                          <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-slate-100">Penghasilan Rendah</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-normal mt-0.5 font-medium">Keluarga dengan pendapatan di bawah UMR desa.</p>
                          </div>
                        </label>
                        <label className="flex items-start gap-3.5 p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer group border border-transparent hover:border-gray-100">
                          <input 
                            type="checkbox"
                            checked={!!criteriaChecked["job_loss"]}
                            onChange={(e) => setCriteriaChecked({ ...criteriaChecked, "job_loss": e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-emerald-700 focus:ring-emerald-500 focus:ring-offset-0 mt-0.5" 
                          />
                          <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-slate-100">Kehilangan Pekerjaan</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-normal mt-0.5 font-medium">PHK atau usaha terhenti akibat kondisi darurat.</p>
                          </div>
                        </label>
                      </>
                    )}

                    {formProgram === "Program Keluarga Harapan (PKH)" && (
                      <>
                        <label className="flex items-start gap-3.5 p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer group border border-transparent hover:border-gray-100">
                          <input 
                            type="checkbox"
                            checked={!!criteriaChecked["elderly"]}
                            onChange={(e) => setCriteriaChecked({ ...criteriaChecked, "elderly": e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-emerald-700 focus:ring-emerald-500 focus:ring-offset-0 mt-0.5" 
                          />
                          <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-slate-100">Lanjut Usia (Lansia)</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-normal mt-0.5 font-medium">Berusia di atas 60 tahun & tidak produktif.</p>
                          </div>
                        </label>
                        <label className="flex items-start gap-3.5 p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer group border border-transparent hover:border-gray-100">
                          <input 
                            type="checkbox"
                            checked={!!criteriaChecked["disability"]}
                            onChange={(e) => setCriteriaChecked({ ...criteriaChecked, "disability": e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-emerald-700 focus:ring-emerald-500 focus:ring-offset-0 mt-0.5" 
                          />
                          <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-slate-100">Disabilitas</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-normal mt-0.5 font-medium">Memiliki keterbatasan fisik atau mental.</p>
                          </div>
                        </label>
                      </>
                    )}

                    {formProgram === "Bantuan Pangan Non-Tunai" && (
                      <>
                        <label className="flex items-start gap-3.5 p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer group border border-transparent hover:border-gray-100">
                          <input 
                            type="checkbox"
                            checked={!!criteriaChecked["disability"]}
                            onChange={(e) => setCriteriaChecked({ ...criteriaChecked, "disability": e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-emerald-700 focus:ring-emerald-500 focus:ring-offset-0 mt-0.5" 
                          />
                          <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-slate-100">Disabilitas</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-normal mt-0.5 font-medium">Memiliki keterbatasan fisik atau mental.</p>
                          </div>
                        </label>
                        <label className="flex items-start gap-3.5 p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer group border border-transparent hover:border-gray-100">
                          <input 
                            type="checkbox"
                            checked={!!criteriaChecked["low_income"]}
                            onChange={(e) => setCriteriaChecked({ ...criteriaChecked, "low_income": e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-emerald-700 focus:ring-emerald-500 focus:ring-offset-0 mt-0.5" 
                          />
                          <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-slate-100">Penghasilan Rendah</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-normal mt-0.5 font-medium">Keluarga dengan pendapatan di bawah UMR desa.</p>
                          </div>
                        </label>
                      </>
                    )}

                    {formProgram === "Bansos Tunai Kemensos" && (
                      <>
                        <label className="flex items-start gap-3.5 p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer group border border-transparent hover:border-gray-100">
                          <input 
                            type="checkbox"
                            checked={!!criteriaChecked["low_income"]}
                            onChange={(e) => setCriteriaChecked({ ...criteriaChecked, "low_income": e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-emerald-700 focus:ring-emerald-500 focus:ring-offset-0 mt-0.5" 
                          />
                          <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-slate-100">Penghasilan Rendah</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-normal mt-0.5 font-medium">Keluarga dengan pendapatan di bawah UMR desa.</p>
                          </div>
                        </label>
                        <label className="flex items-start gap-3.5 p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer group border border-transparent hover:border-gray-100">
                          <input 
                            type="checkbox"
                            checked={!!criteriaChecked["job_loss"]}
                            onChange={(e) => setCriteriaChecked({ ...criteriaChecked, "job_loss": e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-emerald-700 focus:ring-emerald-500 focus:ring-offset-0 mt-0.5" 
                          />
                          <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-slate-100">Kehilangan Pekerjaan</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-normal mt-0.5 font-medium">PHK atau usaha terhenti akibat kondisi darurat.</p>
                          </div>
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>

            </section>
          </div>
        </div>

        {/* Info Alert Banner */}
        <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100/60 flex gap-3.5 items-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-800 font-medium">
            Data yang disimpan akan melalui tahap verifikasi lanjutan oleh Tim Pengelola Bantuan Desa sebelum ditetapkan sebagai penerima sah.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-6">

      {/* Success Notification */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">{message.text}</p>
        </div>
      )}

      {/* Welcome Header */}
      <div className="sticky top-16 z-40 bg-slate-50/60 dark:bg-slate-900/80 backdrop-blur-xl pb-4 -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Program Bantuan Aktif</h3>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Kelola dan validasi penerima bantuan sosial Desa Sukamaju secara langsung.</p>
        </div>
        <button 
          onClick={() => {
            setSelectedResidentNik("");
            setSearchResidentQuery("");
            setFormProgram(selectedProgram);
            if (selectedProgram === "BLT Dana Desa") {
              setFormAmount("300000");
              setFormFunding("Dana Desa");
            } else if (selectedProgram === "Bantuan Pangan Non-Tunai") {
              setFormAmount("200000");
              setFormFunding("APBN");
            } else if (selectedProgram === "Program Keluarga Harapan (PKH)") {
              setFormAmount("600000");
              setFormFunding("APBN");
            } else {
              setFormAmount("300000");
              setFormFunding("APBN");
            }
            setShowAddView(true);
          }}
          className="flex items-center justify-center gap-2 bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-800 active:scale-95 transition-all shadow-sm dark:shadow-none"
        >
          <UserPlus className="w-5 h-5" />
          Tambah Penerima
        </button>
      </div>

      {/* Program Overview Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card BLT */}
        <div 
          onClick={() => {
            setSelectedProgram("BLT Dana Desa");
            setShowOverlapOnly(false);
          }}
          className={`cursor-pointer bg-white dark:bg-slate-900 border p-6 rounded-2xl flex flex-col justify-between h-[150px] relative overflow-hidden transition-all ${
            selectedProgram === "BLT Dana Desa" && !showOverlapOnly
              ? 'border-emerald-600 ring-4 ring-emerald-50 shadow-md dark:shadow-none' 
              : 'border-gray-100 dark:border-slate-800 hover:shadow-md'
          }`}
        >
          <div className="flex justify-between items-start relative z-10">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selectedProgram === "BLT Dana Desa" && !showOverlapOnly ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
            }`}>
              <Banknote className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">Desa</span>
          </div>
          <div className="mt-2">
            <p className="text-[11px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">BLT Dana Desa</p>
            <h4 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{stats.blt} <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Penerima</span></h4>
          </div>
        </div>

        {/* Card PKH */}
        <div 
          onClick={() => {
            setSelectedProgram("Program Keluarga Harapan (PKH)");
            setShowOverlapOnly(false);
          }}
          className={`cursor-pointer bg-white dark:bg-slate-900 border p-6 rounded-2xl flex flex-col justify-between h-[150px] relative overflow-hidden transition-all ${
            selectedProgram === "Program Keluarga Harapan (PKH)" && !showOverlapOnly
              ? 'border-blue-600 ring-4 ring-blue-50 shadow-md dark:shadow-none' 
              : 'border-gray-100 dark:border-slate-800 hover:shadow-md'
          }`}
        >
          <div className="flex justify-between items-start relative z-10">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selectedProgram === "Program Keluarga Harapan (PKH)" && !showOverlapOnly ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">Keluarga</span>
          </div>
          <div className="mt-2">
            <p className="text-[11px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">PKH (Harapan)</p>
            <h4 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{stats.pkh} <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Penerima</span></h4>
          </div>
        </div>

        {/* Card BPNT */}
        <div 
          onClick={() => {
            setSelectedProgram("Bantuan Pangan Non-Tunai");
            setShowOverlapOnly(false);
          }}
          className={`cursor-pointer bg-white dark:bg-slate-900 border p-6 rounded-2xl flex flex-col justify-between h-[150px] relative overflow-hidden transition-all ${
            selectedProgram === "Bantuan Pangan Non-Tunai" && !showOverlapOnly
              ? 'border-amber-600 ring-4 ring-amber-50 shadow-md dark:shadow-none' 
              : 'border-gray-100 dark:border-slate-800 hover:shadow-md'
          }`}
        >
          <div className="flex justify-between items-start relative z-10">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selectedProgram === "Bantuan Pangan Non-Tunai" && !showOverlapOnly ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700'
            }`}>
              <ShoppingBasket className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full">Pangan</span>
          </div>
          <div className="mt-2">
            <p className="text-[11px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">Pangan Non-Tunai</p>
            <h4 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{stats.bpnt} <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Penerima</span></h4>
          </div>
        </div>
      </div>

      {/* Warning Bar (Overlap Detection) */}
      {stats.overlaps.length > 0 && (
        <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center gap-5 transition-all ${
          showOverlapOnly 
            ? 'bg-red-100 border-red-300 text-red-900' 
            : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h5 className="font-bold text-base text-red-800">Tumpang Tindih Penerima Terdeteksi</h5>
            <p className="text-xs text-red-700/90 mt-0.5">Sistem mendeteksi <strong>{stats.overlaps.length} warga</strong> menerima lebih dari satu jenis bantuan sosial aktif.</p>
          </div>
          <button 
            onClick={() => setShowOverlapOnly(prev => !prev)}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm dark:shadow-none w-full md:w-auto mt-3 md:mt-0 ${
              showOverlapOnly 
                ? 'bg-red-800 text-white hover:bg-red-950' 
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {showOverlapOnly ? "Tampilkan Semua" : "Lihat Penerima Ganda"}
          </button>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/20">
          <div className="flex items-center gap-3">
            <h4 className="font-bold text-lg text-gray-900 dark:text-white">
              {showOverlapOnly ? "Tumpang Tindih (Penerima Ganda)" : `Penerima ${selectedProgram}`}
            </h4>
            <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded-full text-xs font-bold text-gray-600 dark:text-slate-400">
              {filteredResidents.length} Jiwa
            </span>
            {!showOverlapOnly && (
              <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {disbursedNiks.length} / {filteredResidents.length} Sudah Salur
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            >
              <option value="Semua Tahun">Semua Tahun</option>
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
            <button
              onClick={() => setShowBaModal(true)}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Cetak BA Musdes
            </button>
            <div className="relative flex-1 sm:w-[240px]">
              <input 
                type="text" 
                placeholder="Cari penerima bantuan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">NIK / NAMA</th>
                <th className="px-6 py-4 font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">DUSUN / RT / RW</th>
                <th className="px-6 py-4 font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">DTKS & BANTUAN LAIN</th>
                <th className="px-6 py-4 font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">STATUS & SALUR</th>
                <th className="px-6 py-4 font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                    <span className="inline-block animate-spin mr-2">⏳</span> Mengambil data real dari server...
                  </td>
                </tr>
              ) : filteredResidents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                    Tidak ada penerima bantuan aktif untuk pencarian ini.
                  </td>
                </tr>
              ) : (
                filteredResidents.map((resident) => {
                  const otherAids = (resident.activeAids || []).filter((aid: string) => 
                    showOverlapOnly ? true : aid !== selectedProgram
                  );
                  const isOverlap = (resident.activeAids || []).length > 1;

                  return (
                    <tr 
                      key={resident.nik} 
                      onClick={() => setSelectedResidentDetailModal(resident)}
                      className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-emerald-700 transition-colors">{resident.nik}</p>
                        <p className="text-sm font-semibold text-gray-600 dark:text-slate-400">{resident.name}</p>
                        {resident.status?.toLowerCase().includes('meninggal') && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md">
                            <AlertCircle className="w-3 h-3" />
                            {resident.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                        {resident.desa || "Sukamaju"} / RT {resident.rt || "-"} / RW {resident.rw || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 w-max px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold rounded border border-indigo-100">
                            Terdaftar DTKS
                          </span>
                          {otherAids.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {otherAids.map((aid: string) => (
                                <span key={aid} className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded-md border border-red-100">
                                  {aid}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">Bantuan Tunggal</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          {isOverlap ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold text-[10px] border border-red-200">
                              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
                              Tumpang Tindih
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] border border-emerald-200">
                              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                              Valid / Sesuai
                            </div>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const isAlready = disbursedNiks.includes(resident.nik);
                              if (isAlready) {
                                setDisbursedNiks(prev => prev.filter(n => n !== resident.nik));
                                showToast(`Status penyaluran ${resident.name} diubah menjadi Belum Salur`, "info");
                              } else {
                                setDisbursedNiks(prev => [...prev, resident.nik]);
                                showToast(`Berhasil menandai ${resident.name} telah menerima salur ${selectedProgram}`, "success");
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                              disbursedNiks.includes(resident.nik)
                                ? 'bg-emerald-600 text-white border-emerald-700'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            {disbursedNiks.includes(resident.nik) ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-white" />
                                Terisi Salur (Tahap I)
                              </>
                            ) : (
                              <>
                                <Banknote className="w-3 h-3" />
                                Tandai Disalurkan
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {showOverlapOnly ? (
                          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Hapus via Program Utama</p>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAid(resident.nik, selectedProgram);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1.5 font-bold text-xs"
                            title="Hapus Penerima"
                          >
                            <Trash2 className="w-4 h-4" />
                            Keluarkan
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Penerima */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 flex justify-between items-center border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-xl text-emerald-800">Tambah Penerima Bantuan</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full text-gray-500 dark:text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Program Name Badge */}
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl flex justify-between items-center border border-emerald-100">
                <span className="text-xs font-bold uppercase tracking-wider">Program Sasaran:</span>
                <span className="text-sm font-extrabold">{selectedProgram}</span>
              </div>

              {/* Search Section */}
              <div>
                <label className="block text-xs font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">CARI NAMA / NIK WARGA</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Masukkan nama atau NIK warga..."
                    value={searchResidentQuery}
                    onChange={(e) => {
                      setSearchResidentQuery(e.target.value);
                      setSelectedResidentNik(""); // Reset selection if typing
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm font-semibold text-gray-800 dark:text-slate-100"
                  />
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                {/* Live Search Suggestion Box */}
                {searchResidentQuery.trim() !== "" && !selectedResidentNik && (
                  <div className="mt-2 border border-gray-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-lg dark:shadow-none overflow-hidden divide-y divide-gray-50 max-h-[180px] overflow-y-auto">
                    {availableResidentsForModal.length === 0 ? (
                      <p className="p-3.5 text-xs text-gray-400 text-center font-medium">Warga tidak ditemukan atau sudah terdaftar di program ini</p>
                    ) : (
                      availableResidentsForModal.map(r => (
                        <div 
                          key={r.nik}
                          onClick={() => {
                            setSelectedResidentNik(r.nik);
                            setSearchResidentQuery(r.name);
                          }}
                          className="p-3.5 hover:bg-emerald-50/40 cursor-pointer transition-colors text-left flex justify-between items-center"
                        >
                          <div>
                            <p className="text-sm font-extrabold text-gray-800 dark:text-slate-100">{r.name}</p>
                            <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400">NIK: {r.nik}</p>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Pilih</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Resident Info Box & Overlap Check (Visible only when resident selected) */}
              {selectedResidentDetail && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {/* Overlap Check Banner */}
                  {selectedResidentDetail.activeAids && selectedResidentDetail.activeAids.length > 0 ? (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-4">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-red-800 text-sm">Peringatan Penerimaan Ganda</p>
                        <p className="text-xs text-red-600 mt-1 leading-relaxed">
                          Warga ini sudah menerima program aktif: <strong className="font-bold">{selectedResidentDetail.activeAids.join(", ")}</strong>. Pastikan aturan program membolehkan akumulasi bantuan.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-4">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-800 text-sm">Warga Layak Bantuan</p>
                        <p className="text-xs text-emerald-600 mt-1">Warga ini tidak sedang menerima program bantuan sosial aktif lainnya.</p>
                      </div>
                    </div>
                  )}

                  {/* Details Form (Disabled until NIK verified) */}
                  <div className="space-y-4 border border-gray-100 dark:border-slate-800 p-4 rounded-xl bg-gray-50/30">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">NAMA LENGKAP</label>
                      <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{selectedResidentDetail.name}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">ALAMAT RT / RW</label>
                      <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                        RT {selectedResidentDetail.rt || "-"} / RW {selectedResidentDetail.rw || "-"}, {selectedResidentDetail.desa || "Sukamaju"}, {selectedResidentDetail.address || ""}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">STATUS HUBUNGAN / PEKERJAAN</label>
                      <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">
                        {selectedResidentDetail.familyRelation || "Kepala Keluarga"} — {selectedResidentDetail.job || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-gray-50/50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-200 rounded-xl transition-all text-sm"
              >
                Batal
              </button>
              <button 
                onClick={handleAddAid}
                disabled={!selectedResidentNik || isSaving}
                className="bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-800 shadow-sm dark:shadow-none transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? "Menyimpan..." : "Simpan Penerima"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Berita Acara Musdes */}
      {showBaModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-600" />
                <h3 className="font-bold text-xl text-gray-900 dark:text-white">Dokumen Berita Acara Musdes</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" /> Cetak Dokumen (PDF)
                </button>
                <button 
                  onClick={() => setShowBaModal(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 md:p-12 space-y-8 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 font-serif leading-relaxed text-sm print:p-0 print:text-black">
              {/* KOP Desa Header */}
              <div className="text-center border-b-4 border-double border-gray-900 dark:border-white pb-6 space-y-1">
                <h2 className="text-xl font-bold uppercase tracking-wider">PEMERINTAH KABUPATEN BOGOR</h2>
                <h1 className="text-2xl font-black uppercase tracking-wide">KECAMATAN CIBINONG — DESA SUKAMAJU</h1>
                <p className="text-xs font-sans text-gray-600 dark:text-slate-400 italic">Jl. Raya Sukamaju No. 01, Kode Pos 16910 • Website: sukamaju.desa.id</p>
              </div>

              {/* Document Title */}
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold uppercase underline tracking-wide">BERITA ACARA MUSYAWARAH DESA</h3>
                <p className="text-xs font-sans font-bold text-gray-700 dark:text-slate-300">
                  PENETAPAN KELUARGA PENERIMA MANFAAT (KPM) PROGRAM {selectedProgram.toUpperCase()} TAHUN 2026
                </p>
                <p className="text-xs font-sans text-gray-500">Nomor: 140 / BA-MUSDES / {new Date().getFullYear()}</p>
              </div>

              {/* Preamble */}
              <div className="space-y-3 text-justify font-sans text-xs md:text-sm">
                <p>
                  Pada hari ini <strong>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>, bertempat di Balai Desa Sukamaju, telah diselenggarakan Musyawarah Desa (Musdes) penetapan usulan calon Keluarga Penerima Manfaat (KPM) program bantuan sosial <strong>{selectedProgram}</strong>.
                </p>
                <p>
                  Berdasarkan verifikasi kriteria kelayakan dan ketersediaan anggaran desa, disepakati bahwa nama-nama warga masyarakat di bawah ini dinyatakan <strong>SAH dan LAYAK</strong> sebagai penerima bantuan:
                </p>
              </div>

              {/* Recipients Table */}
              <div className="overflow-x-auto font-sans">
                <table className="w-full border-collapse border border-gray-400 text-xs">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-slate-800 text-center font-bold">
                      <th className="border border-gray-400 px-3 py-2 w-10">NO</th>
                      <th className="border border-gray-400 px-3 py-2">NIK</th>
                      <th className="border border-gray-400 px-3 py-2">NAMA LENGKAP</th>
                      <th className="border border-gray-400 px-3 py-2">ALAMAT / RT / RW</th>
                      <th className="border border-gray-400 px-3 py-2">STATUS KRITERIA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResidents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="border border-gray-400 px-3 py-4 text-center text-gray-500 italic">Belum ada penerima bantuan yang ditetapkan dalam program ini.</td>
                      </tr>
                    ) : (
                      filteredResidents.map((res, index) => (
                        <tr key={res.nik} className="hover:bg-gray-50">
                          <td className="border border-gray-400 px-3 py-2 text-center font-bold">{index + 1}</td>
                          <td className="border border-gray-400 px-3 py-2 font-mono font-semibold">{res.nik}</td>
                          <td className="border border-gray-400 px-3 py-2 font-bold">{res.name}</td>
                          <td className="border border-gray-400 px-3 py-2">RT {res.rt || "-"} / RW {res.rw || "-"}, Desa Sukamaju</td>
                          <td className="border border-gray-400 px-3 py-2 text-center font-semibold text-emerald-700">Terverifikasi Layak</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Closing */}
              <p className="font-sans text-xs md:text-sm text-justify">
                Demikian Berita Acara ini dibuat dan disahkan dengan penuh tanggung jawab untuk dipergunakan sebagaimana mestinya.
              </p>

              {/* Signatures Grid */}
              <div className="pt-8 font-sans text-xs grid grid-cols-3 gap-6 text-center">
                <div className="space-y-16">
                  <p className="font-bold">Ketua BPD Sukamaju</p>
                  <p className="font-bold underline uppercase">( H. AHMYAD SODIK, S.IP )</p>
                </div>
                <div className="space-y-16">
                  <p className="font-bold">Sekretaris Desa</p>
                  <p className="font-bold underline uppercase">( MUHAMMAD RIFQI, S.KOM )</p>
                </div>
                <div className="space-y-16">
                  <p className="font-bold">Kepala Desa Sukamaju</p>
                  <p className="font-bold underline uppercase">( DRS. H. SUKIRMAN )</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nice custom confirm modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        type="danger"
        confirmText="Ya, Hapus"
        cancelText="Batal"
      />

      {/* Resident Detail Modal on Row Click */}
      {showImport && (
        <AdminBantuanImport 
          onClose={() => setShowImport(false)} 
          onRefresh={fetchData} 
          existingResidents={residents} 
        />
      )}

      {selectedResidentDetailModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] overflow-y-auto">
            <AdminPendudukDetail 
              data={selectedResidentDetailModal}
              onBack={() => setSelectedResidentDetailModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
