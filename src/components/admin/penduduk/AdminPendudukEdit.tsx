import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, Camera, Info, MapPin, Users, User, 
  Check, Save, Briefcase, GraduationCap, Home, Heart, Trash2 
} from 'lucide-react';
import { showToast } from '../../../utils/toast';

interface AdminPendudukEditProps {
  onBack: () => void;
  data: any;
  onSave?: (savedData: any) => void;
}

const PEKERJAAN_OPTIONS = [
  'Belum / Tidak Bekerja',
  'Mengurus Rumah Tangga',
  'Pelajar / Mahasiswa',
  'Pensiunan',
  'Pegawai Negeri Sipil (PNS)',
  'Tentara Nasional Indonesia (TNI)',
  'Kepolisian RI (POLRI)',
  'Karyawan Swasta',
  'Karyawan BUMN / BUMD',
  'Wiraswasta',
  'Buruh Harian Lepas',
  'Petani / Pekebun',
  'Nelayan / Perikanan',
  'Lainnya'
];

export default function AdminPendudukEdit({ onBack, data, onSave }: AdminPendudukEditProps) {
  const isAdd = !data || !data.nik;

  const getCleanedVillageName = () => {
    const stored = localStorage.getItem('village_name') || 'Desa Sukamaju';
    if (stored.startsWith('Desa ')) {
      return stored.slice(5).trim();
    }
    if (stored.startsWith('Kelurahan ')) {
      return stored.slice(10).trim();
    }
    return stored.trim();
  };

  // Form State
  const [name, setName] = useState(data?.name || '');
  const [nik, setNik] = useState(data?.nik || '');
  const [noKk, setNoKk] = useState(data?.noKk || '320412008890001'); // Added KK Number state
  const [gender, setGender] = useState(data?.gender || 'Laki-laki');
  const [birthPlace, setBirthPlace] = useState(data?.birthPlace || 'Bandung');
  const [birthDate, setBirthDate] = useState(data?.birthDate || '1995-01-01');
  const [bloodType, setBloodType] = useState(data?.bloodType || 'O');
  const [religion, setReligion] = useState(data?.religion || 'Islam');
  const [job, setJob] = useState(data?.job || 'Wiraswasta');
  const [fatherName, setFatherName] = useState(data?.fatherName || '');
  const [motherName, setMotherName] = useState(data?.motherName || '');
  
  const [address, setAddress] = useState(data?.address || 'Jl. Cempaka No. 42');
  const [rt, setRt] = useState(data?.rt || '01');
  const [rw, setRw] = useState(data?.rw || '01');
  const [desa, setDesa] = useState(() => data?.desa || getCleanedVillageName());
  const [domicileStatus, setDomicileStatus] = useState(data?.domicileStatus || 'Sesuai KTP');
  
  const [familyRelation, setFamilyRelation] = useState(data?.familyRelation || 'Kepala Keluarga');
  const [education, setEducation] = useState(data?.education || 'Sarjana (S1)');
  const [residentStatus, setResidentStatus] = useState(data?.status || 'Aktif');
  const [activeAids, setActiveAids] = useState<string[]>(data?.activeAids || []);

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(data?.photo || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto populate RW: rt 01/02 -> rw 01; rt 03/04 -> rw 02
  const handleRtChange = (val: string) => {
    setRt(val);
    if (errors.rt) setErrors(prev => ({ ...prev, rt: '' }));
    
    if (val === '01' || val === '02') {
      setRw('01');
    } else if (val === '03' || val === '04') {
      setRw('02');
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        showToast('File terlalu besar! Maksimal 2MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nama lengkap wajib diisi';
    
    // NIK validation (exactly 16 digits of numbers)
    if (!nik.trim()) {
      newErrors.nik = 'NIK wajib diisi';
    } else if (nik.length !== 16) {
      newErrors.nik = 'NIK harus tepat 16 digit';
    } else if (!/^\d+$/.test(nik)) {
      newErrors.nik = 'NIK hanya boleh berupa angka';
    }

    // Nomor KK validation (exactly 16 digits of numbers)
    if (!noKk.trim()) {
      newErrors.noKk = 'Nomor KK wajib diisi';
    } else if (noKk.length !== 16) {
      newErrors.noKk = 'Nomor KK harus tepat 16 digit';
    } else if (!/^\d+$/.test(noKk)) {
      newErrors.noKk = 'Nomor KK hanya boleh berupa angka';
    }

    if (!birthPlace.trim()) newErrors.birthPlace = 'Tempat lahir wajib diisi';
    if (!birthDate) newErrors.birthDate = 'Tanggal lahir wajib diisi';
    if (!address.trim()) newErrors.address = 'Alamat lengkap wajib diisi';
    if (!rt.trim()) newErrors.rt = 'RT wajib diisi';
    if (!desa.trim()) newErrors.desa = 'Desa/Kelurahan wajib diisi';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast('Mohon lengkapi semua data formulir dengan benar.', 'error');
      return;
    }

    // Determine age from birthDate
    const birthYear = new Date(birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = isNaN(birthYear) ? 30 : Math.max(0, currentYear - birthYear);

    // Compute status colors
    const genderColor = gender === 'Perempuan' ? 'pink' : 'blue';
    const statusColor = residentStatus === 'Aktif' ? 'emerald' : 'gray';

    const savedResident = {
      ...data,
      nik,
      noKk,
      name,
      age,
      gender,
      genderColor,
      rtRw: `${rt.padStart(2, '0')} / ${rw.padStart(2, '0')}`,
      status: residentStatus,
      statusColor,
      initials: name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase(),
      birthPlace,
      birthDate,
      bloodType,
      religion,
      job,
      address,
      rt,
      rw,
      desa,
      domicileStatus,
      familyRelation,
      education,
      fatherName,
      motherName,
      activeAids,
      photo: photoPreview
    };

    const authUser = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
    
    if (authUser.role === 'admin') {
      try {
        const res = await fetch(`/api/residents/${data.nik}/request-approval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionType: 'edit',
            originalStatus: data.status || 'Aktif',
            details: savedResident
          })
        });
        if (res.ok) {
          showToast(`Perubahan data ${name} berhasil diajukan ke Super Admin!`, "success");
          onBack();
        } else {
          throw new Error("Gagal mengajukan permohonan.");
        }
      } catch (e: any) {
        showToast(e.message || "Gagal mengajukan permohonan.", "error");
      }
    } else {
      if (onSave) {
        onSave(savedResident);
      } else {
        showToast('Data berhasil disimpan!', 'success');
        onBack();
      }
    }
  };

  return (
    <div className="pt-6 pb-12 px-4 md:px-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Breadcrumb & Sticky Header */}
      <div className="sticky top-16 z-40 bg-slate-50/60 dark:bg-slate-900/80 backdrop-blur-xl pb-4 -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mb-2 font-medium">
            <button onClick={onBack} className="hover:text-emerald-700 transition-colors">Daftar Penduduk</button>
            <span className="text-gray-400">/</span>
            <span className="text-emerald-700 font-bold">
              {isAdd ? 'Formulir Pendaftaran' : 'Edit Data'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {isAdd ? 'Tambah Penduduk Baru' : 'Edit Data Penduduk'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {isAdd 
              ? 'Silakan lengkapi seluruh formulir di bawah ini untuk mendaftarkan warga baru.' 
              : `Mengubah data informasi kependudukan warga dengan NIK ${data.nik}.`}
          </p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={onBack}
            className="flex-1 sm:flex-none px-6 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all active:scale-95 bg-white dark:bg-slate-900"
          >
            Batal
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm dark:shadow-none hover:bg-emerald-800 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isAdd ? 'Simpan Data' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Columns: Form Fields */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Section 1: Biodata Diri */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Biodata Diri</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Nama Lengkap Sesuai KTP</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  className={`w-full h-11 px-4 border rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all ${
                    errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-slate-700'
                  }`}
                  placeholder="Masukkan nama lengkap..."
                />
                {errors.name && <p className="text-xs text-red-500 font-semibold">{errors.name}</p>}
              </div>

              {/* NIK Field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">NIK (Nomor Induk Kependudukan)</label>
                <input 
                  type="text"
                  maxLength={16}
                  value={nik}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setNik(val);
                    if (errors.nik) setErrors(prev => ({ ...prev, nik: '' }));
                  }}
                  className={`w-full h-11 px-4 border rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-mono ${
                    errors.nik ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-slate-700'
                  }`}
                  placeholder="16 digit NIK..."
                />
                {errors.nik && <p className="text-xs text-red-500 font-semibold">{errors.nik}</p>}
              </div>

              {/* Nomor KK Field (Newly Added) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">No. KK (Kartu Keluarga)</label>
                <input 
                  type="text"
                  maxLength={16}
                  value={noKk}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setNoKk(val);
                    if (errors.noKk) setErrors(prev => ({ ...prev, noKk: '' }));
                  }}
                  className={`w-full h-11 px-4 border rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-mono ${
                    errors.noKk ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-slate-700'
                  }`}
                  placeholder="16 digit No. KK..."
                />
                {errors.noKk && <p className="text-xs text-red-500 font-semibold">{errors.noKk}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Jenis Kelamin</label>
                <select 
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 cursor-pointer"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Tempat Lahir</label>
                <input 
                  type="text"
                  value={birthPlace}
                  onChange={(e) => {
                    setBirthPlace(e.target.value);
                    if (errors.birthPlace) setErrors(prev => ({ ...prev, birthPlace: '' }));
                  }}
                  className={`w-full h-11 px-4 border rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all ${
                    errors.birthPlace ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-slate-700'
                  }`}
                  placeholder="Contoh: Jakarta"
                />
                {errors.birthPlace && <p className="text-xs text-red-500 font-semibold">{errors.birthPlace}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Tanggal Lahir</label>
                <input 
                  type="date"
                  value={birthDate}
                  onChange={(e) => {
                    setBirthDate(e.target.value);
                    if (errors.birthDate) setErrors(prev => ({ ...prev, birthDate: '' }));
                  }}
                  className={`w-full h-11 px-4 border rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 ${
                    errors.birthDate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-slate-700'
                  }`}
                />
                {errors.birthDate && <p className="text-xs text-red-500 font-semibold">{errors.birthDate}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Golongan Darah</label>
                <select 
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 cursor-pointer"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                  <option value="Tidak Tahu">Tidak Tahu</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Agama</label>
                <select 
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 cursor-pointer"
                >
                  <option value="Islam">Islam</option>
                  <option value="Kristen Protestan">Kristen Protestan</option>
                  <option value="Kristen Katolik">Kristen Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Budha">Budha</option>
                  <option value="Khonghucu">Khonghucu</option>
                </select>
              </div>

              {/* Pekerjaan Dropdown selection (Updated from input) */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Pekerjaan</label>
                <select 
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 cursor-pointer"
                >
                  {PEKERJAAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Father and Mother Names */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Nama Ayah Kandung</label>
                <input 
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                  placeholder="Masukkan nama ayah kandung..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Nama Ibu Kandung</label>
                <input 
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900"
                  placeholder="Masukkan nama ibu kandung..."
                />
              </div>
            </div>
          </section>

          {/* Section 2: Alamat & Domisili */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Alamat & Domisili</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
              <div className="md:col-span-6 space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
                  }}
                  className={`w-full px-4 py-3 border rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none ${
                    errors.address ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-slate-700'
                  }`}
                  placeholder="Nama jalan, nomor rumah, dsb..."
                ></textarea>
                {errors.address && <p className="text-xs text-red-500 font-semibold">{errors.address}</p>}
              </div>

              {/* RT Dropdown select list */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">RT</label>
                <select 
                  value={rt}
                  onChange={(e) => handleRtChange(e.target.value)}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 cursor-pointer font-mono"
                >
                  <option value="01">01</option>
                  <option value="02">02</option>
                  <option value="03">03</option>
                  <option value="04">04</option>
                </select>
              </div>

              {/* RW input (auto-populated and disabled based on the rule) */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">RW (Otomatis)</label>
                <input 
                  type="text"
                  maxLength={3}
                  disabled
                  value={rw}
                  className="w-full h-11 px-4 border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-xl text-sm outline-none font-mono cursor-not-allowed"
                  placeholder="Terisi otomatis..."
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Desa/Kelurahan</label>
                <input 
                  type="text"
                  value={desa}
                  onChange={(e) => {
                    setDesa(e.target.value);
                    if (errors.desa) setErrors(prev => ({ ...prev, desa: '' }));
                  }}
                  className={`w-full h-11 px-4 border rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 ${
                    errors.desa ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-slate-700'
                  }`}
                  placeholder="Nama Desa/Kelurahan..."
                />
                {errors.desa && <p className="text-xs text-red-500 font-semibold">{errors.desa}</p>}
              </div>

              <div className="md:col-span-6 space-y-2">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Status Domisili</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setDomicileStatus('Sesuai KTP')}
                    className={`flex items-center gap-3 p-3.5 border-2 rounded-xl transition-all ${
                      domicileStatus === 'Sesuai KTP' 
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold' 
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      domicileStatus === 'Sesuai KTP' ? 'border-emerald-600' : 'border-gray-300 dark:border-slate-600'
                    }`}>
                      {domicileStatus === 'Sesuai KTP' && <div className="w-2 h-2 bg-emerald-600 rounded-full" />}
                    </div>
                    <span className="text-sm">Sesuai KTP</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setDomicileStatus('Pendatang / Domisili Sementara')}
                    className={`flex items-center gap-3 p-3.5 border-2 rounded-xl transition-all ${
                      domicileStatus === 'Pendatang / Domisili Sementara' 
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold' 
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      domicileStatus === 'Pendatang / Domisili Sementara' ? 'border-emerald-600' : 'border-gray-300 dark:border-slate-600'
                    }`}>
                      {domicileStatus === 'Pendatang / Domisili Sementara' && <div className="w-2 h-2 bg-emerald-600 rounded-full" />}
                    </div>
                    <span className="text-sm">Pendatang / Domisili Sementara</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Columns: Sidebar Upload and Dropdowns */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Avatar Upload Card */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 text-center relative overflow-hidden">
            <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-4 text-left">Foto Penduduk</h4>
            
            <div className="relative group mx-auto mb-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`w-44 h-44 mx-auto rounded-2xl bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-emerald-600 group-hover:bg-emerald-50/20 cursor-pointer ${
                  photoPreview ? 'border-solid border-emerald-100' : ''
                }`}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Pratinjau Foto" className="w-full h-full object-cover animate-in fade-in duration-200" />
                ) : (
                  /* Falls back automatically to beautifully styled gender base avatar (pink/blue) */
                  <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-b text-white transition-all duration-300 ${
                    gender === 'Perempuan' ? 'from-pink-300 to-pink-400' : 'from-blue-300 to-blue-400'
                  }`}>
                    <User className="w-16 h-16 animate-pulse" fill="currentColor" />
                    <span className="text-xs text-white/95 font-bold mt-2 tracking-wide">Pilih Foto</span>
                  </div>
                )}
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef}
                id="photo-upload-input" 
                accept="image/*" 
                className="hidden" 
                onChange={handlePhotoChange}
              />
            </div>

            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-white dark:bg-slate-900 text-emerald-700 border border-emerald-600 font-bold text-xs rounded-xl hover:bg-emerald-50 transition-colors"
              >
                Pilih File
              </button>
              {photoPreview && (
                <button 
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="px-3 py-2 bg-white dark:bg-slate-900 text-red-600 border border-red-200 rounded-xl hover:bg-red-50 hover:text-red-700 transition-colors"
                  title="Hapus Foto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <p className="text-[11px] text-gray-400 leading-relaxed mt-4 text-justify">
              Pastikan foto wajah terlihat jelas dan menggunakan latar belakang polos untuk keperluan administrasi resmi.
            </p>
          </section>

          {/* Section 3: Status & Hubungan */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Status</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Hubungan Keluarga</label>
                <select 
                  value={familyRelation}
                  onChange={(e) => setFamilyRelation(e.target.value)}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 cursor-pointer"
                >
                  <option value="Kepala Keluarga">Kepala Keluarga</option>
                  <option value="Istri">Istri</option>
                  <option value="Anak">Anak</option>
                  <option value="Orang Tua">Orang Tua</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Pendidikan Terakhir</label>
                <select 
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-slate-900 cursor-pointer"
                >
                  <option value="Tidak/Belum Sekolah">Tidak/Belum Sekolah</option>
                  <option value="SD / Sederajat">SD / Sederajat</option>
                  <option value="SMP / Sederajat">SMP / Sederajat</option>
                  <option value="SMA / Sederajat">SMA / Sederajat</option>
                  <option value="Diploma (D1/D2/D3)">Diploma (D1/D2/D3)</option>
                  <option value="Sarjana (S1)">Sarjana (S1)</option>
                  <option value="Pascasarjana (S2/S3)">Pascasarjana (S2/S3)</option>
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider block">Status Penduduk</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Aktif', 'Pindah', 'Meninggal', 'Ganda'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setResidentStatus(status)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                        residentStatus === status
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700'
                          : 'border-gray-100 dark:border-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50/60'
                      }`}
                    >
                      {residentStatus === status && <Check className="w-3.5 h-3.5" />}
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* System Info Accent Card */}
          <div className="bg-white/60 backdrop-blur-xl p-5 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 border-l-4 border-l-emerald-600 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Informasi Sistem</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Data akan dienkripsi dan disimpan secara aman di database desa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
