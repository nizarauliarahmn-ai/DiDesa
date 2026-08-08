import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import { resolveCurrentTenant } from '../../../utils/tenantResolver';
import { showToast } from '../../../utils/toast';
import { addSaaSLog } from '../../../utils/saasLogs';

interface QuickAddResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedData: any) => void;
  initialData: any; // NIK, Nama, Alamat, dll.
}

export default function QuickAddResidentModal({ isOpen, onClose, onSuccess, initialData }: QuickAddResidentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nik: '',
    name: '',
    noKk: '',
    gender: 'Laki-Laki',
    birthPlace: '',
    birthDate: '',
    religion: 'Islam',
    maritalStatus: 'Belum Kawin',
    education: 'SLTA/SEDERAJAT',
    job: 'Wiraswasta',
    address: '',
    rt: '001',
    rw: '001',
    desa: '',
    bloodType: '-',
    domicileStatus: 'Tetap',
    familyRelation: 'Kepala Keluarga',
    fatherName: '-',
    motherName: '-'
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(prev => ({
        ...prev,
        nik: initialData.nik || '',
        name: initialData.name || initialData.nama || '',
        noKk: initialData.noKk || initialData.no_kk || '',
        gender: initialData.gender || initialData.jenisKelamin || 'Laki-Laki',
        birthPlace: initialData.birthPlace || initialData.tempatLahir || '',
        birthDate: initialData.birthDate || initialData.tanggalLahir || '',
        religion: initialData.religion || initialData.agama || 'Islam',
        maritalStatus: initialData.maritalStatus || initialData.statusPerkawinan || 'Belum Kawin',
        education: initialData.education || initialData.pendidikan || 'SLTA/SEDERAJAT',
        job: initialData.job || initialData.pekerjaan || 'Wiraswasta',
        address: initialData.address || initialData.alamat || '',
        rt: initialData.rt || '001',
        rw: initialData.rw || '001',
        desa: initialData.desa || '',
        bloodType: initialData.bloodType || initialData.golonganDarah || '-',
        domicileStatus: initialData.domicileStatus || 'Tetap',
        familyRelation: initialData.familyRelation || 'Kepala Keluarga',
        fatherName: initialData.fatherName || initialData.namaAyah || '-',
        motherName: initialData.motherName || initialData.namaIbu || '-'
      }));
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nik || !formData.name) {
      showToast('NIK dan Nama wajib diisi.', 'error');
      return;
    }

    setLoading(true);
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) {
        showToast('Gagal memuat tenant.', 'error');
        setLoading(false);
        return;
      }

      // Check if NIK already exists
      const { data: existing } = await supabase
        .from('residents')
        .select('nik')
        .eq('nik', formData.nik)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing) {
        showToast(`NIK ${formData.nik} sudah terdaftar.`, 'error');
        setLoading(false);
        return;
      }

      const nowIso = new Date().toISOString();
      const age = calculateAge(formData.birthDate);

      const dbPayload = {
        tenant_id: tenantId,
        nik: formData.nik,
        name: formData.name,
        no_kk: formData.noKk || '-',
        gender: formData.gender,
        birth_place: formData.birthPlace || '-',
        birth_date: formData.birthDate || '1990-01-01',
        age: age,
        blood_type: formData.bloodType || '-',
        religion: formData.religion || 'Islam',
        marital_status: formData.maritalStatus || 'Belum Kawin',
        education: formData.education || 'SLTA/SEDERAJAT',
        job: formData.job || 'Wiraswasta',
        address: formData.address || '-',
        rt_rw: `${formData.rt || '001'}/${formData.rw || '001'}`,
        rt: formData.rt || '001',
        rw: formData.rw || '001',
        desa: formData.desa || '',
        status: 'Aktif',
        domicile_status: formData.domicileStatus || 'Tetap',
        family_relation: formData.familyRelation || 'Kepala Keluarga',
        father_name: formData.fatherName || '-',
        mother_name: formData.motherName || '-',
        active_aids: '[]',
        gender_color: 'blue',
        status_color: 'emerald',
        created_at: nowIso
      };

      const { error } = await supabase.from('residents').insert([dbPayload]);

      if (error) throw error;

      showToast(`Data ${formData.name} berhasil ditambahkan ke Data Penduduk.`, 'success');
      
      // Log Notification & Activity
      let adminName = 'Admin Desa';
      try {
        const authStr = localStorage.getItem('didesa_auth_user');
        if (authStr) adminName = JSON.parse(authStr).name || 'Admin Desa';
      } catch (err) {}

      addSaaSLog({
        admin: adminName,
        aksi: 'Tambah Warga Cepat',
        target: `${formData.name} (${formData.nik})`,
        status: 'Berhasil',
        category: 'Penduduk'
      });

      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`,
        tenant_id: tenantId,
        title: "Penduduk Terdata Otomatis",
        message: `Warga a.n. ${formData.name} (NIK: ${formData.nik}) telah ditambahkan ke Data Penduduk melalui form surat.`,
        category: "Residents",
        is_read: false,
        timestamp: new Date().toISOString()
      }]);

      onSuccess(dbPayload);
    } catch (error: any) {
      console.error('Error adding resident:', error);
      showToast(`Gagal: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 my-8 mt-16 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Pendaftaran Warga Baru
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50 flex gap-3 shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">Warga Belum Terdaftar</h3>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
              NIK pemohon ini belum ada di Data Penduduk. Silakan tinjau dan lengkapi data di bawah ini untuk menambahkannya ke Data Penduduk secara otomatis sebelum surat dicetak.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">NIK *</label>
              <input type="text" required value={formData.nik} onChange={e => setFormData({...formData, nik: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">No. KK</label>
              <input type="text" value={formData.noKk} onChange={e => setFormData({...formData, noKk: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin</label>
              <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500">
                <option value="Laki-Laki">Laki-Laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tempat Lahir</label>
              <input type="text" value={formData.birthPlace} onChange={e => setFormData({...formData, birthPlace: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Lahir</label>
              <input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Alamat</label>
              <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pekerjaan</label>
              <input type="text" value={formData.job} onChange={e => setFormData({...formData, job: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Agama</label>
              <select value={formData.religion} onChange={e => setFormData({...formData, religion: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500">
                <option value="Islam">Islam</option>
                <option value="Kristen">Kristen</option>
                <option value="Katolik">Katolik</option>
                <option value="Hindu">Hindu</option>
                <option value="Buddha">Buddha</option>
                <option value="Konghucu">Konghucu</option>
              </select>
            </div>
          </div>
        </form>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-b-2xl flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
            Batal
          </button>
          <button type="button" onClick={handleSave} disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-2">
            {loading ? 'Menyimpan...' : (
              <>
                <Save className="w-4 h-4" /> Simpan & Lanjutkan Cetak
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
