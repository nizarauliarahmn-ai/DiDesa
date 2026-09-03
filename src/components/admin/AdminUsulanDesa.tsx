import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, PlusCircle, Edit2, Trash2, Image as ImageIcon, FolderOpen,
  ListChecks, AlertTriangle, Layers, Upload, X, Loader2, Link2, MapPin, User,
  CircleDollarSign, HeartHandshake, CheckCircle2, Ban, Send, Printer, Download, Star,
  Eye, MoreVertical, Tags
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { uploadToSupabaseStorage } from '../../utils/googleDriveUpload';
import ImportUsulanWizard from './ImportUsulanWizard';
import UsulanDetailModal from './UsulanDetailModal';
import { findSimilarUsulan, tokenOverlapSimilarity, SIMILARITY_THRESHOLD } from '../../utils/similarity';

export interface UsulanDesa {
  id: string;
  tenant_id: string;
  kode_usulan: string;
  uraian_usulan: string;
  kategori: string;
  lokasi_rt_rw?: string | null;
  pengusul?: string | null;
  diteruskan_tags?: string[] | null;
  status_terakomodir: string;
  skala_prioritas?: number | null;
  keterangan?: string | null;
  foto_url?: string | null;
  google_drive_file_id?: string | null;
  google_drive_view_url?: string | null;
  google_drive_download_url?: string | null;
  created_at: string;
}

const KATEGORI_OPTIONS = ['Infrastruktur', 'Ekonomi', 'Sosial/Kesehatan', 'Pemerintahan', 'Pemberdayaan'];
const STATUS_TERAKOMODIR_OPTIONS = ['Belum', 'Desa 2026', 'Desa 2027', 'Kab 2026', 'Kab 2027', 'Ditolak'];
const TAG_OPTIONS = ['RKPDes 2026', 'RKPDes 2027', 'Musrenbang 2026', 'Musrenbang 2027'];
const PRIORITAS_OPTIONS = [1, 2, 3, 4, 5];

const compressImage = (file: File): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({ blob, originalSize: file.size, compressedSize: blob.size });
          } else {
            reject(new Error('Canvas to Blob failed'));
          }
        }, 'image/jpeg', 0.75);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

function DropdownItem({ icon: Icon, label, color, onClick }: { icon: any; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
    >
      <Icon className={`w-4 h-4 ${color}`} />
      {label}
    </button>
  );
}

