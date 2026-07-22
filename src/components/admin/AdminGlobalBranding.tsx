import React, { useState, useRef, useEffect } from 'react';
import { Settings, Save, Image, Palette, Globe, CheckCircle, AlertCircle, Trash2, FileText, UploadCloud, Type, Mail, Phone, Link, Share2 } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { addSaaSLog } from '../../utils/saasLogs';

export default function AdminGlobalBranding() {
  const [globalName, setGlobalName] = useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalLogo, setGlobalLogo] = useState(() => localStorage.getItem('global_app_logo') || '');
  const [globalColor, setGlobalColor] = useState(() => localStorage.getItem('global_app_color') || '#047857');
  const [globalPrintFooter, setGlobalPrintFooter] = useState(() => localStorage.getItem('global_print_footer') ?? 'Dokumen ini dibuat & dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia');
  
  // Footer settings
  const [globalFooterDesc, setGlobalFooterDesc] = useState(() => localStorage.getItem('global_footer_desc') ?? 'Solusi Digital Terpadu untuk Tata Kelola & Administrasi Desa Mandiri yang Modern dan Transparan.');
  const [globalFooterEmail, setGlobalFooterEmail] = useState(() => localStorage.getItem('global_footer_email') ?? 'info@didesa.id');
  const [globalFooterPhone, setGlobalFooterPhone] = useState(() => localStorage.getItem('global_footer_phone') ?? '+62 813-4686-7519');
  const [globalFooterAffiliateTitle, setGlobalFooterAffiliateTitle] = useState(() => localStorage.getItem('global_footer_affiliate_title') ?? 'AFFILIATOR');
  const [globalFooterAffiliateSubtitle, setGlobalFooterAffiliateSubtitle] = useState(() => localStorage.getItem('global_footer_affiliate_subtitle') ?? 'Mendigitalisasi desa & raih komisi nyata.');
  const [globalFooterAffiliateLink, setGlobalFooterAffiliateLink] = useState(() => localStorage.getItem('global_footer_affiliate_link') ?? 'https://wa.me/6281346867519?text=Affiliator');
  const [globalFooterSocial1Icon, setGlobalFooterSocial1Icon] = useState(() => localStorage.getItem('global_footer_social1_icon') ?? 'instagram');
  const [globalFooterSocial1Link, setGlobalFooterSocial1Link] = useState(() => localStorage.getItem('global_footer_social1_link') ?? 'https://instagram.com/didesa.id');
  const [globalFooterSocial2Icon, setGlobalFooterSocial2Icon] = useState(() => localStorage.getItem('global_footer_social2_icon') ?? 'tiktok');
  const [globalFooterSocial2Link, setGlobalFooterSocial2Link] = useState(() => localStorage.getItem('global_footer_social2_link') ?? 'https://tiktok.com/@didesa.id');
  const [globalFooterCopyright, setGlobalFooterCopyright] = useState(() => localStorage.getItem('global_footer_copyright') ?? '© 2026 • HAK CIPTA DILINDUNGI');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const social1InputRef = useRef<HTMLInputElement>(null);
  const social2InputRef = useRef<HTMLInputElement>(null);

  // Fetch global_settings from Supabase on mount for cross-device sync
  useEffect(() => {
    const loadFromSupabase = async () => {
      try {
        const { data } = await supabase.from('global_settings').select('key, value');
        if (data && data.length > 0) {
          const apply = (key: string, setter: (v: string) => void) => {
            const row = data.find((r: any) => r.key === key);
            if (row && row.value && row.value.trim() !== '') {
              setter(row.value);
              localStorage.setItem(key, row.value);
            }
          };
          apply('global_app_name', setGlobalName);
          apply('global_app_logo', setGlobalLogo);
          apply('global_app_color', setGlobalColor);
          apply('global_print_footer', setGlobalPrintFooter);
          apply('global_footer_desc', setGlobalFooterDesc);
          apply('global_footer_email', setGlobalFooterEmail);
          apply('global_footer_phone', setGlobalFooterPhone);
          apply('global_footer_affiliate_title', setGlobalFooterAffiliateTitle);
          apply('global_footer_affiliate_subtitle', setGlobalFooterAffiliateSubtitle);
          apply('global_footer_affiliate_link', setGlobalFooterAffiliateLink);
          apply('global_footer_social1_icon', setGlobalFooterSocial1Icon);
          apply('global_footer_social1_link', setGlobalFooterSocial1Link);
          apply('global_footer_social2_icon', setGlobalFooterSocial2Icon);
          apply('global_footer_social2_link', setGlobalFooterSocial2Link);
          apply('global_footer_copyright', setGlobalFooterCopyright);
          window.dispatchEvent(new Event('global_branding_updated'));
        }
      } catch (err) {
        console.warn('Gagal ambil global_settings dari Supabase:', err);
      }
    };
    loadFromSupabase();
  }, []);

  const handleImageUpload = async (file: File, setter: (url: string) => void) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `asset-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      setter(publicUrl);
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Gagal mengunggah. Pastikan ukuran file tidak terlalu besar.');
    }
  };

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
    
    localStorage.setItem('global_app_name', globalName);
    localStorage.setItem('global_app_logo', globalLogo);
    localStorage.setItem('global_app_color', globalColor);
    localStorage.setItem('global_print_footer', globalPrintFooter);
    localStorage.setItem('global_footer_desc', globalFooterDesc);
    localStorage.setItem('global_footer_email', globalFooterEmail);
    localStorage.setItem('global_footer_phone', globalFooterPhone);
    localStorage.setItem('global_footer_affiliate_title', globalFooterAffiliateTitle);
    localStorage.setItem('global_footer_affiliate_subtitle', globalFooterAffiliateSubtitle);
    localStorage.setItem('global_footer_affiliate_link', globalFooterAffiliateLink);
    localStorage.setItem('global_footer_social1_icon', globalFooterSocial1Icon);
    localStorage.setItem('global_footer_social1_link', globalFooterSocial1Link);
    localStorage.setItem('global_footer_social2_icon', globalFooterSocial2Icon);
    localStorage.setItem('global_footer_social2_link', globalFooterSocial2Link);
    localStorage.setItem('global_footer_copyright', globalFooterCopyright);
    
    const payload = {
      global_app_name: globalName,
      global_app_logo: globalLogo,
      global_app_color: globalColor,
      global_print_footer: globalPrintFooter,
      global_footer_desc: globalFooterDesc,
      global_footer_email: globalFooterEmail,
      global_footer_phone: globalFooterPhone,
      global_footer_affiliate_title: globalFooterAffiliateTitle,
      global_footer_affiliate_subtitle: globalFooterAffiliateSubtitle,
      global_footer_affiliate_link: globalFooterAffiliateLink,
      global_footer_social1_icon: globalFooterSocial1Icon,
      global_footer_social1_link: globalFooterSocial1Link,
      global_footer_social2_icon: globalFooterSocial2Icon,
      global_footer_social2_link: globalFooterSocial2Link,
      global_footer_copyright: globalFooterCopyright
    };

    try {
      await fetch('/api/global-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const settingsToSave = Object.entries(payload).map(([key, value]) => ({ key, value }));
      await supabase.from('global_settings').upsert(settingsToSave, { onConflict: 'key' });
    } catch (e) {
      console.error('Error saving global settings:', e);
    }
    
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
      
      const defaultFooterDesc = 'Solusi Digital Terpadu untuk Tata Kelola & Administrasi Desa Mandiri yang Modern dan Transparan.';
      const defaultFooterEmail = 'info@didesa.id';
      const defaultFooterPhone = '+62 813-4686-7519';
      const defaultFooterAffiliateTitle = 'AFFILIATOR';
      const defaultFooterAffiliateSubtitle = 'Mendigitalisasi desa & raih komisi nyata.';
      const defaultFooterAffiliateLink = 'https://wa.me/6281346867519?text=Affiliator';
      const defaultFooterSocial1Icon = 'instagram';
      const defaultFooterSocial1Link = 'https://instagram.com/didesa.id';
      const defaultFooterSocial2Icon = 'tiktok';
      const defaultFooterSocial2Link = 'https://tiktok.com/@didesa.id';
      const defaultFooterCopyright = '© 2026 • HAK CIPTA DILINDUNGI';

      setGlobalName(defaultName);
      setGlobalLogo(defaultLogo);
      setGlobalColor(defaultColor);
      setGlobalPrintFooter(defaultFooter);
      setGlobalFooterDesc(defaultFooterDesc);
      setGlobalFooterEmail(defaultFooterEmail);
      setGlobalFooterPhone(defaultFooterPhone);
      setGlobalFooterAffiliateTitle(defaultFooterAffiliateTitle);
      setGlobalFooterAffiliateSubtitle(defaultFooterAffiliateSubtitle);
      setGlobalFooterAffiliateLink(defaultFooterAffiliateLink);
      setGlobalFooterSocial1Icon(defaultFooterSocial1Icon);
      setGlobalFooterSocial1Link(defaultFooterSocial1Link);
      setGlobalFooterSocial2Icon(defaultFooterSocial2Icon);
      setGlobalFooterSocial2Link(defaultFooterSocial2Link);
      setGlobalFooterCopyright(defaultFooterCopyright);

      localStorage.setItem('global_app_name', defaultName);
      localStorage.setItem('global_app_logo', defaultLogo);
      localStorage.setItem('global_app_color', defaultColor);
      localStorage.setItem('global_print_footer', defaultFooter);
      localStorage.setItem('global_footer_desc', defaultFooterDesc);
      localStorage.setItem('global_footer_email', defaultFooterEmail);
      localStorage.setItem('global_footer_phone', defaultFooterPhone);
      localStorage.setItem('global_footer_affiliate_title', defaultFooterAffiliateTitle);
      localStorage.setItem('global_footer_affiliate_subtitle', defaultFooterAffiliateSubtitle);
      localStorage.setItem('global_footer_affiliate_link', defaultFooterAffiliateLink);
      localStorage.setItem('global_footer_social1_icon', defaultFooterSocial1Icon);
      localStorage.setItem('global_footer_social1_link', defaultFooterSocial1Link);
      localStorage.setItem('global_footer_social2_icon', defaultFooterSocial2Icon);
      localStorage.setItem('global_footer_social2_link', defaultFooterSocial2Link);
      localStorage.setItem('global_footer_copyright', defaultFooterCopyright);

      const resetPayload = {
        global_app_name: defaultName,
        global_app_logo: defaultLogo,
        global_app_color: defaultColor,
        global_print_footer: defaultFooter,
        global_footer_desc: defaultFooterDesc,
        global_footer_email: defaultFooterEmail,
        global_footer_phone: defaultFooterPhone,
        global_footer_affiliate_title: defaultFooterAffiliateTitle,
        global_footer_affiliate_subtitle: defaultFooterAffiliateSubtitle,
        global_footer_affiliate_link: defaultFooterAffiliateLink,
        global_footer_social1_icon: defaultFooterSocial1Icon,
        global_footer_social1_link: defaultFooterSocial1Link,
        global_footer_social2_icon: defaultFooterSocial2Icon,
        global_footer_social2_link: defaultFooterSocial2Link,
        global_footer_copyright: defaultFooterCopyright
      };

      try {
        await fetch('/api/global-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resetPayload)
        });
        const resetSettings = Object.entries(resetPayload).map(([key, value]) => ({ key, value }));
        await supabase.from('global_settings').upsert(resetSettings, { onConflict: 'key' });
      } catch (e) {}

      window.dispatchEvent(new Event('global_branding_updated'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Branding Platform Global</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Konfigurasi visual utama yang akan diterapkan ke seluruh instansi desa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Globe size={18} className="text-emerald-600" />
                  Nama Aplikasi Platform
                </label>
                <input 
                  type="text" 
                  value={globalName}
                  onChange={(e) => setGlobalName(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-slate-900 dark:text-white"
                  placeholder="Contoh: DiDesa, SmartVillage, dll"
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Image size={18} className="text-emerald-600" />
                  Logo Platform (PNG/SVG)
                </label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={globalLogo}
                    onChange={(e) => setGlobalLogo(e.target.value)}
                    className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all text-sm font-mono"
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
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
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
                    className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-500 transition-all font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileText size={18} className="text-emerald-600" />
                  Footer Cetak Surat (HTML)
                </label>
                <textarea 
                  value={globalPrintFooter}
                  onChange={(e) => setGlobalPrintFooter(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all text-sm font-mono"
                  placeholder="Teks footer yang akan tampil di bawah semua dokumen cetak..."
                  rows={3}
                />
                <p className="text-[10px] text-slate-400 font-medium">Gunakan tag HTML ringan seperti &lt;strong&gt; atau &lt;br&gt; jika diperlukan.</p>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe size={20} className="text-emerald-600" />
                  Informasi Footer Website
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4 col-span-1 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Type size={16} className="text-slate-500" />
                      Deskripsi Pendek Footer
                    </label>
                    <textarea 
                      value={globalFooterDesc}
                      onChange={(e) => setGlobalFooterDesc(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Mail size={16} className="text-slate-500" />
                      Email Kontak
                    </label>
                    <input 
                      type="text" 
                      value={globalFooterEmail}
                      onChange={(e) => setGlobalFooterEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Phone size={16} className="text-slate-500" />
                      Nomor Telepon
                    </label>
                    <input 
                      type="text" 
                      value={globalFooterPhone}
                      onChange={(e) => setGlobalFooterPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  <div className="space-y-4 col-span-1 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Type size={16} className="text-slate-500" />
                      Teks Hak Cipta
                    </label>
                    <input 
                      type="text" 
                      value={globalFooterCopyright}
                      onChange={(e) => setGlobalFooterCopyright(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Link size={16} className="text-emerald-600" />
                    Banner Affiliator
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-slate-500 uppercase">Judul (Label)</label>
                      <input 
                        type="text" 
                        value={globalFooterAffiliateTitle}
                        onChange={(e) => setGlobalFooterAffiliateTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-slate-500 uppercase">Teks Subtitle</label>
                      <input 
                        type="text" 
                        value={globalFooterAffiliateSubtitle}
                        onChange={(e) => setGlobalFooterAffiliateSubtitle(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-4 col-span-1 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Tautan (Link Tujuan)</label>
                      <input 
                        type="text" 
                        value={globalFooterAffiliateLink}
                        onChange={(e) => setGlobalFooterAffiliateLink(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Share2 size={16} className="text-emerald-600" />
                    Sosial Media
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Ikon Sosmed 1 (Upload)</label>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                            {globalFooterSocial1Icon ? (
                              globalFooterSocial1Icon.startsWith('http') || globalFooterSocial1Icon.startsWith('data:') ? (
                                <img src={globalFooterSocial1Icon} alt="Social 1" className="w-6 h-6 object-contain" />
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">Lama</span>
                              )
                            ) : (
                              <Image size={16} className="text-slate-400" />
                            )}
                          </div>
                          <button
                            onClick={() => social1InputRef.current?.click()}
                            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                          >
                            Upload Ikon
                          </button>
                          <input 
                            type="file"
                            ref={social1InputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleImageUpload(e.target.files[0], setGlobalFooterSocial1Icon);
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">Gunakan gambar persegi (PNG/SVG) transparan.</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Tautan Sosmed 1</label>
                        <input 
                          type="text" 
                          value={globalFooterSocial1Link}
                          onChange={(e) => setGlobalFooterSocial1Link(e.target.value)}
                          className="w-full mt-2 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Ikon Sosmed 2 (Upload)</label>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                            {globalFooterSocial2Icon ? (
                              globalFooterSocial2Icon.startsWith('http') || globalFooterSocial2Icon.startsWith('data:') ? (
                                <img src={globalFooterSocial2Icon} alt="Social 2" className="w-6 h-6 object-contain" />
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">Lama</span>
                              )
                            ) : (
                              <Image size={16} className="text-slate-400" />
                            )}
                          </div>
                          <button
                            onClick={() => social2InputRef.current?.click()}
                            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                          >
                            Upload Ikon
                          </button>
                          <input 
                            type="file"
                            ref={social2InputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleImageUpload(e.target.files[0], setGlobalFooterSocial2Icon);
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">Gunakan gambar persegi (PNG/SVG) transparan.</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Tautan Sosmed 2</label>
                        <input 
                          type="text" 
                          value={globalFooterSocial2Link}
                          onChange={(e) => setGlobalFooterSocial2Link(e.target.value)}
                          className="w-full mt-2 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
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
            
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl">
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
                <div className="h-10 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center px-4 gap-3">
                  <div className="w-4 h-4 bg-slate-200 rounded" />
                  <div className="h-2 w-20 bg-slate-200 rounded" />
                </div>
                <div className="h-10 rounded-xl flex items-center px-4 gap-3" style={{ backgroundColor: `${globalColor}10` }}>
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: globalColor }} />
                  <div className="h-2 w-24 rounded" style={{ backgroundColor: globalColor }} />
                </div>
                <div className="h-10 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center px-4 gap-3">
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
