import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { 
  Building2, MapPin, Save, Image as ImageIcon, Check, Bot, Layout, Upload, Map,
  Palette, Smartphone, Compass, Settings
} from 'lucide-react';
import VillageMapModal from '../common/VillageMapModal';
import VillageMapPreview from '../common/VillageMapPreview';

export default function AdminPengaturan() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [villageName, setVillageName] = useState(() => localStorage.getItem('village_name') || 'Sukamakmur');
  const [kecamatan, setKecamatan] = useState(() => localStorage.getItem('village_kecamatan') || 'Kecamatan Simpur');
  const [kabupaten, setKabupaten] = useState(() => localStorage.getItem('village_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan');
  const [alamat, setAlamat] = useState(() => localStorage.getItem('village_alamat') || 'Jalan Keramat RT 02 RW 01, Simpur');
  const [kontak, setKontak] = useState(() => localStorage.getItem('kop_kontak') || '0813 4686 7519, pemdessukamakmur@gmail.com');
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

  // Fetch settings from Supabase on mount to keep device-agnostic sync
  useEffect(() => {
    const loadFromSupabase = async () => {
      const tid = await resolveCurrentTenant();
      setTenantId(tid);
      if (!tid) return;
      try {
        const { data } = await supabase.from('saas_settings').select('key, value').eq('tenant_id', tid);
        if (data && data.length > 0) {
          const map: Record<string, string> = {};
          data.forEach((r: any) => { map[r.key] = r.value; });
          const set = (key: string, setter: (v: string) => void, fallback?: string) => {
            const val = map[key];
            if (val !== undefined && val !== null && val !== '') {
              setter(val);
              localStorage.setItem(key, val);
            } else if (fallback) {
              setter(fallback);
            }
          };
          set('village_name', setVillageName);
          set('kop_desa', setVillageName); // keep in sync
          set('village_kecamatan', setKecamatan);
          set('village_kabupaten', setKabupaten);
          set('village_alamat', setAlamat);
          set('kop_kontak', setKontak);
          set('kop_logo_url', setLogoUrl);
          set('village_welcome_banner_url', setWelcomeBannerUrl);
          set('village_welcome_banner_y_offset', setWelcomeBannerYOffset);
          set('village_welcome_banner_zoom', setWelcomeBannerZoom);
          set('village_aspirasi_banner_url', setAspirasiBannerUrl);
          set('village_aspirasi_banner_y_offset', setAspirasiBannerYOffset);
          set('village_aspirasi_banner_zoom', setAspirasiBannerZoom);
          set('app_theme', setAppTheme);
          if (map['village_lat']) setVillageLat(parseFloat(map['village_lat']));
          if (map['village_lng']) setVillageLng(parseFloat(map['village_lng']));
          window.dispatchEvent(new Event('village_settings_updated'));
          window.dispatchEvent(new Event('app_theme_updated'));
        }
      } catch (err) {
        console.warn('Gagal mengambil pengaturan dari Supabase:', err);
      }
    };
    loadFromSupabase();
  }, []);

  const handleThemeChange = (theme: string) => {
    setAppTheme(theme);
    localStorage.setItem('app_theme', theme);
    window.dispatchEvent(new Event('app_theme_updated'));
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // AI Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  const handleImageUpload = (file: File | undefined, setUrl: React.Dispatch<React.SetStateAction<string>>) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Pilih file gambar yang valid (PNG, JPG, dll).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran gambar terlalu besar (Maks. 2MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) setUrl(e.target.result as string);
    };
    reader.readAsDataURL(file);
  };

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

  const handleSaveGlobalConfig = async () => {
    if (!tenantId) {
      alert("Gagal menyimpan: Tenant ID tidak ditemukan. Mohon refresh halaman.");
      return;
    }

    setIsSaving(true);
    
    // Allow UI to show spinner
    await new Promise(resolve => setTimeout(resolve, 100));

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

    try {
      const settingsToSave = [
        { tenant_id: tenantId, key: 'village_name', value: villageName },
        { tenant_id: tenantId, key: 'village_kecamatan', value: kecamatan },
        { tenant_id: tenantId, key: 'village_kabupaten', value: kabupaten },
        { tenant_id: tenantId, key: 'village_alamat', value: alamat },
        { tenant_id: tenantId, key: 'kop_desa', value: villageName },
        { tenant_id: tenantId, key: 'kop_kecamatan', value: kecamatan },
        { tenant_id: tenantId, key: 'kop_kabupaten', value: kabupaten },
        { tenant_id: tenantId, key: 'kop_alamat', value: alamat },
        { tenant_id: tenantId, key: 'kop_kontak', value: kontak },
        { tenant_id: tenantId, key: 'kop_logo_url', value: logoUrl },
        { tenant_id: tenantId, key: 'village_welcome_banner_url', value: welcomeBannerUrl },
        { tenant_id: tenantId, key: 'village_welcome_banner_y_offset', value: welcomeBannerYOffset },
        { tenant_id: tenantId, key: 'village_welcome_banner_zoom', value: welcomeBannerZoom },
        { tenant_id: tenantId, key: 'village_aspirasi_banner_url', value: aspirasiBannerUrl },
        { tenant_id: tenantId, key: 'village_aspirasi_banner_y_offset', value: aspirasiBannerYOffset },
        { tenant_id: tenantId, key: 'village_aspirasi_banner_zoom', value: aspirasiBannerZoom },
        { tenant_id: tenantId, key: 'village_lat', value: villageLat.toString() },
        { tenant_id: tenantId, key: 'village_lng', value: villageLng.toString() },
        { tenant_id: tenantId, key: 'app_theme', value: appTheme }
      ];
      // Await upsert to Supabase
      const { error } = await supabase.from('saas_settings').upsert(settingsToSave, { onConflict: 'tenant_id,key' });
      if (error) {
        console.error('Supabase Upsert Error:', error);
        alert('Gagal menyinkronkan ke server Supabase.');
      }
    } catch (err) {
      console.error('Failed to sync settings to Supabase', err);
    }

    window.dispatchEvent(new Event('village_settings_updated'));
    window.dispatchEvent(new Event('app_theme_updated'));

    setIsSaving(false);
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
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-emerald-600" />
            Pengaturan Profil Desa
          </h2>
          <p className="text-gray-500 dark:text-slate-400 mt-2 font-medium text-sm">
            Konfigurasi informasi dasar, alamat, identitas visual, dan pengaturan tata letak cetak dokumen.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveGlobalConfig}
            disabled={isSaving}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg dark:shadow-none shadow-emerald-600/20 transition-all flex items-center gap-2 hover:-translate-y-0.5"
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
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
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 border border-indigo-100 shadow-sm dark:shadow-none"
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
                  <label className="text-xs font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Nama Desa / Kelurahan</label>
                  <input 
                    type="text" 
                    value={villageName}
                    onChange={(e) => setVillageName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 dark:text-white font-bold transition-all bg-gray-50 dark:bg-slate-800 focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Kecamatan</label>
                  <input 
                    type="text" 
                    value={kecamatan}
                    onChange={(e) => setKecamatan(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 dark:text-white font-bold transition-all bg-gray-50 dark:bg-slate-800 focus:bg-white"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Pemerintah Kabupaten / Kota</label>
                <input 
                  type="text" 
                  value={kabupaten}
                  onChange={(e) => setKabupaten(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 dark:text-white font-bold transition-all bg-gray-50 dark:bg-slate-800 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 dark:text-white font-medium transition-all bg-gray-50 dark:bg-slate-800 focus:bg-white resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Kontak & Email (Kop Surat)</label>
                <input 
                  type="text" 
                  value={kontak}
                  onChange={(e) => setKontak(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 dark:text-white font-medium transition-all bg-gray-50 dark:bg-slate-800 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Banner Images */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
             <div className="p-5 border-b border-gray-50 bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                Visual & Banner Web
              </h3>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Logo */}
              <div className="flex gap-6 items-center">
                <div 
                  className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center p-2 shrink-0 relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleImageUpload(e.dataTransfer.files[0], setLogoUrl);
                    }
                  }}
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain pointer-events-none" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150'; }} />
                  <div className="absolute inset-0 bg-black/50 rounded-xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-4 h-4 mb-1" />
                    <span className="text-[8px] font-bold">UBAH</span>
                  </div>
                  <input type="file" id="logo-upload" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) handleImageUpload(e.target.files[0], setLogoUrl); }} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">URL Logo Resmi</label>
                  <input 
                    type="text" 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 dark:text-white transition-all bg-gray-50 dark:bg-slate-800 focus:bg-white"
                  />
                  <p className="text-[10px] text-gray-400">Gunakan URL gambar transparan (PNG) untuk hasil kop surat terbaik.</p>
                </div>
              </div>

              {/* Banner Welcome */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Banner Halaman Utama</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">Pratinjau Asli</span>
                </label>
                <div 
                  className="relative h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 cursor-pointer group"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleImageUpload(e.dataTransfer.files[0], setWelcomeBannerUrl);
                    }
                  }}
                  onClick={() => document.getElementById('banner-upload')?.click()}
                >
                  <img 
                    src={welcomeBannerUrl} 
                    alt="Banner Utama" 
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ 
                      objectPosition: `50% ${welcomeBannerYOffset}%`,
                      transform: `scale(${parseInt(welcomeBannerZoom) / 100})`
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1590123514210-90c74993a404?auto=format&fit=crop&q=80&w=2000'; }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col items-center">
                      <Upload className="w-6 h-6 mb-2" />
                      <span className="text-xs font-bold uppercase tracking-widest">Klik atau Tarik Gambar Ke Sini</span>
                    </div>
                  </div>
                  <input type="file" id="banner-upload" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) handleImageUpload(e.target.files[0], setWelcomeBannerUrl); }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input 
                    type="text" 
                    value={welcomeBannerUrl}
                    onChange={(e) => setWelcomeBannerUrl(e.target.value)}
                    placeholder="URL Gambar (Unsplash, dll)"
                    className="col-span-1 md:col-span-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs outline-none focus:border-emerald-500"
                  />
                  <div className="col-span-1 flex items-center gap-2 text-xs">
                    <label className="text-gray-500 dark:text-slate-400 font-bold">Posisi Y (%):</label>
                    <input type="range" min="0" max="100" value={welcomeBannerYOffset} onChange={(e) => setWelcomeBannerYOffset(e.target.value)} className="flex-1" />
                  </div>
                  <div className="col-span-1 flex items-center gap-2 text-xs">
                    <label className="text-gray-500 dark:text-slate-400 font-bold">Zoom (%):</label>
                    <input type="range" min="100" max="200" value={welcomeBannerZoom} onChange={(e) => setWelcomeBannerZoom(e.target.value)} className="flex-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Peta & Geospasial
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <VillageMapPreview
                lat={villageLat}
                lng={villageLng}
                onOpenModal={() => setIsMapModalOpen(true)}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Latitude</label>
                  <input type="number" step="any" value={villageLat} onChange={(e) => setVillageLat(parseFloat(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-mono outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Longitude</label>
                  <input type="number" step="any" value={villageLng} onChange={(e) => setVillageLng(parseFloat(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-mono outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-600" />
                Tema Aplikasi
              </h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleThemeChange('light')}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${appTheme === 'light' ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100 dark:border-slate-800 hover:border-gray-200 bg-white dark:bg-slate-900'}`}
                >
                  <div className="w-full h-12 bg-gray-100 dark:bg-slate-800 rounded-lg flex border border-gray-200 dark:border-slate-700">
                    <div className="w-1/3 h-full border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-l-lg"></div>
                    <div className="w-2/3 h-full bg-slate-50 dark:bg-slate-800 rounded-r-lg flex flex-col p-1.5 gap-1">
                      <div className="w-full h-2 bg-white dark:bg-slate-900 rounded shadow-sm dark:shadow-none"></div>
                      <div className="w-2/3 h-2 bg-white dark:bg-slate-900 rounded shadow-sm dark:shadow-none"></div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${appTheme === 'light' ? 'text-emerald-700' : 'text-gray-500 dark:text-slate-400'}`}>Mode Terang</span>
                </button>
                <button 
                  onClick={() => handleThemeChange('dark')}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${appTheme === 'dark' ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100 dark:border-slate-800 hover:border-gray-200 bg-white dark:bg-slate-900'}`}
                >
                  <div className="w-full h-12 bg-slate-800 rounded-lg flex border border-slate-700">
                    <div className="w-1/3 h-full border-r border-slate-700 bg-slate-900 rounded-l-lg"></div>
                    <div className="w-2/3 h-full bg-slate-800 rounded-r-lg flex flex-col p-1.5 gap-1">
                      <div className="w-full h-2 bg-slate-700 rounded shadow-sm dark:shadow-none"></div>
                      <div className="w-2/3 h-2 bg-slate-700 rounded shadow-sm dark:shadow-none"></div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${appTheme === 'dark' ? 'text-emerald-700' : 'text-gray-500 dark:text-slate-400'}`}>Mode Gelap</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <VillageMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        lat={villageLat}
        lng={villageLng}
        villageName={villageName}
        onSave={(newLat, newLng) => {
          setVillageLat(newLat);
          setVillageLng(newLng);
        }}
      />
    </div>
  );
}
