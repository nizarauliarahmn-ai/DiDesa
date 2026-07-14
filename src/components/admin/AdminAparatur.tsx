import React, { useState, useEffect } from 'react';
import { Users, Edit3, Save, Check, X, Building2, UserCheck, Trash2 } from 'lucide-react';
import { showToast } from '../../utils/toast';

export default function AdminAparatur() {
  const [authUser, setAuthUser] = useState<{ role: string; isImpersonated?: boolean } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('didesa_auth_user');
    if (saved) setAuthUser(JSON.parse(saved));
  }, []);

  const isSuperAdmin = authUser?.role === 'kades' || authUser?.isImpersonated;

  // 1. Officers (Kades, Perangkat Desa, BPD, LPM, PKK, Karang Taruna)
  const [officers, setOfficers] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('village_officers');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      { name: 'Fazakkir Rahmad', role: 'Kepala Desa', nip: '-' },
      { name: 'Siti Aminah', role: 'Sekretaris Desa', nip: '198510122010122003' },
      { name: 'Muhammad Noor', role: 'Kasi Pemerintahan', nip: '198704152014021002' },
      { name: 'Ahmad Rifai', role: 'Kasi Kesejahteraan', nip: '-' },
      { name: 'Rahmadi', role: 'Kasi Pelayanan', nip: '-' },
      { name: 'H. Supian', role: 'Kaur Keuangan', nip: '-' },
      { name: 'Sri Wahyuni', role: 'Kaur Umum', nip: '-' },
      { name: 'Budi Santoso', role: 'Ketua BPD', nip: '-' },
      { name: 'Dewi Lestari', role: 'Ketua LPM', nip: '-' },
      { name: 'Siti Rohani', role: 'Ketua PKK', nip: '-' },
      { name: 'Dimas Aditya', role: 'Ketua Karang Taruna', nip: '-' },
    ];
  });
  const [namaKades, setNamaKades] = useState(() => localStorage.getItem('kop_kades') || 'Fazakkir Rahmad');
  
  // Modals for Officer
  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
  const [editingOfficerIndex, setEditingOfficerIndex] = useState<number | null>(null);
  const [officerForm, setOfficerForm] = useState({ name: '', role: 'Kepala Desa', nip: '-' });

  // 2. Camat / Left Signature
  const [sigLeftRole, setSigLeftRole] = useState(() => localStorage.getItem('village_signature_left_role') || 'Camat Simpur');
  const [sigLeftName, setSigLeftName] = useState(() => localStorage.getItem('village_signature_left_name') || '........................');
  const [sigLeftPangkat, setSigLeftPangkat] = useState(() => localStorage.getItem('village_signature_left_pangkat') || '');
  const [sigLeftNip, setSigLeftNip] = useState(() => localStorage.getItem('village_signature_left_nip') || '');

  // 3. RT / RW
  const [rtList, setRtList] = useState<{no: string; name: string}[]>(() => {
    try { return JSON.parse(localStorage.getItem('village_rt_list') || '[]'); } catch { return []; }
  });
  const [rwList, setRwList] = useState<{no: string; name: string}[]>(() => {
    try { return JSON.parse(localStorage.getItem('village_rw_list') || '[]'); } catch { return []; }
  });
  const [rtForm, setRtForm] = useState({ no: '', name: '' });
  const [rwForm, setRwForm] = useState({ no: '', name: '' });

  // Handle Save
  const handleSaveAll = () => {
    if (!isSuperAdmin) {
      showToast('Akses ditolak: Hanya Super Admin yang dapat menyimpan pengaturan ini.', 'error');
      return;
    }
    localStorage.setItem('village_officers', JSON.stringify(officers));
    localStorage.setItem('kop_kades', namaKades);
    localStorage.setItem('village_signature_left_role', sigLeftRole);
    localStorage.setItem('village_signature_left_name', sigLeftName);
    localStorage.setItem('village_signature_left_pangkat', sigLeftPangkat);
    localStorage.setItem('village_signature_left_nip', sigLeftNip);
    localStorage.setItem('village_rt_list', JSON.stringify(rtList));
    localStorage.setItem('village_rw_list', JSON.stringify(rwList));
    
    window.dispatchEvent(new Event('village_settings_updated'));
    showToast('Berhasil menyimpan data aparatur desa', 'success');
  };

  // Officer Modal Actions
  const handleAddOfficer = () => {
    setOfficerForm({ name: '', role: 'Kepala Desa', nip: '-' });
    setEditingOfficerIndex(null);
    setIsOfficerModalOpen(true);
  };
  const handleEditOfficer = (index: number) => {
    setOfficerForm(officers[index]);
    setEditingOfficerIndex(index);
    setIsOfficerModalOpen(true);
  };
  const handleSaveOfficer = () => {
    let updated = [...officers];
    if (editingOfficerIndex !== null) updated[editingOfficerIndex] = officerForm;
    else updated.push(officerForm);
    setOfficers(updated);
    setIsOfficerModalOpen(false);
  };
  const handleDeleteOfficer = (index: number) => {
    let updated = [...officers];
    updated.splice(index, 1);
    setOfficers(updated);
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
      <div className="flex items-center justify-between mb-8 flex-col md:flex-row gap-4 md:gap-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="text-emerald-600" />
            Aparatur Desa & SDM
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Kelola data Kepala Desa, Perangkat, BPD, RT/RW, dan Pejabat lainnya.</p>
        </div>
        <button 
          onClick={handleSaveAll}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg dark:shadow-none shadow-emerald-200"
        >
          <Save size={18} /> Simpan Perubahan
        </button>
      </div>

      <div className="space-y-6">
        
        {/* === SECTION 1: PERANGKAT DESA === */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none">
          <div className="flex items-start justify-between mb-6 flex-col sm:flex-row gap-4 sm:gap-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                Daftar Pejabat & Perangkat Desa
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Kelola staf desa, BPD, LPM, PKK, Karang Taruna, dsb.</p>
            </div>
            <button
              onClick={handleAddOfficer}
              className="text-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl px-4 py-2 font-bold flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
            >
              + Tambah Pejabat
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {officers.map((officer, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-emerald-200 transition-all group relative">
                <div className="pr-12">
                  <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{officer.name}</p>
                  <p className="text-xs text-emerald-700 font-extrabold uppercase tracking-wider mt-0.5">{officer.role}</p>
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
                  <button onClick={() => handleEditOfficer(index)} className="p-1.5 hover:bg-white text-gray-500 dark:text-slate-400 hover:text-emerald-600 rounded-lg shadow-sm dark:shadow-none">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteOfficer(index)} className="p-1.5 hover:bg-white text-gray-500 dark:text-slate-400 hover:text-rose-600 rounded-lg shadow-sm dark:shadow-none">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* === SECTION 2: RT & RW === */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none flex flex-col">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Daftar Ketua RT & RW</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Data ini akan muncul di formulir SPT dan layanan lainnya.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* RT List */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider border-b pb-2">Ketua RT</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
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
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
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

          {/* === SECTION 3: CAMAT / PENGESAH KIRI === */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none h-fit">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Camat / Pengesah Sebelah Kiri</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Otomatisasi pengisian tanda tangan sebelah kiri pada surat tertentu (misal: SPT).</p>
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

      {/* OFFICER MODAL */}
      {isOfficerModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editingOfficerIndex !== null ? 'Edit Pejabat' : 'Tambah Pejabat'}</h3>
              <button onClick={() => setIsOfficerModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Nama Lengkap</label>
                <input type="text" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" value={officerForm.name} onChange={e => setOfficerForm({...officerForm, name: e.target.value})} placeholder="Nama pejabat" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Jabatan</label>
                <input type="text" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" value={officerForm.role} onChange={e => setOfficerForm({...officerForm, role: e.target.value})} placeholder="Contoh: Kaur Keuangan, Ketua BPD, dll" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">NIP (Opsional)</label>
                <input type="text" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" value={officerForm.nip} onChange={e => setOfficerForm({...officerForm, nip: e.target.value})} placeholder="Kosongkan atau isi '-' jika tidak ada" />
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setIsOfficerModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-200 rounded-xl transition-colors">Batal</button>
              <button onClick={handleSaveOfficer} className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-lg dark:shadow-none shadow-emerald-200 flex items-center gap-2">
                <Check size={16} /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
