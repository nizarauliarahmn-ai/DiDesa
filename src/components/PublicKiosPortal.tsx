import { useState, useEffect } from 'react';
import { BookOpen, FileText, Megaphone, ArrowRight, ShieldCheck, Zap, Star, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { supabase } from '../utils/supabase';
import KioskKtpRealtimeListener from './KioskKtpRealtimeListener';

export default function PublicKiosPortal() {
  const [desaName, setDesaName] = useState('');
  const [isTenantValid, setIsTenantValid] = useState<boolean | null>(null);
  const [isDark, setIsDark] = useState(true);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    const tIdParam = urlParams.get('t_id');
    
    if (!tenantParam && !tIdParam) {
      setIsTenantValid(false);
      return;
    }

    setIsTenantValid(true);
    const tName = urlParams.get('t_name');
    if (tName) {
      setDesaName(tName);
    } else {
      const storedDesa = localStorage.getItem('kop_desa') || localStorage.getItem('village_name');
      if (storedDesa) setDesaName(storedDesa);
    }
    
    resolveCurrentTenant().then((id) => {
      if (!id) return;
      const channel = supabase.channel(`kiosk-notif-${id}`)
        .on('broadcast', { event: 'incoming-guest' }, ({ payload }) => {
          localStorage.setItem('kiosk_incoming_guest', JSON.stringify(payload));
          const p = new URLSearchParams(window.location.search);
          p.set('tab', 'buku_tamu');
          window.location.search = p.toString();
        })
        .on('broadcast', { event: 'incoming-permohonan' }, ({ payload }) => {
          localStorage.setItem('kiosk_incoming_permohonan', JSON.stringify(payload));
          const p = new URLSearchParams(window.location.search);
          p.set('tab', 'kios_surat');
          window.location.search = p.toString();
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      }
    });
  }, []);

  const navigateTo = (tab: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('tab', tab);
    window.location.search = urlParams.toString();
  };

  return (
    <>
      {/* Realtime listener untuk Remote KTP Scanner dari Admin */}
      <KioskKtpRealtimeListener />
      <div className={`min-h-screen flex flex-col font-sans select-none overflow-hidden relative transition-colors duration-300 ${isDark ? 'bg-[#0f172a] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      
      {isTenantValid === false && (
        <div className="absolute inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-8 backdrop-blur-md">
          <div className="bg-slate-800 rounded-3xl p-10 max-w-lg text-center shadow-2xl border border-slate-700">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Akses Ditolak</h2>
            <p className="text-slate-400 text-lg mb-8">Kios Belum Dikonfigurasi. Silakan buka tautan Kios melalui Dashboard Admin Desa Anda agar kode desa dapat terbaca dengan benar.</p>
          </div>
        </div>
      )}

      {/* Dynamic Background Effects */}
      {isDark && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
          <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
        </>
      )}

      {/* Theme Toggle */}
      <button
        onClick={() => setIsDark(!isDark)}
        className={`fixed top-6 right-6 z-50 p-3 rounded-full transition-all duration-300 cursor-pointer ${
          isDark 
            ? 'bg-slate-800/80 hover:bg-slate-700 text-yellow-400 border border-slate-700/50' 
            : 'bg-white/80 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-lg'
        }`}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Header */}
      <header className="relative z-10 pt-20 pb-12 px-8 text-center flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="hidden"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-slate-300">PORTAL RESMI PELAYANAN DESA</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className={`text-5xl md:text-7xl font-black mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 pb-2 ${!isDark ? 'from-emerald-600 via-teal-500 to-cyan-600' : ''}`}
        >
          Portal Warga
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={`text-xl md:text-3xl font-medium mb-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
        >
          Pemerintah Desa <span className={`font-bold whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900'}`}>{desaName.replace(/^(DiDesa|Desa)\s+/i, '')}</span>
        </motion.p>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className={`max-w-2xl mx-auto text-lg md:text-xl leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
        >
          Pusat layanan digital mandiri yang dikelola oleh <a href="https://sistemdidesa.id" target="_blank" rel="noopener noreferrer" className={`font-bold hover:underline ${isDark ? 'text-white' : 'text-emerald-600'}`}>sistemdidesa.id</a>. Silakan pilih menu di bawah ini untuk memulai layanan.
        </motion.p>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-6 pb-20 flex items-center justify-center">
        <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          
          {/* Card 1 */}
          <motion.button 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigateTo('buku_tamu')}
            className={`group relative backdrop-blur-xl rounded-[2rem] p-8 border text-left flex flex-col h-full transition-all overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60' : 'bg-white/80 border-slate-200 hover:bg-white shadow-lg'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-3">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h2 className={`relative z-10 text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Buku Tamu</h2>
            <p className={`relative z-10 text-lg flex-1 leading-relaxed transition-colors ${isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-600'}`}>
              Catat kehadiran Anda sebagai tamu atau pengunjung balai desa secara digital dengan mudah.
            </p>
            <div className="relative z-10 mt-8 flex items-center text-emerald-400 font-bold text-xl group-hover:text-emerald-300 transition-colors">
              Buka Layanan <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-3 transition-transform duration-300" />
            </div>
          </motion.button>

          {/* Card 2 */}
          <motion.button 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigateTo('kios_surat')}
            className={`group relative backdrop-blur-xl rounded-[2rem] p-8 border text-left flex flex-col h-full transition-all overflow-hidden ring-1 ring-blue-500/20 hover:ring-blue-500/50 ${isDark ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60' : 'bg-white/80 border-slate-200 hover:bg-white shadow-lg'}`}
          >
            {/* Ribbon */}
            <div className="absolute top-8 -right-12 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-black py-1.5 px-12 rotate-45 shadow-lg shadow-blue-500/30 z-20 tracking-wider">
              FAVORIT
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-500 group-hover:-rotate-3">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h2 className={`relative z-10 text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Permohonan Surat</h2>
            <p className={`relative z-10 text-lg flex-1 leading-relaxed transition-colors ${isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-600'}`}>
              Ajukan berbagai jenis surat administrasi desa (SKTM, SKU, dll) secara mandiri hanya menggunakan NIK Anda.
            </p>
            <div className="relative z-10 mt-8 flex items-center text-blue-400 font-bold text-xl group-hover:text-blue-300 transition-colors">
              Buka Layanan <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-3 transition-transform duration-300" />
            </div>
          </motion.button>

          {/* Card 3 */}
          <motion.button 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigateTo('kios_aspirasi')}
            className={`group relative backdrop-blur-xl rounded-[2rem] p-8 border text-left flex flex-col h-full transition-all overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60' : 'bg-white/80 border-slate-200 hover:bg-white shadow-lg'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-3">
              <Megaphone className="w-10 h-10 text-white" />
            </div>
            <h2 className={`relative z-10 text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Aduan Warga</h2>
            <p className={`relative z-10 text-lg flex-1 leading-relaxed transition-colors ${isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-600'}`}>
              Sampaikan aspirasi, saran, atau pengaduan layanan kepada pemerintah desa secara anonim maupun resmi.
            </p>
            <div className="relative z-10 mt-8 flex items-center text-amber-400 font-bold text-xl group-hover:text-amber-300 transition-colors">
              Buka Layanan <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-3 transition-transform duration-300" />
            </div>
          </motion.button>

          {/* Card 4 - Indeks Kepuasan */}
          <motion.button 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigateTo('kios_kepuasan')}
            className={`group relative backdrop-blur-xl rounded-[2rem] p-8 border text-left flex flex-col h-full transition-all overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60' : 'bg-white/80 border-slate-200 hover:bg-white shadow-lg'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-3">
              <Star className="w-10 h-10 text-white" />
            </div>
            <h2 className={`relative z-10 text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Indeks Kepuasan</h2>
            <p className={`relative z-10 text-lg flex-1 leading-relaxed transition-colors ${isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-600'}`}>
              Beri penilaian dan ulasan Anda terhadap kualitas pelayanan desa hari ini.
            </p>
            <div className="relative z-10 mt-8 flex items-center text-violet-400 font-bold text-xl group-hover:text-violet-300 transition-colors">
              Buka Layanan <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-3 transition-transform duration-300" />
            </div>
          </motion.button>

        </div>
      </main>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className={`py-8 flex flex-col items-center justify-center gap-6 font-medium z-10 relative mt-auto border-t ${isDark ? 'text-slate-500 border-slate-800/50' : 'text-slate-400 border-slate-200'}`}
      >
        <button 
          onClick={() => {
            const p = new URLSearchParams(window.location.search);
            const t = p.get('tenant') || p.get('t_id');
            window.location.search = t ? `?mode=public&tab=layanan_mandiri&tenant=${t}` : `?mode=public&tab=layanan_mandiri`;
          }}
          className="group text-emerald-400 hover:text-emerald-300 font-bold transition-all flex items-center gap-3 bg-slate-800/50 px-6 py-3 rounded-full backdrop-blur-md border border-slate-700/50 hover:bg-slate-700/50 hover:shadow-lg hover:shadow-emerald-900/20"
        >
          <Zap className="w-5 h-5 group-hover:animate-pulse" />
          Lihat Dashboard Publik <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
        <p className="tracking-wider text-sm">&copy; {new Date().getFullYear()} DiDesa. Sistem Pemerintahan Desa Modern.</p>
      </motion.footer>
      </div>
    </>
  );
}
