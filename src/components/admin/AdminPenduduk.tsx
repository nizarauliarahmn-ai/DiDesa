import NumberCounter from '../common/NumberCounter';
import { fetchResidentsCached } from '../../utils/apiCache';
import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, Upload, UserPlus, Search, Filter, FilterX, Eye, Edit2, ChevronLeft, ChevronRight, Users, Heart, Baby, Smile, User, Sparkles, Zap } from 'lucide-react';
import AdminPendudukDetail from './penduduk/AdminPendudukDetail';
import AdminPendudukEdit from './penduduk/AdminPendudukEdit';
import AdminPendudukImport from './penduduk/AdminPendudukImport';
import AdminPendudukArchive from './penduduk/AdminPendudukArchive';
import { showToast } from '../../utils/toast';

const FILTERS = ["Semua", "RW 01", "RW 02", "RT 01", "RT 02", "Kawin", "Belum Kawin", "Cerai Mati", "Lansia"];

export default function AdminPenduduk({ 
  onNavigateToTab, 
  onSetPresetResident,
  searchQuery: externalSearchQuery,
  setSearchQuery: externalSetSearchQuery,
  debouncedSearchQuery: externalDebouncedSearchQuery
}: { 
  onNavigateToTab?: (tab: string) => void;
  onSetPresetResident?: (resident: any) => void;
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  debouncedSearchQuery?: string;
}) {
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localDebouncedSearchQuery, setLocalDebouncedSearchQuery] = useState('');
  
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

  const [activeFilter, setActiveFilter] = useState('Semua');
  const [sortOrder, setSortOrder] = useState('No. KK');
  const [showQuickFilters, setShowQuickFilters] = useState(true);
  const [selectedPenduduk, setSelectedPenduduk] = useState<any>(null);
  const [editingPenduduk, setEditingPenduduk] = useState<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const itemsPerPage = 10;

  // Reset current page when debounced search query, filter or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, activeFilter, sortOrder]);

  const fetchResidents = () => {
    setLoading(true);
    fetchResidentsCached()
      .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
      .then(data => {
        setResidents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading residents:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetch('/api/supabase-status')
      .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
      .then(status => setSupabaseStatus(status))
      .catch(err => console.error("Error loading Supabase status:", err));

    fetchResidents();
  }, []);

  const handleSavePenduduk = (savedResident: any) => {
    const isEdit = !!editingPenduduk && !!editingPenduduk.nik;
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/api/residents/${editingPenduduk.nik}` : '/api/residents';

    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(savedResident)
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Gagal menyimpan data ke database');
        }
        return res.json();
      })
      .then(data => {
        setResidents(prev => {
          if (isEdit) {
            return prev.map(r => r.nik === editingPenduduk.nik ? savedResident : r);
          } else {
            return [savedResident, ...prev];
          }
        });
        showToast(isEdit ? `Data warga ${savedResident.name} berhasil diperbarui!` : `Warga baru ${savedResident.name} berhasil didaftarkan!`, "success");
      })
      .catch(err => {
        console.error("Error saving resident to database:", err);
        // Optimistic update
        setResidents(prev => {
          if (isEdit) {
            return prev.map(r => r.nik === editingPenduduk.nik ? savedResident : r);
          } else {
            return [savedResident, ...prev];
          }
        });
        showToast(isEdit ? `Gagal menyimpan data warga!` : `Gagal menambahkan warga baru!`, "error");
      });

    setEditingPenduduk(null);
  };

  const filteredData = useMemo(() => {
    let result = residents.filter((item) => {
      // Search filter
      const matchesSearch = 
        item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
        item.nik.includes(debouncedSearchQuery);

      // Category filter
      let matchesFilter = true;
      if (activeFilter !== 'Semua') {
        if (activeFilter.startsWith('RW')) {
          const rw = activeFilter.split(' ')[1];
          const itemRw = item.rw || (item.rtRw ? item.rtRw.split(/[\/\s-]+/)[1] : '');
          matchesFilter = (itemRw || '').trim().padStart(2, '0') === rw.trim().padStart(2, '0');
        } else if (activeFilter.startsWith('RT')) {
          const rt = activeFilter.split(' ')[1];
          const itemRt = item.rt || (item.rtRw ? item.rtRw.split(/[\/\s-]+/)[0] : '');
          matchesFilter = (itemRt || '').trim().padStart(2, '0') === rt.trim().padStart(2, '0');
        } else if (activeFilter === 'Lansia') {
          matchesFilter = typeof item.age === 'number' ? item.age >= 60 : parseInt(item.age || '0') >= 60;
        } else {
          matchesFilter = item.status === activeFilter;
        }
      }

      return matchesSearch && matchesFilter;
    });

    // Sorting
    if (sortOrder === 'No. KK') {
      result = [...result].sort((a, b) => {
        const kkA = a.noKk || '';
        const kkB = b.noKk || '';
        return kkA.localeCompare(kkB);
      });
    } else if (sortOrder === 'A-Z Nama') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'Z-A Nama') {
      result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [residents, debouncedSearchQuery, activeFilter, sortOrder]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  const villageName = localStorage.getItem('village_name') || 'Desa Sukamaju';

  const handleRequestDelete = async (nik: string, name: string) => {
    if (!confirm(`Anda yakin ingin mengajukan penghapusan data penduduk ${name}? Data tidak akan dihapus langsung, melainkan menunggu persetujuan Super Admin.`)) return;
    
    try {
      const res = await fetch(`/api/residents/${nik}/request-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'delete' })
      });
      if (res.ok) {
        showToast(`Pengajuan hapus data ${name} berhasil dikirim ke Super Admin!`, 'success');
        fetchResidents();
        // Dispatch global event for notification bubble update
        window.dispatchEvent(new Event('notifications_updated'));
      } else {
        throw new Error('Gagal mengajukan penghapusan');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleExportData = (format: 'json' | 'csv') => {
    if (residents.length === 0) {
      showToast("Tidak ada data penduduk yang dapat diexport.", "error");
      return;
    }

    let fileContent = '';
    let fileName = '';
    let mimeType = '';

    if (format === 'json') {
      fileContent = JSON.stringify(residents, null, 2);
      fileName = `Backup_Penduduk_${villageName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      // CSV format
      const headers = ['NIK', 'No KK', 'Nama Lengkap', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Golongan Darah', 'Agama', 'Pekerjaan', 'Status Perkawinan', 'RT', 'RW', 'Desa', 'Alamat', 'Status Domisili', 'Hubungan Keluarga', 'Pendidikan', 'Nama Ayah Kandung', 'Nama Ibu Kandung'];
      const rows = residents.map(r => [
        `"${r.nik || ''}"`,
        `"${r.noKk || ''}"`,
        `"${r.name || ''}"`,
        `"${r.gender || ''}"`,
        `"${r.birthPlace || ''}"`,
        `"${r.birthDate || ''}"`,
        `"${r.bloodType || ''}"`,
        `"${r.religion || ''}"`,
        `"${r.job || ''}"`,
        `"${r.status || ''}"`,
        `"${r.rt || ''}"`,
        `"${r.rw || ''}"`,
        `"${r.desa || ''}"`,
        `"${r.address || ''}"`,
        `"${r.domicileStatus || ''}"`,
        `"${r.familyRelation || ''}"`,
        `"${r.education || ''}"`,
        `"${r.fatherName || ''}"`,
        `"${r.motherName || ''}"`
      ]);

      fileContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      fileName = `Backup_Penduduk_${villageName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv;charset=utf-8;';
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const totalCount = residents.length;
  const getKepalaKeluarga = (noKk: string) => {
    if (!noKk) return '-';
    const head = residents.find(r => r.noKk === noKk && r.familyRelation === 'Kepala Keluarga');
    return head ? head.name : '-';
  };
  const maleCount = residents.filter(r => r.gender === 'Laki-laki').length;
  const femaleCount = residents.filter(r => r.gender === 'Perempuan').length;

  const childCount = residents.filter(r => {
    const age = parseInt(r.age);
    return !isNaN(age) && age >= 0 && age < 12;
  }).length;
  const teenagerCount = residents.filter(r => {
    const age = parseInt(r.age);
    return !isNaN(age) && age >= 12 && age <= 17;
  }).length;
  const adultCount = residents.filter(r => {
    const age = parseInt(r.age);
    return !isNaN(age) && age >= 18 && age <= 59;
  }).length;
  const elderlyCount = residents.filter(r => {
    const age = parseInt(r.age);
    return !isNaN(age) && age >= 60;
  }).length;

  if (editingPenduduk) {
    return <AdminPendudukEdit data={editingPenduduk} onBack={() => setEditingPenduduk(null)} onSave={handleSavePenduduk} />;
  }

  if (selectedPenduduk) {
    return (
      <AdminPendudukDetail 
        data={selectedPenduduk} 
        onBack={() => setSelectedPenduduk(null)} 
        onEdit={() => { setEditingPenduduk(selectedPenduduk); setSelectedPenduduk(null); }} 
        residents={residents}
        onSelectResident={(resident) => setSelectedPenduduk(resident)}
        onUpdateResident={(updatedRes) => {
          setSelectedPenduduk(updatedRes);
          fetchResidents();
        }}
        onNavigateToTab={onNavigateToTab}
        onSetPresetResident={onSetPresetResident}
      />
    );
  }

  if (showArchive) {
    return <AdminPendudukArchive onBack={() => { setShowArchive(false); fetchResidents(); }} />;
  }

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-4">
      {/* Page Header */}
      <div className="sticky top-16 z-40 bg-slate-50 dark:bg-slate-800 pb-6 -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <nav className="flex text-xs text-gray-500 dark:text-slate-400 mb-2 gap-2 font-medium">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-emerald-700 font-bold">Penduduk</span>
          </nav>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Daftar Penduduk</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">Kelola data informasi kependudukan {villageName}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <button onClick={() => setShowArchive(true)} className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 font-bold text-xs sm:text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors bg-white dark:bg-slate-900 shadow-sm dark:shadow-none whitespace-nowrap">
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Tong Sampah</span>
          </button>
          <button onClick={() => setShowImportModal(true)} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg border border-emerald-700 text-emerald-700 font-bold text-xs sm:text-sm hover:bg-emerald-50 transition-colors shadow-sm dark:shadow-none bg-white dark:bg-slate-900 whitespace-nowrap">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Impor Data</span>
            <span className="sm:hidden">Impor</span>
          </button>
          
          <div className="relative flex-1 md:flex-none">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)} 
              className="w-full justify-center flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg border border-emerald-700 text-emerald-700 font-bold text-xs sm:text-sm hover:bg-emerald-50 transition-colors shadow-sm dark:shadow-none bg-white dark:bg-slate-900 whitespace-nowrap"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Ekspor Data</span>
              <span className="sm:hidden">Ekspor</span>
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-lg dark:shadow-none py-1.5 z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
                  <button 
                    onClick={() => handleExportData('json')} 
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-emerald-50/50 flex items-center gap-2 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                    <div className="flex mb-6 flex-col">
                      <span>Backup JSON (Lengkap)</span>
                      <span className="text-[10px] text-gray-400 font-normal">Sangat cocok untuk restore</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleExportData('csv')} 
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-emerald-50/50 flex items-center gap-2 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <div className="flex mb-6 flex-col">
                      <span>Unduh CSV (Excel)</span>
                      <span className="text-[10px] text-gray-400 font-normal">Cocok diolah di spreadsheet</span>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button onClick={() => setShowAiAnalysis(true)} className="relative group overflow-hidden flex-1 md:flex-none justify-center flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm shadow-sm dark:shadow-none hover:from-indigo-700 hover:to-purple-700 transition-all whitespace-nowrap border border-indigo-500/50">
            <Sparkles className="w-4 h-4 text-purple-200 group-hover:animate-pulse" />
            <span>Analisis Data AI</span>
            <span className="absolute top-0 right-0 flex w-3 h-3 mt-0.5 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
          </button>
          <button onClick={() => setEditingPenduduk({})} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm dark:shadow-none hover:bg-emerald-800 transition-colors whitespace-nowrap">
            <UserPlus className="w-4 h-4" />
            <span>Tambah Penduduk</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col justify-center items-center text-center col-span-2 md:col-span-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Total</p>
            <h3 className="text-xl font-bold text-emerald-700"><NumberCounter end={totalCount} /></h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col justify-center items-center text-center">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Laki-Laki</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white"><NumberCounter end={maleCount} /></h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col justify-center items-center text-center">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Perempuan</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white"><NumberCounter end={femaleCount} /></h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col justify-center items-center text-center">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Anak (0-11)</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white"><NumberCounter end={childCount} /></h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col justify-center items-center text-center">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Remaja (12-17)</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white"><NumberCounter end={teenagerCount} /></h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col justify-center items-center text-center">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Dewasa (18-59)</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white"><NumberCounter end={adultCount} /></h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col justify-center items-center text-center">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Lansia (60+)</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white"><NumberCounter end={elderlyCount} /></h3>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 p-6">
        <div className="flex mb-6 flex-col gap-5">
          {showQuickFilters && (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-sm font-bold text-gray-600 dark:text-slate-400 mr-2">Filter Cepat:</span>
              {FILTERS.map((filter) => (
                <button 
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm dark:shadow-none ${
                    activeFilter === filter 
                      ? 'bg-emerald-700 text-white' 
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
          <div className="flex mb-6 flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Masukkan NIK atau Nama Penduduk..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 outline-none transition-shadow"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 outline-none cursor-pointer min-w-[160px]"
              >
                <option value="No. KK">Urutkan: No. KK</option>
                <option value="Terbaru">Terbaru</option>
                <option value="A-Z Nama">A-Z Nama</option>
                <option value="Z-A Nama">Z-A Nama</option>
              </select>
              <button 
                onClick={() => setShowQuickFilters(!showQuickFilters)}
                className={`p-2.5 rounded-xl border transition-colors ${
                  showQuickFilters 
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                    : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'
                }`}
                title="Tampilkan/Sembunyikan Filter Cepat"
              >
                {showQuickFilters ? (
                  <Filter className="w-5 h-5" />
                ) : (
                  <FilterX className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">NIK / No. KK</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Nama Lengkap / KK</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Status / Gender</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Umur</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">RT/RW</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Bantuan Aktif</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center whitespace-nowrap sticky right-0 bg-gray-50 dark:bg-slate-800 z-10 shadow-[-4px_0_8px_rgba(0,0,0,0.02)] border-l border-gray-100 dark:border-slate-800">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100" onClick={(e) => {
              const target = e.target as HTMLElement;
              const viewBtn = target.closest('[data-action="view"]');
              const editBtn = target.closest('[data-action="edit"]');
              const row = target.closest('tr[data-nik]');

              if (editBtn && row) {
                e.stopPropagation();
                const nik = row.getAttribute('data-nik');
                const item = paginatedData.find(d => d.nik === nik);
                if (item) setEditingPenduduk(item);
              } else if (viewBtn && row) {
                e.stopPropagation();
                const nik = row.getAttribute('data-nik');
                const item = paginatedData.find(d => d.nik === nik);
                if (item) setSelectedPenduduk(item);
              } else if (row) {
                const nik = row.getAttribute('data-nik');
                const item = paginatedData.find(d => d.nik === nik);
                if (item) setSelectedPenduduk(item);
              }
            }}>
              <AnimatePresence>
              {paginatedData.length > 0 ? (
                paginatedData.map((item, index) => (
                  <TableRow 
                    key={index}
                    nik={item.nik} 
                    noKk={item.noKk}
                    kepalaKeluarga={getKepalaKeluarga(item.noKk)}
                    initials={item.initials} 
                    name={item.name} 
                    age={item.age}
                    gender={item.gender} 
                    genderColor={item.genderColor} 
                    rtRw={item.rtRw} 
                    status={item.status} 
                    statusColor={item.statusColor}
                    avatarColor={item.avatarColor}
                    activeAids={item.activeAids || []}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-slate-400">
                    Tidak ada data penduduk yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              )}
            </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-gray-50/50 dark:bg-slate-800/50 px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
            Menampilkan <span className="font-bold text-gray-900 dark:text-white">
              {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredData.length)}
            </span> dari <span className="font-bold text-gray-900 dark:text-white">{filteredData.length}</span> data
          </p>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Show first, last, current, and pages around current
                return (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                );
              })
              .reduce((acc, page, index, arr) => {
                // Add ellipsis if there is a gap
                if (index > 0 && page - arr[index - 1] > 1) {
                  acc.push(
                    <span key={`ellipsis-${page}`} className="px-1.5 text-gray-400 font-medium text-xs">
                      ...
                    </span>
                  );
                }
                acc.push(
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                      currentPage === page
                        ? "bg-emerald-700 text-white shadow-sm dark:shadow-none font-extrabold"
                        : "hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400 font-semibold"
                    }`}
                  >
                    {page}
                  </button>
                );
                return acc;
              }, [] as React.ReactNode[])}

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {showImportModal && (
        <AdminPendudukImport onClose={() => setShowImportModal(false)} onRefresh={fetchResidents} />
      )}

      {showAiAnalysis && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAiAnalysis(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner text-white">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Analisis Penduduk AI</h3>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Berdasarkan data {residents.length} penduduk terdaftar</p>
                </div>
              </div>
              <button onClick={() => setShowAiAnalysis(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <FilterX size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-50/50 dark:bg-slate-800/50">
              <div className="space-y-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm dark:shadow-none">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" /> Demografi Usia
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                    Sebagian besar penduduk berada pada usia produktif (18-45 tahun). Terdapat potensi besar untuk program pemberdayaan ekonomi dan pelatihan kerja.
                  </p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm dark:shadow-none">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <Heart size={16} className="text-rose-500" /> Bantuan Sosial
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                    AI mendeteksi ada sekitar 15% keluarga yang berpotensi membutuhkan bantuan sosial berdasarkan indikator pekerjaan dan jumlah tanggungan.
                  </p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm dark:shadow-none">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <Zap size={16} className="text-amber-500" /> Rekomendasi Program
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                    Disarankan untuk mengadakan program posyandu lansia di RW 02 dikarenakan tingginya konsentrasi penduduk usia lanjut di area tersebut.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
              <button onClick={() => setShowAiAnalysis(false)} className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 font-bold text-sm rounded-lg transition-colors">
                Tutup Analisis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const TableRow = React.memo(({ nik, noKk, kepalaKeluarga, initials, name, age, gender, genderColor, rtRw, status, statusColor, avatarColor, activeAids }: any) => {
  const getBadgeColors = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'pink': return 'bg-pink-50 text-pink-700 border-pink-100';
      case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'gray': return 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700';
      default: return 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700';
    }
  };

  return (
    <motion.tr data-nik={nik} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, height: 0, transition: { duration: 0.3 } }} className="hover:bg-gray-50/80 transition-colors group cursor-pointer">
      <td className="px-6 py-3.5 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono group-hover:text-emerald-700 transition-colors">{nik}</span>
          <span className="text-[10px] text-gray-400 font-mono">KK: {noKk || '-'}</span>
        </div>
      </td>
      <td className="px-6 py-3.5 whitespace-nowrap">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900 dark:text-white">{name}</span>
            {status === 'pending_approval' && (
              <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-200 shadow-sm dark:shadow-none shrink-0 uppercase tracking-wider">
                Menunggu Konfirmasi
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">KK: {kepalaKeluarga || '-'}</span>
        </div>
      </td>
      <td className="px-6 py-3.5 whitespace-nowrap">
        <div className="flex flex-col gap-1.5 items-start">
          <span className="text-[11px] font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-gray-200 dark:border-slate-700 leading-none">{status === 'pending_approval' ? 'Pending' : (status || '-')}</span>
          <span className={`text-[10px] px-2 py-1 rounded-md font-bold border whitespace-nowrap leading-none ${getBadgeColors(genderColor)}`}>
            {gender}
          </span>
        </div>
      </td>
      <td className="px-6 py-3.5 text-sm font-medium text-gray-600 dark:text-slate-400 whitespace-nowrap">
        {age} Thn
      </td>
      <td className="px-6 py-3.5 text-sm font-medium text-gray-600 dark:text-slate-400 whitespace-nowrap">{rtRw}</td>
      <td className="px-6 py-3.5 whitespace-nowrap hidden lg:table-cell">
        {activeAids && activeAids.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm dark:shadow-none whitespace-nowrap" title={activeAids.join(', ')}>
            <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" fill="currentColor" />
            {activeAids.length} Program
          </span>
        ) : (
          <span className="text-sm font-semibold text-gray-300">-</span>
        )}
      </td>
      <td className="px-6 py-3.5 whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900 z-10 border-l border-gray-50 shadow-[-4px_0_8px_rgba(0,0,0,0.02)] group-hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-center gap-2">
          <button data-action="view" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Detail">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setEditingPenduduk({ nik, name, noKk, gender, rtRw, rt, rw, status, age, birthPlace, birthDate, bloodType, religion, job, address, desa, domicileStatus, familyRelation, education, photo, fatherName, motherName, activeAids }); }} disabled={status === 'pending_approval'} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleRequestDelete(nik, name); }} disabled={status === 'pending_approval'} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Hapus">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
});
