import React, { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle2, XCircle, Phone, Clock, FileSpreadsheet, Plus } from 'lucide-react';
import { fetchSaaSTenantRequests, SaaSTenantRequest, updateSaaSTenantRequestStatus, markLeadsAsRead } from '../../utils/saasLeads';
import { supabase } from '../../utils/supabase';

interface AdminSaaSLeadsProps {
  onSetActiveTab?: (tab: string) => void;
}

export default function AdminSaaSLeads({ onSetActiveTab }: AdminSaaSLeadsProps) {
  const [requests, setRequests] = useState<SaaSTenantRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Menunggu' | 'Dihubungi' | 'Diterima' | 'Ditolak'>('Semua');

  const loadRequests = async () => {
    setLoading(true);
    const data = await fetchSaaSTenantRequests();
    setRequests(data);
    markLeadsAsRead(data.map(r => r.id));
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();

    const channel = supabase.channel('public:saas_leads_broadcast');
    channel.on('broadcast', { event: 'new_tenant_request' }, (payload: any) => {
      if (payload?.payload?.requests) {
        setRequests(payload.payload.requests);
        markLeadsAsRead(payload.payload.requests.map((r: SaaSTenantRequest) => r.id));
      }
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStatusChange = async (id: string, newStatus: SaaSTenantRequest['status']) => {
    setRequests(prev => prev.map(req => req.id === id ? { ...req, status: newStatus } : req));
    await updateSaaSTenantRequestStatus(id, newStatus);
  };

  const filteredRequests = requests.filter(req => {
    const matchSearch = 
      req.villageName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      req.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.phone.includes(searchQuery);
    
    const matchStatus = statusFilter === 'Semua' || req.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Menunggu': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
      case 'Dihubungi': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      case 'Diterima': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'Ditolak': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Prospek & Pengajuan</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola pendaftaran desa baru yang masuk melalui portal.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Cari desa, pemohon, atau nomor telepon..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(['Semua', 'Menunggu', 'Dihubungi', 'Diterima', 'Ditolak'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  statusFilter === status 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
            <p>Memuat data pengajuan...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileSpreadsheet size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Tidak ada data</h3>
            <p className="text-slate-500 dark:text-slate-400">Belum ada desa yang mengajukan pendaftaran saat ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-4 font-semibold text-sm text-slate-500 dark:text-slate-400">WAKTU PENGAJUAN</th>
                  <th className="pb-4 font-semibold text-sm text-slate-500 dark:text-slate-400">DESA & SUBDOMAIN</th>
                  <th className="pb-4 font-semibold text-sm text-slate-500 dark:text-slate-400">PEMOHON</th>
                  <th className="pb-4 font-semibold text-sm text-slate-500 dark:text-slate-400">KONTAK</th>
                  <th className="pb-4 font-semibold text-sm text-slate-500 dark:text-slate-400">STATUS</th>
                  <th className="pb-4 font-semibold text-sm text-slate-500 dark:text-slate-400 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 align-top">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                        <Clock size={16} className="text-slate-400" />
                        {new Date(req.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-sm text-slate-500 ml-6">
                        {new Date(req.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-4 align-top">
                      <div className="font-semibold text-slate-900 dark:text-white">Desa {req.villageName}</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">{req.subdomain}.sistemdidesa.id</div>
                    </td>
                    <td className="py-4 align-top">
                      <div className="text-slate-900 dark:text-white font-medium">{req.applicantName}</div>
                      <div className="text-sm text-slate-500 mt-1">{req.jobTitle}</div>
                    </td>
                    <td className="py-4 align-top">
                      <a href={`https://wa.me/${req.phone.replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-lg text-sm font-medium transition-colors">
                        <Phone size={14} />
                        {req.phone}
                      </a>
                    </td>
                    <td className="py-4 align-top">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 align-top text-right">
                      <div className="flex justify-end gap-2">
                        {req.status === 'Menunggu' && (
                          <button
                            onClick={() => handleStatusChange(req.id, 'Dihubungi')}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Tandai Sedang Dihubungi"
                          >
                            <Phone size={18} />
                          </button>
                        )}
                        {req.status !== 'Diterima' && (
                          <button
                            onClick={() => {
                              handleStatusChange(req.id, 'Diterima');
                              if (onSetActiveTab) onSetActiveTab('tenants');
                            }}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-2"
                            title="Jadikan Klien (Tenant)"
                          >
                            <Plus size={18} />
                            <span className="text-sm font-semibold hidden lg:inline">Buat Klien</span>
                          </button>
                        )}
                        {req.status !== 'Ditolak' && req.status !== 'Diterima' && (
                          <button
                            onClick={() => handleStatusChange(req.id, 'Ditolak')}
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Tolak Pengajuan"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
