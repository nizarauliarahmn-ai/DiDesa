import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { showToast } from '../../utils/toast';
import { capitalizeWords } from '../../utils/textUtils';
import AdminQRScanner from './AdminQRScanner';
import { QRCodeSVG } from 'qrcode.react';
import {
  BookOpen, Plus, QrCode, Search, Filter, Printer, Download,
  LogIn, LogOut, Clock, User, MapPin, Building2, ChevronDown,
  RefreshCw, CheckCircle2, X, Calendar
} from 'lucide-react';

interface GuestEntry {
  id: string;
  tenant_id: string;
  nik: string;
  nama: string;
  alamat: string;
  instansi: string;
  keperluan: string;
  tujuan_temu: string;
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
  const [showScanner, setShowScanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPrintQR, setShowPrintQR] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // Form state
  const [form, setForm] = useState({
    nik: '', nama: '', alamat: '', instansi: '', keperluan: KEPERLUAN_OPTIONS[0], tujuan_temu: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guest_book')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('tanggal_masuk', filterDate + 'T00:00:00')
        .lte('tanggal_masuk', filterDate + 'T23:59:59')
        .order('tanggal_masuk', { ascending: false });
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
    if (tenantId) fetchEntries(); 
  }, [fetchEntries, tenantId]);

  // Lookup resident by NIK from scanner
  const handleNikFound = async (nik: string) => {
    setShowScanner(false);
    setIsLookingUp(true);
    setForm(prev => ({ ...prev, nik }));

    try {
      const { data } = await supabase
        .from('residents')
        .select('name, address, rt, rw')
        .eq('nik', nik)
        .eq('tenant_id', tenantId)
        .single();

      if (data) {
        setForm(prev => ({
          ...prev,
          nik,
          nama: capitalizeWords(data.name || ''),
          alamat: capitalizeWords(`${data.address || ''} RT ${data.rt || ''} RW ${data.rw || ''}`),
          instansi: 'Warga Desa',
        }));
        showToast(`Data warga ditemukan: ${capitalizeWords(data.name)}`, 'success');
      } else {
        setForm(prev => ({ ...prev, nik, nama: '', alamat: '', instansi: '' }));
        showToast('NIK tidak ditemukan di database. Silakan isi manual.', 'info');
      }
    } catch {
      showToast('Gagal mencari data. Silakan isi manual.', 'error');
    } finally {
      setIsLookingUp(false);
      setShowModal(true);
    }
  };

  const handleSave = async () => {
    if (!form.nama.trim()) { showToast('Nama tamu wajib diisi.', 'error'); return; }
    if (!form.keperluan.trim()) { showToast('Keperluan kunjungan wajib diisi.', 'error'); return; }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('guest_book').insert([{
        id: `guest-${Date.now()}`,
        tenant_id: tenantId,
        nik: form.nik || null,
        nama: capitalizeWords(form.nama),
        alamat: capitalizeWords(form.alamat),
        instansi: capitalizeWords(form.instansi),
        keperluan: form.keperluan,
        tujuan_temu: capitalizeWords(form.tujuan_temu),
        tanggal_masuk: new Date().toISOString(),
        tanggal_keluar: null,
        status: 'hadir',
      }]);

      if (error) throw error;
      showToast(`Tamu ${capitalizeWords(form.nama)} berhasil dicatat!`, 'success');
      setShowModal(false);
      setForm({ nik: '', nama: '', alamat: '', instansi: '', keperluan: KEPERLUAN_OPTIONS[0], tujuan_temu: '' });
      fetchEntries();
    } catch {
      showToast('Gagal menyimpan data tamu.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

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

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const matchSearch = e.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.nik || '').includes(searchQuery) ||
        e.keperluan.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === 'Semua' || e.status === filterStatus.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [entries, searchQuery, filterStatus]);

  const todayCount = entries.filter(e => e.status === 'hadir').length;

