import React, { useState, useEffect, useRef } from 'react';
import { MapIcon, Layers, Compass, Navigation, MapPin, Trash2, Undo } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { showToast } from '../../../utils/toast';

export interface PolygonData {
  centerLat: string;
  centerLng: string;
  area: number;
  northDistance: number;
  southDistance: number;
  eastDistance: number;
  westDistance: number;
  points: { lat: number, lng: number }[];
}

export function LandPolygonPickerModal({
  initialLat,
  initialLng,
  onSave,
  onClose
}: {
  initialLat: string;
  initialLng: string;
  onSave: (data: PolygonData) => void;
  onClose: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapType, setMapType] = useState<'satellite' | 'street'>('satellite');
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const [area, setArea] = useState<number>(0);

  const tileUrls = {
    satellite: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    street: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  };

  const tileAttributions = {
    satellite: '&copy; Google Maps Satellite Imagery',
    street: '&copy; OpenStreetMap &copy; CARTO'
  };

  const calculateSphericalArea = (latlngs: L.LatLng[]) => {
    if (latlngs.length < 3) return 0;
    const earthRadius = 6378137;
    let area = 0;
    for (let i = 0; i < latlngs.length; i++) {
      const p1 = latlngs[i];
      const p2 = latlngs[(i + 1) % latlngs.length];
      const lat1 = p1.lat * Math.PI / 180;
      const lat2 = p2.lat * Math.PI / 180;
      const lng1 = p1.lng * Math.PI / 180;
      const lng2 = p2.lng * Math.PI / 180;
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    return Math.abs(area * earthRadius * earthRadius / 2);
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const parseLat = parseFloat(initialLat) || -2.797806;
    const parseLng = parseFloat(initialLng) || 115.227889;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [parseLat, parseLng],
        zoom: 19,
        zoomControl: true,
      });

      const tileLayer = L.tileLayer(tileUrls[mapType], {
        maxZoom: 22,
        maxNativeZoom: 20,
        attribution: tileAttributions[mapType]
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      markersGroupRef.current = L.layerGroup().addTo(map);
      polygonLayerRef.current = L.polygon([], { color: '#10b981', fillColor: '#34d399', fillOpacity: 0.4, weight: 3 }).addTo(map);

      map.on('click', (e: L.LeafletMouseEvent) => {
        setPoints(prev => [...prev, e.latlng]);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      tileLayerRef.current = L.tileLayer(tileUrls[mapType], {
        maxZoom: 22,
        maxNativeZoom: 20,
        attribution: tileAttributions[mapType]
      }).addTo(mapInstanceRef.current);
    }
  }, [mapType]);

  useEffect(() => {
    if (!mapInstanceRef.current || !polygonLayerRef.current || !markersGroupRef.current) return;
    
    markersGroupRef.current.clearLayers();
    polygonLayerRef.current.setLatLngs(points);

    // Draw vertex points
    points.forEach((p) => {
      L.circleMarker(p, { radius: 5, color: 'white', fillColor: '#ef4444', fillOpacity: 1, weight: 2 })
        .addTo(markersGroupRef.current!);
    });

    // Draw distance labels on edges
    if (points.length > 1) {
      for (let i = 0; i < points.length; i++) {
        if (points.length === 2 && i === 1) break;

        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const dist = p1.distanceTo(p2);
        
        const midLat = (p1.lat + p2.lat) / 2;
        const midLng = (p1.lng + p2.lng) / 2;

        const icon = L.divIcon({
          className: 'custom-dist-label',
          html: `<div style="background: white; padding: 2px 6px; border-radius: 4px; border: 1px solid #ccc; font-size: 10px; font-weight: bold; color: black; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transform: translate(-50%, -50%);">${dist.toFixed(1)} m</div>`,
          iconSize: [0, 0]
        });
        L.marker([midLat, midLng], { icon }).addTo(markersGroupRef.current!);
      }
    }

    setArea(calculateSphericalArea(points));

  }, [points]);

  const handleUndo = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (window.confirm('Hapus semua titik?')) {
      setPoints([]);
    }
  };

  const handleSave = () => {
    if (points.length < 3) {
      showToast('Minimal 3 titik koordinat untuk membentuk bidang tanah!', 'error');
      return;
    }

    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    let northDist = 0, southDist = 0, eastDist = 0, westDist = 0;

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const dist = p1.distanceTo(p2);
      const midLat = (p1.lat + p2.lat) / 2;
      const midLng = (p1.lng + p2.lng) / 2;

      const dLat = midLat - centerLat;
      const dLng = midLng - centerLng;
      
      if (Math.abs(dLat) > Math.abs(dLng)) {
        if (dLat > 0) northDist += dist;
        else southDist += dist;
      } else {
        if (dLng > 0) eastDist += dist;
        else westDist += dist;
      }
    }

    onSave({
      centerLat: centerLat.toFixed(6),
      centerLng: centerLng.toFixed(6),
      area,
      northDistance: northDist,
      southDistance: southDist,
      eastDistance: eastDist,
      westDistance: westDist,
      points: points.map(p => ({ lat: p.lat, lng: p.lng }))
    });
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-emerald-600" /> Alat Ukur Peta Poligon Tanah
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Klik pada sudut-sudut batas tanah secara berurutan untuk menggambar poligon dan mengukur otomatis.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 font-bold rounded-lg text-lg">✕</button>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setMapType('satellite')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${mapType === 'satellite' ? 'bg-emerald-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            ><Layers className="w-3.5 h-3.5" /> Satelit</button>
            <button
              onClick={() => setMapType('street')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${mapType === 'street' ? 'bg-emerald-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            ><Compass className="w-3.5 h-3.5" /> Peta Jalan</button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleUndo} disabled={points.length === 0} className="px-3 py-1.5 bg-yellow-50 text-yellow-700 font-bold rounded-xl border border-yellow-200 hover:bg-yellow-100 transition-all flex items-center gap-1 disabled:opacity-50">
              <Undo className="w-3.5 h-3.5" /> Undo
            </button>
            <button onClick={handleClear} disabled={points.length === 0} className="px-3 py-1.5 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200 hover:bg-red-100 transition-all flex items-center gap-1 disabled:opacity-50">
              <Trash2 className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>

        <div className="relative w-full h-[500px] bg-slate-200">
          <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />
          
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg z-[10] border border-emerald-100 pointer-events-none min-w-[200px]">
            <h4 className="font-bold text-gray-800 mb-2 border-b pb-1">Hasil Pengukuran</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Jumlah Titik:</span> <span className="font-bold">{points.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Luas Tanah:</span> <span className="font-bold text-emerald-600 text-sm">± {area.toFixed(2)} m²</span></div>
            </div>
            {points.length < 3 && (
              <p className="text-[10px] text-orange-600 mt-2 italic">* Minimal 3 titik untuk hitung luas</p>
            )}
          </div>
        </div>

        <div className="p-5 bg-gray-50/50 dark:bg-slate-800/50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-300">Batal</button>
          <button onClick={handleSave} className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Gunakan Area Ini
          </button>
        </div>
      </div>
    </div>
  );
}
