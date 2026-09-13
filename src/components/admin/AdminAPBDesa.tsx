import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, PlusCircle, Edit2, Trash2, BarChart3, X, Link2,
  Download, AlertTriangle, CheckCircle2, Clock, Camera, Image as ImageIcon, Loader2, MapPin, ListChecks, Square, SlidersHorizontal
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
  sumber_dana?: string | null;
  cara_pengadaan?: string | null;
  bidang?: string | null;
  jenis_belanja?: string | null;
  pka?: string | null;
  ketua_tpk?: string | null;
  sekretaris_tpk?: string | null;
  anggota_tpk?: string | null;
  jenis_kegiatan?: string | null;
  fisik_non_fisik?: string | null;
  status_spj?: string | null;
  catatan_kendala?: string | null;
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

const KATEGORI_OPTIONS = ['Penyelenggaraan Pemerintahan Desa', 'Pelaksanaan Pembangunan Desa', 'Pembinaan Kemasyarakatan', 'Pemberdayaan Masyarakat'];
const TAHAPAN_OPTIONS = ['Belum', 'Dianggarkan', 'Berlangsung', 'Selesai'];
const JENIS_OPTIONS = ['Murni', 'Perubahan'];
const SUMBER_DANA_OPTIONS = ['DDS', 'DDS [SILPA]', 'ADD', 'ADD [SILPA]', 'PBH', 'PBH [SILPA]', 'DDCS', 'Bantuan Provinsi', 'Bantuan Kabupaten', 'Bantuan Pusat', 'DLL'];
const CARA_PENGADAAN_OPTIONS = ['Swakelola', 'Pembelian Langsung', 'Permintaan Penawaran', 'Lelang/Tender', 'Penunjukan Langsung'];
const JENIS_BELANJA_OPTIONS = ['Belanja Modal', 'Belanja Bantuan', 'Belanja Operasional Kantor Lainnya', 'Belanja Barang dan Jasa'];
const JENIS_KEGIATAN_OPTIONS = ['Pengadaan', 'Peningkatan', 'Pemeliharaan', 'Pembangunan', 'Sosialisasi'];
const FISIK_NON_FISIK_OPTIONS = ['Fisik', 'Non Fisik'];
const STATUS_SPJ_OPTIONS = ['Belum', 'Proses', 'Selesai'];

