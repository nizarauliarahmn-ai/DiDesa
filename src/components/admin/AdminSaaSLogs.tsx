import { useState, useEffect } from 'react';
import { Database, Search, Download, AlertCircle, CheckCircle2, AlertTriangle, Clock, Printer } from 'lucide-react';
import { fetchSaaSLogs, SaaSLog, subscribeSaaSLogsRealtime } from '../../utils/saasLogs';

export default function AdminSaaSLogs() {
  const [logs, setLogs] = useState<SaaSLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');

  const [filterCategory, setFilterCategory] = useState<string>('Semua Kategori');

  useEffect(() => {
    const handleUpdate = () => fetchSaaSLogs().then(setLogs);
    handleUpdate();
    window.addEventListener('saas_logs_updated', handleUpdate);
    const unsubscribe = subscribeSaaSLogsRealtime();
    
    return () => {
      window.removeEventListener('saas_logs_updated', handleUpdate);
      if (unsubscribe) unsubscribe();
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
      log.admin,
      log.category,
      log.aksi,
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

  const handleExportPDF = () => {
    if (filteredLogs.length === 0) {
      alert('Tidak ada data log untuk dicetak.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan pop-up peramban untuk mengunduh PDF.');
      return;
    }

    const rowsHtml = filteredLogs.map((log, index) => `
      <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${log.waktu}<br/><small style="color: #6b7280;">${log.tanggal}</small></td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${log.tenant_name || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${log.admin}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${log.category}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${log.aksi}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-style: italic;">${log.target}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: ${log.status === 'Berhasil' ? '#059669' : log.status === 'Gagal' ? '#dc2626' : '#d97706'};">${log.status}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Log Aktivitas SaaS - ${new Date().toLocaleDateString('id-ID')}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #111827; }
            .header { margin-bottom: 24px; border-bottom: 2px solid #10b981; padding-bottom: 12px; }
            .header h1 { margin: 0; font-size: 22px; color: #064e3b; }
            .header p { margin: 6px 0 0 0; color: #6b7280; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th { background-color: #f3f4f6; text-align: left; padding: 10px; border-bottom: 2px solid #d1d5db; font-size: 11px; text-transform: uppercase; color: #374151; letter-spacing: 0.05em; }
            @media print {
              @page { size: A4 landscape; margin: 15mm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DiDesa SaaS - Laporan Log Aktivitas Sistem</h1>
            <p>Dicetak Pada: ${new Date().toLocaleString('id-ID')} | Total Catatan: ${filteredLogs.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Waktu & Tanggal</th>
                <th>Desa / Tenant</th>
                <th>Administrator</th>
                <th>Kategori</th>
                <th>Aksi</th>
                <th>Target</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
    <div className="space-y-6">
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
        <div className="overflow-x-auto">
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
