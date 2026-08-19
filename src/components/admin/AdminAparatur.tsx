import { useState, useEffect, useRef } from 'react';
import { Users, Edit3, Save, Check, X, Building2, UserCheck, Trash2, ShieldCheck, Award, RefreshCw, Printer, MapPin, MessageCircle, IdCard, BadgeCheck, User } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { generateKopSuratHTML } from '../../utils/letterFormat';
import { SAAS_CONFIG } from './surat/AdminSuratMasterTemplate';
import ResidentSearchInput from './ResidentSearchInput';

interface Officer {
  name: string;
  role: string;
  nip?: string;
  residentId?: string;
  nik?: string;
  gender?: string;
  birthPlace?: string;
  birthDate?: string;
  address?: string;
  rtRw?: string;
  photo?: string;
  phone?: string;
  status?: string;
  period?: string;
}

interface RtRwItem extends Officer {
  no: string;
}

// Kolom yang sah (valid) pada objek aparatur — hanya field ini yang boleh masuk
// ke saas_settings (value JSON) saat insert/update.
const OFFICER_VALID_FIELDS = ['name', 'role', 'nip', 'residentId', 'nik', 'gender', 'birthPlace', 'birthDate', 'address', 'rtRw', 'photo', 'phone', 'status', 'period'];

function sanitizeOfficer(raw: Officer): Officer {
  const clean: Officer = { name: String(raw.name || '').trim().toUpperCase(), role: raw.role || '' };
  for (const key of OFFICER_VALID_FIELDS) {
    if (key === 'name' || key === 'role') continue;
    const value = (raw as any)[key];
    if (value !== undefined && value !== null && String(value).trim() !== '' && String(value).trim() !== '-') {
      (clean as any)[key] = value;
    }
  }
  return clean;
}

