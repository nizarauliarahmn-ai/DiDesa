import React, { useState, useEffect } from 'react';
import { 
  Building2, MapPin, Save, Image as ImageIcon, Check, Bot, Layout, Upload, Map,
  Palette, Smartphone, Compass, Settings
} from 'lucide-react';

export default function AdminPengaturan() {
  const [villageName, setVillageName] = useState(() => localStorage.getItem('village_name') || 'WASAH HILIR');
  const [kecamatan, setKecamatan] = useState(() => localStorage.getItem('village_kecamatan') || 'Kecamatan Simpur');
  const [kabupaten, setKabupaten] = useState(() => localStorage.getItem('village_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan');
  const [alamat, setAlamat] = useState(() => localStorage.getItem('village_alamat') || 'Jalan Keramat RT 02 RW 01, Simpur');
  const [kontak, setKontak] = useState(() => localStorage.getItem('kop_kontak') || '0813 4686 7519, pemdeswasahhilir@gmail.com');
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png');
  
  const [welcomeBannerUrl, setWelcomeBannerUrl] = useState(() => localStorage.getItem('village_welcome_banner_url') || 'https://images.unsplash.com/photo-1590123514210-90c74993a404?auto=format&fit=crop&q=80&w=2000');
  const [welcomeBannerYOffset, setWelcomeBannerYOffset] = useState(() => localStorage.getItem('village_welcome_banner_y_offset') || '50');
  const [welcomeBannerZoom, setWelcomeBannerZoom] = useState(() => localStorage.getItem('village_welcome_banner_zoom') || '100');

  const [aspirasiBannerUrl, setAspirasiBannerUrl] = useState(() => localStorage.getItem('village_aspirasi_banner_url') || 'https://images.unsplash.com/photo-1596422846543-74c6fc1e0308?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
  const [aspirasiBannerYOffset, setAspirasiBannerYOffset] = useState(() => localStorage.getItem('village_aspirasi_banner_y_offset') || '50');
  const [aspirasiBannerZoom, setAspirasiBannerZoom] = useState(() => localStorage.getItem('village_aspirasi_banner_zoom') || '100');

  const [villageLat, setVillageLat] = useState(() => parseFloat(localStorage.getItem('village_lat') || '-2.797806'));
  const [villageLng, setVillageLng] = useState(() => parseFloat(localStorage.getItem('village_lng') || '115.227889'));

  const [appTheme, setAppTheme] = useState(() => localStorage.getItem('app_theme') || 'light');

  const [isSaving, setIsSaving] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // AI Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  const decimalToDMS = (lat: number, lng: number) => {
    const toDMS = (deg: number, isLat: boolean) => {
      const absolute = Math.abs(deg);
      const degrees = Math.floor(absolute);
      const minutesNotTruncated = (absolute - degrees) * 60;
      const minutes = Math.floor(minutesNotTruncated);
      const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
      let dir = '';
      if (isLat) dir = deg >= 0 ? 'N' : 'S';
      else dir = deg >= 0 ? 'E' : 'W';
      return `${degrees}°${minutes}'${seconds}"${dir}`;
    };
    return `${toDMS(lat, true)} ${toDMS(lng, false)}`;
  };

  const handleSaveGlobalConfig = () => {
    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem('village_name', villageName);
      localStorage.setItem('village_kecamatan', kecamatan);
      localStorage.setItem('village_kabupaten', kabupaten);
      localStorage.setItem('village_alamat', alamat);

      // Save to kop keys for 100% synchronization
      localStorage.setItem('kop_desa', villageName);
      localStorage.setItem('kop_kecamatan', kecamatan);
      localStorage.setItem('kop_kabupaten', kabupaten);
      localStorage.setItem('kop_alamat', alamat);
      localStorage.setItem('kop_kontak', kontak);
      localStorage.setItem('kop_logo_url', logoUrl);

      localStorage.setItem('village_welcome_banner_url', welcomeBannerUrl);
      localStorage.setItem('village_welcome_banner_y_offset', welcomeBannerYOffset);
      localStorage.setItem('village_welcome_banner_zoom', welcomeBannerZoom);
      localStorage.setItem('village_aspirasi_banner_url', aspirasiBannerUrl);
      localStorage.setItem('village_aspirasi_banner_y_offset', aspirasiBannerYOffset);
      localStorage.setItem('village_aspirasi_banner_zoom', aspirasiBannerZoom);
      
      localStorage.setItem('village_lat', villageLat.toString());
      localStorage.setItem('village_lng', villageLng.toString());
      localStorage.setItem('app_theme', appTheme);

      window.dispatchEvent(new Event('village_settings_updated'));
      setIsSaving(false);
    }, 800);
  };

  const handleImportDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Membaca file berkas...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      setImportStatus('Mengunggah dan mengekstrak profil dengan AI DiDesa...');
      
      // Simulate API call for now (since backend endpoint might be required in real use)
      setTimeout(() => {
        setIsImporting(false);
        setImportStatus('');
        alert('Fitur Parsing AI dalam masa percobaan.');
      }, 2000);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-emerald-600" />
            Pengaturan Profil Desa
          </h2>
          <p className="text-gray-500 mt-2 font-medium text-sm">
            Konfigurasi informasi dasar, alamat, identitas visual, dan pengaturan tata letak cetak dokumen.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveGlobalConfig}
            disabled={isSaving}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 hover:-translate-y-0.5"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Identitas Desa */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Informasi & Identitas Desa
              </h3>
              
              <div className="relative group">
                <input 
                  type="file" 
                  id="ai-doc-import"
                  className="hidden"
                  accept="application/pdf,image/*"
                  onChange={handleImportDocument}
                />
                <label 
                  htmlFor="ai-doc-import"
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 border border-indigo-100 shadow-sm"
                >
                  {isImporting ? (
                    <div className="w-3.5 h-3.5 border-2 border-indigo-700/30 border-t-indigo-700 rounded-full animate-spin" />
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                  {isImporting ? 'Memproses AI...' : 'Auto-Isi dengan AI'}
                </label>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-500 uppercase tracking-wider ml-1">Nama Desa / Kelurahan</label>
                  <input 
                    type="text" 
                    value={villageName}
                    onChange={(e) => setVillageName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 font-bold transition-all bg-gray-50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-500 uppercase tracking-wider ml-1">Kecamatan</label>
                  <input 
                    type="text" 
                    value={kecamatan}
                    onChange={(e) => setKecamatan(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 font-bold transition-all bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-wider ml-1">Pemerintah Kabupaten / Kota</label>
                <input 
                  type="text" 
                  value={kabupaten}
                  onChange={(e) => setKabupaten(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 font-bold transition-all bg-gray-50 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-wider ml-1">Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 font-medium transition-all bg-gray-50 focus:bg-white resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-wider ml-1">Kontak & Email (Kop Surat)</label>
                <input 
                  type="text" 
                  value={kontak}
                  onChange={(e) => setKontak(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 font-medium transition-all bg-gray-50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Banner Images */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-5 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                Visual & Banner Web
              </h3>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Logo */}
              <div className="flex gap-6 items-center">
                <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center p-2 shrink-0">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150'; }} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-500 uppercase tracking-wider ml-1">URL Logo Resmi</label>
                  <input 
                    type="text" 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 transition-all bg-gray-50 focus:bg-white"
                  />
                  <p className="text-[10px] text-gray-400">Gunakan URL gambar transparan (PNG) untuk hasil kop surat terbaik.</p>
                </div>
              </div>

              {/* Banner Welcome */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Banner Halaman Utama</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">Pratinjau Asli</span>
                </label>
                <div className="relative h-32 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                  <img 
                    src={welcomeBannerUrl} 
                    alt="Banner Utama" 
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ 
                      objectPosition: `50% ${welcomeBannerYOffset}%`,
                      transform: `scale(${parseInt(welcomeBannerZoom) / 100})`
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1590123514210-90c74993a404?auto=format&fit=crop&q=80&w=2000'; }}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input 
                    type="text" 
                    value={welcomeBannerUrl}
                    onChange={(e) => setWelcomeBannerUrl(e.target.value)}
                    placeholder="URL Gambar (Unsplash, dll)"
                    className="col-span-1 md:col-span-3 px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-emerald-500"
                  />
                  <div className="col-span-1 flex items-center gap-2 text-xs">
                    <label className="text-gray-500 font-bold">Posisi Y (%):</label>
                    <input type="range" min="0" max="100" value={welcomeBannerYOffset} onChange={(e) => setWelcomeBannerYOffset(e.target.value)} className="flex-1" />
                  </div>
                  <div className="col-span-1 flex items-center gap-2 text-xs">
                    <label className="text-gray-500 font-bold">Zoom (%):</label>
                    <input type="range" min="100" max="200" value={welcomeBannerZoom} onChange={(e) => setWelcomeBannerZoom(e.target.value)} className="flex-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Peta & Geospasial
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="aspect-video bg-gray-100 rounded-xl relative overflow-hidden group border border-gray-200">
                <img 
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-50 transition-opacity"
                  alt="Map Placeholder"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                   <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-white shadow-sm mb-2">
                     <p className="text-[10px] font-mono font-bold text-gray-700">{decimalToDMS(villageLat, villageLng)}</p>
                   </div>
                   <button 
                     onClick={() => setIsMapModalOpen(true)}
                     className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
                   >
                     <Map className="w-3.5 h-3.5" /> Set Ulang Titik
                   </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Latitude</label>
                  <input type="number" step="any" value={villageLat} onChange={(e) => setVillageLat(parseFloat(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Longitude</label>
                  <input type="number" step="any" value={villageLng} onChange={(e) => setVillageLng(parseFloat(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-600" />
                Tema Aplikasi
              </h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setAppTheme('light')}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${appTheme === 'light' ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                >
                  <div className="w-full h-12 bg-gray-100 rounded-lg flex border border-gray-200">
                    <div className="w-1/3 h-full border-r border-gray-200 bg-white rounded-l-lg"></div>
                    <div className="w-2/3 h-full bg-slate-50 rounded-r-lg flex flex-col p-1.5 gap-1">
                      <div className="w-full h-2 bg-white rounded shadow-sm"></div>
                      <div className="w-2/3 h-2 bg-white rounded shadow-sm"></div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${appTheme === 'light' ? 'text-emerald-700' : 'text-gray-500'}`}>Mode Terang</span>
                </button>
                <button 
                  onClick={() => setAppTheme('dark')}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${appTheme === 'dark' ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                >
                  <div className="w-full h-12 bg-slate-800 rounded-lg flex border border-slate-700">
                    <div className="w-1/3 h-full border-r border-slate-700 bg-slate-900 rounded-l-lg"></div>
                    <div className="w-2/3 h-full bg-slate-800 rounded-r-lg flex flex-col p-1.5 gap-1">
                      <div className="w-full h-2 bg-slate-700 rounded shadow-sm"></div>
                      <div className="w-2/3 h-2 bg-slate-700 rounded shadow-sm"></div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${appTheme === 'dark' ? 'text-emerald-700' : 'text-gray-500'}`}>Mode Gelap</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isMapModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/40">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Compass className="w-6 h-6 text-emerald-600" />
                  Tetapkan Koordinat Desa
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Visualisasi Peta DiDesa</p>
              </div>
            </div>
            <div className="p-6 bg-white flex-1 overflow-y-auto space-y-4">
              <div className="relative w-full aspect-video bg-emerald-50 rounded-2xl overflow-hidden border-2 border-emerald-100 shadow-inner">
                {/* Simulated Map Background */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <div 
                  className="absolute inset-0 z-20"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const percentX = (x / rect.width) - 0.5;
                    const percentY = (y / rect.height) - 0.5;
                    const factorY = -0.01;
                    const factorX = 0.01;
                    setVillageLat(parseFloat((-2.797806 + (percentY * factorY)).toFixed(6)));
                    setVillageLng(parseFloat((115.227889 + (percentX * factorX)).toFixed(6)));
                  }}
                ></div>
                {(() => {
                  const baseLat = -2.797806;
                  const baseLng = 115.227889;
                  const factorY = -0.01;
                  const factorX = 0.01;
                  const percentY = Math.max(-0.45, Math.min(0.45, (villageLat - baseLat) / factorY)) + 0.5;
                  const percentX = Math.max(-0.45, Math.min(0.45, (villageLng - baseLng) / factorX)) + 0.5;
                  return (
                    <div 
                      className="absolute z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ease-out"
                      style={{ top: `${percentY * 100}%`, left: `${percentX * 100}%`, transform: 'translate(-50%, -100%)' }}
                    >
                      <div className="bg-red-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-center border-2 border-white scale-110">
                        <Building2 className="w-6 h-6" />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setIsMapModalOpen(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-100">Batal</button>
              <button onClick={() => setIsMapModalOpen(false)} className="flex-1 bg-emerald-700 text-white py-3 rounded-xl font-bold hover:bg-emerald-800">Simpan Koordinat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
