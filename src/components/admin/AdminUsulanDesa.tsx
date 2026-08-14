import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, PlusCircle, Edit2, Trash2, Image as ImageIcon, FolderOpen,
  ListChecks, AlertTriangle, Layers, Upload, X, Loader2, Link2, MapPin, User,
  CircleDollarSign, HeartHandshake, CheckCircle2, Ban, Send, Printer, Download, Star
} from 'lucide-react';
import { utils } from 'xlsx';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { uploadToVillageGoogleDrive, getVillageGoogleDriveFolderId } from '../../utils/googleDriveUpload';
import ImportUsulanWizard from './ImportUsulanWizard';

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

  const generateKodeUsulan = async (tahun: string): Promise<string> => {
    const prefix = `U-${tahun}-`;
    const matches = list
      .map(u => u.kode_usulan)
      .filter(k => (k || '').startsWith(prefix))
      .map(k => parseInt((k || '').slice(prefix.length), 10))
      .filter(n => !isNaN(n));
    const next = (matches.length > 0 ? Math.max(...matches) : 0) + 1;
    return `${prefix}${String(next).padStart(3, '0')}`;
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploadingPhoto(true);
      const file = e.target.files[0];
      const { blob: compressedBlob } = await compressImage(file);
      const fileName = `usulan-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;

      // Coba unggah ke Google Drive desa jika sudah dikonfigurasi
      let gdriveFileId = '';
      let gdriveViewUrl = '';
      let gdriveDownloadUrl = '';
      try {
        const folderId = await getVillageGoogleDriveFolderId();
        if (folderId) {
          const driveResult = await uploadToVillageGoogleDrive(new File([compressedBlob], fileName, { type: 'image/jpeg' }), folderId);
          gdriveFileId = driveResult.fileId;
          gdriveViewUrl = driveResult.viewUrl;
          gdriveDownloadUrl = driveResult.downloadUrl;
        }
      } catch (driveErr: any) {
        console.warn('Google Drive upload skipped:', driveErr?.message);
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
        google_drive_file_id: gdriveFileId,
        google_drive_view_url: gdriveViewUrl,
        google_drive_download_url: gdriveDownloadUrl,
      }));
      showToast(gdriveViewUrl ? 'Foto berhasil diunggah ke Google Drive Desa ✓' : 'Foto berhasil diunggah (Google Drive belum dikonfigurasi).', 'success');
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
    utils.writeFile(wb, `usulan-desa-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1100px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40">
                <th className="px-4 py-3 text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">ID Usulan</th>
                <th className="px-4 py-3 text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Uraian Usulan &amp; Lokasi</th>
                <th className="px-4 py-3 text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Sektor</th>
                <th className="px-4 py-3 text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status Diteruskan</th>
                <th className="px-4 py-3 text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Terakomodir</th>
                <th className="px-4 py-3 text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Prioritas</th>
                <th className="px-4 py-3 text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Keterangan/Foto</th>
                <th className="px-4 py-3 text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                    <p className="text-sm text-gray-500 mt-3 font-semibold">Memuat data usulan...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="w-14 h-14 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FolderOpen className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-sm font-bold text-gray-500 dark:text-slate-400">Belum ada data usulan</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Klik tombol "Tambah Usulan Baru" untuk mulai merekam usulan pembangunan desa.</p>
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50/40 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-300">{u.kode_usulan}</span>
                    <span className="block text-[10px] text-gray-400 mt-0.5">{new Date(u.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </td>
                  <td className="px-4 py-3 min-w-[280px]">
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-100 leading-snug">{u.uraian_usulan}</p>
                    {u.lokasi_rt_rw && (
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {u.lokasi_rt_rw}
                      </p>
                    )}
                    {u.pengusul && (
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                        <User className="w-3 h-3" /> {u.pengusul}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap ${kodeSektorColor(u.kategori)}`}>{u.kategori}</span>
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap ${statusTerakomodirBadge(u.status_terakomodir)}`}>
                      {u.status_terakomodir === 'Belum' ? <AlertTriangle className="w-3 h-3" /> : u.status_terakomodir === 'Ditolak' ? <Ban className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      {u.status_terakomodir}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.skala_prioritas ? (
                      <div className="flex items-center gap-1">
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.foto_url ? (
                        <img src={u.foto_url} alt="Dokumentasi lokasi" className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-slate-700 cursor-pointer" onClick={() => window.open(u.google_drive_view_url || u.foto_url, '_blank')} title="Lihat foto" />
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
                            onClick={() => window.open(u.google_drive_view_url || u.google_drive_download_url || undefined, '_blank')}
                            className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[9px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                            title="Buka lampiran di Google Drive"
                          >
                            <FolderOpen className="w-2.5 h-2.5" /> Google Drive Desa
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openPipeline(u, 'rkpdes')}
                          title="Tarik ke RKPDes"
                          className="p-1.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openPipeline(u, 'musrenbang')}
                          title="Usulkan ke Musrenbang"
                          className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openPipeline(u, 'status')}
                          title="Ubah Status Terakomodir"
                          className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                        >
                          <CircleDollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(u)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          title="Hapus"
                          className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => openPipeline(u, 'rkpdes')}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
                        >
                          Tarik RKPDes
                        </button>
                        <button
                          onClick={() => openPipeline(u, 'musrenbang')}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          Musrenbang
                        </button>
                        <button
                          onClick={() => openPipeline(u, 'status')}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          Status
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400 font-semibold">
            Menampilkan {filtered.length} dari {list.length} usulan
          </div>
        )}
      </div>

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
                          <FolderOpen className="w-3.5 h-3.5" /> Lihat di Google Drive
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

      {/* Import Wizard */}
      <ImportUsulanWizard
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={loadData}
        existingKodes={list.map(u => u.kode_usulan)}
      />
    </div>
  );
}