export default function AdminAparatur() {
  const [authUser, setAuthUser] = useState<{ role: string; isImpersonated?: boolean } | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);

  // Data States
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [bpdList, setBpdList] = useState<Officer[]>([]);
  const [lpmList, setLpmList] = useState<Officer[]>([]);
  const [namaKades, setNamaKades] = useState<string>(() => localStorage.getItem('kop_kades') || '');

  // Camat / Left Signature
  const [sigLeftRole, setSigLeftRole] = useState('Camat Simpur');
  const [sigLeftName, setSigLeftName] = useState('........................');
  const [sigLeftPangkat, setSigLeftPangkat] = useState('');
  const [sigLeftNip, setSigLeftNip] = useState('');

  // RT / RW
  const [rtList, setRtList] = useState<RtRwItem[]>([]);
  const [rwList, setRwList] = useState<RtRwItem[]>([]);
  const [rtForm, setRtForm] = useState<RtRwItem>({ no: '', name: '', role: 'Ketua RT', nip: '-' });
  const [rwForm, setRwForm] = useState<RtRwItem>({ no: '', name: '', role: 'Ketua RW', nip: '-' });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<'perangkat' | 'bpd' | 'lpm'>('perangkat');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [officerForm, setOfficerForm] = useState<Officer>({ name: '', role: '', nip: '-' });

  // Hybrid Search & Auto-Fill ditangani komponen reusable <ResidentSearchInput />
  // (query .ilike ke tabel residents, isolasi tenant_id, toggle manual).

  const applyResidentToForm = (resident: any) => {
    setOfficerForm(prev => ({
      ...prev,
      name: String(resident.name || prev.name || '').toUpperCase(),
      residentId: resident.nik || undefined,
      nik: resident.nik || prev.nik,
      gender: resident.gender || prev.gender,
      birthPlace: resident.birth_place || prev.birthPlace,
      birthDate: resident.birth_date || prev.birthDate,
      address: resident.address || prev.address,
      rtRw: resident.rt_rw || prev.rtRw,
      photo: resident.photo || prev.photo,
    }));
  };

  const applyResidentToRtForm = (resident: any) => {
    setRtForm(prev => ({
      ...prev,
      name: String(resident.name || prev.name || '').toUpperCase(),
      residentId: resident.nik || undefined,
      nik: resident.nik || prev.nik,
      gender: resident.gender || prev.gender,
      birthPlace: resident.birth_place || prev.birthPlace,
      birthDate: resident.birth_date || prev.birthDate,
      address: resident.address || prev.address,
      rtRw: resident.rt_rw || prev.rtRw,
      photo: resident.photo || prev.photo,
    }));
  };

  const applyResidentToRwForm = (resident: any) => {
    setRwForm(prev => ({
      ...prev,
      name: String(resident.name || prev.name || '').toUpperCase(),
      residentId: resident.nik || undefined,
      nik: resident.nik || prev.nik,
      gender: resident.gender || prev.gender,
      birthPlace: resident.birth_place || prev.birthPlace,
      birthDate: resident.birth_date || prev.birthDate,
      address: resident.address || prev.address,
      rtRw: resident.rt_rw || prev.rtRw,
      photo: resident.photo || prev.photo,
    }));
  };

  // Print Report Setup
  const reportPrintRef = useRef<HTMLDivElement>(null);
  
  const handleTriggerPrintReport = () => {
    if (!reportPrintRef.current) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Laporan_Data_Aparatur_${(localStorage.getItem('kop_desa') || 'Desa').replace(/\s+/g, '_')}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            @media print {
              html, body {
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              table {
                page-break-inside: auto;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              /* Tabel detail kependudukan (8 kolom) — rapat & muat di A4 */
              table.aparatur-detail {
                width: 100%;
                table-layout: fixed;
                border-collapse: collapse;
                font-size: 10px;
                line-height: 1.25;
              }
              table.aparatur-detail th,
              table.aparatur-detail td {
                padding: 3px 4px;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              .saas-global-footer {
                position: fixed !important;
                bottom: 10mm !important;
                left: 15mm !important;
                right: 15mm !important;
                width: auto !important;
                background: white !important;
              }
            }
            body { font-family: sans-serif; color: black; background: white; margin: 0; }
          </style>
        </head>
        <body>
          <table style="width: 100%; border-collapse: collapse; border: none;">
            <thead style="display: table-header-group;">
              <tr><td style="height: 15mm; padding: 0; border: none;"></td></tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 0 15mm; border: none;">
                  <div class="font-sans text-black bg-white w-full text-left">
                    ${reportPrintRef.current.innerHTML}
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot style="display: table-footer-group;">
              <tr><td style="height: 25mm; padding: 0; border: none;"></td></tr>
            </tfoot>
          </table>
          ${SAAS_CONFIG.globalFooterHTML}
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
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printContent);
      doc.close();
      
      // Wait for Tailwind to process styles before printing
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 700);
    }
  };

  const isSuperAdmin = authUser?.role === 'kades' || authUser?.isImpersonated;

  // Load Data from Local & Supabase Cloud
  const fetchCloudSettings = async () => {
    setIsSyncing(true);
    const tid = await resolveCurrentTenant();
    setTenantId(tid);

    // Load Local Cache First
    try {
      const storedOff = localStorage.getItem('village_officers');
      if (storedOff) setOfficers(JSON.parse(storedOff));
      const storedBpd = localStorage.getItem('village_bpd');
      if (storedBpd) setBpdList(JSON.parse(storedBpd));
      const storedLpm = localStorage.getItem('village_lpm');
      if (storedLpm) setLpmList(JSON.parse(storedLpm));
      const storedRt = localStorage.getItem('village_rt_list');
      if (storedRt) setRtList(JSON.parse(storedRt));
      const storedRw = localStorage.getItem('village_rw_list');
      if (storedRw) setRwList(JSON.parse(storedRw));
      
      const kades = localStorage.getItem('kop_kades');
      if (kades) setNamaKades(kades);
      const roleL = localStorage.getItem('village_signature_left_role');
      if (roleL) setSigLeftRole(roleL);
      const nameL = localStorage.getItem('village_signature_left_name');
      if (nameL) setSigLeftName(nameL);
      const pnkL = localStorage.getItem('village_signature_left_pangkat');
      if (pnkL) setSigLeftPangkat(pnkL);
      const nipL = localStorage.getItem('village_signature_left_nip');
      if (nipL) setSigLeftNip(nipL);
    } catch (e) {}

    // Fetch ONLINE from Supabase Cloud
    if (tid) {
      try {
        const { data, error } = await supabase
          .from('saas_settings')
          .select('key, value')
          .eq('tenant_id', tid);

        if (!error && data && data.length > 0) {
          data.forEach(item => {
            if (item.key === 'village_officers' && item.value) {
              try { setOfficers(JSON.parse(item.value)); localStorage.setItem('village_officers', item.value); } catch {}
            }
            if (item.key === 'village_bpd' && item.value) {
              try { setBpdList(JSON.parse(item.value)); localStorage.setItem('village_bpd', item.value); } catch {}
            }
            if (item.key === 'village_lpm' && item.value) {
              try { setLpmList(JSON.parse(item.value)); localStorage.setItem('village_lpm', item.value); } catch {}
            }
            if (item.key === 'kop_kades' && item.value) {
              setNamaKades(item.value); localStorage.setItem('kop_kades', item.value);
            }
            if (item.key === 'village_signature_left_role' && item.value) {
              setSigLeftRole(item.value); localStorage.setItem('village_signature_left_role', item.value);
            }
            if (item.key === 'village_signature_left_name' && item.value) {
              setSigLeftName(item.value); localStorage.setItem('village_signature_left_name', item.value);
            }
            if (item.key === 'village_signature_left_pangkat' && item.value) {
              setSigLeftPangkat(item.value); localStorage.setItem('village_signature_left_pangkat', item.value);
            }
            if (item.key === 'village_signature_left_nip' && item.value) {
              setSigLeftNip(item.value); localStorage.setItem('village_signature_left_nip', item.value);
            }
            if (item.key === 'village_rt_list' && item.value) {
              try { setRtList(JSON.parse(item.value)); localStorage.setItem('village_rt_list', item.value); } catch {}
            }
            if (item.key === 'village_rw_list' && item.value) {
              try { setRwList(JSON.parse(item.value)); localStorage.setItem('village_rw_list', item.value); } catch {}
            }
          });
          setCloudSynced(true);
        }
      } catch (err) {
        console.error('Failed to load online settings from Supabase:', err);
      }
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    fetchCloudSettings();
    const saved = localStorage.getItem('didesa_auth_user');
    if (saved) setAuthUser(JSON.parse(saved));
  }, []);

  // Save All to Supabase Cloud & Local Storage
  const handleSaveAll = async () => {
    if (!isSuperAdmin) {
      showToast('Akses ditolak: Hanya Super Admin yang dapat menyimpan pengaturan ini.', 'error');
      return;
    }

    setIsSyncing(true);

    // Save to Local Cache
    localStorage.setItem('village_officers', JSON.stringify(officers));
    localStorage.setItem('village_bpd', JSON.stringify(bpdList));
    localStorage.setItem('village_lpm', JSON.stringify(lpmList));
    localStorage.setItem('kop_kades', namaKades);
    localStorage.setItem('village_signature_left_role', sigLeftRole);
    localStorage.setItem('village_signature_left_name', sigLeftName);
    localStorage.setItem('village_signature_left_pangkat', sigLeftPangkat);
    localStorage.setItem('village_signature_left_nip', sigLeftNip);
    localStorage.setItem('village_rt_list', JSON.stringify(rtList));
    localStorage.setItem('village_rw_list', JSON.stringify(rwList));

    // Save ONLINE to Supabase Cloud — Batch upsert (1 request, bukan 20)
    if (tenantId) {
      const settingsToSave = [
        { tenant_id: tenantId, key: 'village_officers', value: JSON.stringify(officers) },
        { tenant_id: tenantId, key: 'village_bpd', value: JSON.stringify(bpdList) },
        { tenant_id: tenantId, key: 'village_lpm', value: JSON.stringify(lpmList) },
        { tenant_id: tenantId, key: 'kop_kades', value: namaKades },
        { tenant_id: tenantId, key: 'village_signature_left_role', value: sigLeftRole },
        { tenant_id: tenantId, key: 'village_signature_left_name', value: sigLeftName },
        { tenant_id: tenantId, key: 'village_signature_left_pangkat', value: sigLeftPangkat },
        { tenant_id: tenantId, key: 'village_signature_left_nip', value: sigLeftNip },
        { tenant_id: tenantId, key: 'village_rt_list', value: JSON.stringify(rtList) },
        { tenant_id: tenantId, key: 'village_rw_list', value: JSON.stringify(rwList) },
      ];

      try {
        const { error: upsertError } = await supabase
          .from('saas_settings')
          .upsert(settingsToSave, { onConflict: 'tenant_id,key' });

        if (upsertError) {
          // Fallback: jika upsert gagal (constraint belum ada), coba sequential
          console.warn('[Aparatur] Upsert gagal, fallback sequential:', upsertError);
          for (const s of settingsToSave) {
            const { data: existing } = await supabase
              .from('saas_settings')
              .select('key')
              .eq('tenant_id', tenantId)
              .eq('key', s.key)
              .maybeSingle();
            if (existing) {
              await supabase.from('saas_settings').update({ value: s.value }).eq('tenant_id', tenantId).eq('key', s.key);
            } else {
              await supabase.from('saas_settings').insert(s);
            }
          }
        }

        setCloudSynced(true);
        showToast('Berhasil menyimpan data aparatur & disinkronkan ke cloud! ✓', 'success');
      } catch (err) {
        console.error('Failed to sync settings to Supabase', err);
        showToast('Tersimpan di lokal. Gagal sinkron ke Cloud Supabase.', 'error');
      }
    } else {
      showToast('Berhasil menyimpan ke penyimpanan lokal.', 'success');
    }

    setIsSyncing(false);
    window.dispatchEvent(new Event('village_settings_updated'));
  };

  // Modal Open Handlers
  const handleOpenAddModal = (cat: 'perangkat' | 'bpd' | 'lpm') => {
    setModalCategory(cat);
    setEditingIndex(null);
    let defaultRole = 'Staf Desa';
    if (cat === 'bpd') defaultRole = 'Anggota BPD';
    if (cat === 'lpm') defaultRole = 'Anggota LPM';
    setOfficerForm({ name: '', role: defaultRole, nip: '-' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: 'perangkat' | 'bpd' | 'lpm', idx: number) => {
    setModalCategory(cat);
    setEditingIndex(idx);
    let existing: Officer;
    if (cat === 'perangkat') existing = officers[idx];
    else if (cat === 'bpd') existing = bpdList[idx];
    else existing = lpmList[idx];
    setOfficerForm(existing);
    setIsModalOpen(true);
  };

  const handleSaveModal = () => {
    const sanitized = sanitizeOfficer(officerForm);
    if (!sanitized.name.trim()) {
      showToast('Nama lengkap wajib diisi!', 'error');
      return;
    }

    if (modalCategory === 'perangkat') {
      let updated = [...officers];
      if (editingIndex !== null) updated[editingIndex] = sanitized;
      else updated.push(sanitized);
      setOfficers(updated);
    } else if (modalCategory === 'bpd') {
      let updated = [...bpdList];
      if (editingIndex !== null) updated[editingIndex] = sanitized;
      else updated.push(sanitized);
      setBpdList(updated);
    } else if (modalCategory === 'lpm') {
      let updated = [...lpmList];
      if (editingIndex !== null) updated[editingIndex] = sanitized;
      else updated.push(sanitized);
      setLpmList(updated);
    }

    setIsModalOpen(false);
  };

  const handleDeleteItem = (cat: 'perangkat' | 'bpd' | 'lpm', idx: number) => {
    if (cat === 'perangkat') setOfficers(prev => prev.filter((_, i) => i !== idx));
    else if (cat === 'bpd') setBpdList(prev => prev.filter((_, i) => i !== idx));
    else setLpmList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddRtRw = (kind: 'rt' | 'rw') => {
    const form = kind === 'rt' ? rtForm : rwForm;
    if (!form.no.trim() || !form.name.trim()) {
      showToast(kind === 'rt' ? 'Nomor RT dan Nama Ketua RT wajib diisi!' : 'Nomor RW dan Nama Ketua RW wajib diisi!', 'error');
      return;
    }
    const clean: RtRwItem = { ...sanitizeOfficer(form) as RtRwItem, no: form.no.trim() };
    if (kind === 'rt') {
      setRtList(prev => [...prev, clean]);
      setRtForm({ no: '', name: '', role: 'Ketua RT', nip: '-' });
    } else {
      setRwList(prev => [...prev, clean]);
      setRwForm({ no: '', name: '', role: 'Ketua RW', nip: '-' });
    }
  };

  const handleEditRtRw = (kind: 'rt' | 'rw', idx: number) => {
    const item = kind === 'rt' ? rtList[idx] : rwList[idx];
    if (kind === 'rt') setRtForm({ ...item });
    else setRwForm({ ...item });
    if (kind === 'rt') setRtList(prev => prev.filter((_, i) => i !== idx));
    else setRwList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDeleteRtRw = (kind: 'rt' | 'rw', idx: number) => {
    if (kind === 'rt') setRtList(prev => prev.filter((_, i) => i !== idx));
    else setRwList(prev => prev.filter((_, i) => i !== idx));
  };

  const getRoleOptions = () => {
    if (modalCategory === 'bpd') {
      return ['Ketua BPD', 'Wakil Ketua BPD', 'Sekretaris BPD', 'Anggota BPD'];
    }
    if (modalCategory === 'lpm') {
      return ['Ketua LPM', 'Wakil Ketua LPM', 'Sekretaris LPM', 'Bendahara LPM', 'Anggota LPM'];
    }
    return [
      'Kepala Desa', 'Sekretaris Desa', 'Kaur Keuangan', 'Kaur Umum', 
      'Kaur Perencanaan', 'Kasi Pemerintahan', 'Kasi Kesejahteraan', 
      'Kasi Pelayanan', 'Staf Desa', 'Kepala Dusun'
    ];
  };

  const getInitials = (name: string) => {
    return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  const formatDateID = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const toWaLink = (phone?: string) => {
    if (!phone) return null;
    let digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    return `https://wa.me/${digits}?text=${encodeURIComponent('Assalamualaikum, saya menghubungi melalui aplikasi Desa.')}`;
  };

  const genderShort = (gender?: string) => {
    const g = String(gender || '').toLowerCase();
    if (g === 'perempuan' || g === 'wanita' || g === 'p') return 'P';
    if (g === 'laki-laki' || g === 'pria' || g === 'l') return 'L';
    return '-';
  };

  const printVal = (value: any) => {
    const v = String(value ?? '').trim();
    return v && v !== '-' ? v : '-';
  };

  const OfficerAvatar = ({ officer, colorClass }: { officer: Officer; colorClass: string }) => {
    if (officer.photo) {
      return (
        <img src={officer.photo} alt={officer.name} className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0" />
      );
    }
    return (
      <div className={`w-14 h-14 rounded-full ${colorClass} flex items-center justify-center text-white font-extrabold text-base shrink-0 shadow-sm`}>
        {getInitials(officer.name)}
      </div>
    );
  };

  if (authUser && !isSuperAdmin) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-slate-400">
        <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700 dark:text-slate-300">Akses Ditolak</h2>
        <p>Halaman ini hanya dapat diakses oleh Super Admin / Kepala Desa.</p>
      </div>
    );
  }

  return (
    <div className="pt-6 pb-24 animate-in fade-in duration-300">
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="text-emerald-600 w-6 h-6" />
            Aparatur Desa & Lembaga SDM
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Kelola data Kepala Desa, Perangkat Desa, BPD, LPM, RT/RW, dan Pejabat Pengesah secara online real-time.</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          <button 
            onClick={fetchCloudSettings}
            disabled={isSyncing}
            className="p-2.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors shrink-0"
            title="Muat Ulang dari Cloud Supabase"
          >
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>

          <button 
            onClick={() => handleTriggerPrintReport()}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 dark:shadow-none disabled:opacity-50 text-xs sm:text-sm whitespace-nowrap"
            title="Cetak atau Download PDF Laporan Data Aparatur, BPD, LPM, & RT/RW"
          >
            <Printer size={16} /> Cetak Laporan PDF
          </button>

          <button 
            onClick={handleSaveAll}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 dark:shadow-none disabled:opacity-50 text-xs sm:text-sm whitespace-nowrap"
          >
            <Save size={16} /> {isSyncing ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* === SECTION 1: PERANGKAT DESA === */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-start justify-between mb-6 flex-col sm:flex-row gap-4 sm:gap-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                Pemerintah & Perangkat Desa
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Staf operasional desa: Kepala Desa, Sekretaris Desa, Kaur, Kasi, dan Staf Desa.</p>
            </div>
            <button
              onClick={() => handleOpenAddModal('perangkat')}
              className="text-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl px-4 py-2 font-bold flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
            >
              + Tambah Perangkat Desa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {officers.map((officer, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-emerald-200 transition-all group relative">
                <div className="pr-12 flex items-start gap-3">
                  <OfficerAvatar officer={officer} colorClass="bg-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate uppercase">{officer.name}</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-wider mt-0.5">{officer.role}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {officer.nip && officer.nip !== '-' && (
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono">NIP. {officer.nip}</p>
                  )}
                  {(officer.nik || officer.residentId) && (
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-slate-300"><IdCard className="w-3.5 h-3.5 text-emerald-500" /> NIK. {officer.nik || officer.residentId}</p>
                  )}
                  {officer.gender && (
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-slate-300"><User className="w-3.5 h-3.5 text-emerald-500" /> {officer.gender}{officer.birthPlace ? ` • ${officer.birthPlace}` : ''}{officer.birthDate ? `, ${formatDateID(officer.birthDate)}` : ''}</p>
                  )}
                  {(officer.address || officer.rtRw) && (
                    <p className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-slate-300"><MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> {[officer.rtRw, officer.address].filter(Boolean).join(' • ')}</p>
                  )}
                  {(officer.status || officer.period) && (
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-slate-300"><BadgeCheck className="w-3.5 h-3.5 text-emerald-500" /> {[officer.status, officer.period].filter(Boolean).join(' • ')}</p>
                  )}
                  {toWaLink(officer.phone) && (
                    <a
                      href={toWaLink(officer.phone)!}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-green-600 dark:text-green-400 hover:underline mt-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Chat WhatsApp
                    </a>
                  )}
                  {namaKades.toUpperCase() === officer.name.toUpperCase() ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold mt-1 border border-emerald-200">
                      ★ Penandatangan Utama
                    </span>
                  ) : (
                    <button
                      onClick={() => setNamaKades(officer.name)}
                      className="text-[10px] text-gray-500 dark:text-slate-400 hover:text-emerald-700 font-bold block mt-1 hover:underline"
                    >
                      Jadikan Penandatangan Utama
                    </button>
                  )}
                </div>
                <div className="absolute top-4 right-4 flex flex-col gap-1 sm:flex-row opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenEditModal('perangkat', index)} className="p-1.5 hover:bg-white text-gray-500 dark:text-slate-400 hover:text-emerald-600 rounded-lg shadow-sm">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteItem('perangkat', index)} className="p-1.5 hover:bg-white text-gray-500 dark:text-slate-400 hover:text-rose-600 rounded-lg shadow-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {officers.length === 0 && (
              <div className="col-span-full p-6 text-center text-gray-400 text-sm border border-dashed rounded-xl">
                Belum ada data perangkat desa. Klik tombol di atas untuk menambah.
              </div>
            )}
          </div>
        </div>

        {/* === SECTION 2: BADAN PERMUSYAWARATAN DESA (BPD) === */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-start justify-between mb-6 flex-col sm:flex-row gap-4 sm:gap-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Badan Permusyawaratan Desa (BPD)
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Lembaga legislatif dan pengawasan desa: Ketua, Wakil Ketua, Sekretaris, dan Anggota BPD.</p>
            </div>
            <button
              onClick={() => handleOpenAddModal('bpd')}
              className="text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl px-4 py-2 font-bold flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
            >
              + Tambah Anggota BPD
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bpdList.map((bpd, index) => (
              <div key={index} className="p-4 bg-indigo-50/50 dark:bg-slate-800/60 rounded-xl border border-indigo-100 dark:border-slate-800 hover:border-indigo-300 transition-all group relative">
                <div className="pr-12 flex items-start gap-3">
                  <OfficerAvatar officer={bpd} colorClass="bg-indigo-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate uppercase">{bpd.name}</p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 font-extrabold uppercase tracking-wider mt-0.5">{bpd.role}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {bpd.nip && bpd.nip !== '-' && (
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono">NIP/NID. {bpd.nip}</p>
                  )}
                  {(bpd.nik || bpd.residentId) && (
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-slate-300"><IdCard className="w-3.5 h-3.5 text-indigo-500" /> NIK. {bpd.nik || bpd.residentId}</p>
                  )}
                  {bpd.gender && (
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-slate-300"><User className="w-3.5 h-3.5 text-indigo-500" /> {bpd.gender}{bpd.birthPlace ? ` • ${bpd.birthPlace}` : ''}{bpd.birthDate ? `, ${formatDateID(bpd.birthDate)}` : ''}</p>
                  )}
                  {(bpd.address || bpd.rtRw) && (
                    <p className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-slate-300"><MapPin className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" /> {[bpd.rtRw, bpd.address].filter(Boolean).join(' • ')}</p>
                  )}
                  {(bpd.status || bpd.period) && (
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-slate-300"><BadgeCheck className="w-3.5 h-3.5 text-indigo-500" /> {[bpd.status, bpd.period].filter(Boolean).join(' • ')}</p>
                  )}
                  {toWaLink(bpd.phone) && (
                    <a
                      href={toWaLink(bpd.phone)!}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-green-600 dark:text-green-400 hover:underline mt-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Chat WhatsApp
                    </a>
                  )}
                </div>
                <div className="absolute top-4 right-4 flex flex-col gap-1 sm:flex-row opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenEditModal('bpd', index)} className="p-1.5 hover:bg-white text-gray-500 dark:text-slate-400 hover:text-indigo-600 rounded-lg shadow-sm">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteItem('bpd', index)} className="p-1.5 hover:bg-white text-gray-500 dark:text-slate-400 hover:text-rose-600 rounded-lg shadow-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {bpdList.length === 0 && (
              <div className="col-span-full p-6 text-center text-gray-400 text-sm border border-dashed rounded-xl">
                Belum ada pengurus BPD terdaftar. Klik "+ Tambah Anggota BPD" untuk memasukkan data.
              </div>
            )}
          </div>
        </div>

        {/* === SECTION 3: LEMBAGA PEMBERDAYAAN MASYARAKAT (LPM) === */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-amber-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-start justify-between mb-6 flex-col sm:flex-row gap-4 sm:gap-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                Lembaga Pemberdayaan Masyarakat (LPM / LPMD)
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Mitra pembangunan desa: Ketua, Sekretaris, Bendahara, dan Pengurus LPM.</p>
            </div>
            <button
              onClick={() => handleOpenAddModal('lpm')}
              className="text-sm bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl px-4 py-2 font-bold flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
            >
              + Tambah Pengurus LPM
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lpmList.map((lpm, index) => (
              <div key={index} className="p-4 bg-amber-50/40 dark:bg-slate-800/60 rounded-xl border border-amber-100 dark:border-slate-800 hover:border-amber-300 transition-all group relative">
                <div className="pr-12 flex items-start gap-3">
                  <OfficerAvatar officer={lpm} colorClass="bg-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate uppercase">{lpm.name}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-extrabold uppercase tracking-wider mt-0.5">{lpm.role}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {lpm.nip && lpm.nip !== '-' && (
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono">NIP/ID. {lpm.nip}</p>
                  )}
                  {(lpm.nik || lpm.residentId) && (
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-slate-300"><IdCard className="w-3.5 h-3.5 text-amber-500" /> NIK. {lpm.nik || lpm.residentId}</p>
                  )}
                  {lpm.gender && (
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-slate-300"><User className="w-3.5 h-3.5 text-amber-500" /> {lpm.gender}{lpm.birthPlace ? ` • ${lpm.birthPlace}` : ''}{lpm.birthDate ? `, ${formatDateID(lpm.birthDate)}` : ''}</p>
                  )}
                  {(lpm.address || lpm.rtRw) && (
                    <p className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-slate-300"><MapPin className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" /> {[lpm.rtRw, lpm.address].filter(Boolean).join(' • ')}</p>
                  )}
                  {(lpm.status || lpm.period) && (
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-slate-300"><BadgeCheck className="w-3.5 h-3.5 text-amber-500" /> {[lpm.status, lpm.period].filter(Boolean).join(' • ')}</p>
                  )}
                  {toWaLink(lpm.phone) && (
                    <a
                      href={toWaLink(lpm.phone)!}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-green-600 dark:text-green-400 hover:underline mt-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Chat WhatsApp
                    </a>
                  )}
                </div>
                <div className="absolute top-4 right-4 flex flex-col gap-1 sm:flex-row opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenEditModal('lpm', index)} className="p-1.5 hover:bg-white text-gray-500 dark:text-slate-400 hover:text-amber-600 rounded-lg shadow-sm">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteItem('lpm', index)} className="p-1.5 hover:bg-white text-gray-500 dark:text-slate-400 hover:text-rose-600 rounded-lg shadow-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {lpmList.length === 0 && (
              <div className="col-span-full p-6 text-center text-gray-400 text-sm border border-dashed rounded-xl">
                Belum ada pengurus LPM terdaftar. Klik "+ Tambah Pengurus LPM" untuk memasukkan data.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* === SECTION 4: RT & RW === */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Daftar Ketua RT & RW</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Data ini digunakan untuk verifikasi otomatis di SKKT, SPT, dan formulir pelayanan.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* RT List */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider border-b pb-2">Ketua RT</p>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                  {rtList.map((rt, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 px-3 py-2 rounded-xl text-sm gap-2">
                      <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                        <span className="font-bold text-gray-700 dark:text-slate-300 shrink-0">RT {rt.no}</span>
                        <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                          {getInitials(rt.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-gray-900 dark:text-white font-bold truncate block uppercase">{rt.name}</span>
                          {rt.nik && <span className="text-[10px] text-gray-500 dark:text-slate-400 font-mono block truncate">NIK. {rt.nik}</span>}
                        </span>
                        {toWaLink(rt.phone) && (
                          <a
                            href={toWaLink(rt.phone)!}
                            target="_blank"
                            rel="noreferrer"
                            className="text-green-600 dark:text-green-400 shrink-0 hover:scale-110 transition-transform"
                            title="Chat WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleEditRtRw('rt', idx)} className="text-gray-400 hover:text-emerald-600 p-1"><Edit3 size={14}/></button>
                        <button onClick={() => handleDeleteRtRw('rt', idx)} className="text-rose-400 hover:text-rose-600 p-1"><X size={14}/></button>
                      </div>
                    </div>
                  ))}
                  {rtList.length === 0 && <p className="text-xs text-gray-400 italic">Belum ada data RT.</p>}
                </div>
                <div className="border border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input type="text" placeholder="No RT" value={rtForm.no} onChange={e => setRtForm(p => ({...p, no: e.target.value}))} className="w-full sm:w-24 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:border-emerald-500 outline-none" />
                    <input type="text" placeholder="No. WhatsApp (Opsional)" value={rtForm.phone || ''} onChange={e => setRtForm(p => ({...p, phone: e.target.value}))} className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:border-emerald-500 outline-none" />
                    <button
                      onClick={() => handleAddRtRw('rt')}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold sm:w-auto w-full"
                    >
                      {rtForm.no || rtForm.name ? 'Simpan Ketua RT' : '+ Tambah Ketua RT'}
                    </button>
                  </div>
                  <ResidentSearchInput
                    tenantId={tenantId}
                    initialText=""
                    logLabel="RT/RW"
                    onSelect={applyResidentToRtForm}
                    onManualName={(name) => setRtForm(p => ({ ...p, name }))}
                    onManualChange={(manual) => {
                      if (manual) setRtForm(p => ({ ...p, residentId: undefined, nik: undefined, gender: undefined, birthPlace: undefined, birthDate: undefined, address: undefined, rtRw: undefined, photo: undefined }));
                    }}
                  />
                </div>
              </div>

              {/* RW List */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider border-b pb-2">Ketua RW</p>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                  {rwList.map((rw, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 px-3 py-2 rounded-xl text-sm gap-2">
                      <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                        <span className="font-bold text-gray-700 dark:text-slate-300 shrink-0">RW {rw.no}</span>
                        <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                          {getInitials(rw.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-gray-900 dark:text-white font-bold truncate block uppercase">{rw.name}</span>
                          {rw.nik && <span className="text-[10px] text-gray-500 dark:text-slate-400 font-mono block truncate">NIK. {rw.nik}</span>}
                        </span>
                        {toWaLink(rw.phone) && (
                          <a
                            href={toWaLink(rw.phone)!}
                            target="_blank"
                            rel="noreferrer"
                            className="text-green-600 dark:text-green-400 shrink-0 hover:scale-110 transition-transform"
                            title="Chat WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleEditRtRw('rw', idx)} className="text-gray-400 hover:text-indigo-600 p-1"><Edit3 size={14}/></button>
                        <button onClick={() => handleDeleteRtRw('rw', idx)} className="text-rose-400 hover:text-rose-600 p-1"><X size={14}/></button>
                      </div>
                    </div>
                  ))}
                  {rwList.length === 0 && <p className="text-xs text-gray-400 italic">Belum ada data RW.</p>}
                </div>
                <div className="border border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input type="text" placeholder="No RW" value={rwForm.no} onChange={e => setRwForm(p => ({...p, no: e.target.value}))} className="w-full sm:w-24 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:border-indigo-500 outline-none" />
                    <input type="text" placeholder="No. WhatsApp (Opsional)" value={rwForm.phone || ''} onChange={e => setRwForm(p => ({...p, phone: e.target.value}))} className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:border-indigo-500 outline-none" />
                    <button
                      onClick={() => handleAddRtRw('rw')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold sm:w-auto w-full"
                    >
                      {rwForm.no || rwForm.name ? 'Simpan Ketua RW' : '+ Tambah Ketua RW'}
                    </button>
                  </div>
                  <ResidentSearchInput
                    tenantId={tenantId}
                    initialText=""
                    logLabel="RT/RW"
                    onSelect={applyResidentToRwForm}
                    onManualName={(name) => setRwForm(p => ({ ...p, name }))}
                    onManualChange={(manual) => {
                      if (manual) setRwForm(p => ({ ...p, residentId: undefined, nik: undefined, gender: undefined, birthPlace: undefined, birthDate: undefined, address: undefined, rtRw: undefined, photo: undefined }));
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* === SECTION 5: CAMAT / PENGESAH SEBELAH KIRI === */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm h-fit">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Camat / Pengesah Sebelah Kiri</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Pengaturan penandatangan pejabat pengesah tingkat kecamatan untuk surat formal.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">Jabatan</label>
                <input type="text" value={sigLeftRole} onChange={e => setSigLeftRole(e.target.value)} placeholder="Contoh: Camat Simpur" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 outline-none text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">Nama Lengkap</label>
                <input type="text" value={sigLeftName} onChange={e => setSigLeftName(e.target.value)} placeholder="Contoh: Drs. H. Fulan, M.Si" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 outline-none text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">Pangkat / Golongan</label>
                  <input type="text" value={sigLeftPangkat} onChange={e => setSigLeftPangkat(e.target.value)} placeholder="Pembina / IV a" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 outline-none text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">NIP</label>
                  <input type="text" value={sigLeftNip} onChange={e => setSigLeftNip(e.target.value)} placeholder="1970..." className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 outline-none text-sm" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* UNIFIED OFFICER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {modalCategory === 'bpd' && <ShieldCheck className="w-5 h-5 text-indigo-600" />}
                {modalCategory === 'lpm' && <Award className="w-5 h-5 text-amber-600" />}
                {modalCategory === 'perangkat' && <UserCheck className="w-5 h-5 text-emerald-600" />}
                {editingIndex !== null ? 'Edit Data' : 'Tambah Data'} {modalCategory === 'perangkat' ? 'Perangkat Desa' : modalCategory === 'bpd' ? 'BPD' : 'LPM'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Nama Lengkap — Hybrid Search dari Data Penduduk */}
              <ResidentSearchInput
                tenantId={tenantId}
                initialText={editingIndex !== null && officerForm.residentId ? officerForm.name : ''}
                initialManual={editingIndex !== null ? !officerForm.residentId : false}
                logLabel={modalCategory === 'perangkat' ? 'PERANGKAT' : modalCategory === 'bpd' ? 'BPD' : 'LPM'}
                onSelect={applyResidentToForm}
                onManualName={(name) => setOfficerForm(prev => ({ ...prev, name }))}
                onManualChange={(manual) => {
                  if (manual) setOfficerForm(prev => ({ ...prev, residentId: undefined, nik: undefined, gender: undefined, birthPlace: undefined, birthDate: undefined, address: undefined, rtRw: undefined, photo: undefined }));
                }}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Jabatan / Peran</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 mb-2" 
                  value={officerForm.role} 
                  onChange={e => setOfficerForm({ ...officerForm, role: e.target.value })} 
                  placeholder="Ketik jabatan atau pilih opsi di bawah" 
                />
                <div className="flex flex-wrap gap-1.5">
                  {getRoleOptions().map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setOfficerForm(prev => ({ ...prev, role: r }))}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${officerForm.role === r ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">NIK</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" 
                    value={officerForm.nik || ''} 
                    onChange={e => setOfficerForm({ ...officerForm, nik: e.target.value })} 
                    placeholder="Terisi otomatis" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">NIP / ID</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" 
                    value={officerForm.nip || ''} 
                    onChange={e => setOfficerForm({ ...officerForm, nip: e.target.value })} 
                    placeholder="Kosongkan jika tidak ada" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">No. WhatsApp</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" 
                    value={officerForm.phone || ''} 
                    onChange={e => setOfficerForm({ ...officerForm, phone: e.target.value })} 
                    placeholder="081234567890" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Jenis Kelamin</label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500"
                    value={officerForm.gender || ''}
                    onChange={e => setOfficerForm({ ...officerForm, gender: e.target.value })}
                  >
                    <option value="">- Pilih -</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Tanggal Lahir</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" 
                    value={officerForm.birthDate || ''} 
                    onChange={e => setOfficerForm({ ...officerForm, birthDate: e.target.value })} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Tempat Lahir</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" 
                  value={officerForm.birthPlace || ''} 
                  onChange={e => setOfficerForm({ ...officerForm, birthPlace: e.target.value })} 
                  placeholder="Kota / Kabupaten lahir" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Alamat</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" 
                    value={officerForm.address || ''} 
                    onChange={e => setOfficerForm({ ...officerForm, address: e.target.value })} 
                    placeholder="Alamat lengkap tempat tinggal" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">RT/RW</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" 
                    value={officerForm.rtRw || ''} 
                    onChange={e => setOfficerForm({ ...officerForm, rtRw: e.target.value })} 
                    placeholder="01 / 01" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Status</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" 
                    value={officerForm.status || ''} 
                    onChange={e => setOfficerForm({ ...officerForm, status: e.target.value })} 
                    placeholder="Contoh: Aktif / Purna Tugas" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Periode / Masa Jabatan</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" 
                    value={officerForm.period || ''} 
                    onChange={e => setOfficerForm({ ...officerForm, period: e.target.value })} 
                    placeholder="Contoh: 2021 - 2027" 
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-200 rounded-xl transition-colors">Batal</button>
              <button onClick={handleSaveModal} className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-lg shadow-emerald-200 flex items-center gap-2">
                <Check size={16} /> Simpan Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Container for Printing Official Aparatur Data Report */}
      <div style={{ display: 'none' }}>
        <div ref={reportPrintRef} className="p-8 font-sans text-black bg-white w-full text-left">
          {/* Kop Surat Resmi */}
          <div dangerouslySetInnerHTML={{ __html: generateKopSuratHTML() }} />

          {/* Title Header */}
          <div className="text-center my-6">
            <h2 className="font-sans text-[14pt] font-bold uppercase tracking-wider">
              DATA APARATUR & LEMBAGA DESA
            </h2>
          </div>

          {/* 1. TABLE PERANGKAT DESA */}
          <div className="mb-6 font-sans break-inside-avoid">
            <h3 className="font-bold text-[11pt] uppercase mb-2 border-b border-black pb-1">
              I. PEMERINTAH & PERANGKAT DESA
            </h3>
            <table className="aparatur-detail w-full border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100 font-bold">
                  <th className="border border-black text-center" style={{ width: '4%' }}>NO</th>
                  <th className="border border-black text-left" style={{ width: '21%' }}>NAMA LENGKAP</th>
                  <th className="border border-black text-left" style={{ width: '18%' }}>JABATAN</th>
                  <th className="border border-black text-left" style={{ width: '16%' }}>NIK / NIP</th>
                  <th className="border border-black text-center" style={{ width: '5%' }}>L/P</th>
                  <th className="border border-black text-center" style={{ width: '8%' }}>RT / RW</th>
                  <th className="border border-black text-left" style={{ width: '18%' }}>ALAMAT LENGKAP</th>
                  <th className="border border-black text-left" style={{ width: '10%' }}>NO. HP / WA</th>
                </tr>
              </thead>
              <tbody>
                {officers.length > 0 ? (
                  officers.map((off, idx) => (
                    <tr key={idx}>
                      <td className="border border-black text-center font-bold">{idx + 1}</td>
                      <td className="border border-black font-bold uppercase">{off.name}</td>
                      <td className="border border-black">{off.role}</td>
                      <td className="border border-black font-mono">{printVal(off.nik || off.nip)}</td>
                      <td className="border border-black text-center">{genderShort(off.gender)}</td>
                      <td className="border border-black text-center">{printVal(off.rtRw)}</td>
                      <td className="border border-black">{printVal(off.address)}</td>
                      <td className="border border-black font-mono">{printVal(off.phone)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="border border-black px-3 py-2 text-center text-gray-500 italic">Belum ada data perangkat desa</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 2. TABLE BPD */}
          <div className="mb-6 font-sans break-inside-avoid">
            <h3 className="font-bold text-[11pt] uppercase mb-2 border-b border-black pb-1">
              II. BADAN PERMUSYAWARATAN DESA (BPD)
            </h3>
            <table className="aparatur-detail w-full border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100 font-bold">
                  <th className="border border-black text-center" style={{ width: '4%' }}>NO</th>
                  <th className="border border-black text-left" style={{ width: '21%' }}>NAMA LENGKAP</th>
                  <th className="border border-black text-left" style={{ width: '18%' }}>JABATAN BPD</th>
                  <th className="border border-black text-left" style={{ width: '16%' }}>NIK / NIP</th>
                  <th className="border border-black text-center" style={{ width: '5%' }}>L/P</th>
                  <th className="border border-black text-center" style={{ width: '8%' }}>RT / RW</th>
                  <th className="border border-black text-left" style={{ width: '18%' }}>ALAMAT LENGKAP</th>
                  <th className="border border-black text-left" style={{ width: '10%' }}>NO. HP / WA</th>
                </tr>
              </thead>
              <tbody>
                {bpdList.length > 0 ? (
                  bpdList.map((bpd, idx) => (
                    <tr key={idx}>
                      <td className="border border-black text-center font-bold">{idx + 1}</td>
                      <td className="border border-black font-bold uppercase">{bpd.name}</td>
                      <td className="border border-black">{bpd.role}</td>
                      <td className="border border-black font-mono">{printVal(bpd.nik || bpd.nip)}</td>
                      <td className="border border-black text-center">{genderShort(bpd.gender)}</td>
                      <td className="border border-black text-center">{printVal(bpd.rtRw)}</td>
                      <td className="border border-black">{printVal(bpd.address)}</td>
                      <td className="border border-black font-mono">{printVal(bpd.phone)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="border border-black px-3 py-2 text-center text-gray-500 italic">Belum ada data pengurus BPD</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 3. TABLE LPM */}
          <div className="mb-6 font-sans break-inside-avoid">
            <h3 className="font-bold text-[11pt] uppercase mb-2 border-b border-black pb-1">
              III. LEMBAGA PEMBERDAYAAN MASYARAKAT (LPM)
            </h3>
            <table className="aparatur-detail w-full border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100 font-bold">
                  <th className="border border-black text-center" style={{ width: '4%' }}>NO</th>
                  <th className="border border-black text-left" style={{ width: '21%' }}>NAMA LENGKAP</th>
                  <th className="border border-black text-left" style={{ width: '18%' }}>JABATAN LPM</th>
                  <th className="border border-black text-left" style={{ width: '16%' }}>NIK / NIP</th>
                  <th className="border border-black text-center" style={{ width: '5%' }}>L/P</th>
                  <th className="border border-black text-center" style={{ width: '8%' }}>RT / RW</th>
                  <th className="border border-black text-left" style={{ width: '18%' }}>ALAMAT LENGKAP</th>
                  <th className="border border-black text-left" style={{ width: '10%' }}>NO. HP / WA</th>
                </tr>
              </thead>
              <tbody>
                {lpmList.length > 0 ? (
                  lpmList.map((lpm, idx) => (
                    <tr key={idx}>
                      <td className="border border-black text-center font-bold">{idx + 1}</td>
                      <td className="border border-black font-bold uppercase">{lpm.name}</td>
                      <td className="border border-black">{lpm.role}</td>
                      <td className="border border-black font-mono">{printVal(lpm.nik || lpm.nip)}</td>
                      <td className="border border-black text-center">{genderShort(lpm.gender)}</td>
                      <td className="border border-black text-center">{printVal(lpm.rtRw)}</td>
                      <td className="border border-black">{printVal(lpm.address)}</td>
                      <td className="border border-black font-mono">{printVal(lpm.phone)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="border border-black px-3 py-2 text-center text-gray-500 italic">Belum ada data pengurus LPM</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 4. TABLE RT & RW */}
          <div className="mb-8 font-sans break-inside-avoid">
            <div className="mb-6">
              <h3 className="font-bold text-[11pt] uppercase mb-2 border-b border-black pb-1">
                IV. DAFTAR KETUA RT
              </h3>
              <table className="aparatur-detail w-full border-collapse border border-black">
                <thead>
                  <tr className="bg-gray-100 font-bold">
                    <th className="border border-black text-center" style={{ width: '4%' }}>NO</th>
                    <th className="border border-black text-left" style={{ width: '21%' }}>NAMA LENGKAP</th>
                    <th className="border border-black text-left" style={{ width: '18%' }}>JABATAN</th>
                    <th className="border border-black text-left" style={{ width: '16%' }}>NIK / NIP</th>
                    <th className="border border-black text-center" style={{ width: '5%' }}>L/P</th>
                    <th className="border border-black text-center" style={{ width: '8%' }}>RT / RW</th>
                    <th className="border border-black text-left" style={{ width: '18%' }}>ALAMAT LENGKAP</th>
                    <th className="border border-black text-left" style={{ width: '10%' }}>NO. HP / WA</th>
                  </tr>
                </thead>
                <tbody>
                  {rtList.length > 0 ? (
                    rtList.map((rt, idx) => (
                      <tr key={idx}>
                        <td className="border border-black text-center font-bold">{idx + 1}</td>
                        <td className="border border-black font-bold uppercase">{rt.name}</td>
                        <td className="border border-black">{rt.role || 'Ketua RT'}</td>
                        <td className="border border-black font-mono">{printVal(rt.nik || rt.nip)}</td>
                        <td className="border border-black text-center">{genderShort(rt.gender)}</td>
                        <td className="border border-black text-center">{printVal(rt.no ? `RT.${rt.no}` : rt.rtRw)}</td>
                        <td className="border border-black">{printVal(rt.address)}</td>
                        <td className="border border-black font-mono">{printVal(rt.phone)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="border border-black px-3 py-2 text-center text-gray-500 italic">Belum ada data RT</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="font-bold text-[11pt] uppercase mb-2 border-b border-black pb-1">
                V. DAFTAR KETUA RW
              </h3>
              <table className="aparatur-detail w-full border-collapse border border-black">
                <thead>
                  <tr className="bg-gray-100 font-bold">
                    <th className="border border-black text-center" style={{ width: '4%' }}>NO</th>
                    <th className="border border-black text-left" style={{ width: '21%' }}>NAMA LENGKAP</th>
                    <th className="border border-black text-left" style={{ width: '18%' }}>JABATAN</th>
                    <th className="border border-black text-left" style={{ width: '16%' }}>NIK / NIP</th>
                    <th className="border border-black text-center" style={{ width: '5%' }}>L/P</th>
                    <th className="border border-black text-center" style={{ width: '8%' }}>RT / RW</th>
                    <th className="border border-black text-left" style={{ width: '18%' }}>ALAMAT LENGKAP</th>
                    <th className="border border-black text-left" style={{ width: '10%' }}>NO. HP / WA</th>
                  </tr>
                </thead>
                <tbody>
                  {rwList.length > 0 ? (
                    rwList.map((rw, idx) => (
                      <tr key={idx}>
                        <td className="border border-black text-center font-bold">{idx + 1}</td>
                        <td className="border border-black font-bold uppercase">{rw.name}</td>
                        <td className="border border-black">{rw.role || 'Ketua RW'}</td>
                        <td className="border border-black font-mono">{printVal(rw.nik || rw.nip)}</td>
                        <td className="border border-black text-center">{genderShort(rw.gender)}</td>
                        <td className="border border-black text-center">{printVal(rw.no ? `RW.${rw.no}` : rw.rtRw)}</td>
                        <td className="border border-black">{printVal(rw.address)}</td>
                        <td className="border border-black font-mono">{printVal(rw.phone)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="border border-black px-3 py-2 text-center text-gray-500 italic">Belum ada data RW</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
