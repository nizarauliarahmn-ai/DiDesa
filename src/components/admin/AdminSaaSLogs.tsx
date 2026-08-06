
import React, { useState, useEffect, useRef } from 'react';
import { Database, Search, Filter, Trash2, Download, AlertCircle, CheckCircle2, AlertTriangle, Clock, Printer } from 'lucide-react';
import { fetchSaaSLogs, SaaSLog, subscribeSaaSLogsRealtime } from '../../utils/saasLogs';
import { useReactToPrint } from 'react-to-print';

export default function AdminSaaSLogs() {
  const [logs, setLogs] = useState<SaaSLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');

  const [filterCategory, setFilterCategory] = useState<string>('Semua Kategori');
  const printRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Log_Aktivitas_SaaS_${new Date().toISOString().split('T')[0]}`,
  });

  useEffect(() => {
    const handleUpdate = () => fetchSaaSLogs().then(setLogs);
    handleUpdate();
    window.addEventListener('saas_logs_updated', handleUpdate);
    const unsubscribe = subscribeSaaSLogsRealtime();
    
    return () => {
      window.removeEventListener('saas_logs_updated', handleUpdate);
      unsubscribe();
    };
  }, []);

  const filteredLogs = logs.filter(log => {
    const searchTarget = (
      log.aksi + 
      log.admin + 
      log.target + 
      (log.tenant_name || '') + 
      (log.category || '')
    ).toLowerCase();

    const matchesSearch = searchTarget.includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Semua' || log.status === filterStatus;
    const matchesCategory = filterCategory === 'Semua Kategori' || log.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = ['Waktu', 'Tanggal', 'Desa / Tenant', 'Administrator', 'Kategori', 'Aksi', 'Target', 'Status'];
    const csvData = filteredLogs.map(log => [
      log.waktu,
      log.tanggal,
      log.tenant_name || '-',
      log.admin_name,
      log.category,
      log.action,
      log.target,
      log.status
    ].map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(','));
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `log_aktivitas_saas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = (status: SaaSLog['status']) => {
    switch (status) {
      case 'Berhasil': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'Gagal': return <AlertCircle size={14} className="text-rose-500" />;
      case 'Peringatan': return <AlertTriangle size={14} className="text-amber-500" />;
      default: return <Clock size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Log Aktivitas SaaS</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Rekam jejak seluruh aksi administratif pada platform global</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportCSV} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            <Download size={16} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={handleExportPDF} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all">
            <Printer size={16} />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
        {/* Filters */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Cari aksi, admin, desa, atau target..."
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-500 transition-all text-sm"
          >
            {['Semua Kategori', 'SaaS Admin', 'Desa', 'System', 'Surat', 'Penduduk'].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="flex gap-2">
            {['Semua', 'Berhasil', 'Gagal', 'Peringatan'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  filterStatus === status 
                  ? 'bg-slate-900 border-slate-900 text-white' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto" ref={printRef}>
          <div className="hidden print:block mb-6 p-6">
            <h1 className="text-2xl font-bold mb-2">Laporan Log Aktivitas SaaS</h1>
            <p className="text-sm text-gray-500">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
          </div>
          <table className="w-full text-left text-sm print:text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Desa / Tenant</th>
                <th className="px-6 py-4">Administrator</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Aksi</th>
                <th className="px-6 py-4">Target</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="font-bold text-slate-900 dark:text-white">{log.waktu}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{log.tanggal}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-bold text-slate-900 dark:text-white">{log.tenant_name || '-'}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                        {log.admin.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{log.admin}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">{log.category || 'System'}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-bold text-slate-900 dark:text-white">{log.aksi}</span>
                  </td>
                  <td className="px-6 py-5 text-slate-500 dark:text-slate-400 italic">
                    {log.target}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        log.status === 'Berhasil' ? 'text-emerald-600' : 
                        log.status === 'Gagal' ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <Database size={48} className="mb-4 opacity-10" />
                      <p className="font-bold">Tidak ada data log yang ditemukan.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
