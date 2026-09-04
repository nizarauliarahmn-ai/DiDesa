import React, { useState, useEffect } from 'react';
import { Star, Search, Filter, CheckCircle, Clock, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

interface KepuasanRecord {
  id: string;
  tenant_id: string;
  ratings: Record<string, number>;
  rata_rata: number;
  ulasan: string | null;
  timestamp: string;
}

const aspectLabels: Record<string, string> = {
  kecepatan: 'Kecepatan Pelayanan',
  keramahan: 'Keramahan Petugas',
  kemudahan: 'Kemudahan Prosedur',
  kepuasan: 'Kepuasan Keseluruhan',
};

const renderStars = (count: number) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={`w-3.5 h-3.5 ${s <= count ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'}`} />
    ))}
  </div>
);

export default function AdminKepuasan() {
  const [data, setData] = useState<KepuasanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) { setLoading(false); return; }

      // Read from saas_settings kepuasan_data
      const { data: settings, error } = await supabase
        .from('saas_settings')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'kepuasan_data')
        .maybeSingle();

      if (!error && settings?.value) {
        const parsed = JSON.parse(settings.value);
        setData(Array.isArray(parsed) ? parsed as KepuasanRecord[] : []);
      }
    } catch (err) {
      console.error('Gagal memuat data kepuasan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const avgRataRata = data.length > 0
    ? (data.reduce((sum, d) => sum + d.rata_rata, 0) / data.length).toFixed(1)
    : '0';

  const avgPerAspect = (aspect: string) => {
    const vals = data.map((d) => d.ratings?.[aspect]).filter(Boolean) as number[];
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '0';
  };

  const filtered = data.filter((d) => {
    if (searchQuery && d.ulasan && !d.ulasan.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Indeks Kepuasan Warga</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Penilaian pelayanan desa dari warga yang telah menggunakan layanan digital</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Rata-rata</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{avgRataRata}</span>
            <span className="text-xs text-gray-400">/ 5</span>
          </div>
          {renderStars(Math.round(Number(avgRataRata)))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Total</span>
          </div>
          <span className="text-2xl font-black text-gray-900 dark:text-white">{data.length}</span>
          <span className="text-xs text-gray-400 ml-1">penilaian</span>
        </div>

        {Object.keys(aspectLabels).slice(0, 3).map((key) => (
          <div key={key} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider truncate">{aspectLabels[key]}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-gray-900 dark:text-white">{avgPerAspect(key)}</span>
              <span className="text-xs text-gray-400">/ 5</span>
            </div>
            {renderStars(Math.round(Number(avgPerAspect(key))))}
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari ulasan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-gray-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 text-[10px] font-extrabold uppercase tracking-widest">
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Kecepatan</th>
                <th className="px-6 py-4">Keramahan</th>
                <th className="px-6 py-4">Kemudahan</th>
                <th className="px-6 py-4">Keseluruhan</th>
                <th className="px-6 py-4">Rata-rata</th>
                <th className="px-6 py-4">Ulasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-gray-400 mt-3 font-bold">Memuat data...</p>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-gray-500 whitespace-nowrap">
                      {new Date(row.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">{renderStars(row.ratings?.kecepatan || 0)}</td>
                    <td className="px-6 py-4">{renderStars(row.ratings?.keramahan || 0)}</td>
                    <td className="px-6 py-4">{renderStars(row.ratings?.kemudahan || 0)}</td>
                    <td className="px-6 py-4">{renderStars(row.ratings?.kepuasan || 0)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold ${
                        row.rata_rata >= 4 ? 'bg-emerald-50 text-emerald-700' :
                        row.rata_rata >= 3 ? 'bg-amber-50 text-amber-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {row.rata_rata.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">
                      {row.ulasan || <span className="text-gray-300 italic">—</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-xs font-bold">
                    Belum ada data indeks kepuasan.
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
