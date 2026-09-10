import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, PlusCircle, Edit2, Trash2, ClipboardList, X, Link2,
  Download, Filter, CheckCircle2
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
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<RKPDesa | null>(null);
  const [showFromRpjm, setShowFromRpjm] = useState(false);
  const [selectedRpjm, setSelectedRpjm] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rpjmSearch, setRpjmSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMassEdit, setShowMassEdit] = useState(false);
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

  const loadRpjm = async () => {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;
    const { data } = await supabase.from('rpjmdesa').select('*').eq('tenant_id', tenantId).lte('tahun_awal', currentYear).gte('tahun_akhir', currentYear).in('status', ['Rencana', 'Berlangsung']);
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
        kode_rkpdesa: `RKP-${currentYear}-${String(lastNum + idx + 1).padStart(5, '0')}`,
        rpjmdesa_id: r.id,
        nama_kegiatan: r.nama_program,
        kategori: r.kategori,
        lokasi: r.lokasi || null,
        sumber_data: 'rpjmdesa',
        tahun: currentYear,
        anggaran: r.anggaran_estimasi || 0,
        skala_prioritas: r.skala_prioritas || 3,
        keterangan: r.keterangan || null,
        status: 'Rencana'
      };
    }).filter(Boolean);

    if (rows.length === 0) { showToast('Tidak ada data valid', 'error'); return; }

    const { error } = await supabase.from('rkpdesa').insert(rows);
    if (error) { showToast(`Gagal menarik: ${error.message}`, 'error'); return; }
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
    const matchKat = filterKategori === 'Semua' || r.kategori === filterKategori;
    const matchSts = filterStatus === 'Semua' || r.status === filterStatus;
    return matchSearch && matchKat && matchSts;
  }), [list, searchQuery, filterKategori, filterStatus]);

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
    <div className="pb-24 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            RKPDesa
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mt-1 ml-13">Rencana Kerja Pemerintah Desa — Tahun {currentYear}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { loadRpjm(); setShowFromRpjm(true); }}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 flex items-center gap-2">
            <Link2 size={16} /> Tarik dari RPJMDesa
          </button>
          <button onClick={() => { resetForm(); setEditItem(null); setShowModal(true); }}
            className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2">
            <PlusCircle size={16} /> Tambah Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Kegiatan', value: metrics.total, color: 'border-l-emerald-500' },
          { label: 'Rencana', value: metrics.rencana, color: 'border-l-gray-400' },
          { label: 'Berlangsung', value: metrics.berlangsung, color: 'border-l-blue-500' },
          { label: 'Selesai', value: metrics.selesai, color: 'border-l-emerald-700' },
          { label: 'Total Anggaran', value: formatRp(metrics.totalAnggaran), color: 'border-l-blue-500', isText: true }
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
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
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
          <button onClick={handleExport} className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
            <Download size={14} /> Export
          </button>
          {selectedIds.length > 0 && (
            <button onClick={() => setShowMassEdit(true)}
              className="px-4 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 flex items-center gap-2">
              <Edit2 size={14} /> Edit Massal ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      <div className="standard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                <th className="py-3 px-4 text-left w-10">
                  <input type="checkbox" className="accent-blue-600"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={toggleSelectAll} />
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
              {filtered.map(r => (
                <tr key={r.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${selectedIds.includes(r.id) ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                  <td className="py-3 px-4">
                    <input type="checkbox" className="accent-blue-600"
                      checked={selectedIds.includes(r.id)}
                      onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id))} />
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
              {filtered.length === 0 && <tr><td colSpan={10} className="py-12 text-center text-gray-500 font-medium">Belum ada data RKPDesa</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

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
                <input type="number" value={form.anggaran} onChange={e => setForm({ ...form, anggaran: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" />
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
              <p className="text-sm text-gray-500">Pilih program RPJMDesa tahun {currentYear} untuk ditarik ke RKPDesa:</p>
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
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Belum Ditarik ({belumLinked.length})</p>
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
                <input type="number" value={massEditForm.anggaran} onChange={e => setMassEditForm({ ...massEditForm, anggaran: +e.target.value })} disabled={!massEditForm.applyAnggaran}
                  className="flex-1 border border-gray-300 dark:border-slate-600 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900 disabled:opacity-40" />
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
