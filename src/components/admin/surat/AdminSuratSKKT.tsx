import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Search, Printer, MapPin, Map, FileSignature, CheckCircle2 } from 'lucide-react';
import { useLetterKode } from '../../../hooks/useLetterKode';
import { useLetterDescription } from '../../../hooks/useLetterDescription';
import { fetchResidentsCached } from '../../../utils/apiCache';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { getPrintSignatureHTML } from '../../../utils/signature';
import { showToast } from '../../../utils/toast';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';

interface Resident {
  nik: string;
  name: string;
  gender: string;
  birthPlace: string;
  birthDate: string;
  job: string;
  address: string;
  desa: string;
}

export default function AdminSuratSKKT({ 
  onBack, 
  presetResident,
  editData,
  editLetterId
}: { 
  onBack: () => void, 
  presetResident?: any,
  editData?: any,
  editLetterId?: string | null
}) {
  const [loading, setLoading] = useState(false);
  const templateKode = useLetterKode('SKKT');
  const templateDesc = useLetterDescription('SKKT', 'Surat Keterangan Kepemilikan Tanah');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMapModal, setShowMapModal] = useState(false);

  const [formData, setFormData] = useState({
    nomorSurat: '',
    nama: '',
    nik: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: 'Laki-Laki',
    pekerjaan: 'Petani/Pekebun',
    alamat: '',
    
    // Data Tanah
    noPersil: '',
    luasTanah: '',
    statusPerolehan: 'Jual Beli / Hibah / Waris',
    lokasiTanah: '',
    batasUtara: '',
    batasSelatan: '',
    batasTimur: '',
    batasBarat: '',
    lat: '-2.797806',
    lng: '115.227889',
    keperluan: 'Kelengkapan Berkas / Sertifikasi Tanah',

    // Pejabat & Kop
    namaPejabat: localStorage.getItem('kop_kades') || 'FAZAKKIR RAHMAD',
    jabatanPejabat: 'Kepala Desa',
    includeCamat: false,
    namaDesa: localStorage.getItem('kop_desa') || 'Sukamakmur',
    namaKecamatan: localStorage.getItem('kop_kecamatan') || 'Simpur',
    namaKabupaten: localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan',
    alamatKantor: localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RW.001 Kodepos 71261',
    kontakKantor: localStorage.getItem('kop_kontak') || '081346867519 | pemdessukamakmur@gmail.com',
  });

  useEffect(() => {
    if (editData) {
      setFormData(prev => ({ ...prev, ...editData }));
    }
  }, [editData]);

  useEffect(() => {
    fetchResidentsCached()
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setResidents(data); })
      .catch(e => console.error(e));
  }, []);

  const filteredResidents = searchQuery.trim() === '' ? [] : residents.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.nik.includes(searchQuery)
  );

  const handleSelectResident = (r: Resident) => {
    setFormData(prev => ({
      ...prev,
      nama: r.name,
      nik: r.nik,
      tempatLahir: r.birthPlace || '',
      tanggalLahir: r.birthDate || '',
      jenisKelamin: r.gender || 'Laki-Laki',
      pekerjaan: r.job || 'Wiraswasta',
      alamat: r.address || '',
    }));
    setSearchQuery('');
  };

  const handleSave = async () => {
    if (!formData.nama || !formData.nik || !formData.luasTanah) {
      showToast('Mohon lengkapi nama pemohon, NIK, dan luas tanah.', 'error');
      return;
    }
    setLoading(true);

    const letterData = {
      nomor: formData.nomorSurat || `590/${Date.now().toString().slice(-3)}/DS-SKKT/${new Date().getFullYear()}`,
      jenis: 'Surat Keterangan Kepemilikan Tanah (SKKT)',
      nik: formData.nik,
      nama: formData.nama,
      tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      keperluan: formData.keperluan,
      status: 'Selesai' as const,
      data: formData
    };

    try {
      if (editLetterId) {
        await updateLetterHistory(editLetterId, letterData);
        showToast('Surat SKKT berhasil diperbarui!', 'success');
      } else {
        await addLetterHistory(letterData);
        showToast('Surat SKKT berhasil dibuat dan disimpan ke Arsip!', 'success');
      }
      onBack();
    } catch (e) {
      showToast('Gagal menyimpan surat SKKT', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Surat Keterangan Kepemilikan Tanah (SKKT)</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">{templateDesc}</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Menyimpan...' : 'Simpan & Cetak'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Input Side */}
        <div className="lg:col-span-6 space-y-6">
          {/* Section: Cari Penduduk */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-600" /> 1. Pemohon / Pemilik Tanah
            </h3>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Ketik NIK atau Nama Pemohon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {filteredResidents.length > 0 && (
                <div className="absolute left-0 right-0 z-20 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {filteredResidents.map(r => (
                    <button key={r.nik} onClick={() => handleSelectResident(r)} className="w-full text-left p-3 hover:bg-emerald-50 text-xs font-semibold block">
                      {r.name} ({r.nik}) - {r.address}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Nama Pemohon</label>
                <input type="text" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-800 font-semibold" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">NIK Pemohon</label>
                <input type="text" value={formData.nik} onChange={e => setFormData({ ...formData, nik: e.target.value })} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-800 font-mono" />
              </div>
            </div>
          </div>

          {/* Section: Detail Tanah & Peta */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" /> 2. Data Obyek Tanah & Koordinat
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Nomor Persil / Blok</label>
                <input type="text" placeholder="Contoh: Persil 12 / Block B" value={formData.noPersil} onChange={e => setFormData({ ...formData, noPersil: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Luas Tanah (m²)</label>
                <input type="text" placeholder="Contoh: 450 m²" value={formData.luasTanah} onChange={e => setFormData({ ...formData, luasTanah: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-semibold" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Status Perolehan</label>
                <input type="text" placeholder="Jual Beli / Waris / Hibah" value={formData.statusPerolehan} onChange={e => setFormData({ ...formData, statusPerolehan: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Lokasi Obyek Tanah</label>
                <input type="text" placeholder="Nama Jalan / RT / RW / Dusun" value={formData.lokasiTanah} onChange={e => setFormData({ ...formData, lokasiTanah: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>

            {/* Batas-Batas Tanah */}
            <div>
              <p className="font-bold text-xs text-gray-700 dark:text-slate-300 mb-2">Batas-Batas Obyek Tanah:</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px]">Batas Utara</span>
                  <input type="text" placeholder="Tanah milik Bpk. Ahmad" value={formData.batasUtara} onChange={e => setFormData({ ...formData, batasUtara: e.target.value })} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Batas Selatan</span>
                  <input type="text" placeholder="Jalan Desa / Parit" value={formData.batasSelatan} onChange={e => setFormData({ ...formData, batasSelatan: e.target.value })} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Batas Timur</span>
                  <input type="text" placeholder="Tanah milik Ibu Hj. Siti" value={formData.batasTimur} onChange={e => setFormData({ ...formData, batasTimur: e.target.value })} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Batas Barat</span>
                  <input type="text" placeholder="Sungai / Jalan Tani" value={formData.batasBarat} onChange={e => setFormData({ ...formData, batasBarat: e.target.value })} className="w-full p-2 border rounded-lg" />
                </div>
              </div>
            </div>

            {/* Geo Coordinate Picker */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-emerald-900">Georeferensi Koordinat Tanah</p>
                  <p className="text-[11px] text-emerald-700 font-mono">Lat: {formData.lat}, Lng: {formData.lng}</p>
                </div>
                <button 
                  onClick={() => setShowMapModal(true)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Map className="w-3.5 h-3.5" /> Tandai di Peta
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Side */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-md text-black font-sans text-xs space-y-4">
          <div className="text-center border-b-2 border-black pb-3">
            <h4 className="font-bold text-sm uppercase tracking-wider">{formData.namaKabupaten}</h4>
            <h4 className="font-bold text-sm uppercase tracking-wider">{formData.namaKecamatan}</h4>
            <h3 className="font-black text-xl uppercase tracking-widest text-emerald-950">DESA {formData.namaDesa}</h3>
            <p className="text-[9px] text-gray-600">{formData.alamatKantor}</p>
          </div>

          <div className="text-center my-4">
            <p className="font-bold text-sm uppercase underline tracking-wider">SURAT KETERANGAN KEPEMILIKAN TANAH</p>
            <p className="font-mono text-xs mt-0.5">Nomor: {formData.nomorSurat || '590/.../DS-SKKT/2026'}</p>
          </div>

          <p className="text-justify leading-relaxed indent-6">
            Yang bertanda tangan di bawah ini Kepala Desa {formData.namaDesa}, Kecamatan {formData.namaKecamatan}, Kabupaten {formData.namaKabupaten}, menerangkan dengan sebenarnya bahwa:
          </p>

          <table className="w-full ml-4 text-xs leading-relaxed">
            <tbody>
              <tr><td className="w-32 font-semibold">Nama Lengkap</td><td className="w-3">:</td><td className="font-bold uppercase">{formData.nama || '-'}</td></tr>
              <tr><td className="font-semibold">NIK</td><td>:</td><td className="font-mono">{formData.nik || '-'}</td></tr>
              <tr><td className="font-semibold">Pekerjaan</td><td>:</td><td>{formData.pekerjaan || '-'}</td></tr>
              <tr><td className="font-semibold">Alamat Domisili</td><td>:</td><td>{formData.alamat || '-'}</td></tr>
            </tbody>
          </table>

          <p className="text-justify leading-relaxed indent-6 mt-2">
            Adalah benar-benar pemilik sah atas sebidang tanah yang terletak di <strong>{formData.lokasiTanah || `Desa ${formData.namaDesa}`}</strong> dengan spesifikasi sebagai berikut:
          </p>

          <table className="w-full ml-4 text-xs leading-relaxed border-collapse border border-gray-300">
            <tbody>
              <tr className="border-b"><td className="p-1.5 w-36 font-semibold bg-gray-50">Nomor Persil / Blok</td><td className="p-1.5">{formData.noPersil || '-'}</td></tr>
              <tr className="border-b"><td className="p-1.5 font-semibold bg-gray-50">Luas Obyek Tanah</td><td className="p-1.5 font-bold">{formData.luasTanah || '-'}</td></tr>
              <tr className="border-b"><td className="p-1.5 font-semibold bg-gray-50">Status Perolehan</td><td className="p-1.5">{formData.statusPerolehan || '-'}</td></tr>
              <tr className="border-b"><td className="p-1.5 font-semibold bg-gray-50">Koordinat GPS</td><td className="p-1.5 font-mono">{formData.lat}, {formData.lng}</td></tr>
              <tr>
                <td className="p-1.5 font-semibold bg-gray-50 align-top">Batas-Batas Obyek</td>
                <td className="p-1.5">
                  Utara: {formData.batasUtara || '-'}<br/>
                  Selatan: {formData.batasSelatan || '-'}<br/>
                  Timur: {formData.batasTimur || '-'}<br/>
                  Barat: {formData.batasBarat || '-'}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="text-justify leading-relaxed indent-6 mt-2">
            Demikian Surat Keterangan Kepemilikan Tanah ini dibuat dengan sebenarnya agar dapat dipergunakan untuk <strong>{formData.keperluan}</strong>.
          </p>

          <div className="mt-8 flex justify-end">
            <div className="text-center w-52">
              <p>Desa {formData.namaDesa}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold mt-1">Kepala Desa {formData.namaDesa}</p>
              <div className="h-16"></div>
              <p className="font-bold underline uppercase">{formData.namaPejabat}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Picker Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Map className="w-5 h-5 text-emerald-600" /> Tandai Koordinat Obyek Tanah
              </h3>
              <button onClick={() => setShowMapModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <p className="text-xs text-gray-500">Masukkan latitude dan longitude atau klik lokasi pada peta untuk memperbarui koordinat.</p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Latitude</label>
                <input type="text" value={formData.lat} onChange={e => setFormData({ ...formData, lat: e.target.value })} className="w-full p-2 border rounded-lg font-mono" />
              </div>
              <div>
                <label className="font-bold block mb-1">Longitude</label>
                <input type="text" value={formData.lng} onChange={e => setFormData({ ...formData, lng: e.target.value })} className="w-full p-2 border rounded-lg font-mono" />
              </div>
            </div>

            <div className="w-full h-64 bg-gray-100 rounded-xl overflow-hidden border border-gray-300 relative flex items-center justify-center">
              <iframe
                title="Land Map Picker"
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(formData.lng)-0.005}%2C${parseFloat(formData.lat)-0.005}%2C${parseFloat(formData.lng)+0.005}%2C${parseFloat(formData.lat)+0.005}&layer=mapnik&marker=${formData.lat}%2C${formData.lng}`}
              ></iframe>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowMapModal(false)} className="px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-800">
                Selesai & Gunakan Koordinat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
