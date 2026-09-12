import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, PlusCircle, Edit2, Trash2, ClipboardList, X, Link2,
  Download, Filter, CheckCircle2, Loader2, MapPin, ListChecks, Square
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

export interface RKPDesa {
  id: string;
  tenant_id: string;
  kode_rkpdesa: string;
  rpjmdesa_id?: string | null;
  nama_kegiatan: string;
  kategori: string;
  lokasi?: string | null;
  sumber_data: string;
  tahun: number;
  anggaran: number;
  skala_prioritas: number;
  keterangan?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  rpjmdesa_nama?: string;
}

const KATEGORI_OPTIONS = ['Infrastruktur', 'Ekonomi', 'Sosial/Kesehatan', 'Pemerintahan', 'Pemberdayaan'];
const STATUS_OPTIONS = ['Rencana', 'Berlangsung', 'Selesai', 'Dibatalkan'];
const PRIORITAS_OPTIONS = [1, 2, 3, 4, 5];

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

const statusColor = (s: string) => {
  switch (s) {
    case 'Rencana': return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'Berlangsung': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Selesai': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Dibatalkan': return 'bg-rose-100 text-rose-700 border-rose-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export default function AdminRKPDesa() {
  const currentYear = new Date().getFullYear();
  const [list, setList] = useState<RKPDesa[]>([]);
  const [rpjmList, setRpjmList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua Kategori');
  const [filterStatus, setFilterStatus] = useState('Semua Status');
  const [filterYear, setFilterYear] = useState('Semua Tahun');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<RKPDesa | null>(null);
  const [detailTarget, setDetailTarget] = useState<RKPDesa | null>(null);
  const [showFromRpjm, setShowFromRpjm] = useState(false);
  const [selectedRpjm, setSelectedRpjm] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rpjmSearch, setRpjmSearch] = useState('');
  const [importYear, setImportYear] = useState(currentYear);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMassEdit, setShowMassEdit] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [massEditForm, setMassEditForm] = useState({
    applyKategori: false, kategori: 'Infrastruktur',
    applyStatus: false, status: 'Rencana',
    applyTahun: false, tahun: currentYear,
    applyAnggaran: false, anggaran: 0,
    applyPrioritas: false, skala_prioritas: 3,
    applyLokasi: false, lokasi: '',
    applyKeterangan: false, keterangan: '',
  });

  const [form, setForm] = useState({
    nama_kegiatan: '', kategori: 'Infrastruktur', lokasi: '', tahun: currentYear,
    anggaran: 0, skala_prioritas: 3, keterangan: '', status: 'Rencana'
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) { setLoading(false); return; }

      const { data, error } = await supabase.from('rkpdesa').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
      if (error) { showToast('Gagal load RKPDesa: ' + error.message, 'error'); setLoading(false); return; }
      if (data) {
        const items = data as RKPDesa[];
        const rpjmIds = items.filter(i => i.rpjmdesa_id).map(i => i.rpjmdesa_id!);
        const rpjmMap = new Map<string, string>();
        for (let i = 0; i < rpjmIds.length; i += 100) {
          const chunk = rpjmIds.slice(i, i + 100);
          const { data: rpjmData } = await supabase.from('rpjmdesa').select('id, nama_program').in('id', chunk);
          (rpjmData || []).forEach((r: any) => rpjmMap.set(r.id, r.nama_program));
        }
        items.forEach(i => { i.rpjmdesa_nama = rpjmMap.get(i.rpjmdesa_id!) || null; });
        setList(items);
      }
      setLoading(false);
    } catch (err: any) {
      showToast('Error RKPDesa: ' + (err.message || err), 'error');
      setLoading(false);
    }
  };

  const generateKode = async (): Promise<string> => {
    const tenantId = await resolveCurrentTenant();
    const { data } = await supabase.from('rkpdesa').select('kode_rkpdesa').eq('tenant_id', tenantId).like('kode_rkpdesa', `RKP-${currentYear}-%`);
    const maxSeq = (data || []).reduce((max, row) => {
      const match = row.kode_rkpdesa.match(/RKP-\d{4}-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `RKP-${currentYear}-${String(maxSeq + 1).padStart(3, '0')}`;
  };

  const loadRpjm = async (year?: number) => {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;
    const targetYear = year || importYear;
    const { data } = await supabase.from('rpjmdesa').select('*').eq('tenant_id', tenantId).lte('tahun_awal', targetYear).gte('tahun_akhir', targetYear).in('status', ['Rencana', 'Berlangsung']);
    const { data: rkpData } = await supabase.from('rkpdesa').select('rpjmdesa_id').eq('tenant_id', tenantId).not('rpjmdesa_id', 'is', null);
    const linkedIds = new Set((rkpData || []).map((r: any) => r.rpjmdesa_id));
    const list = (data || []).map((r: any) => ({ ...r, _alreadyLinked: linkedIds.has(r.id) }));
    setRpjmList(list);
  };

  const handleSave = async () => {
    if (!form.nama_kegiatan.trim()) { showToast('Nama kegiatan wajib diisi', 'error'); return; }
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;

    const payload = {
      tenant_id: tenantId,
      kode_rkpdesa: editItem?.kode_rkpdesa || await generateKode(),
      rpjmdesa_id: editItem?.rpjmdesa_id || null,
      nama_kegiatan: form.nama_kegiatan,
      kategori: form.kategori,
      lokasi: form.lokasi || null,
      sumber_data: editItem?.sumber_data || 'manual',
      tahun: form.tahun,
      anggaran: form.anggaran,
      skala_prioritas: form.skala_prioritas,
      keterangan: form.keterangan || null,
      status: form.status,
      updated_at: new Date().toISOString()
    };

    if (editItem) {
      const { error } = await supabase.from('rkpdesa').update(payload).eq('id', editItem.id);
      if (error) { showToast('Gagal update: ' + error.message, 'error'); return; }
      showToast('Berhasil diperbarui', 'success');
    } else {
      const { error } = await supabase.from('rkpdesa').insert(payload);
      if (error) { showToast('Gagal simpan: ' + error.message, 'error'); return; }
      showToast('Berhasil ditambahkan', 'success');
    }
    setShowModal(false); setEditItem(null); resetForm(); loadData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus kegiatan RKPDesa ini?')) return;
    const { error } = await supabase.from('rkpdesa').delete().eq('id', id);
    if (error) { showToast('Gagal menghapus', 'error'); return; }
    showToast('Berhasil dihapus', 'success'); loadData();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Hapus ${selectedIds.length} kegiatan RKPDesa terpilih?`)) return;
    setBulkBusy(true);
    try {
      for (let i = 0; i < selectedIds.length; i += 100) {
        const chunk = selectedIds.slice(i, i + 100);
        const { error } = await supabase.from('rkpdesa').delete().in('id', chunk);
        if (error) throw error;
      }
      showToast(`${selectedIds.length} kegiatan berhasil dihapus.`, 'success');
      setSelectedIds([]);
      loadData();
    } catch (e: any) {
      showToast(e?.message || 'Gagal menghapus massal.', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleImportFromRpjm = async () => {
    if (selectedRpjm.length === 0) { showToast('Pilih minimal 1 program RPJMDesa', 'error'); return; }
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;

    // Batch kode
    const { data: lastData } = await supabase.from('rkpdesa').select('kode_rkpdesa').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1);
    let lastNum = 0;
    if (lastData && lastData.length > 0) {
      const match = lastData[0].kode_rkpdesa?.match(/(\d+)$/);
      if (match) lastNum = parseInt(match[1], 10);
    }

    const rows = selectedRpjm.map((rpjmId: string, idx: number) => {
      const r = rpjmList.find((x: any) => x.id === rpjmId);
      if (!r) return null;
      return {
        tenant_id: tenantId,
        kode_rkpdesa: `RKP-${importYear}-${String(lastNum + idx + 1).padStart(5, '0')}`,
        rpjmdesa_id: r.id,
        nama_kegiatan: r.nama_program,
        kategori: r.kategori,
        lokasi: r.lokasi || null,
        sumber_data: 'rpjmdesa',
        tahun: importYear,
        anggaran: r.anggaran_estimasi || 0,
        skala_prioritas: r.skala_prioritas || 3,
        keterangan: r.keterangan || null,
        status: 'Rencana'
      };
    }).filter(Boolean);

    if (rows.length === 0) { showToast('Tidak ada data valid', 'error'); return; }

    const { error } = await supabase.from('rkpdesa').insert(rows);
    if (error) { showToast(`Gagal menarik: ${error.message}`, 'error'); return; }

    // Update pipeline_status di usulan_desas (trace back via rpjmdesa.usulan_id)
    const rpjmIds = selectedRpjm.filter((id: string) => rpjmList.find((x: any) => x.id === id));
    const usulanIds: string[] = [];
    for (const rid of rpjmIds) {
      const r = rpjmList.find((x: any) => x.id === rid);
      if (r?.usulan_id) usulanIds.push(r.usulan_id);
    }
    if (usulanIds.length > 0) {
      const uniqueUsulanIds = [...new Set(usulanIds)];
      const BATCH = 100;
      for (let i = 0; i < uniqueUsulanIds.length; i += BATCH) {
        const chunk = uniqueUsulanIds.slice(i, i + BATCH);
        await supabase.from('usulan_desas').update({ pipeline_status: 'RKPDesa' }).in('id', chunk);
      }
    }

    showToast(`${rows.length} program berhasil ditarik ke RKPDesa`, 'success');
    setShowFromRpjm(false); setSelectedRpjm([]); setRpjmSearch(''); loadData();
  };

  const handleMassEdit = async () => {
    if (selectedIds.length === 0) return;
    const anyChecked = massEditForm.applyKategori || massEditForm.applyStatus || massEditForm.applyTahun ||
      massEditForm.applyAnggaran || massEditForm.applyPrioritas || massEditForm.applyLokasi || massEditForm.applyKeterangan;
    if (!anyChecked) { showToast('Centang minimal 1 field untuk diedit', 'error'); return; }

    const payload: any = {};
    if (massEditForm.applyKategori) payload.kategori = massEditForm.kategori;
    if (massEditForm.applyStatus) payload.status = massEditForm.status;
    if (massEditForm.applyTahun) payload.tahun = massEditForm.tahun;
    if (massEditForm.applyAnggaran) payload.anggaran = massEditForm.anggaran;
    if (massEditForm.applyPrioritas) payload.skala_prioritas = massEditForm.skala_prioritas;
    if (massEditForm.applyLokasi) payload.lokasi = massEditForm.lokasi;
    if (massEditForm.applyKeterangan) payload.keterangan = massEditForm.keterangan;

    const BATCH = 100;
    let okCount = 0;
    for (let i = 0; i < selectedIds.length; i += BATCH) {
      const chunk = selectedIds.slice(i, i + BATCH);
      const { error } = await supabase.from('rkpdesa').update(payload).in('id', chunk);
      if (error) { showToast(`Gagal di batch ${Math.floor(i / BATCH) + 1}: ${error.message}`, 'error'); break; }
      okCount += chunk.length;
    }
    if (okCount === selectedIds.length) {
      showToast(`${selectedIds.length} kegiatan berhasil diupdate`, 'success');
    } else {
      showToast(`${okCount} dari ${selectedIds.length} kegiatan diupdate`, 'success');
    }
    setSelectedIds([]); setShowMassEdit(false); loadData();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) { setSelectedIds([]); }
    else { setSelectedIds(filtered.map(r => r.id)); }
  };

  const resetForm = () => {
    setForm({ nama_kegiatan: '', kategori: 'Infrastruktur', lokasi: '', tahun: currentYear,
      anggaran: 0, skala_prioritas: 3, keterangan: '', status: 'Rencana' });
  };

  const filtered = useMemo(() => list.filter(r => {
    const matchSearch = r.nama_kegiatan.toLowerCase().includes(searchQuery.toLowerCase()) || r.kode_rkpdesa.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKat = filterKategori === 'Semua Kategori' || r.kategori === filterKategori;
    const matchSts = filterStatus === 'Semua Status' || r.status === filterStatus;
    const matchYear = filterYear === 'Semua Tahun' || r.tahun === Number(filterYear);
    return matchSearch && matchKat && matchSts && matchYear;
  }), [list, searchQuery, filterKategori, filterStatus, filterYear]);

  const metrics = useMemo(() => ({
    total: list.length,
    rencana: list.filter(r => r.status === 'Rencana').length,
    berlangsung: list.filter(r => r.status === 'Berlangsung').length,
    selesai: list.filter(r => r.status === 'Selesai').length,
    totalAnggaran: list.reduce((s, r) => s + (r.anggaran || 0), 0)
  }), [list]);

  const handleExport = () => {
    const rows = filtered.map(r => ({
      Kode: r.kode_rkpdesa, Kegiatan: r.nama_kegiatan, Kategori: r.kategori, Lokasi: r.lokasi || '',
      Tahun: r.tahun, Anggaran: r.anggaran, Prioritas: r.skala_prioritas, Status: r.status,
      'Sumber Data': r.sumber_data, Keterangan: r.keterangan || ''
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'RKPDesa');
    writeFile(wb, `RKPDesa_${currentYear}.xlsx`);
    showToast('Berhasil diexport', 'success');
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="pb-24 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-blue-600" />
          </div>
          <h1 className="text-lg font-black text-gray-900 dark:text-white">RKPDesa</h1>
          <div className="hidden md:flex items-center gap-2 ml-2">
            {[
              { label: 'Total', value: metrics.total, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Rencana', value: metrics.rencana, color: 'bg-gray-100 text-gray-600' },
              { label: 'Berlangsung', value: metrics.berlangsung, color: 'bg-blue-50 text-blue-700' },
              { label: 'Selesai', value: metrics.selesai, color: 'bg-emerald-100 text-emerald-800' },
            ].map((m, i) => (
              <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${m.color}`}>{m.label}: {m.value}</span>
            ))}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">{formatRp(metrics.totalAnggaran)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { loadRpjm(importYear); setShowFromRpjm(true); }}
            className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
            <Link2 size={14} /> Tarik dari RPJMDesa
          </button>
          <button onClick={() => { resetForm(); setEditItem(null); setShowModal(true); }}
            className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1.5">
            <PlusCircle size={14} /> Tambah Baru
          </button>
        </div>
      </div>

      <div className="sticky top-16 z-40 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari..."
              className="w-full pl-8 pr-8 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={12} />
              </button>
            )}
          </div>
          <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
            className="px-2.5 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
            <option value="Semua Kategori">Kategori</option>
            {KATEGORI_OPTIONS.map(k => <option key={k}>{k}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-2.5 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
            <option value="Semua Status">Status</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="px-2.5 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
            <option value="Semua Tahun">Tahun</option>
            {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleExport} className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1.5">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      <div className="standard-card overflow-hidden">
        <div className="w-full overflow-auto max-h-[calc(100vh-280px)] relative">
          <table className="w-full">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                <th className="py-3 px-4 text-left w-10">
                  <div className="flex flex-col items-center gap-1">
                    <button onClick={() => { setSelectMode(v => !v); if (selectMode) setSelectedIds([]); }}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${selectMode ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                      title={selectMode ? 'Nonaktifkan pilih' : 'Aktifkan pilih'}>
                      {selectMode ? <ListChecks size={14} /> : <Square size={14} />}
                    </button>
                    {selectMode && (
                    <input type="checkbox" className="accent-blue-600"
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onChange={toggleSelectAll} />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Kode</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Kegiatan</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Kategori</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Lokasi</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Anggaran</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Prioritas</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Status</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Sumber</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={10} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-sm text-gray-500 font-medium">Memuat data RKPDesa...</p>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-gray-500 font-medium">Belum ada data RKPDesa</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} onClick={() => setDetailTarget(r)} className={`cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${selectedIds.includes(r.id) ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                  <td className="py-3 px-4">
                    {selectMode && (
                    <input type="checkbox" className="accent-blue-600"
                      checked={selectedIds.includes(r.id)}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); setSelectedIds(prev => e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id)); }} />
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{r.kode_rkpdesa}</td>
                  <td className="py-3 px-4">
                    <p className="text-sm font-bold text-gray-900 dark:text-white max-w-[250px] truncate">{r.nama_kegiatan}</p>
                    {r.rpjmdesa_nama && <p className="text-[10px] text-purple-500 mt-0.5 flex items-center gap-1"><Link2 size={10} /> {r.rpjmdesa_nama}</p>}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${kategoriColor(r.kategori)}`}>{r.kategori}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap">{r.lokasi || '-'}</td>
                  <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white text-right whitespace-nowrap">{formatRp(r.anggaran)}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`w-1.5 h-4 rounded-sm ${i <= r.skala_prioritas ? 'bg-amber-400' : 'bg-gray-200 dark:bg-slate-700'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColor(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${r.sumber_data === 'rpjmdesa' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {r.sumber_data === 'rpjmdesa' ? <><Link2 size={10} className="mr-1" /> RPJMDesa</> : 'Manual'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => {
                        setEditItem(r);
                        setForm({ nama_kegiatan: r.nama_kegiatan, kategori: r.kategori, lokasi: r.lokasi || '',
                          tahun: r.tahun, anggaran: r.anggaran, skala_prioritas: r.skala_prioritas,
                          keterangan: r.keterangan || '', status: r.status });
                        setShowModal(true);
                      }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-rose-50 rounded-lg text-gray-500 hover:text-rose-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9990] w-[95vw] max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap justify-center rounded-2xl bg-slate-900/95 dark:bg-black/90 backdrop-blur border border-white/10 shadow-2xl px-4 py-3">
            <span className="text-sm font-black text-white whitespace-nowrap">{selectedIds.length} Kegiatan Terpilih</span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Hapus Massal ({selectedIds.length})
            </button>
            <button
              onClick={() => setShowMassEdit(true)}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Edit Massal ({selectedIds.length})
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-2 rounded-xl text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
              title="Batalkan pilihan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {detailTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Detail Kegiatan RKPDesa</h3>
              <button onClick={() => setDetailTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Kode</p>
                <p className="text-sm font-mono font-black text-blue-700 dark:text-blue-300 mt-1">{detailTarget.kode_rkpdesa}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nama Kegiatan</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{detailTarget.nama_kegiatan}</p>
              </div>
              {detailTarget.rpjmdesa_nama && (
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Sumber RPJMDesa</p>
                  <p className="text-sm text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1"><Link2 size={12} /> {detailTarget.rpjmdesa_nama}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Kategori</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mt-1 ${kategoriColor(detailTarget.kategori)}`}>{detailTarget.kategori}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mt-1 ${statusColor(detailTarget.status)}`}>{detailTarget.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Lokasi</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 flex items-center gap-1"><MapPin size={12} /> {detailTarget.lokasi || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tahun</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{detailTarget.tahun}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Anggaran</p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-1">{formatRp(detailTarget.anggaran)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Skala Prioritas</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm font-black text-amber-600">{detailTarget.skala_prioritas}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`w-2 h-5 rounded-sm ${i <= detailTarget.skala_prioritas ? 'bg-amber-400' : 'bg-gray-200 dark:bg-slate-700'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Sumber Data</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mt-1 ${detailTarget.sumber_data === 'rpjmdesa' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {detailTarget.sumber_data === 'rpjmdesa' ? <><Link2 size={10} className="mr-1" /> RPJMDesa</> : 'Manual'}
                </span>
              </div>
              {detailTarget.keterangan && (
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Keterangan</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 bg-gray-50 dark:bg-slate-800 rounded-lg p-3">{detailTarget.keterangan}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
              <button onClick={() => setDetailTarget(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">Tutup</button>
              <button onClick={() => {
                setEditItem(detailTarget);
                setForm({ nama_kegiatan: detailTarget.nama_kegiatan, kategori: detailTarget.kategori, lokasi: detailTarget.lokasi || '',
                  tahun: detailTarget.tahun, anggaran: detailTarget.anggaran, skala_prioritas: detailTarget.skala_prioritas,
                  keterangan: detailTarget.keterangan || '', status: detailTarget.status });
                setDetailTarget(null);
                setShowModal(true);
              }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer">
                <Edit2 size={14} /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">{editItem ? 'Edit' : 'Tambah'} Kegiatan RKPDesa</h3>
              <button onClick={() => { setShowModal(false); setEditItem(null); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Nama Kegiatan *</label>
                <input value={form.nama_kegiatan} onChange={e => setForm({ ...form, nama_kegiatan: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
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
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900">
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Lokasi</label>
                <input value={form.lokasi} onChange={e => setForm({ ...form, lokasi: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Anggaran (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Rp</span>
                  <input type="text" inputMode="numeric" value={form.anggaran === 0 ? '' : form.anggaran.toLocaleString('id-ID')}
                    onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setForm({ ...form, anggaran: raw ? parseInt(raw, 10) : 0 }); }}
                    placeholder="0"
                    className="w-full pl-10 pr-4 border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Skala Prioritas</label>
                <div className="flex gap-2">
                  {PRIORITAS_OPTIONS.map(p => (
                    <button key={p} onClick={() => setForm({ ...form, skala_prioritas: p })}
                      className={`w-10 h-10 rounded-xl text-sm font-bold border-2 transition-colors ${form.skala_prioritas === p ? 'bg-amber-400 border-amber-500 text-white' : 'border-gray-200 dark:border-slate-700 hover:border-amber-300'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Keterangan</label>
                <textarea value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} rows={3}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 resize-none focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => { setShowModal(false); setEditItem(null); }}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Batal</button>
              <button onClick={handleSave}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-600/20">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {showFromRpjm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Tarik dari RPJMDesa</h3>
              <button onClick={() => { setShowFromRpjm(false); setSelectedRpjm([]); setRpjmSearch(''); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tahun Target RKPDesa</label>
                <select value={importYear} onChange={e => { const y = Number(e.target.value); setImportYear(y); loadRpjm(y); setSelectedRpjm([]); }}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-900">
                  {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <p className="text-sm text-gray-500">Pilih program RPJMDesa yang mencakup tahun <strong>{importYear}</strong> untuk ditarik ke RKPDesa:</p>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={rpjmSearch} onChange={e => setRpjmSearch(e.target.value)} placeholder="Cari kode, nama program, atau kategori..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              {(() => {
                const filteredRpjm = rpjmList.filter((r: any) => {
                  const q = rpjmSearch.toLowerCase();
                  return !q || r.kode_rpjmdesa?.toLowerCase().includes(q) || r.nama_program?.toLowerCase().includes(q) || r.kategori?.toLowerCase().includes(q);
                });
                const belumLinked = filteredRpjm.filter((r: any) => !r._alreadyLinked);
                const sudahLinked = filteredRpjm.filter((r: any) => r._alreadyLinked);
                return (
                  <>
                    {belumLinked.length === 0 && sudahLinked.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Tidak ada program ditemukan</p>}
                    {belumLinked.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Belum Ditarik ({belumLinked.length})</p>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" className="accent-blue-600"
                              checked={belumLinked.every((r: any) => selectedRpjm.includes(r.id))}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedRpjm(prev => [...new Set([...prev, ...belumLinked.map((r: any) => r.id)])]);
                                } else {
                                  const ids = new Set(belumLinked.map((r: any) => r.id));
                                  setSelectedRpjm(prev => prev.filter(id => !ids.has(id)));
                                }
                              }} />
                            <span className="text-[10px] font-bold text-blue-600">Tandai Semua</span>
                          </label>
                        </div>
                        {belumLinked.map((r: any) => (
                          <label key={r.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedRpjm.includes(r.id) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}>
                            <input type="checkbox" className="mt-1 accent-blue-600"
                              checked={selectedRpjm.includes(r.id)}
                              onChange={e => setSelectedRpjm(prev => e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id))} />
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{r.kode_rpjmdesa} — {r.nama_program}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{r.kategori} {r.lokasi ? `• ${r.lokasi}` : ''} • Est. {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(r.anggaran_estimasi || 0)}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                    {sudahLinked.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sudah Ditarik ({sudahLinked.length})</p>
                        {sudahLinked.map((r: any) => (
                          <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 opacity-60">
                            <CheckCircle2 size={16} className="mt-0.5 text-emerald-500 shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-gray-500 truncate">{r.kode_rpjmdesa} — {r.nama_program}</p>
                              <p className="text-xs text-gray-400 mt-0.5">Sudah di RKPDesa</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => { setShowFromRpjm(false); setSelectedRpjm([]); setRpjmSearch(''); }}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Batal</button>
              <button onClick={handleImportFromRpjm} disabled={selectedRpjm.length === 0}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                Tarik {selectedRpjm.length} Program
              </button>
            </div>
          </div>
        </div>
      )}

      {showMassEdit && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Edit Massal</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedIds.length} kegiatan terpilih</p>
              </div>
              <button onClick={() => setShowMassEdit(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">Centang field yang ingin diubah, lalu isi nilai barunya:</p>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50">
                <input type="checkbox" className="accent-amber-500" checked={massEditForm.applyKategori} onChange={e => setMassEditForm({ ...massEditForm, applyKategori: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 w-24">Kategori</label>
                <select value={massEditForm.kategori} onChange={e => setMassEditForm({ ...massEditForm, kategori: e.target.value })} disabled={!massEditForm.applyKategori}
                  className="flex-1 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40">
                  {KATEGORI_OPTIONS.map(k => <option key={k}>{k}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50">
                <input type="checkbox" className="accent-amber-500" checked={massEditForm.applyStatus} onChange={e => setMassEditForm({ ...massEditForm, applyStatus: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 w-24">Status</label>
                <select value={massEditForm.status} onChange={e => setMassEditForm({ ...massEditForm, status: e.target.value })} disabled={!massEditForm.applyStatus}
                  className="flex-1 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40">
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50">
                <input type="checkbox" className="accent-amber-500" checked={massEditForm.applyTahun} onChange={e => setMassEditForm({ ...massEditForm, applyTahun: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 w-24">Tahun</label>
                <input type="number" value={massEditForm.tahun} onChange={e => setMassEditForm({ ...massEditForm, tahun: +e.target.value })} disabled={!massEditForm.applyTahun}
                  className="flex-1 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40" />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50">
                <input type="checkbox" className="accent-amber-500" checked={massEditForm.applyAnggaran} onChange={e => setMassEditForm({ ...massEditForm, applyAnggaran: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 w-24">Anggaran</label>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Rp</span>
                  <input type="text" inputMode="numeric" value={massEditForm.anggaran === 0 ? '' : massEditForm.anggaran.toLocaleString('id-ID')}
                    onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setMassEditForm({ ...massEditForm, anggaran: raw ? parseInt(raw, 10) : 0 }); }}
                    disabled={!massEditForm.applyAnggaran} placeholder="0"
                    className="w-full pl-8 pr-4 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40" />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50">
                <input type="checkbox" className="accent-amber-500" checked={massEditForm.applyPrioritas} onChange={e => setMassEditForm({ ...massEditForm, applyPrioritas: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 w-24">Prioritas</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} type="button" disabled={!massEditForm.applyPrioritas}
                      onClick={() => setMassEditForm({ ...massEditForm, skala_prioritas: i })}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 ${massEditForm.skala_prioritas === i ? 'bg-amber-400 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 hover:bg-gray-200'}`}>{i}</button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50">
                <input type="checkbox" className="accent-amber-500" checked={massEditForm.applyLokasi} onChange={e => setMassEditForm({ ...massEditForm, applyLokasi: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 w-24">Lokasi</label>
                <input value={massEditForm.lokasi} onChange={e => setMassEditForm({ ...massEditForm, lokasi: e.target.value })} disabled={!massEditForm.applyLokasi}
                  className="flex-1 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40" />
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50">
                <input type="checkbox" className="accent-amber-500 mt-1" checked={massEditForm.applyKeterangan} onChange={e => setMassEditForm({ ...massEditForm, applyKeterangan: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 w-24">Keterangan</label>
                <textarea value={massEditForm.keterangan} onChange={e => setMassEditForm({ ...massEditForm, keterangan: e.target.value })} disabled={!massEditForm.applyKeterangan} rows={2}
                  className="flex-1 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40 resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowMassEdit(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Batal</button>
              <button onClick={handleMassEdit} className="px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600">
                Simpan ke {selectedIds.length} Kegiatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
