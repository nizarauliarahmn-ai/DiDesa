import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { loadAppSettings } from '../../utils/appSettings';

export default function Footer({ isAdmin = false }: { isAdmin?: boolean }) {
  // Global Branding
  const [globalName, setGlobalName] = useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalLogo, setGlobalLogo] = useState(() => localStorage.getItem('global_app_logo') || '');
  const [globalColor, setGlobalColor] = useState(() => localStorage.getItem('global_app_color') || '#047857');
  const [globalFooterCopyright, setGlobalFooterCopyright] = useState(() => localStorage.getItem('global_footer_copyright') ?? '© 2026 DiDesa Indonesia. Hak Cipta Dilindungi.');

  // App settings (dinamis, via 'global_app_settings' di localStorage / nanti Supabase settings)
  const [appSettings, setAppSettings] = useState(loadAppSettings);

  useEffect(() => {
    const handleBrandingUpdate = () => {
      setGlobalName(localStorage.getItem('global_app_name') || 'DiDesa');
      setGlobalLogo(localStorage.getItem('global_app_logo') || '');
      setGlobalColor(localStorage.getItem('global_app_color') || '#047857');
      setGlobalFooterCopyright(localStorage.getItem('global_footer_copyright') ?? '© 2026 DiDesa Indonesia. Hak Cipta Dilindungi.');
      setAppSettings(loadAppSettings());
    };

    window.addEventListener('global_branding_updated', handleBrandingUpdate);

    return () => {
      window.removeEventListener('global_branding_updated', handleBrandingUpdate);
    };
  }, []);

  const handleScrollToTop = () => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="print:hidden w-full mt-auto pt-6 pb-4 px-6 border-t border-slate-200/80 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Sisi Kiri: Brand & Copyright */}
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded-md flex items-center justify-center text-white font-black text-[8px] shadow-sm overflow-hidden shrink-0"
            style={{ backgroundColor: globalColor }}
          >
            {globalLogo ? (
              <img src={globalLogo} alt={globalName} className="w-3 h-3 object-contain" />
            ) : (
              globalName.charAt(0)
            )}
          </span>
          {globalName} <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">v5.3</span>
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span>{globalFooterCopyright}</span>
      </div>

      {/* Sisi Tengah: Link Legal & Kontak */}
      <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 font-medium">
        <a href={appSettings.termsUrl || '/syarat-ketentuan'} className="hover:text-emerald-600 transition-colors">Syarat &amp; Ketentuan</a>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <a href={appSettings.privacyUrl || '/kebijakan-privasi'} className="hover:text-emerald-600 transition-colors">Kebijakan Privasi</a>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <a href="mailto:info@didesa.id" className="hover:text-emerald-600 transition-colors">Bantuan &amp; Kontak</a>
      </div>

      {/* Sisi Kanan: Scroll To Top */}
      <button
        onClick={handleScrollToTop}
        className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 font-medium transition-colors cursor-pointer"
      >
        <span>Kembali Ke Atas</span>
        <ArrowUp className="w-3.5 h-3.5" />
      </button>
    </footer>
  );
}