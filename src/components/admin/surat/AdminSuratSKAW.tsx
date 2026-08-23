import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';
import { UnifiedResidentSearch } from '../penduduk/UnifiedResidentSearch';
import { SuggestCombobox } from './SuggestCombobox';
import { KEPERLUAN_OPTIONS } from './keperluanOptions';
import SuratEditorHeader, { getLetterHeaderTemplate } from './SuratEditorHeader';
import { useBackdateNumber } from '../../../hooks/useBackdateNumber';
import BackdateConfig from './BackdateConfig';
import { generateKopSuratHTML } from '../../../utils/letterFormat';
import { resolveKadesName } from '../../../utils/letterOfficers';
import { parseAddress } from '../../../utils/addressParser';
import { fetchResidentsCached } from '../../../utils/apiCache';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PrintSuccessDialog from './PrintSuccessDialog';
import { User, Frown, FileSignature, AlertCircle, History,
  ZoomIn, ZoomOut, Calendar, FileText
} from 'lucide-react';
import { getLetterClassifications, incrementSequenceNumber, generateLetterNumberAsync } from '../../../utils/letterClassifications';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { getPrintSignatureHTML } from '../../../utils/signature';
import { showToast } from '../../../utils/toast';
import { capitalizeResidentFields, capitalizeWords } from '../../../utils/textUtils';
import { useDragScroll } from '../../../hooks/useDragScroll';

interface Resident {
  nik: string;
  name: string;
  gender: string;
  birthPlace: string;
  birthDate: string;
  job: string;
  address: string;
  desa: string;
  fatherName: string;
  motherName: string;
}

interface RtRwEntry { no: string; name: string; }

interface HeirRow {
  id: string;
  nama: string;
  nik: string;
  hubungan: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  agama: string;
  pekerjaan: string;
  alamat: string;
  rt: string;
  rw: string;
}

interface RwEntry { no: string; name: string; }

