import NumberCounter from '../common/NumberCounter';
import React, { useState, useEffect } from 'react';
import { 
  Database, Plus, Search, Server, Activity, Users, MoreVertical, 
  Globe, ShieldCheck, X, Megaphone, Building2, MessageSquare, 
  Trash2, CheckCircle, ExternalLink, Edit, Key, Copy, Check, 
  Lock, Mail, Eye, EyeOff, CheckCircle2, AlertTriangle
} from 'lucide-react';
import AdminGlobalUpdates from './AdminGlobalUpdates';
import { getFeedbacks, updateFeedbackStatus, deleteFeedback, Feedback } from '../../utils/feedbackData';
import { addSaaSLog } from '../../utils/saasLogs';
import { showToast } from '../../utils/toast';

export default function AdminTenants() {
  const [activeTab, setActiveTab] = useState<'tenants' | 'updates' | 'feedback'>('tenants');
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  
  // Forms state
  const [formData, setFormData] = useState({ 
    nama_desa: '', 
    kode_desa: '', 
    domain: '',
    admin_email: '',
    admin_password: '',
    kades_email: '',
    kades_password: ''
  });
  
  const [editFormData, setEditFormData] = useState({
    id: '',
    nama_desa: '',
    kode_desa: '',
    domain: '',
    status: 'active',
    admin_email: '',
    admin_password: '',
    kades_email: '',
    kades_password: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authUser, setAuthUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  
  // UI States
  const [showRowPasswords, setShowRowPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const handleLoginAs = (tenant: any) => {
    if (!authUser) return;
    
    // Save current SaaS admin for recovery
    localStorage.setItem('didesa_impersonator', JSON.stringify(authUser));
    
    // Create temporary session for the selected tenant
    const impersonatedUser = {
      name: `Admin ${tenant.nama_desa}`,
      email: tenant.admin_email || `admin@${tenant.domain || 'desa.id'}`,
      role: 'admin',
      tenantId: tenant.id,
      isImpersonated: true
    };
    
    // ── Inject SEMUA data kop surat dari tenant ke localStorage ──
    // Ini memastikan pratinjau kop di Pengaturan selalu sesuai
    // dengan konfigurasi yang super admin atur per tenant
    localStorage.setItem('kop_desa',       tenant.nama_desa || '');
    localStorage.setItem('village_name',   tenant.nama_desa || '');
    localStorage.setItem('kop_kecamatan',  tenant.kecamatan || tenant.nama_kecamatan || '');
    localStorage.setItem('village_kecamatan', tenant.kecamatan || tenant.nama_kecamatan || '');
    localStorage.setItem('kop_kabupaten',  tenant.kabupaten || tenant.nama_kabupaten || '');
    localStorage.setItem('village_kabupaten', tenant.kabupaten || tenant.nama_kabupaten || '');
    localStorage.setItem('kop_alamat',     tenant.alamat || '');
    localStorage.setItem('village_alamat', tenant.alamat || '');
    localStorage.setItem('kop_kontak',     tenant.kontak || tenant.telepon || '');
    if (tenant.logo_url) {
      localStorage.setItem('kop_logo_url', tenant.logo_url);
    }
    if (tenant.kode_desa) {
      localStorage.setItem('village_id', tenant.kode_desa);
    }
    if (tenant.domain) {
      localStorage.setItem('village_domain', tenant.domain);
    }
    
    localStorage.setItem('didesa_auth_user', JSON.stringify(impersonatedUser));
    
    addSaaSLog({
      admin: authUser.name,
      aksi: 'Impersonasi Login',
      target: tenant.nama_desa,
      status: 'Berhasil'
    });

    showToast(`Berhasil masuk sebagai Admin ${tenant.nama_desa}!`, 'success');
    window.location.reload();
  };


  useEffect(() => {
    const handleFeedbackUpdate = () => {
      setFeedbacks(getFeedbacks());
    };
    handleFeedbackUpdate();
    window.addEventListener('feedback_updated', handleFeedbackUpdate);
    return () => window.removeEventListener('feedback_updated', handleFeedbackUpdate);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('didesa_auth_user');
    if (savedUser) {
      setAuthUser(JSON.parse(savedUser));
    }
  }, []);

  const fetchTenants = () => {
    setLoading(true);
    fetch('/api/tenants')
      .then(res => res.json())
      .then(data => {
        setTenants(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching tenants:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // Update suggestions based on village name or domain
  useEffect(() => {
    if (formData.domain && !formData.admin_email) {
      setFormData(prev => ({
        ...prev,
        admin_email: `admin@${prev.domain}`,
        kades_email: `kades@${prev.domain}`,
        admin_password: 'admin123',
        kades_password: 'kades123'
      }));
    }
  }, [formData.domain]);

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        admin_email: formData.admin_email || `admin@${formData.domain || 'desa.id'}`,
        admin_password: formData.admin_password || 'admin123',
        kades_email: formData.kades_email || `kades@${formData.domain || 'desa.id'}`,
        kades_password: formData.kades_password || 'kades123'
      };

      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ 
          nama_desa: '', 
          kode_desa: '', 
          domain: '',
          admin_email: '',
          admin_password: '',
          kades_email: '',
          kades_password: ''
        });
        showToast('Klien desa berhasil didaftarkan!', 'success');
        fetchTenants();
        
        addSaaSLog({
          admin: authUser?.name || 'SaaS Admin',
          aksi: 'Tambah Klien Baru',
          target: payload.nama_desa,
          status: 'Berhasil'
        });
      } else {
        const errorData = await res.json();
        showToast(`Gagal: ${errorData.error}`, 'error');
      }
    } catch (err) {
      console.error("Error adding tenant", err);
      showToast('Gagal mendaftarkan klien baru', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (tenant: any) => {
    setEditFormData({
      id: tenant.id,
      nama_desa: tenant.nama_desa,
      kode_desa: tenant.kode_desa,
      domain: tenant.domain || '',
      status: tenant.status || 'active',
      admin_email: tenant.admin_email || `admin@${tenant.domain || 'desa.id'}`,
      admin_password: tenant.admin_password || 'admin123',
      kades_email: tenant.kades_email || `kades@${tenant.domain || 'desa.id'}`,
      kades_password: tenant.kades_password || 'kades123'
    });
    setIsEditModalOpen(true);
    setActiveDropdownId(null);
  };

  const handleEditTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tenants/${editFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        showToast('Kredensial & data klien berhasil diperbarui!', 'success');
        fetchTenants();
        
        addSaaSLog({
          admin: authUser?.name || 'SaaS Admin',
          aksi: 'Update Klien & Kredensial',
          target: editFormData.nama_desa,
          status: 'Berhasil'
        });
      } else {
        const errorData = await res.json();
        showToast(`Gagal memperbarui: ${errorData.error}`, 'error');
      }
    } catch (err) {
      console.error("Error updating tenant", err);
      showToast('Gagal memperbarui data klien', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async (tenant: any) => {
    const isConfirmed = window.confirm(`Apakah Anda yakin ingin menghapus klien "${tenant.nama_desa}"? Semua data di-isolasi tidak akan dapat diakses.`);
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`Klien "${tenant.nama_desa}" berhasil dihapus dari sistem!`, 'success');
        fetchTenants();
        
        addSaaSLog({
          admin: authUser?.name || 'SaaS Admin',
          aksi: 'Hapus Klien Desa',
          target: tenant.nama_desa,
          status: 'Berhasil'
        });
      } else {
        showToast('Gagal menghapus klien dari database', 'error');
      }
    } catch (err) {
      console.error("Error deleting tenant", err);
      showToast('Terjadi kesalahan saat menghapus klien', 'error');
    }
    setActiveDropdownId(null);
  };

  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Kredensial disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTenants = tenants.filter(tenant => {
    const query = searchQuery.toLowerCase();
    return (
      tenant.nama_desa.toLowerCase().includes(query) ||
      (tenant.domain || '').toLowerCase().includes(query) ||
      tenant.kode_desa.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'tenants' 
              ? 'border-emerald-600 text-emerald-700' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Server size={18} />
          Manajemen Klien & Kredensial
        </button>
        <button
          onClick={() => setActiveTab('updates')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'updates' 
              ? 'border-emerald-600 text-emerald-700' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Megaphone size={18} />
          Update Global
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'feedback' 
              ? 'border-emerald-600 text-emerald-700' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <MessageSquare size={18} />
          Feedback Pengguna
          {feedbacks.filter(f => f.status === 'Baru').length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 animate-pulse">
              {feedbacks.filter(f => f.status === 'Baru').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'updates' ? (
        <AdminGlobalUpdates />
      ) : activeTab === 'feedback' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="text-emerald-600" />
                Daftar Saran & Kritik Pengguna
              </h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Kumpulan masukan dari seluruh desa yang menggunakan platform.</p>
            </div>
            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
              {feedbacks.length} Total Feedback
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 font-medium border-b border-gray-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Pengirim</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Pesan</th>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feedbacks.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-white">{f.nama}</div>
                      <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{f.desa}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                        f.kategori === 'Bug' ? 'bg-rose-100 text-rose-700' : f.kategori === 'Saran' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {f.kategori}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-600 dark:text-slate-400 max-w-xs truncate" title={f.pesan}>{f.pesan}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400 font-medium">
                      {f.tanggal}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        f.status === 'Baru' ? 'bg-emerald-100 text-emerald-700 animate-pulse' : f.status === 'Dibaca' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                      }`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {f.status !== 'Selesai' && (
                          <button 
                            onClick={() => updateFeedbackStatus(f.id, f.status === 'Baru' ? 'Dibaca' : 'Selesai')}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="Tandai Selesai"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteFeedback(f.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <Server className="w-6 h-6 text-emerald-600" />
                Manajemen Klien & Kredensial Multi-Tenant
              </h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Kelola desa klien, status berlangganan, serta kredensial akses pimpinan dan operator secara mandiri.</p>
            </div>
            <button 
              onClick={() => {
                setFormData({
                  nama_desa: '',
                  kode_desa: '',
                  domain: '',
                  admin_email: '',
                  admin_password: '',
                  kades_email: '',
                  kades_password: ''
                });
                setIsModalOpen(true);
              }} 
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-md dark:shadow-none hover:shadow-lg active:scale-95 shrink-0"
            >
              <Plus size={16} />
              Tambah Desa Klien
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0 animate-pulse">
                <Database size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Klien Desa</p>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white"><NumberCounter end={tenants.length} /></p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Klien Aktif</p>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white"><NumberCounter end={tenants.filter(t => t.status === 'active' || !t.status).length} /></p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Arsitektur Database</p>
                <p className="text-base font-extrabold text-gray-900 dark:text-white">RLS Isolated Multi-Tenant</p>
              </div>
            </div>
          </div>

          {/* Tenant List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center bg-gray-50/50 dark:bg-slate-800/50 gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari desa, domain, atau kode unik..." 
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900"
                />
              </div>
              
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Tabel Terenkripsi Otomatis</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 font-bold border-b border-gray-100 dark:border-slate-800 uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Instansi Klien</th>
                    <th className="px-6 py-4">Domain / Subdomain</th>
                    <th className="px-6 py-4">Kredensial Super Admin</th>
                    <th className="px-6 py-4">Kredensial Admin</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Menghubungkan ke database RLS...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertTriangle className="text-amber-500 w-8 h-8" />
                          <span className="font-bold text-gray-700 dark:text-slate-300">Tidak ada hasil cocok</span>
                          <span className="text-xs text-gray-400">Coba ubah kata kunci pencarian Anda</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTenants.map(tenant => {
                    const isVisible = showRowPasswords[tenant.id] || false;
                    const admEmail = tenant.admin_email || `admin@${tenant.domain || 'desa.id'}`;
                    const admPass = tenant.admin_password || 'admin123';
                    const kadEmail = tenant.kades_email || `kades@${tenant.domain || 'desa.id'}`;
                    const kadPass = tenant.kades_password || 'kades123';

                    return (
                      <tr key={tenant.id} className="hover:bg-gray-50/50 dark:bg-slate-800/50 transition-colors group">
                        {/* Tenant Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2.5">
                            <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center shrink-0 border border-emerald-100 font-bold text-xs mt-0.5">
                              <Building2 size={16} />
                            </div>
                            <div>
                              <div className="font-extrabold text-gray-900 dark:text-white group-hover:text-emerald-700 transition-colors">
                                {tenant.nama_desa}
                              </div>
                              <div className="text-[11px] text-gray-400 font-semibold font-mono mt-0.5 uppercase tracking-wide flex items-center gap-1.5">
                                <span>ID: {tenant.id.split('-')[0]}</span>
                                <span className="text-gray-300">•</span>
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-bold">KODE: {tenant.kode_desa}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Domain / Subdomain */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-800 w-fit">
                              <Globe size={13} className="text-emerald-600 shrink-0" />
                              <span className="truncate">{tenant.domain || 'Belum diatur'}</span>
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                              <Database size={9} /> Single DB / Supabase RLS
                            </span>
                          </div>
                        </td>

                        {/* Super Admin Creds */}
                        <td className="px-6 py-4">
                          <div className="space-y-1.5 max-w-[200px]">
                            {/* Email */}
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 p-1 rounded-md border border-gray-100 dark:border-slate-800 transition-all">
                              <span className="truncate flex items-center gap-1">
                                <Mail size={11} className="text-amber-500 shrink-0" />
                                <span className="font-mono text-[11px]">{kadEmail}</span>
                              </span>
                              <button 
                                onClick={() => handleCopyToClipboard(kadEmail, `${tenant.id}-kademail`)}
                                className="p-0.5 text-gray-400 hover:text-emerald-600"
                                title="Salin Email"
                              >
                                {copiedId === `${tenant.id}-kademail` ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} />}
                              </button>
                            </div>
                            {/* Password */}
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 p-1 rounded-md border border-gray-100 dark:border-slate-800 transition-all">
                              <span className="truncate flex items-center gap-1">
                                <Lock size={11} className="text-amber-500 shrink-0" />
                                <span className="font-mono text-[11px]">
                                  {isVisible ? kadPass : '••••••••'}
                                </span>
                              </span>
                              <button 
                                onClick={() => handleCopyToClipboard(kadPass, `${tenant.id}-kadpass`)}
                                className="p-0.5 text-gray-400 hover:text-emerald-600"
                                title="Salin Password"
                              >
                                {copiedId === `${tenant.id}-kadpass` ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} />}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Operator Creds */}
                        <td className="px-6 py-4">
                          <div className="space-y-1.5 max-w-[200px]">
                            {/* Email */}
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 p-1 rounded-md border border-gray-100 dark:border-slate-800 transition-all">
                              <span className="truncate flex items-center gap-1">
                                <Mail size={11} className="text-blue-500 shrink-0" />
                                <span className="font-mono text-[11px]">{admEmail}</span>
                              </span>
                              <button 
                                onClick={() => handleCopyToClipboard(admEmail, `${tenant.id}-admemail`)}
                                className="p-0.5 text-gray-400 hover:text-emerald-600"
                                title="Salin Email"
                              >
                                {copiedId === `${tenant.id}-admemail` ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} />}
                              </button>
                            </div>
                            {/* Password */}
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 p-1 rounded-md border border-gray-100 dark:border-slate-800 transition-all">
                              <span className="truncate flex items-center gap-1">
                                <Lock size={11} className="text-blue-500 shrink-0" />
                                <span className="font-mono text-[11px]">
                                  {isVisible ? admPass : '••••••••'}
                                </span>
                              </span>
                              <button 
                                onClick={() => handleCopyToClipboard(admPass, `${tenant.id}-admpass`)}
                                className="p-0.5 text-gray-400 hover:text-emerald-600"
                                title="Salin Password"
                              >
                                {copiedId === `${tenant.id}-admpass` ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} />}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            {tenant.status !== 'inactive' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wide uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold tracking-wide uppercase">
                                Suspend
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-2 relative">
                            {/* Lihat Sandi Button */}
                            <button
                              onClick={() => setShowRowPasswords(prev => ({ ...prev, [tenant.id]: !prev[tenant.id] }))}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm dark:shadow-none active:scale-95 border ${
                                isVisible 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                              title={isVisible ? "Sembunyikan Sandi" : "Lihat Sandi"}
                            >
                              {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                              <span>{isVisible ? 'Tutup' : 'Sandi'}</span>
                            </button>

                            {/* Impersonate Login Button */}
                            <button 
                              onClick={() => handleLoginAs(tenant)}
                              className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm dark:shadow-none active:scale-95"
                              title="Login instan ke dasbor desa klien ini"
                            >
                              <ExternalLink size={13} />
                              <span>Login</span>
                            </button>

                            {/* Dropdown Toggle */}
                            <div className="relative">
                              <button 
                                onClick={() => setActiveDropdownId(activeDropdownId === tenant.id ? null : tenant.id)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              >
                                <MoreVertical size={14} />
                              </button>

                              {activeDropdownId === tenant.id && (
                                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1 px-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-150">
                                  <button
                                    onClick={() => handleOpenEditModal(tenant)}
                                    className="px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-emerald-600 flex items-center gap-1.5 rounded-lg whitespace-nowrap"
                                  >
                                    <Edit size={13} className="text-gray-400" />
                                    <span>Edit</span>
                                  </button>
                                  <div className="w-[1px] h-4 bg-gray-100 dark:bg-slate-800"></div>
                                  <button
                                    onClick={() => handleDeleteTenant(tenant)}
                                    className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 rounded-lg whitespace-nowrap"
                                  >
                                    <Trash2 size={13} />
                                    <span>Hapus</span>
                                  </button>
                                </div>
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
          </div>
        </>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                  <Building2 className="text-emerald-600" />
                  Tambah Klien Desa Baru
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Sistem akan secara otomatis menyarankan alamat email & password instan.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddTenant} className="overflow-y-auto p-6 space-y-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Village Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest border-b pb-1">Detail Instansi Desa</h4>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Nama Desa</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.nama_desa} 
                      onChange={e => setFormData({...formData, nama_desa: e.target.value})} 
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                      placeholder="Contoh: Desa Wasah Hilir" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Kode Desa (Unik / Rujukan Pusat)</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.kode_desa} 
                      onChange={e => setFormData({...formData, kode_desa: e.target.value})} 
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                      placeholder="Contoh: 1234WHi" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Domain / Subdomain Utama</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.domain} 
                      onChange={e => setFormData({...formData, domain: e.target.value})} 
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                      placeholder="Contoh: wasahhilir.sistemdidesa.id" 
                    />
                  </div>
                </div>

                {/* Initial Custom Credentials */}
                <div className="space-y-4 bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest border-b pb-1">Kredensial Login Pertama</h4>
                  
                  {/* Super Admin */}
                  <div className="space-y-2">
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded uppercase tracking-wider">Super Admin</span>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400">Email Super Admin</label>
                      <input 
                        type="email" 
                        value={formData.kades_email} 
                        onChange={e => setFormData({...formData, kades_email: e.target.value})}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900" 
                        placeholder="Masukkan email kades" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400">Password</label>
                      <input 
                        type="text" 
                        value={formData.kades_password} 
                        onChange={e => setFormData({...formData, kades_password: e.target.value})}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900" 
                        placeholder="kades123" 
                      />
                    </div>
                  </div>

                  {/* Admin */}
                  <div className="space-y-2 pt-2 border-t border-dashed">
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-black px-2 py-0.5 rounded uppercase tracking-wider">Admin</span>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400">Email Operator</label>
                      <input 
                        type="email" 
                        value={formData.admin_email} 
                        onChange={e => setFormData({...formData, admin_email: e.target.value})}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900" 
                        placeholder="Masukkan email admin" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400">Password</label>
                      <input 
                        type="text" 
                        value={formData.admin_password} 
                        onChange={e => setFormData({...formData, admin_password: e.target.value})}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900" 
                        placeholder="admin123" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-gray-200 transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan & Daftarkan Klien'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CREDENTIALS / DETAILS MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                  <Key className="text-emerald-600" />
                  Kelola Klien & Atur Kredensial Akses
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Ubah rincian domain, setel ulang password admin utama, atau suspend akun klien desa.</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditTenant} className="overflow-y-auto p-6 space-y-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client properties */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest border-b pb-1">Detail Registrasi Instansi</h4>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Nama Instansi Desa</label>
                    <input 
                      required 
                      type="text" 
                      value={editFormData.nama_desa} 
                      onChange={e => setEditFormData({...editFormData, nama_desa: e.target.value})} 
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Kode Desa (Unik)</label>
                    <input 
                      required 
                      type="text" 
                      value={editFormData.kode_desa} 
                      onChange={e => setEditFormData({...editFormData, kode_desa: e.target.value})} 
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Domain / Subdomain</label>
                    <input 
                      required 
                      type="text" 
                      value={editFormData.domain} 
                      onChange={e => setEditFormData({...editFormData, domain: e.target.value})} 
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">Status Klien</label>
                    <select 
                      value={editFormData.status} 
                      onChange={e => setEditFormData({...editFormData, status: e.target.value})} 
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="active">Aktif / Berlangganan</option>
                      <option value="inactive">Suspend / Non-aktif</option>
                    </select>
                  </div>
                </div>

                {/* Edit Credentials */}
                <div className="space-y-4 bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/40">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest border-b pb-1">Atur Kredensial Autentikasi</h4>
                  
                  {/* Super Admin */}
                  <div className="space-y-2">
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded uppercase tracking-wider">Super Admin</span>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400">Email Utama</label>
                      <input 
                        type="email" 
                        value={editFormData.kades_email} 
                        onChange={e => setEditFormData({...editFormData, kades_email: e.target.value})}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400">Kata Sandi Baru</label>
                      <input 
                        type="text" 
                        value={editFormData.kades_password} 
                        onChange={e => setEditFormData({...editFormData, kades_password: e.target.value})}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-mono" 
                      />
                    </div>
                  </div>

                  {/* Admin */}
                  <div className="space-y-2 pt-2 border-t border-dashed border-emerald-100">
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-black px-2 py-0.5 rounded uppercase tracking-wider">Admin</span>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400">Email Utama</label>
                      <input 
                        type="email" 
                        value={editFormData.admin_email} 
                        onChange={e => setEditFormData({...editFormData, admin_email: e.target.value})}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400">Kata Sandi Baru</label>
                      <input 
                        type="text" 
                        value={editFormData.admin_password} 
                        onChange={e => setEditFormData({...editFormData, admin_password: e.target.value})}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-mono" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-gray-200 transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan Kredensial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