  const handlePrint = () => window.print();

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Scanner Modal */}
      {showScanner && <AdminQRScanner onResult={handleNikFound} onClose={() => setShowScanner(false)} />}

      {/* Looking up overlay */}
      {isLookingUp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center shadow-2xl">
            <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin mx-auto mb-3" />
            <p className="font-bold text-gray-900 dark:text-white">Mencari data warga...</p>
          </div>
        </div>
      )}

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
            onClick={handlePrint}
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
            onClick={() => { setForm({ nik: '', nama: '', alamat: '', instansi: '', keperluan: KEPERLUAN_OPTIONS[0], tujuan_temu: '' }); setShowModal(true); }}
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
          { label: 'Total Hari Ini', value: entries.length, color: 'emerald', icon: <BookOpen className="w-5 h-5" /> },
          { label: 'Sedang Hadir', value: entries.filter(e => e.status === 'hadir').length, color: 'blue', icon: <LogIn className="w-5 h-5" /> },
          { label: 'Selesai', value: entries.filter(e => e.status === 'selesai').length, color: 'gray', icon: <CheckCircle2 className="w-5 h-5" /> },
          { label: 'Urusan Surat', value: entries.filter(e => e.keperluan.includes('Surat')).length, color: 'amber', icon: <Building2 className="w-5 h-5" /> },
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none mb-4 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
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
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="h-10 px-3 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 px-3 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white cursor-pointer"
        >
          <option>Semua</option>
          <option>Hadir</option>
          <option>Selesai</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
            <tr>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">No</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tamu</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Keperluan</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Tujuan Temu</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Masuk</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Keluar</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <BookOpen className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">Belum ada tamu hari ini</p>
                  <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">Klik "Tambah Tamu" atau "Scan QR / NIK" untuk mencatat tamu baru</p>
                </td>
              </tr>
            ) : (
              filtered.map((entry, i) => (
                <tr key={entry.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4 text-sm text-gray-500 dark:text-slate-400 font-mono">{i + 1}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{entry.nama}</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono mt-0.5">{entry.nik || 'Tamu Luar'}</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 truncate max-w-[180px]">{entry.alamat || entry.instansi || '-'}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                      {entry.keperluan}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-slate-300 hidden lg:table-cell">{entry.tujuan_temu || '-'}</td>
                  <td className="px-5 py-4 text-sm font-mono text-gray-700 dark:text-slate-300">
                    {fmtTime(entry.tanggal_masuk)}
                  </td>
                  <td className="px-5 py-4 text-sm font-mono text-gray-500 dark:text-slate-400 hidden sm:table-cell">
                    {entry.tanggal_keluar ? fmtTime(entry.tanggal_keluar) : <span className="text-gray-300 dark:text-slate-600">-</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold uppercase ${
                      entry.status === 'hadir'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                    }`}>
                      {entry.status === 'hadir' ? <LogIn className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {entry.status === 'hadir' && (
                      <button
                        onClick={() => handleCheckOut(entry.id, entry.nama)}
                        className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition-colors"
                      >
                        <LogOut className="w-3 h-3" />
                        Selesai
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Guest Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-700" />
                Data Tamu Baru
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* NIK & scan button */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">NIK (Opsional)</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    data-no-cap
                    maxLength={16}
                    value={form.nik}
                    onChange={(e) => setForm(prev => ({ ...prev, nik: e.target.value.replace(/\D/g, '') }))}
                    placeholder="16 digit NIK..."
                    className="flex-1 h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                  />
                  <button
                    onClick={() => { setShowModal(false); setShowScanner(true); }}
                    className="h-11 px-3 bg-gray-900 dark:bg-slate-700 text-white rounded-xl hover:bg-gray-800 transition-all"
                    title="Scan QR"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm(prev => ({ ...prev, nama: capitalizeWords(e.target.value) }))}
                  placeholder="Nama tamu..."
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Asal / Instansi</label>
                  <input
                    type="text"
                    value={form.instansi}
                    onChange={(e) => setForm(prev => ({ ...prev, instansi: capitalizeWords(e.target.value) }))}
                    placeholder="Instansi / Desa..."
                    className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Tujuan Temu</label>
                  <input
                    type="text"
                    value={form.tujuan_temu}
                    onChange={(e) => setForm(prev => ({ ...prev, tujuan_temu: capitalizeWords(e.target.value) }))}
                    placeholder="Nama/Bagian yg dituju..."
                    className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Keperluan <span className="text-red-500">*</span></label>
                <select
                  value={form.keperluan}
                  onChange={(e) => setForm(prev => ({ ...prev, keperluan: e.target.value }))}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 cursor-pointer"
                >
                  {KEPERLUAN_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Alamat Asal</label>
                <textarea
                  rows={2}
                  value={form.alamat}
                  onChange={(e) => setForm(prev => ({ ...prev, alamat: capitalizeWords(e.target.value) }))}
                  placeholder="Alamat tempat tinggal tamu..."
                  className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-emerald-700 text-white text-sm font-bold rounded-xl hover:bg-emerald-800 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Simpan & Check-In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print QR Kiosk Modal */}
      {showPrintQR && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div id="qr-print-area" className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800 print:hidden">
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
              <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mb-8">Scan QR Code di bawah ini untuk mengisi daftar hadir secara mandiri.</p>
              
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <QRCodeSVG 
                  value={`${window.location.origin}/?tab=buku_tamu`} 
                  size={250} 
                  level="H"
                  includeMargin={false}
                />
              </div>
              
              <div className="mt-8 flex items-center gap-2 text-emerald-700 font-bold">
                <BookOpen className="w-5 h-5" />
                <p>Powered by DiDesa</p>
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 print:hidden">
              <button 
                onClick={() => window.print()} 
                className="w-full py-3 bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-800 transition-all"
              >
                <Printer className="w-5 h-5" />
                Cetak Halaman Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print-only styles */}
      <style>{`
        @media print {
          /* Reset basic layout yang sering merusak print di React (flex/overflow) */
          body, html, #root, .overflow-y-auto, .overflow-hidden, main, .flex-1 { 
            overflow: visible !important; 
            height: auto !important; 
            max-height: none !important;
            display: block !important;
          }
          
          /* Sembunyikan elemen UI dasar */
          .print\\:hidden, button, nav, aside, header { display: none !important; }
          
          ${showPrintQR ? `
            /* === MODE CETAK QR KIOSK === */
            body * { visibility: hidden; }
            #qr-print-area, #qr-print-area * { visibility: visible; }
            #qr-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100vw;
              margin: 0;
              padding: 40px;
              box-shadow: none !important;
              border: none !important;
              background: white !important;
            }
          ` : `
            /* === MODE CETAK TABEL BUKU TAMU === */
            /* Sembunyikan modal/overlay lainnya saat nge-print tabel */
            .fixed { display: none !important; }
            body { background: white !important; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 6px 10px; font-size: 11px; color: black; }
            th { background: #f3f4f6 !important; font-weight: bold; text-transform: uppercase; color: black; }
            h2 { font-size: 18px; font-weight: bold; margin-bottom: 4px; color: black; }
          `}
        }
      `}</style>
    </div>
  );
}