export default function AdminSuratSKAW({ 
  onBack,
  editData,
  editLetterId,
  presetResident
}: { 
  onBack: () => void;
  editData?: any;
  editLetterId?: string | null;
  presetResident?: any;
}) {
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddInitialData, setQuickAddInitialData] = useState<{nik?: string, name?: string}>({});
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0]);
  const backdateKlas = getLetterClassifications().find(c => c.klasifikasi === 'SKAW') || { klasifikasi: 'SKAW', kodeKlasifikasi: '474' };
  const kodeKlasifikasiSKAW = backdateKlas.kodeKlasifikasi || '474';
  const { isBackdate, setIsBackdate } = useBackdateNumber(tanggalSurat, backdateKlas.klasifikasi, backdateKlas.kodeKlasifikasi);
  const [manualSequence, setManualSequence] = useState('');

  const handleCustomNomorSurat = (nomor: string) => {
    setFormData((prev: any) => ({ ...prev, nomorSurat: nomor }));
  };

  React.useEffect(() => {
    if (presetResident) {
      handleSelectResident(presetResident);
    }
  }, [presetResident]);

  const [loading, setLoading] = useState(false);
  const [useEsignature, setUseEsignature] = useState(true);
  const [success, setSuccess] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChild, setSelectedChild] = useState<Resident | null>(null);
  const [showRiwayat, setShowRiwayat] = useState(false);
  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [heirs, setHeirs] = useState<HeirRow[]>([]);
  const [showAddHeirModal, setShowAddHeirModal] = useState(false);
  const [editingHeir, setEditingHeir] = useState<HeirRow | null>(null);

  const rtList: RtRwEntry[] = (() => { try { return JSON.parse(localStorage.getItem('village_rt_list') || '[]'); } catch { return []; } })();
  const rwList: RwEntry[] = (() => { try { return JSON.parse(localStorage.getItem('village_rw_list') || '[]'); } catch { return []; } })();

  // Prefill in edit mode
  useEffect(() => {
    if (editData) {
      setFormData(prev => ({ ...prev, ...editData }));
      if (editData.heirs && Array.isArray(editData.heirs)) {
        setHeirs(editData.heirs.map((h: any) => ({
          id: h.id || Date.now(),
          nama: h.nama || '',
          nik: h.nik || '',
          hubungan: h.hubungan || '',
          tempatLahir: h.tempatLahir || '',
          tanggalLahir: h.tanggalLahir || '',
          jenisKelamin: h.jenisKelamin || 'Laki-Laki',
          agama: h.agama || 'Islam',
          pekerjaan: h.pekerjaan || '',
          alamat: h.alamat || '',
          rt: h.rt || '',
          rw: h.rw || ''
        })));
      }
    }
  }, [editData]);

  // Form Data - SKAW specific fields
  const [formData, setFormData] = useState({
    // Data Almarhum (deceased)
    nama_almarhum: '',
    nik_almarhum: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin_almarhum: 'Laki-Laki',
    agama_almarhum: 'Islam',
    pekerjaan_almarhum: '',
    alamat_almarhum: '',
    rt_almarhum: '',
    rw_almarhum: '',
    
    // Data Pasangan (spouse)
    nama_pasangan: '',
    nik_pasangan: '',
    tanggal_nikah: '',
    
    // Keperluan
    keperluan: 'Keterangan Ahli Waris',
    
    // Pejabat
    namaPejabat: resolveKadesName() || '',
    jabatanPejabat: 'Kepala Desa',
    includeCamat: false,
    
    // Kop Settings
    namaDesa: localStorage.getItem('kop_desa') || '',
    namaKecamatan: localStorage.getItem('kop_kecamatan') || '',
    namaKabupaten: localStorage.getItem('kop_kabupaten') || '',
    namaProvinsi: localStorage.getItem('kop_provinsi') || '',
    alamatKantor: localStorage.getItem('kop_alamat') || '',
    kontakKantor: localStorage.getItem('kop_kontak') || '',
  });

  const [previewZoom, setPreviewZoom] = useState(0.45);
  const dragProps = useDragScroll();
  const letterFont = localStorage.getItem('village_letter_font') || 'Arial, sans-serif';
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const jobs = [
    'Belum/Tidak Bekerja', 'Mengurus Rumah Tangga', 'Pelajar/Mahasiswa', 'Pensiunan',
    'Petani/Pekebun', 'Buruh Tani/Perkebunan', 'Peternak', 'Nelayan/Perikanan', 'Buruh Nelayan/Perikanan',
    'Buruh Harian Lepas', 'Pedagang', 'Wiraswasta', 'Karyawan Swasta', 'Karyawan BUMN/BUMD',
    'Sopir/Ojek', 'Tukang (Kayu/Batu/Las/Jahit, dll)', 'Mekanik', 'Pembantu Rumah Tangga',
    'Guru', 'Bidan', 'Perawat', 'Ustadz/Mubaligh',
    'Perangkat Desa', 'Kepala Desa', 'ASN (Aparatur Sipil Negara)'
  ];

  // Smart Extraction: Parse almarhum address on blur
  const handleAlamatBlur = (val: string) => {
    const parsed = parseAddress(val);
    setFormData(prev => ({
      ...prev,
      alamat_almarhum: parsed.cleanAddress,
      ...(parsed.rt ? { rt_almarhum: parsed.rt } : {}),
      ...(parsed.rw ? { rw_almarhum: parsed.rw } : {})
    }));
  };

  // Handle heir row changes
  const handleHeirChange = (id: string, field: keyof HeirRow, value: string) => {
    setHeirs(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  // Add new heir row
  const addHeirRow = () => {
    const newHeir: HeirRow = {
      id: Date.now().toString(),
      nama: '',
      nik: '',
      hubungan: '',
      tempatLahir: '',
      tanggalLahir: '',
      jenisKelamin: 'Laki-Laki',
      agama: 'Islam',
      pekerjaan: '',
      alamat: '',
      rt: '',
      rw: ''
    };
    setHeirs(prev => [...prev, newHeir]);
    setShowAddHeirModal(false);
  };

  // Delete heir row
  const deleteHeirRow = (id: string) => {
    setHeirs(prev => prev.filter(row => row.id !== id));
  };

  // Save edited heir
  const saveHeirRow = (id: string, heirData: HeirRow) => {
    setHeirs(prev => prev.map(row => 
      row.id === id ? heirData : row
    ));
    setEditingHeir(null);
  };

  // Prefetch residents on mount
  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const res = await fetchResidentsCached();
        if (res.ok) {
          const data = await res.json();
          setResidents(data);
        }
      } catch (e) {}
    };
    fetchResidents();
  }, []);

  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const res = await fetchResidentsCached();
        if (res.ok) {
          const data = await res.json();
          setResidents(data);
        }
      } catch (e) {}
    };

    fetchResidents();

    const configs = getLetterClassifications();
    const skaw = configs.find(c => c.klasifikasi === 'SKAW') || { id: 'fallback_skaw', jenis: 'SKAW', klasifikasi: 'SKAW', kodeKlasifikasi: '474', noUrutTerakhir: 0 };
    
    if (!editData) {
      generateLetterNumberAsync(skaw.klasifikasi, skaw.kodeKlasifikasi || '474', isBackdate ? new Date(tanggalSurat) : undefined)
        .then(generatedNo => setFormData(prev => ({
          ...prev,
          nomorSurat: generatedNo
        })))
        .catch(err => console.error('Gagal generate nomor surat:', err));
    }

    const savedRiwayat = localStorage.getItem('riwayat_surat_skaw');
    if (savedRiwayat) setRiwayat(JSON.parse(savedRiwayat));

    const activePejabat = resolveKadesName() || '';
    try {
      const stored = localStorage.getItem('village_officers');
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find((o: any) => o.name === activePejabat);
        if (found) {
          setFormData(prev => ({ ...prev, jabatanPejabat: found.role }));
        }
      }
    } catch (e) {}
  }, []);

  const handleSelectResident = (res: Resident) => {
    setSelectedChild(res);
    const rt_rw = (res as any).rt_rw || '001/001';
    const [rt, rw] = rt_rw.split('/');

    setFormData(prev => ({
      ...prev,
      nama_almarhum: capitalizeResidentFields(res).name,
      nik_almarhum: res.nik,
      tempat_lahir: capitalizeResidentFields(res).birthPlace,
      tanggal_lahir: res.birthDate,
      jenis_kelamin_almarhum: res.gender || 'Laki-Laki',
      agama_almarhum: (res as any).religion || 'Islam',
      pekerjaan_almarhum: res.job || '',
      alamat_almarhum: capitalizeResidentFields(res).address,
      rt_almarhum: rt || '001',
      rw_almarhum: rw || '001',
    }));
  };

  // Handle almarhum resident selection
  const handleAlmarhumResidentSelect = (res: Resident) => {
    setSelectedChild(res);
    const rt_rw = (res as any).rt_rw || '001/001';
    const [rt, rw] = rt_rw.split('/');

    setFormData(prev => ({
      ...prev,
      nama_almarhum: capitalizeResidentFields(res).name,
      nik_almarhum: res.nik,
      tempat_lahir: capitalizeResidentFields(res).birthPlace,
      tanggal_lahir: res.birthDate,
      jenis_kelamin_almarhum: res.gender || 'Laki-Laki',
      agama_almarhum: (res as any).religion || 'Islam',
      pekerjaan_almarhum: res.job || '',
      alamat_almarhum: capitalizeResidentFields(res).address,
      rt_almarhum: rt || '001',
      rw_almarhum: rw || '001',
    }));
  };

  const handlePasanganResidentSelect = (res: Resident) => {
    setFormData(prev => ({
      ...prev,
      nama_pasangan: capitalizeResidentFields(res).name,
      nik_pasangan: res.nik,
    }));
  };

  const handleKeperluanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, keperluan: e.target.value }));
  };

  // Generate letter number on mount (if not editing)
  useEffect(() => {
    if (!editData) {
      const configs = getLetterClassifications();
      const skawConfig = configs.find(c => c.klasifikasi === 'SKAW') || { id: 'fallback_skaw', kodeKlasifikasi: '474' };
      generateLetterNumberAsync(skawConfig.klasifikasi, skawConfig.kodeKlasifikasi || '474', isBackdate ? new Date(tanggalSurat) : undefined)
        .then(generatedNo => setFormData(prev => ({
          ...prev,
          nomorSurat: generatedNo
        })))
        .catch(err => console.error('Gagal generate nomor surat:', err));
    }
  }, [editData, isBackdate, tanggalSurat]);

  // Save riwayat
  useEffect(() => {
    localStorage.setItem('riwayat_surat_skaw', JSON.stringify(riwayat));
  }, [riwayat]);

  // Format date for display
  const formatIndoDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create letter data
      const letterData = {
        ...formData,
        heirs: heirs.map((h: any) => ({
          nama: h.nama,
          nik: h.nik,
          hubungan: h.hubungan,
          tempatLahir: h.tempatLahir,
          tanggalLahir: h.tanggalLahir,
          jenisKelamin: h.jenisKelamin,
          agama: h.agama,
          pekerjaan: h.pekerjaan,
          alamat: h.alamat,
          rt: h.rt,
          rw: h.rw
        }))
      };

      // Add to history
      await addLetterHistory({
        klasifikasi: 'SKAW',
        nomorSurat: formData.nomorSurat || '',
        tglSurat: formatIndoDate(tanggalSurat),
        keperluan: formData.keperluan,
        ...letterData
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      showToast('success', 'Surat Keterangan Ahli Waris berhasil dibuat!', '');
    } catch (err) {
      console.error('Error creating SKAW:', err);
      showToast('error', 'Gagal membuat surat', '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header dengan template surat terpusat */}
      <SuratEditorHeader 
        klasifikasi="SKAW" 
        jenis="SKAW" 
        deskripsi="Surat Keterangan & Pernyataan Ahli Waris"
        kodeKlasifikasi="474"
        onBack={onBack}
      />
      
      <div className="container mx-auto py-6 px-4">
        {/* Status Toast */}
        {success && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow animate-in fade-in-up-0">
            <span className="font-medium">Sukses</span>
            <span className="ml-2">Surat Keterangan Ahli Waris berhasil dibuat!</span>
          </div>
        )}
        
        <div className="max-w-7xl mx-auto">
          {/* Card form */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
            
            {/* Header card */}
            <div className="bg-slate-50 dark:bg-slate-700 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                Buat Surat Keterangan Ahli Waris (SKAW)
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Nomor: <span className="font-medium text-slate-600 dark:text-slate-300">{formData.nomorSurat || '---'}</span>
              </p>
            </div>
            
            {/* Form body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Data Almarhum Section */}
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Data Almarhum</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nama Almarhum */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Nama Lengkap Almarhum</label>
                    <input
                      type="text"
                      value={formData.nama_almarhum}
                      onChange={(e) => setFormData(prev => ({ ...prev, nama_almarhum: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  {/* NIK Almarhum */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">NIK Almarhum</label>
                    <input
                      type="text"
                      value={formData.nik_almarhum}
                      onChange={(e) => setFormData(prev => ({ ...prev, nik_almarhum: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  {/* Tempat Lahir Almarhum */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      value={formData.tempat_lahir}
                      onChange={(e) => setFormData(prev => ({ ...prev, tempat_lahir: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  {/* Tanggal Lahir Almarhum */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={formData.tanggal_lahir}
                      onChange={(e) => setFormData(prev => ({ ...prev, tanggal_lahir: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  {/* Jenis Kelamin Almarhum */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Jenis Kelamin</label>
                    <select
                      value={formData.jenis_kelamin_almarhum}
                      onChange={(e) => setFormData(prev => ({ ...prev, jenis_kelamin_almarhum: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Laki-Laki">Laki-Laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  
                  {/* Agama Almarhum */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Agama</label>
                    <select
                      value={formData.agama_almarhum}
                      onChange={(e) => setFormData(prev => ({ ...prev, agama_almarhum: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Islam">Islam</option>
                      <option value="Kristen">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Khonghucu">Khonghicu</option>
                    </select>
                  </div>
                  
                  {/* Pekerjaan Almarhum */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Pekerjaan</label>
                    <input
                      type="text"
                      value={formData.pekerjaan_almarhum}
                      onChange={(e) => setFormData(prev => ({ ...prev, pekerjaan_almarhum: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      placeholder="Contoh: Pensiunan, Wirausaha, dll"
                    />
                  </div>
                  
                  {/* Alamat Almarhum */}
                  <div className="col-span-full">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Alamat Lengkap</label>
                    <textarea
                      value={formData.alamat_almarhum}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, alamat_almarhum: e.target.value }));
                        handleAlamatBlur(e.target.value);
                      }}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500 resize-h min-h-[80px]"
                      rows={3}
                      placeholder="Masukkan alamat lengkap almarhum (contoh: Jl. Contoh No. 123, Desa Contoh)"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      <span className="font-medium">Smart Extraction:</span> RT/RW akan otomatis terisi setelah selesai ketik.
                    </p>
                  </div>
                  
                  {/* RT/RW Almarhum */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">RT</label>
                      <input
                        type="text"
                        value={formData.rt_almarhum}
                        onChange={(e) => setFormData(prev => ({ ...prev, rt_almarhum: e.target.value }))}
                        className="w-full px-2 py-1 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                        placeholder="001"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">RW</label>
                      <input
                        type="text"
                        value={formData.rw_almarhum}
                        onChange={(e) => setFormData(prev => ({ ...prev, rw_almarhum: e.target.value }))}
                        className="w-full px-2 py-1 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                        placeholder="001"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Data Pasangan Section */}
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Data Pasangan</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nama Pasangan */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Nama Pasangan</label>
                    <input
                      type="text"
                      value={formData.nama_pasangan}
                      onChange={(e) => setFormData(prev => ({ ...prev, nama_pasangan: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  {/* NIK Pasangan */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">NIK Pasangan</label>
                    <input
                      type="text"
                      value={formData.nik_pasangan}
                      onChange={(e) => setFormData(prev => ({ ...prev, nik_pasangan: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  {/* Tanggal Nikah */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Tanggal Nikah</label>
                    <input
                      type="date"
                      value={formData.tanggal_nikah}
                      onChange={(e) => setFormData(prev => ({ ...prev, tanggal_nikah: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
              
              {/* Daftar Ahli Waris Section */}
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Daftar Ahli Waris</h3>
                
                {/* Tombol add heir */}
                <div className="mb-3 flex items-center justify-between">
                  <button
                    onClick={() => setShowAddHeirModal(true)}
                    className="inline-flex items-center rounded-md text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path className="stroke-2" strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M17.657 10.657l-.707-.707M18.707 7.047l-.707-.707M17.657 15.657l-.707-.707M18.707 17.953l-.707-.707M7.047 18.707l-.707-.707M7.953 17.657l-.707-.707M12 20.657l-.707-.707M15.657 12l-.707-.707M12 3.343l-.707-.707M3.343 12l-.707-.707M3.343 3.343l-.707-.707M12 9.01l-.707-.707M9.01 12l-.707-.707M15.989 5.989l-.707-.707M5.989 12l-.707-.707M5.989 5.989l-.707-.707M19.01 12l-.707-.707M12 19.01l-.707-.707M12 4.99l-.707-.707M4.99 12l-.707-.707M10 30l1.293-1.293M21 10l-1.293-1.293M10 9l1.293-1.293M9 10l1.293-1.293" />
                    </svg>
                    Tambah Ahli Waris
                  </button>
                  
                  {/* Jumlah ahli waris terdaftar */}
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {heirs.length} dari 9 wajib
                  </span>
                </div>
                
                {/* Tabel ahli waris */}
                {heirs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th scope="col" className="text-left p-3 font-medium text-slate-500 dark:text-slate-400 lebar-kanan">No</th>
                          <th scope="col" className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">Nama Ahli Waris</th>
                          <th scope="col" className="text-left p-3 font-medium text-slate-500 dark:text-slate-400 lebar-kanan">NIK</th>
                          <th scope="col" className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">Hubungan</th>
                          <th scope="col" className="text-left p-3 font-medium text-slate-500 dark:text-slate-400 lebar-kanan">Tempat Lahir</th>
                          <th scope="col" className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">Tgl. Lahir</th>
                          <th scope="col" className="text-left p-3 font-medium text-slate-500 dark:text-slate-400 lebar-kanan">Jenis Kelamin</th>
                          <th scope="col" className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">Agama</th>
                          <th scope="col" className="text-left p-3 font-medium text-slate-500 dark:text-slate-400 lebar-kanan">Pekerjaan</th>
                          <th scope="col" className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">Alamat</th>
                          <th scope="col" className="text-left p-3 font-medium text-slate-500 dark:text-slate-400 lebar-kanan">RT</th>
                          <th scope="col" className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">RW</th>
                          <th scope="col" className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heirs.map((heir, index) => (
                          <tr key={heir.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900">
                            <td className="p-3 lebar-kanan font-medium text-slate-600 dark:text-slate-300">{index + 1}</td>
                            <td className="p-3">{heir.nama}</td>
                            <td className="p-3">{heir.nik}</td>
                            <td className="p-3">{heir.hubungan}</td>
                            <td className="p-3">{heir.tempatLahir}</td>
                            <td className="p-3">{formatIndoDate(heir.tanggalLahir)}</td>
                            <td className="p-3">
                              <select
                                value={heir.jenisKelamin}
                                onChange={(e) => handleHeirChange(heir.id, 'jenisKelamin', e.target.value)}
                                className="w-full px-2 py-1 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                              >
                                <option value="Laki-Laki">L</option>
                                <option value="Perempuan">P</option>
                              </select>
                            </td>
                            <td className="p-3">{heir.agama}</td>
                            <td className="p-3">{heir.pekerjaan}</td>
                            <td className="p-3">{heir.alamat}</td>
                            <td className="p-3">{heir.rt}</td>
                            <td className="p-3">{heir.rw}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setEditingHeir(heir)}
                                  className="underline text-emerald-600 dark:text-emerald-400 text-xs cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteHeirRow(heir.id)}
                                  className="underline text-red-600 dark:text-red-400 text-xs cursor-pointer"
                                >
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 py-8">
                    Belum ada data ahli waris. Klik "Tambah Ahli Waris" untuk menambah data.
                  </p>
                )}
              </div>
              
              {/* Keperluan Section */}
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Keperluan Pembuatan Surat</h3>
                
                <select
                  value={formData.keperluan}
                  onChange={handleKeperluanChange}
                  className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Keterangan Ahli Waris">Keterangan Ahli Waris</option>
                  <option value="Pernyataan Waris">Pernyataan Waris</option>
                  <option value="Pembagian Waris">Pembagian Waris</option>
                  <option value="Pengajuan HT">Pengajuan Hak Tanah</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>
              
              {/* Pejabat Section */}
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Pejabat Penandatangan</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Nama Pejabat</label>
                    <input
                      type="text"
                      value={formData.nomePejabat}
                      onChange={(e) => setFormData(prev => ({ ...prev, namaPejabat: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Jabatan</label>
                    <select
                      value={formData.jabatanPejabat}
                      onChange={(e) => setFormData(prev => ({ ...prev, jabatanPejabat: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Kepala Desa">Kepala Desa</option>
                      <option value="Kamat">Kamat</option>
                      <option>Sekretaris Desa</option>
                      <option>Lurah</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Kop Settings Section */}
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Setelan Kop Surat</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Nama Desa</label>
                    <input
                      type="text"
                      value={formData.namaDesa}
                      onChange={(e) => setFormData(prev => ({ ...prev, namaDesa: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Kecamatan</label>
                    <input
                      type="text"
                      value={formData.namaKecamatan}
                      onChange={(e) => setFormData(prev => ({ ...prev, namaKecamatan: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Kabupaten/Kota</label>
                    <input
                      type="text"
                      value={formData.namaKabupaten}
                      onChange={(e) => setFormData(prev => ({ ...prev, namaKabupaten: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Provinsi</label>
                    <input
                      type="text"
                      value={formData.namaProvinsi}
                      onChange={(e) => setFormData(prev => ({ ...prev, namaProvinsi: e.target.value }))}
                      className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Alamat Kantor Desa</label>
                  <textarea
                    value={formData.alamatKantor}
                    onChange={(e) => setFormData(prev => ({ ...prev, alamatKantor: e.target.value }))}
                    className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500 resize-y min-h-[80px]"
                    rows={3}
                    placeholder="Alamat kantor desa..."
                  />
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Kontak Kantor</label>
                  <input
                    type="text"
                    value={formData.kontakKantor}
                    onChange={(e) => setFormData(prev => ({ ...prev, kontakKantor: e.target.value }))}
                    className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    placeholder="Contoh: 021-1234567"
                  />
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex-1 rounded-md bg-slate-200 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 transition-colors"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors"
                >
                  {loading ? 'Membuat...' : 'Buat Surat'}
                </button>
              </div>
              
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}