export default function AdminUsulanDesa() {
  const [list, setList] = useState<UsulanDesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UsulanDesa | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Pipeline workflow state
  const [pipelineTarget, setPipelineTarget] = useState<UsulanDesa | null>(null);
  const [pipelineAction, setPipelineAction] = useState<null | 'rkpdes' | 'musrenbang' | 'status'>(null);
  const [pipelineYear, setPipelineYear] = useState(String(new Date().getFullYear()));
  const [pipelinePriority, setPipelinePriority] = useState('');
  const [pipelineStatus, setPipelineStatus] = useState('Belum');
  const [pipelineSaving, setPipelineSaving] = useState(false);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);

  // Bulk selection & detail/similarity state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<UsulanDesa | null>(null);
  const [similarTarget, setSimilarTarget] = useState<UsulanDesa | null>(null);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const masterCheckRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    kode_usulan: '',
    uraian_usulan: '',
    kategori: 'Infrastruktur',
    lokasi_rt_rw: '',
    pengusul: '',
    diteruskan_tags: [] as string[],
    status_terakomodir: 'Belum',
    skala_prioritas: '' as string,
    keterangan: '',
    foto_url: '',
    google_drive_file_id: '',
    google_drive_view_url: '',
    google_drive_download_url: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const tenantId = await resolveCurrentTenant();
      let builder = supabase.from('usulan_desas').select('*').order('created_at', { ascending: false });
      if (tenantId) builder = builder.eq('tenant_id', tenantId);
      const { data, error } = await builder;
      if (error) throw error;
      setList((data || []) as UsulanDesa[]);
    } catch (e: any) {
      console.error('Gagal memuat usulan desa:', e);
      showToast('Gagal memuat data usulan. Pastikan tabel usulan_desas sudah dibuat.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const yearsFromData = useMemo(() => {
    const years = new Set<string>();
    list.forEach(u => {
      const match = (u.kode_usulan || '').match(/U-(\d{4})-(\d{3})/);
      if (match) years.add(match[1]);
    });
    if (years.size === 0) years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [list]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return list.filter(u => {
      if (q) {
        const haystack = `${u.uraian_usulan} ${u.lokasi_rt_rw || ''} ${u.kode_usulan} ${u.pengusul || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filterTahun) {
        const match = (u.kode_usulan || '').match(/U-(\d{4})-/);
        if (!match || match[1] !== filterTahun) return false;
      }
      if (filterKategori && u.kategori !== filterKategori) return false;
      if (filterStatus && u.status_terakomodir !== filterStatus) return false;
      return true;
    });
  }, [list, searchQuery, filterTahun, filterKategori, filterStatus]);

  const allSelected = filtered.length > 0 && filtered.every(u => selectedIds.has(u.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  useEffect(() => {
    if (masterCheckRef.current) {
      masterCheckRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  // ── Deteksi usulan serupa (pairwise) ──
  const similarMap = useMemo(() => {
    const map: Record<string, UsulanDesa[]> = {};
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (tokenOverlapSimilarity(a.uraian_usulan, b.uraian_usulan) >= SIMILARITY_THRESHOLD) {
          (map[a.id] = map[a.id] || []).push(b);
          (map[b.id] = map[b.id] || []).push(a);
        }
      }
    }
    return map;
  }, [list]);

  // ── Metrics ──
  const metricTotal = list.length;
  const metricBelum = list.filter(u => u.status_terakomodir === 'Belum').length;
  const metricRkpdes = list.filter(u => (u.diteruskan_tags || []).some(t => (t || '').toLowerCase().includes('rkpdes'))).length;
  const metricMusrenbang = list.filter(u => (u.diteruskan_tags || []).some(t => (t || '').toLowerCase().includes('musrenbang'))).length;

  const kodeSektorColor = (kategori: string) => {
    switch (kategori) {
      case 'Infrastruktur': return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
      case 'Ekonomi': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'Sosial/Kesehatan': return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      case 'Pemerintahan': return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
      case 'Pemberdayaan': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const statusTerakomodirBadge = (status: string) => {
    if (status === 'Belum') return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    if (status === 'Ditolak') return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    if (status.toLowerCase().startsWith('desa')) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    if (status.toLowerCase().startsWith('kab')) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const tagColor = (tag: string) => {
    const t = (tag || '').toLowerCase();
    if (t.includes('rkpdes')) return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    if (t.includes('musrenbang')) return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  };

  const openNewModal = () => {
    setEditing(null);
    setForm({
      kode_usulan: '',
      uraian_usulan: '',
      kategori: 'Infrastruktur',
      lokasi_rt_rw: '',
      pengusul: '',
      diteruskan_tags: [] as string[],
      status_terakomodir: 'Belum',
      skala_prioritas: '',
      keterangan: '',
      foto_url: '',
      google_drive_file_id: '',
      google_drive_view_url: '',
      google_drive_download_url: '',
    });
    setShowModal(true);
  };

  const openEditModal = (u: UsulanDesa) => {
    setEditing(u);
    setForm({
      kode_usulan: u.kode_usulan,
      uraian_usulan: u.uraian_usulan,
      kategori: u.kategori,
      lokasi_rt_rw: u.lokasi_rt_rw || '',
      pengusul: u.pengusul || '',
      diteruskan_tags: [...(u.diteruskan_tags || [])],
      status_terakomodir: u.status_terakomodir,
      skala_prioritas: u.skala_prioritas != null ? String(u.skala_prioritas) : '',
      keterangan: u.keterangan || '',
      foto_url: u.foto_url || '',
      google_drive_file_id: u.google_drive_file_id || '',
      google_drive_view_url: u.google_drive_view_url || '',
      google_drive_download_url: u.google_drive_download_url || '',
    });
    setShowModal(true);
  };

  // ── Auto ID Generator: sekuensial per tahun, dicek langsung ke database ──
  const generateKodeUsulan = async (tahun: string): Promise<string> => {
    const prefix = `U-${tahun}-`;
    let max = 0;
    const bump = (k: string | null | undefined) => {
      if (k && k.startsWith(prefix)) {
        const n = parseInt(k.slice(prefix.length), 10);
        if (!isNaN(n)) max = Math.max(max, n);
      }
    };
    list.forEach(u => bump(u.kode_usulan));
    try {
      const tenantId = await resolveCurrentTenant();
      let builder = supabase.from('usulan_desas').select('kode_usulan').like('kode_usulan', `${prefix}%`);
      if (tenantId) builder = builder.eq('tenant_id', tenantId);
      const { data } = await builder;
      (data || []).forEach(r => bump(r.kode_usulan));
    } catch {
      // fallback ke list lokal jika kueri gagal
    }
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploadingPhoto(true);
      const file = e.target.files[0];
      const { blob: compressedBlob } = await compressImage(file);
      const fileName = `usulan-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;

      // Unggah ke Supabase Storage
      let storageFileId = '';
      let storageViewUrl = '';
      let storageDownloadUrl = '';
      try {
        const bucketName = localStorage.getItem('supabase_storage_bucket') || 'buku-tamu';
        const storageResult = await uploadToSupabaseStorage(new File([compressedBlob], fileName, { type: 'image/jpeg' }), bucketName);
        storageFileId = storageResult.fileId;
        storageViewUrl = storageResult.viewUrl;
        storageDownloadUrl = storageResult.downloadUrl;
      } catch (storageErr: any) {
        console.warn('Supabase Storage upload skipped:', storageErr?.message);
      }

      // Fallback tetap unggah ke storage Supabase agar preview tersedia di semua kondisi
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(fileName, compressedBlob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('public-assets').getPublicUrl(fileName);
      setForm(prev => ({
        ...prev,
        foto_url: publicUrl,
        google_drive_file_id: storageFileId,
        google_drive_view_url: storageViewUrl,
        google_drive_download_url: storageDownloadUrl,
      }));
      showToast(storageViewUrl ? 'Foto berhasil diunggah ke Supabase Storage' : 'Foto berhasil diunggah.', 'success');
      e.target.value = '';
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      showToast('Gagal mengunggah foto.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!form.uraian_usulan.trim()) {
      showToast('Uraian usulan wajib diisi.', 'error');
      return;
    }
    setSaving(true);
    try {
      const tenantId = await resolveCurrentTenant();
      const tahun = String(new Date().getFullYear());
      const kode = form.kode_usulan || await generateKodeUsulan(tahun);
      const payload = {
        tenant_id: tenantId,
        kode_usulan: kode,
        uraian_usulan: form.uraian_usulan.trim(),
        kategori: form.kategori,
        lokasi_rt_rw: form.lokasi_rt_rw.trim() || null,
        pengusul: form.pengusul.trim() || null,
        diteruskan_tags: form.diteruskan_tags,
        status_terakomodir: form.status_terakomodir,
        skala_prioritas: form.skala_prioritas ? parseInt(form.skala_prioritas, 10) : null,
        keterangan: form.keterangan.trim() || null,
        foto_url: form.foto_url || null,
        google_drive_file_id: form.google_drive_file_id || null,
        google_drive_view_url: form.google_drive_view_url || null,
        google_drive_download_url: form.google_drive_download_url || null,
      };

      if (editing) {
        const { error } = await supabase.from('usulan_desas').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Usulan berhasil diperbarui.', 'success');
      } else {
        const { error } = await supabase.from('usulan_desas').insert(payload);
        if (error) throw error;
        showToast(`Usulan baru ${kode} berhasil disimpan.`, 'success');
      }

      // Deteksi usulan serupa saat menambah/mengedit
      const similar = findSimilarUsulan(
        list.filter(u => !editing || u.id !== editing.id),
        { uraian_usulan: form.uraian_usulan } as UsulanDesa
      );
      if (similar.length > 0) {
        showToast(`Perhatian: ${similar.length} usulan lain berpotensi serupa (mis. ${similar[0].kode_usulan}).`, 'info');
      }

      setShowModal(false);
      loadData();
    } catch (e: any) {
      console.error('Save usulan error:', e);
      showToast(e?.message || 'Gagal menyimpan usulan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: UsulanDesa) => {
    if (!window.confirm(`Hapus usulan ${u.kode_usulan}?`)) return;
    try {
      const { error } = await supabase.from('usulan_desas').delete().eq('id', u.id);
      if (error) throw error;
      showToast('Usulan dihapus.', 'success');
      loadData();
    } catch (e: any) {
      showToast(e?.message || 'Gagal menghapus usulan.', 'error');
    }
  };

  const toggleTag = (tag: string) => {
    setForm(prev => {
      const has = prev.diteruskan_tags.includes(tag);
      return { ...prev, diteruskan_tags: has ? prev.diteruskan_tags.filter(t => t !== tag) : [...prev.diteruskan_tags, tag] };
    });
  };

  // ── Pipeline Workflow Actions ──
  const openPipeline = (u: UsulanDesa, action: 'rkpdes' | 'musrenbang' | 'status') => {
    setPipelineTarget(u);
    setPipelineAction(action);
    setPipelineYear(String(new Date().getFullYear()));
    setPipelinePriority(u.skala_prioritas != null ? String(u.skala_prioritas) : '');
    setPipelineStatus(u.status_terakomodir);
  };

  const savePipeline = async () => {
    if (!pipelineTarget) return;
    setPipelineSaving(true);
    try {
      const tags = [...(pipelineTarget.diteruskan_tags || [])];
      let status = pipelineTarget.status_terakomodir;
      const payload: Record<string, any> = {};

      if (pipelineAction === 'rkpdes') {
        const tag = `RKPDes ${pipelineYear}`;
        if (!tags.some(t => (t || '').toLowerCase().includes('rkpdes'))) tags.push(tag);
        payload.diteruskan_tags = tags;
      } else if (pipelineAction === 'musrenbang') {
        const tag = `Musrenbang ${pipelineYear}`;
        if (!tags.some(t => (t || '').toLowerCase().includes('musrenbang'))) tags.push(tag);
        payload.diteruskan_tags = tags;
        payload.skala_prioritas = pipelinePriority ? parseInt(pipelinePriority, 10) : null;
      } else if (pipelineAction === 'status') {
        status = pipelineStatus;
        payload.status_terakomodir = status;
      }

      const { error } = await supabase.from('usulan_desas').update(payload).eq('id', pipelineTarget.id);
      if (error) throw error;

      const label = pipelineAction === 'rkpdes' ? 'Tarik ke RKPDes' : pipelineAction === 'musrenbang' ? 'Usulkan ke Musrenbang' : 'Status Terakomodir';
      showToast(`${label} berhasil disimpan untuk ${pipelineTarget.kode_usulan}.`, 'success');
      setPipelineTarget(null);
      setPipelineAction(null);
      loadData();
    } catch (e: any) {
      console.error('Pipeline update error:', e);
      showToast(e?.message || 'Gagal menyimpan aksi pipeline.', 'error');
    } finally {
      setPipelineSaving(false);
    }
  };

  // ── Bulk Selection ──
  const toggleAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        filtered.forEach(u => next.delete(u.id));
      } else {
        filtered.forEach(u => next.add(u.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Hapus ${ids.length} usulan terpilih secara massal? Tindakan ini tidak dapat dibatalkan.`)) return;
    setBulkBusy(true);
    try {
      const { error } = await supabase.from('usulan_desas').delete().in('id', ids);
      if (error) throw error;
      showToast(`${ids.length} usulan berhasil dihapus.`, 'success');
      setSelectedIds(new Set());
      loadData();
    } catch (e: any) {
      showToast(e?.message || 'Gagal menghapus usulan masal.', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkSetTags = async (tag: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const { data, error } = await supabase.from('usulan_desas').select('*').in('id', ids);
      if (error) throw error;
      for (const item of (data || []) as UsulanDesa[]) {
        const tags = [...(item.diteruskan_tags || [])];
        if (!tags.some(t => (t || '').toLowerCase() === tag.toLowerCase())) tags.push(tag);
        const { error: uErr } = await supabase.from('usulan_desas').update({ diteruskan_tags: tags }).eq('id', item.id);
        if (uErr) throw uErr;
      }
      showToast(`${ids.length} usulan ditandai "${tag}".`, 'success');
      setBulkStatusOpen(false);
      setSelectedIds(new Set());
      loadData();
    } catch (e: any) {
      console.error('Bulk set tags error:', e);
      showToast(e?.message || 'Gagal mengubah status masal.', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  // ── Export & Print ──
  const exportExcel = () => {
    const rows = filtered.map(u => ({
      'ID Usulan': u.kode_usulan,
      'Uraian Usulan': u.uraian_usulan,
      'Kategori': u.kategori,
      'Lokasi RT/RW': u.lokasi_rt_rw || '',
      'Pengusul': u.pengusul || '',
      'Diteruskan': (u.diteruskan_tags || []).join('; '),
      'Status Terakomodir': u.status_terakomodir,
      'Skala Prioritas': u.skala_prioritas ?? '',
      'Keterangan': u.keterangan || '',
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Usulan Desa');
    writeFile(wb, `usulan-desa-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('File Excel berhasil diunduh.', 'success');
  };

  const exportPrintMusrenbang = () => {
    const tahun = String(new Date().getFullYear());
    const filteredM = list
      .filter(u => (u.diteruskan_tags || []).some(t => (t || '').toLowerCase().includes('musrenbang')))
      .sort((a, b) => (a.skala_prioritas ?? 99) - (b.skala_prioritas ?? 99));
    if (filteredM.length === 0) {
      showToast('Belum ada usulan ber-tag Musrenbang.', 'error');
      return;
    }
    const rowsHtml = filteredM.map((u, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${u.kode_usulan}</td>
        <td>${u.uraian_usulan}</td>
        <td>${u.kategori}</td>
        <td>${u.lokasi_rt_rw || '-'}</td>
        <td>${u.pengusul || '-'}</td>
        <td style="text-align:center">${u.skala_prioritas ?? '-'}</td>
        <td>${u.status_terakomodir}</td>
      </tr>
    `).join('');
    const doc = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Daftar Usulan Musrenbang ${tahun}</title>
<style>
@page { size: A4 landscape; margin: 15mm; }
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #111; }
.header { text-align: center; margin-bottom: 18px; }
.header h1 { font-size: 16px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.header p { margin: 2px 0; font-size: 12px; }
table { width: 100%; border-collapse: collapse; font-size: 11px; }
th, td { border: 1px solid #333; padding: 6px 8px; vertical-align: top; }
th { background: #e5e7eb; font-weight: 700; text-align: left; }
@media print { thead { display: table-header-group; } }
</style>
</head>
<body>
<div class="header">
  <h1>Daftar Usulan Musrenbang Desa ${tahun}</h1>
  <p>Diurutkan berdasarkan skala prioritas</p>
  <p>Jumlah: ${filteredM.length} usulan &nbsp;|&nbsp; Dicetak: ${new Date().toLocaleString('id-ID')}</p>
</div>
<table>
<thead>
<tr>
  <th style="width:36px">No</th>
  <th style="width:90px">ID Usulan</th>
  <th>Uraian Usulan</th>
  <th style="width:110px">Kategori</th>
  <th style="width:120px">Lokasi RT/RW</th>
  <th style="width:110px">Pengusul</th>
  <th style="width:56px">Prioritas</th>
  <th style="width:110px">Status</th>
</tr>
</thead>
<tbody>
${rowsHtml}
</tbody>
</table>
</body>
</html>`;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const idoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (idoc) {
      idoc.open();
      idoc.write(doc);
      idoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 300);
    }
  };

  return (
    <div className="pb-24 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Usulan Desa</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Master data usulan pembangunan — RKPDes, Musrenbang, dan penyerapan kabupaten</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors border border-sky-200 dark:border-sky-800 cursor-pointer"
            title="Impor data dari file Excel/CSV"
          >
            <Upload size={18} /> Impor dari Excel/CSV
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700 cursor-pointer"
            title="Unduh data terfilter sebagai Excel"
          >
            <Download size={18} /> Export Excel
          </button>
          <button
            onClick={exportPrintMusrenbang}
            className="flex items-center gap-2 px-5 py-3 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-sm dark:shadow-none cursor-pointer"
            title="Cetak daftar usulan Musrenbang dalam A4 landscape"
          >
            <Printer size={18} /> Cetak Musrenbang
          </button>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors shadow-sm dark:shadow-none cursor-pointer"
          >
            <PlusCircle size={18} /> Tambah Usulan Baru
          </button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center"><ListChecks className="w-5 h-5" /></span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white mt-3">{metricTotal}</p>
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-1">Total Usulan</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></span>
            <span className="text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 px-2 py-1 rounded-full">Belum Terakomodir</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white mt-3">{metricBelum}</p>
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-1">Menunggu Akomodasi</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center"><Layers className="w-5 h-5" /></span>
            <span className="text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 px-2 py-1 rounded-full">RKPDes</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white mt-3">{metricRkpdes}</p>
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-1">Masuk RKPDes</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 flex items-center justify-center"><HeartHandshake className="w-5 h-5" /></span>
            <span className="text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-1 rounded-full">Musrenbang</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white mt-3">{metricMusrenbang}</p>
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-1">Diteruskan ke Musrenbang</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 shadow-sm dark:shadow-none flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari judul usulan / lokasi..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <select
          value={filterTahun}
          onChange={e => setFilterTahun(e.target.value)}
          className="px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500"
        >
          <option value="">Semua Tahun</option>
          {yearsFromData.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={filterKategori}
          onChange={e => setFilterKategori(e.target.value)}
          className="px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500"
        >
          <option value="">Semua Sektor</option>
          {KATEGORI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500"
        >
          <option value="">Semua Status Terakomodir</option>
          {STATUS_TERAKOMODIR_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Spreadsheet Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm bg-white">
          <table className="w-full text-left min-w-[1408px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40">
                <th className="w-12 px-4 py-4 text-center shrink-0">
                  <input
                    ref={masterCheckRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    title="Pilih semua baris terfilter"
                  />
                </th>
                <th className="min-w-[150px] px-4 py-4 whitespace-nowrap shrink-0 text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">ID Usulan</th>
                <th className="min-w-[340px] max-w-[550px] px-6 py-4 text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Uraian Usulan &amp; Lokasi</th>
                <th className="min-w-[140px] px-4 py-4 whitespace-nowrap text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Sektor</th>
                <th className="min-w-[180px] px-4 py-4 whitespace-nowrap text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status Diteruskan</th>
                <th className="min-w-[180px] px-4 py-4 whitespace-nowrap text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Terakomodir</th>
                <th className="min-w-[100px] px-4 py-4 whitespace-nowrap text-center text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Prioritas</th>
                <th className="min-w-[150px] px-4 py-4 whitespace-nowrap text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Keterangan/Foto</th>
                <th className="min-w-[120px] px-4 py-4 whitespace-nowrap text-right shrink-0 text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                    <p className="text-sm text-gray-500 mt-3 font-semibold">Memuat data usulan...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="w-14 h-14 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FolderOpen className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-sm font-bold text-gray-500 dark:text-slate-400">Belum ada data usulan</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Klik tombol "Tambah Usulan Baru" untuk mulai merekam usulan pembangunan desa.</p>
                  </td>
                </tr>
              ) : filtered.map(u => {
                const isSelected = selectedIds.has(u.id);
                return (
                  <tr
                    key={u.id}
                    onClick={() => setDetailTarget(u)}
                    className={`border-b border-gray-50 dark:border-slate-800/60 transition-colors cursor-pointer hover:bg-slate-50/80 group ${isSelected ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'}`}
                    title="Klik untuk lihat detail usulan"
                  >
                    <td className="w-12 px-4 py-4 text-center shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(u.id)}
                        onClick={e => e.stopPropagation()}
                        className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        title="Pilih usulan"
                      />
                    </td>
                    <td className="min-w-[150px] px-4 py-4 whitespace-nowrap shrink-0">
                      <span className="whitespace-nowrap inline-block text-emerald-700 dark:text-emerald-300 text-xs font-mono font-semibold">{u.kode_usulan}</span>
                      <span className="block text-[10px] text-gray-400 mt-0.5">{new Date(u.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </td>
                    <td className="min-w-[340px] max-w-[550px] px-6 py-4">
                      <p
                        className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
                        title="Klik untuk lihat detail usulan"
                      >
                        {u.uraian_usulan}
                      </p>
                      {u.lokasi_rt_rw && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {u.lokasi_rt_rw}
                        </p>
                      )}
                      {u.pengusul && (
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" /> {u.pengusul}
                        </p>
                      )}
                      {similarMap[u.id] && similarMap[u.id].length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSimilarTarget(u); }}
                          className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-[10px] font-black hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors cursor-pointer"
                          title="Klik untuk melihat daftar usulan serupa"
                        >
                          <AlertTriangle className="w-3 h-3" /> {similarMap[u.id].length} Usulan Serupa
                        </button>
                      )}
                    </td>
                    <td className="min-w-[140px] px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap ${kodeSektorColor(u.kategori)}`}>{u.kategori}</span>
                    </td>
                    <td className="min-w-[180px] px-4 py-4 whitespace-nowrap">
                      {(u.diteruskan_tags || []).length === 0 ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {(u.diteruskan_tags || []).map((tag, i) => (
                            <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${tagColor(tag)}`}>
                              <Link2 className="w-3 h-3" /> {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="min-w-[180px] px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap ${statusTerakomodirBadge(u.status_terakomodir)}`}>
                        {u.status_terakomodir === 'Belum' ? <AlertTriangle className="w-3 h-3" /> : u.status_terakomodir === 'Ditolak' ? <Ban className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {u.status_terakomodir}
                      </span>
                    </td>
                    <td className="min-w-[100px] px-4 py-4 whitespace-nowrap text-center">
                      {u.skala_prioritas ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm font-black text-amber-600 dark:text-amber-400">{u.skala_prioritas}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(n => (
                              <span key={n} className={`w-1.5 h-4 rounded-sm ${n <= u.skala_prioritas ? 'bg-amber-400' : 'bg-gray-200 dark:bg-slate-700'}`} />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="min-w-[150px] px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {u.foto_url ? (
                          <img
                            src={u.foto_url}
                            alt="Dokumentasi lokasi"
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-slate-700 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); setDetailTarget(u); }}
                            title="Lihat foto"
                          />
                        ) : (
                          <span className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                          </span>
                        )}
                        <div className="min-w-0">
                          {u.keterangan ? (
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 max-w-[160px]">{u.keterangan}</p>
                          ) : (
                            <span className="text-[11px] text-gray-300 dark:text-slate-600">Tidak ada</span>
                          )}
                          {u.google_drive_file_id && (
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(u.google_drive_view_url || u.google_drive_download_url || undefined, '_blank'); }}
                              className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[9px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                              title="Buka lampiran di Storage"
                            >
                              <FolderOpen className="w-2.5 h-2.5" /> Lampiran
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="min-w-[120px] px-4 py-4 whitespace-nowrap text-right shrink-0">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailTarget(u); }}
                          title="Lihat detail"
                          className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-700 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(u); }}
                          title="Edit"
                          className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === u.id ? null : u.id); }}
                            title="Aksi lainnya"
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${openMenuId === u.id ? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === u.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                              <div className="absolute right-0 top-full z-50 mt-1 w-56 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xl py-1.5" onClick={(e) => e.stopPropagation()}>
                                <DropdownItem icon={Send} color="text-purple-600 dark:text-purple-400" label="Tarik ke RKPDes" onClick={() => { setOpenMenuId(null); openPipeline(u, 'rkpdes'); }} />
                                <DropdownItem icon={Star} color="text-blue-600 dark:text-blue-400" label="Usulkan ke Musrenbang" onClick={() => { setOpenMenuId(null); openPipeline(u, 'musrenbang'); }} />
                                <DropdownItem icon={CircleDollarSign} color="text-amber-600 dark:text-amber-400" label="Ubah Status Terakomodir" onClick={() => { setOpenMenuId(null); openPipeline(u, 'status'); }} />
                                <div className="my-1 border-t border-gray-50 dark:border-slate-800" />
                                <DropdownItem icon={Trash2} color="text-rose-600 dark:text-rose-400" label="Hapus Usulan" onClick={() => { setOpenMenuId(null); handleDelete(u); }} />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400 font-semibold">
            Menampilkan {filtered.length} dari {list.length} usulan{selectedIds.size > 0 && <span className="text-emerald-600 dark:text-emerald-400"> · {selectedIds.size} terpilih</span>}
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9990] w-[95vw] max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap justify-center rounded-2xl bg-slate-900/95 dark:bg-black/90 backdrop-blur border border-white/10 shadow-2xl px-4 py-3">
            <span className="text-sm font-black text-white whitespace-nowrap">{selectedIds.size} Usulan Terpilih</span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '🗑️'} Hapus Masal ({selectedIds.size})
            </button>
            <button
              onClick={() => setBulkStatusOpen(true)}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white bg-sky-600 hover:bg-sky-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              🏷️ Ubah Status Masal
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-2 rounded-xl text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
              title="Batalkan pilihan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                {editing ? `Edit ${editing.kode_usulan}` : 'Tambah Usulan Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Uraian Usulan <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.uraian_usulan}
                  onChange={e => setForm(prev => ({ ...prev, uraian_usulan: e.target.value }))}
                  placeholder="Contoh: Peningkatan Jalan Usaha Tani Dusun 1"
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Kategori</label>
                  <select
                    value={form.kategori}
                    onChange={e => setForm(prev => ({ ...prev, kategori: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 bg-white dark:bg-slate-900"
                  >
                    {KATEGORI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Prioritas (Skala)</label>
                  <select
                    value={form.skala_prioritas}
                    onChange={e => setForm(prev => ({ ...prev, skala_prioritas: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 bg-white dark:bg-slate-900"
                  >
                    <option value="">Tidak ditentukan</option>
                    {PRIORITAS_OPTIONS.map(n => <option key={n} value={String(n)}>{n} — Prioritas {n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Lokasi (RT/RW / Dusun)</label>
                  <input
                    type="text"
                    value={form.lokasi_rt_rw}
                    onChange={e => setForm(prev => ({ ...prev, lokasi_rt_rw: e.target.value }))}
                    placeholder="Contoh: Jl. Serba Guna RT.02 / Dusun 1"
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Pengusul</label>
                  <input
                    type="text"
                    value={form.pengusul}
                    onChange={e => setForm(prev => ({ ...prev, pengusul: e.target.value }))}
                    placeholder="Warga / kelompok tani / RT"
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Status Diteruskan (Multi-tag)</label>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        form.diteruskan_tags.includes(tag)
                          ? tagColor(tag) + ' ring-2 ring-current/20'
                          : 'bg-gray-50 dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300'
                      }`}
                    >
                      {form.diteruskan_tags.includes(tag) && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Status Terakomodir</label>
                <select
                  value={form.status_terakomodir}
                  onChange={e => setForm(prev => ({ ...prev, status_terakomodir: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 bg-white dark:bg-slate-900"
                >
                  {STATUS_TERAKOMODIR_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Keterangan</label>
                <textarea
                  value={form.keterangan}
                  onChange={e => setForm(prev => ({ ...prev, keterangan: e.target.value }))}
                  rows={3}
                  placeholder="Catatan tambahan / hasil musyawarah..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-slate-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Foto Lokasi (Opsional)</label>
                {form.foto_url ? (
                  <div className="flex items-center gap-3">
                    <img src={form.foto_url} alt="Foto lokasi" className="w-24 h-24 rounded-xl object-cover border border-gray-200 dark:border-slate-700" />
                    <div className="flex flex-col gap-2">
                      {form.google_drive_view_url && (
                        <a
                          href={form.google_drive_view_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                        >
                          <FolderOpen className="w-3.5 h-3.5" /> Lihat Lampiran
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, foto_url: '', google_drive_file_id: '', google_drive_view_url: '', google_drive_download_url: '' }))}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all block">
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} disabled={uploadingPhoto} />
                    {uploadingPhoto ? (
                      <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-700">
                        <Loader2 className="w-4 h-4 animate-spin" /> Mengunggah foto...
                      </div>
                    ) : (
                      <div className="text-gray-400 dark:text-slate-500">
                        <Upload className="w-6 h-6 mx-auto mb-1" />
                        <p className="text-sm font-bold">Klik untuk unggah foto lokasi</p>
                        <p className="text-[11px]">JPG / PNG / WebP</p>
                      </div>
                    )}
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white bg-emerald-700 hover:bg-emerald-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                {editing ? 'Simpan Perubahan' : 'Simpan Usulan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Workflow Modal */}
      {pipelineTarget && pipelineAction && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                {pipelineAction === 'rkpdes' ? 'Tarik ke RKPDes' : pipelineAction === 'musrenbang' ? 'Usulkan ke Musrenbang' : 'Ubah Status Terakomodir'}
              </h3>
              <button onClick={() => setPipelineTarget(null)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-300">{pipelineTarget.kode_usulan}</p>
                <p className="text-sm font-bold text-gray-800 dark:text-slate-100 mt-1">{pipelineTarget.uraian_usulan}</p>
              </div>

              {pipelineAction !== 'status' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Tahun {pipelineAction === 'rkpdes' ? 'RKPDes' : 'Musrenbang'}
                  </label>
                  <div className="flex gap-2">
                    {[String(new Date().getFullYear()), String(new Date().getFullYear() + 1)].map(y => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setPipelineYear(y)}
                        className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-black border transition-all cursor-pointer ${
                          pipelineYear === y
                            ? pipelineAction === 'rkpdes'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pipelineAction === 'musrenbang' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Skala Prioritas</label>
                  <div className="flex gap-2 flex-wrap">
                    {PRIORITAS_OPTIONS.map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPipelinePriority(String(n))}
                        className={`flex items-center justify-center gap-1 w-11 h-11 rounded-xl text-sm font-black border transition-all cursor-pointer ${
                          pipelinePriority === String(n)
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5" /> {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pipelineAction === 'status' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Status Terakomodir</label>
                  <div className="flex flex-col gap-2">
                    {STATUS_TERAKOMODIR_OPTIONS.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPipelineStatus(s)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                          pipelineStatus === s
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700'
                        }`}
                      >
                        {s}
                        {pipelineStatus === s && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pipelineAction === 'musrenbang' && !pipelinePriority && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Pilih skala prioritas terlebih dahulu.</p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => setPipelineTarget(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={savePipeline}
                disabled={pipelineSaving || (pipelineAction === 'musrenbang' && !pipelinePriority)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white bg-emerald-700 hover:bg-emerald-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {pipelineSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Status Modal */}
      {bulkStatusOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Tags className="w-5 h-5 text-sky-600 dark:text-sky-400" /> Ubah Status Masal
              </h3>
              <button onClick={() => setBulkStatusOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
                Terapkan label Diteruskan pada <span className="font-black text-gray-900 dark:text-white">{selectedIds.size} usulan</span> terpilih secara bersamaan:
              </p>
              <div className="flex flex-col gap-2">
                {TAG_OPTIONS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleBulkSetTags(tag)}
                    disabled={bulkBusy}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold border transition-all cursor-pointer disabled:opacity-50 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                  >
                    <span className="flex items-center gap-2"><Tags className="w-4 h-4 text-sky-600 dark:text-sky-400" /> {tag}</span>
                    {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => setBulkStatusOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Similar Usulan Modal */}
      {similarTarget && similarMap[similarTarget.id] && similarMap[similarTarget.id].length > 0 && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" /> Usulan Serupa
              </h3>
              <button onClick={() => setSimilarTarget(null)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Usulan yang diperiksa: <span className="font-black text-gray-900 dark:text-white">{similarTarget.uraian_usulan}</span>
              </p>
              <div className="space-y-2">
                {similarMap[similarTarget.id].map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSimilarTarget(null); setDetailTarget(s); }}
                    className="w-full text-left bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 border border-gray-100 dark:border-slate-700 hover:border-orange-300 transition-colors cursor-pointer"
                  >
                    <p className="text-[10px] font-mono font-black text-emerald-700 dark:text-emerald-300">{s.kode_usulan}</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-100 mt-0.5">{s.uraian_usulan}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {s.lokasi_rt_rw || '—'} · Kemiripan {Math.round(tokenOverlapSimilarity(similarTarget.uraian_usulan, s.uraian_usulan) * 100)}%
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailTarget && (
        <UsulanDetailModal
          usulan={detailTarget}
          allUsulan={list}
          onClose={() => setDetailTarget(null)}
          onEdit={(u) => { setDetailTarget(null); openEditModal(u); }}
        />
      )}

      {/* Import Wizard */}
      <ImportUsulanWizard
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={loadData}
        existingKodes={list.map(u => u.kode_usulan)}
        existingItems={list}
      />
    </div>
  );
}
