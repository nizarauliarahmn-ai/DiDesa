
import React, { useState, useEffect } from 'react';
import { Database, Search, Filter, Trash2, Download, AlertCircle, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { getSaaSLogs, SaaSLog } from '../../utils/saasLogs';

export default function AdminSaaSLogs() {
  const [logs, setLogs] = useState<SaaSLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');

  useEffect(() => {
    const handleUpdate = () => setLogs(getSaaSLogs());
    handleUpdate();
    window.addEventListener('saas_logs_updated', handleUpdate);
    return () => window.removeEventListener('saas_logs_updated', handleUpdate);
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.aksi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'Semua' || log.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

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
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Log Aktivitas SaaS</h2>
          <p className="text-sm text-slate-500 mt-1">Rekam jejak seluruh aksi administratif pada platform global</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Download size={16} />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Cari aksi, admin, atau target..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['Semua', 'Berhasil', 'Gagal', 'Peringatan'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  filterStatus === status 
                  ? 'bg-slate-900 border-slate-900 text-white' 
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="px-8 py-4">Waktu & Tanggal</th>
                <th className="px-8 py-4">Administrator</th>
                <th className="px-8 py-4">Aksi</th>
                <th className="px-8 py-4">Target</th>
                <th className="px-8 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-900">{log.waktu}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{log.tanggal}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {log.admin.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-700">{log.admin}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="font-bold text-slate-900">{log.aksi}</span>
                  </td>
                  <td className="px-8 py-5 text-slate-500 italic">
                    {log.target}
                  </td>
                  <td className="px-8 py-5">
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
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400">
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
