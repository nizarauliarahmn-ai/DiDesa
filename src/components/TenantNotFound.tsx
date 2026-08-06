import React, { useState } from 'react';
import { SearchX, Globe, ArrowRight, Loader2, User, Phone, CheckCircle2 } from 'lucide-react';
import { addSaaSNotification } from '../utils/saasLogs';

export default function TenantNotFound() {
  const subdomain = window.location.hostname.split('.')[0];
  const name = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
  
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    nama: '',
    phone: '',
    jabatan: ''
  });

  const handleApply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.nama || !formData.phone) return;

    setIsSubmitting(true);
    try {
      await addSaaSNotification(
        'system',
        'Pengajuan Desa Baru',
        `Pengajuan pendaftaran desa dari ${formData.nama} (${formData.phone}) - Jabatan: ${formData.jabatan || '-'}. Subdomain: ${subdomain}.sistemdidesa.id (Desa ${name}).`,
        name
      );
      
      setIsSuccess(true);
      // Tunggu agak lama agar pesan sukses terbaca
      setTimeout(() => {
        window.location.href = 'https://sistemdidesa.id';
      }, 2500);
    } catch (err) {
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

        {isSuccess ? (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-6 mb-8 animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={24} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Pengajuan Berhasil!</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tim kami akan segera menghubungi Anda melalui WhatsApp untuk proses selanjutnya. Mengalihkan ke halaman utama...
            </p>
          </div>
        ) : showForm ? (
          <form onSubmit={handleApply} className="space-y-4 text-left animate-in slide-in-from-bottom-4 duration-300 mb-8">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Lengkap</label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  required
                  placeholder="Cth: Budi Santoso"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                  value={formData.nama}
                  onChange={e => setFormData({...formData, nama: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nomor WhatsApp</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="tel" 
                  required
                  placeholder="Cth: 08123456789"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Jabatan di Desa <span className="text-slate-400 font-normal">(Opsional)</span></label>
              <input 
                type="text" 
                placeholder="Cth: Kepala Desa / Sekdes"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                value={formData.jabatan}
                onChange={e => setFormData({...formData, jabatan: e.target.value})}
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting || !formData.nama || !formData.phone}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Mengirim Data...</span>
                </>
              ) : (
                <span>Kirim Pengajuan</span>
              )}
            </button>
          </form>
        ) : (
          <button 
            onClick={() => setShowForm(true)}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 group mb-8"
          >
            <span>Ajukan Desa Anda Sekarang</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        )}

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
