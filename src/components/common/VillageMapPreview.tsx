import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map, Maximize2 } from 'lucide-react';

interface VillageMapPreviewProps {
  lat: number;
  lng: number;
  onOpenModal: () => void;
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

export default function VillageMapPreview({ lat, lng, onOpenModal }: VillageMapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const pinIcon = L.divIcon({
        className: 'custom-preview-pin',
        html: `
          <div class="relative flex flex-col items-center">
            <div class="bg-red-600 text-white p-2 rounded-xl shadow-xl border-2 border-white flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
              </svg>
            </div>
            <div class="w-2.5 h-2.5 bg-red-600 rotate-45 -mt-3 border-r-2 border-b-2 border-white"></div>
          </div>
        `,
        iconSize: [32, 38],
        iconAnchor: [16, 38],
      });

      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      mapInstanceRef.current.setView([lat, lng]);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
      mapInstanceRef.current.invalidateSize();
    }
  }, [lat, lng]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      onClick={onOpenModal}
      className="aspect-video w-full rounded-2xl relative overflow-hidden group cursor-pointer border border-slate-200 dark:border-slate-700 shadow-inner"
    >
      {/* Leaflet Map Preview Container */}
      <div ref={mapRef} className="w-full h-full z-0 pointer-events-none" />

      {/* Overlay & Interactive Controls */}
      <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/30 transition-all z-10 flex flex-col items-center justify-center p-4">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-white/80 dark:border-slate-800 shadow-md mb-3 transition-transform group-hover:scale-105">
          <p className="text-[11px] font-mono font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {decimalToDMS(lat, lng)}
          </p>
        </div>
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal();
          }}
          className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl border border-emerald-500/50 flex items-center gap-2 transition-all"
        >
          <Map className="w-4 h-4" /> 
          <span>Set Ulang Titik Peta</span>
          <Maximize2 className="w-3.5 h-3.5 opacity-70" />
        </button>
      </div>
    </div>
  );
}
