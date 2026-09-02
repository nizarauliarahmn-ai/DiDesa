import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Send, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { getVisibleSuratList, getFormFields } from '../../config/suratConfig';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

interface Props {
  onClose: () => void;
}

export default function PermohonanSuratModal({ onClose }: Props) {
  const [letterTypes, setLetterTypes] = useState<any[]>([]);
  const [selectedLetter, setSelectedLetter] = useState('');
  const [formData, setFormData] = useState({
    nama: '',
    nik: '',
    alamat: '',
    noWa: '',
  });
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const list = getVisibleSuratList();
    setLetterTypes(list);
    if (list.length > 0) setSelectedLetter(list[0].jenis);
  }, []);

  useEffect(() => {
    if (selectedLetter) {
      const fields = getFormFields(selectedLetter);
      setDynamicFields(fields);
      setExtraFields({});
    }
  }, [selectedLetter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleExtraField = (id: string, value: string) => {
    setExtraFields({ ...extraFields, [id]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.nik || !formData.alamat || !formData.noWa) {
      showToast('Harap isi semua field yang diperlukan', 'error');
      return;
    }
    if (!/^\d{16}$/.test(formData.nik)) {
      showToast('NIK harus 16 digit angka', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) {
        showToast('Gagal memproses permohonan', 'error');
        return;
      }

      const { error } = await supabase.from('surat').insert([{
        tenant_id: tenantId,
        jenis_surat: selectedLetter,
        nama: formData.nama,
        nik: formData.nik,
        keterangan: `Permohonan via portal warga — ${selectedLetter}`,
        status: 'pending',
        nomor: 'PENDING',
        data: { alamat: formData.alamat, no_wa: formData.noWa, ...extraFields },
      }]);

      if (error) throw error;

      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`,
        tenant_id: tenantId,
        title: 'Permohonan Surat Portal Warga',
        message: `${formData.nama} (NIK: ${formData.nik}) mengajukan ${selectedLetter} via portal warga`,
        category: 'Services',
        is_read: false,
        timestamp: new Date().toISOString(),
      }]);

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengirim permohonan. Coba lagi.', 'error');
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
                <FileText className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Permohonan Surat</h3>
                <p className="text-[11px] text-slate-400">Pilih jenis surat dan lengkapi data diri</p>
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
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Permohonan Terkirim!</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Permohonan surat <strong>{selectedLetter}</strong> atas nama <strong>{formData.nama}</strong> berhasil dikirim.
                  Silakan ambil surat di kantor desa setelah diverifikasi admin.
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
                {/* Jenis Surat */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Jenis Surat
                  </label>
                  <select
                    value={selectedLetter}
                    onChange={(e) => setSelectedLetter(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  >
                    {letterTypes.map((lt) => (
                      <option key={lt.id || lt.klasifikasi} value={lt.jenis}>
                        {lt.jenis} — {lt.deskripsi || lt.klasifikasi}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nama */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    name="nama"
                    value={formData.nama}
                    onChange={handleChange}
                    required
                    placeholder="Sesuai KTP"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                {/* NIK */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    NIK
                  </label>
                  <input
                    type="text"
                    name="nik"
                    value={formData.nik}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                      setFormData({ ...formData, nik: v });
                    }}
                    required
                    maxLength={16}
                    placeholder="16 digit NIK"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono"
                  />
                </div>

                {/* Alamat */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    Alamat Lengkap
                  </label>
                  <input
                    type="text"
                    name="alamat"
                    value={formData.alamat}
                    onChange={handleChange}
                    required
                    placeholder="RT/RW, Dusun, Desa"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                {/* No WhatsApp */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    name="noWa"
                    value={formData.noWa}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 15);
                      setFormData({ ...formData, noWa: v });
                    }}
                    required
                    placeholder="08xxx"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                {/* Dynamic Extra Fields */}
                {dynamicFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={extraFields[field.id] || ''}
                        onChange={(e) => handleExtraField(field.id, e.target.value)}
                        required={field.required}
                        rows={3}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={extraFields[field.id] || ''}
                        onChange={(e) => handleExtraField(field.id, e.target.value)}
                        required={field.required}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      >
                        <option value="">Pilih...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                        value={extraFields[field.id] || ''}
                        onChange={(e) => handleExtraField(field.id, e.target.value)}
                        required={field.required}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    )}
                  </div>
                ))}

                {/* Info */}
                <div className="flex items-start gap-2.5 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Surat akan diproses oleh admin desa. Setelah selesai, Anda akan dihubungi via WhatsApp untuk pengambilan di kantor desa.
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-emerald-700 text-white font-bold rounded-xl text-sm hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Kirim Permohonan</>
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
