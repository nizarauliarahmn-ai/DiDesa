import React, { useState, useEffect, useRef } from 'react';
import { 
  Map, 
  Pin, 
  Navigation, 
  RefreshCw, 
  ZoomIn, 
  Info, 
  Activity, 
  Landmark, 
  Heart, 
  Users, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  MapPin, 
  Layers, 
  X, 
  Save, 
  Gift, 
  AlertCircle
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

interface CustomMapPin {
  id: string;
  name: string;
  category: 'bansos' | 'lansia' | 'kantor' | 'infrastruktur' | 'kesehatan' | 'ibadah' | 'pertanian';
  lat: number;
  lng: number;
  address: string;
  nik?: string;
  aidProgram?: string;
  officer?: string;
  desc?: string;
  isDtsen?: boolean;
}

const svgIcons = {
  bansos: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
  lansia: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  kantor: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
  infrastruktur: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
  kesehatan: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  ibadah: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  pertanian: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 1 0 7.75"/></svg>`
};

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
  const [selectedPoi, setSelectedPoi] = useState<CustomMapPin | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('semua');
  const [isAddingPinMode, setIsAddingPinMode] = useState<boolean>(false);
  const [pendingClickCoords, setPendingClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [residentsList, setResidentsList] = useState<any[]>([]);

  // Configured Village Coordinates
  const [villageName, setVillageName] = useState(() => localStorage.getItem('kop_desa') || localStorage.getItem('village_name') || 'Desa Sukamakmur');
  const [kadesName, setKadesName] = useState(() => localStorage.getItem('kop_kades') || 'Kepala Desa');
  const [villageAlamat, setVillageAlamat] = useState(() => localStorage.getItem('kop_alamat') || localStorage.getItem('village_alamat') || 'Jalan Keramat RT 02 RW 01, Simpur');
  const [villageLat, setVillageLat] = useState(() => parseFloat(localStorage.getItem('village_lat') || '-2.797806'));
  const [villageLng, setVillageLng] = useState(() => parseFloat(localStorage.getItem('village_lng') || '115.227889'));

  // Pin Form State
  const [pinForm, setPinForm] = useState<{
    name: string;
    category: 'bansos' | 'lansia' | 'kantor' | 'infrastruktur' | 'kesehatan' | 'ibadah' | 'pertanian';
    nik: string;
    address: string;
    aidProgram: string;
    desc: string;
  }>({
    name: '',
    category: 'bansos',
    nik: '',
    address: 'RT 04 / RW 02, Wasah Hilir',
    aidProgram: 'BLT Dana Desa (2026)',
    desc: 'Penerima Bantuan Sosial Terdaftar DTSEN'
  });

  // Custom Pin Markers Storage
  const [pinsList, setPinsList] = useState<CustomMapPin[]>([]);

  // Load Pins & Residents Data from Supabase
  const loadMapData = async () => {
    try {
      const tid = await resolveCurrentTenant();

      // Fetch Residents for Dropdown
      const { data: resData } = await supabase
        .from('residents')
        .select('*')
        .order('name');
      if (resData) setResidentsList(resData);

      // Fetch Custom Pins from Cloud
      if (tid) {
        const { data: pinsData } = await supabase
          .from('saas_settings')
          .select('value')
          .eq('tenant_id', tid)
          .eq('key', 'map_custom_pins')
          .single();

        if (pinsData && pinsData.value) {
          setPinsList(JSON.parse(pinsData.value));
          return;
        }
      }

      // Default Initial Pins if empty
      const defaultPins: CustomMapPin[] = [
        {
          id: 'poi-balai',
          name: `Kantor Balai ${villageName}`,
          category: 'kantor',
          lat: villageLat,
          lng: villageLng,
          address: villageAlamat,
          officer: `${kadesName} (Kepala Desa)`,
          desc: `Pusat pelayanan administrasi kependudukan dan tata pamong ${villageName}.`
        },
        {
          id: 'pin-bansos-1',
          name: 'Hj. Syarifah (Penerima BLT)',
          category: 'bansos',
          lat: villageLat + 0.0012,
          lng: villageLng + 0.0018,
          address: 'Wasah Hilir / RT 04 / RW 02',
          nik: '6306034509650001',
          aidProgram: 'BLT Dana Desa (2026)',
          isDtsen: true,
          desc: 'Warga Penerima Bansos Resmi TA 2026 - Terdaftar DTSEN'
        },
        {
          id: 'pin-lansia-1',
          name: 'Kamsiah (Lansia Tunggal 74 Th)',
          category: 'lansia',
          lat: villageLat - 0.0015,
          lng: villageLng - 0.0021,
          address: 'Wasah Hilir / RT 02 / RW 01',
          nik: '6306035208500003',
          aidProgram: 'Program SembaKo Lansia',
          isDtsen: true,
          desc: 'Lansia Tunggal (Hidup Sendiri) - Prioritas Bantuan Utama'
        }
      ];
      setPinsList(defaultPins);
    } catch (err) {
      // Fallback
    }
  };

  useEffect(() => {
    loadMapData();
  }, [villageLat, villageLng]);

  // Save Pins to Supabase Cloud
  const savePinsToSupabase = async (updatedPins: CustomMapPin[]) => {
    setPinsList(updatedPins);
    try {
      const tid = await resolveCurrentTenant();
      if (tid) {
        await supabase
          .from('saas_settings')
          .upsert({
            tenant_id: tid,
            key: 'map_custom_pins',
            value: JSON.stringify(updatedPins),
            updated_at: new Date().toISOString()
          }, { onConflict: 'tenant_id,key' });
      }
      showToast('Titik peta berhasil diperbarui & disimpan!', 'success');
    } catch (e) {
      showToast('Gagal menyimpan titik peta ke cloud', 'error');
    }
  };

  // Add New Pin Action
  const handleCreatePin = () => {
    if (!pendingClickCoords) return;
    if (!pinForm.name.trim()) {
      showToast('Mohon isi nama penanda / nama penerima bantuan.', 'error');
      return;
    }

    const newPin: CustomMapPin = {
      id: `pin-${Date.now()}`,
      name: pinForm.name,
      category: pinForm.category,
      lat: pendingClickCoords.lat,
      lng: pendingClickCoords.lng,
      address: pinForm.address,
      nik: pinForm.nik || undefined,
      aidProgram: pinForm.aidProgram,
      desc: pinForm.desc,
      isDtsen: true
    };

    const updated = [newPin, ...pinsList];
    savePinsToSupabase(updated);
    setSelectedPoi(newPin);
    setPendingClickCoords(null);
    setIsAddingPinMode(false);
  };

  // Delete Pin Action
  const handleDeletePin = (id: string) => {
    const updated = pinsList.filter(p => p.id !== id);
    savePinsToSupabase(updated);
    setSelectedPoi(null);
  };

  // Leaflet Map Initialization
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [villageLat, villageLng],
        zoom: 15,
        zoomControl: false,
        dragging: true,
        scrollWheelZoom: true,
      });

      // Google Satellite Hybrid Tile Layer (Exact Google Maps Look)
      L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '&copy; Google Maps Satellite'
      }).addTo(map);

      // Add Zoom Control
      L.control.zoom({ position: 'topright' }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      // Handle Map Click to Pin Location
      map.on('click', (e: L.LeafletMouseEvent) => {
        setPendingClickCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    } else {
      mapInstanceRef.current.setView([villageLat, villageLng]);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, [villageLat, villageLng]);

  // Render Leaflet Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    const filtered = pinsList.filter(p => {
      if (filterCategory === 'semua') return true;
      return p.category === filterCategory;
    });

    filtered.forEach(poi => {
      const isSelected = selectedPoi?.id === poi.id;
      
      // Color Badge based on category
      let badgeBg = 'bg-emerald-600 border-white text-white';
      let pingBg = 'bg-emerald-400';
      if (poi.category === 'bansos') {
        badgeBg = 'bg-rose-600 border-white text-white';
        pingBg = 'bg-rose-400';
      } else if (poi.category === 'lansia') {
        badgeBg = 'bg-amber-500 border-white text-white';
        pingBg = 'bg-amber-400';
      } else if (poi.category === 'kantor') {
        badgeBg = 'bg-indigo-600 border-white text-white';
        pingBg = 'bg-indigo-400';
      }

      const pinHtml = `
        <div class="relative group/pin cursor-pointer w-full h-full flex items-center justify-center">
          ${!isSelected ? `<span class="absolute inline-flex h-8 w-8 rounded-full ${pingBg} opacity-75 animate-ping"></span>` : ''}
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-xl border-2 transition-all duration-200 ${
            isSelected ? 'bg-amber-400 border-white text-gray-900 scale-125 z-30 ring-4 ring-amber-300/50' : badgeBg
          }">
            ${svgIcons[poi.category] || svgIcons.kantor}
          </div>
          <span class="absolute top-9 left-1/2 -translate-x-1/2 bg-gray-950/90 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-md whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity duration-200 pointer-events-none z-40 border border-gray-700">
            ${poi.name}
          </span>
        </div>
      `;

      const icon = L.divIcon({
        html: pinHtml,
        className: 'custom-poi-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([poi.lat, poi.lng], { icon });
      marker.on('click', () => {
        setSelectedPoi(poi);
        showToast(`Titik lokasi: ${poi.name}`, 'info');
      });
      marker.addTo(markersLayerRef.current!);
    });
  }, [pinsList, selectedPoi, filterCategory]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header Info & Layer Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Map className="w-7 h-7 text-emerald-600" />
            Peta Wilayah & Sebaran Bansos (Google Maps Satellite)
          </h2>
          <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-slate-400 mt-1">
            Klik langsung di sembarang lokasi peta untuk menambahkan titik lokasi penerima bantuan sosial atau fasilitas desa.
          </p>
        </div>

        {/* Filter Layer Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full whitespace-nowrap">
          {[
            { id: 'semua', label: 'Semua Titik', color: 'bg-gray-100 text-gray-700' },
            { id: 'bansos', label: '🔴 Penerima Bansos', color: 'bg-rose-50 text-rose-700 border-rose-200' },
            { id: 'lansia', label: '🟡 Lansia Tunggal', color: 'bg-amber-50 text-amber-800 border-amber-200' },
            { id: 'kantor', label: '🔵 Fasilitas Publik', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterCategory(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer active:scale-95 ${
                filterCategory === f.id
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map & Interactive Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Google Satellite Map */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm p-3 space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600 animate-pulse" /> SATELIT GOOGLE MAPS HYBRID
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200 whitespace-nowrap">
                Klik Peta untuk Tambah Titik
              </span>
            </div>

            {/* Map Container */}
            <div className="h-[480px] w-full rounded-2xl relative overflow-hidden bg-slate-900 border border-slate-700 shadow-inner group">
              <div ref={mapContainerRef} className="absolute inset-0 z-0" />

              {/* Map Floating Legend */}
              <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl border border-gray-700 shadow-xl text-[10px] space-y-1.5 font-bold z-10 pointer-events-none">
                <p className="text-gray-400 uppercase tracking-widest text-[8px] mb-1">LEGENDA TITIK PETA</p>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" /> <span>Penerima Bansos (DTSEN)</span></div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white" /> <span>Lansia Tunggal (&ge; 60 Th)</span></div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-white" /> <span>Balai Desa / Fasilitas Umum</span></div>
              </div>
            </div>
          </div>

          {/* Selected Marker Detail Card */}
          {selectedPoi ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-md p-6 space-y-3 animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                    selectedPoi.category === 'bansos' 
                      ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                      : selectedPoi.category === 'lansia'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}>
                    {selectedPoi.category.toUpperCase()}
                  </span>
                  {selectedPoi.isDtsen && (
                    <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md whitespace-nowrap">
                      DTSEN Verified ✓
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 font-mono font-bold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {decimalToDMS(selectedPoi.lat, selectedPoi.lng)}
                </span>
              </div>

              <div>
                <h4 className="text-lg font-black text-gray-900 dark:text-white">{selectedPoi.name}</h4>
                {selectedPoi.nik && <p className="text-xs font-mono font-bold text-gray-500">NIK: {selectedPoi.nik}</p>}
                <p className="text-xs text-gray-600 dark:text-slate-300 font-semibold mt-1">Alamat: {selectedPoi.address}</p>
                {selectedPoi.aidProgram && (
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" /> Program: {selectedPoi.aidProgram}
                  </p>
                )}
                {selectedPoi.desc && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{selectedPoi.desc}</p>}
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => handleDeletePin(selectedPoi.id)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Pin Titik Ini
                </button>
                <button
                  onClick={() => setSelectedPoi(null)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  Tutup Info
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 p-6 text-center text-gray-500 text-xs font-semibold">
              Klik salah satu pin penanda di peta untuk melihat detail penerima bantuan atau fasilitas desa.
            </div>
          )}
        </div>

        {/* Right Sidebar: List of Pins & Manual Coordinates Entry */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="text-base font-extrabold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <span>Daftar Titik Penanda ({pinsList.length})</span>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">Active GIS</span>
            </h4>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {pinsList.map((pin) => (
                <div
                  key={pin.id}
                  onClick={() => {
                    setSelectedPoi(pin);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.setView([pin.lat, pin.lng], 17);
                    }
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    selectedPoi?.id === pin.id
                      ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700'
                      : 'bg-gray-50/60 dark:bg-slate-800/60 border-gray-100 dark:border-slate-800 hover:bg-gray-100'
                  }`}
                >
                  <div className="truncate">
                    <p className="text-xs font-extrabold text-gray-900 dark:text-white truncate">{pin.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{pin.address}</p>
                  </div>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 ${
                    pin.category === 'bansos' ? 'bg-rose-100 text-rose-800' : pin.category === 'lansia' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {pin.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH TITIK MANUAL HASIL KLIK PETA */}
      {pendingClickCoords && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Tambah Titik Lokasi Peta</h3>
                  <p className="text-xs text-gray-500 font-mono">GPS: {pendingClickCoords.lat.toFixed(6)}, {pendingClickCoords.lng.toFixed(6)}</p>
                </div>
              </div>
              <button 
                onClick={() => setPendingClickCoords(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Kategori Penanda</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bansos', label: '🔴 Bansos / DTSEN' },
                    { id: 'lansia', label: '🟡 Lansia Tunggal' },
                    { id: 'kantor', label: '🔵 Fasilitas Umum' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPinForm({ ...pinForm, category: cat.id as any })}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all text-center whitespace-nowrap cursor-pointer ${
                        pinForm.category === cat.id
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resident Selector or Name */}
              {residentsList.length > 0 ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Pilih Warga Penerima / Penanda</label>
                  <select
                    onChange={(e) => {
                      const selectedRes = residentsList.find(r => r.nik === e.target.value);
                      if (selectedRes) {
                        setPinForm({
                          ...pinForm,
                          name: selectedRes.name,
                          nik: selectedRes.nik,
                          address: `${selectedRes.desa || "Wasah Hilir"} / RT ${selectedRes.rt || "-"} / RW ${selectedRes.rw || "-"}`
                        });
                      }
                    }}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                  >
                    <option value="">-- Pilih Warga dari Database --</option>
                    {residentsList.map(r => (
                      <option key={r.nik} value={r.nik}>
                        {r.name} (NIK: {r.nik}) - RT {r.rt}/RW {r.rw}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Nama Penanda / Nama Warga</label>
                <input
                  type="text"
                  placeholder="Contoh: Hj. Syarifah (Penerima BLT)"
                  value={pinForm.name}
                  onChange={(e) => setPinForm({ ...pinForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Alamat Lengkap (RT/RW)</label>
                <input
                  type="text"
                  value={pinForm.address}
                  onChange={(e) => setPinForm({ ...pinForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Program Bantuan / Keterangan</label>
                <input
                  type="text"
                  placeholder="Contoh: BLT Dana Desa (2026)"
                  value={pinForm.aidProgram}
                  onChange={(e) => setPinForm({ ...pinForm, aidProgram: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setPendingClickCoords(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleCreatePin}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Save className="w-4 h-4" /> Simpan Titik Peta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
