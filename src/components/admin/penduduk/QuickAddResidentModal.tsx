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
  const [checkingKk, setCheckingKk] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
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

  // Real-time No KK validation
  useEffect(() => {
    const checkKk = async () => {
      if (!formData.noKk || formData.noKk.length < 16) {
        setFamilyMembers([]);
        return;
      }

      setCheckingKk(true);
      try {
        const tenantId = await resolveCurrentTenant();
        if (!tenantId) return;

        const { data, error } = await supabase
          .from('residents')
          .select('name, family_relation, nik')
          .eq('no_kk', formData.noKk)
          .eq('tenant_id', tenantId);

        if (!error && data) {
          setFamilyMembers(data);
          
          // Auto-update default familyRelation if Kepala Keluarga already exists
          const hasHead = data.some(m => (m.family_relation || '').toLowerCase().includes('kepala keluarga'));
          if (hasHead && formData.familyRelation === 'Kepala Keluarga') {
            setFormData(prev => ({ ...prev, familyRelation: 'Istri' }));
          }
        }
      } catch (err) {
        console.error('Error checking KK:', err);
      } finally {
        setCheckingKk(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkKk, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.noKk]);

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

    const hasHead = familyMembers.some(m => (m.family_relation || '').toLowerCase().includes('kepala keluarga'));
    if (hasHead && formData.familyRelation === 'Kepala Keluarga') {
      showToast('Keluarga ini sudah memiliki Kepala Keluarga. Silakan pilih status hubungan keluarga yang lain.', 'error');
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

      const dbPayload: any = {
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
        status_color: 'emerald'
      };

      let insertPayload = { ...dbPayload };
      let { error } = await supabase.from('residents').insert([insertPayload]);

      // Robust auto-strip for missing columns in Supabase schema cache
      let retries = 0;
      while (error && error.message?.includes('Could not find the') && error.message?.includes('column') && retries < 5) {
        const match = error.message.match(/'([^']+)' column/);
        if (match && match[1]) {
          delete insertPayload[match[1]];
          const retry = await supabase.from('residents').insert([insertPayload]);
          error = retry.error;
          retries++;
        } else {
          break;
        }
      }

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
        
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50 flex flex-col gap-3 shrink-0">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">Warga Belum Terdaftar</h3>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                NIK pemohon ini belum ada di Data Penduduk. Silakan tinjau dan lengkapi data di bawah ini untuk menambahkannya ke Data Penduduk secara otomatis sebelum surat dicetak.
              </p>
            </div>
          </div>
          
          {familyMembers.length > 0 && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center justify-between">
                <span>Informasi No. KK: {formData.noKk}</span>
                <span className="bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded text-[10px]">
                  Terdaftar ({familyMembers.length} Anggota)
                </span>
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
                Keluarga dengan No. KK ini sudah terdaftar di database. Pastikan NIK yang Anda masukkan adalah benar anggota dari keluarga ini dan tentukan Status Hubungan Keluarga yang sesuai.
              </p>
              <div className="text-[11px] bg-white dark:bg-slate-800 p-2 rounded border border-blue-100 dark:border-blue-800 max-h-24 overflow-y-auto">
                <table className="w-full text-left">
                  <tbody>
                    {familyMembers.map((m, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <td className="py-1 text-slate-800 dark:text-slate-200 font-medium">{m.name}</td>
                        <td className="py-1 text-slate-500 dark:text-slate-400">{m.family_relation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex justify-between">
                <span>Hubungan Keluarga *</span>
                {checkingKk && <span className="text-[10px] text-slate-400 italic">Mengecek KK...</span>}
              </label>
              <select value={formData.familyRelation} onChange={e => setFormData({...formData, familyRelation: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500">
                <option value="Kepala Keluarga">Kepala Keluarga</option>
                <option value="Istri">Istri</option>
                <option value="Suami">Suami</option>
                <option value="Anak">Anak</option>
                <option value="Menantu">Menantu</option>
                <option value="Cucu">Cucu</option>
                <option value="Orang Tua">Orang Tua</option>
                <option value="Mertua">Mertua</option>
                <option value="Famili Lain">Famili Lain</option>
                <option value="Pembantu">Pembantu</option>
                <option value="Lainnya">Lainnya</option>
              </select>
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
