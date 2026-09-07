import React, { useState } from 'react';
import { Building2, Mail, Lock, User, ArrowRight, CheckCircle2, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface TrialRegistrationProps {
  onBack: () => void;
  onSuccess: (tenantDomain: string) => void;
}

export default function TrialRegistration({ onBack, onSuccess }: TrialRegistrationProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    namaDesa: '',
    namaAdmin: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.namaDesa.trim() || !form.namaAdmin.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Semua field wajib diisi.');
      return;
    }

    if (!form.email.includes('@') || !form.email.includes('.')) {
      setError('Format email tidak valid.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      const cleanDomain = form.namaDesa.toLowerCase().trim()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
        .replace(/^https?:\/\//, '')
        .split('.')[0];

      const { data: existing } = await supabase
        .from('tenants')
        .select('id')
        .eq('domain', cleanDomain)
        .single();

      if (existing) {
        setError('Nama desa/domain sudah digunakan. Silakan gunakan nama lain.');
        setIsLoading(false);
        return;
      }

      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      const tenantPayload = {
        nama_desa: `DiDesa ${form.namaDesa}`,
        domain: cleanDomain,
        admin_email: form.email,
        admin_password: form.password,
        kades_email: `kades@${cleanDomain}`,
        kades_password: 'kades123',
        status: 'active',
        trial_end: trialEnd.toISOString()
      };

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([tenantPayload])
        .select()
        .single();

      if (tenantError) {
        console.error('Tenant insert error:', tenantError);
        setError('Gagal membuat akun desa. Silakan coba lagi.');
        setIsLoading(false);
        return;
      }

      setStep('success');

      setTimeout(() => {
        onSuccess(cleanDomain);
      }, 3000);

    } catch (err) {
      console.error('Registration error:', err);
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Akun Trial Berhasil Dibuat!</h2>
          <p className="text-gray-600 mb-6">
            Akun percobaan 14 hari untuk <strong>{form.namaDesa}</strong> telah aktif.
            Anda akan dialihkan ke halaman login...
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Mengalihkan...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10 max-w-md w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Kembali</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Coba Gratis 14 Hari</h1>
          <p className="text-gray-500 mt-2 text-sm">Buat akun desa Anda dan nikmati semua fitur premium</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Desa</label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={form.namaDesa}
                onChange={e => handleChange('namaDesa', e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                placeholder="Contoh: Wasah Hilir"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Admin</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={form.namaAdmin}
                onChange={e => handleChange('namaAdmin', e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                placeholder="Nama lengkap admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Admin</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                placeholder="admin@desa.id"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                placeholder="Minimal 6 karakter"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Konfirmasi Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => handleChange('confirmPassword', e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                placeholder="Ulangi password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 mt-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Membuat Akun...</span>
              </>
            ) : (
              <>
                <span>Mulai Trial Gratis</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Trial 14 hari • Tanpa kartu kredit • Bisa di-cancel kapan saja
        </p>
      </div>
    </div>
  );
}
