import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { showToast } from '../../utils/toast';
import { capitalizeWords } from '../../utils/textUtils';
import ConfirmModal from '../common/ConfirmModal';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import {
  BookOpen, Plus, QrCode, Search, Printer, Download,
  LogIn, Building2, CheckCircle2, X, Trash2, Send, Eye, Pencil
} from 'lucide-react';
import { SAAS_CONFIG } from './surat/AdminSuratMasterTemplate';

interface GuestEntry {
  id: string;
  tenant_id: string;
  nik: string | null;
  nama: string;
  alamat: string | null;
  instansi: string | null;
  keperluan: string;
  tujuan_temu: string | null;
  signature_url?: string | null;
  tanggal_masuk: string;
  tanggal_keluar: string | null;
  status: 'hadir' | 'selesai';
  created_at: string;
}

const KEPERLUAN_OPTIONS = [
  'Mengurus Surat Keterangan',
  'Konsultasi / Pengaduan',
  'Urusan Administrasi',
  'Kunjungan Dinas',
  'Bantuan Sosial',
  'Urusan Tanah / Aset',
  'Silaturahmi',
  'Lainnya',
];

export default function AdminBukuTamu() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [entries, setEntries] = useState<GuestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: '', nama: '' });
  const [showPrintQR, setShowPrintQR] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const qrPrintRef = useRef<HTMLDivElement>(null);
  
  const handlePrintQRContent = useReactToPrint({
    contentRef: qrPrintRef,
    documentTitle: 'Cetak_QR_Kiosk_Buku_Tamu',
  });
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterDate, setFilterDate] = useState(''); // Empty string shows ALL dates by default

  const [showPrintReportModal, setShowPrintReportModal] = useState(false);
  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    nik: '', nama: '', alamat: '', instansi: '', keperluan: KEPERLUAN_OPTIONS[0]
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [viewEntry, setViewEntry] = useState<GuestEntry | null>(null);
  
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase.channel(`kiosk-notif-${tenantId}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        broadcastChannelRef.current = channel;
      }
    });
    return () => {
      supabase.removeChannel(channel);
      broadcastChannelRef.current = null;
    };
  }, [tenantId]);


  const handleSave = () => {
    if (!form.nama.trim()) { showToast('Nama tamu wajib diisi.', 'error'); return; }
    if (!form.keperluan.trim()) { showToast('Keperluan kunjungan wajib diisi.', 'error'); return; }

    if (editId) {
      // Mode edit: simpan langsung ke database, bukan broadcast ke kios.
      const updatePayload: any = {
        nik: form.nik || null,
        nama: form.nama,
        alamat: form.alamat || null,
        instansi: form.instansi || null,
        keperluan: form.keperluan
      };
      supabase.from('guest_book').update(updatePayload).eq('id', editId).then(({ error }) => {
        if (!error) {
          showToast('Data tamu berhasil diperbarui.', 'success');
          fetchEntries();
        } else {
          showToast('Gagal memperbarui data tamu.', 'error');
        }
      });
      setEditId(null);
      setShowModal(false);
      setForm({ nik: '', nama: '', alamat: '', instansi: '', keperluan: KEPERLUAN_OPTIONS[0] });
      return;
    }

    const payload = {
      nik: form.nik,
      nama: form.nama,
      alamat: form.alamat,
      instansi: form.instansi,
      keperluan: form.keperluan
    };

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'incoming-guest',
        payload
      });
    } else {
      // Fallback
      const tempChannel = supabase.channel(`kiosk-notif-${tenantId}`);
      tempChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          tempChannel.send({ type: 'broadcast', event: 'incoming-guest', payload });
        }
        setTimeout(() => { supabase.removeChannel(tempChannel); }, 1000);
      });
    }
    
    showToast('Data berhasil dikirim ke layar Kios.', 'success');
    setShowModal(false);
    setForm({ nik: '', nama: '', alamat: '', instansi: '', keperluan: KEPERLUAN_OPTIONS[0] });
  };

  const fetchEntries = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('guest_book')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('tanggal_masuk', { ascending: false });

      if (filterDate) {
        query = query
          .gte('tanggal_masuk', filterDate + 'T00:00:00')
          .lte('tanggal_masuk', filterDate + 'T23:59:59');
      }

      const { data, error } = await query;
      if (!error && data) setEntries(data);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filterDate]);

  useEffect(() => { 
    resolveCurrentTenant().then(id => {
      if (id) setTenantId(id);
    });
  }, []);

  useEffect(() => { 
    if (tenantId) {
      fetchEntries();
      
      const channel = supabase.channel('admin-bukutamu-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'guest_book',
          filter: `tenant_id=eq.${tenantId}`
        }, () => {
          fetchEntries();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchEntries, tenantId]);



  const handleCheckOut = async (id: string, nama: string) => {
    const { error } = await supabase
      .from('guest_book')
      .update({ status: 'selesai', tanggal_keluar: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      showToast(`${nama} telah check-out.`, 'success');
      fetchEntries();
    }
  };

  const handleDelete = (id: string, nama: string) => {
    setDeleteConfirm({ isOpen: true, id, nama });
  };

  const handleEdit = (entry: GuestEntry) => {
    setEditId(entry.id);
    setForm({
      nik: entry.nik || '',
      nama: entry.nama || '',
      alamat: entry.alamat || '',
      instansi: entry.instansi || '',
      keperluan: entry.keperluan || KEPERLUAN_OPTIONS[0]
    });
    setShowModal(true);
  };

  const executeDelete = async () => {
    const { id, nama } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, id: '', nama: '' });
    const { error } = await supabase.from('guest_book').delete().eq('id', id);
    if (!error) {
      showToast(`${nama} berhasil dihapus.`, 'success');
      fetchEntries();
    } else {
      showToast('Gagal menghapus data tamu.', 'error');
    }
  };

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const matchSearch = (e.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.nik || '').includes(searchQuery) ||
        (e.keperluan || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === 'Semua' || (e.status || '') === filterStatus.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [entries, searchQuery, filterStatus]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = entries.filter(e => e.tanggal_masuk && e.tanggal_masuk.startsWith(todayStr)).length;

  const handlePrintReport = () => {
    setShowPrintReportModal(false);

    const printData = entries.filter(e => {
      if (!e.tanggal_masuk) return true;
      const entryDate = e.tanggal_masuk.split('T')[0];
      if (printStartDate && entryDate < printStartDate) return false;
      if (printEndDate && entryDate > printEndDate) return false;
      return true;
    });

    const logoUrl = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
    const kabupatenName = localStorage.getItem('kop_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan';
    const kecamatanName = localStorage.getItem('kop_kecamatan') || 'Kecamatan Simpur';
    const desaName = localStorage.getItem('kop_desa') || 'Desa';
    const alamatKantor = localStorage.getItem('kop_alamat') || 'Alamat Kantor Pelayanan Desa';
    const kontakKantor = localStorage.getItem('kop_kontak') || '-';
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Laporan Buku Tamu - ${desaName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 0 !important; }
              .thead-spacer { display: table-row !important; }
              .tfoot-footer { display: table-footer-group !important; }
            }
            @media screen {
              .thead-spacer { display: none !important; }
              .tfoot-footer { display: none !important; }
            }
            body { font-family: Arial, sans-serif; color: black; background: white; margin: 0; }
            .content-wrapper { padding: 1.5cm; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid black; padding-bottom: 15px; }
            .title { font-size: 22px; font-weight: bold; text-transform: uppercase; margin: 0 0 5px 0; letter-spacing: 1px; }
            .subtitle { font-size: 14px; margin: 0; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
            th, td { border: 1px solid #000; padding: 10px 12px; font-size: 12px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; font-weight: bold; text-transform: uppercase; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .meta { font-size: 10px; color: #666; margin-top: 3px; display: block; }
          </style>
        </head>
        <body>
          <div class="content-wrapper">
            <div class="header">
            <h1 class="title">LAPORAN BUKU TAMU DIGITAL</h1>
            <p class="subtitle">${desaName.toUpperCase()} - ${printStartDate || printEndDate ? `Periode ${printStartDate || 'Awal'} s/d ${printEndDate || 'Sekarang'}` : 'Semua Riwayat'}</p>
          </div>
          <table>
            <thead>
              <tr class="thead-spacer">
                <th colSpan="6" style="padding:0;margin:0;border:none;background:white;">
                  <div style="height:1.5cm;width:100%;font-size:1px;line-height:1px;color:transparent;background:white;">&nbsp;</div>
                </th>
              </tr>
              <tr>
                <th style="width: 5%">No</th>
                <th style="width: 25%">Nama Lengkap / NIK</th>
                <th style="width: 15%">Instansi / Asal</th>
                <th style="width: 20%">Keperluan & Tujuan</th>
                <th style="width: 20%">Waktu Kunjungan</th>
                <th style="width: 15%">Tanda Tangan</th>
              </tr>
            </thead>
            <tbody>
              ${printData.map((e, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${e.nama}</strong><span class="meta">NIK: ${e.nik || '-'}</span></td>
                  <td>${e.instansi || '-'}</td>
                  <td>${e.keperluan}</td>
                  <td>${fmtTime(e.tanggal_masuk)}<span class="meta">${fmtDate(e.tanggal_masuk)}</span></td>
                  <td style="text-align: center; vertical-align: middle;">
                    ${e.signature_url ? `<img src="${e.signature_url}" style="max-height: 40px; max-width: 80px; object-fit: contain;" alt="TTD"/>` : '-'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot class="tfoot-footer">
              <tr>
                <td colSpan="6" style="border:none;padding-top:8pt;padding-bottom:1.5cm;">
                  <div style="border-top:1px solid #cbd5e1;padding-top:8px;text-align:left;width:100%;">
                    <span style="font-size:9pt;color:#64748b;">Dokumen ini dibuat &amp; dicetak melalui <strong>Sistem DiDesa</strong><br/>Solusi Administrasi &amp; Digitalisasi Desa Modern Indonesia</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printContent);
      doc.close();
      
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.querySelector('#qr-kiosk-svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'QR_Buku_Tamu_DiDesa.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('QR Code berhasil diunduh (Format SVG)', 'success');
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Buku Tamu Digital</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 ml-13">
            {fmtDate(new Date().toISOString())} &bull;
            <span className="font-bold text-emerald-700 ml-1">{todayCount} tamu aktif</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowPrintReportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
          >
            <Printer className="w-4 h-4" />
            Cetak
          </button>
          <button
            onClick={() => setShowPrintQR(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-slate-700 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all"
          >
            <QrCode className="w-4 h-4" />
            Cetak QR Kiosk
          </button>
          <button
            onClick={() => { setForm({ nik: '', nama: '', alamat: '', instansi: '', keperluan: KEPERLUAN_OPTIONS[0] }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white text-sm font-bold rounded-xl hover:bg-emerald-800 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Tamu
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Hari Ini', value: todayCount, color: 'emerald', icon: <BookOpen className="w-5 h-5" /> },
          { label: 'Sedang Hadir', value: entries.filter(e => e.status === 'hadir').length, color: 'blue', icon: <LogIn className="w-5 h-5" /> },
          { label: 'Selesai', value: entries.filter(e => e.status === 'selesai').length, color: 'gray', icon: <CheckCircle2 className="w-5 h-5" /> },
          { label: 'Urusan Surat', value: entries.filter(e => e.keperluan && e.keperluan.toLowerCase().includes('surat')).length, color: 'amber', icon: <Building2 className="w-5 h-5" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none">
            <div className={`w-8 h-8 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 flex items-center justify-center text-${color}-600 dark:text-${color}-400 mb-2`}>
              {icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none mb-4 p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            data-no-cap
            placeholder="Cari nama, NIK, keperluan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 h-10 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="h-10 px-3 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white flex-1 sm:flex-none"
            title="Filter Tanggal Spesifik"
          />
          {filterDate ? (
            <button 
              onClick={() => setFilterDate('')}
              className="h-10 px-3 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors shrink-0"
              title="Tampilkan Semua Tanggal"
            >
              Semua Tanggal
            </button>
          ) : (
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 shrink-0">
              Semua Riwayat Tanggal
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
            <tr>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">No</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tamu</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Instansi</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Keperluan</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Waktu</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">TTD</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <BookOpen className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">Belum ada tamu hari ini</p>
                  <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">Klik "Tambah Tamu" atau "Scan QR / NIK" untuk mencatat tamu baru</p>
                </td>
              </tr>
            ) : (
              filtered.map((entry, i) => (
                <tr key={entry.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4 text-sm text-gray-500 dark:text-slate-400 font-mono whitespace-nowrap">{i + 1}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-gray-900 dark:text-white uppercase whitespace-nowrap">{entry.nama}</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono mt-0.5 whitespace-nowrap">{entry.nik || 'Tamu Luar'}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <p className="text-xs font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">{entry.instansi || entry.alamat || '-'}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {entry.keperluan}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-bold text-gray-900 dark:text-white block whitespace-nowrap">{fmtTime(entry.tanggal_masuk)}</span>
                    <span className="text-[11px] text-gray-500 dark:text-slate-400 font-mono mt-0.5 whitespace-nowrap">{fmtDate(entry.tanggal_masuk)}</span>
                  </td>
                  <td className="px-5 py-4">
                    {entry.signature_url ? (
                      <div className="h-10 w-20 bg-white border border-gray-200 rounded flex items-center justify-center overflow-hidden">
                        <img src={entry.signature_url} alt="TTD" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setViewEntry(entry)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                        title="Lihat Detail Tamu"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(entry)}
                        className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-colors"
                        title="Edit Data Tamu"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id, entry.nama)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        title="Hapus Data Tamu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Guest Modal (Broadcast) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                {editId ? <Pencil className="w-5 h-5 text-amber-600" /> : <Send className="w-5 h-5 text-emerald-700" />}
                {editId ? 'Edit Data Tamu' : 'Kirim Data ke Kios'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditId(null); }} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {!editId && (
              <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-3 rounded-xl text-sm mb-2 flex gap-3 items-start border border-blue-100 dark:border-blue-800">
                <BookOpen className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Data yang diinput akan dikirim langsung ke layar Tablet Kios. Tamu hanya perlu membubuhkan tanda tangannya di layar sana.</p>
              </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">NIK (Opsional)</label>
                <input
                  id="input-nik"
                  type="tel"
                  data-no-cap
                  maxLength={16}
                  value={form.nik}
                  onChange={(e) => setForm(prev => ({ ...prev, nik: e.target.value.replace(/\D/g, '') }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('input-nama')?.focus();
                    }
                  }}
                  placeholder="16 digit NIK..."
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  id="input-nama"
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm(prev => ({ ...prev, nama: capitalizeWords(e.target.value) }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('input-instansi')?.focus();
                    }
                  }}
                  placeholder="Nama tamu..."
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Asal / Alamat / Instansi</label>
                <input
                  id="input-instansi"
                  type="text"
                  value={form.instansi}
                  onChange={(e) => setForm(prev => ({ ...prev, instansi: capitalizeWords(e.target.value), alamat: capitalizeWords(e.target.value) }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('input-keperluan')?.focus();
                    }
                  }}
                  placeholder="Desa / kota / instansi asal..."
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1 mt-3">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Keperluan <span className="text-red-500">*</span></label>
                <select
                  id="input-keperluan"
                  value={form.keperluan}
                  onChange={(e) => setForm(prev => ({ ...prev, keperluan: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 cursor-pointer"
                >
                  {KEPERLUAN_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-slate-900/50">
              <button onClick={() => { setShowModal(false); setEditId(null); }} className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
                Batal
              </button>
              <button
                onClick={handleSave}
                className={`px-8 py-2.5 ${editId ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'} text-white text-sm font-bold rounded-xl hover:shadow-lg shadow-md transition-all flex items-center justify-center gap-2`}
              >
                {editId ? <><Pencil className="w-4 h-4" /> Simpan Perubahan</> : <><Send className="w-4 h-4" /> Kirim ke Layar Kiosk</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print QR Kiosk Modal */}
      {showPrintQR && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-700" />
                QR Code Kiosk
              </h3>
              <button onClick={() => setShowPrintQR(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center text-center">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider mb-2">Buku Tamu Digital</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mb-8">Ini adalah pratinjau. Klik "Mulai Mencetak" untuk mengeprint format Kertas A4/A5.</p>
              
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <QRCodeSVG 
                  id="qr-kiosk-svg"
                  value={`${window.location.origin}/?tab=buku_tamu&t_id=${tenantId || ''}`} 
                  size={200} 
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-3">
              <button 
                onClick={handleDownloadQR} 
                className="w-full py-3 bg-white border-2 border-emerald-700 text-emerald-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all shadow-sm"
              >
                <Download className="w-5 h-5" />
                Download (Simpan ke Laptop)
              </button>
              <button 
                onClick={() => window.open('/?print=qr_kiosk', '_blank')} 
                className="w-full py-3 bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-800 transition-all shadow-md"
              >
                <Printer className="w-5 h-5" />
                Buka Halaman Cetak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden layout for react-to-print */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden' }}>
        <div ref={qrPrintRef} className="bg-white w-full h-full min-h-screen flex flex-col items-center justify-center p-10 text-center" style={{ fontFamily: 'sans-serif' }}>
          <h2 className="text-4xl font-black text-gray-900 uppercase tracking-wider mb-4">Buku Tamu Digital</h2>
          <p className="text-xl text-gray-600 font-medium mb-12 max-w-md mx-auto">Scan QR Code di bawah ini menggunakan kamera HP Anda untuk mengisi daftar hadir secara mandiri.</p>
          
          <div className="bg-white p-12 rounded-[3rem] shadow-xl border-4 border-gray-100 mb-12 inline-block">
            <QRCodeSVG 
              value={`${window.location.origin}/?tab=buku_tamu&t_id=${tenantId || ''}`} 
              size={400} 
              level="H"
              includeMargin={false}
            />
          </div>
          
          <div className="mt-auto pt-10 flex items-center gap-3 text-emerald-700 font-bold text-2xl">
            <BookOpen className="w-8 h-8" />
            <p>Powered by DiDesa</p>
          </div>
        </div>
      </div>

      {/* Modal Filter Tanggal Cetak Laporan */}
      {showPrintReportModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-700" />
                Cetak Laporan Buku Tamu
              </h3>
              <button onClick={() => setShowPrintReportModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl text-xs font-medium border border-emerald-100 dark:border-emerald-800/40">
                Tentukan rentang tanggal data kunjungan tamu yang ingin dicetak ke dalam laporan fisik/PDF.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Dari Tanggal</label>
                <input
                  type="date"
                  value={printStartDate}
                  onChange={(e) => setPrintStartDate(e.target.value)}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Sampai Tanggal</label>
                <input
                  type="date"
                  value={printEndDate}
                  onChange={(e) => setPrintEndDate(e.target.value)}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                />
              </div>

              <p className="text-[11px] text-gray-500 dark:text-slate-400 italic">
                * Kosongkan kolom tanggal di atas untuk mencetak <strong>keseluruhan riwayat data tamu</strong>.
              </p>
            </div>
            
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-slate-900/50">
              <button onClick={() => setShowPrintReportModal(false)} className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
                Batal
              </button>
              <button 
                onClick={handlePrintReport} 
                className="px-6 py-2.5 bg-emerald-700 text-white text-sm font-bold rounded-xl hover:bg-emerald-800 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Tamu */}
      {viewEntry && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Detail Tamu
              </h3>
              <button onClick={() => setViewEntry(null)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nama</span>
                <span className="font-bold text-gray-900 dark:text-white uppercase">{viewEntry.nama}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">NIK</span>
                <span className="font-mono text-gray-700 dark:text-slate-300">{viewEntry.nik || 'Tamu Luar'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Instansi / Asal</span>
                <span className="text-gray-700 dark:text-slate-300">{viewEntry.instansi || viewEntry.alamat || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Keperluan</span>
                <span className="text-gray-700 dark:text-slate-300">{viewEntry.keperluan}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Masuk</span>
                <span className="text-gray-700 dark:text-slate-300 whitespace-nowrap">{fmtTime(viewEntry.tanggal_masuk)} • {fmtDate(viewEntry.tanggal_masuk)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${viewEntry.status === 'hadir' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}>
                  {viewEntry.status === 'hadir' ? 'Hadir' : 'Selesai'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tanda Tangan</span>
                {viewEntry.signature_url ? (
                  <div className="h-12 w-28 bg-white border border-gray-200 rounded flex items-center justify-center overflow-hidden">
                    <img src={viewEntry.signature_url} alt="TTD" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <span className="text-[11px] text-gray-400 italic">-</span>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-slate-900/50">
              <button onClick={() => setViewEntry(null)} className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style print bawaan yang mengganggu dihapus karena kita sudah pakai iframe murni */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Hapus Data Tamu"
        message={<>Apakah Anda yakin ingin menghapus data tamu <strong>{deleteConfirm.nama}</strong>? Tindakan ini tidak dapat dibatalkan.</>}
        confirmText="Ya, Hapus"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: '', nama: '' })}
        type="danger"
      />
    </div>
  );
}
