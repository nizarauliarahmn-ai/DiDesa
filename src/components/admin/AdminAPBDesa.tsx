import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, PlusCircle, Edit2, Trash2, BarChart3, X, Link2,
  Download, AlertTriangle, CheckCircle2, Clock, Camera, Image as ImageIcon, Loader2, MapPin
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
  jenis: string;
  anggaran: number;
  tahapan_pencairan: string;
  tanggal_pencairan?: string | null;
  keterangan_pencairan?: string | null;
  created_at: string;
  updated_at: string;
  rkpdesa_nama?: string;
  total_pencairan?: number;
  jumlah_foto?: number;
}

export interface Pencairan {
  id: string;
  tenant_id: string;
  apbdesa_id: string;
  jumlah: number;
  tanggal: string;
  keterangan?: string | null;
  foto_url?: string | null;
  created_at: string;
}

const KATEGORI_OPTIONS = ['Infrastruktur', 'Ekonomi', 'Sosial/Kesehatan', 'Pemerintahan', 'Pemberdayaan'];
const TAHAPAN_OPTIONS = ['Belum', 'Dianggarkan', 'Berlangsung', 'Selesai'];
const JENIS_OPTIONS = ['Murni', 'Perubahan'];

const getTahapanStatus = (anggaran: number, totalPencairan: number): string => {
  if (anggaran === 0) return 'Belum';
  if (totalPencairan === 0) return 'Dianggarkan';
  if (totalPencairan >= anggaran) return 'Selesai';
  return 'Berlangsung';
};

