import React, { useState } from 'react';
import { SearchX, Globe, ArrowRight, Loader2 } from 'lucide-react';
import { addSaaSNotification } from '../utils/saasLogs';

export default function TenantNotFound() {
  const subdomain = window.location.hostname.split('.')[0];
  const name = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      await addSaaSNotification(
        'system',
        'Pengajuan Desa Baru',
        `Ada pengguna yang tertarik untuk mendaftarkan subdomain ${subdomain}.sistemdidesa.id (Desa ${name}).`,
        name
      );
      // Tunggu sebentar agar efek UI terasa
      setTimeout(() => {
        window.location.href = 'https://sistemdidesa.id';
      }, 800);
    } catch (e) {
      window.location.href = 'https://sistemdidesa.id';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#047857_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />
      
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 text-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
          <SearchX size={40} strokeWidth={1.5} />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Desa Belum Terdaftar</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Sistem belum menemukan data untuk Desa <strong>{name}</strong>. Jika Anda adalah perangkat desa ini, Anda dapat mendaftarkan desa Anda ke dalam ekosistem DiDesa.
        </p>

        <button 
          onClick={handleApply}
          disabled={isSubmitting}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 group"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Memproses Pengajuan...</span>
            </>
          ) : (
            <>
              <span>Ajukan Desa Anda Sekarang</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
          <a href="https://sistemdidesa.id" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-2">
            <Globe size={16} />
            Kunjungi sistemdidesa.id
          </a>
        </div>
      </div>
    </div>
  );
}
