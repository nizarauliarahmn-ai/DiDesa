import { useState, useMemo, useEffect } from 'react';
import { PlusCircle, Search, Edit3, Trash2, FileText, X, CheckCircle2, Circle, AlertTriangle, ArrowLeft, Upload, Printer } from 'lucide-react';
import { showToast } from '../../../utils/toast';
import ImportModal from './ImportModal';

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
  createdAt: string;
}

const KATEGORI_LABELS: Record<string, string> = {
  sk_kades: 'SK Kades',
  perkades: 'Perkades',
  mou_pks: 'MoU / PKS',
  skb: 'SKB',
  berita_acara: 'Berita Acara',
  piagam: 'Piagam',
};

const JENIS_DOKUMEN_OPTIONS: Record<string, string[]> = {
  sk_kades: ['SK PENGANGKATAN', 'SK PEMBERHENTIAN', 'SK PERUBAHAN NAMA', 'SK PENETAPAN', 'SK LAINNYA'],
  perkades: ['UMUM'],
  mou_pks: ['MOU', 'PKS'],
  skb: ['UMUM'],
  berita_acara: ['UMUM'],
  piagam: ['UMUM'],
};

const STORAGE_KEY = 'produk_hukum_data';

function generateId() {
  return `ph_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadData(kategori: string): ProdukHukumItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const all = JSON.parse(raw);
      return all[kategori] || [];
    }
  } catch {}
  return [];
}

function saveData(kategori: string, items: ProdukHukumItem[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[kategori] = items;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

function getNoUrut(items: ProdukHukumItem[], tahun: string): number {
  const filtered = items.filter(i => i.tahun === tahun);
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

interface CategoryProps {
  kategori: string;
  onBack: () => void;
}

export default function ProdukHukumCategory({ kategori, onBack }: CategoryProps) {
  const label = KATEGORI_LABELS[kategori] || kategori;
  const jenisOptions = JENIS_DOKUMEN_OPTIONS[kategori] || ['UMUM'];

  const [items, setItems] = useState<ProdukHukumItem[]>(() => loadData(kategori));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [filterArsip, setFilterArsip] = useState<'semua' | 'true' | 'false'>('semua');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProdukHukumItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

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
      if (a.tahun !== b.tahun) return b.tahun.localeCompare(a.tahun);
      return a.no - b.no;
    });
    return result;
  }, [items, searchQuery, filterJenis, filterTahun, filterArsip]);

  const itemsWithNumbers = useMemo(() => {
    let yearCounter = 0;
    let lastYear = '';
    return filteredItems.map((item) => {
      if (item.tahun !== lastYear) {
        yearCounter = 0;
        lastYear = item.tahun;
      }
      yearCounter++;
      return { ...item, displayNo: yearCounter };
    });
  }, [filteredItems]);

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
    saveData(kategori, newItems);
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
      createdAt: new Date().toISOString(),
    }));
    const updated = [...items, ...newItems];
    setItems(updated);
    saveData(kategori, updated);
  };

  const handleDelete = (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    saveData(kategori, newItems);
    setShowDeleteConfirm(null);
    showToast('Data berhasil dihapus!', 'success');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;
    const globalFooter = localStorage.getItem('global_print_footer') || 'Dokumen ini dibuat &amp; dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia';
    const rows = itemsWithNumbers.map((item) => `
      <tr>
        <td style="text-align:center;font-weight:bold;font-size:10px">${item.displayNo}</td>
        <td style="text-align:center;font-weight:600;font-size:10px">${item.tahun}</td>
        <td style="font-weight:500;font-size:10px;line-height:1.3">${item.uraian || 'TANPA KETERANGAN'}</td>
        <td style="font-size:10px;line-height:1.3">${formatDateDisplay(item.tanggal)}</td>
        <td style="text-align:center;font-size:10px">${item.jenisDokumen || '-'}</td>
      </tr>
    `).join('');
    const now = new Date();
    const tglCetak = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Cetak Data ${label}</title>
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
        colgroup .col-no{width:6%}
        colgroup .col-tahun{width:10%}
        colgroup .col-uraian{width:48%}
        colgroup .col-tanggal{width:18%}
        colgroup .col-jenis{width:18%}
        tfoot td{padding-top:1cm;padding-bottom:1.5cm;font-size:8px;color:#64748b;border-top:1px solid #cbd5e1;border-left:none;border-right:none;border-bottom:none;line-height:1.4}
      </style></head><body>
      <div class="header">
        <h2>DATA ${label.toUpperCase()}</h2>
        <p class="subtitle">Total: ${itemsWithNumbers.length} dokumen &bull; Dicetak: ${tglCetak}</p>
      </div>
      <table>
        <colgroup>
          <col class="col-no">
          <col class="col-tahun">
          <col class="col-uraian">
          <col class="col-tanggal">
          <col class="col-jenis">
        </colgroup>
        <thead><tr>
          <th>No</th>
          <th>Tahun</th>
          <th>Uraian</th>
          <th>Tanggal</th>
          <th>Jenis</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="5">${globalFooter}</td></tr></tfoot>
      </table>
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{label}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{items.length} dokumen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm dark:shadow-none">
            <Upload size={18} />
            <span>Import</span>
          </button>
          <button onClick={() => { setEditingItem(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors shadow-sm dark:shadow-none">
            <PlusCircle size={18} />
            <span>Tambah {label}</span>
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm dark:shadow-none">
            <Printer size={18} />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari uraian, nomor, tahun..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 dark:text-white" />
          </div>
          <select value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)}
            className="px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
            <option value="">Semua Tahun</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {jenisOptions.length > 1 && (
            <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
              <option value="">Semua Jenis</option>
              {jenisOptions.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <FileText size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Belum ada data {label}</h3>
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
            <table className="w-full min-w-[800px] text-sm border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-4 py-3 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">No</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-4 py-3 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Tahun</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-4 py-3 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider min-w-[250px] whitespace-nowrap">Uraian</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-4 py-3 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider min-w-[120px] whitespace-nowrap">Tanggal</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-left px-4 py-3 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider min-w-[120px] whitespace-nowrap">Jenis</th>
                  <th className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 text-center px-4 py-3 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider w-24 whitespace-nowrap sticky right-0 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{item.displayNo}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300 font-semibold">{item.tahun}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white font-medium whitespace-nowrap truncate max-w-[300px]" title={item.uraian}>{item.uraian || 'TANPA KETERANGAN'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400 text-xs whitespace-nowrap min-w-[130px]">{formatDateDisplay(item.tanggal)}</td>
                    <td className="px-4 py-3 min-w-[130px]">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50 whitespace-nowrap">
                        {item.jenisDokumen || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 sticky right-0 bg-white dark:bg-slate-900 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)]">
                      <div className="flex items-center justify-center gap-1">
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
            <span>Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, itemsWithNumbers.length)} dari {itemsWithNumbers.length} data</span>
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

      {showModal && (
        <ModalCategory item={editingItem} items={items} jenisOptions={jenisOptions} label={label} onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingItem(null); }} />
      )}

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        kategoriLabel={label}
      />

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

function ModalCategory({ item, items, jenisOptions, label, onSave, onClose }: {
  item: ProdukHukumItem | null;
  items: ProdukHukumItem[];
  jenisOptions: string[];
  label: string;
  onSave: (item: Omit<ProdukHukumItem, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}) {
  const isEdit = !!item;
  const [tahun, setTahun] = useState(item?.tahun || new Date().getFullYear().toString());
  const [no, setNo] = useState(item?.no?.toString() || '');
  const [uraian, setUraian] = useState(item?.uraian || '');
  const [tanggal, setTanggal] = useState(item?.tanggal || '');
  const [tanggalDiundangkan, setTanggalDiundangkan] = useState(item?.tanggalDiundangkan || '');
  const [jenisDokumen, setJenisDokumen] = useState(item?.jenisDokumen || (jenisOptions[0] || ''));
  const [arsip, setArsip] = useState(item?.arsip ?? true);
  const [ketArsip, setKetArsip] = useState(item?.ketArsip || 'ASLI');
  const [ketLain, setKetLain] = useState(item?.ketLain || '');

  const handleTahunChange = (val: string) => {
    setTahun(val);
    if (!isEdit && !no) setNo(getNoUrut(items, val).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uraian.trim()) { showToast('Uraian wajib diisi!', 'error'); return; }
    onSave({
      no: parseInt(no) || getNoUrut(items, tahun),
      tahun, uraian: uraian.trim(), tanggal, tanggalDiundangkan,
      jenisDokumen, arsip, ketArsip, ketLain: ketLain.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[5vh] sm:pt-[10vh] p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit' : 'Tambah'} {label}</h3>
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
            <input type="text" value={uraian} onChange={(e) => setUraian(e.target.value)} placeholder={`cth: ${label} ...`}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Tanggal</label>
              <input type="text" value={tanggal} onChange={(e) => setTanggal(e.target.value)} placeholder="cth: Senin, 30 Desember 2024"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Tanggal Diundangkan</label>
              <input type="text" value={tanggalDiundangkan} onChange={(e) => setTanggalDiundangkan(e.target.value)} placeholder="cth: Senin, 30 Desember 2024"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white" />
            </div>
          </div>
          {jenisOptions.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Jenis Dokumen</label>
              <select value={jenisDokumen} onChange={(e) => setJenisDokumen(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white">
                {jenisOptions.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Keterangan Arsip</label>
              <select value={ketArsip} onChange={(e) => setKetArsip(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white">
                {['ASLI', 'FOTOKOPI', 'LAINNYA'].map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="text-xs font-bold text-gray-600 dark:text-slate-400 mr-3">Bersifat Arsip</label>
              <button type="button" onClick={() => setArsip(!arsip)}
                className={`relative w-11 h-6 rounded-full transition-colors ${arsip ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${arsip ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Keterangan Lain</label>
            <input type="text" value={ketLain} onChange={(e) => setKetLain(e.target.value)} placeholder="Catatan tambahan (opsional)"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-white" />
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
