import React, { useState, useEffect, useMemo } from 'react';
import { Search, Star, Printer, Download, CheckCircle2, ExternalLink } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

interface UsulanMusrenbang {
  id: string;
  tenant_id: string;
  kode_usulan: string;
  uraian_usulan: string;
  kategori: string;
  lokasi_rt_rw?: string | null;
  pengusul?: string | null;
  diteruskan_tags?: string[] | null;
  pipeline_status?: string;
  pipeline_year?: number | null;
  status_terakomodir?: string;
  skala_prioritas?: number | null;
  created_at: string;
}

export default function AdminMusrenbang() {
  const [list, setList] = useState<UsulanMusrenbang[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) { setLoading(false); return; }
    const { data } = await supabase.from('usulan_desas').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    const musrenbangList = (data || []).filter((u: any) =>
      (u.diteruskan_tags || []).some((t: string) => (t || '').toLowerCase().includes('musrenbang'))
    );
    setList(musrenbangList as UsulanMusrenbang[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let result = list;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.kode_usulan.toLowerCase().includes(q) ||
        u.uraian_usulan.toLowerCase().includes(q) ||
        (u.pengusul || '').toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'Semua') {
      result = result.filter(u => u.status_terakomodir === filterStatus);
    }
    return result;
  }, [list, searchQuery, filterStatus]);

  const exportExcel = () => {
    if (filtered.length === 0) { showToast('Tidak ada data untuk di-export', 'error'); return; }
    const rows = filtered.map((u, i) => ({
      'No': i + 1,
      'Kode': u.kode_usulan,
      'Uraian': u.uraian_usulan,
      'Kategori': u.kategori,
      'Lokasi': u.lokasi_rt_rw || '-',
      'Pengusul': u.pengusul || '-',
      'Tags': (u.diteruskan_tags || []).join(', '),
      'Status Akomodir': u.status_terakomodir || '',
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Musrenbang');
    writeFile(wb, `usulan-musrenbang-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('File berhasil diunduh.', 'success');
  };

  const exportPrint = () => {
    const tahun = new Date().getFullYear();
    const rowsHtml = filtered.map((u, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${u.kode_usulan}</td>
        <td>${u.uraian_usulan}</td>
        <td>${u.kategori}</td>
        <td>${u.lokasi_rt_rw || '-'}</td>
        <td>${u.pengusul || '-'}</td>
        <td style="text-align:center">${u.skala_prioritas ?? '-'}</td>
        <td>${u.status_terakomodir || '-'}</td>
      </tr>
    `).join('');
    const doc = `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"/><title>Usulan Musrenbang ${tahun}</title>
<style>
@page{size:A4 landscape;margin:15mm}*{box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;margin:0;padding:20px}
h1{text-align:center;font-size:16px;margin-bottom:4px}
table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{border:1px solid #333;padding:6px 8px;font-size:10px}
th{background:#f0f0f0;font-weight:bold}
@media print{body{padding:0}}
</style></head><body>
<h1>DAFTAR USULAN MUSRENBANG DESA ${tahun}</h1>
<table><thead><tr>
<th style="width:40px">No</th><th>Kode</th><th>Uraian</th><th>Kategori</th>
<th>Lokasi</th><th>Pengusul</th><th style="width:40px">Prioritas</th><th>Status</th>
</tr></thead><tbody>${rowsHtml}</tbody></table>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(doc); w.document.close(); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Musrenbang</h2>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
            <Download size={14} /> Export
          </button>
          <button onClick={exportPrint} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
            <Printer size={14} /> Cetak
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center"><Star className="w-4 h-4" /></span>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{list.length}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 ml-11">Total Usulan</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></span>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{list.filter(u => u.status_terakomodir === 'Terakomodir').length}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 ml-11">Terakomodir</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center"><ExternalLink className="w-4 h-4" /></span>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{list.filter(u => u.status_terakomodir !== 'Terakomodir').length}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 ml-11">Belum Terakomodir</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari kode, uraian, pengusul..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 h-10 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 px-3 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
        >
          <option>Semua</option>
          <option>Terakomodir</option>
          <option>Belum Terakomodir</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">No</th>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Kode</th>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Uraian</th>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase hidden md:table-cell">Kategori</th>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase hidden lg:table-cell">Lokasi</th>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase hidden lg:table-cell">Pengusul</th>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-gray-400">
                {list.length === 0 ? 'Belum ada usulan ber-tag Musrenbang.' : 'Tidak ada hasil yang cocok.'}
              </td></tr>
            ) : filtered.map((u, i) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{u.kode_usulan}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300 max-w-xs truncate">{u.uraian_usulan}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400 hidden md:table-cell">{u.kategori}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400 hidden lg:table-cell">{u.lokasi_rt_rw || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400 hidden lg:table-cell">{u.pengusul || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    u.status_terakomodir === 'Terakomodir'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                  }`}>
                    {u.status_terakomodir === 'Terakomodir' && <CheckCircle2 className="w-3 h-3" />}
                    {u.status_terakomodir || 'Belum'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
