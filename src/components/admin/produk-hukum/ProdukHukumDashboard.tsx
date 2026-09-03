import { useMemo } from 'react';
import { Scale, FileText, TrendingUp, Archive, ChevronRight, FileCheck, ScrollText, Handshake, ClipboardList, Award } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type SubTab = 'dashboard' | 'perdes' | 'sk_kades' | 'perkades' | 'mou_pks' | 'skb' | 'berita_acara' | 'piagam';

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
  perdes: 'Perdes',
  perkades: 'Perkades',
  mou_pks: 'MoU / PKS',
  skb: 'SKB',
  berita_acara: 'Berita Acara',
  piagam: 'Piagam',
};

const KATEGORI_ICONS: Record<string, LucideIcon> = {
  sk_kades: FileCheck,
  perdes: Scale,
  perkades: ScrollText,
  mou_pks: Handshake,
  skb: ClipboardList,
  berita_acara: ClipboardList,
  piagam: Award,
};

const STORAGE_KEY = 'produk_hukum_data';

function loadData(): Record<string, ProdukHukumItem[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

interface DashboardProps {
  onNavigate: (tab: SubTab) => void;
}

export default function ProdukHukumDashboard({ onNavigate }: DashboardProps) {
  const allData = useMemo(() => loadData(), []);

  const stats = useMemo(() => {
    const totalDokumen = Object.values(allData).reduce((sum, items) => sum + items.length, 0);
    const totalArsip = Object.values(allData).reduce((sum, items) => sum + items.filter(i => i.arsip).length, 0);
    
    const perKategori = Object.entries(KATEGORI_LABELS).map(([key, label]) => ({
      key,
      label,
      count: (allData[key] || []).length,
      arsipCount: (allData[key] || []).filter(i => i.arsip).length,
    }));

    const tahunSet = new Set<string>();
    Object.values(allData).forEach(items => items.forEach(i => { if (i.tahun) tahunSet.add(i.tahun); }));
    const jumlahPerTahun: Record<string, number> = {};
    Object.values(allData).forEach(items => items.forEach(i => {
      if (i.tahun) jumlahPerTahun[i.tahun] = (jumlahPerTahun[i.tahun] || 0) + 1;
    }));
    const tahunList = Array.from(tahunSet).sort((a, b) => b.localeCompare(a)).slice(0, 5);

    const recentItems: (ProdukHukumItem & { kategori: string })[] = [];
    Object.entries(allData).forEach(([key, items]) => {
      items.forEach(i => recentItems.push({ ...i, kategori: key }));
    });
    recentItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { totalDokumen, totalArsip, perKategori, tahunList, jumlahPerTahun, recentItems: recentItems.slice(0, 5) };
  }, [allData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard Produk Hukum</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Ringkasan semua dokumen hukum desa</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <FileText size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDokumen}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Total Dokumen</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Archive size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalArsip}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Bersifat Arsip</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.tahunList.length}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Tahun Aktif</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Scale size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.perKategori.filter(k => k.count > 0).length}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Kategori Aktif</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kategori Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none p-6">
        <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-4">Dokumen per Kategori</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {stats.perKategori.map((kat) => (
            <button
              key={kat.key}
              onClick={() => onNavigate(kat.key as SubTab)}
              className={`p-4 rounded-xl border text-left transition-all hover:shadow-md ${
                kat.count > 0
                  ? 'border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-slate-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                {(() => { const Icon = KATEGORI_ICONS[kat.key]; return Icon ? <Icon size={24} className={kat.count > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-500'} /> : null; })()}
                <ChevronRight size={14} className="text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{kat.label}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{kat.count}</span>
                <span className="text-[10px] text-gray-500 dark:text-slate-400">dokumen</span>
              </div>
              {kat.arsipCount > 0 && (
                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">{kat.arsipCount} arsip</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 2 Kolom: Tahun & Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per Tahun */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none p-6">
          <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-4">Dokumen per Tahun (5 Terbaru)</h3>
          {stats.tahunList.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {stats.tahunList.map(tahun => {
                const count = stats.jumlahPerTahun[tahun] || 0;
                const maxCount = Math.max(...stats.tahunList.map(t => stats.jumlahPerTahun[t] || 0));
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={tahun} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-700 dark:text-slate-300 w-12">{tahun}</span>
                    <div className="flex-1 h-6 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-lg transition-all" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-600 dark:text-slate-400 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Terbaru Ditambahkan */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none p-6">
          <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-4">Terbaru Ditambahkan</h3>
          {stats.recentItems.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {stats.recentItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => onNavigate(item.kategori as SubTab)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                    {(() => { const Icon = KATEGORI_ICONS[item.kategori]; return Icon ? <Icon size={16} className="text-emerald-600 dark:text-emerald-400" /> : null; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.uraian || 'TANPA KETERANGAN'}</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">{KATEGORI_LABELS[item.kategori]} &middot; {item.tahun}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
