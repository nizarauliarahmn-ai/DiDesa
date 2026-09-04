import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, MapPin, Building, ShieldCheck, ChevronRight, X } from 'lucide-react';
import { MapContainer, TileLayer, LayersControl, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import UserPlaceholder from '../common/UserPlaceholder';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { fetchResidentsCached } from '../../utils/apiCache';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

export default function ProfilDesa() {
  const [selectedLembaga, setSelectedLembaga] = useState<typeof lembagaDesa[0] | null>(null);

  const [luasWilayah, setLuasWilayah] = useState(() => localStorage.getItem('village_luas_wilayah') || '-');
  const [totalPenduduk, setTotalPenduduk] = useState(0);
  const [ketinggian, setKetinggian] = useState(() => localStorage.getItem('village_ketinggian') || '-');
  const [batasUtara, setBatasUtara] = useState(() => localStorage.getItem('village_batas_utara') || '-');
  const [batasSelatan, setBatasSelatan] = useState(() => localStorage.getItem('village_batas_selatan') || '-');
  const [batasTimur, setBatasTimur] = useState(() => localStorage.getItem('village_batas_timur') || '-');
  const [batasBarat, setBatasBarat] = useState(() => localStorage.getItem('village_batas_barat') || '-');
  const [villageLat, setVillageLat] = useState(() => parseFloat(localStorage.getItem('village_lat') || '0'));
  const [villageLng, setVillageLng] = useState(() => parseFloat(localStorage.getItem('village_lng') || '0'));
  const [rtList, setRtList] = useState<{ no: string; name: string; role?: string }[]>([]);
  const [rwList, setRwList] = useState<{ no: string; name: string; role?: string }[]>([]);
  const [rtRwMapping, setRtRwMapping] = useState<{ rt: string; rw: string }[]>([]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1 } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const [perangkatDesa, setPerangkatDesa] = useState([
    { name: 'Belum Diatur', role: 'Kepala Desa' }
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('village_officers');
    if (saved) {
      try {
        const officers = JSON.parse(saved);
        if (Array.isArray(officers) && officers.length > 0) {
          // Filter to only include actual Perangkat Desa (not BPD, LPM, etc. which usually have 'Ketua' or specific keywords, or just use all for now since they are managed centrally)
          const mapped = officers.map((officer: any) => ({
            ...officer
          }));
          setPerangkatDesa(mapped);
        }
      } catch (e) {
        console.error('Failed to parse village officers', e);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const tid = await resolveCurrentTenant();
        // Load village profile settings from Supabase
        if (tid) {
          const { data } = await supabase.from('saas_settings').select('key,value').eq('tenant_id', tid);
          if (data) {
            const map: Record<string, string> = {};
            data.forEach(r => { map[r.key] = r.value; });
            if (map['village_luas_wilayah']) setLuasWilayah(map['village_luas_wilayah']);
            if (map['village_ketinggian']) setKetinggian(map['village_ketinggian']);
            if (map['village_batas_utara']) setBatasUtara(map['village_batas_utara']);
            if (map['village_batas_selatan']) setBatasSelatan(map['village_batas_selatan']);
            if (map['village_batas_timur']) setBatasTimur(map['village_batas_timur']);
            if (map['village_batas_barat']) setBatasBarat(map['village_batas_barat']);
            if (map['village_lat']) setVillageLat(parseFloat(map['village_lat']));
            if (map['village_lng']) setVillageLng(parseFloat(map['village_lng']));
            try { if (map['village_rt_list']) setRtList(JSON.parse(map['village_rt_list'])); } catch {}
            try { if (map['village_rw_list']) setRwList(JSON.parse(map['village_rw_list'])); } catch {}
            try { if (map['village_rt_rw_mapping']) setRtRwMapping(JSON.parse(map['village_rt_rw_mapping'])); } catch {}
          }
        }
        // Count residents using shared cache (same as StatCards)
        const res = await fetchResidentsCached();
        const data = await res.json();
        if (Array.isArray(data)) {
          setTotalPenduduk(data.length);
        }
      } catch (e) {
        console.error('[ProfilDesa] failed:', e);
      }
    })();
  }, []);

  const lembagaDesa = [
    { name: 'BPD (Badan Permusyawaratan Desa)', members: 7, description: 'Lembaga yang melaksanakan fungsi pemerintahan yang anggotanya wakil dari penduduk desa.', longDescription: 'BPD merupakan pilar utama dalam pemerintahan desa yang berfungsi membahas dan menyepakati Rancangan Peraturan Desa bersama Kepala Desa, menampung dan menyalurkan aspirasi masyarakat desa, dan melakukan pengawasan kinerja Kepala Desa.' },
    { name: 'LPM (Lembaga Pemberdayaan Masyarakat)', members: 12, description: 'Mitra kerja Kepala Desa dalam memberdayakan masyarakat.', longDescription: 'LPM berfungsi sebagai mitra kerja pemerintah desa dalam menyusun rencana pembangunan secara partisipatif, menggerakkan swadaya gotong royong masyarakat, melaksanakan dan mengendalikan pembangunan.' },
    { name: 'PKK', members: 15, description: 'Pemberdayaan Kesejahteraan Keluarga untuk kesejahteraan masyarakat mulai dari keluarga.', longDescription: 'PKK bertujuan memberdayakan keluarga untuk meningkatkan kesejahteraan menuju terwujudnya keluarga yang beriman dan bertaqwa kepada Tuhan Yang Maha Esa, berakhlak mulia dan berbudi luhur, sehat sejahtera, maju dan mandiri.' },
    { name: 'Karang Taruna', members: 25, description: 'Organisasi sosial wadah pembinaan generasi muda.', longDescription: 'Karang Taruna adalah organisasi sosial kemasyarakatan sebagai wadah dan sarana pengembangan setiap anggota masyarakat yang tumbuh dan berkembang atas dasar kesadaran dan tanggung jawab sosial dari, oleh dan untuk masyarakat terutama generasi muda di wilayah desa.' },
  ];

  return (
    <>
      <motion.div 
        className="space-y-8 pb-20 lg:pb-0"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="text-center py-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Profil & Informasi Desa</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-2">Mengenal lebih dekat pemerintahan dan kelembagaan desa</p>
      </motion.div>

      {/* Perangkat Desa & Staf */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Perangkat Desa & Staf</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">Struktur organisasi pemerintahan desa</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Kepala Desa - Card terbesar */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="col-span-2 md:col-span-3 lg:col-span-5 bg-gradient-to-br from-emerald-800 to-emerald-950 rounded-2xl p-6 border border-emerald-700/30 shadow-md flex flex-col md:flex-row items-center text-center md:text-left gap-5 group"
          >
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-emerald-500/30 overflow-hidden bg-white/10 p-1 shrink-0">
              <UserPlaceholder className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800" iconClassName="w-2/5 h-2/5 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-xl md:text-2xl font-bold text-white">{perangkatDesa[0].name}</h4>
              <p className="text-emerald-300 font-semibold mt-1 tracking-wider uppercase text-sm">{perangkatDesa[0].role}</p>
              <p className="text-emerald-100/70 text-sm mt-3 italic leading-relaxed">
                "Bersama masyarakat membangun desa yang mandiri, transparan, dan berkeadilan untuk kesejahteraan bersama."
              </p>
            </div>
          </motion.div>

          {/* Perangkat lainnya */}
          {perangkatDesa.slice(1).map((person, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center group transition-colors hover:bg-emerald-50 hover:border-emerald-200"
            >
              <UserPlaceholder className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white shadow-sm dark:shadow-none mb-3 group-hover:border-emerald-200 transition-colors" iconClassName="w-2/5 h-2/5 text-slate-500 dark:text-slate-400" />
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">{person.name}</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{person.role}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Struktur RT & RW */}
      {(rtList.length > 0 || rwList.length > 0) && (
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Struktur RT & RW</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">Pembagian wilayah administrasi lingkungan</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rwList.map((rw, rwIdx) => {
              const rwNo = rw.no || String(rwIdx + 1);
              const rwNoInt = parseInt(rwNo);
              const assignedRts = rtList.filter(rt => {
                const mapping = rtRwMapping.find(m => m.rt === rt.no || m.rt === String(parseInt(rt.no)));
                if (mapping && (mapping.rw === rwNo || mapping.rw === String(rwNoInt))) return true;
                if (rt.rtRw && typeof rt.rtRw === 'string') {
                  const parts = rt.rtRw.split('/').map((s: string) => s.trim());
                  if (parts.length >= 2 && (parts[1] === rwNo.padStart(2, '0') || parts[1] === String(rwNoInt))) return true;
                }
                return false;
              });
              return (
                <div key={rwIdx} className="group bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 rounded-2xl p-5 border border-emerald-200/60 dark:border-emerald-700/40 hover:shadow-lg hover:shadow-emerald-100 dark:hover:shadow-emerald-900/20 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg shadow-emerald-200 dark:shadow-emerald-800/40 group-hover:scale-105 transition-transform">
                      RW{rwNo.padStart(2, '0')}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-base">{rw.name}</h4>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{rw.role || 'Ketua RW'}</p>
                    </div>
                  </div>
                  {assignedRts.length > 0 && (
                    <div className="ml-2 pl-4 border-l-2 border-emerald-300 dark:border-emerald-600 space-y-3">
                      {assignedRts.map((rt, rtIdx) => (
                        <div key={rtIdx} className="flex items-center gap-3 group/rt">
                          <div className="w-9 h-9 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-[11px] border-2 border-emerald-200 dark:border-emerald-700 shrink-0 group-hover/rt:border-emerald-400 dark:group-hover/rt:border-emerald-500 transition-colors">
                            RT{rt.no.padStart(2, '0')}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover/rt:text-emerald-700 dark:group-hover/rt:text-emerald-300 transition-colors">{rt.name}</p>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400">{rt.role || 'Ketua RT'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {rtList.length > 0 && rwList.length === 0 && (
              <div className="col-span-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {rtList.map((rt, idx) => (
                  <div key={idx} className="group bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-800 dark:to-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-3 hover:shadow-md transition-all duration-300">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                      {rt.no}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{rt.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">{rt.role || 'Ketua RT'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Lokasi & Demografi - Full Width */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lokasi & Demografi</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">Informasi geografis wilayah</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Peta - 7 kolom */}
          <div className="lg:col-span-7">
            {villageLat !== 0 && villageLng !== 0 ? (
              <div className="rounded-2xl h-64 md:h-80 overflow-hidden relative border border-gray-200 dark:border-slate-700">
                <MapContainer
                  center={[villageLat, villageLng]}
                  zoom={14}
                  scrollWheelZoom={false}
                  className="w-full h-full z-0"
                >
                  <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Satelit">
                      <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution="&copy; Esri"
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Jalan">
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                      />
                    </LayersControl.BaseLayer>
                  </LayersControl>
                  <Marker position={[villageLat, villageLng]}>
                    <Popup>Kantor Desa</Popup>
                  </Marker>
                </MapContainer>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${villageLat}&mlon=${villageLng}#map=14/${villageLat}/${villageLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 z-[1000] bg-white/90 dark:bg-slate-800/90 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                  Buka Peta Penuh
                </a>
              </div>
            ) : (
              <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl h-64 overflow-hidden relative flex items-center justify-center border border-gray-200 dark:border-slate-700">
                <span className="text-sm font-bold text-gray-400">Atur koordinat desa di Pengaturan untuk menampilkan peta</span>
              </div>
            )}
          </div>

          {/* Statistik & Batas - 5 kolom */}
          <div className="lg:col-span-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Luas Wilayah</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{luasWilayah} <span className="text-sm font-medium text-gray-500 dark:text-slate-400">km²</span></p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Total Penduduk</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{totalPenduduk.toLocaleString('id-ID')} <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Jiwa</span></p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Ketinggian</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{ketinggian} <span className="text-sm font-medium text-gray-500 dark:text-slate-400">mdpl</span></p>
              </div>
            </div>

            {/* Batas Desa */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Batas Wilayah</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Utara</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">{batasUtara}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Selatan</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">{batasSelatan}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Timur</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">{batasTimur}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Barat</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">{batasBarat}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lembaga Desa</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">Badan dan lembaga pendukung operasional desa</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lembagaDesa.map((lembaga, idx) => (
            <div key={idx} onClick={() => setSelectedLembaga(lembaga)} className="flex gap-4 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors cursor-pointer group">
              <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 group-hover:bg-white rounded-xl flex items-center justify-center text-gray-400 group-hover:text-emerald-600 shrink-0 transition-colors">
                <Building className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white">{lembaga.name}</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">{lembaga.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 px-2 py-0.5 rounded-full group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                    {lembaga.members} Anggota Aktif
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <ChevronRight className="text-gray-300 group-hover:text-emerald-500 w-5 h-5 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      </motion.div>

      <AnimatePresence>
        {selectedLembaga && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedLembaga(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                  <Building className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedLembaga.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600">{selectedLembaga.members} Anggota Aktif</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Deskripsi Singkat</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{selectedLembaga.description}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Tugas & Fungsi Utama</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{selectedLembaga.longDescription}</p>
                </div>
              </div>
              
              <div className="mt-8">
                <button 
                  onClick={() => setSelectedLembaga(null)}
                  className="w-full bg-slate-900 text-white font-bold text-sm py-3 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
