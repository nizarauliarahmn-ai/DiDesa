import React, { useState } from 'react';
import { SearchX, Globe, ArrowRight, Loader2, User, Phone, CheckCircle2, MapPin, Mail, Lock, Eye, EyeOff, Building2 } from 'lucide-react';
import { addSaaSNotification } from '../utils/saasLogs';
import { addSaaSTenantRequest } from '../utils/saasLeads';
import { supabase } from '../utils/supabase';
import { showToast } from '../utils/toast';

export default function TenantNotFound() {
  const subdomain = window.location.hostname.split('.')[0];
  const name = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    desa: name,
    kecamatan: '',
    kabupaten: '',
    operator: '',
    email: '',
    phone: '',
    password: ''
  });

  const normalizePhone = (p: string) => {
    let digits = (p || '').replace(/[^\d]/g, '');
    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    return digits;
  };

  const handleApply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const { desa, operator, email, phone, password } = formData;
    if (!desa.trim() || !operator.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setErrorMsg('Lengkapi semua kolom wajib terlebih dahulu.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Format email resmi desa tidak valid. Contoh: admin@desaanda.id');
      return;
    }
    if (!/^(0|62)\d{8,13}$/.test(phone.replace(/[\s-]/g, ''))) {
      setErrorMsg('Format nomor WhatsApp tidak valid. Gunakan format Indonesia, contoh: 08123456789 atau +628123456789.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Simpan data desa (tenant) dengan status pending_approval
      const kodeDesa = 'PEND-' + Date.now().toString(36).toUpperCase();
      const cleanDesa = desa.trim();
      const normalizedPhone = normalizePhone(phone);

      const { data: inserted, error } = await supabase.from('tenants').insert([{
        kode_desa: kodeDesa,
        nama_desa: cleanDesa,
        domain: subdomain,
        status: 'pending_approval',
        admin_email: email.trim(),
        admin_password: password,
        kades_email: '',
        kades_password: '',
        kecamatan: formData.kecamatan.trim(),
        kabupaten: formData.kabupaten.trim(),
        kontak: phone.trim()
      }]).select().single();

      if (error) throw error;
      if (!inserted) throw new Error('Gagal menyimpan pendaftaran.');

      // 2. Catat lead agar muncul di tab "Prospek & Pengajuan" SaaS
      await addSaaSTenantRequest({
        subdomain,
        villageName: cleanDesa,
        applicantName: operator.trim(),
        phone: normalizedPhone,
        jobTitle: 'Pendaftar',
      });

      // 3. Kirim notifikasi ke pusat SaaS
      await addSaaSNotification(
        'system',
        'Pengajuan Desa Baru',
        `Pendaftaran ${cleanDesa} (${normalizedPhone}) diajukan oleh ${operator.trim()}. Email: ${email.trim()}. Kecamatan: ${formData.kecamatan.trim() || '-'}. Kabupaten: ${formData.kabupaten.trim() || '-'}. Subdomain: ${subdomain}.sistemdidesa.id`,
        cleanDesa
      );

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error submitting village registration:', err);
      const reason = (err?.message || '').toLowerCase();
      if (reason.includes('duplicate') || reason.includes('unique') || reason.includes('already')) {
        setErrorMsg('Desa dengan subdomain ini sudah pernah terdaftar/diajukan. Silakan hubungi Tim DiDesa untuk bantuan.');
      } else {
        setErrorMsg('Koneksi gagal saat mengirim pendaftaran. Silakan coba lagi.');
      }
      showToast('Pendaftaran gagal dikirim.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#047857_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

      <div className="max-w-lg w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 text-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
        {isSuccess ? (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-8 animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={28} strokeWidth={2} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Pendaftaran Berhasil!</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              Akun Anda sedang dalam proses verifikasi oleh Tim DiDesa. Kami akan menghubungi Anda via WhatsApp setelah akun disetujui.
            </p>
            <a
              href="https://sistemdidesa.id"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/30"
            >
              <Globe size={16} />
              Kembali ke sistemdidesa.id
            </a>
          </div>
        ) : showForm ? (
          <>
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-5 text-blue-500">
              <Building2 size={32} strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Pendaftaran Desa Baru</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
              Lengkapi data desa Anda. Tim DiDesa akan memverifikasi dan menghubungi Anda via WhatsApp setelah akun disetujui.
            </p>

            <form onSubmit={handleApply} className="space-y-4 text-left animate-in slide-in-from-bottom-4 duration-300 mb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Desa</label>
                  <div className="relative">
                    <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={formData.desa}
                      onChange={e => setFormData({ ...formData, desa: e.target.value })}
                      placeholder="Contoh: Desa Sukamakmur"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kecamatan</label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={formData.kecamatan}
                      onChange={e => setFormData({ ...formData, kecamatan: e.target.value })}
                      placeholder="Contoh: Simpur"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kabupaten</label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={formData.kabupaten}
                      onChange={e => setFormData({ ...formData, kabupaten: e.target.value })}
                      placeholder="Contoh: Hulu Sungai Selatan"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Operator / Pendaftar</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={formData.operator}
                      onChange={e => setFormData({ ...formData, operator: e.target.value })}
                      placeholder="Cth: Budi Santoso"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Resmi Desa <span className="text-slate-400 font-normal">(digunakan untuk login)</span></label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Cth: admin@desaanda.id"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nomor WhatsApp Aktif Desa</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      required
                      inputMode="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Cth: 08123456789"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Gunakan format nomor Indonesia (08xx atau +62). Nomor ini dipakai tim untuk konfirmasi persetujuan.</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kata Sandi</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
                      title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-xl px-3 py-2.5">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Mengirim Pengajuan...</span>
                  </>
                ) : (
                  <span>Kirim Pendaftaran</span>
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
              <SearchX size={40} strokeWidth={1.5} />
            </div>

            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Desa Belum Terdaftar</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Sistem belum menemukan data untuk Desa <strong>{name}</strong>. Jika Anda adalah perangkat desa ini, Anda dapat mendaftarkan desa Anda ke dalam ekosistem DiDesa.
            </p>

            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 group mb-8"
            >
              <span>Ajukan Desa Anda Sekarang</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </>
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