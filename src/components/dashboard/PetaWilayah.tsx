import React, { useState } from 'react';
import { Map, Pin, Navigation, RefreshCw, ZoomIn, Info, Activity, Landmark, Heart, Users } from 'lucide-react';
import { showToast } from '../../utils/toast';

interface PointOfInterest {
  id: string;
  name: string;
  category: 'kantor' | 'infrastruktur' | 'kesehatan' | 'ibadah' | 'pertanian';
  coordinates: string;
  address: string;
  officer: string;
  desc: string;
  image: string;
  // Position on the mock interactive map (percentages)
  x: number; 
  y: number;
}

function decimalToDMS(lat: number, lng: number): string {
  const latDirection = lat >= 0 ? 'N' : 'S';
  const lngDirection = lng >= 0 ? 'E' : 'W';
  
  const absLat = Math.abs(lat);
  const absLng = Math.abs(lng);
  
  const latDegrees = Math.floor(absLat);
  const latMinutes = Math.floor((absLat - latDegrees) * 60);
  const latSeconds = ((absLat - latDegrees - (latMinutes / 60)) * 3600).toFixed(1);
  
  const lngDegrees = Math.floor(absLng);
  const lngMinutes = Math.floor((absLng - lngDegrees) * 60);
  const lngSeconds = ((absLng - lngDegrees - (lngMinutes / 60)) * 3600).toFixed(1);
  
  return `${latDegrees}°${latMinutes}'${latSeconds}"${latDirection} ${lngDegrees}°${lngMinutes}'${lngSeconds}"${lngDirection}`;
}

