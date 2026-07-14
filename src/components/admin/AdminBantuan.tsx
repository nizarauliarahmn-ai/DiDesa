import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { showToast } from '../../utils/toast';
import ConfirmModal from '../common/ConfirmModal';

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
  const [searchResidentQuery, setSearchResidentQuery] = useState("");
  const [selectedResidentNik, setSelectedResidentNik] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Dedicated view states for "Tambah Penerima Bantuan"
  const [showAddView, setShowAddView] = useState(false);
  const [formProgram, setFormProgram] = useState("");
  const [formAmount, setFormAmount] = useState("300000");
  const [formFunding, setFormFunding] = useState("");
  const [criteriaChecked, setCriteriaChecked] = useState<Record<string, boolean>>({});

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
    }
    return list.slice(0, 5); // Limit search results to 5
  }, [residents, formProgram, searchResidentQuery]);

  // Fetch residents and DB status
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/residents");
      if (res.ok) {
        const data = await res.json();
        setResidents(data);
      }
      
      const dbStatusRes = await fetch("/api/db-status");
      if (dbStatusRes.ok) {
        const dbStatus = await dbStatusRes.json();
        setDbEngine(dbStatus.engine);
      }
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
    const bltCount = residents.filter(r => r.activeAids?.includes("BLT Dana Desa")).length;
    const pkhCount = residents.filter(r => r.activeAids?.includes("Program Keluarga Harapan (PKH)")).length;
    const bpntCount = residents.filter(r => r.activeAids?.includes("Bantuan Pangan Non-Tunai")).length;
    
    // Residents with multiple aids (Overlap / Tumpang Tindih)
    const overlapResidents = residents.filter(r => r.activeAids && r.activeAids.length > 1);
    
    return {
      blt: bltCount,
      pkh: pkhCount,
      bpnt: bpntCount,
      overlaps: overlapResidents
    };
  }, [residents]);

  // Filtered list of residents based on search and selected program
  const filteredResidents = useMemo(() => {
    let list = residents;

    if (showOverlapOnly) {
      // Show only residents with overlap
      list = stats.overlaps;
    } else {
      // Filter by currently selected program
      list = residents.filter(r => r.activeAids?.includes(selectedProgram));
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
      "Hapus Penerima Bantuan",
      `Apakah Anda yakin ingin menghapus bantuan "${programToRemove}" dari warga ${targetResident.name}?`,
      async () => {
        const updatedAids = (targetResident.activeAids || []).filter((aid: string) => aid !== programToRemove);

        try {
          const res = await fetch(`/api/residents/${nik}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activeAids: updatedAids })
          });

          if (res.ok) {
            // Update local state directly
            setResidents(prev => prev.map(r => r.nik === nik ? { ...r, activeAids: updatedAids } : r));
            showToast(`Berhasil mengeluarkan ${targetResident.name} dari program ${programToRemove}`, "success");
          } else {
            throw new Error("Gagal mengupdate data di database");
          }
        } catch (err: any) {
          showToast(err.message || "Gagal mengeluarkan warga dari program bantuan", "error");
        }
      }
    );
  };

  // Add aid program to a resident
  const handleAddAid = async () => {
    if (!selectedResidentNik) return;
    const targetResident = residents.find(r => r.nik === selectedResidentNik);
    if (!targetResident) return;

    const currentAids = targetResident.activeAids || [];
    if (currentAids.includes(selectedProgram)) {
      showToast("Warga ini sudah menerima bantuan program ini.", "error");
      return;
    }

    const updatedAids = [...currentAids, selectedProgram];
    setIsSaving(true);

    try {
      const res = await fetch(`/api/residents/${selectedResidentNik}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeAids: updatedAids })
      });

      if (res.ok) {
        setResidents(prev => prev.map(r => r.nik === selectedResidentNik ? { ...r, activeAids: updatedAids } : r));
        setShowModal(false);
        setSelectedResidentNik("");
        setSearchResidentQuery("");
        showToast(`Berhasil menambahkan ${targetResident.name} ke program ${selectedProgram}`, "success");
      } else {
        throw new Error("Gagal menyimpan data ke database");
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
      const res = await fetch(`/api/residents/${selectedResidentNik}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeAids: updatedAids })
      });

      if (res.ok) {
        setResidents(prev => prev.map(r => r.nik === selectedResidentNik ? { ...r, activeAids: updatedAids } : r));
        setShowAddView(false);
        setSelectedResidentNik("");
        setSearchResidentQuery("");
        setFormProgram("");
        setCriteriaChecked({});
        showToast(`Berhasil menambahkan ${targetResident.name} ke program ${formProgram}`, "success");
      } else {
        throw new Error("Gagal menyimpan data ke database");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal menambahkan warga ke program bantuan", "error");
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
                <div className="space-y-1.5 relative">
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                    Cari Berdasarkan NIK atau Nama
                  </label>
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
                  <p className="text-[11px] text-gray-400 italic ml-1">Ketik nama atau NIK warga untuk mulai mencari</p>

                  {/* Suggestion Dropdown */}
                  {searchResidentQuery.trim() !== "" && !selectedResidentNik && (
                    <div className="absolute left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden divide-y divide-gray-100 max-h-[220px] overflow-y-auto">
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
                            }}
                            className="w-full p-3.5 text-left hover:bg-emerald-50/40 cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <div className="text-left">
                              <p className="text-sm font-extrabold text-gray-800 dark:text-slate-100">{r.name}</p>
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
      {/* DB Engine Indicator Header Badge */}
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-xs font-bold border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none">
          <Database className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>Koneksi Live:</span>
          <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
            dbEngine === 'Drizzle' ? 'bg-indigo-100 text-indigo-700' : 
            dbEngine === 'Supabase' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {dbEngine.toUpperCase()} ENGINE
          </span>
        </div>
      </div>

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
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
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
                <th className="px-6 py-4 font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">BANTUAN LAIN</th>
                <th className="px-6 py-4 font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">STATUS</th>
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
                    <tr key={resident.nik} className="hover:bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{resident.nik}</p>
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
                        {otherAids.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {otherAids.map((aid: string) => (
                              <span key={aid} className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded-md border border-red-100">
                                {aid}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isOverlap ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold text-[10px] border border-red-200">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
                            Tumpang Tindih
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] border border-emerald-200">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                            Sesuai / Valid
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {showOverlapOnly ? (
                          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Hapus via Program Utama</p>
                        ) : (
                          <button 
                            onClick={() => handleRemoveAid(resident.nik, selectedProgram)}
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
    </div>
  );
}
