import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, PlusCircle, Edit2, Trash2, Target, AlertTriangle, X, Loader2,
  MapPin, Link2, CheckCircle2, Ban, Printer, Download, Eye, Star, Filter
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

export interface RPJMDesa {
  id: string;
  tenant_id: string;
  kode_rpjmdesa: string;
  nama_program: string;
  kategori: string;
  lokasi?: string | null;
  sumber_data: string;
  usulan_id?: string | null;
  tahun_awal: number;
  tahun_akhir: number;
  anggaran_estimasi: number;
  skala_prioritas: number;
  keterangan?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
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

export default function AdminRPJMDesa() {
  const [list, setList] = useState<RPJMDesa[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterYear, setFilterYear] = useState('Semua');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<RPJMDesa | null>(null);
  const [detailTarget, setDetailTarget] = useState<RPJMDesa | null>(null);
  const [showFromUsulan, setShowFromUsulan] = useState(false);
  const [usulanList, setUsulanList] = useState<any[]>([]);
  const [selectedUsulan, setSelectedUsulan] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMassEdit, setShowMassEdit] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [massEditForm, setMassEditForm] = useState({
    applyKategori: false, kategori: 'Infrastruktur',
    applyStatus: false, status: 'Rencana',
    applyTahun: false, tahun_awal: new Date().getFullYear(), tahun_akhir: new Date().getFullYear() + 4,
    applyAnggaran: false, anggaran_estimasi: 0,
    applyPrioritas: false, skala_prioritas: 3,
    applyLokasi: false, lokasi: '',
    applyKeterangan: false, keterangan: '',
  });

  const [form, setForm] = useState({
    nama_program: '', kategori: 'Infrastruktur', lokasi: '', tahun_awal: new Date().getFullYear(),
    tahun_akhir: new Date().getFullYear() + 4, anggaran_estimasi: 0, skala_prioritas: 3,
    keterangan: '', status: 'Rencana'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) { setLoading(false); return; }

    const { data } = await supabase.from('rpjmdesa').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (data) setList(data as RPJMDesa[]);
    setLoading(false);
  };

