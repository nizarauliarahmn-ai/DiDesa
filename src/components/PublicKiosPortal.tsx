import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, Megaphone, ArrowRight, Home } from 'lucide-react';
import { motion } from 'motion/react';

export default function PublicKiosPortal() {
  const [desaName, setDesaName] = useState('Desa Sukamakmur');
  
  useEffect(() => {
    // Attempt to get desa name from URL if provided by Kiosk link, or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const tName = urlParams.get('t_name');
    if (tName) {
      setDesaName(tName);
    } else {
      const storedDesa = localStorage.getItem('kop_desa') || localStorage.getItem('village_name');
      if (storedDesa) setDesaName(storedDesa);
    }
  }, []);

  const navigateTo = (tab: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('tab', tab);
    window.location.search = urlParams.toString();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-emerald-600/90 to-teal-800/90 rounded-b-[4rem] z-0 shadow-2xl"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
      <div className="absolute top-40 -left-20 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl z-0 pointer-events-none"></div>
      
      {/* Header */}
      <header className="relative z-10 pt-16 pb-12 px-8 text-center text-white">
        <h1 className="text-5xl font-black mb-4 tracking-tight">Selamat Datang</h1>
        <p className="text-2xl font-medium text-emerald-50">di Kios Pelayanan Mandiri {desaName}</p>
        <p className="mt-4 text-emerald-100 max-w-2xl mx-auto text-lg">Silakan sentuh salah satu menu di bawah ini untuk memulai layanan mandiri tanpa perlu antre di loket.</p>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-8 pb-12 flex items-center justify-center">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <motion.button 
            whileHover={{ y: -10 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateTo('buku_tamu')}
            className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl shadow-emerald-900/5 border border-gray-100 dark:border-slate-700 text-left flex flex-col h-full group hover:shadow-2xl hover:border-emerald-200 transition-all"
          >
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Buku Tamu</h2>
            <p className="text-gray-500 dark:text-slate-400 text-lg flex-1">Catat kehadiran Anda sebagai tamu atau pengunjung balai desa secara digital.</p>
            <div className="mt-6 flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-lg">
              Mulai <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </div>
          </motion.button>

          <motion.button 
            whileHover={{ y: -10 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateTo('kios_surat')}
            className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-slate-700 text-left flex flex-col h-full group hover:shadow-2xl hover:border-blue-200 transition-all relative overflow-hidden"
          >
            {/* Ribbon */}
            <div className="absolute top-6 -right-10 bg-blue-500 text-white text-xs font-bold py-1 px-10 rotate-45 shadow-md">POPULER</div>
            
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Permohonan Surat</h2>
            <p className="text-gray-500 dark:text-slate-400 text-lg flex-1">Ajukan berbagai jenis surat (SKTM, SKU, dll) hanya dengan NIK Anda.</p>
            <div className="mt-6 flex items-center text-blue-600 dark:text-blue-400 font-bold text-lg">
              Mulai <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </div>
          </motion.button>

          <motion.button 
            whileHover={{ y: -10 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateTo('kios_aspirasi')}
            className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl shadow-amber-900/5 border border-gray-100 dark:border-slate-700 text-left flex flex-col h-full group hover:shadow-2xl hover:border-amber-200 transition-all"
          >
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Megaphone className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Aduan Warga</h2>
            <p className="text-gray-500 dark:text-slate-400 text-lg flex-1">Sampaikan aspirasi, saran, atau pengaduan layanan secara anonim maupun resmi.</p>
            <div className="mt-6 flex items-center text-amber-600 dark:text-amber-400 font-bold text-lg">
              Mulai <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </div>
          </motion.button>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-400 dark:text-slate-500 font-medium">
        DiDesa Smart Village System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
