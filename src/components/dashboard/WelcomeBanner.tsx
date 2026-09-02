import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Shield } from 'lucide-react';

export default function WelcomeBanner({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const [desaName, setDesaName] = React.useState(() => localStorage.getItem('kop_desa') || 'Desa Sukamakmur');

  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Sukamakmur');
    };
    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('village_settings_updated', handleSettingsUpdate);
  }, []);

  const cleanDesaName = desaName.replace(/desa|kelurahan/gi, '').trim();

  const handleNav = (tabId: string) => {
    if (onTabChange) onTabChange(tabId);
    const target = document.getElementById(`section-${tabId}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-100 p-8 sm:p-10">
      <div className="max-w-2xl space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold tracking-wide"
        >
          <Shield className="w-3.5 h-3.5" />
          Portal Resmi {desaName}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight"
        >
          Pusat Pelayanan &{' '}
          <span className="text-emerald-700">Digitalisasi Desa</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-slate-500 text-sm font-medium leading-relaxed max-w-lg"
        >
          Layanan persuratan, transparansi anggaran, dan aspirasi warga {cleanDesaName} secara digital — kapan saja, di mana saja.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <button
            onClick={() => handleNav('layanan_mandiri')}
            className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-5 py-3 font-bold text-sm transition-all shadow-sm active:scale-95 flex items-center gap-2 cursor-pointer group"
          >
            Mulai Layanan Mandiri
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
