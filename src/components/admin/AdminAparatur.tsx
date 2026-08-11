import React, { useState, useEffect, useRef } from 'react';
import { Users, Edit3, Save, Check, X, Building2, UserCheck, Trash2, ShieldCheck, Award, Cloud, RefreshCw, Printer, Search, MapPin, Calendar, MessageCircle, IdCard, BadgeCheck, User } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { generateKopSuratHTML } from '../../utils/letterFormat';
import { SAAS_CONFIG } from './surat/AdminSuratMasterTemplate';

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

// Kolom yang sah (valid) pada tabel `residents` — dipakai untuk search & auto-fill agar
// payload ke Supabase tidak pernah memuat kolom yang tidak ada (TUGAS 2).
const RESIDENT_VALID_COLUMNS = [
  'nik', 'name', 'gender', 'gender_color', 'birth_place', 'birth_date',
  'rt_rw', 'rt', 'rw', 'address', 'desa', 'photo'
];

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
  const [namaKades, setNamaKades] = useState<string>('Fazakkir Rahmad');

  // Camat / Left Signature
  const [sigLeftRole, setSigLeftRole] = useState('Camat Simpur');
  const [sigLeftName, setSigLeftName] = useState('........................');
  const [sigLeftPangkat, setSigLeftPangkat] = useState('');
  const [sigLeftNip, setSigLeftNip] = useState('');

  // RT / RW
  const [rtList, setRtList] = useState<{no: string; name: string}[]>([]);
  const [rwList, setRwList] = useState<{no: string; name: string}[]>([]);
  const [rtForm, setRtForm] = useState({ no: '', name: '' });
  const [rwForm, setRwForm] = useState({ no: '', name: '' });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<'perangkat' | 'bpd' | 'lpm'>('perangkat');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [officerForm, setOfficerForm] = useState<Officer>({ name: '', role: '', nip: '-' });

  // Hybrid Search (Autocomplete) Warga dari Data Penduduk — TUGAS 1
  const [residentSearch, setResidentSearch] = useState('');
  const [residentResults, setResidentResults] = useState<any[]>([]);
  const [residentSearching, setResidentSearching] = useState(false);
  const [residentSearchOpen, setResidentSearchOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const runResidentSearch = (query: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const q = query.trim();
    if (q.length < 2 || manualEntry) {
      setResidentResults([]);
      setResidentSearchOpen(false);
      return;
    }
    setResidentSearching(true);
    setResidentSearchOpen(true);
    console.log('Keyword Pencarian:', q);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        // Resolve tenant secara dinamis agar pencarian tidak diblokir saat tenantId belum siap
        let tid = tenantId;
        if (!tid) {
          tid = await resolveCurrentTenant();
          if (tid) setTenantId(tid);
        }

        // Escape karakter khusus PostgREST agar tidak merusak filter .or()
        const safeQ = q.replace(/[%,()*]/g, ' ').replace(/\s+/g, ' ').trim();
        console.log('Resident Search → tenant_id:', tid, '| keyword:', safeQ);

        // Query case-insensitive (ilike) & partial match pada kolom `name` / `nik`
        let builder = supabase
          .from('residents')
          .select(RESIDENT_VALID_COLUMNS.join(','));

        // Isolasi multi-tenant: filter hanya jika tenant valid — jangan memblokir seluruh data saat null
        if (tid) {
          builder = builder.eq('tenant_id', tid);
        } else {
          console.warn('Resident search: tenant_id null — pencarian dijalankan tanpa filter desa.');
        }

        const { data, error } = await builder
          .or(`name.ilike.%${safeQ}%,nik.ilike.%${safeQ}%`)
          .limit(8);

        console.log('Hasil dari Supabase:', data, error);

        if (error) {
          console.error('Error searching residents:', error);
          setResidentResults([]);
        } else {
          setResidentResults((data || []).filter((r: any) => String(r.is_deleted) !== '1' && r.is_deleted !== true));
        }
        setResidentSearching(false);
      } catch (e) {
        console.error('Error searching residents:', e);
        setResidentResults([]);
        setResidentSearching(false);
      }
    }, 300);
  };

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
    setResidentSearch(resident.name || '');
    setResidentResults([]);
    setResidentSearchOpen(false);
    setManualEntry(false);
  };

  const resetResidentAutoFill = () => {
    setOfficerForm(prev => ({
      ...prev,
      residentId: undefined,
      nik: undefined,
      gender: undefined,
      birthPlace: undefined,
      birthDate: undefined,
      address: undefined,
      rtRw: undefined,
      photo: undefined,
    }));
    setResidentResults([]);
    setResidentSearchOpen(false);
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
              .saas-global-footer {
                position: fixed !important;
                bottom: 10mm !important;
                left: 15mm !important;
                right: 15mm !important;
                width: auto !important;
                background: white !important;
              }
            }
            body { font-family: serif; color: black; background: white; margin: 0; }
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
                  <div class="font-serif text-black bg-white w-full text-left">
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
    setResidentSearch('');
    setResidentResults([]);
    setResidentSearchOpen(false);
    setManualEntry(false);
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
    setResidentSearch(existing.residentId ? String(existing.name || '') : '');
    setResidentResults([]);
    setResidentSearchOpen(false);
    setManualEntry(!existing.residentId);
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

  const OfficerDetailRow = ({ label, value }: { label: string; value?: string }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-2">
        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mt-0.5 w-16 shrink-0">{label}</span>
        <span className="text-xs text-gray-700 dark:text-slate-300 break-words min-w-0">{value}</span>
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
    <div className="pt-6 pb-24 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in duration-300">
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
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {rtList.map((rt, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 px-3 py-2 rounded-xl text-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-bold text-gray-700 dark:text-slate-300 shrink-0">RT {rt.no}</span>
                        <span className="text-gray-600 dark:text-slate-400 truncate">{rt.name}</span>
                      </div>
                      <button onClick={() => setRtList(p => p.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600 p-1 shrink-0"><X size={14}/></button>
                    </div>
                  ))}
                  {rtList.length === 0 && <p className="text-xs text-gray-400 italic">Belum ada data RT.</p>}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <input type="text" placeholder="No RT" value={rtForm.no} onChange={e => setRtForm(p => ({...p, no: e.target.value}))} className="w-full sm:w-24 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:border-emerald-500 outline-none" />
                  <input type="text" placeholder="Nama Ketua RT" value={rtForm.name} onChange={e => setRtForm(p => ({...p, name: e.target.value}))} className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:border-emerald-500 outline-none" />
                  <button onClick={() => { if (rtForm.no && rtForm.name) { setRtList(p => [...p, rtForm]); setRtForm({ no: '', name: '' }); }}} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold sm:w-auto w-full">+</button>
                </div>
              </div>

              {/* RW List */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider border-b pb-2">Ketua RW</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {rwList.map((rw, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 px-3 py-2 rounded-xl text-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-bold text-gray-700 dark:text-slate-300 shrink-0">RW {rw.no}</span>
                        <span className="text-gray-600 dark:text-slate-400 truncate">{rw.name}</span>
                      </div>
                      <button onClick={() => setRwList(p => p.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600 p-1 shrink-0"><X size={14}/></button>
                    </div>
                  ))}
                  {rwList.length === 0 && <p className="text-xs text-gray-400 italic">Belum ada data RW.</p>}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <input type="text" placeholder="No RW" value={rwForm.no} onChange={e => setRwForm(p => ({...p, no: e.target.value}))} className="w-full sm:w-24 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:border-emerald-500 outline-none" />
                  <input type="text" placeholder="Nama Ketua RW" value={rwForm.name} onChange={e => setRwForm(p => ({...p, name: e.target.value}))} className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:border-emerald-500 outline-none" />
                  <button onClick={() => { if (rwForm.no && rwForm.name) { setRwList(p => [...p, rwForm]); setRwForm({ no: '', name: '' }); }}} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold sm:w-auto w-full">+</button>
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Nama Lengkap</label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !manualEntry;
                      setManualEntry(next);
                      if (next) {
                        setOfficerForm(prev => ({
                          ...prev,
                          name: (residentSearch.trim() || prev.name || '').toUpperCase(),
                        }));
                        resetResidentAutoFill();
                      } else {
                        setResidentSearch(officerForm.name);
                      }
                    }}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${manualEntry ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'}`}
                  >
                    {manualEntry ? '✏️ Ketik Manual' : '🔎 Cari Warga'}
                  </button>
                </div>

                <div className="relative">
                  <div className="flex items-center gap-2">
                    {!manualEntry && (
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500"
                          value={residentSearch}
                          onChange={e => {
                            const v = e.target.value;
                            setResidentSearch(v);
                            runResidentSearch(v);
                          }}
                          onFocus={() => { if (residentSearch.trim().length >= 2) setResidentSearchOpen(true); }}
                          placeholder="Cari warga berdasarkan Nama / NIK..."
                        />
                      </div>
                    )}
                    {!manualEntry && (
                      <button
                        type="button"
                        onClick={() => {
                          setOfficerForm(prev => ({ ...prev, name: (residentSearch.trim() || prev.name || '').toUpperCase() }));
                          setManualEntry(true);
                          resetResidentAutoFill();
                        }}
                        className="shrink-0 text-[10px] font-bold px-2.5 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-300 hover:bg-gray-200"
                        title="Lewati pencarian, ketik nama manual"
                      >
                        Skip
                      </button>
                    )}
                    {manualEntry && (
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500"
                        value={officerForm.name}
                        onChange={e => setOfficerForm({ ...officerForm, name: e.target.value.toUpperCase() })}
                        placeholder="Nama pejabat / pengurus"
                      />
                    )}
                  </div>

                  {residentSearchOpen && !manualEntry && (
                    <div className="absolute z-20 mt-1.5 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                      {residentSearching ? (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2">
                          <RefreshCw size={14} className="animate-spin" /> Mencari data warga...
                        </div>
                      ) : residentResults.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                          Data tidak ditemukan.{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setOfficerForm(prev => ({ ...prev, name: (residentSearch.trim() || prev.name || '').toUpperCase() }));
                              setManualEntry(true);
                              resetResidentAutoFill();
                            }}
                            className="text-emerald-600 font-bold hover:underline"
                          >
                            Klik di sini untuk ketik manual
                          </button>
                        </div>
                      ) : (
                        <ul className="max-h-56 overflow-y-auto custom-scrollbar">
                          {residentResults.map((r, i) => (
                            <li key={r.nik || i}>
                              <button
                                type="button"
                                onClick={() => applyResidentToForm(r)}
                                className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                              >
                                <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                                  {getInitials(r.name)}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-bold text-gray-900 dark:text-white truncate uppercase">{r.name}</span>
                                  <span className="block text-[11px] text-gray-500 dark:text-slate-400 truncate">
                                    NIK. {r.nik} • {r.gender || '-'}{r.rt_rw ? ` • RT/RW ${r.rt_rw}` : ''}
                                  </span>
                                </span>
                                <span className="text-[10px] text-emerald-600 font-bold shrink-0">Pilih</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {!manualEntry && officerForm.residentId && (
                  <p className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    <Check size={12} /> Data terisi otomatis dari warga terdaftar. Gunakan mode "✏️ Ketik Manual" untuk mengubah.
                  </p>
                )}
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  {!manualEntry ? 'Ketik minimal 2 karakter untuk mencari nama atau NIK warga. Data profil akan terisi otomatis.' : 'Mode manual aktif — masukkan data secara manual.'}
                </p>
              </div>

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
        <div ref={reportPrintRef} className="p-8 font-serif text-black bg-white w-full text-left">
          {/* Kop Surat Resmi */}
          <div dangerouslySetInnerHTML={{ __html: generateKopSuratHTML() }} />

          {/* Title Header */}
          <div className="text-center my-6">
            <h2 className="text-[14pt] font-bold uppercase tracking-wider underline">
              LAPORAN DATA APARATUR, BPD, LPM & KETUA RT/RW
            </h2>
            <p className="text-[11pt] font-sans font-bold mt-1 uppercase">
              DESA {(localStorage.getItem('kop_desa') || 'WASAH HILIR').replace(/desa|kelurahan/gi, '').trim()} • KECAMATAN {(localStorage.getItem('kop_kecamatan') || 'SIMPUR').replace(/^kecamatan\s+/i, '').trim()}
            </p>
          </div>

          {/* 1. TABLE PERANGKAT DESA */}
          <div className="mb-6 font-sans break-inside-avoid">
            <h3 className="font-bold text-[11pt] uppercase mb-2 border-b border-black pb-1">
              I. PEMERINTAH & PERANGKAT DESA
            </h3>
            <table className="w-full border-collapse border border-black text-[10pt]">
              <thead>
                <tr className="bg-gray-100 font-bold">
                  <th className="border border-black px-2 py-1.5 text-center w-10">NO</th>
                  <th className="border border-black px-3 py-1.5 text-left">NAMA LENGKAP</th>
                  <th className="border border-black px-3 py-1.5 text-left">JABATAN</th>
                  <th className="border border-black px-3 py-1.5 text-left">NIP / NIK</th>
                </tr>
              </thead>
              <tbody>
                {officers.length > 0 ? (
                  officers.map((off, idx) => (
                    <tr key={idx}>
                      <td className="border border-black px-2 py-1.5 text-center font-bold">{idx + 1}</td>
                      <td className="border border-black px-3 py-1.5 font-bold uppercase">{off.name}</td>
                      <td className="border border-black px-3 py-1.5">{off.role}</td>
                      <td className="border border-black px-3 py-1.5 font-mono">{off.nik || off.nip || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="border border-black px-3 py-2 text-center text-gray-500 italic">Belum ada data perangkat desa</td>
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
            <table className="w-full border-collapse border border-black text-[10pt]">
              <thead>
                <tr className="bg-gray-100 font-bold">
                  <th className="border border-black px-2 py-1.5 text-center w-10">NO</th>
                  <th className="border border-black px-3 py-1.5 text-left">NAMA LENGKAP</th>
                  <th className="border border-black px-3 py-1.5 text-left">JABATAN BPD</th>
                  <th className="border border-black px-3 py-1.5 text-left">NIP / KETERANGAN</th>
                </tr>
              </thead>
              <tbody>
                {bpdList.length > 0 ? (
                  bpdList.map((bpd, idx) => (
                    <tr key={idx}>
                      <td className="border border-black px-2 py-1.5 text-center font-bold">{idx + 1}</td>
                      <td className="border border-black px-3 py-1.5 font-bold uppercase">{bpd.name}</td>
                      <td className="border border-black px-3 py-1.5">{bpd.role}</td>
                      <td className="border border-black px-3 py-1.5 font-mono">{bpd.nik || bpd.nip || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="border border-black px-3 py-2 text-center text-gray-500 italic">Belum ada data pengurus BPD</td>
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
            <table className="w-full border-collapse border border-black text-[10pt]">
              <thead>
                <tr className="bg-gray-100 font-bold">
                  <th className="border border-black px-2 py-1.5 text-center w-10">NO</th>
                  <th className="border border-black px-3 py-1.5 text-left">NAMA LENGKAP</th>
                  <th className="border border-black px-3 py-1.5 text-left">JABATAN LPM</th>
                  <th className="border border-black px-3 py-1.5 text-left">NIP / KETERANGAN</th>
                </tr>
              </thead>
              <tbody>
                {lpmList.length > 0 ? (
                  lpmList.map((lpm, idx) => (
                    <tr key={idx}>
                      <td className="border border-black px-2 py-1.5 text-center font-bold">{idx + 1}</td>
                      <td className="border border-black px-3 py-1.5 font-bold uppercase">{lpm.name}</td>
                      <td className="border border-black px-3 py-1.5">{lpm.role}</td>
                      <td className="border border-black px-3 py-1.5 font-mono">{lpm.nik || lpm.nip || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="border border-black px-3 py-2 text-center text-gray-500 italic">Belum ada data pengurus LPM</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 4. TABLE RT & RW */}
          <div className="mb-8 font-sans grid grid-cols-2 gap-4 break-inside-avoid">
            <div>
              <h3 className="font-bold text-[10.5pt] uppercase mb-2 border-b border-black pb-1">
                IV. DAFTAR KETUA RT
              </h3>
              <table className="w-full border-collapse border border-black text-[9.5pt]">
                <thead>
                  <tr className="bg-gray-100 font-bold">
                    <th className="border border-black px-2 py-1 text-center w-16">NO. RT</th>
                    <th className="border border-black px-3 py-1 text-left">NAMA KETUA RT</th>
                  </tr>
                </thead>
                <tbody>
                  {rtList.length > 0 ? (
                    rtList.map((rt, idx) => (
                      <tr key={idx}>
                        <td className="border border-black px-2 py-1 text-center font-bold">RT.{rt.no}</td>
                        <td className="border border-black px-3 py-1 font-semibold">{rt.name}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="border border-black px-3 py-2 text-center text-gray-500 italic">Belum ada data RT</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="font-bold text-[10.5pt] uppercase mb-2 border-b border-black pb-1">
                V. DAFTAR KETUA RW
              </h3>
              <table className="w-full border-collapse border border-black text-[9.5pt]">
                <thead>
                  <tr className="bg-gray-100 font-bold">
                    <th className="border border-black px-2 py-1 text-center w-16">NO. RW</th>
                    <th className="border border-black px-3 py-1 text-left">NAMA KETUA RW</th>
                  </tr>
                </thead>
                <tbody>
                  {rwList.length > 0 ? (
                    rwList.map((rw, idx) => (
                      <tr key={idx}>
                        <td className="border border-black px-2 py-1 text-center font-bold">RW.{rw.no}</td>
                        <td className="border border-black px-3 py-1 font-semibold">{rw.name}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="border border-black px-3 py-2 text-center text-gray-500 italic">Belum ada data RW</td>
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
