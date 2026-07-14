import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Printer, Save, Plus, Trash2, Search } from 'lucide-react';
import { showToast } from '../../../utils/toast';
import { fetchResidentsCached } from '../../../utils/apiCache';
import { useLetterKode } from '../../../hooks/useLetterKode';
import { getLetterClassifications, generateLetterNumber } from '../../../utils/letterClassifications';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { getVillageSettings } from '../../../utils/villageSettings';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { getReactSignaturePreview } from '../../../utils/signature';
import { useDragScroll } from '../../../hooks/useDragScroll';

export default function AdminSuratSPPD({ onBack, editData, editLetterId }: { onBack: () => void, editData?: any, editLetterId?: string | null }) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Desa Settings
  const [desaName, setDesaName] = useState('Desa Wasah Hilir');
  const [namaKades, setNamaKades] = useState('NIZAR AULIA RAHMAN');
  const [roleKades, setRoleKades] = useState('Kepala Desa');
  const [nipKades, setNipKades] = useState('');
  const [includeCamat, setIncludeCamat] = useState(false);

  // SPPD State
  const classifications = getLetterClassifications();
  const sppdClass = classifications.find(c => c.klasifikasi === 'SPPD');
  const [kodeKlasifikasi, setKodeKlasifikasi] = useLetterKode('SPPD');
  const [nomorSurat, setNomorSurat] = useState('');
  
  // Resident Data for Search
  const [residents, setResidents] = useState<any[]>([]);
  const [showPegawaiDropdown, setShowPegawaiDropdown] = useState(false);
  const [activePengikutDropdown, setActivePengikutDropdown] = useState<number | null>(null);

  useEffect(() => {
    fetchResidentsCached()
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => {
        if (Array.isArray(data)) setResidents(data);
      })
      .catch(err => console.error("Failed to load residents for SPPD:", err));
  }, []);

  // Pegawai / Yang Diperintah
  const [namaPegawai, setNamaPegawai] = useState(editData?.namaPegawai || '');
  const [nipPegawai, setNipPegawai] = useState(editData?.nipPegawai || '');
  const [pangkatGolongan, setPangkatGolongan] = useState(editData?.pangkatGolongan || '');
  const [jabatanPegawai, setJabatanPegawai] = useState(editData?.jabatanPegawai || '');

  // Detail Perjalanan
  const [maksudPerjalanan, setMaksudPerjalanan] = useState(editData?.maksudPerjalanan || '');
  const [alatAngkut, setAlatAngkut] = useState(editData?.alatAngkut || '');
  const [tempatBerangkat, setTempatBerangkat] = useState(editData?.tempatBerangkat || 'Desa Wasah Hilir');
  const [tempatTujuan, setTempatTujuan] = useState(editData?.tempatTujuan || '');
  const [lamaPerjalanan, setLamaPerjalanan] = useState(editData?.lamaPerjalanan || '1 (Satu) Hari');
  const [tanggalBerangkat, setTanggalBerangkat] = useState(editData?.tanggalBerangkat || '');
  const [tanggalKembali, setTanggalKembali] = useState(editData?.tanggalKembali || '');
  
  // Anggaran
  const [bebanAnggaran, setBebanAnggaran] = useState(editData?.bebanAnggaran || 'APBDes');
  const [mataAnggaran, setMataAnggaran] = useState(editData?.mataAnggaran || '');

  // Pengikut
  const [pengikut, setPengikut] = useState<{nama: string, umur: string, keterangan: string}[]>(editData?.pengikut || []);

  const [printLayout, setPrintLayout] = useState('semua'); // 'semua', 'spt', 'sppd', 'laporan'

  const scrollRef = useDragScroll();

  useEffect(() => {
    const settings = getVillageSettings();
    setDesaName(settings.name);
    setNamaKades(settings.kadesName);
    setRoleKades(settings.kadesRole || 'Kepala Desa');
    setNipKades(settings.kadesNip || '');
    setIncludeCamat(settings.includeCamat || false);

    if (!editLetterId && sppdClass) {
      setNomorSurat(generateLetterNumber(sppdClass.klasifikasi, kodeKlasifikasi || '094'));
    } else if (editData?.nomorSurat) {
      setNomorSurat(editData.nomorSurat);
    }
    
    // Set default dates if empty
    if (!tanggalBerangkat) {
      const now = new Date();
      setTanggalBerangkat(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
      setTanggalKembali(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    }
  }, [sppdClass, editLetterId, kodeKlasifikasi]);

  const addPengikut = () => {
    setPengikut([...pengikut, { nama: '', umur: '', keterangan: '' }]);
  };

  const removePengikut = (index: number) => {
    setPengikut(pengikut.filter((_, i) => i !== index));
  };

  const handlePengikutChange = (index: number, field: string, value: string) => {
    const updated = [...pengikut];
    updated[index] = { ...updated[index], [field]: value } as any;
    setPengikut(updated);
  };

  const recordLetterToHistory = () => {
    if (hasRecorded) return;
    
    const letterType = 'Surat Perjalanan Dinas (SPPD)';
    
    const payload = {
      nomor: nomorSurat,
      jenis: letterType,
      nama: namaPegawai || 'Tidak disebutkan',
      keperluan: `Tujuan: ${tempatTujuan} - ${maksudPerjalanan}`,
      tanggal: new Date().toISOString(),
      status: 'Selesai' as const,
      data: {
        nomorSurat,
        namaPegawai,
        nipPegawai,
        pangkatGolongan,
        jabatanPegawai,
        maksudPerjalanan,
        alatAngkut,
        tempatBerangkat,
        tempatTujuan,
        lamaPerjalanan,
        tanggalBerangkat,
        tanggalKembali,
        bebanAnggaran,
        mataAnggaran,
        pengikut
      }
    };

    if (editLetterId) {
      updateLetterHistory(editLetterId, payload);
    } else {
      addLetterHistory(payload);
    }
    
    setHasRecorded(true);
  };

  const handleSave = () => {
    setIsSaving(true);
    
    recordLetterToHistory();

    setTimeout(() => {
      setIsSaving(false);
      showToast(editLetterId ? 'Perubahan surat SPPD berhasil disimpan!' : 'Surat SPPD berhasil dibuat!', 'success');
      onBack();
    }, 1000);
  };

  const handlePrint = () => {
    recordLetterToHistory();

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.contentWindow?.print();
    }
  };

  const currentDateFormatted = () => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const date = new Date();
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Surat Perjalanan Dinas (SPPD)</h2>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-bold font-mono">Kode: {kodeKlasifikasi}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Pencetakan SPT, SPPD Visum, dan Lembar Laporan.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl font-medium transition-all"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            Simpan Draft
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Printer className="w-5 h-5" />
            Cetak Surat
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Inputs */}
        <div className="lg:col-span-5 space-y-6 h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Identitas Yang Ditugaskan</h3>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={namaPegawai}
                    onChange={(e) => {
                      setNamaPegawai(e.target.value);
                      setShowPegawaiDropdown(true);
                    }}
                    onFocus={() => setShowPegawaiDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPegawaiDropdown(false), 200)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                    placeholder="Ketik nama untuk mencari penduduk / isi manual..."
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
                {showPegawaiDropdown && namaPegawai.length > 1 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 max-h-60 overflow-y-auto z-50">
                    {residents.filter(r => r.name.toLowerCase().includes(namaPegawai.toLowerCase()) || r.nik.includes(namaPegawai)).slice(0, 5).map(res => (
                      <button
                        key={res.nik}
                        onClick={() => {
                          setNamaPegawai(res.name);
                          setNipPegawai(res.nik);
                          setJabatanPegawai(res.pekerjaan || '');
                          setShowPegawaiDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                      >
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{res.name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">NIK: {res.nik} &bull; {res.pekerjaan || 'Tidak ada pekerjaan'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">NIP (Jika Ada)</label>
                  <input 
                    type="text" 
                    value={nipPegawai}
                    onChange={(e) => setNipPegawai(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pangkat/Golongan</label>
                  <input 
                    type="text" 
                    value={pangkatGolongan}
                    onChange={(e) => setPangkatGolongan(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Jabatan / Pekerjaan</label>
                <input 
                  type="text" 
                  value={jabatanPegawai}
                  onChange={(e) => setJabatanPegawai(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  placeholder="Misal: Sekretaris Desa / Anggota BPD"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Detail Perjalanan Dinas</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Maksud Perjalanan Dinas</label>
                <textarea 
                  value={maksudPerjalanan}
                  onChange={(e) => setMaksudPerjalanan(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 resize-none"
                  placeholder="Misal: Konsultasi penyusunan RKP Desa"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tempat Tujuan</label>
                  <input 
                    type="text" 
                    value={tempatTujuan}
                    onChange={(e) => setTempatTujuan(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                    placeholder="Kantor Dinas PMD"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Alat Angkut</label>
                  <input 
                    type="text" 
                    value={alatAngkut}
                    onChange={(e) => setAlatAngkut(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                    placeholder="Kendaraan Pribadi/Dinas"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tanggal Berangkat</label>
                  <input 
                    type="date" 
                    value={tanggalBerangkat}
                    onChange={(e) => setTanggalBerangkat(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tanggal Kembali</label>
                  <input 
                    type="date" 
                    value={tanggalKembali}
                    onChange={(e) => setTanggalKembali(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Lama Perjalanan</label>
                <input 
                  type="text" 
                  value={lamaPerjalanan}
                  onChange={(e) => setLamaPerjalanan(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  placeholder="Misal: 1 (Satu) Hari"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Beban Anggaran</label>
                  <select
                    value={bebanAnggaran}
                    onChange={(e) => setBebanAnggaran(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  >
                    <option value="APBDes">APBDes</option>
                    <option value="Dana Desa (DD)">Dana Desa (DD)</option>
                    <option value="Alokasi Dana Desa (ADD)">Alokasi Dana Desa (ADD)</option>
                    <option value="Bantuan Keuangan Kabupaten">Bantuan Keuangan Kabupaten</option>
                    <option value="Ditanggung Instansi Lain">Ditanggung Instansi Lain</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Mata Anggaran</label>
                  <input 
                    type="text" 
                    value={mataAnggaran}
                    onChange={(e) => setMataAnggaran(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                    placeholder="Misal: 01.02.03"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Pengikut</h3>
              <button 
                onClick={addPengikut}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={14} /> Tambah Pengikut
              </button>
            </div>
            
            {pengikut.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
                Tidak ada pengikut.
              </div>
            ) : (
              <div className="space-y-3">
                {pengikut.map((p, index) => (
                  <div key={index} className="flex gap-2 items-start bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                    <div className="flex-1 space-y-2">
                      <div className="relative">
                        <input 
                          type="text" 
                          value={p.nama}
                          onChange={(e) => {
                            handlePengikutChange(index, 'nama', e.target.value);
                            setActivePengikutDropdown(index);
                          }}
                          onFocus={() => setActivePengikutDropdown(index)}
                          onBlur={() => setTimeout(() => setActivePengikutDropdown(null), 200)}
                          className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 pr-8"
                          placeholder="Cari penduduk / isi nama manual..."
                        />
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                        {activePengikutDropdown === index && p.nama.length > 1 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 max-h-40 overflow-y-auto z-50">
                            {residents.filter(r => r.name.toLowerCase().includes(p.nama.toLowerCase()) || r.nik.includes(p.nama)).slice(0, 5).map(res => (
                              <button
                                key={res.nik}
                                onClick={() => {
                                  handlePengikutChange(index, 'nama', res.name);
                                  handlePengikutChange(index, 'umur', res.umur || res.nik);
                                  handlePengikutChange(index, 'keterangan', res.pekerjaan || '');
                                  setActivePengikutDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                              >
                                <div className="font-semibold text-gray-900 dark:text-white text-xs">{res.name}</div>
                                <div className="text-[10px] text-gray-500 dark:text-slate-400">NIK: {res.nik}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={p.umur}
                          onChange={(e) => handlePengikutChange(index, 'umur', e.target.value)}
                          className="w-1/3 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                          placeholder="Umur/NIP"
                        />
                        <input 
                          type="text" 
                          value={p.keterangan}
                          onChange={(e) => handlePengikutChange(index, 'keterangan', e.target.value)}
                          className="w-2/3 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                          placeholder="Jabatan/Hubungan"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => removePengikut(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Print Preview */}
        <div className="lg:col-span-7 bg-gray-100 dark:bg-slate-800 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-200px)] border border-gray-200 dark:border-slate-700 relative">
          
          <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 p-3 flex justify-center gap-2">
            <button 
              onClick={() => setPrintLayout('semua')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${printLayout === 'semua' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              Semua Halaman
            </button>
            <button 
              onClick={() => setPrintLayout('spt')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${printLayout === 'spt' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              1. Lembar SPT
            </button>
            <button 
              onClick={() => setPrintLayout('sppd')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${printLayout === 'sppd' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              2. Visum SPPD
            </button>
            <button 
              onClick={() => setPrintLayout('laporan')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${printLayout === 'laporan' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              3. Lembar Laporan
            </button>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-auto p-8 flex flex-col items-center gap-8 cursor-grab active:cursor-grabbing"
          >
            <iframe
              ref={iframeRef}
              className="w-full max-w-[210mm] bg-white shadow-xl pointer-events-none"
              style={{ 
                minHeight: '297mm', // A4 min height
                height: printLayout === 'semua' ? '910mm' : '297mm'
              }}
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <title>Surat Perjalanan Dinas (SPPD)</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                      @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');
                      body { 
                        font-family: 'Times New Roman', Times, serif; 
                        background: white; 
                        margin: 0; 
                        padding: 0; 
                      }
                      .a4-page {
                        width: 210mm;
                        min-height: 297mm;
                        padding: 15mm 20mm;
                        background: white;
                        box-sizing: border-box;
                        position: relative;
                        page-break-after: always;
                      }
                      .a4-page:last-child {
                        page-break-after: auto;
                      }
                      .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 14px;
                      }
                      .print-table th, .print-table td {
                        border: 1px solid black;
                        padding: 4px 8px;
                      }
                      @media print {
                        body { background: white; }
                        .a4-page { padding: 0 !important; min-height: auto; box-shadow: none; }
                        @page { margin: 15mm 20mm; size: A4; }
                        
                        /* Layout visibility logic */
                        ${printLayout !== 'semua' ? `
                          .page-spt { display: ${printLayout === 'spt' ? 'block' : 'none'}; }
                          .page-sppd { display: ${printLayout === 'sppd' ? 'block' : 'none'}; }
                          .page-laporan { display: ${printLayout === 'laporan' ? 'block' : 'none'}; }
                        ` : ''}
                      }
                      /* Non-print layout visibility */
                      ${printLayout !== 'semua' ? `
                        .page-spt { display: ${printLayout === 'spt' ? 'block' : 'none'}; }
                        .page-sppd { display: ${printLayout === 'sppd' ? 'block' : 'none'}; }
                        .page-laporan { display: ${printLayout === 'laporan' ? 'block' : 'none'}; }
                      ` : ''}
                    </style>
                  </head>
                  <body>

                    <!-- HALAMAN 1: SURAT PERINTAH TUGAS (SPT) -->
                    <div class="a4-page page-spt">
                      ${SAAS_CONFIG.globalHeaderHTML}
                      
                      <div class="text-[14px] text-black">
                        <div class="text-center mb-6">
                          <h6 class="font-bold underline uppercase text-[16px] tracking-wide">SURAT PERINTAH TUGAS</h6>
                          <p class="font-mono">Nomor: ${nomorSurat}</p>
                        </div>

                        <div class="grid grid-cols-[120px_10px_1fr] gap-1 mb-4">
                          <span>Dasar</span>
                          <span>:</span>
                          <span class="text-justify">Peraturan Desa / Keputusan Kepala Desa ${desaName} mengenai pelaksanaan kegiatan pembangunan dan pemberdayaan masyarakat.</span>
                        </div>

                        <div class="text-center font-bold mb-4">MEMERINTAHKAN</div>
                        
                        <div class="grid grid-cols-[120px_10px_1fr] gap-1 mb-4">
                          <span>Kepada</span>
                          <span>:</span>
                          <span>
                            <div class="grid grid-cols-[30px_100px_10px_1fr] gap-1">
                              <span>1.</span>
                              <span>Nama</span>
                              <span>:</span>
                              <span class="font-bold">${namaPegawai || '.........................'}</span>
                              <span></span>
                              <span>Jabatan</span>
                              <span>:</span>
                              <span>${jabatanPegawai || '.........................'}</span>
                            </div>
                            ${pengikut.map((p, i) => `
                              <div class="grid grid-cols-[30px_100px_10px_1fr] gap-1 mt-1">
                                <span>${i+2}.</span>
                                <span>Nama</span>
                                <span>:</span>
                                <span>${p.nama}</span>
                                <span></span>
                                <span>Keterangan</span>
                                <span>:</span>
                                <span>${p.keterangan || p.umur}</span>
                              </div>
                            `).join('')}
                          </span>
                        </div>

                        <div class="grid grid-cols-[120px_10px_1fr] gap-1 mb-6">
                          <span>Untuk</span>
                          <span>:</span>
                          <span>
                            <div class="flex gap-2"><span>1.</span><span class="text-justify">${maksudPerjalanan || '.........................'}</span></div>
                            <div class="flex gap-2"><span>2.</span><span>Tempat Tujuan: ${tempatTujuan || '.........................'}</span></div>
                            <div class="flex gap-2"><span>3.</span><span>Waktu: ${lamaPerjalanan || '........'}, mulai tanggal ${formatDate(tanggalBerangkat)} s/d ${formatDate(tanggalKembali)}</span></div>
                            <div class="flex gap-2"><span>4.</span><span>Setelah selesai melaksanakan tugas diharap segera melaporkan hasilnya.</span></div>
                          </span>
                        </div>

                        ${getReactSignaturePreview(desaName, currentDateFormatted(), namaKades, roleKades, nipKades, includeCamat)}
                      </div>
                    </div>

                    <!-- HALAMAN 2: VISUM SPPD -->
                    <div class="a4-page page-sppd">
                      <div class="text-[14px] text-black">
                        <div class="flex justify-between items-start mb-6">
                          <div></div>
                          <div class="w-[300px]">
                            <div class="grid grid-cols-[80px_10px_1fr]">
                              <span>Lembar Ke</span><span>:</span><span>1 (Satu)</span>
                              <span>Kode No</span><span>:</span><span>${kodeKlasifikasi || '094'}</span>
                              <span>Nomor</span><span>:</span><span class="font-mono font-bold">${nomorSurat}</span>
                            </div>
                          </div>
                        </div>

                        <div class="text-center mb-6">
                          <h6 class="font-bold underline uppercase text-[16px] tracking-wide">SURAT PERINTAH PERJALANAN DINAS</h6>
                          <h6 class="font-bold uppercase text-[16px] tracking-wide">( S P P D )</h6>
                        </div>

                        <table class="print-table mb-8">
                          <tbody>
                            <tr>
                              <td class="w-8 text-center">1</td>
                              <td class="w-[200px]">Pejabat yang memberi perintah</td>
                              <td colspan="2">Kepala ${desaName}</td>
                            </tr>
                            <tr>
                              <td class="text-center">2</td>
                              <td>Nama pegawai yang diperintah</td>
                              <td colspan="2" class="font-bold">${namaPegawai || '.........................'}</td>
                            </tr>
                            <tr>
                              <td class="text-center">3</td>
                              <td>a. Pangkat / Golongan<br>b. Jabatan / Instansi<br>c. Tingkat menurut peraturan perjalanan</td>
                              <td colspan="2">a. ${pangkatGolongan || '-'}<br>b. ${jabatanPegawai || '-'}<br>c. -</td>
                            </tr>
                            <tr>
                              <td class="text-center">4</td>
                              <td>Maksud Perjalanan Dinas</td>
                              <td colspan="2">${maksudPerjalanan || '.........................'}</td>
                            </tr>
                            <tr>
                              <td class="text-center">5</td>
                              <td>Alat Angkutan yang dipergunakan</td>
                              <td colspan="2">${alatAngkut || '.........................'}</td>
                            </tr>
                            <tr>
                              <td class="text-center">6</td>
                              <td>a. Tempat Berangkat<br>b. Tempat Tujuan</td>
                              <td colspan="2">a. ${tempatBerangkat || '.........................'}<br>b. ${tempatTujuan || '.........................'}</td>
                            </tr>
                            <tr>
                              <td class="text-center">7</td>
                              <td>a. Lamanya perjalanan dinas<br>b. Tanggal Berangkat<br>c. Tanggal harus kembali</td>
                              <td colspan="2">a. ${lamaPerjalanan || '.........................'}<br>b. ${formatDate(tanggalBerangkat) || '.........................'}<br>c. ${formatDate(tanggalKembali) || '.........................'}</td>
                            </tr>
                            <tr>
                              <td class="text-center">8</td>
                              <td>Pengikut (Nama, Umur, Hubungan/Keterangan)</td>
                              <td colspan="2">
                                ${pengikut.length > 0 ? pengikut.map((p, i) => `${i+1}. ${p.nama} (${p.umur}) - ${p.keterangan}`).join('<br>') : '-'}
                              </td>
                            </tr>
                            <tr>
                              <td class="text-center">9</td>
                              <td>Pembebanan Anggaran<br>a. Instansi<br>b. Mata Anggaran</td>
                              <td colspan="2">a. ${bebanAnggaran || '.........................'}<br>b. ${mataAnggaran || '.........................'}</td>
                            </tr>
                            <tr>
                              <td class="text-center">10</td>
                              <td>Keterangan lain-lain</td>
                              <td colspan="2"></td>
                            </tr>
                          </tbody>
                        </table>
                        
                        <div class="flex justify-end pr-10">
                          <div class="text-center w-[250px]">
                            <p>Dikeluarkan di : ${desaName.replace(/desa|kelurahan/gi, '').trim()}</p>
                            <p>Pada tanggal : ${currentDateFormatted()}</p>
                            <div class="h-[1px] bg-black my-2"></div>
                            <p class="font-bold">${roleKades}</p>
                            <div class="h-16"></div>
                            <p class="font-bold underline">${namaKades}</p>
                          </div>
                        </div>

                      </div>
                    </div>

                    <!-- HALAMAN 3: LEMBAR LAPORAN -->
                    <div class="a4-page page-laporan">
                      ${SAAS_CONFIG.globalHeaderHTML}
                      
                      <div class="text-[14px] text-black mt-8">
                        <div class="text-center mb-8">
                          <h6 class="font-bold underline uppercase text-[16px] tracking-wide">LAPORAN HASIL PERJALANAN DINAS</h6>
                        </div>

                        <div class="grid grid-cols-[150px_10px_1fr] gap-2 mb-8">
                          <span>1. Dasar Penugasan</span>
                          <span>:</span>
                          <span>Surat Perintah Tugas Nomor: ${nomorSurat}</span>

                          <span>2. Yang Melaksanakan</span>
                          <span>:</span>
                          <span>
                            ${namaPegawai} (${jabatanPegawai})
                            ${pengikut.length > 0 ? `<br>Beserta ${pengikut.length} pengikut.` : ''}
                          </span>

                          <span>3. Tempat Tujuan</span>
                          <span>:</span>
                          <span>${tempatTujuan}</span>

                          <span>4. Waktu Pelaksanaan</span>
                          <span>:</span>
                          <span>${formatDate(tanggalBerangkat)} s/d ${formatDate(tanggalKembali)}</span>

                          <span>5. Maksud Perjalanan</span>
                          <span>:</span>
                          <span>${maksudPerjalanan}</span>
                        </div>

                        <div class="mb-2 font-bold">6. Hasil Kegiatan / Laporan:</div>
                        <div class="space-y-6 mt-6">
                          <div class="border-b border-black w-full h-4"></div>
                          <div class="border-b border-black w-full h-4"></div>
                          <div class="border-b border-black w-full h-4"></div>
                          <div class="border-b border-black w-full h-4"></div>
                          <div class="border-b border-black w-full h-4"></div>
                          <div class="border-b border-black w-full h-4"></div>
                          <div class="border-b border-black w-full h-4"></div>
                          <div class="border-b border-black w-full h-4"></div>
                        </div>

                        <div class="flex justify-end pr-10 mt-16">
                          <div class="text-center w-[250px]">
                            <p>${desaName.replace(/desa|kelurahan/gi, '').trim()}, ............................ ${new Date().getFullYear()}</p>
                            <p>Pelapor,</p>
                            <div class="h-20"></div>
                            <p class="font-bold underline">${namaPegawai || '..............................'}</p>
                          </div>
                        </div>

                      </div>
                    </div>

                  </body>
                </html>
              `}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

