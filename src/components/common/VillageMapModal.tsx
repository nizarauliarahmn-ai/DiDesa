import React, { useState, useEffect, useRef } from 'react';
import { Compass, X, MapPin, Search, Layers, Navigation, Check, Loader2, Maximize2, LocateFixed } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { showToast } from '../../utils/toast';

interface VillageMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  onSave: (newLat: number, newLng: number) => void;
  villageName?: string;
}

function decimalToDMS(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const absLat = Math.abs(lat);
  const absLng = Math.abs(lng);
  const latD = Math.floor(absLat);
  const latM = Math.floor((absLat - latD) * 60);
  const latS = ((absLat - latD - latM / 60) * 3600).toFixed(1);
  const lngD = Math.floor(absLng);
  const lngM = Math.floor((absLng - lngD) * 60);
  const lngS = ((absLng - lngD - lngM / 60) * 3600).toFixed(1);
  return `${latD}°${latM}'${latS}"${latDir} ${lngD}°${lngM}'${lngS}"${lngDir}`;
}

export default function VillageMapModal({ isOpen, onClose, lat, lng, onSave, villageName }: VillageMapModalProps) {
  const [currentLat, setCurrentLat] = useState(lat);
  const [currentLng, setCurrentLng] = useState(lng);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Sync internal state if prop changes when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentLat(lat);
      setCurrentLng(lng);
    }
  }, [isOpen, lat, lng]);

  // Initialize and manage Leaflet map instance
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Small delay to ensure modal animation completes & DOM bounds are ready
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Create custom red pin icon
        const customPinIcon = L.divIcon({
          className: 'custom-leaflet-pin',
          html: `
            <div class="relative flex flex-col items-center group">
              <div class="bg-gradient-to-tr from-red-600 to-rose-500 text-white p-2.5 rounded-2xl shadow-2xl border-2 border-white ring-4 ring-red-500/20 flex items-center justify-center transform -translate-y-2 transition-transform duration-200 group-hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                  <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
                  <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
                  <path d="M10 6h4"/>
                  <path d="M10 10h4"/>
                  <path d="M10 14h4"/>
                  <path d="M10 18h4"/>
                </svg>
              </div>
              <div class="w-3 h-3 bg-red-600 rotate-45 -mt-3.5 border-r-2 border-b-2 border-white"></div>
              <div class="w-6 h-2 bg-black/30 rounded-full blur-[2px] mt-0.5"></div>
            </div>
          `,
          iconSize: [40, 48],
          iconAnchor: [20, 48],
        });

        // Initialize Map
        const initialMap = L.map(mapContainerRef.current, {
          center: [currentLat, currentLng],
          zoom: 14,
          zoomControl: false,
        });

        // Add Zoom Control at bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(initialMap);

        // Add Tile Layer
        const tileUrl = mapType === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        const tiles = L.tileLayer(tileUrl, {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxZoom: 19,
        }).addTo(initialMap);

        tileLayerRef.current = tiles;

        // Add Draggable Marker
        const marker = L.marker([currentLat, currentLng], {
          icon: customPinIcon,
          draggable: true,
        }).addTo(initialMap);

        marker.on('dragend', () => {
          const position = marker.getLatLng();
          const newLat = parseFloat(position.lat.toFixed(6));
          const newLng = parseFloat(position.lng.toFixed(6));
          setCurrentLat(newLat);
          setCurrentLng(newLng);
        });

        // Click map to set pin
        initialMap.on('click', (e: L.LeafletMouseEvent) => {
          const newLat = parseFloat(e.latlng.lat.toFixed(6));
          const newLng = parseFloat(e.latlng.lng.toFixed(6));
          setCurrentLat(newLat);
          setCurrentLng(newLng);
          marker.setLatLng([newLat, newLng]);
        });

        mapInstanceRef.current = initialMap;
        markerInstanceRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Clean up map when unmounting
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update tile layer when mapType changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const tileUrl = mapType === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = tiles;
  }, [mapType]);

  // Update marker & view when currentLat/currentLng changes from manual input/search/geolocation
  const updateMapPosition = (newLat: number, newLng: number, zoomLevel?: number) => {
    setCurrentLat(newLat);
    setCurrentLng(newLng);
    if (mapInstanceRef.current && markerInstanceRef.current) {
      markerInstanceRef.current.setLatLng([newLat, newLng]);
      mapInstanceRef.current.flyTo([newLat, newLng], zoomLevel || mapInstanceRef.current.getZoom(), {
        duration: 1.2
      });
    }
  };

  // Search Location via Nominatim API
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Indonesia')}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const foundLat = parseFloat(data[0].lat);
        const foundLng = parseFloat(data[0].lon);
        updateMapPosition(foundLat, foundLng, 14);
        showToast(`Ditemukan: ${data[0].display_name.split(',')[0]}`, 'success');
      } else {
        showToast('Lokasi tidak ditemukan, coba nama daerah lain.', 'error');
      }
    } catch (err) {
      showToast('Gagal mencari lokasi.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Get Current User Geolocation
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Browser Anda tidak mendukung deteksi GPS.', 'error');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = parseFloat(position.coords.latitude.toFixed(6));
        const newLng = parseFloat(position.coords.longitude.toFixed(6));
        updateMapPosition(newLat, newLng, 16);
        showToast('Berhasil mendapatkan koordinat lokasi Anda saat ini!', 'success');
        setIsLocating(false);
      },
      (error) => {
        showToast('Gagal mendapatkan lokasi. Pastikan izin GPS aktif.', 'error');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 backdrop-blur-md bg-slate-950/60 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] relative animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Tetapkan Koordinat {villageName || 'Desa'}
              </h3>
              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest leading-none mt-1">
                Peta Geospasial Terintegrasi OpenStreetMap & Satelit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Map Body Container */}
        <div className="relative flex-1 min-h-[420px] sm:min-h-[500px] bg-slate-100 dark:bg-slate-950 overflow-hidden flex flex-col">
          
          {/* Top Control Overlay: Search & Layer Switcher */}
          <div className="absolute top-4 left-4 right-4 z-[400] flex flex-col sm:flex-row gap-2 justify-between pointer-events-none">
            {/* Search Input Bar */}
            <form onSubmit={handleSearch} className="pointer-events-auto flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800/80 w-full sm:w-80">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kecamatan / desa di Indonesia..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1 shrink-0 disabled:opacity-50"
              >
                {isSearching ? <Loader2 size={13} className="animate-spin" /> : 'Cari'}
              </button>
            </form>

            {/* Quick Action Buttons */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="bg-white/90 dark:bg-slate-900/90 hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-800 dark:text-emerald-400 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 text-xs font-bold px-3 py-2.5 rounded-2xl shadow-xl flex items-center gap-1.5 transition-all"
              >
                {isLocating ? <Loader2 size={14} className="animate-spin text-emerald-600" /> : <LocateFixed size={14} />}
                <span className="hidden sm:inline">Lokasi Saya</span>
              </button>

              <button
                type="button"
                onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
                className="bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 text-xs font-bold px-3 py-2.5 rounded-2xl shadow-xl flex items-center gap-1.5 transition-all"
              >
                <Layers size={14} className="text-emerald-600" />
                <span>{mapType === 'streets' ? 'Satelit HD' : 'Vektor Peta'}</span>
              </button>
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div ref={mapContainerRef} className="w-full h-full min-h-[420px] sm:min-h-[500px] z-10" />

          {/* Bottom Floating Info Badge */}
          <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/80 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center gap-3 text-xs font-mono">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
            <div>
              <span className="text-[10px] text-slate-400 font-sans uppercase block leading-none font-bold mb-0.5">Koordinat Terpilih:</span>
              <span className="font-bold text-emerald-300">{currentLat.toFixed(6)}, {currentLng.toFixed(6)}</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-700 hidden sm:block"></div>
            <div className="hidden sm:block text-[11px] text-slate-300 font-semibold">
              {decimalToDMS(currentLat, currentLng)}
            </div>
          </div>
        </div>

        {/* Footer & Manual Inputs */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={currentLat}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) updateMapPosition(val, currentLng);
                }}
                className="w-32 sm:w-36 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={currentLng}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) updateMapPosition(currentLat, val);
                }}
                className="w-32 sm:w-36 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(currentLat, currentLng);
                showToast(`Koordinat ${villageName || 'desa'} berhasil disimpan!`, 'success');
                onClose();
              }}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2"
            >
              <Check size={16} />
              <span>Simpan Koordinat</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
