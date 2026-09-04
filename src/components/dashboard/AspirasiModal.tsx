import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, CheckCircle, Loader2, CloudUpload, Info } from 'lucide-react';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

interface Props {
  onClose: () => void;
}

const categories = [
  { value: 'pengaduan', label: 'Pengaduan (Laporan)' },
  { value: 'saran', label: 'Saran' },
  { value: 'kritik', label: 'Kritik' },
  { value: 'aspirasi_umum', label: 'Aspirasi Umum' },
];

export default function AspirasiModal({ onClose }: Props) {
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('');
  const [subjek, setSubjek] = useState('');
  const [pesan, setPesan] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kategori) {
      showToast('Harap pilih kategori aspirasi', 'error');
      return;
    }
    if (!subjek.trim()) {
      showToast('Harap isi subjek aspirasi', 'error');
      return;
    }
    if (!pesan.trim()) {
      showToast('Harap isi deskripsi aspirasi', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) {
        showToast('Gagal mengirim aspirasi', 'error');
        return;
      }

      const { error } = await supabase.from('aspirasi').insert([{
        tenant_id: tenantId,
        kategori,
        subjek: subjek.trim(),
        pesan: pesan.trim(),
        nama_pengirim: nama.trim() || 'Anonim',
        nama: nama.trim() || 'Anonim',
        judul: subjek.trim(),
        status: 'Baru',
      }]);

      if (error) throw error;

      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`,
        tenant_id: tenantId,
        title: `Aspirasi Warga: ${kategori}`,
        message: `${nama.trim() || 'Anonim'} mengirim aspirasi: "${subjek.trim()}"`,
        category: 'Services',
        is_read: false,
        timestamp: new Date().toISOString(),
      }]);

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengirim aspirasi. Coba lagi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Kirim Aspirasi & Laporan</h3>
                <p className="text-[11px] text-slate-400">Formulir digital untuk layanan pengaduan dan saran warga.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="p-6">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-10 space-y-4"
              >
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Aspirasi Terkirim!</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Laporan Anda berhasil dikirim ke pemerintah desa. Terima kasih atas partisipasi Anda.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2.5 bg-emerald-700 text-white rounded-xl text-sm font-bold hover:bg-emerald-800 transition-colors"
                >
                  Tutup
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nama */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Nama Lengkap (Opsional)
                  </label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Masukkan nama Anda (kosongkan jika anonim)"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                {/* Kategori */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Kategori Aspirasi
                  </label>
                  <select
                    required
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Subjek */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Subjek
                  </label>
                  <input
                    list="modal-subjek-options"
                    type="text"
                    required
                    value={subjek}
                    onChange={(e) => setSubjek(e.target.value)}
                    placeholder="Pilih atau ketik ringkasan singkat aspirasi Anda"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                  />
                  <datalist id="modal-subjek-options">
                    <option value="Infrastruktur Jalan Rusak" />
                    <option value="Pelayanan Administrasi Desa" />
                    <option value="Fasilitas Kesehatan/Posyandu" />
                    <option value="Bantuan Sosial (Bansos)" />
                    <option value="Kebersihan dan Lingkungan" />
                    <option value="Lampu Penerangan Jalan" />
                  </datalist>
                </div>

                {/* Deskripsi Detail */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Deskripsi Detail
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={pesan}
                    onChange={(e) => setPesan(e.target.value)}
                    placeholder="Ceritakan aspirasi Anda secara mendalam agar kami dapat menindaklanjuti dengan tepat..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                  />
                </div>

                {/* Lampiran */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Lampiran Foto/Dokumen (Opsional)
                  </label>
                  <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group block w-full text-center">
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
                    }} />
                    {!file ? (
                      <>
                        <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <CloudUpload className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Klik untuk unggah berkas</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Format: JPG, PNG, PDF (Maks. 5MB)</p>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-xs font-bold text-emerald-700">{file.name}</p>
                        <p className="text-[10px] text-emerald-600/70 font-medium">Klik untuk mengubah berkas</p>
                      </>
                    )}
                  </label>
                </div>

                {/* Info */}
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-800/40">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="text-xs font-medium leading-relaxed">
                    Setiap masukan atau laporan akan diproses dalam 2x24 jam kerja.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-emerald-700 text-white font-bold rounded-xl text-sm hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] shadow-lg shadow-emerald-700/20"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Kirim Aspirasi</>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
