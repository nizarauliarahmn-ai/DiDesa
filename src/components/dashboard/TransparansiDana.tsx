import React, { useState, useMemo } from 'react';
import { PieChart, TrendingUp, DollarSign, ArrowDownRight, ArrowUpRight, CheckCircle, Search, Calendar, FileText } from 'lucide-react';

interface BudgetLineItem {
  id: string;
  name: string;
  category: 'pendapatan' | 'belanja';
  sector: string;
  budget: number;
  realized: number;
}

export default function TransparansiDana() {
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState<'semua' | 'pendapatan' | 'belanja'>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [apbdesData, setApbdesData] = useState<any>(() => {
    const saved = localStorage.getItem('didesa_apbdes_data');
    return saved ? JSON.parse(saved) : null;
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('didesa_apbdes_data');
      if (saved) {
        setApbdesData(JSON.parse(saved));
      }
    };
    window.addEventListener('apbdes_data_updated', handleUpdate);
    return () => window.removeEventListener('apbdes_data_updated', handleUpdate);
  }, []);


  const budgetItems: BudgetLineItem[] = [
    // Pendapatan
    { id: 'p1', name: 'Alokasi Dana Desa (ADD)', category: 'pendapatan', sector: 'Pemerintah Kabupaten', budget: 420000000, realized: 420000000 },
    { id: 'p2', name: 'Dana Desa (DD) APBN', category: 'pendapatan', sector: 'Pemerintah Pusat', budget: 780000000, realized: 780000000 },
    { id: 'p3', name: 'Pendapatan Asli Desa (PADesa)', category: 'pendapatan', sector: 'Pendapatan Mandiri', budget: 110000000, realized: 95000000 },
    { id: 'p4', name: 'Bagi Hasil Pajak & Retribusi (BHP)', category: 'pendapatan', sector: 'Pemerintah Provinsi', budget: 114500000, realized: 114500000 },
    
    // Belanja
    { id: 'b1', name: 'Penyelenggaraan Siltap & Tunjangan Aparat', category: 'belanja', sector: 'Pemerintahan', budget: 320000000, realized: 320000000 },
    { id: 'b2', name: 'Pembangunan Jembatan Tani RW 03', category: 'belanja', sector: 'Pembangunan', budget: 180000000, realized: 180000000 },
    { id: 'b3', name: 'Rehabilitasi Kantor Balai Desa', category: 'belanja', sector: 'Pembangunan', budget: 150000000, realized: 135000000 },
    { id: 'b4', name: 'Insentif Kader Posyandu & Kesehatan', category: 'belanja', sector: 'Pembinaan', budget: 45000000, realized: 45000000 },
    { id: 'b5', name: 'Penyelenggaraan PAUD Milik Desa', category: 'belanja', sector: 'Pembinaan', budget: 35000000, realized: 30000000 },
    { id: 'b6', name: 'Bantuan Bibit Padi Kelompok Tani', category: 'belanja', sector: 'Pemberdayaan', budget: 80000000, realized: 72000000 },
    { id: 'b7', name: 'Pelatihan UMKM Kerajinan Bambu', category: 'belanja', sector: 'Pemberdayaan', budget: 40000000, realized: 28000000 },
    { id: 'b8', name: 'Bantuan Langsung Tunai (BLT) Dana Desa', category: 'belanja', sector: 'Darurat/Sosial', budget: 270000000, realized: 246000000 },
    { id: 'b9', name: 'Penanggulangan Bencana Kekeringan', category: 'belanja', sector: 'Darurat/Sosial', budget: 30000000, realized: 30000000 }
  ];

  const summary = useMemo(() => {
    let totPendapatanBudget = 0;
    let totPendapatanRealized = 0;
    let totBelanjaBudget = 0;
    let totBelanjaRealized = 0;

    budgetItems.forEach(item => {
      if (item.category === 'pendapatan') {
        totPendapatanBudget += item.budget;
        totPendapatanRealized += item.realized;
      } else {
        totBelanjaBudget += item.budget;
        totBelanjaRealized += item.realized;
      }
    });

    return {
      pendapatanBudget: totPendapatanBudget,
      pendapatanRealized: totPendapatanRealized,
      belanjaBudget: totBelanjaBudget,
      belanjaRealized: totBelanjaRealized,
      realisasiPercent: (totBelanjaRealized / totBelanjaBudget) * 100,
      silpa: totPendapatanRealized - totBelanjaRealized
    };
  }, []);

  const filteredItems = useMemo(() => {
    return budgetItems.filter(item => {
      const matchesTab = 
        activeTab === 'semua' || 
        item.category === activeTab;
      const matchesSearch = 
        item.(name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sector || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Transparansi Anggaran Pendapatan & Belanja Desa</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Laporan pertanggungjawaban dana publik secara transparan, akuntabel, dan terbuka.</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-700" />
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 px-3 py-2 rounded-xl text-sm font-bold shadow-sm dark:shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={new Date().getFullYear().toString()}>Tahun Anggaran {new Date().getFullYear()}</option>
            <option value={(new Date().getFullYear() - 1).toString()}>Tahun Anggaran {new Date().getFullYear() - 1}</option>
            <option value={(new Date().getFullYear() - 2).toString()}>Tahun Anggaran {new Date().getFullYear() - 2}</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pendapatan */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL PENDAPATAN ({selectedYear})</p>
            <h3 className="text-2xl font-bold text-emerald-700 tracking-tight">{formatRupiah(summary.pendapatanRealized)}</h3>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1.5 font-medium">Target APBDes: {formatRupiah(summary.pendapatanBudget)}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Belanja */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL BELANJA ({selectedYear})</p>
            <h3 className="text-2xl font-bold text-rose-600 tracking-tight">{formatRupiah(summary.belanjaRealized)}</h3>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1.5 font-medium">Anggaran Dialokasi: {formatRupiah(summary.belanjaBudget)}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-110 transition-transform">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        {/* Realisasi & SILPA */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">REBOISASI / SILPA / REALISASI</p>
            <h3 className="text-2xl font-bold text-amber-600 tracking-tight">{formatRupiah(summary.silpa)}</h3>
            <p className="text-[11px] text-emerald-700 mt-1.5 font-bold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Realisasi Belanja: {summary.realisasiPercent.toFixed(1)}%
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sektoral Realization Progress Bars */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-6">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Realisasi per Bidang / Sektor Belanja</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">Persentase pengerjaan dan alokasi anggaran tiap sektor kepemerintahan desa.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectorProgress label="Bidang Penyelenggaraan Pemerintahan" budget={350000000} realized={350000000} color="bg-emerald-600" />
          <SectorProgress label="Bidang Pelaksanaan Pembangunan Desa" budget={450000000} realized={380000000} color="bg-blue-600" />
          <SectorProgress label="Bidang Pembinaan Kemasyarakatan" budget={120000000} realized={110000000} color="bg-purple-600" />
          <SectorProgress label="Bidang Pemberdayaan Masyarakat" budget={180000000} realized={135000000} color="bg-amber-500" />
          <SectorProgress label="Bidang Penanggulangan Bencana/Darurat" budget={100000000} realized={100000000} color="bg-red-500" />
        </div>
      </div>

      {/* Search & Filters for Detailed Budget Items */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
          <div className="flex border border-gray-100 dark:border-slate-800 p-1 bg-gray-50 dark:bg-slate-800 rounded-xl gap-1 shrink-0 w-fit">
            <button 
              onClick={() => setActiveTab('semua')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'semua' ? 'bg-white dark:bg-slate-900 text-emerald-800 shadow-sm dark:shadow-none' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900'}`}
            >
              Semua Pos
            </button>
            <button 
              onClick={() => setActiveTab('pendapatan')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'pendapatan' ? 'bg-white dark:bg-slate-900 text-emerald-800 shadow-sm dark:shadow-none' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900'}`}
            >
              Pendapatan
            </button>
            <button 
              onClick={() => setActiveTab('belanja')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'belanja' ? 'bg-white dark:bg-slate-900 text-emerald-800 shadow-sm dark:shadow-none' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900'}`}
            >
              Belanja Saja
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Cari rincian anggaran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 font-bold text-xs uppercase tracking-wider">
                <th className="pb-3 font-semibold">Uraian Kegiatan / Sumber</th>
                <th className="pb-3 font-semibold">Sektor / Asal</th>
                <th className="pb-3 font-semibold text-right">Anggaran</th>
                <th className="pb-3 font-semibold text-right">Realisasi</th>
                <th className="pb-3 font-semibold text-right">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const percent = (item.realized / item.budget) * 100;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full ${item.category === 'pendapatan' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="font-bold text-gray-800 dark:text-slate-100">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-xs font-semibold text-gray-400 uppercase tracking-tight">
                        {item.sector}
                      </td>
                      <td className="py-4 text-right font-medium text-gray-600 dark:text-slate-400">
                        {formatRupiah(item.budget)}
                      </td>
                      <td className="py-4 text-right font-bold text-gray-800 dark:text-slate-100">
                        {formatRupiah(item.realized)}
                      </td>
                      <td className="py-4 text-right">
                        <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold ${percent >= 100 ? 'bg-emerald-50 text-emerald-700' : percent >= 80 ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                          {percent.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                    Tidak ada rincian kegiatan yang sesuai dengan pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SectorProgress({ label, budget, realized, color }: { label: string, budget: number, realized: number, color: string }) {
  const percent = (realized / budget) * 100;
  return (
    <div className="space-y-2 p-4 bg-gray-50/50 dark:bg-slate-800/50 rounded-2xl border border-gray-100/50">
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-gray-800 dark:text-slate-100 block max-w-[70%]">{label}</span>
        <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">{percent.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 font-bold tracking-tight">
        <span>Sektor: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(budget)}</span>
        <span className="text-gray-600 dark:text-slate-400">Real: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(realized)}</span>
      </div>
    </div>
  );
}
