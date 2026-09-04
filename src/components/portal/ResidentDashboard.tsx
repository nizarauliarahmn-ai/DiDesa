import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, FileText, Heart, MessageSquare, LogOut, Phone, MapPin, Calendar, Loader2, Inbox, Award, Home, Edit3, Camera, X, Send, Plus, CheckCircle2, AlertCircle, ChevronLeft, Upload, RotateCcw } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { showToast } from '../../utils/toast';

interface ResidentSession { nik: string; name: string; phone?: string; tenantId: string; }
interface ResidentData { nik: string; name: string; no_whatsapp?: string; address?: string; rt?: string; rw?: string; gender?: string; birth_date?: string; religion?: string; job?: string; status?: string; photo?: string; }
interface BantuanItem { id: string; program_id: string; nama: string; tahun: number; status: string; source?: string; created_at: string; }
interface SuratItem { id: string; nomor: string; jenis_surat: string; status: string; keterangan?: string; created_at: string; }
interface AspirasiItem { id: string; kategori: string; subjek: string; pesan: string; status: string; tanggapan_admin?: string; created_at: string; }

type Tab = 'profil' | 'bantuan' | 'surat' | 'aspirasi';

const KATEGORI_BANTUAN = ['BLT Dana Desa', 'Beras Sejahtera', 'Subsidi Listrik', 'Bantuan Pangan', 'Program Keluarga Harapan', 'Lainnya'];
const JENIS_SURAT = ['Surat Keterangan Domisili', 'Surat Keterangan Usaha', 'Surat Keterangan Tidak Mampu', 'Surat Keterangan Kelahiran', 'Surat Keterangan Kematian', 'Surat Pengantar', 'Surat Keterangan Beda Nama', 'Surat Lainnya'];
const KATEGORI_ASPIRASI = ['Pengaduan', 'Saran', 'Kritik', 'Aspirasi Umum'];

