import { useState, useMemo, useEffect } from 'react';
import { PlusCircle, Search, Edit3, Trash2, FileText, X, CheckCircle2, Circle, AlertTriangle, ArrowLeft, Upload, Eye, Printer } from 'lucide-react';
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
  documentData: string | null;
  documentName: string;
  createdAt: string;
  noManual?: boolean;
}

const JENIS_DOKUMEN_PERDES = [
  'APBDES MURNI',
  'APBDES PERUBAHAN',
  'RKPDES',
  'RPJMDES',
  'REALISASI',
  'BUMDESA',
  'ASAL-USUL',
  'LAINNYA',
];

const STORAGE_KEY = 'produk_hukum_data';
const KATEGORI_KEY = 'perdes';

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
  if (!dateStr || dateStr === '-' || dateStr === 'Tidak Tahu') return '-';
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

interface PerdesProps {
  onBack: () => void;
}

export default function ProdukHukumPerdes({ onBack }: PerdesProps) {
  const [items, setItems] = useState<ProdukHukumItem[]>(loadData);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [filterArsip, setFilterArsip] = useState<'semua' | 'true' | 'false'>('semua');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProdukHukumItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerData, setViewerData] = useState<{ data: string | null; name: string }>({ data: null, name: '' });
  const ITEMS_PER_PAGE = 15;

  // Listen for open_document_viewer events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setViewerData({ data: e.detail.data, name: e.detail.name });
      setShowViewer(true);
    };
    window.addEventListener('open_document_viewer', handler as EventListener);
    return () => window.removeEventListener('open_document_viewer', handler as EventListener);
  }, []);

  // Fetch data from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    const fetchFromSupabase = async () => {
      const tid = await resolveCurrentTenant();
      if (!isMounted) return;
      setTenantId(tid);
      if (!tid) {
        console.warn('[ProdukHukumPerdes] Tenant ID tidak ditemukan. Data hanya tersimpan lokal.');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('saas_settings')
          .select('value')
          .eq('tenant_id', tid)
          .eq('key', STORAGE_KEY)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('[ProdukHukumPerdes] Gagal memuat dari Supabase:', error.message);
          return;
        }

        if (data && data.value && isMounted) {
          const all = JSON.parse(data.value);
          const serverItems = all[KATEGORI_KEY] || [];
          // Merge: prioritize server data, but keep any local-only items
          const localItems = loadData();
          const localIds = new Set(localItems.map(i => i.id));
          const merged = [...serverItems, ...localItems.filter(i => !localIds.has(i.id))];
          setItems(merged);
          // Save merged back to localStorage
          const raw = localStorage.getItem(STORAGE_KEY);
          const allData = raw ? JSON.parse(raw) : {};
          allData[KATEGORI_KEY] = merged;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
          console.log('[ProdukHukumPerdes] Data synced dari Supabase. Total:', merged.length);
        }
      } catch (err: any) {
        console.error('[ProdukHukumPerdes] Error fetching:', err?.message || err);
      }
    };
    fetchFromSupabase();
    return () => { isMounted = false; };
  }, []);

  // Sync to Supabase whenever items change
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

        if (error) {
          console.error('[ProdukHukumPerdes] Gagal sync ke Supabase:', error.message);
          showToast('Gagal sinkronisasi ke server: ' + error.message, 'error');
        } else {
          console.log('[ProdukHukumPerdes] Berhasil sync ke Supabase');
        }
      } catch (err: any) {
        console.error('[ProdukHukumPerdes] Error syncing:', err?.message || err);
      }
    };
    saveToSupabase();
  }, [items, tenantId]);

  const availableYears = useMemo(() => {
    const years = new Set(items.map(i => i.tahun).filter(Boolean));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.uraian.toLowerCase().includes(q) ||
        i.no.toString().includes(q) ||
        i.tahun.includes(q) ||
        i.ketLain.toLowerCase().includes(q)
      );
    }
    if (filterJenis) result = result.filter(i => i.jenisDokumen === filterJenis);
    if (filterTahun) result = result.filter(i => i.tahun === filterTahun);
    if (filterArsip !== 'semua') result = result.filter(i => String(i.arsip) === filterArsip);
    result.sort((a, b) => {
      const tglA = a.tanggal ? new Date(a.tanggal).getTime() : 0;
      const tglB = b.tanggal ? new Date(b.tanggal).getTime() : 0;
      if (tglA !== tglB) return tglB - tglA;
      return a.no - b.no;
    });
    return result;
  }, [items, searchQuery, filterJenis, filterTahun, filterArsip]);

  const itemsWithNumbers = useMemo(() => {
    return filteredItems.map((item) => ({
      ...item,
      displayNo: item.no,
    }));
  }, [filteredItems]);

  // Deteksi dokumen original (pertama kali dibuat) untuk setiap kombinasi tahun_no
  const originalDocsMap = useMemo(() => {
    const map = new Map<string, string>(); // key -> id of oldest document
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

  // Hitung frekuensi nomor per tahun untuk mendeteksi ganda
  const duplicateMap = useMemo(() => {
    const freq: Record<string, number> = {};
    items.forEach(item => {
      const key = `${item.tahun}_${item.no}`;
      freq[key] = (freq[key] || 0) + 1;
    });
    return freq;
  }, [items]);

  const totalPages = Math.ceil(itemsWithNumbers.length / ITEMS_PER_PAGE);
  const paginatedItems = itemsWithNumbers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterJenis, filterTahun, filterArsip]);

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

  const handleImport = (importedData: any[]) => {
    const newItems: ProdukHukumItem[] = importedData.map(row => ({
      id: generateId(),
      no: row.no || 0,
      tahun: row.tahun || new Date().getFullYear().toString(),
      uraian: row.uraian || '',
      tanggal: row.tanggal || '',
      tanggalDiundangkan: row.tanggalDiundangkan || '',
      jenisDokumen: row.jenisDokumen || '',
      arsip: row.arsip ?? true,
      ketArsip: row.ketArsip || '',
      ketLain: row.ketLain || '',
      documentData: null,
      documentName: '',
      createdAt: new Date().toISOString(),
      noManual: false,
    }));
    const updated = [...items, ...newItems];
    setItems(updated);
    saveData(updated);
  };

  const handleDelete = (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    saveData(newItems);
    setShowDeleteConfirm(null);
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    showToast('Data berhasil dihapus!', 'success');
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    const globalFooter = localStorage.getItem('global_print_footer') || 'Dokumen ini dibuat &amp; dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia';
    const rows = itemsWithNumbers.map((item) => `
      <tr>
        <td></td>
        <td style="text-align:center;font-weight:bold;font-size:10px">${item.displayNo}</td>
        <td style="text-align:center;font-weight:600;font-size:10px">${item.tahun}</td>
        <td style="font-weight:500;font-size:10px;line-height:1.3">${item.uraian || 'TANPA KETERANGAN'}</td>
        <td style="font-size:10px;line-height:1.3">${formatDateDisplay(item.tanggal)}</td>
        <td style="font-size:10px;line-height:1.3">${formatDateDisplay(item.tanggalDiundangkan)}</td>
        <td style="text-align:center;font-size:10px">${item.jenisDokumen || '-'}</td>
      </tr>
    `).join('');
    const now = new Date();
    const tglCetak = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><title>Cetak Data Perdes</title>
      <style>
        @page{size:A4 portrait;margin:0}
        *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}
        html,body{margin:0;padding:0}
        body{font-family:'Segoe UI',Arial,sans-serif;font-size:10px;color:#333;padding:1.5cm 1.5cm 1cm 1.5cm}
        .header{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #059669}
        .header h2{margin:0;font-size:14px;color:#1a1a1a;letter-spacing:0.5px}
        .header .subtitle{color:#666;margin:3px 0 0;font-size:10px}
        table{width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed}
        thead{display:table-header-group}
        tfoot{display:table-footer-group}
        th{background:#ecfdf5;font-weight:700;text-align:center;font-size:10px;padding:7px 5px;border:1px solid #d1d5db;page-break-after:avoid}
        td{padding:6px 8px;border:1px solid #d1d5db;white-space:normal;vertical-align:top;page-break-inside:avoid;line-height:1.3}
        tr{border-bottom:1px solid #e2e8f0}
        tr:nth-child(even){background:#f9fafb}
        colgroup .col-no{width:4%}
        colgroup .col-tahun{width:6%}
        colgroup .col-uraian{width:36%}
        colgroup .col-tanggal{width:22%}
        colgroup .col-diundangkan{width:22%}
        colgroup .col-jenis{width:10%}
        tfoot td{padding-top:1cm;padding-bottom:1.5cm;font-size:8px;color:#64748b;border-top:1px solid #cbd5e1;border-left:none;border-right:none;border-bottom:none;line-height:1.4}
      </style></head><body>
      <div class="header">
        <h2>DATA PERATURAN DESA (PERDES)</h2>
        <p class="subtitle">Total: ${itemsWithNumbers.length} dokumen &bull; Dicetak: ${tglCetak}</p>
      </div>
      <table>
        <colgroup>
          <col class="col-ck" style="width:3%"><col class="col-no" style="width:4%"><col class="col-tahun" style="width:6%"><col class="col-uraian" style="width:33%"><col class="col-tanggal" style="width:21%"><col class="col-diundangkan" style="width:21%"><col class="col-jenis" style="width:10%">
        </colgroup>
        <thead>
          <tr><th colSpan="7" style="padding:0;margin:0;border:none;background:white"><div style="height:1.5cm;width:100%;font-size:1px;line-height:1px;color:transparent;background:white">&nbsp;</div></th></tr>
          <tr><th></th><th>No</th><th>Tahun</th><th>Uraian</th><th>Tanggal</th><th>Tgl Diundangkan</th><th>Jenis</th></tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="border:none"><td colspan="7" style="border:none;padding-top:1cm;padding-bottom:1.5cm"><div style="border-top:1px solid #cbd5e1;padding-top:10px;text-align:left"><span style="font-size:9pt;color:#64748b">${globalFooter}</span></div></td></tr></tfoot>
      </table>
    </body></html>`);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { document.body.removeChild(iframe); }, 1000);
    }, 500);
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
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Perdes</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Peraturan Desa ({items.length} dokumen)</p>
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
            <span>Tambah Perdes</span>
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
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari uraian, nomor, tahun..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <select value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)}
            className="px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
            <option value="">Semua Tahun</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)}
            className="px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
            <option value="">Semua Jenis</option>
            {JENIS_DOKUMEN_PERDES.map(j => <option key={j} value={j}>{j}</option>)}
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Belum ada data Perdes</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Tambahkan data secara manual atau import dari file</p>
            <div className="flex items-center gap-2">
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
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-center px-3 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={paginatedItems.length > 0 && selectedIds.size === paginatedItems.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-4 py-3 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">No</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-4 py-3 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Tahun</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-4 py-3 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider min-w-[250px] whitespace-nowrap">Uraian</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-4 py-3 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider min-w-[120px] whitespace-nowrap">Tanggal</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-4 py-3 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider min-w-[120px] whitespace-nowrap">Tgl Diundangkan</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-4 py-3 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider min-w-[120px] whitespace-nowrap">Jenis</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-center px-4 py-3 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider w-24 whitespace-nowrap sticky right-0 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item.id} className={`border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors ${selectedIds.has(item.id) ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        {item.displayNo}
                        {duplicateMap[`${item.tahun}_${item.no}`] > 1 && originalDocsMap.get(`${item.tahun}_${item.no}`) !== item.id && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200 print:hidden" title="Nomor dokumen ini ganda / sisipan">
                            Sisipan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300 font-semibold">{item.tahun}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white font-medium whitespace-nowrap truncate max-w-[300px]" title={item.uraian}>{item.uraian || 'TANPA KETERANGAN'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400 text-xs whitespace-nowrap min-w-[130px]">{formatDateDisplay(item.tanggal)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400 text-xs whitespace-nowrap min-w-[130px]">{formatDateDisplay(item.tanggalDiundangkan)}</td>
                    <td className="px-4 py-3 min-w-[130px]">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50 whitespace-nowrap">
                        {item.jenisDokumen || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 sticky right-0 bg-white dark:bg-slate-900 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)]">
                      <div className="flex items-center justify-center gap-1">
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
            <span>Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}�{Math.min(currentPage * ITEMS_PER_PAGE, itemsWithNumbers.length)} dari {itemsWithNumbers.length} data</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed font-semibold transition-colors">
                Sebelumnya
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg font-bold transition-colors ${page === currentPage ? 'bg-emerald-600 text-white' : 'border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                  {page}
                </button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed font-semibold transition-colors">
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ModalPerdes item={editingItem} items={items} onSave={handleSave} onClose={() => { setShowModal(false); setEditingItem(null); }} />
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        kategoriLabel="Perdes"
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={showViewer}
        onClose={() => setShowViewer(false)}
        documentData={viewerData.data}
        documentName={viewerData.name}
        documentType=""
      />

      {/* Bulk Delete Confirm */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBulkDeleteConfirm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Hapus Massal</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">{selectedIds.size} data akan dihapus permanen</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowBulkDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm">
                Batal
              </button>
              <button onClick={handleBulkDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-sm">
                Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Hapus Data</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Data yang dihapus tidak dapat dikembalikan</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm">
                Batal
              </button>
              <button onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-sm">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalPerdes({ item, items, onSave, onClose }: {
  item: ProdukHukumItem | null;
  items: ProdukHukumItem[];
  onSave: (item: Omit<ProdukHukumItem, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}) {
  const isEdit = !!item;
  const [tahun, setTahun] = useState(item?.tahun || new Date().getFullYear().toString());
  const [no, setNo] = useState(item?.no?.toString() || '');
  const [uraian, setUraian] = useState(item?.uraian || '');
  const [tanggal, setTanggal] = useState(item?.tanggal || '');
  const [tanggalDiundangkan, setTanggalDiundangkan] = useState(item?.tanggalDiundangkan || '');
  const [jenisDokumen, setJenisDokumen] = useState(item?.jenisDokumen || 'APBDES MURNI');
  const [arsip, setArsip] = useState(item?.arsip ?? true);
  const [ketArsip, setKetArsip] = useState(item?.ketArsip || 'ASLI');
  const [ketLain, setKetLain] = useState(item?.ketLain || '');
  const [documentData, setDocumentData] = useState<string | null>(item?.documentData || null);
  const [documentName, setDocumentName] = useState(item?.documentName || '');

  const handleTahunChange = (val: string) => {
    setTahun(val);
    if (!isEdit && !no) setNo(getNoUrut(items, val).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uraian.trim()) { showToast('Uraian wajib diisi!', 'error'); return; }
    const itemsForAuto = isEdit ? items.filter(i => i.id !== item.id) : items;
    const autoNo = getNoUrut(itemsForAuto, tahun);
    const enteredNo = parseInt(no) || autoNo;
    const isManualNo = isEdit
      ? (enteredNo !== item.no ? true : (item.noManual ?? false))
      : (enteredNo !== autoNo);
    onSave({
      no: enteredNo,
      noManual: isManualNo,
      tahun, uraian: uraian.trim(), tanggal, tanggalDiundangkan,
      jenisDokumen, arsip, ketArsip, ketLain: ketLain.trim(),
      documentData, documentName,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[5vh] sm:pt-[10vh] p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit' : 'Tambah'} Perdes</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Lengkapi data berikut</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Tahun <span className="text-red-500">*</span></label>
              <input type="number" value={tahun} onChange={(e) => handleTahunChange(e.target.value)} min="1900" max="2100"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Nomor Urut</label>
              <input type="number" value={no} onChange={(e) => setNo(e.target.value)} min="1"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Uraian <span className="text-red-500">*</span></label>
            <input type="text" value={uraian} onChange={(e) => setUraian(e.target.value)} placeholder="cth: PERDES APBDesa 2025"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Tanggal Tetap</label>
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Tanggal Diundangkan</label>
              <input type="date" value={tanggalDiundangkan} onChange={(e) => setTanggalDiundangkan(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Jenis Dokumen</label>
              <select value={jenisDokumen} onChange={(e) => setJenisDokumen(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white">
                {JENIS_DOKUMEN_PERDES.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Keterangan Arsip</label>
              <select value={ketArsip} onChange={(e) => setKetArsip(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white">
                {['ASLI', 'FOTOKOPI', 'BELUM BEJILID', 'LAINNYA'].map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400">Bersifat Arsip</label>
            <button type="button" onClick={() => setArsip(!arsip)}
              className={`relative w-11 h-6 rounded-full transition-colors ${arsip ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${arsip ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Keterangan Lain</label>
            <input type="text" value={ketLain} onChange={(e) => setKetLain(e.target.value)} placeholder="Catatan tambahan (opsional)"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white" />
          </div>
          <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
            <DocumentUpload
              value={documentData}
              onChange={(data, name) => { setDocumentData(data); setDocumentName(name); }}
              label="Dokumen Perdes (Scan/Upload)"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm">
              Batal
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-sm">
              {isEdit ? 'Simpan Perubahan' : 'Tambah Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