export default function PetaWilayah() {
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);

  const villageName = localStorage.getItem('kop_desa') || localStorage.getItem('village_name') || 'Desa Wasah Hilir';
  const kadesName = localStorage.getItem('kop_kades') || 'Fazakkir Rahmad';
  const villageAlamat = localStorage.getItem('kop_alamat') || localStorage.getItem('village_alamat') || 'Jalan Keramat RT 02 RW 01, Simpur';
  
  const villageLat = parseFloat(localStorage.getItem('village_lat') || '-2.797806');
  const villageLng = parseFloat(localStorage.getItem('village_lng') || '115.227889');

  const borderUtara = localStorage.getItem('village_border_utara') || 'Berbatasan langsung dengan Desa Wasah Hulu, Kecamatan Simpur.';
  const borderSelatan = localStorage.getItem('village_border_selatan') || 'Berbatasan langsung dengan Desa Garunggangan, Kecamatan Kandangan.';
  const borderTimur = localStorage.getItem('village_border_timur') || 'Berbatasan dengan Area Persawahan Produktif Desa Amparaya.';
  const borderBarat = localStorage.getItem('village_border_barat') || 'Berbatasan dengan Sungai Mati / Batas Alam Kali Simpur.';

  // Create local relative POIs based on the configured center point
  const pois: PointOfInterest[] = [
    {
      id: 'poi-1',
      name: `Kantor Balai ${villageName}`,
      category: 'kantor',
      coordinates: decimalToDMS(villageLat, villageLng),
      address: villageAlamat,
      officer: `${kadesName} (Kepala Desa)`,
      desc: `Pusat pelayanan administrasi kependudukan, musyawarah warga, dan seluruh urusan tata pamong ${villageName}.`,
      image: 'https://images.unsplash.com/photo-1577086664693-894d8405334a?auto=format&fit=crop&q=80&w=600',
      x: 35,
      y: 45
    },
    {
      id: 'poi-2',
      name: 'Jembatan Usaha Tani RW 03',
      category: 'infrastruktur',
      coordinates: decimalToDMS(villageLat - 0.003694, villageLng - 0.004889),
      address: 'Kawasan Pertanian Handil Galam, RT 06',
      officer: 'Gapoktan Wasah Hilir',
      desc: 'Infrastruktur penghubung jalan usaha tani yang memudahkan sirkulasi panen padi dan pupuk menuju sawah warga.',
      image: 'https://images.unsplash.com/photo-1541888081156-fce1fa5427d6?auto=format&fit=crop&q=80&w=600',
      x: 18,
      y: 72
    },
    {
      id: 'poi-3',
      name: 'Pos Kesehatan Desa (Poskesdes)',
      category: 'kesehatan',
      coordinates: decimalToDMS(villageLat + 0.001000, villageLng - 0.000444),
      address: 'Jalan Kenanga RT 03 RW 01',
      officer: 'Siti Aminah, Amd.Keb (Bidan Desa)',
      desc: 'Pelayanan kesehatan tingkat pertama, posyandu balita & lansia, imunisasi, KB, serta konsultasi gizi sehat.',
      image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600',
      x: 62,
      y: 28
    },
    {
      id: 'poi-4',
      name: 'Masjid Jami Al-Ittihad',
      category: 'ibadah',
      coordinates: decimalToDMS(villageLat - 0.000806, villageLng + 0.001722),
      address: 'Jalan Keramat RT 01 RW 01',
      officer: 'H. Abdul Kadir (Ketua Pengurus)',
      desc: 'Masjid jami utama desa untuk ibadah sholat berjamaah, pengajian berkala, serta pusat bimbingan keagamaan warga.',
      image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=600',
      x: 50,
      y: 60
    },
    {
      id: 'poi-5',
      name: 'Kawasan Lumbung Pertanian Organik',
      category: 'pertanian',
      coordinates: decimalToDMS(villageLat - 0.005389, villageLng + 0.004917),
      address: 'Wilayah Sawah Garapan Selatan',
      officer: 'Mulyadi (Koordinator Kelompok Tani)',
      desc: 'Sentra persawahan organik percontohan dengan sistem irigasi berkelanjutan yang didukung penuh oleh program bantuan desa.',
      image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600',
      x: 75,
      y: 80
    }
  ];

  const handleMarkerClick = (poi: PointOfInterest) => {
    setSelectedPoi(poi);
    showToast(`Membuka info: ${poi.name}`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Geospasial & Peta Wilayah</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Gali potensi geospasial desa, tata ruang lahan, dan lokasi fasilitas publik secara interaktif.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Interactive Map Block */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none p-4 space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-700 animate-pulse" /> PETA INTERAKTIF DIGITAL
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Sistem Koordinat WGS84
              </span>
            </div>

            {/* Virtual Map Stage */}
            <div className="h-96 w-full rounded-2xl relative overflow-hidden bg-emerald-50 border border-emerald-100/50 shadow-inner group">
              {/* Styled Abstract Map Background */}
              <div className="absolute inset-0 z-0">
                {/* River abstract visual overlay */}
                <div className="absolute top-[20%] left-0 w-full h-8 bg-blue-400/30 -rotate-12 blur-[1px]" />
                <div className="absolute top-0 left-[40%] w-6 h-full bg-blue-400/20 rotate-45 blur-[1px]" />
                
                {/* Green/Agriculture zones */}
                <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[35%] bg-emerald-100/60 rounded-full blur-2xl" />
                <div className="absolute top-[10%] left-[5%] w-[40%] h-[30%] bg-emerald-100/40 rounded-full blur-2xl" />
                
                {/* Grid markings */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#0d631b_1px,transparent_1px),linear-gradient(to_bottom,#0d631b_1px,transparent_1px)] bg-[size:40px_40px]" />
                
                {/* Boundary line */}
                <div className="absolute inset-8 border-2 border-dashed border-emerald-800/20 rounded-3xl" />
              </div>

              {/* Dynamic POI Pins */}
              {pois.map((poi) => {
                const isSelected = selectedPoi?.id === poi.id;
                return (
                  <button
                    key={poi.id}
                    onClick={() => handleMarkerClick(poi)}
                    style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 p-2 focus:outline-none transition-all duration-300"
                    title={poi.name}
                  >
                    <div className="relative group/pin">
                      {/* Ripple pulse wave for unselected pins */}
                      {!isSelected && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping -inset-1"></span>
                      )}
                      
                      {/* Circle Pin Frame */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg dark:shadow-none border-2 transition-all duration-200 ${
                        isSelected 
                          ? 'bg-amber-500 border-white text-white scale-125 z-20' 
                          : 'bg-white dark:bg-slate-900 border-emerald-700 text-emerald-800 hover:bg-emerald-50 hover:scale-110'
                      }`}>
                        {poi.category === 'kantor' && <Landmark className="w-4 h-4" />}
                        {poi.category === 'infrastruktur' && <Navigation className="w-4 h-4" />}
                        {poi.category === 'kesehatan' && <Heart className="w-4 h-4" />}
                        {poi.category === 'ibadah' && <Info className="w-4 h-4" />}
                        {poi.category === 'pertanian' && <Users className="w-4 h-4" />}
                      </div>

                      {/* Floating tag on hover */}
                      <span className="absolute top-10 left-1/2 -translate-x-1/2 bg-gray-900/95 text-[10px] font-bold text-white px-2 py-1 rounded-lg shadow-md dark:shadow-none whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
                        {poi.name.split(' ').slice(-2).join(' ')}
                      </span>
                    </div>
                  </button>
                );
              })}

              <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md dark:shadow-none text-[10px] space-y-1 z-10 font-bold">
                <p className="text-gray-400 uppercase tracking-widest text-[8px] mb-1.5">LEGENDA PETA</p>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-900 border-2 border-emerald-700" /> <span>Fasilitas Publik / Administrasi</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> <span>Titik Terpilih</span></div>
              </div>
            </div>
          </div>

          {/* POI Info Card */}
          {selectedPoi ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden flex flex-col md:flex-row animate-in slide-in-from-bottom-6 duration-200">
              <div className="w-full md:w-56 h-48 md:h-auto bg-cover bg-center shrink-0">
                <img src={selectedPoi.image} alt={selectedPoi.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-6 flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    {selectedPoi.category}
                  </span>
                  <span className="text-xs text-gray-400 font-bold flex items-center gap-1">
                    <Pin className="w-3.5 h-3.5" /> {selectedPoi.coordinates}
                  </span>
                </div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">{selectedPoi.name}</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed font-semibold">Alamat: {selectedPoi.address}</p>
                <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed text-justify">{selectedPoi.desc}</p>
                <div className="border-t border-gray-50 pt-3 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-bold">Pengelola / PJ: <span className="text-gray-700 dark:text-slate-300">{selectedPoi.officer}</span></span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedPoi.coordinates);
                      showToast('Koordinat GPS disalin ke papan klip!', 'success');
                    }}
                    className="text-xs text-emerald-800 hover:underline font-bold"
                  >
                    Salin Koordinat GPS
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50/50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 p-8 text-center text-gray-400 text-xs font-semibold">
              Silakan klik salah satu pin penanda di peta untuk melihat rincian informasi wilayah.
            </div>
          )}
        </div>

        {/* Right Sidebar stats */}
        <div className="space-y-6">
          {/* Geografis Stats */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-5">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-50 pb-3">Profil Geografis Desa</h4>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Luas Pemukiman</span>
                <span className="font-bold text-gray-800 dark:text-slate-100">1.2 km² (28.5%)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Luas Sawah Irigasi</span>
                <span className="font-bold text-gray-800 dark:text-slate-100">2.5 km² (59.5%)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Luas Perkebunan</span>
                <span className="font-bold text-gray-800 dark:text-slate-100">0.5 km² (12.0%)</span>
              </div>
              <div className="h-px bg-gray-50 dark:bg-slate-800" />
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Suhu Rata-rata</span>
                <span className="font-bold text-gray-800 dark:text-slate-100">26°C - 32°C</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Curah Hujan Tahunan</span>
                <span className="font-bold text-gray-800 dark:text-slate-100">2.200 mm/tahun</span>
              </div>
            </div>
          </div>

          {/* Batas Batas Wilayah */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-50 pb-3">Batas Wilayah Administratif</h4>
            <div className="space-y-3 text-xs font-semibold text-gray-700 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-16 text-gray-400 uppercase tracking-widest text-[9px] font-extrabold mt-0.5">UTARA</span>
                <p className="flex-1 text-gray-800 dark:text-slate-100 leading-snug">{borderUtara}</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-16 text-gray-400 uppercase tracking-widest text-[9px] font-extrabold mt-0.5">SELATAN</span>
                <p className="flex-1 text-gray-800 dark:text-slate-100 leading-snug">{borderSelatan}</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-16 text-gray-400 uppercase tracking-widest text-[9px] font-extrabold mt-0.5">TIMUR</span>
                <p className="flex-1 text-gray-800 dark:text-slate-100 leading-snug">{borderTimur}</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-16 text-gray-400 uppercase tracking-widest text-[9px] font-extrabold mt-0.5">BARAT</span>
                <p className="flex-1 text-gray-800 dark:text-slate-100 leading-snug">{borderBarat}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
