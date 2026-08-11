import React, { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle2, XCircle, Phone, Clock, MapPin, Mail, ShieldCheck, Building2, ExternalLink } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { addSaaSLog } from '../../utils/saasLogs';
import { fetchSaaSTenantRequests, updateSaaSTenantRequestStatus } from '../../utils/saasLeads';

const toWaNumber = (p: string) => {
  let digits = (p || '').replace(/[^\d]/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  return digits;
};

const waLink = (p: string, text: string) => `https://wa.me/${toWaNumber(p)}?text=${encodeURIComponent(text)}`;

export default function AdminPendingApprovals() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [applicants, setApplicants] = useState<Record<string, string>>({});

  const authUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const loadApplicants = async () => {
    try {
      const leads = await fetchSaaSTenantRequests();
      const map: Record<string, string> = {};
      leads.forEach(l => {
        map[l.subdomain] = l.applicantName;
      });
      setApplicants(map);
    } catch (e) {
      console.error('Error loading applicant names:', e);
    }
  };

  const loadPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching pending approvals:', error);
    setPending(data || []);
    setLoading(false);
    window.dispatchEvent(new Event('tenant_approvals_updated'));
  };

  useEffect(() => {
    loadPending();
    loadApplicants();

    const channel = supabase.channel('tenants_pending_changes');
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => loadPending())
      .subscribe();

    const handleLeadsUpdate = () => loadApplicants();
    window.addEventListener('tenant_requests_updated', handleLeadsUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('tenant_requests_updated', handleLeadsUpdate);
    };
  }, []);

  const syncLeadStatus = async (t: any, status: 'Diterima' | 'Ditolak') => {
    try {
      const leads = await fetchSaaSTenantRequests();
      const matching = leads.filter(l =>
        l.subdomain === t.domain ||
        l.phone === toWaNumber(t.kontak || '') ||
        l.villageName === t.nama_desa
      );
      for (const lead of matching) {
        await updateSaaSTenantRequestStatus(lead.id, status);
      }
    } catch (e) {
      console.error('Error syncing lead status:', e);
    }
  };

  const handleApprove = async (t: any) => {
    if (!window.confirm(`Setujui pendaftaran "${t.nama_desa}"? Akun akan segera aktif dan dapat login.`)) return;

    const { error } = await supabase.from('tenants').update({ status: 'active' }).eq('id', t.id);
    if (error) {
      showToast(`Gagal menyetujui: ${error.message}`, 'error');
      return;
    }

    await syncLeadStatus(t, 'Diterima');

    addSaaSLog({
      admin: authUser?.name || 'SaaS Admin',
      aksi: 'Setujui Pendaftaran Desa',
      target: t.nama_desa,
      status: 'Berhasil'
    });

    showToast(`Pendaftaran "${t.nama_desa}" disetujui!`, 'success');
    loadPending();
    loadApplicants();

    const waNumber = toWaNumber(t.kontak || '');
    if (waNumber.length >= 8) {
      const message =
        `Assalamu'alaikum. Pendaftaran portal DiDesa untuk ${t.nama_desa} telah DISETUJUI ✅.\n\n` +
        `Anda kini dapat masuk menggunakan:\n- Email: ${t.admin_email || '-'}\n- Kata sandi yang Anda daftarkan\n\n` +
        `Buka portal melalui link berikut:\n${window.location.origin}/?tenant=${t.domain}\n\n— Tim DiDesa`;
      window.open(waLink(t.kontak || '', message), '_blank');
    }
  };

  const handleReject = async (t: any) => {
    if (!window.confirm(`Tolak pendaftaran "${t.nama_desa}"? Data akan ditandai nonaktif dan tidak dapat login.`)) return;

    const { error } = await supabase.from('tenants').update({ status: 'inactive' }).eq('id', t.id);
    if (error) {
      showToast(`Gagal menolak: ${error.message}`, 'error');
      return;
    }

    await syncLeadStatus(t, 'Ditolak');

    addSaaSLog({
      admin: authUser?.name || 'SaaS Admin',
      aksi: 'Tolak Pendaftaran Desa',
      target: t.nama_desa,
      status: 'Berhasil'
    });

    showToast(`Pendaftaran "${t.nama_desa}" ditolak.`, 'success');
    loadPending();
    loadApplicants();

    const waNumber = toWaNumber(t.kontak || '');
    if (waNumber.length >= 8) {
      const message =
        `Assalamu'alaikum. Mohon maaf, pengajuan pendaftaran portal DiDesa untuk ${t.nama_desa} belum dapat disetujui saat ini.\n\n` +
        `Silakan hubungi Tim DiDesa untuk informasi lebih lanjut.\n\n— Tim DiDesa`;
      window.open(waLink(t.kontak || '', message), '_blank');
    }
  };

  const filtered = pending.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      (t.nama_desa || '').toLowerCase().includes(q) ||
      (t.domain || '').toLowerCase().includes(q) ||
      (t.kecamatan || '').toLowerCase().includes(q) ||
      (t.kabupaten || '').toLowerCase().includes(q) ||
      (t.admin_email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Persetujuan Desa (Pending Approvals)
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar pendaftaran desa yang menunggu verifikasi. Setujui untuk mengaktifkan akses atau tolak pengajuan.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Cari desa, subdomain, kecamatan, atau email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            {pending.length} pengajuan menunggu
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-600" />
            <p>Memuat pengajuan...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <CheckCircle2 size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Tidak ada pengajuan menunggu</h3>
            <p className="text-slate-500 dark:text-slate-400">Semua pendaftaran desa telah ditindaklanjuti.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-4 font-semibold text-sm text-slate-500 dark:text-slate-400">DESA</th>
                  <th className="pb-4 font-semibold text-sm text-slate-500 dark:text-slate-400">WILAYAH</th>
                  <th className="pb-4 font-semibold text-sm text-slate-500 dark:text-slate-400">PENDAFTAR</th>
                  <th className="pb-4 font-semibold text-sm text-slate-500 dark:text-slate-400">EMAIL LOGIN</th>
                  <th className="pb-4 font-semibold text-sm text-slate-500 dark:text-slate-400">KONTAK WA</th>
                  <th className="pb-4 font-semibold text-sm text-slate-500 dark:text-slate-400">WAKTU PENGAJUAN</th>
                  <th className="pb-4 font-semibold text-sm text-slate-500 dark:text-slate-400 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map((t) => (
                  <tr key={t.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 align-top">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center shrink-0 border border-emerald-100 font-bold text-xs">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{t.nama_desa}</div>
                          <div className="text-sm text-blue-600 dark:text-blue-400 mt-0.5">{t.domain}.sistemdidesa.id</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 align-top">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-sm">
                        <MapPin size={14} className="text-slate-400" />
                        {t.kecamatan || '-'}, {t.kabupaten || '-'}
                      </div>
                    </td>
                    <td className="py-4 align-top">
                      <div className="text-slate-900 dark:text-white font-medium">{applicants[t.domain] || 'Pendaftar'}</div>
                    </td>
                    <td className="py-4 align-top">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                        <Mail size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="font-mono text-xs">{t.admin_email || '-'}</span>
                      </div>
                    </td>
                    <td className="py-4 align-top">
                      <a
                        href={waLink(t.kontak || '', `Halo, ini Tim DiDesa. Kami menerima pendaftaran ${t.nama_desa}.`)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Phone size={14} />
                        {t.kontak || '-'}
                      </a>
                    </td>
                    <td className="py-4 align-top">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium text-sm">
                        <Clock size={16} className="text-slate-400" />
                        {t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </div>
                    </td>
                    <td className="py-4 align-top text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleApprove(t)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                          title="Setujui & hubungi via WhatsApp"
                        >
                          <CheckCircle2 size={15} />
                          Setujui
                        </button>
                        <button
                          onClick={() => handleReject(t)}
                          className="px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                          title="Tolak pengajuan"
                        >
                          <XCircle size={15} />
                          Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-3">
          <ExternalLink size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            Tombol <strong>Setujui</strong> langsung mengaktifkan akun (status menjadi aktif) sekaligus membuka WhatsApp dengan pesan konfirmasi ke nomor desa. Pendaftaran yang ditolak ditandai nonaktif dan tidak dapat login.
          </p>
        </div>
      </div>
    </div>
  );
}