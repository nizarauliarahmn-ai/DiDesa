import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, PlusCircle, Edit2, Trash2, BarChart3, X, Link2,
  Download, AlertTriangle, CheckCircle2, Clock, ChevronRight
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

export interface APBDesa {
  id: string;
  tenant_id: string;
  kode_apbdesa: string;
  rkpdesa_id?: string | null;
  nama_kegiatan: string;
  kategori: string;
  lokasi?: string | null;
  sumber_data: string;
  tahun: number;
  anggaran: number;
  tahapan_pencairan: string;
  tanggal_pencairan?: string | null;
  keterangan_pencairan?: string | null;
  created_at: string;
  updated_at: string;
  rkpdesa_nama?: string;
}

const KATEGORI_OPTIONS = ['Infrastruktur', 'Ekonomi', 'Sosial/Kesehatan', 'Pemerintahan', 'Pemberdayaan'];
const TAHAPAN_OPTIONS = ['Belum', 'Dianggarkan', 'Tahap 1', 'Tahap 2', 'Tahap 3', 'Selesai'];

const kategoriColor = (k: string) => {
  switch (k) {
    case 'Infrastruktur': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'Ekonomi': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Sosial/Kesehatan': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'Pemerintahan': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'Pemberdayaan': return 'bg-amber-100 text-amber-700 border-amber-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getHighlight = (item: APBDesa): { label: string; color: string; bg: string; border: string } | null => {
  const tahapIdx = TAHAPAN_OPTIONS.indexOf(item.tahapan_pencairan);
  if (tahapIdx === 0 && item.anggaran > 0) {
    return { label: 'Perlu Diproses', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' };
  }
  if (item.tanggal_pencairan) {
    const daysSince = Math.floor((Date.now() - new Date(item.tanggal_pencairan).getTime()) / 86400000);
    if (tahapIdx === 1 && daysSince > 30) {
      return { label: 'Terlambat', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-300' };
    }
    if (tahapIdx >= 2 && tahapIdx < TAHAPAN_OPTIONS.length - 1 && daysSince > 60) {
      return { label: 'Stagnan', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' };
    }
  }
  if (item.anggaran === 0) {
    return { label: 'Belum Dianggarkan', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' };
  }
  return null;
};

const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const daysSince = (date: string | null): number | null => {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
};

export default function AdminAPBDesa() {
  const [list, setList] = useState<APBDesa[]>([]);
  const [rkpList, setRkpList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [filterHighlight, setFilterHighlight] = useState('Semua');
  const [showModal, setShowModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState<APBDesa | null>(null);
  const [editItem, setEditItem] = useState<APBDesa | null>(null);
  const [showFromRkp, setShowFromRkp] = useState(false);
  const [selectedRkp, setSelectedRkp] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    nama_kegiatan: '', kategori: 'Infrastruktur', lokasi: '', anggaran: 0,
    keterangan_pencairan: ''
  });

  const [progressForm, setProgressForm] = useState({
    anggaran: 0, tahapan_pencairan: 'Belum', keterangan_pencairan: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) { setLoading(false); return; }

    const { data } = await supabase.from('apbdesa').select('*').eq('tenant_id', tenantId).eq('tahun', currentYear).order('created_at', { ascending: false });
    if (data) {
      const items = data as APBDesa[];
      const rkpIds = items.filter(i => i.rkpdesa_id).map(i => i.rkpdesa_id);
      if (rkpIds.length > 0) {
        const { data: rkpData } = await supabase.from('rkpdesa').select('id, nama_kegiatan').in('id', rkpIds);
        const rkpMap = new Map((rkpData || []).map((r: any) => [r.id, r.nama_kegiatan]));
        items.forEach(i => { i.rkpdesa_nama = rkpMap.get(i.rkpdesa_id!) || null; });
      }
      setList(items);
    }
    setLoading(false);
  };

  const generateKode = async (): Promise<string> => {
    const tenantId = await resolveCurrentTenant();
    const { data } = await supabase.from('apbdesa').select('kode_apbdesa').eq('tenant_id', tenantId).like('kode_apbdesa', `APB-${currentYear}-%`);
    const maxSeq = (data || []).reduce((max, row) => {
      const match = row.kode_apbdesa.match(/APB-\d{4}-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `APB-${currentYear}-${String(maxSeq + 1).padStart(3, '0')}`;
  };

  const loadRkp = async () => {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;
    const { data } = await supabase.from('rkpdesa').select('*').eq('tenant_id', tenantId).eq('tahun', currentYear).in('status', ['Rencana', 'Berlangsung']);
    setRkpList(data || []);
  };

  const handleSave = async () => {
    if (!form.nama_kegiatan.trim()) { showToast('Nama kegiatan wajib diisi', 'error'); return; }
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;

    const payload = {
      tenant_id: tenantId,
      kode_apbdesa: editItem?.kode_apbdesa || await generateKode(),
      rkpdesa_id: editItem?.rkpdesa_id || null,
      nama_kegiatan: form.nama_kegiatan,
      kategori: form.kategori,
      lokasi: form.lokasi || null,
      sumber_data: editItem?.sumber_data || 'manual',
      tahun: currentYear,
      anggaran: form.anggaran,
      tahapan_pencairan: editItem?.tahapan_pencairan || 'Belum',
      keterangan_pencairan: form.keterangan_pencairan || null,
      updated_at: new Date().toISOString()
    };

    if (editItem) {
      const { error } = await supabase.from('apbdesa').update(payload).eq('id', editItem.id);
      if (error) { showToast('Gagal update: ' + error.message, 'error'); return; }
    } else {
      const { error } = await supabase.from('apbdesa').insert(payload);
      if (error) { showToast('Gagal simpan: ' + error.message, 'error'); return; }
    }
    showToast('Berhasil disimpan', 'success');
    setShowModal(false); setEditItem(null); resetForm(); loadData();
  };

  const handleUpdateProgress = async () => {
    if (!showProgressModal) return;
    const { error } = await supabase.from('apbdesa').update({
      anggaran: progressForm.anggaran,
      tahapan_pencairan: progressForm.tahapan_pencairan,
      keterangan_pencairan: progressForm.keterangan_pencairan || null,
      tanggal_pencairan: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', showProgressModal.id);
    if (error) { showToast('Gagal update progress', 'error'); return; }
    showToast('Progress berhasil diperbarui', 'success');
    setShowProgressModal(null); loadData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus kegiatan APBDesa ini?')) return;
    const { error } = await supabase.from('apbdesa').delete().eq('id', id);
    if (error) { showToast('Gagal menghapus', 'error'); return; }
    showToast('Berhasil dihapus', 'success'); loadData();
  };

  const handleImportFromRkp = async () => {
    if (selectedRkp.length === 0) { showToast('Pilih minimal 1 kegiatan RKPDesa', 'error'); return; }
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;

    let successCount = 0;
    for (const rkpId of selectedRkp) {
      const r = rkpList.find((x: any) => x.id === rkpId);
      if (!r) continue;
      const payload = {
        tenant_id: tenantId,
        kode_apbdesa: await generateKode(),
        rkpdesa_id: r.id,
        nama_kegiatan: r.nama_kegiatan,
        kategori: r.kategori,
        lokasi: r.lokasi || null,
        sumber_data: 'rkpdesa',
        tahun: currentYear,
        anggaran: r.anggaran || 0,
        tahapan_pencairan: 'Belum',
        keterangan_pencairan: null
      };
      const { error } = await supabase.from('apbdesa').insert(payload);
      if (!error) successCount++;
    }
    showToast(`${successCount} kegiatan berhasil ditarik ke APBDesa`, 'success');
    setShowFromRkp(false); setSelectedRkp([]); loadData();
  };

  const resetForm = () => {
    setForm({ nama_kegiatan: '', kategori: 'Infrastruktur', lokasi: '', anggaran: 0, keterangan_pencairan: '' });
  };

  const filtered = useMemo(() => list.filter(r => {
    const matchSearch = r.nama_kegiatan.toLowerCase().includes(searchQuery.toLowerCase()) || r.kode_apbdesa.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKat = filterKategori === 'Semua' || r.kategori === filterKategori;
    const hl = getHighlight(r);
    const matchHl = filterHighlight === 'Semua' ||
      (filterHighlight === 'highlight' && hl !== null) ||
      (filterHighlight === 'aman' && hl === null);
    return matchSearch && matchKat && matchHl;
  }), [list, searchQuery, filterKategori, filterHighlight]);

  const metrics = useMemo(() => {
    const highlighted = list.filter(r => getHighlight(r) !== null);
    return {
      total: list.length,
      highlight: highlighted.length,
      perluDiproses: list.filter(r => r.tahapan_pencairan === 'Belum' && r.anggaran > 0).length,
      terlambat: list.filter(r => {
        const d = daysSince(r.tanggal_pencairan);
        return TAHAPAN_OPTIONS.indexOf(r.tahapan_pencairan) === 1 && d !== null && d > 30;
      }).length,
      selesai: list.filter(r => r.tahapan_pencairan === 'Selesai').length,
      totalAnggaran: list.reduce((s, r) => s + (r.anggaran || 0), 0)
    };
  }, [list]);

  const handleExport = () => {
    const rows = filtered.map(r => ({
      Kode: r.kode_apbdesa, Kegiatan: r.nama_kegiatan, Kategori: r.kategori, Lokasi: r.lokasi || '',
      Anggaran: r.anggaran, Tahapan: r.tahapan_pencairan,
      'Terakhir Update': r.tanggal_pencairan ? new Date(r.tanggal_pencairan).toLocaleDateString('id-ID') : '-',
      Catatan: r.keterangan_pencairan || '', Highlight: getHighlight(r)?.label || '-'
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'APBDesa');
    writeFile(wb, `APBDesa_${currentYear}.xlsx`);
    showToast('Berhasil diexport', 'success');
  };

  const tahapanProgress = (current: string) => {
    const idx = TAHAPAN_OPTIONS.indexOf(current);
    return (
      <div className="flex items-center gap-1">
        {TAHAPAN_OPTIONS.map((t, i) => (
          <React.Fragment key={t}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all ${
              i < idx ? 'bg-emerald-500 border-emerald-500 text-white' :
              i === idx ? 'bg-blue-500 border-blue-500 text-white ring-2 ring-blue-200' :
              'bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-400'
            }`}>
              {i < idx ? <CheckCircle2 size={12} /> : i + 1}
            </div>
            {i < TAHAPAN_OPTIONS.length - 1 && (
              <div className={`w-4 h-0.5 ${i < idx ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-slate-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="pb-24 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
            </div>
            APBDesa {currentYear}
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mt-1 ml-13">Monitoring Pencairan Dana Kegiatan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { loadRkp(); setShowFromRkp(true); }}
            className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2">
            <Link2 size={16} /> Tarik dari RKPDesa
          </button>
          <button onClick={() => { resetForm(); setEditItem(null); setShowModal(true); }}
            className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2">
            <PlusCircle size={16} /> Tambah Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Total Kegiatan', value: metrics.total, color: 'border-l-emerald-500', icon: BarChart3 },
          { label: 'Perlu Perhatian', value: metrics.highlight, color: 'border-l-amber-500', icon: AlertTriangle },
          { label: 'Perlu Diproses', value: metrics.perluDiproses, color: 'border-l-orange-500', icon: Clock },
          { label: 'Terlambat', value: metrics.terlambat, color: 'border-l-rose-500', icon: AlertTriangle },
          { label: 'Selesai', value: metrics.selesai, color: 'border-l-emerald-700', icon: CheckCircle2 },
          { label: 'Total Anggaran', value: formatRp(metrics.totalAnggaran), color: 'border-l-emerald-500', isText: true }
        ].map((m, i) => (
          <div key={i} className={`standard-card p-4 border-l-4 ${m.color}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{m.label}</p>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="standard-card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari kegiatan..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-900">
            <option>Semua Kategori</option>
            {KATEGORI_OPTIONS.map(k => <option key={k}>{k}</option>)}
          </select>
          <select value={filterHighlight} onChange={e => setFilterHighlight(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-900">
            <option value="Semua">Semua Status</option>
            <option value="highlight">Perlu Perhatian</option>
            <option value="aman">Aman</option>
          </select>
          <button onClick={handleExport} className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="standard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Kode</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Kegiatan</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Kategori</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Anggaran</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Progress Tahapan</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Highlight</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Update</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => {
                const hl = getHighlight(r);
                return (
                  <tr key={r.id} className={`transition-colors ${hl ? `${hl.bg}/30 hover:${hl.bg}/50` : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'}`}>
                    <td className="py-3 px-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{r.kode_apbdesa}</td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-bold text-gray-900 dark:text-white max-w-[220px] truncate">{r.nama_kegiatan}</p>
                      {r.rkpdesa_nama && <p className="text-[10px] text-blue-500 mt-0.5 flex items-center gap-1"><Link2 size={10} /> {r.rkpdesa_nama}</p>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${kategoriColor(r.kategori)}`}>{r.kategori}</span>
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white text-right whitespace-nowrap">{formatRp(r.anggaran)}</td>
                    <td className="py-3 px-4">{tahapanProgress(r.tahapan_pencairan)}</td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {hl ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${hl.color} ${hl.bg} ${hl.border}`}>
                          <AlertTriangle size={10} /> {hl.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 size={10} /> Aman
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-gray-500 whitespace-nowrap">
                      {r.tanggal_pencairan ? new Date(r.tanggal_pencairan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => {
                          setProgressForm({ anggaran: r.anggaran, tahapan_pencairan: r.tahapan_pencairan, keterangan_pencairan: r.keterangan_pencairan || '' });
                          setShowProgressModal(r);
                        }} className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors">Update</button>
                        <button onClick={() => {
                          setEditItem(r);
                          setForm({ nama_kegiatan: r.nama_kegiatan, kategori: r.kategori, lokasi: r.lokasi || '',
                            anggaran: r.anggaran, keterangan_pencairan: r.keterangan_pencairan || '' });
                          setShowModal(true);
                        }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-rose-50 rounded-lg text-gray-500 hover:text-rose-600"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-gray-500 font-medium">Belum ada data APBDesa tahun ini</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showProgressModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Update Progress Pencairan</h3>
                <p className="text-xs text-gray-500 mt-0.5">{showProgressModal.kode_apbdesa} — {showProgressModal.nama_kegiatan}</p>
              </div>
              <button onClick={() => setShowProgressModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Anggaran (Rp)</label>
                <input type="number" value={progressForm.anggaran} onChange={e => setProgressForm({ ...progressForm, anggaran: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-2 block">Tahapan Pencairan</label>
                <div className="flex items-center justify-between mb-3">{tahapanProgress(progressForm.tahapan_pencairan)}</div>
                <div className="grid grid-cols-3 gap-2">
                  {TAHAPAN_OPTIONS.map(t => (
                    <button key={t} onClick={() => setProgressForm({ ...progressForm, tahapan_pencairan: t })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all text-center ${
                        progressForm.tahapan_pencairan === t
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                          : 'border-gray-200 dark:border-slate-700 hover:border-emerald-300 text-gray-600 dark:text-slate-400'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Catatan Progress</label>
                <textarea value={progressForm.keterangan_pencairan} onChange={e => setProgressForm({ ...progressForm, keterangan_pencairan: e.target.value })} rows={3}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowProgressModal(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Batal</button>
              <button onClick={handleUpdateProgress}
                className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20">Simpan Progress</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">{editItem ? 'Edit' : 'Tambah'} Kegiatan APBDesa</h3>
              <button onClick={() => { setShowModal(false); setEditItem(null); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Nama Kegiatan *</label>
                <input value={form.nama_kegiatan} onChange={e => setForm({ ...form, nama_kegiatan: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Kategori</label>
                  <select value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900">
                    {KATEGORI_OPTIONS.map(k => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Anggaran (Rp)</label>
                  <input type="number" value={form.anggaran} onChange={e => setForm({ ...form, anggaran: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Lokasi</label>
                <input value={form.lokasi} onChange={e => setForm({ ...form, lokasi: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Keterangan</label>
                <textarea value={form.keterangan_pencairan} onChange={e => setForm({ ...form, keterangan_pencairan: e.target.value })} rows={3}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => { setShowModal(false); setEditItem(null); }}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Batal</button>
              <button onClick={handleSave}
                className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {showFromRkp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Tarik dari RKPDesa</h3>
              <button onClick={() => { setShowFromRkp(false); setSelectedRkp([]); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <p className="text-sm text-gray-500">Pilih kegiatan RKPDesa tahun {currentYear} untuk dimasukkan ke APBDesa:</p>
              {rkpList.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Tidak ada kegiatan RKPDesa tahun ini</p>}
              {rkpList.map((r: any) => (
                <label key={r.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedRkp.includes(r.id) ? 'bg-emerald-50 border-emerald-300' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" className="mt-1 accent-emerald-600"
                    checked={selectedRkp.includes(r.id)}
                    onChange={e => setSelectedRkp(prev => e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id))} />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{r.kode_rkpdesa} — {r.nama_kegiatan}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.kategori} {r.lokasi ? `• ${r.lokasi}` : ''} • Anggaran {formatRp(r.anggaran || 0)}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => { setShowFromRkp(false); setSelectedRkp([]); }}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Batal</button>
              <button onClick={handleImportFromRkp} disabled={selectedRkp.length === 0}
                className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                Tarik {selectedRkp.length} Kegiatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
