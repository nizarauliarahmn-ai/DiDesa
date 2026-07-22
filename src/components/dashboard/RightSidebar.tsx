import React from 'react';
import { Map as MapIcon, Maximize, Star, Phone, Shield, X } from 'lucide-react';
import KalenderDesa from './KalenderDesa';
import VillageMapPreview from '../common/VillageMapPreview';

export default function RightSidebar({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const [desaName, setDesaName] = React.useState(() => localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
  const [showIdmModal, setShowIdmModal] = React.useState(false);
  const [villageLat, setVillageLat] = React.useState(() => parseFloat(localStorage.getItem('village_lat') || '-2.797806'));
  const [villageLng, setVillageLng] = React.useState(() => parseFloat(localStorage.getItem('village_lng') || '115.227889'));

  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
      setVillageLat(parseFloat(localStorage.getItem('village_lat') || '-2.797806'));
      setVillageLng(parseFloat(localStorage.getItem('village_lng') || '115.227889'));
    };
    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('village_settings_updated', handleSettingsUpdate);
    };
  }, []);

  return (
    <div className="space-y-6">
      <KalenderDesa />
      {/* Geospasial Desa */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapIcon className="text-emerald-700 w-5 h-5" />
            Geospasial Desa
          </h4>
          <button 
            onClick={() => onTabChange && onTabChange('peta_wilayah')}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 pb-0">
          <VillageMapPreview 
            lat={villageLat} 
            lng={villageLng} 
            onOpenModal={() => onTabChange && onTabChange('peta_wilayah')} 
            buttonText="Buka Peta Interaktif"
          />
        </div>
        <div className="p-5 bg-white dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100/50">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Luas Wilayah</p>
              <p className="font-bold text-gray-900 dark:text-white">4.2 km²</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100/50">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Ketinggian</p>
              <p className="font-bold text-gray-900 dark:text-white">120 mdpl</p>
            </div>
          </div>
        </div>
      </section>

      {/* IDM Card */}
      <section className="bg-gradient-to-br from-emerald-700 to-emerald-900 p-8 rounded-3xl shadow-md dark:shadow-none text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <p className="text-[10px] font-bold text-emerald-200/80 uppercase tracking-widest mb-1.5">Status IDM {new Date().getFullYear()}</p>
            <h4 className="text-2xl font-bold tracking-tight">DESA MANDIRI</h4>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
            <Star className="w-6 h-6 text-emerald-100 fill-emerald-100" />
          </div>
        </div>
        <p className="text-emerald-50/90 text-sm leading-relaxed mb-8 relative z-10">
          Skor IDM: 0.892. {desaName.replace(/desa|kelurahan/gi, '').trim()} termasuk dalam jajaran 10 besar desa mandiri di kabupaten.
        </p>
        <button 
          onClick={() => setShowIdmModal(true)}
          className="w-full bg-white dark:bg-slate-900 text-emerald-900 font-bold py-3.5 rounded-xl hover:bg-emerald-50 transition-colors shadow-sm dark:shadow-none text-sm relative z-10 active:scale-[0.98] cursor-pointer"
        >
          Lihat Detail Skor
        </button>
      </section>

      {/* IDM Details Modal */}
      {showIdmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
          <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-3xl max-w-md w-full p-6 space-y-6 border border-gray-100 dark:border-slate-800 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowIdmModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="space-y-2">
              <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Indeks Desa Membangun (IDM)
              </span>
              <h4 className="text-lg font-bold">Rincian Skor IDM Desa</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold">Skor komposit dari ketahanan sosial, ekonomi, dan ekologi {desaName}.</p>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <div className="flex justify-between"><span>Indeks Ketahanan Sosial (IKS)</span><span className="text-emerald-700">0.912</span></div>
                <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="bg-emerald-600 h-full" style={{ width: '91.2%' }} /></div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span>Indeks Ketahanan Ekonomi (IKE)</span><span className="text-emerald-700">0.865</span></div>
                <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="bg-emerald-600 h-full" style={{ width: '86.5%' }} /></div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span>Indeks Ketahanan Ekologi (IKL)</span><span className="text-emerald-700">0.900</span></div>
                <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="bg-emerald-600 h-full" style={{ width: '90%' }} /></div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl text-xs text-emerald-800 leading-relaxed font-bold">
              Kategori "DESA MANDIRI" dicapai karena nilai rata-rata ketiga indeks ketahanan bernilai di atas 0.815. Pencapaian ini menempatkan {desaName.replace(/desa|kelurahan/gi, '').trim()} sebagai pilar kemajuan di daerah.
            </div>
          </div>
        </div>
      )}

      {/* Kontak Darurat */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 px-1">Kontak Darurat</h4>
        <div className="space-y-3">
          <a href="tel:081234567890" className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Ambulans Desa</p>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">0812-3456-7890</p>
            </div>
          </a>
          <a href="tel:082100000000" className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Babinsa / Bhabinkamtibmas</p>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">0821-xxxx-xxxx</p>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}