  const generateKode = async (): Promise<string> => {
    const tenantId = await resolveCurrentTenant();
    const year = new Date().getFullYear();
    const { data } = await supabase.from('rpjmdesa').select('kode_rpjmdesa').eq('tenant_id', tenantId).like('kode_rpjmdesa', `RPJM-${year}-%`);
    const maxSeq = (data || []).reduce((max, row) => {
      const match = row.kode_rpjmdesa.match(/RPJM-\d{4}-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `RPJM-${year}-${String(maxSeq + 1).padStart(3, '0')}`;
  };

  const [usulanSearch, setUsulanSearch] = useState('');
  const [usulanStatusFilter, setUsulanStatusFilter] = useState('Semua');

  const loadUsulan = async () => {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;
    // Ambil SEMUA usulan (semua status) — RPJMDesa bisa menarik semua aspirasi
    const { data } = await supabase.from('usulan_desas').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    // Tandai mana yang sudah ditarik ke RPJMDesa
    const { data: rpjmData } = await supabase.from('rpjmdesa').select('usulan_id').eq('tenant_id', tenantId).not('usulan_id', 'is', null);
    const linkedIds = new Set((rpjmData || []).map((r: any) => r.usulan_id));
    const list = (data || []).map((u: any) => ({ ...u, _alreadyLinked: linkedIds.has(u.id) }));
    setUsulanList(list);
  };

  const handleSave = async () => {
    if (!form.nama_program.trim()) { showToast('Nama program wajib diisi', 'error'); return; }
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;

    const payload = {
      tenant_id: tenantId,
      kode_rpjmdesa: editItem?.kode_rpjmdesa || await generateKode(),
      nama_program: form.nama_program,
      kategori: form.kategori,
      lokasi: form.lokasi || null,
      sumber_data: editItem?.sumber_data || 'manual',
      usulan_id: editItem?.usulan_id || null,
      tahun_awal: form.tahun_awal,
      tahun_akhir: form.tahun_akhir,
      anggaran_estimasi: form.anggaran_estimasi,
      skala_prioritas: form.skala_prioritas,
      keterangan: form.keterangan || null,
      status: form.status,
      updated_at: new Date().toISOString()
    };

    if (editItem) {
      const { error } = await supabase.from('rpjmdesa').update(payload).eq('id', editItem.id);
      if (error) { showToast('Gagal update: ' + error.message, 'error'); return; }
      showToast('Berhasil diperbarui', 'success');
    } else {
      const { error } = await supabase.from('rpjmdesa').insert(payload);
      if (error) { showToast('Gagal simpan: ' + error.message, 'error'); return; }
      showToast('Berhasil ditambahkan', 'success');
    }

    setShowModal(false);
    setEditItem(null);
    resetForm();
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus program RPJMDesa ini?')) return;
    const { error } = await supabase.from('rpjmdesa').delete().eq('id', id);
    if (error) { showToast('Gagal menghapus', 'error'); return; }
    showToast('Berhasil dihapus', 'success');
    loadData();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Hapus ${selectedIds.length} program RPJMDesa terpilih?`)) return;
    setBulkBusy(true);
    try {
      for (let i = 0; i < selectedIds.length; i += 100) {
        const chunk = selectedIds.slice(i, i + 100);
        const { error } = await supabase.from('rpjmdesa').delete().in('id', chunk);
        if (error) throw error;
      }
      showToast(`${selectedIds.length} program berhasil dihapus.`, 'success');
      setSelectedIds([]);
      loadData();
    } catch (e: any) {
      showToast(e?.message || 'Gagal menghapus massal.', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleMassEdit = async () => {
    if (selectedIds.length === 0) return;
    const anyChecked = massEditForm.applyKategori || massEditForm.applyStatus || massEditForm.applyTahun ||
      massEditForm.applyAnggaran || massEditForm.applyPrioritas || massEditForm.applyLokasi || massEditForm.applyKeterangan;
    if (!anyChecked) { showToast('Centang minimal 1 field untuk diedit', 'error'); return; }

    const payload: any = {};
    if (massEditForm.applyKategori) payload.kategori = massEditForm.kategori;
    if (massEditForm.applyStatus) payload.status = massEditForm.status;
    if (massEditForm.applyTahun) { payload.tahun_awal = massEditForm.tahun_awal; payload.tahun_akhir = massEditForm.tahun_akhir; }
    if (massEditForm.applyAnggaran) payload.anggaran_estimasi = massEditForm.anggaran_estimasi;
    if (massEditForm.applyPrioritas) payload.skala_prioritas = massEditForm.skala_prioritas;
    if (massEditForm.applyLokasi) payload.lokasi = massEditForm.lokasi;
    if (massEditForm.applyKeterangan) payload.keterangan = massEditForm.keterangan;

    // Batch update per 100 item untuk hindari Supabase limit
    const BATCH = 100;
    let okCount = 0;
    for (let i = 0; i < selectedIds.length; i += BATCH) {
      const chunk = selectedIds.slice(i, i + BATCH);
      const { error } = await supabase.from('rpjmdesa').update(payload).in('id', chunk);
      if (error) {
        showToast(`Gagal di batch ${Math.floor(i / BATCH) + 1}: ${error.message}`, 'error');
        break;
      }
      okCount += chunk.length;
    }
    if (okCount === selectedIds.length) {
      showToast(`${selectedIds.length} program berhasil diupdate`, 'success');
    } else {
      showToast(`${okCount} dari ${selectedIds.length} program diupdate`, 'success');
    }
    setSelectedIds([]);
    setShowMassEdit(false);
    loadData();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(r => r.id));
    }
  };

  const handleImportFromUsulan = async () => {
    if (selectedUsulan.length === 0) { showToast('Pilih minimal 1 usulan', 'error'); return; }
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;

    // Ambil kode terakhir sekali saja
    const { data: lastData } = await supabase.from('rpjmdesa').select('kode_rpjmdesa').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1);
    let lastNum = 0;
    if (lastData && lastData.length > 0) {
      const match = lastData[0].kode_rpjmdesa?.match(/(\d+)$/);
      if (match) lastNum = parseInt(match[1], 10);
    }

    const rows = selectedUsulan.map((usulanId: string, idx: number) => {
      const u = usulanList.find((x: any) => x.id === usulanId);
      if (!u) return null;
      return {
        tenant_id: tenantId,
        kode_rpjmdesa: `RPJM-${new Date().getFullYear()}-${String(lastNum + idx + 1).padStart(5, '0')}`,
        nama_program: u.uraian_usulan,
        kategori: u.kategori,
        lokasi: u.lokasi_rt_rw || null,
        sumber_data: 'usulan',
        usulan_id: u.id,
        tahun_awal: form.tahun_awal,
        tahun_akhir: form.tahun_akhir,
        anggaran_estimasi: u.anggaran || 0,
        skala_prioritas: u.skala_prioritas || 3,
        keterangan: u.keterangan || null,
        status: 'Rencana'
      };
    }).filter(Boolean);

    if (rows.length === 0) { showToast('Tidak ada usulan valid', 'error'); return; }

    // Batch insert langsung
    const { error } = await supabase.from('rpjmdesa').insert(rows);
    if (error) {
      showToast(`Gagal menarik usulan: ${error.message}`, 'error');
      return;
    }

    // Update tag di usulan_desas
    const usulanIds = selectedUsulan.filter((id: string) => usulanList.find((u: any) => u.id === id));
    for (const uid of usulanIds) {
      const u = usulanList.find((x: any) => x.id === uid);
      if (!u) continue;
      const tags = [...(u.diteruskan_tags || []), `RPJMDes ${new Date().getFullYear()}`];
      await supabase.from('usulan_desas').update({
        diteruskan_tags: tags,
        pipeline_status: 'RPJMDesa'
      }).eq('id', u.id);
    }

    showToast(`${rows.length} usulan berhasil ditarik ke RPJMDesa`, 'success');
    setShowFromUsulan(false);
    setSelectedUsulan([]);
    setUsulanSearch('');
    setUsulanStatusFilter('Semua');
    loadData();
  };

  const resetForm = () => {
    setForm({ nama_program: '', kategori: 'Infrastruktur', lokasi: '', tahun_awal: new Date().getFullYear(),
      tahun_akhir: new Date().getFullYear() + 4, anggaran_estimasi: 0, skala_prioritas: 3, keterangan: '', status: 'Rencana' });
  };

  const filtered = useMemo(() => list.filter(r => {
    const matchSearch = r.nama_program.toLowerCase().includes(searchQuery.toLowerCase()) || r.kode_rpjmdesa.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKat = filterKategori === 'Semua' || r.kategori === filterKategori;
    const matchSts = filterStatus === 'Semua' || r.status === filterStatus;
    const matchYear = filterYear === 'Semua' || (Number(filterYear) >= r.tahun_awal && Number(filterYear) <= r.tahun_akhir);
    return matchSearch && matchKat && matchSts && matchYear;
  }), [list, searchQuery, filterKategori, filterStatus, filterYear]);

  const metrics = useMemo(() => ({
    total: list.length,
    rencana: list.filter(r => r.status === 'Rencana').length,
    berlangsung: list.filter(r => r.status === 'Berlangsung').length,
    selesai: list.filter(r => r.status === 'Selesai').length,
    totalAnggaran: list.reduce((s, r) => s + (r.anggaran_estimasi || 0), 0)
  }), [list]);

  const handleExport = () => {
    const rows = filtered.map(r => ({
      Kode: r.kode_rpjmdesa, 'Nama Program': r.nama_program, Kategori: r.kategori, Lokasi: r.lokasi || '',
      'Tahun': `${r.tahun_awal}-${r.tahun_akhir}`, 'Estimasi Anggaran': r.anggaran_estimasi,
      Prioritas: r.skala_prioritas, Status: r.status, Keterangan: r.keterangan || ''
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'RPJMDesa');
    writeFile(wb, `RPJMDesa_${new Date().getFullYear()}.xlsx`);
    showToast('Berhasil diexport', 'success');
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="pb-24 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
            <Target className="w-4 h-4 text-purple-600" />
          </div>
          <h1 className="text-lg font-black text-gray-900 dark:text-white">RPJMDesa</h1>
          <div className="hidden md:flex items-center gap-2 ml-2">
            {[
              { label: 'Total', value: metrics.total, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Rencana', value: metrics.rencana, color: 'bg-gray-100 text-gray-600' },
              { label: 'Berlangsung', value: metrics.berlangsung, color: 'bg-blue-50 text-blue-700' },
              { label: 'Selesai', value: metrics.selesai, color: 'bg-emerald-100 text-emerald-800' },
            ].map((m, i) => (
              <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${m.color}`}>{m.label}: {m.value}</span>
            ))}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700">{formatRp(metrics.totalAnggaran)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { loadUsulan(); setShowFromUsulan(true); }}
            className="px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 flex items-center gap-1.5">
            <Link2 size={14} /> Tarik dari Usulan
          </button>
          <button onClick={() => { resetForm(); setEditItem(null); setShowModal(true); }}
            className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1.5">
            <PlusCircle size={14} /> Tambah Baru
          </button>
        </div>
      </div>