const tahapanColor = (t: string) => {
  switch (t) {
    case 'Belum': return 'bg-gray-100 text-gray-600 border-gray-200';
    case 'Dianggarkan': return 'bg-blue-50 text-blue-600 border-blue-200';
    case 'Berlangsung': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Selesai': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

const tahapanIcon = (t: string) => {
  switch (t) {
    case 'Belum': return <Clock size={10} />;
    case 'Dianggarkan': return <AlertTriangle size={10} />;
    case 'Berlangsung': return <Clock size={10} />;
    case 'Selesai': return <CheckCircle2 size={10} />;
    default: return null;
  }
};

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

const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const getHighlight = (item: APBDesa, totalPencairan: number): { label: string; color: string; bg: string; border: string } | null => {
  const tahapIdx = TAHAPAN_OPTIONS.indexOf(item.tahapan_pencairan);
  if (item.anggaran === 0) {
    return { label: 'Belum Dianggarkan', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' };
  }
  if (tahapIdx === 0 && item.anggaran > 0 && totalPencairan === 0) {
    return { label: 'Perlu Diproses', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' };
  }
  if (item.tahapan_pencairan === 'Selesai' && totalPencairan < item.anggaran) {
    return { label: 'Pencairan Kurang', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-300' };
  }
  return null;
};

export default function AdminAPBDesa() {
  const currentYear = new Date().getFullYear();

  const [list, setList] = useState<APBDesa[]>([]);
  const [rkpList, setRkpList] = useState<any[]>([]);
  const [pencairanMap, setPencairanMap] = useState<Map<string, Pencairan[]>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua Kategori');
  const [filterJenis, setFilterJenis] = useState('Semua Jenis');
  const [filterHighlight, setFilterHighlight] = useState('Semua Status');
  const [filterYear, setFilterYear] = useState('Semua Tahun');
  const [showModal, setShowModal] = useState(false);
  const [showPencairanModal, setShowPencairanModal] = useState<APBDesa | null>(null);
  const [editItem, setEditItem] = useState<APBDesa | null>(null);
  const [detailTarget, setDetailTarget] = useState<APBDesa | null>(null);
  const [showFromRkp, setShowFromRkp] = useState(false);
  const [selectedRkp, setSelectedRkp] = useState<string[]>([]);
  const [importedRkpIds, setImportedRkpIds] = useState<Set<string>>(new Set());
  const [rkpSearchQuery, setRkpSearchQuery] = useState('');
  const [importYear, setImportYear] = useState(currentYear);
  const [importJenis, setImportJenis] = useState('Murni');
  const [loading, setLoading] = useState(true);

  const [selectedForMassEdit, setSelectedForMassEdit] = useState<string[]>([]);
  const [showMassEdit, setShowMassEdit] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [massEditForm, setMassEditForm] = useState({ anggaran: '', keterangan_pencairan: '', applyJenis: false, jenis: 'Murni' });

  const [form, setForm] = useState({
    nama_kegiatan: '', kategori: 'Infrastruktur', lokasi: '', anggaran: 0,
    keterangan_pencairan: '', jenis: 'Murni'
  });

  const [pencairanForm, setPencairanForm] = useState({
    jumlah: '', tanggal: new Date().toISOString().split('T')[0], keterangan: ''
  });
  const [pencairanUploading, setPencairanUploading] = useState(false);
  const [pencairanFoto, setPencairanFoto] = useState<File | null>(null);
  const [pencairanFotoPreview, setPencairanFotoPreview] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) { setLoading(false); return; }

    const { data } = await supabase.from('apbdesa').select('*').eq('tenant_id', tenantId).eq('tahun', currentYear).order('created_at', { ascending: false });
    if (data) {
      const items = data as APBDesa[];
      const linked = new Set<string>();
      const rkpIds = items.filter(i => i.rkpdesa_id).map(i => i.rkpdesa_id);
      if (rkpIds.length > 0) {
        const allRkpIds = [...new Set(rkpIds)];
        const allChunks: string[][] = [];
        for (let i = 0; i < allRkpIds.length; i += 100) allChunks.push(allRkpIds.slice(i, i + 100));
        const rkpMap = new Map<string, string>();
        for (const chunk of allChunks) {
          const { data: rkpData } = await supabase.from('rkpdesa').select('id, nama_kegiatan').in('id', chunk);
          (rkpData || []).forEach((r: any) => { rkpMap.set(r.id, r.nama_kegiatan); linked.add(r.id); });
        }
        items.forEach(i => { i.rkpdesa_nama = rkpMap.get(i.rkpdesa_id!) || null; });
      }

      const apbIds = items.map(i => i.id);
      const newPencairanMap = new Map<string, Pencairan[]>();
      if (apbIds.length > 0) {
        const apbChunks: string[][] = [];
        for (let i = 0; i < apbIds.length; i += 100) apbChunks.push(apbIds.slice(i, i + 100));
        for (const chunk of apbChunks) {
          const { data: pencairanData } = await supabase.from('apbdesa_pencairan').select('*').in('apbdesa_id', chunk).order('tanggal', { ascending: true });
          (pencairanData || []).forEach((p: Pencairan) => {
            const existing = newPencairanMap.get(p.apbdesa_id) || [];
            existing.push(p);
            newPencairanMap.set(p.apbdesa_id, existing);
          });
        }
      }

      items.forEach(i => {
        const pc = newPencairanMap.get(i.id) || [];
        i.total_pencairan = pc.reduce((s, p) => s + (p.jumlah || 0), 0);
        i.jumlah_foto = pc.filter(p => p.foto_url).length;
        i.tahapan_pencairan = getTahapanStatus(i.anggaran, i.total_pencairan || 0);
      });

      const updates = items.filter(i => i.tahapan_pencairan !== (data as any[]).find((d: any) => d.id === i.id)?.tahapan_pencairan);
      for (const u of updates) {
        await supabase.from('apbdesa').update({ tahapan_pencairan: u.tahapan_pencairan, updated_at: new Date().toISOString() }).eq('id', u.id);
      }

      setPencairanMap(newPencairanMap);
      setImportedRkpIds(linked);
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

  const loadRkp = async (year?: number) => {
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;
    const targetYear = year || importYear;
    const { data } = await supabase.from('rkpdesa').select('*').eq('tenant_id', tenantId).eq('tahun', targetYear).in('status', ['Rencana', 'Berlangsung']);
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
      jenis: editItem?.jenis || form.jenis,
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

  const handleAddPencairan = async () => {
    if (!showPencairanModal) return;
    if (!pencairanForm.jumlah || parseFloat(pencairanForm.jumlah.replace(/\./g, '')) <= 0) {
      showToast('Jumlah pencairan wajib diisi', 'error'); return;
    }
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;

    setPencairanUploading(true);
    let fotoUrl: string | null = null;

    if (pencairanFoto) {
      const ext = pencairanFoto.name.split('.').pop() || 'jpg';
      const filePath = `${tenantId}/${showPencairanModal.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('apbdesa-foto').upload(filePath, pencairanFoto);
      if (uploadError) {
        showToast('Gagal upload foto: ' + uploadError.message, 'error');
        setPencairanUploading(false); return;
      }
      const { data: urlData } = supabase.storage.from('apbdesa-foto').getPublicUrl(filePath);
      fotoUrl = urlData.publicUrl;
    }

    const jumlah = parseFloat(pencairanForm.jumlah.replace(/\./g, '')) || 0;
    const { error } = await supabase.from('apbdesa_pencairan').insert({
      tenant_id: tenantId,
      apbdesa_id: showPencairanModal.id,
      jumlah,
      tanggal: pencairanForm.tanggal,
      keterangan: pencairanForm.keterangan || null,
      foto_url: fotoUrl
    });

    setPencairanUploading(false);
    if (error) { showToast('Gagal catat pencairan: ' + error.message, 'error'); return; }

    await supabase.from('apbdesa').update({
      tanggal_pencairan: pencairanForm.tanggal,
      updated_at: new Date().toISOString()
    }).eq('id', showPencairanModal.id);

    const newTotal = (showPencairanModal.total_pencairan || 0) + jumlah;
    const autoTahapan = getTahapanStatus(showPencairanModal.anggaran, newTotal);
    await supabase.from('apbdesa').update({ tahapan_pencairan: autoTahapan }).eq('id', showPencairanModal.id);

    showToast('Pencairan berhasil dicatat', 'success');
    setPencairanForm({ jumlah: '', tanggal: new Date().toISOString().split('T')[0], keterangan: '' });
    setPencairanFoto(null); setPencairanFotoPreview(null);
    loadData();
  };

  const handleDeletePencairan = async (pencairanId: string) => {
    if (!window.confirm('Hapus catatan pencairan ini?')) return;
    const { error } = await supabase.from('apbdesa_pencairan').delete().eq('id', pencairanId);
    if (error) { showToast('Gagal menghapus', 'error'); return; }
    showToast('Berhasil dihapus', 'success'); loadData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus kegiatan APBDesa ini?')) return;
    const { error } = await supabase.from('apbdesa').delete().eq('id', id);
    if (error) { showToast('Gagal menghapus', 'error'); return; }
    showToast('Berhasil dihapus', 'success'); loadData();
  };

  const handleBulkDelete = async () => {
    if (selectedForMassEdit.length === 0) return;
    if (!window.confirm(`Hapus ${selectedForMassEdit.length} kegiatan APBDesa terpilih?`)) return;
    setBulkBusy(true);
    try {
      for (let i = 0; i < selectedForMassEdit.length; i += 100) {
        const chunk = selectedForMassEdit.slice(i, i + 100);
        const { error } = await supabase.from('apbdesa').delete().in('id', chunk);
        if (error) throw error;
      }
      showToast(`${selectedForMassEdit.length} kegiatan berhasil dihapus.`, 'success');
      setSelectedForMassEdit([]);
      loadData();
    } catch (e: any) {
      showToast(e?.message || 'Gagal menghapus massal.', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleMassEdit = async () => {
    if (selectedForMassEdit.length === 0) { showToast('Pilih kegiatan terlebih dahulu', 'error'); return; }
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (massEditForm.anggaran !== '') updatePayload.anggaran = parseFloat(massEditForm.anggaran.replace(/\./g, '')) || 0;
    if (massEditForm.keterangan_pencairan !== '') updatePayload.keterangan_pencairan = massEditForm.keterangan_pencairan;
    if (massEditForm.applyJenis) updatePayload.jenis = massEditForm.jenis;
    if (Object.keys(updatePayload).length <= 1) { showToast('Isi minimal 1 field untuk diupdate', 'error'); return; }
    const chunks: string[][] = [];
    for (let i = 0; i < selectedForMassEdit.length; i += 100) chunks.push(selectedForMassEdit.slice(i, i + 100));
    let totalUpdated = 0;
    for (const chunk of chunks) {
      const { error } = await supabase.from('apbdesa').update(updatePayload).in('id', chunk);
      if (!error) totalUpdated += chunk.length;
    }
    showToast(`${totalUpdated} kegiatan berhasil diupdate`, 'success');
    setSelectedForMassEdit([]); setShowMassEdit(false); setMassEditForm({ anggaran: '', keterangan_pencairan: '', applyJenis: false, jenis: 'Murni' }); loadData();
  };

  const handleImportFromRkp = async () => {
    if (selectedRkp.length === 0) { showToast('Pilih minimal 1 kegiatan RKPDesa', 'error'); return; }
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;

    const payloads = [];
    let seq = 0;
    const { data: existing } = await supabase.from('apbdesa').select('kode_apbdesa').eq('tenant_id', tenantId).eq('tahun', importYear).eq('jenis', importJenis).like('kode_apbdesa', `APB-${importYear}-%`);
    seq = (existing || []).reduce((max, row) => {
      const match = row.kode_apbdesa.match(/APB-\d{4}-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);

    for (const rkpId of selectedRkp) {
      const r = rkpList.find((x: any) => x.id === rkpId);
      if (!r) continue;
      seq++;
      payloads.push({
        tenant_id: tenantId,
        kode_apbdesa: `APB-${importYear}-${String(seq).padStart(3, '0')}`,
        rkpdesa_id: r.id,
        nama_kegiatan: r.nama_kegiatan,
        kategori: r.kategori,
        lokasi: r.lokasi || null,
        sumber_data: 'rkpdesa',
        tahun: importYear,
        jenis: importJenis,
        anggaran: r.anggaran || 0,
        tahapan_pencairan: 'Belum',
        keterangan_pencairan: null
      });
    }

    if (payloads.length > 0) {
      const { error } = await supabase.from('apbdesa').insert(payloads);
      if (error) { showToast('Gagal import: ' + error.message, 'error'); return; }
    }

    // Update pipeline_status di usulan_desas (trace back via rkpdesa → rpjmdesa → usulan)
    const rkpIds = selectedRkp.filter((id: string) => rkpList.find((x: any) => x.id === id));
    const rpjmIds: string[] = [];
    for (const rid of rkpIds) {
      const r = rkpList.find((x: any) => x.id === rid);
      if (r?.rpjmdesa_id) rpjmIds.push(r.rpjmdesa_id);
    }
    if (rpjmIds.length > 0) {
      const uniqueRpjmIds = [...new Set(rpjmIds)];
      const BATCH = 100;
      for (let i = 0; i < uniqueRpjmIds.length; i += BATCH) {
        const chunk = uniqueRpjmIds.slice(i, i + BATCH);
        const { data: rpjmData } = await supabase.from('rpjmdesa').select('usulan_id').in('id', chunk);
        const usulanIds = (rpjmData || []).map((r: any) => r.usulan_id).filter(Boolean);
        if (usulanIds.length > 0) {
          const uniqueUsulanIds = [...new Set(usulanIds)];
          for (let j = 0; j < uniqueUsulanIds.length; j += BATCH) {
            const uChunk = uniqueUsulanIds.slice(j, j + BATCH);
            await supabase.from('usulan_desas').update({ pipeline_status: 'APBDesa' }).in('id', uChunk);
          }
        }
      }
    }

    showToast(`${payloads.length} kegiatan berhasil ditarik ke APBDesa`, 'success');
    setShowFromRkp(false); setSelectedRkp([]); setRkpSearchQuery(''); loadData();
  };

  const resetForm = () => {
    setForm({ nama_kegiatan: '', kategori: 'Infrastruktur', lokasi: '', anggaran: 0, keterangan_pencairan: '', jenis: 'Murni' });
  };

  const filtered = useMemo(() => list.filter(r => {
    const matchSearch = r.nama_kegiatan.toLowerCase().includes(searchQuery.toLowerCase()) || r.kode_apbdesa.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKat = filterKategori === 'Semua Kategori' || r.kategori === filterKategori;
    const matchJenis = filterJenis === 'Semua Jenis' || r.jenis === filterJenis;
    const hl = getHighlight(r, r.total_pencairan || 0);
    const matchHl = filterHighlight === 'Semua Status' ||
      (filterHighlight === 'highlight' && hl !== null) ||
      (filterHighlight === 'aman' && hl === null);
    const matchYear = filterYear === 'Semua Tahun' || r.tahun === Number(filterYear);
    return matchSearch && matchKat && matchJenis && matchHl && matchYear;
  }), [list, searchQuery, filterKategori, filterJenis, filterHighlight, filterYear]);

  const metrics = useMemo(() => {
    return {
      total: list.length,
      highlight: list.filter(r => getHighlight(r, r.total_pencairan || 0) !== null).length,
      perluDiproses: list.filter(r => r.tahapan_pencairan === 'Belum' && r.anggaran > 0).length,
      selesai: list.filter(r => r.tahapan_pencairan === 'Selesai').length,
      totalAnggaran: list.reduce((s, r) => s + (r.anggaran || 0), 0),
      totalPencairan: list.reduce((s, r) => s + (r.total_pencairan || 0), 0)
    };
  }, [list]);

  const handleExport = () => {
    const rows = filtered.map(r => ({
      Kode: r.kode_apbdesa, Kegiatan: r.nama_kegiatan, Kategori: r.kategori, Lokasi: r.lokasi || '',
      Anggaran: r.anggaran, 'Tahapan': r.tahapan_pencairan,
      'Total Pencairan': r.total_pencairan || 0,
      'Persentase': r.anggaran > 0 ? Math.round(((r.total_pencairan || 0) / r.anggaran) * 100) + '%' : '0%',
      'Foto': r.jumlah_foto || 0,
      Highlight: getHighlight(r, r.total_pencairan || 0)?.label || '-'
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'APBDesa');
    writeFile(wb, `APBDesa_${currentYear}.xlsx`);
    showToast('Berhasil diexport', 'success');
  };

  const PencairanBadge = ({ item }: { item: APBDesa }) => {
    const total = item.total_pencairan || 0;
    const pct = item.anggaran > 0 ? Math.round((total / item.anggaran) * 100) : 0;
    const fotoCount = item.jumlah_foto || 0;
    const pcCount = (pencairanMap.get(item.id) || []).length;
    return (
      <div className="space-y-1.5 min-w-[160px]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pencairan</span>
          <div className="flex items-center gap-1.5">
            {pcCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[9px] font-bold">{pcCount}x</span>
            )}
            <span className="text-xs font-black text-gray-900 dark:text-white">{pct}%</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
            style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500">{formatRp(total)} / {formatRp(item.anggaran)}</span>
          {fotoCount > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">
              <Camera size={9} /> {fotoCount}
            </span>
          )}
        </div>
      </div>
    );
  };

  const TahapanBadge = ({ item }: { item: APBDesa }) => {
    const total = item.total_pencairan || 0;
    const tahapan = getTahapanStatus(item.anggaran, total);
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${tahapanColor(tahapan)}`}>
        {tahapanIcon(tahapan)} {tahapan}
      </span>
    );
  };

  return (
    <div className="pb-24 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
          </div>
          <h1 className="text-lg font-black text-gray-900 dark:text-white">APBDesa {currentYear}</h1>
          <div className="hidden md:flex items-center gap-2 ml-2">
            {[
              { label: 'Total', value: metrics.total, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Perlu', value: metrics.highlight, color: 'bg-amber-50 text-amber-700' },
              { label: 'Selesai', value: metrics.selesai, color: 'bg-emerald-100 text-emerald-800' },
            ].map((m, i) => (
              <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${m.color}`}>{m.label}: {m.value}</span>
            ))}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">{formatRp(metrics.totalPencairan)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { loadRkp(importYear); setShowFromRkp(true); }}
            className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1.5">
            <Link2 size={14} /> Tarik dari RKPDesa
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
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari kegiatan..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>
          <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-900">
            <option value="Semua Kategori">Semua Kategori</option>
            {KATEGORI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-900">
            <option value="Semua Jenis">Semua Jenis</option>
            <option value="Murni">Murni</option>
            <option value="Perubahan">Perubahan</option>
          </select>
          <select value={filterHighlight} onChange={e => setFilterHighlight(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-900">
            <option value="Semua Status">Semua Status</option>
            <option value="highlight">Perlu Perhatian</option>
            <option value="aman">Aman</option>
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-900">
            <option>Semua Tahun</option>
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
                <th className="py-3 px-4 w-10">
                  <input type="checkbox" className="accent-emerald-600"
                    checked={selectedForMassEdit.length === filtered.length && filtered.length > 0}
                    onChange={e => setSelectedForMassEdit(e.target.checked ? filtered.map(r => r.id) : [])} />
                </th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Kode</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Kegiatan</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Kategori</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Jenis</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Anggaran</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Pencairan</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Tahapan</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Highlight</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    <p className="text-sm text-gray-500 font-medium">Memuat data APBDesa...</p>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-gray-500 font-medium">Belum ada data APBDesa tahun ini</td></tr>
              ) : filtered.map(r => {
                const hl = getHighlight(r, r.total_pencairan || 0);
                return (
                  <tr key={r.id} onClick={() => setDetailTarget(r)} className={`cursor-pointer transition-colors ${hl ? `${hl.bg}/30 hover:${hl.bg}/50` : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'}`}>
                    <td className="py-3 px-4">
                      <input type="checkbox" className="accent-emerald-600"
                        checked={selectedForMassEdit.includes(r.id)}
                        onChange={e => setSelectedForMassEdit(prev => e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id))} />
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{r.kode_apbdesa}</td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-bold text-gray-900 dark:text-white max-w-[220px] truncate">{r.nama_kegiatan}</p>
                      {r.rkpdesa_nama && <p className="text-[10px] text-blue-500 mt-0.5 flex items-center gap-1"><Link2 size={10} /> {r.rkpdesa_nama}</p>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${kategoriColor(r.kategori)}`}>{r.kategori}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${r.jenis === 'Perubahan' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{r.jenis || 'Murni'}</span>
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white text-right whitespace-nowrap">{formatRp(r.anggaran)}</td>
                    <td className="py-3 px-4"><PencairanBadge item={r} /></td>
                    <td className="py-3 px-4"><TahapanBadge item={r} /></td>
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
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => {
                          setPencairanForm({ jumlah: '', tanggal: new Date().toISOString().split('T')[0], keterangan: '' });
                          setPencairanFoto(null); setPencairanFotoPreview(null);
                          setShowPencairanModal(r);
                        }} className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors flex items-center gap-1">
                          <Camera size={12} /> Catat
                        </button>
                        <button onClick={() => {
                          setEditItem(r);
                          setForm({ nama_kegiatan: r.nama_kegiatan, kategori: r.kategori, lokasi: r.lokasi || '',
                            anggaran: r.anggaran, keterangan_pencairan: r.keterangan_pencairan || '', jenis: r.jenis || 'Murni' });
                          setShowModal(true);
                        }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-rose-50 rounded-lg text-gray-500 hover:text-rose-600"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedForMassEdit.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9990] w-[95vw] max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap justify-center rounded-2xl bg-slate-900/95 dark:bg-black/90 backdrop-blur border border-white/10 shadow-2xl px-4 py-3">
            <span className="text-sm font-black text-white whitespace-nowrap">{selectedForMassEdit.length} Kegiatan Terpilih</span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Hapus Massal ({selectedForMassEdit.length})
            </button>
            <button
              onClick={() => setShowMassEdit(true)}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Edit Massal ({selectedForMassEdit.length})
            </button>
            <button
              onClick={() => setSelectedForMassEdit([])}
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
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Detail Kegiatan APBDesa</h3>
              <button onClick={() => setDetailTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Kode</p>
                <p className="text-sm font-mono font-black text-emerald-700 dark:text-emerald-300 mt-1">{detailTarget.kode_apbdesa}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nama Kegiatan</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{detailTarget.nama_kegiatan}</p>
              </div>
              {detailTarget.rkpdesa_nama && (
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Sumber RKPDesa</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1"><Link2 size={12} /> {detailTarget.rkpdesa_nama}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Kategori</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mt-1 ${kategoriColor(detailTarget.kategori)}`}>{detailTarget.kategori}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jenis</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mt-1 ${detailTarget.jenis === 'Perubahan' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{detailTarget.jenis || 'Murni'}</span>
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
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Lokasi</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 flex items-center gap-1"><MapPin size={12} /> {detailTarget.lokasi || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tahapan</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{detailTarget.tahapan_pencairan}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total Pencairan</p>
                  <p className="text-sm font-black text-blue-700 dark:text-blue-400 mt-1">{formatRp(detailTarget.total_pencairan || 0)}</p>
                </div>
              </div>
              {detailTarget.keterangan_pencairan && (
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Keterangan</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 bg-gray-50 dark:bg-slate-800 rounded-lg p-3">{detailTarget.keterangan_pencairan}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
              <button onClick={() => setDetailTarget(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">Tutup</button>
              <button onClick={() => {
                const item = detailTarget;
                setDetailTarget(null);
                setShowPencairanModal(item);
              }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer">
                <Camera size={14} /> Catat Pencairan
              </button>
              <button onClick={() => {
                setEditItem(detailTarget);
                setForm({ nama_kegiatan: detailTarget.nama_kegiatan, kategori: detailTarget.kategori, lokasi: detailTarget.lokasi || '',
                  anggaran: detailTarget.anggaran, keterangan_pencairan: detailTarget.keterangan_pencairan || '', jenis: detailTarget.jenis || 'Murni' });
                setDetailTarget(null);
                setShowModal(true);
              }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer">
                <Edit2 size={14} /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {showPencairanModal && (() => {
        const pcList = pencairanMap.get(showPencairanModal.id) || [];
        const totalPc = pcList.reduce((s, p) => s + (p.jumlah || 0), 0);
        const pct = showPencairanModal.anggaran > 0 ? Math.round((totalPc / showPencairanModal.anggaran) * 100) : 0;
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Catat Pencairan</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{showPencairanModal.kode_apbdesa} — {showPencairanModal.nama_kegiatan}</p>
                </div>
                <button onClick={() => setShowPencairanModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={18} /></button>
              </div>

              <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Pencairan</span>
                  <span className="text-lg font-black text-gray-900 dark:text-white">{formatRp(totalPc)} / {formatRp(showPencairanModal.anggaran)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 mb-2">
                  <div className={`h-3 rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">{pct}% terpakai</span>
                  <span className="text-xs font-bold text-gray-500">Sisa {formatRp(Math.max(0, showPencairanModal.anggaran - totalPc))}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {pcList.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Belum ada catatan pencairan</p>}
                {pcList.map(p => (
                  <div key={p.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatRp(p.jumlah)}</span>
                        <span className="text-[10px] font-bold text-gray-500">{new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {p.keterangan && <p className="text-xs text-gray-500 mt-1">{p.keterangan}</p>}
                      {p.foto_url && (
                        <a href={p.foto_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-blue-500 hover:text-blue-700">
                          <ImageIcon size={10} /> Lihat Foto
                        </a>
                      )}
                    </div>
                    <button onClick={() => handleDeletePencairan(p.id)} className="p-1 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-600">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-5 border-t border-gray-100 dark:border-slate-800 space-y-3 bg-gray-50 dark:bg-slate-800/30">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Catat Pencairan Baru</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Jumlah (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">Rp</span>
                      <input type="text" inputMode="numeric" value={pencairanForm.jumlah}
                        onChange={e => { const raw = e.target.value.replace(/\D/g, ''); setPencairanForm({ ...pencairanForm, jumlah: raw ? parseInt(raw).toLocaleString('id-ID') : '' }); }}
                        placeholder="0" className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 pl-10 text-sm font-medium bg-white dark:bg-slate-900" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Tanggal</label>
                    <input type="date" value={pencairanForm.tanggal}
                      onChange={e => setPencairanForm({ ...pencairanForm, tanggal: e.target.value })}
                      className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Keterangan</label>
                  <input value={pencairanForm.keterangan}
                    onChange={e => setPencairanForm({ ...pencairanForm, keterangan: e.target.value })}
                    placeholder="Catatan pencairan..."
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Foto Bukti (opsional)</label>
                  <input ref={fotoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPencairanFoto(file);
                        const reader = new FileReader();
                        reader.onload = ev => setPencairanFotoPreview(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} />
                  {pencairanFotoPreview ? (
                    <div className="relative inline-block">
                      <img src={pencairanFotoPreview} alt="Preview" className="w-20 h-20 object-cover rounded-xl border" />
                      <button onClick={() => { setPencairanFoto(null); setPencairanFotoPreview(null); if (fotoInputRef.current) fotoInputRef.current.value = ''; }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs">
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fotoInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-4 text-center hover:border-blue-400 transition-colors">
                      <Camera size={20} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-xs text-gray-500">Klik untuk upload foto</p>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
                <button onClick={() => setShowPencairanModal(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Tutup</button>
                <button onClick={handleAddPencairan} disabled={pencairanUploading || !pencairanForm.jumlah}
                  className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {pencairanUploading ? 'Uploading...' : <><Camera size={14} /> Catat Pencairan</>}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showMassEdit && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Edit Massal</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedForMassEdit.length} kegiatan dipilih</p>
              </div>
              <button onClick={() => setShowMassEdit(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">Kosongkan field yang tidak ingin diupdate</p>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Anggaran Baru</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">Rp</span>
                  <input type="text" inputMode="numeric" value={massEditForm.anggaran}
                    onChange={e => { const raw = e.target.value.replace(/\D/g, ''); setMassEditForm({ ...massEditForm, anggaran: raw ? parseInt(raw).toLocaleString('id-ID') : '' }); }}
                    placeholder="0" className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 pl-10 text-sm font-medium bg-white dark:bg-slate-900" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Catatan Baru</label>
                <textarea value={massEditForm.keterangan_pencairan} onChange={e => setMassEditForm({ ...massEditForm, keterangan_pencairan: e.target.value })} rows={2}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 resize-none" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 cursor-pointer">
                  <input type="checkbox" checked={massEditForm.applyJenis} onChange={e => setMassEditForm({ ...massEditForm, applyJenis: e.target.checked })} className="accent-emerald-600" />
                  Ubah Jenis
                </label>
                <select value={massEditForm.jenis} onChange={e => setMassEditForm({ ...massEditForm, jenis: e.target.value })} disabled={!massEditForm.applyJenis}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 disabled:opacity-40">
                  {JENIS_OPTIONS.map(j => <option key={j}>{j}</option>)}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowMassEdit(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Batal</button>
              <button onClick={handleMassEdit}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700">Update {selectedForMassEdit.length} Kegiatan</button>
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
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Jenis APBDesa</label>
                  <select value={form.jenis} onChange={e => setForm({ ...form, jenis: e.target.value })}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900">
                    {JENIS_OPTIONS.map(j => <option key={j}>{j}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Anggaran</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">Rp</span>
                    <input type="text" inputMode="numeric" value={form.anggaran === 0 ? '' : form.anggaran.toLocaleString('id-ID')}
                      onChange={e => { const raw = e.target.value.replace(/\D/g, ''); setForm({ ...form, anggaran: raw ? parseInt(raw) : 0 }); }}
                      placeholder="0" className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 pl-10 text-sm font-medium bg-white dark:bg-slate-900" />
                  </div>
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
              <button onClick={() => { setShowFromRkp(false); setSelectedRkp([]); setRkpSearchQuery(''); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3 flex-1 overflow-y-auto">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tahun RKPDesa</label>
                  <select value={importYear} onChange={e => { const y = Number(e.target.value); setImportYear(y); loadRkp(y); setSelectedRkp([]); }}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-900">
                    {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Jenis APBDesa</label>
                  <select value={importJenis} onChange={e => setImportJenis(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-900">
                    {JENIS_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-sm text-gray-500">Pilih kegiatan RKPDesa tahun <strong>{importYear}</strong> untuk dimasukkan ke APBDesa <strong>{importJenis}</strong>:</p>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={rkpSearchQuery} onChange={e => setRkpSearchQuery(e.target.value)} placeholder="Cari kegiatan RKPDesa..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              {(() => {
                const filteredRkp = rkpList.filter((r: any) => r.nama_kegiatan.toLowerCase().includes(rkpSearchQuery.toLowerCase()) || r.kode_rkpdesa.toLowerCase().includes(rkpSearchQuery.toLowerCase()));
                const selectableFiltered = filteredRkp.filter((r: any) => !importedRkpIds.has(r.id));
                const allSelectableSelected = selectableFiltered.length > 0 && selectableFiltered.every((r: any) => selectedRkp.includes(r.id));
                return selectableFiltered.length > 0 ? (
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 cursor-pointer">
                    <input type="checkbox" className="accent-emerald-600"
                      checked={allSelectableSelected}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedRkp(prev => [...new Set([...prev, ...selectableFiltered.map((r: any) => r.id)])]);
                        } else {
                          const selectableIds = new Set(selectableFiltered.map((r: any) => r.id));
                          setSelectedRkp(prev => prev.filter(id => !selectableIds.has(id)));
                        }
                      }} />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Tandai Semua ({selectableFiltered.length})</span>
                  </label>
                ) : null;
              })()}
              {rkpList.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Tidak ada kegiatan RKPDesa tahun ini</p>}
              {rkpList.filter((r: any) => r.nama_kegiatan.toLowerCase().includes(rkpSearchQuery.toLowerCase()) || r.kode_rkpdesa.toLowerCase().includes(rkpSearchQuery.toLowerCase())).length === 0 && rkpList.length > 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Tidak ditemukan kegiatan yang cocok</p>
              )}
              {rkpList.filter((r: any) => r.nama_kegiatan.toLowerCase().includes(rkpSearchQuery.toLowerCase()) || r.kode_rkpdesa.toLowerCase().includes(rkpSearchQuery.toLowerCase())).map((r: any) => {
                const isImported = importedRkpIds.has(r.id);
                return (
                  <label key={r.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    isImported ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed' :
                    selectedRkp.includes(r.id) ? 'bg-emerald-50 border-emerald-300 cursor-pointer' : 'hover:bg-gray-50 cursor-pointer'
                  }`}>
                    <input type="checkbox" className="mt-1 accent-emerald-600"
                      disabled={isImported}
                      checked={isImported || selectedRkp.includes(r.id)}
                      onChange={e => setSelectedRkp(prev => e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id))} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{r.kode_rkpdesa} — {r.nama_kegiatan}</p>
                        {isImported && <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px] font-bold">Sudah di-import</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{r.kategori} {r.lokasi ? `• ${r.lokasi}` : ''} • Anggaran {formatRp(r.anggaran || 0)}</p>
                    </div>
                  </label>
                );
              })}
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
