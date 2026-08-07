import React, { useState, useEffect, useRef } from 'react';
import { Users, Edit3, Save, Check, X, Building2, UserCheck, Trash2, ShieldCheck, Award, Cloud, RefreshCw, Printer } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { useReactToPrint } from 'react-to-print';
import { generateKopSuratHTML } from '../../utils/letterFormat';

interface Officer {
  name: string;
  role: string;
  nip?: string;
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

  // Print Report Setup
  const reportPrintRef = useRef<HTMLDivElement>(null);
  const handleTriggerPrintReport = useReactToPrint({
    contentRef: reportPrintRef,
    documentTitle: `Laporan_Data_Aparatur_${(localStorage.getItem('kop_desa') || 'Desa').replace(/\s+/g, '_')}`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 15mm !important;
      }
      @media print {
        html, body {
          background: #ffffff !important;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .printable-report {
          width: 100% !important;
          padding: 0 !important;
        }
        table {
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
      }
    `
  });

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
    if (cat === 'perangkat') setOfficerForm(officers[idx]);
    else if (cat === 'bpd') setOfficerForm(bpdList[idx]);
    else setOfficerForm(lpmList[idx]);
    setIsModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!officerForm.name.trim()) {
      showToast('Nama lengkap wajib diisi!', 'error');
      return;
    }

    if (modalCategory === 'perangkat') {
      let updated = [...officers];
      if (editingIndex !== null) updated[editingIndex] = officerForm;
      else updated.push(officerForm);
      setOfficers(updated);
    } else if (modalCategory === 'bpd') {
      let updated = [...bpdList];
      if (editingIndex !== null) updated[editingIndex] = officerForm;
      else updated.push(officerForm);
      setBpdList(updated);
    } else if (modalCategory === 'lpm') {
      let updated = [...lpmList];
      if (editingIndex !== null) updated[editingIndex] = officerForm;
      else updated.push(officerForm);
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
                <div className="pr-12">
                  <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{officer.name}</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-wider mt-0.5">{officer.role}</p>
                  {officer.nip && officer.nip !== '-' && (
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono mt-1">NIP. {officer.nip}</p>
                  )}
                  {namaKades === officer.name ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold mt-2 border border-emerald-200">
                      ★ Penandatangan Utama
                    </span>
                  ) : (
                    <button
                      onClick={() => setNamaKades(officer.name)}
                      className="text-[10px] text-gray-500 dark:text-slate-400 hover:text-emerald-700 font-bold block mt-2 hover:underline"
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
                <div className="pr-12">
                  <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{bpd.name}</p>
                  <p className="text-xs text-indigo-700 dark:text-indigo-400 font-extrabold uppercase tracking-wider mt-0.5">{bpd.role}</p>
                  {bpd.nip && bpd.nip !== '-' && (
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono mt-1">NIP/NID. {bpd.nip}</p>
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
                <div className="pr-12">
                  <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{lpm.name}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-extrabold uppercase tracking-wider mt-0.5">{lpm.role}</p>
                  {lpm.nip && lpm.nip !== '-' && (
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono mt-1">NIP/ID. {lpm.nip}</p>
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {modalCategory === 'bpd' && <ShieldCheck className="w-5 h-5 text-indigo-600" />}
                {modalCategory === 'lpm' && <Award className="w-5 h-5 text-amber-600" />}
                {modalCategory === 'perangkat' && <UserCheck className="w-5 h-5 text-emerald-600" />}
                {editingIndex !== null ? 'Edit Data' : 'Tambah Data'} {modalCategory === 'perangkat' ? 'Perangkat Desa' : modalCategory === 'bpd' ? 'BPD' : 'LPM'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Nama Lengkap</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" 
                  value={officerForm.name} 
                  onChange={e => setOfficerForm({...officerForm, name: e.target.value})} 
                  placeholder="Nama pejabat / pengurus" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Jabatan / Peran</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 mb-2" 
                  value={officerForm.role} 
                  onChange={e => setOfficerForm({...officerForm, role: e.target.value})} 
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">NIP / ID Anggota (Opsional)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" 
                  value={officerForm.nip} 
                  onChange={e => setOfficerForm({...officerForm, nip: e.target.value})} 
                  placeholder="Kosongkan atau isi '-' jika tidak ada" 
                />
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
      <div className="hidden">
        <div ref={reportPrintRef} className="printable-report p-6 font-serif text-black bg-white">
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
          <div className="mb-6 font-sans">
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
                  <th className="border border-black px-2 py-1.5 text-center w-36">STATUS TTD</th>
                </tr>
              </thead>
              <tbody>
                {officers.length > 0 ? (
                  officers.map((off, idx) => (
                    <tr key={idx}>
                      <td className="border border-black px-2 py-1.5 text-center font-bold">{idx + 1}</td>
                      <td className="border border-black px-3 py-1.5 font-bold uppercase">{off.name}</td>
                      <td className="border border-black px-3 py-1.5">{off.role}</td>
                      <td className="border border-black px-3 py-1.5 font-mono">{off.nip || '-'}</td>
                      <td className="border border-black px-2 py-1.5 text-center text-[9pt]">
                        {off.name === namaKades ? 'Penandatangan Utama' : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="border border-black px-3 py-2 text-center text-gray-500 italic">Belum ada data perangkat desa</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 2. TABLE BPD */}
          <div className="mb-6 font-sans">
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
                      <td className="border border-black px-3 py-1.5 font-mono">{bpd.nip || '-'}</td>
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
          <div className="mb-6 font-sans">
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
                      <td className="border border-black px-3 py-1.5 font-mono">{lpm.nip || '-'}</td>
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
          <div className="mb-8 font-sans grid grid-cols-2 gap-4">
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

          {/* SIGNATURE BLOCK */}
          <div className="mt-12 font-sans text-[10.5pt] break-inside-avoid">
            <div className="flex justify-between items-start">
              {/* Left Signature (Camat / Mengetahui) */}
              <div className="text-center w-[45%]">
                <p>Mengetahui,</p>
                <p className="font-bold">{sigLeftRole || 'Camat'}</p>
                <div className="my-3 h-16"></div>
                <p className="font-bold uppercase underline">{sigLeftName || '........................'}</p>
                {sigLeftPangkat && <p className="text-[9.5pt] text-gray-800">{sigLeftPangkat}</p>}
                {sigLeftNip && <p className="text-[9.5pt] text-gray-800">NIP. {sigLeftNip}</p>}
              </div>

              {/* Right Signature (Kepala Desa) */}
              <div className="text-center w-[45%]">
                <p>{(localStorage.getItem('kop_desa') || 'Desa Wasah Hilir').replace(/desa|kelurahan/gi, '').trim()}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="font-bold">Kepala Desa</p>
                <div className="my-3 h-16"></div>
                <p className="font-bold uppercase underline">{namaKades}</p>
                {(() => {
                  const kadesObj = officers.find(o => o.name === namaKades || o.role.toLowerCase().includes('kepala desa'));
                  return kadesObj?.nip && kadesObj.nip !== '-' ? (
                    <p className="text-[9.5pt] text-gray-800">NIP. {kadesObj.nip}</p>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
