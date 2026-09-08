import { useState, useMemo, useEffect } from 'react';
import { PlusCircle, Search, Edit3, Trash2, FileText, X, CheckCircle2, Circle, AlertTriangle, ArrowLeft, Upload, Eye, Printer, Link2, Share2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { showToast } from '../../../utils/toast';
import { supabase } from '../../../utils/supabase';
import { resolveCurrentTenant } from '../../../utils/tenantResolver';
import ImportModal from './ImportModal';
import DocumentViewerModal from './DocumentViewerModal';
import DocumentUpload from './DocumentUpload';

interface ProdukHukumItem {
  id: string;
  no: number;
  tahun: string;
  uraian: string;
  tanggal: string;
  tanggalDiundangkan: string;
  jenisDokumen: string;
  arsip: boolean;
  ketArsip: string;
  ketLain: string;
  linkFile: string;
  documentData: string | null;
  documentName: string;
  createdAt: string;
  noManual?: boolean;
  importOrder?: number;
  needsReview?: boolean;
}

const JENIS_DOKUMEN_BA = [
  'BERITA ACARA',
  'BERITA ACARA SERAH TERIMA',
  'BERITA ACARA PERTEMUAN',
  'BERITA ACARA RAPAT',
  'BERITA ACARA LAINNYA',
];

const STORAGE_KEY = 'produk_hukum_data';
const KATEGORI_KEY = 'berita_acara';

function generateId() {
  return `ph_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadData(): ProdukHukumItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const all = JSON.parse(raw);
      return all[KATEGORI_KEY] || [];
    }
  } catch {}
  return [];
}

function saveData(items: ProdukHukumItem[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[KATEGORI_KEY] = items;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

function getNoUrut(items: ProdukHukumItem[], tahun: string): number {
  const filtered = items.filter(i => i.tahun === tahun && !i.noManual);
  if (filtered.length === 0) return 1;
  return Math.max(...filtered.map(i => i.no)) + 1;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr || dateStr === '-') return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

interface BeritaAcaraProps {
  onBack: () => void;
}

export default function ProdukHukumBeritaAcara({ onBack }: BeritaAcaraProps) {
  const [items, setItems] = useState<ProdukHukumItem[]>(loadData);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [filterArsip, setFilterArsip] = useState<'semua' | 'true' | 'false'>('semua');
  const [sortField, setSortField] = useState<'importOrder' | 'tahun' | 'tanggal' | 'no'>('importOrder');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProdukHukumItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerData, setViewerData] = useState<{ data: string | null; name: string }>({ data: null, name: '' });
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    let isMounted = true;
    const fetchFromSupabase = async () => {
      const tid = await resolveCurrentTenant();
      if (!isMounted) return;
      setTenantId(tid);
      if (!tid) return;
      try {
        const { data, error } = await supabase
          .from('saas_settings')
          .select('value')
          .eq('tenant_id', tid)
          .eq('key', STORAGE_KEY)
          .single();
        if (error && error.code !== 'PGRST116') return;
        if (data?.value && isMounted) {
          const all = JSON.parse(data.value);
          const serverItems = all[KATEGORI_KEY] || [];
          const localItems = loadData();
          const localIds = new Set(localItems.map(i => i.id));
          const merged = [...serverItems, ...localItems.filter(i => !localIds.has(i.id))];
          setItems(merged);
          const raw = localStorage.getItem(STORAGE_KEY);
          const allData = raw ? JSON.parse(raw) : {};
          allData[KATEGORI_KEY] = merged;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
        }
      } catch {}
    };
    fetchFromSupabase();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!tenantId || items.length === 0) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[KATEGORI_KEY] = items;
    const serialized = JSON.stringify(all);
    const saveToSupabase = async () => {
      try {
        const { error } = await supabase.from('saas_settings').upsert({
          tenant_id: tenantId,
          key: STORAGE_KEY,
          value: serialized
        }, { onConflict: 'tenant_id,key' });
      } catch {}
    };
    saveToSupabase();
  }, [items, tenantId]);

  const years = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => { if (i.tahun) s.add(i.tahun); });
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.uraian?.toLowerCase().includes(q) ||
        i.no.toString().includes(q) ||
        i.jenisDokumen?.toLowerCase().includes(q) ||
        i.ketLain?.toLowerCase().includes(q)
      );
    }
    if (filterJenis) result = result.filter(i => i.jenisDokumen === filterJenis);
    if (filterTahun) result = result.filter(i => i.tahun === filterTahun);
    if (filterArsip === 'true') result = result.filter(i => i.arsip);
    if (filterArsip === 'false') result = result.filter(i => !i.arsip);
    return result;
  }, [items, searchQuery, filterJenis, filterTahun, filterArsip]);

  const itemsWithNumbers = useMemo(() => {
    const mapped = filteredItems.map((item) => ({
      ...item,
      displayNo: item.no,
    }));
    return mapped.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'importOrder') {
        cmp = (a.importOrder ?? 99999) - (b.importOrder ?? 99999);
        if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
        return a.tahun.localeCompare(b.tahun) || a.no - b.no;
      }
      if (sortField === 'no') cmp = a.no - b.no;
      else if (sortField === 'tahun') cmp = a.tahun.localeCompare(b.tahun);
      else if (sortField === 'tanggal') cmp = (a.tanggal || '').localeCompare(b.tanggal || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredItems, sortField, sortDir]);

  const originalDocsMap = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(item => {
      const key = `${item.tahun}_${item.no}`;
      const currentOldestId = map.get(key);
      if (!currentOldestId) {
        map.set(key, item.id);
      } else {
        const currentOldest = items.find(i => i.id === currentOldestId);
        if (currentOldest && new Date(item.createdAt).getTime() < new Date(currentOldest.createdAt).getTime()) {
          map.set(key, item.id);
        }
      }
    });
    return map;
  }, [items]);

  const duplicateMap = useMemo(() => {
    const freq: Record<string, number> = {};
    items.forEach(item => {
      const key = `${item.tahun}_${item.no}`;
      freq[key] = (freq[key] || 0) + 1;
    });
    return freq;
  }, [items]);

  const totalPages = Math.ceil(itemsWithNumbers.length / itemsPerPage);
  const paginatedItems = itemsWithNumbers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterJenis, filterTahun, filterArsip, sortField, sortDir]);

  const handleSave = (item: Omit<ProdukHukumItem, 'id' | 'createdAt'>) => {
    let newItems: ProdukHukumItem[];
    if (editingItem) {
      newItems = items.map(i => i.id === editingItem.id ? { ...i, ...item } : i);
      showToast('Data berhasil diperbarui!', 'success');
    } else {
      newItems = [...items, { ...item, id: generateId(), createdAt: new Date().toISOString() }];
      showToast('Data berhasil ditambahkan!', 'success');
    }
    setItems(newItems);
    saveData(newItems);
    setShowModal(false);
    setEditingItem(null);
  };

  const handleDelete = (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    saveData(newItems);
    setShowDeleteConfirm(null);
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    showToast('Data berhasil dihapus!', 'success');
  };

  const handleShare = (item: ProdukHukumItem) => {
    const shareUrl = `${window.location.origin}/?tab=berita_acara&ba_id=${item.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('Link sharing berhasil disalin ke clipboard!', 'success');
    }).catch(() => {
      prompt('Salin link ini:', shareUrl);
    });
  };

  const handleDownloadTemplate = () => {
    const headers = ['NO', 'TAHUN', 'URAIAN', 'TANGGAL', 'KETERANGAN', 'LINK FILE'];
    const sampleRows = [
      [1, 2026, 'Berita Acara Serah Terima Jabatan Kepala Desa', '2026-01-15', 'Serah terima periode 2021-2026', ''],
      [2, 2026, 'Berita Acara Rapat Musyawarah Desa', '2026-02-10', 'Pembahasan APBDesa', ''],
      [3, 2026, 'Berita Acara Peresmian Balai Desa', '2026-03-01', 'Peresmian gedung baru', ''],
    ];
    const wsData = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 5 }, { wch: 6 }, { wch: 45 }, { wch: 12 }, { wch: 35 }, { wch: 50 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Berita Acara');
    XLSX.writeFile(wb, 'Template_Import_Berita_Acara.xlsx');
    showToast('Template berhasil diunduh!', 'success');
  };

  const handleBulkDelete = () => {
    const newItems = items.filter(i => !selectedIds.has(i.id));
    setItems(newItems);
    saveData(newItems);
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
    showToast(`${selectedIds.size} data berhasil dihapus!`, 'success');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedItems.map(i => i.id)));
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const tglCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const rows = itemsWithNumbers.map((item) => `
      <tr>
        <td style="text-align:center;font-weight:bold;font-size:10px">${item.displayNo}</td>
        <td style="text-align:center;font-size:10px">${item.tahun}</td>
        <td style="font-size:10px">${item.uraian || '-'}</td>
        <td style="text-align:center;font-size:10px">${formatDateDisplay(item.tanggal)}</td>
        <td style="font-size:10px">${item.ketLain || '-'}</td>
      </tr>
    `).join('');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Cetak Berita Acara</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:4px}th{background:#f0f0f0}</style></head><body>
      <h2 style="text-align:center">DAFTAR BERITA ACARA</h2>
      <p style="text-align:center;color:#666">Total: ${itemsWithNumbers.length} dokumen • Dicetak: ${tglCetak}</p>
      <table><thead><tr><th>No</th><th>Tahun</th><th>Uraian</th><th>Tanggal</th><th>Keterangan</th></tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=function(){window.print();window.close()}<\/script></body></html>`);
    printWindow.document.close();
  };

  const handleImport = (importedData: any[]) => {
    const byYear: Record<string, number> = {};
    const newItems: ProdukHukumItem[] = importedData.map((row) => {
      const thn = row.tahun || '';
      if (thn) {
        byYear[thn] = (byYear[thn] || 0) + 1;
      }
      const noEmpty = !row.no || row.no === 0;
      const tahunEmpty = !thn;
      return {
        id: generateId(),
        no: row.no || (thn ? byYear[thn] : 0),
        tahun: thn,
        uraian: row.uraian || row.nama_produk_hukum || '',
        tanggal: row.tanggal || '',
        tanggalDiundangkan: row.tanggalDiundangkan || row.tanggal_diundangkan || '',
        jenisDokumen: row.jenisDokumen || row.jenis_dokumen || 'BERITA ACARA',
        arsip: row.arsip === true || row.arsip === 'TRUE',
        ketArsip: row.ketArsip || '',
        ketLain: row.ketLain || row.ket_lain || '',
        linkFile: row.linkFile || row.link_file || '',
        documentData: null,
        documentName: '',
        createdAt: new Date().toISOString(),
        noManual: false,
        importOrder: items.length,
        needsReview: noEmpty || tahunEmpty,
      };
    });
    if (newItems.length === 0) {
      showToast('Tidak ada data untuk diimport!', 'error');
      return;
    }
    const merged = [...items, ...newItems];
    setItems(merged);
    saveData(merged);
    const reviewCount = newItems.filter(i => i.needsReview).length;
    showToast(`${newItems.length} data berhasil diimport!${reviewCount > 0 ? ` (${reviewCount} baris perlu diedit)` : ''}`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Berita Acara</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Berita Acara Desa ({items.length} dokumen)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm dark:shadow-none"
            >
              <Trash2 size={18} />
              <span>Hapus ({selectedIds.size})</span>
            </button>
          )}
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-colors shadow-sm dark:shadow-none"
          >
            <Download size={18} />
            <span>Template</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm dark:shadow-none"
          >
            <Upload size={18} />
            <span>Import</span>
          </button>
          <button
            onClick={() => { setEditingItem(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors shadow-sm dark:shadow-none"
          >
            <PlusCircle size={18} />
            <span>Tambah Berita Acara</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm dark:shadow-none"
          >
            <Printer size={18} />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari uraian, nomor, atau keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
          <select value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)}
            className="px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
            <option value="">Semua Tahun</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterArsip} onChange={(e) => setFilterArsip(e.target.value as any)}
            className="px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
            <option value="semua">Semua Arsip</option>
            <option value="true">Bersifat Arsip</option>
            <option value="false">Bukan Arsip</option>
          </select>
          <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)}
            className="px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
            <option value="">Semua Jenis</option>
            {JENIS_DOKUMEN_BA.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <FileText size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Belum ada data Berita Acara</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Tambahkan data secara manual atau import dari file</p>
            <div className="flex items-center gap-2">
              <button onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-bold rounded-xl hover:bg-cyan-700 transition-colors">
                <Download size={16} /> Template
              </button>
              <button onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
                <Upload size={16} /> Import
              </button>
              <button onClick={() => { setEditingItem(null); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                <PlusCircle size={16} /> Tambah Manual
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-auto max-h-[calc(100vh-300px)] border border-gray-100 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 relative">
            <table className="w-full min-w-[900px] text-sm border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-center px-2 py-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={paginatedItems.length > 0 && selectedIds.size === paginatedItems.length}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-2 py-2 font-bold text-gray-500 dark:text-slate-400 text-[10px] uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-emerald-600 transition-colors select-none"
                    onClick={() => { if (sortField === 'no') setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField('no'); setSortDir('asc'); } }}>
                    <span className="inline-flex items-center gap-0.5">
                      No
                      {sortField === 'no' && <span className="text-emerald-600">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-2 py-2 font-bold text-gray-500 dark:text-slate-400 text-[10px] uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-emerald-600 transition-colors select-none"
                    onClick={() => { if (sortField === 'tahun') setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField('tahun'); setSortDir('asc'); } }}>
                    <span className="inline-flex items-center gap-0.5">
                      Tahun
                      {sortField === 'tahun' && <span className="text-emerald-600">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-2 py-2 font-bold text-gray-500 dark:text-slate-400 text-[10px] uppercase tracking-wider min-w-[180px] whitespace-nowrap">Uraian</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-2 py-2 font-bold text-gray-500 dark:text-slate-400 text-[10px] uppercase tracking-wider min-w-[100px] whitespace-nowrap">Tanggal</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-2 py-2 font-bold text-gray-500 dark:text-slate-400 text-[10px] uppercase tracking-wider min-w-[100px] whitespace-nowrap">Keterangan</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-center px-2 py-2 font-bold text-gray-500 dark:text-slate-400 text-[10px] uppercase tracking-wider w-14 whitespace-nowrap">Link</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-center px-2 py-2 font-bold text-gray-500 dark:text-slate-400 text-[10px] uppercase tracking-wider w-20 whitespace-nowrap sticky right-0 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item.id} className={`border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors ${item.needsReview ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''} ${selectedIds.has(item.id) ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => {
                          setSelectedIds(prev => {
                            const n = new Set(prev);
                            if (n.has(item.id)) n.delete(item.id); else n.add(item.id);
                            return n;
                          });
                        }}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-2 py-2 font-bold text-gray-900 dark:text-white text-[11px]">{item.no || '-'}</td>
                    <td className="px-2 py-2 text-gray-700 dark:text-slate-300 font-semibold text-[11px]">{item.tahun || '-'}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-gray-900 dark:text-white font-medium text-[11px] whitespace-nowrap truncate max-w-[300px]" title={item.uraian}>{item.uraian || 'TANPA KETERANGAN'}</p>
                        {item.needsReview && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap print:hidden" title="Baris ini perlu diedit: No atau Tahun kosong">
                            Perlu Edit
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-gray-600 dark:text-slate-400 text-[11px] whitespace-nowrap">{formatDateDisplay(item.tanggal)}</td>
                    <td className="px-2 py-2 text-gray-600 dark:text-slate-400 text-[11px] whitespace-nowrap truncate max-w-[120px]" title={item.ketLain}>{item.ketLain || '-'}</td>
                    <td className="px-2 py-2 text-center">
                      {item.linkFile ? (
                        <a href={item.linkFile} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-500 hover:text-blue-700 transition-colors" title="Buka Link">
                          <Link2 size={13} />
                        </a>
                      ) : <span className="text-gray-300 dark:text-slate-600">-</span>}
                    </td>
                    <td className="px-2 py-2 sticky right-0 bg-white dark:bg-slate-900 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)]">
                      <div className="flex items-center justify-center gap-0.5">
                        {item.documentData && (
                          <button onClick={() => { setViewerData({ data: item.documentData, name: item.documentName }); setShowViewer(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors" title="Lihat Dokumen">
                            <Eye size={14} />
                          </button>
                        )}
                        <button onClick={() => { setEditingItem(item); setShowModal(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleShare(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors" title="Share Berita Acara">
                          <Share2 size={14} />
                        </button>
                        <button onClick={() => setShowDeleteConfirm(item.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Hapus">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredItems.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                {[10, 15, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>data</span>
              <span className="ml-2">Menampilkan {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, itemsWithNumbers.length)} dari {itemsWithNumbers.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed font-semibold transition-colors">
                ‹
              </button>
              {(() => {
                const pages: (number | '...')[] = [];
                if (totalPages <= 5) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (currentPage > 3) pages.push('...');
                  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
                  if (currentPage < totalPages - 2) pages.push('...');
                  pages.push(totalPages);
                }
                return pages.map((page, idx) =>
                  page === '...' ? <span key={`e${idx}`} className="px-1 text-gray-300">…</span> :
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg font-bold transition-colors ${page === currentPage ? 'bg-emerald-600 text-white' : 'border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                    {page}
                  </button>
                );
              })()}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed font-semibold transition-colors">
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <AddEditModal
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          getNoUrut={(tahun) => getNoUrut(items, tahun)}
        />
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        kategoriLabel="Berita Acara"
        kategori="berita_acara"
      />

      {/* Document Viewer */}
      <DocumentViewerModal
        isOpen={showViewer}
        onClose={() => setShowViewer(false)}
        documentData={viewerData.data}
        documentName={viewerData.name}
      />

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Hapus Data?</h3>
                <p className="text-sm text-gray-500">Data yang dihapus tidak dapat dikembalikan.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 font-semibold transition-colors">
                Batal
              </button>
              <button onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Hapus {selectedIds.size} Data?</h3>
                <p className="text-sm text-gray-500">Semua data terpilih akan dihapus permanen.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 font-semibold transition-colors">
                Batal
              </button>
              <button onClick={handleBulkDelete}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">
                Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add/Edit Modal
function AddEditModal({ item, onSave, onClose, getNoUrut }: {
  item: ProdukHukumItem | null;
  onSave: (item: Omit<ProdukHukumItem, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  getNoUrut: (tahun: string) => number;
}) {
  const [tahun, setTahun] = useState(item?.tahun || '');
  const [no, setNo] = useState(item?.no?.toString() || '');
  const [uraian, setUraian] = useState(item?.uraian || '');
  const [tanggal, setTanggal] = useState(item?.tanggal || '');
  const [ketLain, setKetLain] = useState(item?.ketLain || '');
  const [linkFile, setLinkFile] = useState(item?.linkFile || '');
  const [noManual, setNoManual] = useState(item?.noManual ?? false);

  const autoNo = tahun ? getNoUrut(tahun) : 1;
  const displayNo = no || (item ? '' : `Otomatis: ${autoNo}`);

  const handleSubmit = () => {
    const enteredNo = parseInt(no) || (!item ? autoNo : 0);
    onSave({
      tahun,
      no: enteredNo,
      uraian,
      tanggal,
      tanggalDiundangkan: item?.tanggalDiundangkan || '',
      jenisDokumen: item?.jenisDokumen || 'BERITA ACARA',
      arsip: item?.arsip ?? true,
      ketArsip: item?.ketArsip || '',
      ketLain,
      linkFile,
      documentData: item?.documentData || null,
      documentName: item?.documentName || '',
      noManual: noManual,
      needsReview: false,
    });
  };

  const isNeedsReview = item?.needsReview;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {item ? 'Edit Berita Acara' : 'Tambah Berita Acara'}
            </h3>
            {isNeedsReview && (
              <p className="text-xs text-amber-600 mt-0.5">Baris ini perlu diperbaiki: No atau Tahun kosong</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Tahun <span className="text-red-500">*</span></label>
              <input type="text" value={tahun} onChange={(e) => setTahun(e.target.value)}
                placeholder="Contoh: 2025"
                className={`w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${!tahun ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-slate-700'}`} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">No</label>
              <input type="number" value={no} onChange={(e) => setNo(e.target.value)}
                placeholder={tahun ? `Otomatis: ${autoNo}` : 'Isi Tahun dulu'}
                className={`w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${!no ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-slate-700'}`} />
              {!no && tahun && (
                <p className="text-[10px] text-amber-600 mt-1">Kosongkan untuk nomor otomatis: <strong>{autoNo}</strong></p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Uraian <span className="text-red-500">*</span></label>
            <input type="text" value={uraian} onChange={(e) => setUraian(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Tanggal</label>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Keterangan</label>
            <input type="text" value={ketLain} onChange={(e) => setKetLain(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Link File</label>
            <input type="url" value={linkFile} onChange={(e) => setLinkFile(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 font-semibold transition-colors">
            Batal
          </button>
          <button onClick={handleSubmit}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors">
            {item ? 'Simpan Perubahan' : 'Tambah'}
          </button>
        </div>
      </div>
    </div>
  );
}
