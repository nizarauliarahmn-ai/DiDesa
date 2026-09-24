import React, { useState, useEffect } from 'react';
import { Star, Search, Filter, CheckCircle, Clock, TrendingUp, Users, BarChart3, Edit2, Trash2, X, Loader2, Save, RotateCcw } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { showToast } from '../../utils/toast';

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

  // Edit/Delete state
  const [editingRow, setEditingRow] = useState<KepuasanRecord | null>(null);
  const [editRatings, setEditRatings] = useState<Record<string, number>>({});
  const [editUlasan, setEditUlasan] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  // Save updated data to saas_settings
  const saveData = async (updatedData: KepuasanRecord[]) => {
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) return false;
      
      const { error } = await supabase
        .from('saas_settings')
        .upsert({
          tenant_id: tenantId,
          key: 'kepuasan_data',
          value: JSON.stringify(updatedData),
          updated_at: new Date().toISOString(),
        });
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Gagal menyimpan data kepuasan:', err);
      return false;
    }
  };

  const handleEdit = (row: KepuasanRecord) => {
    setEditingRow(row);
    setEditRatings(row.ratings || {});
    setEditUlasan(row.ulasan || '');
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    setEditSaving(true);
    try {
      const rata_rata = Object.values(editRatings).length > 0
        ? Object.values(editRatings).reduce((a, b) => a + b, 0) / Object.values(editRatings).length
        : 0;
      
      const updatedData = data.map(d => 
        d.id === editingRow.id 
          ? { ...d, ratings: editRatings, ulasan: editUlasan || null, rata_rata }
          : d
      );
      
      const success = await saveData(updatedData);
      if (success) {
        setData(updatedData);
        showToast('Data kepuasan berhasil diperbarui.', 'success');
        setEditingRow(null);
      } else {
        showToast('Gagal menyimpan perubahan.', 'error');
      }
    } catch (err) {
      console.error('Edit error:', err);
      showToast('Terjadi kesalahan.', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditRatings({});
    setEditUlasan('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus data kepuasan ini? Tindakan ini tidak dapat dibatalkan.')) return;
    setDeleteLoading(true);
    try {
      const updatedData = data.filter(d => d.id !== id);
      const success = await saveData(updatedData);
      if (success) {
        setData(updatedData);
        showToast('Data kepuasan berhasil dihapus.', 'success');
      } else {
        showToast('Gagal menghapus data.', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Terjadi kesalahan.', 'error');
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
    }
  };

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
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-gray-400 mt-3 font-bold">Memuat data...</p>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((row) => {
                  const isEditing = editingRow?.id === row.id;
                  return (
                    <tr key={row.id} className={`transition-colors ${isEditing ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'hover:bg-gray-50/50 dark:hover:bg-slate-800/50'}`}>
                      <td className="px-6 py-4 text-xs font-bold text-gray-500 whitespace-nowrap">
                        {new Date(row.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      {isEditing ? (
                        <>
                          <td className="px-6 py-2">
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setEditRatings(prev => ({ ...prev, kecepatan: s }))}
                                  className={`w-5 h-5 rounded transition-colors ${
                                    (editRatings.kecepatan || row.ratings?.kecepatan || 0) >= s
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
                                  }`}
                                >
                                  <Star className="w-5 h-5" />
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-2">
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setEditRatings(prev => ({ ...prev, keramahan: s }))}
                                  className={`w-5 h-5 rounded transition-colors ${
                                    (editRatings.keramahan || row.ratings?.keramahan || 0) >= s
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
                                  }`}
                                >
                                  <Star className="w-5 h-5" />
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-2">
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setEditRatings(prev => ({ ...prev, kemudahan: s }))}
                                  className={`w-5 h-5 rounded transition-colors ${
                                    (editRatings.kemudahan || row.ratings?.kemudahan || 0) >= s
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
                                  }`}
                                >
                                  <Star className="w-5 h-5" />
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-2">
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setEditRatings(prev => ({ ...prev, kepuasan: s }))}
                                  className={`w-5 h-5 rounded transition-colors ${
                                    (editRatings.kepuasan || row.ratings?.kepuasan || 0) >= s
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
                                  }`}
                                >
                                  <Star className="w-5 h-5" />
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold ${
                              (Object.values(editRatings).reduce((a,b)=>a+b,0) / Object.values(editRatings).length || 0) >= 4 ? 'bg-emerald-50 text-emerald-700' :
                              (Object.values(editRatings).reduce((a,b)=>a+b,0) / Object.values(editRatings).length || 0) >= 3 ? 'bg-amber-50 text-amber-700' :
                              'bg-rose-50 text-rose-700'
                            }`}>
                              {(Object.values(editRatings).length > 0
                                ? (Object.values(editRatings).reduce((a,b)=>a+b,0) / Object.values(editRatings).length).toFixed(1)
                                : row.rata_rata.toFixed(1))}
                            </span>
                          </td>
                          <td className="px-6 py-2">
                            <input
                              type="text"
                              value={editUlasan}
                              onChange={e => setEditUlasan(e.target.value)}
                              placeholder="Ulasan opsional"
                              className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                          </td>
                          <td className="px-6 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={handleSaveEdit}
                                disabled={editSaving}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                                title="Simpan"
                              >
                                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                title="Batal"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
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
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEdit(row)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setDeletingId(row.id); handleDelete(row.id); }}
                                disabled={deleteLoading && deletingId === row.id}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                                title="Hapus"
                              >
                                {deleteLoading && deletingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-xs font-bold">
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
