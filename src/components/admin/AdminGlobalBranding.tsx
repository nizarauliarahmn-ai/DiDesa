
import React, { useState, useRef } from 'react';
import { Settings, Save, Image, Palette, Globe, CheckCircle, AlertCircle, Trash2, FileText, UploadCloud } from 'lucide-react';
import { addSaaSLog } from '../../utils/saasLogs';

export default function AdminGlobalBranding() {
  const [globalName, setGlobalName] = useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalLogo, setGlobalLogo] = useState(() => localStorage.getItem('global_app_logo') || '');
  const [globalColor, setGlobalColor] = useState(() => localStorage.getItem('global_app_color') || '#047857');
  const [globalPrintFooter, setGlobalPrintFooter] = useState(() => localStorage.getItem('global_print_footer') ?? 'Dokumen ini dibuat & dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGlobalLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      await fetch('/api/global-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          global_app_name: globalName,
          global_app_logo: globalLogo,
          global_app_color: globalColor,
          global_print_footer: globalPrintFooter
        })
      });
    } catch (err) {
      console.error('Failed to save global settings on backend:', err);
    }

    localStorage.setItem('global_app_name', globalName);
    localStorage.setItem('global_app_logo', globalLogo);
    localStorage.setItem('global_app_color', globalColor);
    localStorage.setItem('global_print_footer', globalPrintFooter);
    
    addSaaSLog({
      admin: JSON.parse(localStorage.getItem('didesa_auth_user') || '{}').name || 'Admin',
      aksi: 'Update Branding Platform',
      target: globalName,
      status: 'Berhasil'
    });

    setIsSaving(false);
    setShowSuccess(true);
    window.dispatchEvent(new Event('global_branding_updated'));
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const resetBranding = async () => {
    if (confirm('Reset branding ke default?')) {
      const defaultName = 'DiDesa';
      const defaultLogo = '';
      const defaultColor = '#047857';
      const defaultFooter = 'Dokumen ini dibuat & dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia';

      setGlobalName(defaultName);
      setGlobalLogo(defaultLogo);
      setGlobalColor(defaultColor);
      setGlobalPrintFooter(defaultFooter);

      try {
        await fetch('/api/global-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            global_app_name: defaultName,
            global_app_logo: defaultLogo,
            global_app_color: defaultColor,
            global_print_footer: defaultFooter
          })
        });
      } catch (err) {
        console.error('Failed to reset global settings on backend:', err);
      }

      localStorage.setItem('global_app_name', defaultName);
      localStorage.setItem('global_app_logo', defaultLogo);
      localStorage.setItem('global_app_color', defaultColor);
      localStorage.setItem('global_print_footer', defaultFooter);

      window.dispatchEvent(new Event('global_branding_updated'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Branding Platform Global</h2>
          <p className="text-sm text-slate-500 mt-1">Konfigurasi visual utama yang akan diterapkan ke seluruh instansi desa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Globe size={18} className="text-emerald-600" />
                  Nama Aplikasi Platform
                </label>
                <input 
                  type="text" 
                  value={globalName}
                  onChange={(e) => setGlobalName(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-slate-900"
                  placeholder="Contoh: DiDesa, SmartVillage, dll"
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Image size={18} className="text-emerald-600" />
                  Logo Platform (PNG/SVG)
                </label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={globalLogo}
                    onChange={(e) => setGlobalLogo(e.target.value)}
                    className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all text-sm font-mono"
                    placeholder="https://example.com/logo.png"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-4 bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 rounded-2xl hover:bg-emerald-100 transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <UploadCloud size={20} />
                    Unggah Logo
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Gunakan URL gambar publik atau unggah file langsung (maks 2MB) dengan latar belakang transparan.</p>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Palette size={18} className="text-emerald-600" />
                  Warna Tema Utama
                </label>
                <div className="flex gap-4 items-center">
                  <input 
                    type="color" 
                    value={globalColor}
                    onChange={(e) => setGlobalColor(e.target.value)}
                    className="w-16 h-16 rounded-2xl border-none cursor-pointer overflow-hidden bg-transparent"
                  />
                  <input 
                    type="text" 
                    value={globalColor}
                    onChange={(e) => setGlobalColor(e.target.value)}
                    className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 transition-all font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileText size={18} className="text-emerald-600" />
                  Footer Cetak Surat (HTML)
                </label>
                <textarea 
                  value={globalPrintFooter}
                  onChange={(e) => setGlobalPrintFooter(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all text-sm font-mono"
                  placeholder="Teks footer yang akan tampil di bawah semua dokumen cetak..."
                  rows={3}
                />
                <p className="text-[10px] text-slate-400 font-medium">Gunakan tag HTML ringan seperti &lt;strong&gt; atau &lt;br&gt; jika diperlukan.</p>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <button 
                onClick={resetBranding}
                className="text-rose-600 hover:text-rose-700 text-sm font-bold flex items-center gap-2"
              >
                <Trash2 size={18} />
                <span>Reset ke Default</span>
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={18} />
                    <span>Terapkan Perubahan Global</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {showSuccess && (
            <div className="bg-emerald-600 text-white p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <CheckCircle size={20} />
              <p className="font-bold text-sm">Branding global berhasil diperbarui untuk seluruh desa!</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-4">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden sticky top-24">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            <h4 className="text-lg font-bold mb-6">Live Preview Sidebar</h4>
            
            <div className="bg-white rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner"
                  style={{ backgroundColor: globalColor }}
                >
                  {globalLogo ? <img src={globalLogo} alt="Preview" className="w-6 h-6 object-contain" /> : <Globe className="text-white w-6 h-6" />}
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight leading-none" style={{ color: globalColor }}>{globalName}</h1>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">NAMA DESA CONTOH</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center px-4 gap-3">
                  <div className="w-4 h-4 bg-slate-200 rounded" />
                  <div className="h-2 w-20 bg-slate-200 rounded" />
                </div>
                <div className="h-10 rounded-xl flex items-center px-4 gap-3" style={{ backgroundColor: `${globalColor}10` }}>
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: globalColor }} />
                  <div className="h-2 w-24 rounded" style={{ backgroundColor: globalColor }} />
                </div>
                <div className="h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center px-4 gap-3">
                  <div className="w-4 h-4 bg-slate-200 rounded" />
                  <div className="h-2 w-16 bg-slate-200 rounded" />
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-400">Penting</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Perubahan ini akan berdampak langsung pada seluruh Administrator Desa dan Portal Publik setiap instansi. Pastikan visual tetap kontras dan terbaca.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