      <div className="sticky top-16 z-40 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-4 py-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari program..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 outline-none" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>
          <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-900">
            <option>Semua</option>
            {KATEGORI_OPTIONS.map(k => <option key={k}>{k}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-900">
            <option>Semua</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-900">
            <option>Semua</option>
            {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleExport} className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="standard-card overflow-hidden">
        <div className="w-full overflow-auto max-h-[calc(100vh-280px)] relative">
          <table className="w-full">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                <th className="py-3 px-4 text-left w-10">
                  <input type="checkbox" className="accent-purple-600"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={toggleSelectAll} />
                </th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 text-left">Kode</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 text-left">Nama Program</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 text-left">Kategori</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 text-left">Lokasi</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 text-left">Tahun</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 text-right">Anggaran</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 text-center">Prioritas</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 text-center">Status</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 text-center">Sumber</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => (
                <tr key={r.id} onClick={() => setDetailTarget(r)} className={`cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${selectedIds.includes(r.id) ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''}`}>
                  <td className="py-3 px-4">
                    <input type="checkbox" className="accent-purple-600"
                      checked={selectedIds.includes(r.id)}
                      onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id))} />
                  </td>
                  <td className="py-3 px-4 text-xs font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">{r.kode_rpjmdesa}</td>
                  <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white max-w-[250px] truncate">{r.nama_program}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${kategoriColor(r.kategori)}`}>{r.kategori}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap">{r.lokasi || '-'}</td>
                  <td className="py-3 px-4 text-xs font-bold text-gray-700 dark:text-slate-300 whitespace-nowrap">{r.tahun_awal}-{r.tahun_akhir}</td>
                  <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white text-right whitespace-nowrap">{formatRp(r.anggaran_estimasi)}</td>
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
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${r.sumber_data === 'usulan' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {r.sumber_data === 'usulan' ? <><Link2 size={10} className="mr-1" /> Usulan</> : 'Manual'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => {
                        setEditItem(r);
                        setForm({ nama_program: r.nama_program, kategori: r.kategori, lokasi: r.lokasi || '',
                          tahun_awal: r.tahun_awal, tahun_akhir: r.tahun_akhir, anggaran_estimasi: r.anggaran_estimasi,
                          skala_prioritas: r.skala_prioritas, keterangan: r.keterangan || '', status: r.status });
                        setShowModal(true);
                      }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-500 hover:text-blue-600">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors text-gray-500 hover:text-rose-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="py-12 text-center text-gray-500 font-medium">Belum ada data RPJMDesa</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9990] w-[95vw] max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap justify-center rounded-2xl bg-slate-900/95 dark:bg-black/90 backdrop-blur border border-white/10 shadow-2xl px-4 py-3">
            <span className="text-sm font-black text-white whitespace-nowrap">{selectedIds.length} Program Terpilih</span>
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
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Detail Program RPJMDesa</h3>
              <button onClick={() => setDetailTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4">
                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Kode</p>
                <p className="text-sm font-mono font-black text-purple-700 dark:text-purple-300 mt-1">{detailTarget.kode_rpjmdesa}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nama Program</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{detailTarget.nama_program}</p>
              </div>
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
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{detailTarget.tahun_awal} - {detailTarget.tahun_akhir}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Anggaran Estimasi</p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-1">{formatRp(detailTarget.anggaran_estimasi)}</p>
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
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mt-1 ${detailTarget.sumber_data === 'usulan' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {detailTarget.sumber_data === 'usulan' ? <><Link2 size={10} className="mr-1" /> Usulan</> : 'Manual'}
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
                setForm({ nama_program: detailTarget.nama_program, kategori: detailTarget.kategori, lokasi: detailTarget.lokasi || '',
                  tahun_awal: detailTarget.tahun_awal, tahun_akhir: detailTarget.tahun_akhir, anggaran_estimasi: detailTarget.anggaran_estimasi,
                  skala_prioritas: detailTarget.skala_prioritas, keterangan: detailTarget.keterangan || '', status: detailTarget.status });
                setDetailTarget(null);
                setShowModal(true);
              }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white bg-purple-600 hover:bg-purple-700 transition-colors cursor-pointer">
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
              <h3 className="text-lg font-black text-gray-900 dark:text-white">{editItem ? 'Edit' : 'Tambah'} Program RPJMDesa</h3>
              <button onClick={() => { setShowModal(false); setEditItem(null); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Nama Program *</label>
                <input value={form.nama_program} onChange={e => setForm({ ...form, nama_program: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 outline-none" />
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
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Tahun Awal</label>
                  <input type="number" value={form.tahun_awal} onChange={e => setForm({ ...form, tahun_awal: parseInt(e.target.value) || new Date().getFullYear() })}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Tahun Akhir</label>
                  <input type="number" value={form.tahun_akhir} onChange={e => setForm({ ...form, tahun_akhir: parseInt(e.target.value) || new Date().getFullYear() + 4 })}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Estimasi Anggaran (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Rp</span>
                  <input type="text" inputMode="numeric" value={form.anggaran_estimasi === 0 ? '' : form.anggaran_estimasi.toLocaleString('id-ID')}
                    onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setForm({ ...form, anggaran_estimasi: raw ? parseInt(raw, 10) : 0 }); }}
                    placeholder="0"
                    className="w-full pl-10 pr-4 border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 outline-none" />
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
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 resize-none focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => { setShowModal(false); setEditItem(null); }}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Batal</button>
              <button onClick={handleSave}
                className="px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 shadow-md shadow-purple-600/20">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {showFromUsulan && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Tarik dari Usulan Desa</h3>
              <button onClick={() => { setShowFromUsulan(false); setSelectedUsulan([]); setUsulanSearch(''); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3 flex-1 overflow-y-auto">
              <p className="text-sm text-gray-500">Semua usulan bisa ditarik ke RPJMDesa. Centang yang ingin dimasukkan:</p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={usulanSearch} onChange={e => setUsulanSearch(e.target.value)} placeholder="Cari kode, nama usulan, atau kategori..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <select value={usulanStatusFilter} onChange={e => setUsulanStatusFilter(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-900">
                  <option value="Semua">Semua Status</option>
                  <option value="Belum">Belum Dianggarkan</option>
                  <option value="Desa">Terakomodir Desa</option>
                  <option value="Kab">Terakomodir Kab</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>
              {(() => {
                const usulanStatusColor = (s: string) => {
                  if (s === 'Belum') return 'bg-amber-50 text-amber-700 border-amber-200';
                  if (s === 'Ditolak') return 'bg-gray-100 text-gray-500 border-gray-200';
                  if (s?.startsWith('Desa')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (s?.startsWith('Kab')) return 'bg-blue-50 text-blue-700 border-blue-200';
                  return 'bg-gray-100 text-gray-600 border-gray-200';
                };
                const filtered = usulanList.filter((u: any) => {
                  const q = usulanSearch.toLowerCase();
                  const matchSearch = !q || u.kode_usulan?.toLowerCase().includes(q) || u.uraian_usulan?.toLowerCase().includes(q) || u.kategori?.toLowerCase().includes(q);
                  const matchStatus = usulanStatusFilter === 'Semua' ||
                    (usulanStatusFilter === 'Desa' && u.status_terakomodir?.startsWith('Desa')) ||
                    (usulanStatusFilter === 'Kab' && u.status_terakomodir?.startsWith('Kab')) ||
                    (usulanStatusFilter === 'Belum' && u.status_terakomodir === 'Belum') ||
                    (usulanStatusFilter === 'Ditolak' && u.status_terakomodir === 'Ditolak');
                  return matchSearch && matchStatus;
                });
                const belumLinked = filtered.filter((u: any) => !u._alreadyLinked);
                const sudahLinked = filtered.filter((u: any) => u._alreadyLinked);
                return (
                  <>
                    {belumLinked.length === 0 && sudahLinked.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Tidak ada usulan ditemukan</p>}
                    {belumLinked.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-widest text-purple-600">Belum Ditarik ({belumLinked.length})</p>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" className="accent-purple-600"
                              checked={belumLinked.every((u: any) => selectedUsulan.includes(u.id))}
                              onChange={e => {
                                const ids = belumLinked.map((u: any) => u.id);
                                if (e.target.checked) {
                                  setSelectedUsulan(prev => [...new Set([...prev, ...ids])]);
                                } else {
                                  setSelectedUsulan(prev => prev.filter(id => !ids.includes(id)));
                                }
                              }} />
                            <span className="text-[10px] font-bold text-purple-600">Centang Semua</span>
                          </label>
                        </div>
                        {belumLinked.map((u: any) => (
                          <label key={u.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedUsulan.includes(u.id) ? 'bg-purple-50 border-purple-300 dark:bg-purple-950/30' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                            <input type="checkbox" className="mt-1 accent-purple-600"
                              checked={selectedUsulan.includes(u.id)}
                              onChange={e => setSelectedUsulan(prev => e.target.checked ? [...prev, u.id] : prev.filter(x => x !== u.id))} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{u.kode_usulan} — {u.uraian_usulan}</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap ${usulanStatusColor(u.status_terakomodir)}`}>{u.status_terakomodir}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{u.kategori} {u.lokasi_rt_rw ? `• ${u.lokasi_rt_rw}` : ''}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                    {sudahLinked.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sudah Ditarik ({sudahLinked.length})</p>
                        {sudahLinked.map((u: any) => (
                          <div key={u.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 opacity-60">
                            <CheckCircle2 size={16} className="mt-0.5 text-emerald-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-gray-500 dark:text-slate-400 truncate">{u.kode_usulan} — {u.uraian_usulan}</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap ${usulanStatusColor(u.status_terakomodir)}`}>{u.status_terakomodir}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{u.kategori} • Sudah di RPJMDesa</p>
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
              <button onClick={() => { setShowFromUsulan(false); setSelectedUsulan([]); setUsulanSearch(''); }}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Batal</button>
              <button onClick={handleImportFromUsulan} disabled={selectedUsulan.length === 0}
                className="px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50">
                Tarik {selectedUsulan.length} Usulan
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
                <p className="text-xs text-gray-500 mt-0.5">{selectedIds.length} program terpilih</p>
              </div>
              <button onClick={() => setShowMassEdit(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">Centang field yang ingin diubah, lalu isi nilai barunya:</p>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                <input type="checkbox" className="accent-amber-500" checked={massEditForm.applyKategori} onChange={e => setMassEditForm({ ...massEditForm, applyKategori: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 w-24">Kategori</label>
                <select value={massEditForm.kategori} onChange={e => setMassEditForm({ ...massEditForm, kategori: e.target.value })} disabled={!massEditForm.applyKategori}
                  className="flex-1 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40">
                  {KATEGORI_OPTIONS.map(k => <option key={k}>{k}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                <input type="checkbox" className="accent-amber-500" checked={massEditForm.applyStatus} onChange={e => setMassEditForm({ ...massEditForm, applyStatus: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 w-24">Status</label>
                <select value={massEditForm.status} onChange={e => setMassEditForm({ ...massEditForm, status: e.target.value })} disabled={!massEditForm.applyStatus}
                  className="flex-1 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40">
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                <input type="checkbox" className="accent-amber-500" checked={massEditForm.applyTahun} onChange={e => setMassEditForm({ ...massEditForm, applyTahun: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 w-24">Tahun</label>
                <input type="number" value={massEditForm.tahun_awal} onChange={e => setMassEditForm({ ...massEditForm, tahun_awal: +e.target.value })} disabled={!massEditForm.applyTahun}
                  className="w-24 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40" />
                <span className="text-gray-400">—</span>
                <input type="number" value={massEditForm.tahun_akhir} onChange={e => setMassEditForm({ ...massEditForm, tahun_akhir: +e.target.value })} disabled={!massEditForm.applyTahun}
                  className="w-24 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40" />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                <input type="checkbox" className="accent-amber-500" checked={massEditForm.applyAnggaran} onChange={e => setMassEditForm({ ...massEditForm, applyAnggaran: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 w-24">Anggaran</label>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Rp</span>
                  <input type="text" inputMode="numeric" value={massEditForm.anggaran_estimasi === 0 ? '' : massEditForm.anggaran_estimasi.toLocaleString('id-ID')}
                    onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setMassEditForm({ ...massEditForm, anggaran_estimasi: raw ? parseInt(raw, 10) : 0 }); }}
                    disabled={!massEditForm.applyAnggaran} placeholder="0"
                    className="w-full pl-8 pr-4 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40" />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                <input type="checkbox" className="accent-amber-500" checked={massEditForm.applyPrioritas} onChange={e => setMassEditForm({ ...massEditForm, applyPrioritas: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 w-24">Prioritas</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} type="button" disabled={!massEditForm.applyPrioritas}
                      onClick={() => setMassEditForm({ ...massEditForm, skala_prioritas: i })}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 ${massEditForm.skala_prioritas === i ? 'bg-amber-400 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200'}`}>{i}</button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                <input type="checkbox" className="accent-amber-500" checked={massEditForm.applyLokasi} onChange={e => setMassEditForm({ ...massEditForm, applyLokasi: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 w-24">Lokasi</label>
                <input value={massEditForm.lokasi} onChange={e => setMassEditForm({ ...massEditForm, lokasi: e.target.value })} disabled={!massEditForm.applyLokasi}
                  className="flex-1 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40" />
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                <input type="checkbox" className="accent-amber-500 mt-1" checked={massEditForm.applyKeterangan} onChange={e => setMassEditForm({ ...massEditForm, applyKeterangan: e.target.checked })} />
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 w-24">Keterangan</label>
                <textarea value={massEditForm.keterangan} onChange={e => setMassEditForm({ ...massEditForm, keterangan: e.target.value })} disabled={!massEditForm.applyKeterangan} rows={2}
                  className="flex-1 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40 resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowMassEdit(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Batal</button>
              <button onClick={handleMassEdit}
                className="px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600">
                Simpan ke {selectedIds.length} Program
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