export default function ResidentDashboard({ onLogout }: { onLogout: () => void }) {
  const [session] = useState<ResidentSession>(() => JSON.parse(localStorage.getItem('didesa_resident_user') || '{}'));
  const [resident, setResident] = useState<ResidentData | null>(null);
  const [bantuanList, setBantuanList] = useState<BantuanItem[]>([]);
  const [suratList, setSuratList] = useState<SuratItem[]>([]);
  const [aspirasiList, setAspirasiList] = useState<AspirasiItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('profil');
  const [loading, setLoading] = useState(true);

  // Form states
  const [showEditProfil, setShowEditProfil] = useState(false);
  const [showFormBantuan, setShowFormBantuan] = useState(false);
  const [showFormSurat, setShowFormSurat] = useState(false);
  const [showFormAspirasi, setShowFormAspirasi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit profile form
  const [editForm, setEditForm] = useState({ name: '', no_whatsapp: '', address: '', rt: '', rw: '', gender: '', birth_date: '', religion: '', job: '' });
  // Bantuan form
  const [bantuanForm, setBantuanForm] = useState({ program_id: '', keterangan: '' });
  // Surat form
  const [suratForm, setSuratForm] = useState({ jenis_surat: '', keterangan: '' });
  // Aspirasi form
  const [aspirasiForm, setAspirasiForm] = useState({ kategori: KATEGORI_ASPIRASI[0], subjek: '', pesan: '' });

  const fetchData = useCallback(async () => {
    if (!session.nik || !session.tenantId) return;
    setLoading(true);
    try {
      const [residentRes, bantuanRes, suratRes, aspirasiRes] = await Promise.all([
        supabase.from('residents').select('*').eq('nik', session.nik).eq('tenant_id', session.tenantId).limit(1).maybeSingle(),
        supabase.from('bansos_recipients').select('*').eq('resident_id', session.nik).eq('tenant_id', session.tenantId).order('created_at', { ascending: false }),
        supabase.from('surat').select('id, nomor, jenis_surat, status, keterangan, created_at').eq('nik', session.nik).eq('tenant_id', session.tenantId).order('created_at', { ascending: false }),
        supabase.from('aspirasi').select('id, kategori, subjek, pesan, status, tanggapan_admin, created_at').eq('nama_pengirim', session.name).eq('tenant_id', session.tenantId).order('created_at', { ascending: false }),
      ]);
      if (residentRes.data) {
        setResident(residentRes.data);
        setEditForm({
          name: residentRes.data.name || '',
          no_whatsapp: residentRes.data.no_whatsapp || '',
          address: residentRes.data.address || '',
          rt: residentRes.data.rt || '',
          rw: residentRes.data.rw || '',
          gender: residentRes.data.gender || '',
          birth_date: residentRes.data.birth_date || '',
          religion: residentRes.data.religion || '',
          job: residentRes.data.job || '',
        });
      }
      if (bantuanRes.data) setBantuanList(bantuanRes.data);
      if (suratRes.data) setSuratList(suratRes.data);
      if (aspirasiRes.data) setAspirasiList(aspirasiRes.data);
    } catch (e) { console.error('Gagal memuat data:', e); } finally { setLoading(false); }
  }, [session.nik, session.tenantId, session.name]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; } };
  const statusColor = (s: string) => ({ 'Baru': 'bg-blue-100 text-blue-700', 'Menunggu': 'bg-amber-100 text-amber-700', 'Proses': 'bg-indigo-100 text-indigo-700', 'Selesai': 'bg-emerald-100 text-emerald-700', 'aktif': 'bg-emerald-100 text-emerald-700', 'pending': 'bg-amber-100 text-amber-700' }[s] || 'bg-slate-100 text-slate-600');

  // === Save Profile ===
  const handleSaveProfil = async () => {
    setSubmitting(true);
    try {
      const tid = await resolveCurrentTenant();
      if (!tid) return;
      const { error } = await supabase.from('residents').update({
        name: editForm.name.trim(), no_whatsapp: editForm.no_whatsapp.trim() || null,
        address: editForm.address.trim() || null, rt: editForm.rt || null, rw: editForm.rw || null,
        gender: editForm.gender || null, birth_date: editForm.birth_date || null,
        religion: editForm.religion || null, job: editForm.job || null,
      }).eq('nik', session.nik).eq('tenant_id', tid);
      if (error) throw error;
      showToast('Profil berhasil diperbarui', 'success');
      setShowEditProfil(false);
      fetchData();
    } catch (e: any) { showToast('Gagal menyimpan: ' + (e.message || e), 'error'); } finally { setSubmitting(false); }
  };

  // === Upload Photo ===
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const fileName = `resident-${session.nik}-${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage.from('public-assets').upload(fileName, file, { contentType: file.type, upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('public-assets').getPublicUrl(fileName);
      const photoUrl = urlData.publicUrl;
      const tid = await resolveCurrentTenant();
      if (!tid) return;
      await supabase.from('residents').update({ photo: photoUrl }).eq('nik', session.nik).eq('tenant_id', tid);
      setResident(prev => prev ? { ...prev, photo: photoUrl } : prev);
      showToast('Foto profil berhasil diunggah', 'success');
    } catch (e: any) { showToast('Gagal upload foto: ' + e.message, 'error'); } finally { setPhotoUploading(false); }
  };

  const handleResetPhoto = async () => {
    setPhotoUploading(true);
    try {
      const tid = await resolveCurrentTenant();
      if (!tid) return;
      await supabase.from('residents').update({ photo: null }).eq('nik', session.nik).eq('tenant_id', tid);
      setResident(prev => prev ? { ...prev, photo: undefined } : prev);
      showToast('Foto profil direset ke default', 'success');
    } catch { showToast('Gagal reset foto', 'error'); } finally { setPhotoUploading(false); }
  };

  // === Submit Bantuan ===
  const handleSubmitBantuan = async () => {
    if (!bantuanForm.program_id) { showToast('Pilih program bantuan', 'error'); return; }
    setSubmitting(true);
    try {
      const tid = await resolveCurrentTenant();
      if (!tid) return;
      const { error } = await supabase.from('bansos_recipients').insert({
        tenant_id: tid, program_id: bantuanForm.program_id, resident_id: session.nik,
        nama: session.name, tahun: new Date().getFullYear(), status: 'pending', source: 'Pengajuan Warga',
      });
      if (error) throw error;
      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`, tenant_id: tid, title: 'Usulan Bantuan Baru',
        message: `${session.name} mengajukan bantuan: ${bantuanForm.program_id}`, category: 'Services', is_read: false, timestamp: new Date().toISOString(),
      }]);
      showToast('Pengajuan bantuan berhasil dikirim', 'success');
      setShowFormBantuan(false); setBantuanForm({ program_id: '', keterangan: '' }); fetchData();
    } catch (e: any) { showToast('Gagal mengirim: ' + e.message, 'error'); } finally { setSubmitting(false); }
  };

  // === Submit Surat ===
  const handleSubmitSurat = async () => {
    if (!suratForm.jenis_surat) { showToast('Pilih jenis surat', 'error'); return; }
    setSubmitting(true);
    try {
      const tid = await resolveCurrentTenant();
      if (!tid) return;
      const { error } = await supabase.from('surat').insert({
        tenant_id: tid, jenis_surat: suratForm.jenis_surat, nomor: 'PENDING',
        nik: session.nik, nama: session.name, keterangan: suratForm.keterangan || null, status: 'pending',
      });
      if (error) throw error;
      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`, tenant_id: tid, title: 'Permohonan Surat Baru',
        message: `${session.name} mengajukan: ${suratForm.jenis_surat}`, category: 'Services', is_read: false, timestamp: new Date().toISOString(),
      }]);
      showToast('Permohonan surat berhasil dikirim', 'success');
      setShowFormSurat(false); setSuratForm({ jenis_surat: '', keterangan: '' }); fetchData();
    } catch (e: any) { showToast('Gagal mengirim: ' + e.message, 'error'); } finally { setSubmitting(false); }
  };

  // === Submit Aspirasi ===
  const handleSubmitAspirasi = async () => {
    if (!aspirasiForm.subjek.trim()) { showToast('Subjek wajib diisi', 'error'); return; }
    if (!aspirasiForm.pesan.trim()) { showToast('Pesan wajib diisi', 'error'); return; }
    setSubmitting(true);
    try {
      const tid = await resolveCurrentTenant();
      if (!tid) return;
      const { error } = await supabase.from('aspirasi').insert({
        tenant_id: tid, kategori: aspirasiForm.kategori, subjek: aspirasiForm.subjek.trim(),
        pesan: aspirasiForm.pesan.trim(), nama_pengirim: session.name, nama: session.name,
        judul: aspirasiForm.subjek.trim(), status: 'Baru',
      });
      if (error) throw error;
      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`, tenant_id: tid, title: `Aspirasi: ${aspirasiForm.kategori}`,
        message: `${session.name}: "${aspirasiForm.subjek.trim()}"`, category: 'Services', is_read: false, timestamp: new Date().toISOString(),
      }]);
      showToast('Aspirasi berhasil dikirim', 'success');
      setShowFormAspirasi(false); setAspirasiForm({ kategori: KATEGORI_ASPIRASI[0], subjek: '', pesan: '' }); fetchData();
    } catch (e: any) { showToast('Gagal mengirim: ' + e.message, 'error'); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'profil', label: 'Profil', icon: <User size={16} /> },
    { id: 'bantuan', label: 'Bantuan', icon: <Heart size={16} />, count: bantuanList.length },
    { id: 'surat', label: 'Surat', icon: <FileText size={16} />, count: suratList.length },
    { id: 'aspirasi', label: 'Aspirasi', icon: <MessageSquare size={16} />, count: aspirasiList.length },
  ];

  const avatarInitials = session.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <div className="bg-emerald-700 text-white px-4 py-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-sm font-bold">{avatarInitials}</div>
            <div>
              <h1 className="text-sm font-bold">{session.name}</h1>
              <p className="text-[11px] text-emerald-200 font-mono">NIK: {session.nik}</p>
            </div>
          </div>
          <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Keluar"><LogOut size={18} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-all ${activeTab === t.id ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t.icon}<span>{t.label}</span>
              {t.count !== undefined && t.count > 0 && <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded-full">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* ===== PROFIL ===== */}
        {activeTab === 'profil' && resident && (
          <div className="space-y-4">
            {/* Photo */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              <div className="relative group mb-3">
                {resident.photo ? (
                  <img src={resident.photo} alt="Foto Profil" className="w-24 h-24 rounded-full object-cover border-4 border-emerald-200" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-700 border-4 border-emerald-200">{avatarInitials}</div>
                )}
                <button onClick={() => fileInputRef.current?.click()} disabled={photoUploading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-50">
                  {photoUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => fileInputRef.current?.click()} disabled={photoUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all">
                  <Upload size={12} /> Unggah Foto
                </button>
                {resident.photo && (
                  <button onClick={handleResetPhoto} disabled={photoUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all">
                    <RotateCcw size={12} /> Reset Default
                  </button>
                )}
              </div>
            </div>

            {/* Data Diri */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><User size={16} className="text-emerald-600" /> Data Diri</h2>
                <button onClick={() => setShowEditProfil(true)} className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"><Edit3 size={12} /> Edit</button>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'NIK', value: resident.nik },
                  { label: 'Nama', value: resident.name },
                  { label: 'Jenis Kelamin', value: resident.gender },
                  { label: 'Tanggal Lahir', value: resident.birth_date },
                  { label: 'Agama', value: resident.religion },
                  { label: 'Pekerjaan', value: resident.job },
                  { label: 'No. WhatsApp', value: resident.no_whatsapp },
                  { label: 'Alamat', value: resident.address },
                  { label: 'RT / RW', value: resident.rt && resident.rw ? `${resident.rt} / ${resident.rw}` : null },
                ].filter(i => i.value).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-400 font-bold uppercase">{item.label}</p>
                      <p className="text-sm text-slate-800 font-medium">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit Profile Modal */}
            {showEditProfil && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                    <button onClick={() => setShowEditProfil(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                    <h3 className="text-sm font-bold">Edit Profil</h3>
                    <button onClick={handleSaveProfil} disabled={submitting} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50">{submitting ? 'Menyimpan...' : 'Simpan'}</button>
                  </div>
                  <div className="p-4 space-y-3">
                    {[
                      { label: 'Nama Lengkap', key: 'name', type: 'text', required: true },
                      { label: 'No. WhatsApp', key: 'no_whatsapp', type: 'tel', placeholder: '08xxxxxxxxxx' },
                      { label: 'Jenis Kelamin', key: 'gender', type: 'select', options: ['', 'Laki-laki', 'Perempuan'] },
                      { label: 'Tanggal Lahir', key: 'birth_date', type: 'date' },
                      { label: 'Agama', key: 'religion', type: 'select', options: ['', 'Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'] },
                      { label: 'Pekerjaan', key: 'job', type: 'text' },
                      { label: 'Alamat', key: 'address', type: 'text' },
                      { label: 'RT', key: 'rt', type: 'text', placeholder: '001' },
                      { label: 'RW', key: 'rw', type: 'text', placeholder: '001' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">{f.label}{f.required && ' *'}</label>
                        {f.type === 'select' ? (
                          <select value={(editForm as any)[f.key]} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                            {f.options!.map(o => <option key={o} value={o}>{o || '- Pilih -'}</option>)}
                          </select>
                        ) : (
                          <input type={f.type} value={(editForm as any)[f.key]} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder || ''} required={f.required}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== BANTUAN ===== */}
        {activeTab === 'bantuan' && (
          <div className="space-y-3">
            <button onClick={() => setShowFormBantuan(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm">
              <Plus size={16} /> Ajukan Usulan Bantuan
            </button>
            {bantuanList.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">Belum ada riwayat bantuan</p>
              </div>
            ) : bantuanList.map(b => (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0"><Award className="w-6 h-6 text-amber-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{b.program_id}</p>
                  <p className="text-xs text-slate-500">{b.tahun} &middot; {b.source || 'Sistem'}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColor(b.status)}`}>{b.status}</span>
              </div>
            ))}
            {showFormBantuan && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md">
                  <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                    <button onClick={() => setShowFormBantuan(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                    <h3 className="text-sm font-bold">Usulan Bantuan</h3>
                    <div className="w-6" />
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Program Bantuan *</label>
                      <select value={bantuanForm.program_id} onChange={e => setBantuanForm(p => ({ ...p, program_id: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                        <option value="">- Pilih Program -</option>
                        {KATEGORI_BANTUAN.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Keterangan (Opsional)</label>
                      <textarea value={bantuanForm.keterangan} onChange={e => setBantuanForm(p => ({ ...p, keterangan: e.target.value }))}
                        placeholder="Alasan pengajuan..." rows={3}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                    </div>
                    <button onClick={handleSubmitBantuan} disabled={submitting}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} /> Kirim Pengajuan</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== SURAT ===== */}
        {activeTab === 'surat' && (
          <div className="space-y-3">
            <button onClick={() => setShowFormSurat(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm">
              <Plus size={16} /> Ajukan Permohonan Surat
            </button>
            {suratList.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">Belum ada dokumen surat</p>
              </div>
            ) : suratList.map(s => (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0"><FileText className="w-6 h-6 text-blue-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{s.jenis_surat}</p>
                  <p className="text-xs text-slate-500 font-mono">{s.nomor}</p>
                  {s.keterangan && <p className="text-xs text-slate-400 mt-0.5 truncate">{s.keterangan}</p>}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColor(s.status)}`}>{s.status}</span>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDate(s.created_at)}</p>
                </div>
              </div>
            ))}
            {showFormSurat && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md">
                  <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                    <button onClick={() => setShowFormSurat(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                    <h3 className="text-sm font-bold">Permohonan Surat</h3>
                    <div className="w-6" />
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Jenis Surat *</label>
                      <select value={suratForm.jenis_surat} onChange={e => setSuratForm(p => ({ ...p, jenis_surat: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                        <option value="">- Pilih Jenis Surat -</option>
                        {JENIS_SURAT.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Keterangan / Keperluan</label>
                      <textarea value={suratForm.keterangan} onChange={e => setSuratForm(p => ({ ...p, keterangan: e.target.value }))}
                        placeholder="Untuk keperluan apa surat ini..." rows={3}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                    </div>
                    <button onClick={handleSubmitSurat} disabled={submitting}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} /> Kirim Permohonan</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== ASPIRASI ===== */}
        {activeTab === 'aspirasi' && (
          <div className="space-y-3">
            <button onClick={() => setShowFormAspirasi(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm">
              <Plus size={16} /> Kirim Aspirasi
            </button>
            {aspirasiList.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">Belum ada aspirasi</p>
              </div>
            ) : aspirasiList.map(a => (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 font-bold uppercase">{a.kategori}</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{a.subjek}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ml-2 ${statusColor(a.status)}`}>{a.status}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 mb-2">{a.pesan}</p>
                {a.tanggapan_admin && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mt-2">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Tanggapan Admin</p>
                    <p className="text-xs text-emerald-800">{a.tanggapan_admin}</p>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 mt-2">{formatDate(a.created_at)}</p>
              </div>
            ))}
            {showFormAspirasi && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md">
                  <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                    <button onClick={() => setShowFormAspirasi(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                    <h3 className="text-sm font-bold">Kirim Aspirasi</h3>
                    <div className="w-6" />
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Kategori *</label>
                      <select value={aspirasiForm.kategori} onChange={e => setAspirasiForm(p => ({ ...p, kategori: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                        {KATEGORI_ASPIRASI.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Subjek *</label>
                      <input type="text" value={aspirasiForm.subjek} onChange={e => setAspirasiForm(p => ({ ...p, subjek: e.target.value }))}
                        placeholder="Judul aspirasi..." required
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Pesan *</label>
                      <textarea value={aspirasiForm.pesan} onChange={e => setAspirasiForm(p => ({ ...p, pesan: e.target.value }))}
                        placeholder="Tuliskan aspirasi Anda..." rows={4} required
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                    </div>
                    <button onClick={handleSubmitAspirasi} disabled={submitting}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} /> Kirim Aspirasi</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
