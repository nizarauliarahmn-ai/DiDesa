import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Search, Printer, MapPin, Map as MapIcon, Layers, Compass, Navigation, ZoomIn, ZoomOut } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLetterKode } from '../../../hooks/useLetterKode';
import { useLetterDescription } from '../../../hooks/useLetterDescription';
import { fetchResidentsCached } from '../../../utils/apiCache';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { getPrintSignatureHTML, getReactSignaturePreview } from '../../../utils/signature';
import { showToast } from '../../../utils/toast';
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
}

// Sub-component for Interactive Leaflet Satellite Map Picker
function LandMapPickerModal({
  initialLat,
  initialLng,
  onSave,
  onClose
}: {
  initialLat: string;
  initialLng: string;
  onSave: (lat: string, lng: string) => void;
  onClose: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [latVal, setLatVal] = useState(initialLat || '-2.797806');
  const [lngVal, setLngVal] = useState(initialLng || '115.227889');
  const [mapType, setMapType] = useState<'satellite' | 'street'>('satellite');

  const tileUrls = {
    satellite: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', // Google Satellite Hybrid with roads & building contours
    street: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  };

  const tileAttributions = {
    satellite: '&copy; Google Maps Satellite Imagery',
    street: '&copy; OpenStreetMap &copy; CARTO'
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const parseLat = parseFloat(latVal) || -2.797806;
    const parseLng = parseFloat(lngVal) || 115.227889;

    // Initialize Map if not already initialized
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [parseLat, parseLng],
        zoom: 17,
        zoomControl: true,
      });

      const tileLayer = L.tileLayer(tileUrls[mapType], {
        maxZoom: 20,
        attribution: tileAttributions[mapType]
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Custom Red Pin Icon
      const customIcon = L.divIcon({
        className: 'custom-land-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex h-10 w-10 rounded-full bg-red-500 opacity-60 animate-ping"></span>
            <div class="w-9 h-9 rounded-full bg-red-600 border-2 border-white shadow-2xl flex items-center justify-center text-white font-bold text-xs">
              📍
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([parseLat, parseLng], {
        draggable: true,
        icon: customIcon
      }).addTo(map);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setLatVal(position.lat.toFixed(6));
        setLngVal(position.lng.toFixed(6));
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setLatVal(lat.toFixed(6));
        setLngVal(lng.toFixed(6));
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  // Update tile layer when mapType changes
  useEffect(() => {
    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const newTileLayer = L.tileLayer(tileUrls[mapType], {
        maxZoom: 20,
        attribution: tileAttributions[mapType]
      }).addTo(mapInstanceRef.current);
      tileLayerRef.current = newTileLayer;
    }
  }, [mapType]);

  // Sync inputs with map center & marker
  const handleCoordInputChange = (newLat: string, newLng: string) => {
    setLatVal(newLat);
    setLngVal(newLng);
    const pLat = parseFloat(newLat);
    const pLng = parseFloat(newLng);
    if (!isNaN(pLat) && !isNaN(pLng) && mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([pLat, pLng], mapInstanceRef.current.getZoom());
      markerRef.current.setLatLng([pLat, pLng]);
    }
  };

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          handleCoordInputChange(lat, lng);
          showToast('Koordinat lokasi GPS saat ini berhasil diambil!', 'success');
        },
        (err) => {
          showToast('Gagal mengakses GPS perangkat: ' + err.message, 'error');
        }
      );
    } else {
      showToast('Browser Anda tidak mendukung lokasi GPS', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-emerald-600" /> Penanda Koordinat & Foto Satelit Obyek Tanah
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Klik lokasi tanah di peta atau geser pin merah untuk mendapatkan tampilan atap rumah & pepohonan secara presisi.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 font-bold rounded-lg text-lg">✕</button>
        </div>

        {/* Toolbar Controls */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setMapType('satellite')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                mapType === 'satellite'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> 🛰️ Satelit & Foto Udara
            </button>
            <button
              onClick={() => setMapType('street')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                mapType === 'street'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" /> 🗺️ Peta Jalan
            </button>
          </div>

          <button
            onClick={handleGetCurrentLocation}
            className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all flex items-center gap-1.5"
          >
            <Navigation className="w-3.5 h-3.5" /> 🎯 Ambil GPS HP / Perangkat
          </button>
        </div>

        {/* Live Map Area */}
        <div className="relative w-full h-[400px] bg-slate-200">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
          
          <div className="absolute top-3 right-3 bg-black/75 text-white backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-mono shadow-lg z-[10] border border-white/20">
            📍 Lat: {latVal} | Lng: {lngVal}
          </div>
        </div>

        {/* Lat Lng Inputs & Action */}
        <div className="p-5 bg-gray-50/50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="grid grid-cols-2 gap-3 text-xs w-full sm:w-auto">
            <div>
              <span className="font-bold text-gray-500 block mb-1">Latitude</span>
              <input
                type="text"
                value={latVal}
                onChange={e => handleCoordInputChange(e.target.value, lngVal)}
                className="w-full sm:w-36 p-2 border border-gray-200 dark:border-slate-700 rounded-xl font-mono text-xs bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <span className="font-bold text-gray-500 block mb-1">Longitude</span>
              <input
                type="text"
                value={lngVal}
                onChange={e => handleCoordInputChange(latVal, e.target.value)}
                className="w-full sm:w-36 p-2 border border-gray-200 dark:border-slate-700 rounded-xl font-mono text-xs bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={() => {
                onSave(latVal, lngVal);
                onClose();
              }}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <MapPin className="w-4 h-4" /> Gunakan Koordinat Ini
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [previewZoom, setPreviewZoom] = useState(0.45);
  const dragProps = useDragScroll();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const cleanStr = (s: string, regex: RegExp) => (s || "").replace(regex, "");

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
    namaDesa: localStorage.getItem('kop_desa') || 'Wasah Hilir',
    namaKecamatan: localStorage.getItem('kop_kecamatan') || 'Simpur',
    namaKabupaten: localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan',
    alamatKantor: localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RW.001 Kodepos 71261',
    kontakKantor: localStorage.getItem('kop_kontak') || '081346867519 | pemdessukamakmur@gmail.com',
  });

  const villageLogo = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
  const letterFont = localStorage.getItem('village_letter_font') || localStorage.getItem('letter_font') || 'Arial, sans-serif';

  const activeKabupaten = localStorage.getItem('kop_kabupaten') || formData.namaKabupaten || 'Hulu Sungai Selatan';
  const activeKecamatan = localStorage.getItem('kop_kecamatan') || formData.namaKecamatan || 'Simpur';
  const activeDesa = cleanStr(localStorage.getItem('kop_desa') || formData.namaDesa || 'Wasah Hilir', /^(desa|kelurahan)\s+/i);
  const activeAlamat = localStorage.getItem('kop_alamat') || formData.alamatKantor || 'Jalan Keramat RT.002 RW.001 Kodepos 71261';
  const activeKontak = localStorage.getItem('kop_kontak') || formData.kontakKantor || '0813 4686 7519, pemdesawasahhilir@gmail.com';

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

      // Print via isolated iframe
      const today = new Date();
      const tglFormatted = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const printSignatureHTML = getPrintSignatureHTML(activeDesa, tglFormatted, formData.namaPejabat, formData.jabatanPejabat, undefined, formData.includeCamat);

      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cetak Surat SKKT</title>
          <style>
            @page { size: A4; margin: 0 !important; }
            body { margin: 0; padding: 48px; font-family: ${letterFont}; font-size: 13px; line-height: 1.5; color: black; background: white; }
            .printable-area { width: 100%; box-sizing: border-box; }
            .kop { border-bottom: 3px double #000; margin-bottom: 15px; padding-bottom: 8px; }
            .kop-container { display: flex; items-align: center; }
            .logo { width: 85px; height: 95px; object-fit: contain; margin-right: 15px; }
            .kop-text { text-align: center; flex: 1; margin-right: 85px; }
            .title { text-align: center; margin: 15px 0; }
            .title h3 { text-decoration: underline; margin: 0; font-size: 16px; font-weight: bold; }
            .table-data { width: 100%; margin-left: 20px; border-collapse: collapse; margin-bottom: 12px; }
            .table-spec { width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #333; }
            .table-spec td { padding: 6px; border: 1px solid #333; }
          </style>
        </head>
        <body>
          <div class="printable-area">
            <div class="kop">
              <div class="kop-container">
                <img src="${villageLogo}" class="logo" />
                <div class="kop-text">
                  <div style="font-weight:bold;font-size:14px;text-transform:uppercase;line-height:1.2;">PEMERINTAH KABUPATEN ${activeKabupaten.toUpperCase()}</div>
                  <div style="font-weight:bold;font-size:14px;text-transform:uppercase;line-height:1.2;">KECAMATAN ${activeKecamatan.toUpperCase()}</div>
                  <div style="font-weight:900;font-size:24px;text-transform:uppercase;line-height:1.1;margin:3px 0;">DESA ${activeDesa.toUpperCase()}</div>
                  <div style="font-size:10.5px;line-height:1.2;">${activeAlamat}</div>
                  <div style="font-size:10.5px;line-height:1.2;">${activeKontak}</div>
                </div>
              </div>
            </div>

            <div class="title">
              <h3>SURAT KETERANGAN KEPEMILIKAN TANAH</h3>
              <p style="margin:2px 0;font-size:13px;font-family:monospace;">Nomor: ${formData.nomorSurat || '590/.../DS-SKKT/' + today.getFullYear()}</p>
            </div>

            <p style="text-align:justify;">Yang bertanda tangan di bawah ini Kepala Desa ${activeDesa}, Kecamatan ${activeKecamatan}, Kabupaten ${activeKabupaten}, menerangkan dengan sebenarnya bahwa:</p>

            <table class="table-data">
              <tr><td style="width:30%;">Nama Lengkap</td><td style="width:3%;">:</td><td><strong>${(formData.nama || '-').toUpperCase()}</strong></td></tr>
              <tr><td>NIK</td><td>:</td><td style="font-family:monospace;">${formData.nik || '-'}</td></tr>
              <tr><td>Pekerjaan</td><td>:</td><td>${formData.pekerjaan || '-'}</td></tr>
              <tr><td>Alamat Domisili</td><td>:</td><td>${formData.alamat || '-'}</td></tr>
            </table>

            <p style="text-align:justify;">Adalah benar-benar pemilik sah atas sebidang tanah yang terletak di <strong>${formData.lokasiTanah || `Desa ${activeDesa}`}</strong> dengan spesifikasi sebagai berikut:</p>

            <table class="table-spec">
              <tr><td style="width:35%;font-weight:bold;background:#f9f9f9;">Nomor Persil / Blok</td><td>${formData.noPersil || '-'}</td></tr>
              <tr><td style="font-weight:bold;background:#f9f9f9;">Luas Obyek Tanah</td><td><strong>${formData.luasTanah || '-'}</strong></td></tr>
              <tr><td style="font-weight:bold;background:#f9f9f9;">Status Perolehan</td><td>${formData.statusPerolehan || '-'}</td></tr>
              <tr><td style="font-weight:bold;background:#f9f9f9;">Koordinat GPS</td><td style="font-family:monospace;">${formData.lat}, ${formData.lng}</td></tr>
              <tr>
                <td style="font-weight:bold;background:#f9f9f9;vertical-align:top;">Batas-Batas Obyek</td>
                <td>
                  Utara: ${formData.batasUtara || '-'}<br/>
                  Selatan: ${formData.batasSelatan || '-'}<br/>
                  Timur: {formData.batasTimur || '-'}<br/>
                  Barat: ${formData.batasBarat || '-'}
                </td>
              </tr>
            </table>

            <p style="text-align:justify;">Demikian Surat Keterangan Kepemilikan Tanah ini dibuat dengan sebenarnya agar dapat dipergunakan untuk <strong>${formData.keperluan}</strong>.</p>

            <div style="margin-top:40px;">
              ${printSignatureHTML}
            </div>
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 400); };
          </script>
        </body>
        </html>
      `;

      if (iframeRef.current) {
        const doc = iframeRef.current.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(printHTML);
          doc.close();
        }
      }

      onBack();
    } catch (e) {
      showToast('Gagal menyimpan surat SKKT', 'error');
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const reactSig = getReactSignaturePreview(activeDesa, todayStr, formData.namaPejabat, formData.jabatanPejabat, undefined, formData.includeCamat);

  return (
    <div className="space-y-6">
      <iframe ref={iframeRef} className="hidden" title="Print Frame SKKT" />

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
                <input type="text" placeholder="Jual Beli / Hibah / Waris" value={formData.statusPerolehan} onChange={e => setFormData({ ...formData, statusPerolehan: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
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
            <div className="p-4 bg-emerald-50/50 dark:bg-slate-800/50 rounded-xl border border-emerald-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-emerald-900 dark:text-emerald-300">Georeferensi Koordinat Tanah</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">Lat: {formData.lat}, Lng: {formData.lng}</p>
                </div>
                <button 
                  onClick={() => setShowMapModal(true)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <MapIcon className="w-3.5 h-3.5" /> Tandai di Peta Satelit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Side */}
        <div className="lg:col-span-6 bg-gray-100 dark:bg-slate-800/50 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pratinjau Lembar Surat (A4)</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPreviewZoom(z => Math.max(0.3, z - 0.05))} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs font-mono font-bold text-gray-600">{Math.round(previewZoom * 100)}%</span>
              <button onClick={() => setPreviewZoom(z => Math.min(1.0, z + 0.05))} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><ZoomIn className="w-4 h-4" /></button>
            </div>
          </div>

          <div 
            {...dragProps}
            className="w-full bg-white text-black p-10 shadow-xl rounded-lg font-serif border border-gray-300 overflow-x-auto select-none"
            style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top left', width: `${100 / previewZoom}%` }}
          >
            {/* KOP SURAT RESMI */}
            <div className="border-b-4 border-double border-black pb-3 mb-6 font-serif">
              <div className="flex items-center gap-4">
                <div className="w-20 h-24 flex-none flex items-center justify-center overflow-hidden">
                  <img src={villageLogo} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div className="text-center flex-1 pr-20">
                  <h4 className="font-bold text-xs uppercase tracking-wider leading-tight">PEMERINTAH KABUPATEN {activeKabupaten.toUpperCase()}</h4>
                  <h4 className="font-bold text-xs uppercase tracking-wider leading-tight">KECAMATAN {activeKecamatan.toUpperCase()}</h4>
                  <h3 className="font-black text-xl uppercase tracking-widest leading-tight my-0.5">DESA {activeDesa.toUpperCase()}</h3>
                  <p className="text-[10px] leading-tight mt-1 capitalize text-gray-700">{activeAlamat}</p>
                  <p className="text-[9.5px] leading-tight text-gray-700">{activeKontak}</p>
                </div>
              </div>
            </div>

            {/* JUDUL SURAT */}
            <div className="text-center my-5">
              <p className="font-bold text-sm uppercase underline tracking-wider">SURAT KETERANGAN KEPEMILIKAN TANAH</p>
              <p className="font-mono text-xs mt-0.5">Nomor: {formData.nomorSurat || `590/.../DS-SKKT/${new Date().getFullYear()}`}</p>
            </div>

            {/* REDAKSI */}
            <p className="text-justify text-xs leading-relaxed indent-8 mb-3">
              Yang bertanda tangan di bawah ini Kepala Desa {activeDesa}, Kecamatan {activeKecamatan}, Kabupaten {activeKabupaten}, menerangkan dengan sebenarnya bahwa:
            </p>

            <table className="w-full ml-6 text-xs leading-relaxed mb-3">
              <tbody>
                <tr><td className="w-36 font-semibold">a. Nama Lengkap</td><td className="w-3">:</td><td className="font-bold uppercase">{formData.nama || '-'}</td></tr>
                <tr><td className="font-semibold">b. NIK</td><td>:</td><td className="font-mono">{formData.nik || '-'}</td></tr>
                <tr><td className="font-semibold">c. Pekerjaan</td><td>:</td><td>{formData.pekerjaan || '-'}</td></tr>
                <tr><td className="font-semibold">d. Alamat Domisili</td><td>:</td><td>{formData.alamat || '-'}</td></tr>
              </tbody>
            </table>

            <p className="text-justify text-xs leading-relaxed indent-8 mb-3">
              Adalah benar-benar pemilik sah atas sebidang tanah yang terletak di <strong>{formData.lokasiTanah || `Desa ${activeDesa}`}</strong> dengan spesifikasi sebagai berikut:
            </p>

            <table className="w-full ml-6 text-xs leading-relaxed border-collapse border border-black mb-4">
              <tbody>
                <tr className="border-b border-black"><td className="p-2 w-40 font-bold bg-gray-50">Nomor Persil / Blok</td><td className="p-2">{formData.noPersil || '-'}</td></tr>
                <tr className="border-b border-black"><td className="p-2 font-bold bg-gray-50">Luas Obyek Tanah</td><td className="p-2 font-bold">{formData.luasTanah || '-'}</td></tr>
                <tr className="border-b border-black"><td className="p-2 font-bold bg-gray-50">Status Perolehan</td><td className="p-2">{formData.statusPerolehan || '-'}</td></tr>
                <tr className="border-b border-black"><td className="p-2 font-bold bg-gray-50">Koordinat GPS</td><td className="p-2 font-mono">{formData.lat}, {formData.lng}</td></tr>
                <tr>
                  <td className="p-2 font-bold bg-gray-50 align-top">Batas-Batas Obyek</td>
                  <td className="p-2">
                    Utara: {formData.batasUtara || '-'}<br/>
                    Selatan: {formData.batasSelatan || '-'}<br/>
                    Timur: {formData.batasTimur || '-'}<br/>
                    Barat: {formData.batasBarat || '-'}
                  </td>
                </tr>
              </tbody>
            </table>

            <p className="text-justify text-xs leading-relaxed indent-8 mb-4">
              Demikian Surat Keterangan Kepemilikan Tanah ini dibuat dengan sebenarnya agar dapat dipergunakan untuk <strong>{formData.keperluan}</strong>.
            </p>

            {/* TANDA TANGAN */}
            <div className="mt-8 flex justify-end">
              <div className="text-center w-56 font-serif">
                <p className="text-xs">Desa {activeDesa}, {todayStr}</p>
                <p className="font-bold text-xs mt-1 uppercase">Kepala Desa {activeDesa}</p>
                <div className="h-16"></div>
                <p className="font-bold text-xs underline uppercase">{formData.namaPejabat}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Satellite Map Picker Modal */}
      {showMapModal && (
        <LandMapPickerModal
          initialLat={formData.lat}
          initialLng={formData.lng}
          onSave={(newLat, newLng) => {
            setFormData(prev => ({ ...prev, lat: newLat, lng: newLng }));
            showToast(`Koordinat diperbarui: ${newLat}, ${newLng}`, 'success');
          }}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
}