const caraPengadaanColor = (c: string) => {
  switch (c) {
    case 'Swakelola': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Pembelian Langsung': return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Permintaan Penawaran': return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'Lelang/Tender': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Penunjukan Langsung': return 'bg-rose-50 text-rose-700 border-rose-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};
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

const getHighlight = (item: APBDesa): { label: string; color: string; bg: string; border: string } | null => {
  const cp = item.cara_pengadaan;
  if (!cp || cp === 'Swakelola') return null;
  switch (cp) {
    case 'Pembelian Langsung': return { label: 'Pembelian Langsung', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' };
    case 'Permintaan Penawaran': return { label: 'Permintaan Penawaran', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' };
    case 'Lelang/Tender': return { label: 'Lelang / Tender', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
    case 'Penunjukan Langsung': return { label: 'Penunjukan Langsung', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' };
    default: return null;
  }
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
  const [selectMode, setSelectMode] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [massEditForm, setMassEditForm] = useState({ anggaran: '', keterangan_pencairan: '', applyJenis: false, jenis: 'Murni', applyKategori: false, kategori: 'Infrastruktur', applySumberDana: false, sumber_dana: 'DDS', applyLokasi: false, lokasi: '' });

  const [form, setForm] = useState({
    nama_kegiatan: '', kategori: 'Penyelenggaraan Pemerintahan Desa', lokasi: '', anggaran: 0,
    keterangan_pencairan: '', jenis: 'Murni', sumber_dana: '', cara_pengadaan: 'Swakelola',
    bidang: 'Penyelenggaraan Pemerintahan Desa', jenis_belanja: 'Belanja Modal',
    pka: '', ketua_tpk: '', sekretaris_tpk: '', anggota_tpk: '',
    jenis_kegiatan: 'Pengadaan', fisik_non_fisik: 'Fisik', status_spj: 'Belum', catatan_kendala: ''
  });

  const [pencairanForm, setPencairanForm] = useState({
    jumlah: '', tanggal: new Date().toISOString().split('T')[0], keterangan: ''
  });
  const [pencairanUploading, setPencairanUploading] = useState(false);
  const [pencairanFoto, setPencairanFoto] = useState<File | null>(null);
  const [pencairanFotoPreview, setPencairanFotoPreview] = useState<string | null>(null);
  const [pencairanQueue, setPencairanQueue] = useState<{ jumlah: number; tanggal: string; keterangan: string; foto: File | null; fotoPreview: string | null }[]>([]);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target as Node)) setShowFilterPopover(false);
    };
    if (showFilterPopover) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterPopover]);

  const loadData = async () => {
    setLoading(true);
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) { setLoading(false); return; }

    const { data } = await supabase.from('apbdesa').select('*').eq('tenant_id', tenantId).eq('tahun', currentYear).order('kode_apbdesa', { ascending: true });
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
      sumber_dana: form.sumber_dana || null,
      cara_pengadaan: form.cara_pengadaan || 'Swakelola',
      bidang: form.bidang || 'Penyelenggaraan Pemerintahan Desa',
      jenis_belanja: form.jenis_belanja || 'Belanja Modal',
      pka: form.pka || null,
      ketua_tpk: form.ketua_tpk || null,
      sekretaris_tpk: form.sekretaris_tpk || null,
      anggota_tpk: form.anggota_tpk || null,
      jenis_kegiatan: form.jenis_kegiatan || 'Pengadaan',
      fisik_non_fisik: form.fisik_non_fisik || 'Fisik',
      status_spj: form.status_spj || 'Belum',
      catatan_kendala: form.catatan_kendala || null,
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

  const handleAddToQueue = () => {
    if (!pencairanForm.jumlah || parseFloat(pencairanForm.jumlah.replace(/\./g, '')) <= 0) {
      showToast('Jumlah pencairan wajib diisi', 'error'); return;
    }
    const jumlah = parseFloat(pencairanForm.jumlah.replace(/\./g, '')) || 0;
    setPencairanQueue(prev => [...prev, {
      jumlah,
      tanggal: pencairanForm.tanggal,
      keterangan: pencairanForm.keterangan,
      foto: pencairanFoto,
      fotoPreview: pencairanFotoPreview
    }]);
    setPencairanForm({ jumlah: '', tanggal: new Date().toISOString().split('T')[0], keterangan: '' });
    setPencairanFoto(null); setPencairanFotoPreview(null);
    if (fotoInputRef.current) fotoInputRef.current.value = '';
  };

  const handleSaveAllPencairan = async () => {
    if (!showPencairanModal || pencairanQueue.length === 0) return;
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) return;

    setPencairanUploading(true);
    let totalAdded = 0;

    for (const item of pencairanQueue) {
      let fotoUrl: string | null = null;
      if (item.foto) {
        const ext = item.foto.name.split('.').pop() || 'jpg';
        const filePath = `${tenantId}/${showPencairanModal.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('apbdesa-foto').upload(filePath, item.foto);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('apbdesa-foto').getPublicUrl(filePath);
          fotoUrl = urlData.publicUrl;
        }
      }
      const { error } = await supabase.from('apbdesa_pencairan').insert({
        tenant_id: tenantId,
        apbdesa_id: showPencairanModal.id,
        jumlah: item.jumlah,
        tanggal: item.tanggal,
        keterangan: item.keterangan || null,
        foto_url: fotoUrl
      });
      if (!error) totalAdded += item.jumlah;
    }

    if (totalAdded > 0) {
      const newTotal = (showPencairanModal.total_pencairan || 0) + totalAdded;
      const autoTahapan = getTahapanStatus(showPencairanModal.anggaran, newTotal);
      await supabase.from('apbdesa').update({
        tanggal_pencairan: pencairanQueue[pencairanQueue.length - 1].tanggal,
        tahapan_pencairan: autoTahapan,
        updated_at: new Date().toISOString()
      }).eq('id', showPencairanModal.id);
    }

    setPencairanUploading(false);
    showToast(`${pencairanQueue.length} pencairan berhasil dicatat`, 'success');
    setPencairanQueue([]);
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
    if (massEditForm.applyKategori) updatePayload.kategori = massEditForm.kategori;
    if (massEditForm.applySumberDana) updatePayload.sumber_dana = massEditForm.sumber_dana;
    if (massEditForm.applyLokasi) updatePayload.lokasi = massEditForm.lokasi;
    if (Object.keys(updatePayload).length <= 1) { showToast('Isi minimal 1 field untuk diupdate', 'error'); return; }
    const chunks: string[][] = [];
    for (let i = 0; i < selectedForMassEdit.length; i += 100) chunks.push(selectedForMassEdit.slice(i, i + 100));
    let totalUpdated = 0;
    for (const chunk of chunks) {
      const { error } = await supabase.from('apbdesa').update(updatePayload).in('id', chunk);
      if (!error) totalUpdated += chunk.length;
    }
    showToast(`${totalUpdated} kegiatan berhasil diupdate`, 'success');
    setSelectedForMassEdit([]); setShowMassEdit(false); setMassEditForm({ anggaran: '', keterangan_pencairan: '', applyJenis: false, jenis: 'Murni', applyKategori: false, kategori: 'Infrastruktur', applySumberDana: false, sumber_dana: 'DDS', applyLokasi: false, lokasi: '' }); loadData();
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
    setForm({ nama_kegiatan: '', kategori: 'Penyelenggaraan Pemerintahan Desa', lokasi: '', anggaran: 0, keterangan_pencairan: '', jenis: 'Murni', sumber_dana: '', cara_pengadaan: 'Swakelola',
      bidang: 'Penyelenggaraan Pemerintahan Desa', jenis_belanja: 'Belanja Modal',
      pka: '', ketua_tpk: '', sekretaris_tpk: '', anggota_tpk: '',
      jenis_kegiatan: 'Pengadaan', fisik_non_fisik: 'Fisik', status_spj: 'Belum', catatan_kendala: '' });
  };

  const filtered = useMemo(() => list.filter(r => {
    const matchSearch = r.nama_kegiatan.toLowerCase().includes(searchQuery.toLowerCase()) || r.kode_apbdesa.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKat = filterKategori === 'Semua Kategori' || r.kategori === filterKategori;
    const matchJenis = filterJenis === 'Semua Jenis' || r.jenis === filterJenis;
    const matchHl = filterHighlight === 'Semua Status' || (r.cara_pengadaan || 'Swakelola') === filterHighlight;
    const matchYear = filterYear === 'Semua Tahun' || r.tahun === Number(filterYear);
    return matchSearch && matchKat && matchJenis && matchHl && matchYear;
  }), [list, searchQuery, filterKategori, filterJenis, filterHighlight, filterYear]);

  const metrics = useMemo(() => {
    return {
      total: list.length,
      highlight: list.filter(r => r.cara_pengadaan && r.cara_pengadaan !== 'Swakelola').length,
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
      'Cara Pengadaan': r.cara_pengadaan || 'Swakelola'
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
              { label: 'Non-Swakelola', value: metrics.highlight, color: 'bg-amber-50 text-amber-700' },
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

      <div className="sticky top-16 z-40 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari..."
              className="w-full pl-8 pr-8 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="relative" ref={filterPopoverRef}>
            <button onClick={() => setShowFilterPopover(v => !v)}
              className={`px-3 py-2 border rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${showFilterPopover ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
              <SlidersHorizontal size={13} /> Filter
              {(filterKategori !== 'Semua Kategori' || filterJenis !== 'Semua Jenis' || filterHighlight !== 'Semua Status' || filterYear !== 'Semua Tahun') && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              )}
            </button>
            {showFilterPopover && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 space-y-3 z-50">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Kategori</label>
                  <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
                    className="w-full px-2.5 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 outline-none">
                    <option value="Semua Kategori">Semua</option>
                    {KATEGORI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Jenis</label>
                  <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)}
                    className="w-full px-2.5 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 outline-none">
                    <option value="Semua Jenis">Semua</option>
                    <option value="Murni">Murni</option>
                    <option value="Perubahan">Perubahan</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Status</label>
                  <select value={filterHighlight} onChange={e => setFilterHighlight(e.target.value)}
                    className="border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900">
                    <option value="Semua Status">Semua Pengadaan</option>
                    <option value="Swakelola">Swakelola</option>
                    <option value="Pembelian Langsung">Pembelian Langsung</option>
                    <option value="Permintaan Penawaran">Permintaan Penawaran</option>
                    <option value="Lelang/Tender">Lelang / Tender</option>
                    <option value="Penunjukan Langsung">Penunjukan Langsung</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Tahun</label>
                  <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                    className="w-full px-2.5 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 outline-none">
                    <option value="Semua Tahun">Semua</option>
                    {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <button onClick={() => { setFilterKategori('Semua Kategori'); setFilterJenis('Semua Jenis'); setFilterHighlight('Semua Status'); setFilterYear('Semua Tahun'); }}
                  className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  Reset Filter
                </button>
              </div>
            )}
          </div>
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
                <th className="py-3 px-4 w-10">
                  <div className="flex flex-col items-center gap-1">
                    <button onClick={() => { setSelectMode(v => !v); if (selectMode) setSelectedForMassEdit([]); }}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${selectMode ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                      title={selectMode ? 'Nonaktifkan pilih' : 'Aktifkan pilih'}>
                      {selectMode ? <ListChecks size={14} /> : <Square size={14} />}
                    </button>
                    {selectMode && (
                    <input type="checkbox" className="accent-emerald-600"
                      checked={selectedForMassEdit.length === filtered.length && filtered.length > 0}
                      onChange={e => setSelectedForMassEdit(e.target.checked ? filtered.map(r => r.id) : [])} />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Kode</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Kegiatan</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Kategori</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-left">Sumber Dana</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Jenis</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Anggaran</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Pencairan</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Tahapan</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Cara Pengadaan</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={10} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    <p className="text-sm text-gray-500 font-medium">Memuat data APBDesa...</p>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-gray-500 font-medium">Belum ada data APBDesa tahun ini</td></tr>
              ) : filtered.map(r => {
                const hl = getHighlight(r);
                return (
                  <tr key={r.id} onClick={() => setDetailTarget(r)} className={`cursor-pointer transition-colors ${hl ? `${hl.bg}/30 hover:${hl.bg}/50` : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'}`}>
                    <td className="py-3 px-4">
                      {selectMode && (
                      <input type="checkbox" className="accent-emerald-600"
                        checked={selectedForMassEdit.includes(r.id)}
                        onClick={e => e.stopPropagation()}
                        onChange={e => { e.stopPropagation(); setSelectedForMassEdit(prev => e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id)); }} />
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{r.kode_apbdesa}</td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-bold text-gray-900 dark:text-white max-w-[220px] truncate">{r.nama_kegiatan}</p>
                      {r.rkpdesa_nama && <p className="text-[10px] text-blue-500 mt-0.5 flex items-center gap-1"><Link2 size={10} /> {r.rkpdesa_nama}</p>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${kategoriColor(r.kategori)}`}>{r.kategori}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">{r.sumber_dana || '-'}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${r.jenis === 'Perubahan' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{r.jenis || 'Murni'}</span>
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white text-right whitespace-nowrap">{formatRp(r.anggaran)}</td>
                    <td className="py-3 px-4"><PencairanBadge item={r} /></td>
                    <td className="py-3 px-4"><TahapanBadge item={r} /></td>
                    <td className="py-3 px-4">
                      {(() => {
                        const cp = r.cara_pengadaan || 'Swakelola';
                        const cpColor = caraPengadaanColor(cp);
                        return (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cpColor}`}>
                            {cp === 'Swakelola' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />} {cp}
                          </span>
                        );
                      })()}
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
                            anggaran: r.anggaran, keterangan_pencairan: r.keterangan_pencairan || '', jenis: r.jenis || 'Murni', sumber_dana: r.sumber_dana || '', cara_pengadaan: r.cara_pengadaan || 'Swakelola',
                            bidang: r.bidang || 'Penyelenggaraan Pemerintahan Desa', jenis_belanja: r.jenis_belanja || 'Belanja Modal',
                            pka: r.pka || '', ketua_tpk: r.ketua_tpk || '', sekretaris_tpk: r.sekretaris_tpk || '', anggota_tpk: r.anggota_tpk || '',
                            jenis_kegiatan: r.jenis_kegiatan || 'Pengadaan', fisik_non_fisik: r.fisik_non_fisik || 'Fisik', status_spj: r.status_spj || 'Belum', catatan_kendala: r.catatan_kendala || '' });
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Detail Kegiatan APBDesa</h3>
              <button onClick={() => setDetailTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col md:flex-row">
                {/* Kiri: Info Kegiatan */}
                <div className="flex-1 p-5 space-y-4 border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-800">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Kategori</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mt-1 ${kategoriColor(detailTarget.kategori)}`}>{detailTarget.kategori}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jenis</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mt-1 ${detailTarget.jenis === 'Perubahan' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{detailTarget.jenis || 'Murni'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tahun</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{detailTarget.tahun}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Lokasi</p>
                      <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 flex items-center gap-1"><MapPin size={12} /> {detailTarget.lokasi || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Sumber Dana</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 mt-1">{detailTarget.sumber_dana || '-'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Anggaran</p>
                      <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-1">{formatRp(detailTarget.anggaran)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tahapan</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{detailTarget.tahapan_pencairan}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Cara Pengadaan</p>
                      {(() => {
                        const cp = detailTarget.cara_pengadaan || 'Swakelola';
                        const cpColor = caraPengadaanColor(cp);
                        return (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mt-1 ${cpColor}`}>
                            {cp === 'Swakelola' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />} {cp}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="border-t border-gray-100 dark:border-slate-800 pt-3 mt-3">
                    <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">Detail Kegiatan</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jenis Belanja</p>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{detailTarget.jenis_belanja || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jenis Kegiatan</p>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{detailTarget.jenis_kegiatan || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Fisik / Non Fisik</p>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{detailTarget.fisik_non_fisik || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status SPJ</p>
                        {(() => {
                          const spj = detailTarget.status_spj || 'Belum';
                          const spjColor = spj === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : spj === 'Proses' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200';
                          return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border mt-1 ${spjColor}`}>{spj}</span>;
                        })()}
                      </div>
                    </div>
                    {detailTarget.pka && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Pelaksana Kegiatan Anggaran (PKA)</p>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{detailTarget.pka}</p>
                      </div>
                    )}
                    {(detailTarget.ketua_tpk || detailTarget.sekretaris_tpk || detailTarget.anggota_tpk) && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Tim Pelaksana Kegiatan (TPK)</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {detailTarget.ketua_tpk && <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2"><span className="text-gray-500">Ketua:</span> <span className="font-bold text-gray-900 dark:text-white">{detailTarget.ketua_tpk}</span></div>}
                          {detailTarget.sekretaris_tpk && <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2"><span className="text-gray-500">Sekretaris:</span> <span className="font-bold text-gray-900 dark:text-white">{detailTarget.sekretaris_tpk}</span></div>}
                          {detailTarget.anggota_tpk && <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2"><span className="text-gray-500">Anggota:</span> <span className="font-bold text-gray-900 dark:text-white">{detailTarget.anggota_tpk}</span></div>}
                        </div>
                      </div>
                    )}
                    {detailTarget.catatan_kendala && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Catatan / Kendala</p>
                        <p className="text-xs text-gray-700 dark:text-slate-300 mt-1 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 border border-amber-200 dark:border-amber-800">{detailTarget.catatan_kendala}</p>
                      </div>
                    )}
                  </div>
                  {detailTarget.keterangan_pencairan && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Keterangan</p>
                      <p className="text-xs text-gray-700 dark:text-slate-300 mt-1 bg-gray-50 dark:bg-slate-800 rounded-lg p-2">{detailTarget.keterangan_pencairan}</p>
                    </div>
                  )}
                </div>
                {/* Kanan: Riwayat Pencairan */}
                <div className="flex-1 p-5">
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 mb-4">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total Pencairan</p>
                    <p className="text-lg font-black text-blue-700 dark:text-blue-300 mt-1">{formatRp(detailTarget.total_pencairan || 0)}</p>
                    <p className="text-[10px] text-blue-500 mt-0.5">dari {formatRp(detailTarget.anggaran)}</p>
                  </div>
                  {(() => {
                    const pcList = pencairanMap.get(detailTarget.id) || [];
                    return (
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Riwayat Pencairan ({pcList.length}x)</p>
                        {pcList.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Belum ada catatan pencairan</p>
                        ) : (
                          <div className="space-y-2 max-h-[calc(90vh-200px)] overflow-y-auto">
                            {pcList.map((pc: any, idx: number) => (
                              <div key={pc.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">{idx + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">{formatRp(pc.jumlah)}</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">{new Date(pc.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                  {pc.keterangan && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{pc.keterangan}</p>}
                                </div>
                                {pc.foto_url && (
                                  <a href={pc.foto_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 shrink-0 mt-1">
                                    <Camera size={14} />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
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
                  anggaran: detailTarget.anggaran, keterangan_pencairan: detailTarget.keterangan_pencairan || '', jenis: detailTarget.jenis || 'Murni', sumber_dana: detailTarget.sumber_dana || '', cara_pengadaan: detailTarget.cara_pengadaan || 'Swakelola',
                  bidang: detailTarget.bidang || 'Penyelenggaraan Pemerintahan Desa', jenis_belanja: detailTarget.jenis_belanja || 'Belanja Modal',
                  pka: detailTarget.pka || '', ketua_tpk: detailTarget.ketua_tpk || '', sekretaris_tpk: detailTarget.sekretaris_tpk || '', anggota_tpk: detailTarget.anggota_tpk || '',
                  jenis_kegiatan: detailTarget.jenis_kegiatan || 'Pengadaan', fisik_non_fisik: detailTarget.fisik_non_fisik || 'Fisik', status_spj: detailTarget.status_spj || 'Belum', catatan_kendala: detailTarget.catatan_kendala || '' });
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

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {pcList.length === 0 && pencairanQueue.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Belum ada catatan pencairan</p>}
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
                {pencairanQueue.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Antrian ({pencairanQueue.length})</p>
                    {[...pencairanQueue].sort((a, b) => a.tanggal.localeCompare(b.tanggal)).map((q, i) => {
                      const origIdx = pencairanQueue.indexOf(q);
                      return (
                        <div key={origIdx} className="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{formatRp(q.jumlah)}</span>
                              <span className="text-[10px] font-bold text-gray-500">{new Date(q.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            {q.keterangan && <p className="text-xs text-gray-500 truncate">{q.keterangan}</p>}
                            {q.fotoPreview && <span className="text-[10px] text-blue-500 font-bold">Ada foto</span>}
                          </div>
                          <button onClick={() => setPencairanQueue(prev => prev.filter((_, idx) => idx !== origIdx))}
                            className="p-1 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-600 shrink-0">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="border-t border-gray-100 dark:border-slate-800 pt-4 space-y-3">
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
              </div>

              <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
                <button onClick={() => { setShowPencairanModal(null); setPencairanQueue([]); }} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Tutup</button>
                <button onClick={handleAddToQueue} disabled={!pencairanForm.jumlah}
                  className="px-4 py-2.5 border border-blue-600 text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-50 disabled:opacity-50 flex items-center gap-2">
                  <PlusCircle size={14} /> Tambah
                </button>
                {pencairanQueue.length > 0 && (
                <button onClick={handleSaveAllPencairan} disabled={pencairanUploading}
                  className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {pencairanUploading ? 'Menyimpan...' : <><Camera size={14} /> Simpan {pencairanQueue.length} Pencairan</>}
                </button>
                )}
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
              <p className="text-xs text-gray-500">Kosongkan field yang tidak ingin diupdate. Centang checkbox untuk mengubah field tertentu.</p>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Anggaran Baru</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">Rp</span>
                  <input type="text" inputMode="numeric" value={massEditForm.anggaran}
                    onChange={e => { const raw = e.target.value.replace(/\D/g, ''); setMassEditForm({ ...massEditForm, anggaran: raw ? parseInt(raw).toLocaleString('id-ID') : '' }); }}
                    placeholder="0" className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 pl-10 text-sm font-medium bg-white dark:bg-slate-900" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 cursor-pointer">
                    <input type="checkbox" checked={massEditForm.applyKategori} onChange={e => setMassEditForm({ ...massEditForm, applyKategori: e.target.checked })} className="accent-emerald-600" />
                    Ubah Kategori
                  </label>
                  <select value={massEditForm.kategori} onChange={e => setMassEditForm({ ...massEditForm, kategori: e.target.value })} disabled={!massEditForm.applyKategori}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 disabled:opacity-40">
                    {KATEGORI_OPTIONS.map(k => <option key={k}>{k}</option>)}
                  </select>
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
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 cursor-pointer">
                  <input type="checkbox" checked={massEditForm.applySumberDana} onChange={e => setMassEditForm({ ...massEditForm, applySumberDana: e.target.checked })} className="accent-emerald-600" />
                  Ubah Sumber Dana
                </label>
                <select value={massEditForm.sumber_dana} onChange={e => setMassEditForm({ ...massEditForm, sumber_dana: e.target.value })} disabled={!massEditForm.applySumberDana}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 disabled:opacity-40">
                  {SUMBER_DANA_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 cursor-pointer">
                  <input type="checkbox" checked={massEditForm.applyLokasi} onChange={e => setMassEditForm({ ...massEditForm, applyLokasi: e.target.checked })} className="accent-emerald-600" />
                  Ubah Lokasi
                </label>
                <input value={massEditForm.lokasi} onChange={e => setMassEditForm({ ...massEditForm, lokasi: e.target.value })} disabled={!massEditForm.applyLokasi}
                  placeholder="Contoh: Dusun I, RT 01" className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 disabled:opacity-40" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Catatan Baru</label>
                <textarea value={massEditForm.keterangan_pencairan} onChange={e => setMassEditForm({ ...massEditForm, keterangan_pencairan: e.target.value })} rows={2}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 resize-none" />
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
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Sumber Dana</label>
                <select value={form.sumber_dana} onChange={e => setForm({ ...form, sumber_dana: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900">
                  <option value="">Pilih Sumber Dana</option>
                  {SUMBER_DANA_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Cara Pengadaan</label>
                <select value={form.cara_pengadaan} onChange={e => setForm({ ...form, cara_pengadaan: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900">
                  {CARA_PENGADAAN_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Jenis Belanja</label>
                <select value={form.jenis_belanja} onChange={e => setForm({ ...form, jenis_belanja: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900">
                  {JENIS_BELANJA_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Pelaksana Kegiatan Anggaran (PKA)</label>
                <input value={form.pka} onChange={e => setForm({ ...form, pka: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" placeholder="Nama penanggung jawab anggaran" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Ketua TPK</label>
                  <input value={form.ketua_tpk} onChange={e => setForm({ ...form, ketua_tpk: e.target.value })}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" placeholder="Ketua" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Sekretaris TPK</label>
                  <input value={form.sekretaris_tpk} onChange={e => setForm({ ...form, sekretaris_tpk: e.target.value })}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" placeholder="Sekretaris" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Anggota TPK</label>
                  <input value={form.anggota_tpk} onChange={e => setForm({ ...form, anggota_tpk: e.target.value })}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900" placeholder="Anggota" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Jenis Kegiatan</label>
                  <select value={form.jenis_kegiatan} onChange={e => setForm({ ...form, jenis_kegiatan: e.target.value })}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900">
                    {JENIS_KEGIATAN_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Fisik / Non Fisik</label>
                  <select value={form.fisik_non_fisik} onChange={e => setForm({ ...form, fisik_non_fisik: e.target.value })}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900">
                    {FISIK_NON_FISIK_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Status SPJ</label>
                  <select value={form.status_spj} onChange={e => setForm({ ...form, status_spj: e.target.value })}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900">
                    {STATUS_SPJ_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Catatan / Kendala</label>
                <textarea value={form.catatan_kendala} onChange={e => setForm({ ...form, catatan_kendala: e.target.value })} rows={3}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 resize-none" placeholder="Catatan atau kendala di lapangan..." />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Keterangan Pencairan</label>
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
