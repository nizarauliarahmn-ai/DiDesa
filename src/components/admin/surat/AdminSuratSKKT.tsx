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
    namaPejabat: localStorage.getItem('kop_kades') || '',
    jabatanPejabat: 'Kepala Desa',
    includeCamat: false,
    namaDesa: localStorage.getItem('kop_desa') || '',
    namaKecamatan: localStorage.getItem('kop_kecamatan') || '',
    namaKabupaten: localStorage.getItem('kop_kabupaten') || '',
    alamatKantor: localStorage.getItem('kop_alamat') || '',
    kontakKantor: localStorage.getItem('kop_kontak') || '',
  });

  const villageLogo = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
  const letterFont = localStorage.getItem('village_letter_font') || localStorage.getItem('letter_font') || 'Arial, sans-serif';

  const activeKabupaten = localStorage.getItem('kop_kabupaten') || formData.namaKabupaten || '';
  const activeKecamatan = localStorage.getItem('kop_kecamatan') || formData.namaKecamatan || '';
  const activeDesa = cleanStr(localStorage.getItem('kop_desa') || formData.namaDesa || '', /^(desa|kelurahan)\s+/i);
  const activeAlamat = localStorage.getItem('kop_alamat') || formData.alamatKantor || '';
  const activeKontak = localStorage.getItem('kop_kontak') || formData.kontakKantor || '';

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

  const v = (val, fallback = '-') => (val && val.trim() !== '' ? val : fallback);
  
  const generateHTML = () => {
    const today = new Date();
    const tglFormatted = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const printSignatureHTML = getPrintSignatureHTML(activeDesa, tglFormatted, formData.namaPejabat, formData.jabatanPejabat, undefined, formData.includeCamat);
    
    return `
      <!-- KOP SURAT -->
      <div style="border-bottom:3px solid #000;margin-bottom:12px;">
        <div style="display:flex;align-items:flex-start;padding-bottom:6px;margin-bottom:1px;font-family:${letterFont};">
          <div style="display:flex;width:100%;align-items:center;">
            <div style="width:90px;height:100px;flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-right:15px;">
              <img src="${villageLogo}" style="width:100%;height:100%;object-fit:contain;" />
            </div>
            <div style="text-align:center;flex:1;padding-right:90px;">
              <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">PEMERINTAH KABUPATEN ${activeKabupaten.toUpperCase()}</div>
              <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">KECAMATAN ${activeKecamatan.toUpperCase()}</div>
              <div style="font-weight:900;font-size:26px;text-transform:uppercase;letter-spacing:2px;line-height:1.1;margin:2px 0 3px 0;">DESA ${activeDesa.toUpperCase()}</div>
              <div style="font-size:10.5px;margin-top:4px;text-transform:capitalize;line-height:1.15;margin:2px 0 1px 0;">${activeAlamat}</div>
              <div style="font-size:10.5px;line-height:1.15;margin:1px 0 0 0;">${activeKontak}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- JUDUL SURAT -->
      <div style="text-align:center;margin-bottom:15px;">
        <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">SURAT KETERANGAN KEPEMILIKAN TANAH</h3>
        <p style="margin:2px 0 0 0;font-size:14px;">Nomor : ${v(formData.nomorSurat, '590/.../DS-SKKT/' + today.getFullYear())}</p>
      </div>

      <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">
        Yang bertanda tangan di bawah ini Kepala Desa ${activeDesa}, Kecamatan ${activeKecamatan}, Kabupaten ${activeKabupaten}, menerangkan dengan sebenarnya bahwa:
      </p>

      <!-- DATA PENDUDUK -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
        <tr><td style="width:30%;">a. Nama Lengkap</td><td style="width:3%;">:</td><td><strong>${v(formData.nama)}</strong></td></tr>
        <tr><td>b. NIK</td><td>:</td><td>${v(formData.nik)}</td></tr>
        <tr><td>c. Pekerjaan</td><td>:</td><td>${v(formData.pekerjaan)}</td></tr>
        <tr><td style="vertical-align:top;">d. Alamat Domisili</td><td style="vertical-align:top;">:</td><td>${v(formData.alamat)}</td></tr>
      </table>

      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">
        Adalah benar-benar pemilik sah atas sebidang tanah yang terletak di <strong>${v(formData.lokasiTanah, `Desa ${activeDesa}`)}</strong> dengan spesifikasi sebagai berikut:
      </p>

      <!-- DATA TANAH -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
        <tr><td style="width:35%;font-weight:bold;">Nomor Persil / Blok</td><td style="width:3%;">:</td><td>${v(formData.noPersil)}</td></tr>
        <tr><td style="font-weight:bold;">Luas Obyek Tanah</td><td>:</td><td><strong>${v(formData.luasTanah)}</strong></td></tr>
        <tr><td style="font-weight:bold;">Status Perolehan</td><td>:</td><td>${v(formData.statusPerolehan)}</td></tr>
        <tr><td style="font-weight:bold;">Koordinat GPS</td><td>:</td><td>${v(formData.lat)}, ${v(formData.lng)}</td></tr>
        <tr>
          <td style="font-weight:bold;vertical-align:top;">Batas-Batas Obyek</td>
          <td style="vertical-align:top;">:</td>
          <td>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="width:60px;">Utara</td><td style="width:10px;">:</td><td>${v(formData.batasUtara)}</td></tr>
              <tr><td>Selatan</td><td>:</td><td>${v(formData.batasSelatan)}</td></tr>
              <tr><td>Timur</td><td>:</td><td>${v(formData.batasTimur)}</td></tr>
              <tr><td>Barat</td><td>:</td><td>${v(formData.batasBarat)}</td></tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:25px;font-size:14px;">
        Demikian Surat Keterangan Kepemilikan Tanah ini dibuat dengan sebenarnya agar dapat dipergunakan untuk <strong>${v(formData.keperluan)}</strong>.
      </p>

      <!-- TANDA TANGAN -->
      ${printSignatureHTML}
    `;
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

      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const contentHtml = generateHTML();
      
      const printHTML = `
        <html>
          <head>
            <title>Cetak SKKT - ${formData.nama}</title>
            ${styles}
            <style>
              @page { size: A4; margin: 0 !important; }
              body { 
                margin: 0; 
                padding: 0; 
                background: white; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
              }
              .page { 
                width: 210mm; 
                height: 297mm; 
                margin: 0; 
                box-sizing: border-box; 
                background: white; 
                position: relative; 
                overflow: hidden;
              }
              .printable-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 210mm !important;
                height: 297mm !important;
                margin: 0 !important;
                padding: 56px 75px !important;
                box-sizing: border-box !important;
                background: white !important;
                color: black !important;
                box-shadow: none !important;
                border: none !important;
                display: block !important;
                transform: none !important;
                visibility: visible !important;
                font-family: ${letterFont};
                font-size: 13px;
                line-height: 1.5;
              }
              .printable-area * {
                visibility: visible !important;
              }
              /* Hide crop marks in print */
              .crop-mark { 
                display: none !important; 
              }
              @media print {
                body, .page { 
                  width: 210mm; 
                  height: 297mm; 
                }
              }
            </style>
          </head>
          <body>
            <div class="page">
              <div class="printable-area bg-white dark:bg-slate-900 text-black">
                ${contentHtml}
              </div>
            </div>
          </body>
        </html>
      `;

      if (iframeRef.current) {
        const doc = iframeRef.current.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(printHTML);
          doc.close();
          setTimeout(() => {
            try {
              iframeRef.current.contentWindow?.focus();
              iframeRef.current.contentWindow?.print();
            } catch (e) {
              window.print();
            }
          }, 500);
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
                <input type="text" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value.toUpperCase() })} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-800 font-semibold" />
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
                <input type="text" placeholder="Contoh: Persil 12 / Block B" value={formData.noPersil} onChange={e => setFormData({ ...formData, noPersil: e.target.value.toUpperCase() })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Luas Tanah (m²)</label>
                <input type="text" placeholder="Contoh: 450 m²" value={formData.luasTanah} onChange={e => setFormData({ ...formData, luasTanah: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-semibold" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Status Perolehan</label>
                <input type="text" placeholder="Jual Beli / Hibah / Waris" value={formData.statusPerolehan} onChange={e => setFormData({ ...formData, statusPerolehan: e.target.value.toUpperCase() })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Lokasi Obyek Tanah</label>
                <input type="text" placeholder="Nama Jalan / RT / RW / Dusun" value={formData.lokasiTanah} onChange={e => setFormData({ ...formData, lokasiTanah: e.target.value.toUpperCase() })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>

            {/* Batas-Batas Tanah */}
            <div>
              <p className="font-bold text-xs text-gray-700 dark:text-slate-300 mb-2">Batas-Batas Obyek Tanah:</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px]">Batas Utara</span>
                  <input type="text" placeholder="Tanah milik Bpk. Ahmad" value={formData.batasUtara} onChange={e => setFormData({ ...formData, batasUtara: e.target.value.toUpperCase() })} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Batas Selatan</span>
                  <input type="text" placeholder="Jalan Desa / Parit" value={formData.batasSelatan} onChange={e => setFormData({ ...formData, batasSelatan: e.target.value.toUpperCase() })} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Batas Timur</span>
                  <input type="text" placeholder="Tanah milik Ibu Hj. Siti" value={formData.batasTimur} onChange={e => setFormData({ ...formData, batasTimur: e.target.value.toUpperCase() })} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Batas Barat</span>
                  <input type="text" placeholder="Sungai / Jalan Tani" value={formData.batasBarat} onChange={e => setFormData({ ...formData, batasBarat: e.target.value.toUpperCase() })} className="w-full p-2 border rounded-lg" />
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
            ref={dragProps.ref}
            onMouseDown={dragProps.onMouseDown}
            onMouseLeave={dragProps.onMouseLeave}
            onMouseUp={dragProps.onMouseUp}
            onMouseMove={dragProps.onMouseMove}
            style={{ ...dragProps.style }}
            className="flex-1 bg-slate-200/40 overflow-auto relative flex p-8"
          >
            <div 
              style={{
                width: `${794 * previewZoom}px`,
                height: `${1123 * previewZoom}px`,
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                borderRadius: '12px',
                transition: 'width 0.2s ease-out, height 0.2s ease-out'
              }}
              className="bg-white dark:bg-slate-900 m-auto shrink-0 relative"
            >
              <div className="absolute top-6 left-6 w-4 h-4 border-t border-l border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>
              <div className="absolute top-6 right-6 w-4 h-4 border-t border-r border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>
              <div className="absolute bottom-6 left-6 w-4 h-4 border-b border-l border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>
              <div className="absolute bottom-6 right-6 w-4 h-4 border-b border-r border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>

              <div 
                className="bg-white dark:bg-slate-900 shrink-0"
                style={{ 
                  width: '794px', 
                  height: '1123px', 
                  padding: '56px 75px',
                  transform: `scale(${previewZoom})`,
                  transformOrigin: 'top left',
                  fontFamily: letterFont,
                  fontSize: '13px',
                  lineHeight: '1.45',
                  position: 'relative',
                  color: 'black',
                  boxSizing: 'border-box'
                }}
                dangerouslySetInnerHTML={{ __html: generateHTML() }}
              />
            </div>
          </div>\n        </div>\n      </div>

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
