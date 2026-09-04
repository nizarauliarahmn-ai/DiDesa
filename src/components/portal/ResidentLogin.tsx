import React, { useState } from 'react';
import { User, Phone, MapPin, Home, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

interface ResidentLoginProps {
  onLoginSuccess: (resident: { nik: string; name: string; phone?: string; tenantId: string }) => void;
  onBack: () => void;
}

export default function ResidentLogin({ onLoginSuccess, onBack }: ResidentLoginProps) {
  const [step, setStep] = useState<'nik' | 'register'>('nik');
  const [nik, setNik] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regRt, setRegRt] = useState('');
  const [regRw, setRegRw] = useState('');

  const handleNikSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nik.length < 5) { setError('NIK minimal 5 digit'); return; }
    setLoading(true);
    setError('');
    try {
      const tid = await resolveCurrentTenant();
      if (!tid) { setError('Gagal mengenali desa'); setLoading(false); return; }

      const { data } = await supabase
        .from('residents')
        .select('nik, name, no_whatsapp, address, rt, rw')
        .eq('nik', nik)
        .eq('tenant_id', tid)
        .limit(1)
        .maybeSingle();

      if (data) {
        const resident = { nik: data.nik, name: data.name, phone: data.no_whatsapp || '', tenantId: tid };
        localStorage.setItem('didesa_resident_user', JSON.stringify(resident));
        onLoginSuccess(resident);
      } else {
        setStep('register');
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) { setError('Nama wajib diisi'); return; }
    setLoading(true);
    setError('');
    try {
      const tid = await resolveCurrentTenant();
      if (!tid) { setError('Gagal mengenali desa'); setLoading(false); return; }

      const { error: insertErr } = await supabase.from('residents').insert({
        tenant_id: tid,
        nik,
        name: regName.trim(),
        no_whatsapp: regPhone.trim() || null,
        address: regAddress.trim() || null,
        rt: regRt || null,
        rw: regRw || null,
        status: 'Aktif',
        status_color: 'emerald',
        gender: 'Laki-laki',
        birth_date: null,
        birth_place: null,
        age: null,
        religion: null,
        education: null,
        job: null,
        marital_status: null,
        family_relation: null,
      });

      if (insertErr) {
        console.error(insertErr);
        setError('Gagal mendaftar: ' + insertErr.message);
        setLoading(false);
        return;
      }

      const resident = { nik, name: regName.trim(), phone: regPhone.trim(), tenantId: tid };
      localStorage.setItem('didesa_resident_user', JSON.stringify(resident));
      onLoginSuccess(resident);
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
        <div className="w-full max-w-md">
          <button onClick={() => { setStep('nik'); setError(''); }} className="text-sm text-emerald-700 hover:text-emerald-800 mb-4 font-semibold">&larr; Kembali</button>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Daftar Sebagai Warga</h2>
              <p className="text-sm text-slate-500 mt-1">NIK <span className="font-mono font-bold text-emerald-700">{nik}</span> belum terdaftar. Lengkapi data berikut:</p>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nama Lengkap *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Nama sesuai KTP" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">No. WhatsApp</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="08xxxxxxxxxx" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Alamat</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <textarea value={regAddress} onChange={e => setRegAddress(e.target.value)} placeholder="Alamat lengkap" rows={2} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">RT</label>
                  <input type="text" value={regRt} onChange={e => setRegRt(e.target.value)} placeholder="001" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">RW</label>
                  <input type="text" value={regRw} onChange={e => setRegRw(e.target.value)} placeholder="001" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Daftar & Masuk</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Masuk sebagai Warga</h2>
            <p className="text-sm text-slate-500 mt-1">Masukkan NIK Anda untuk mengakses dashboard pribadi</p>
          </div>
          <form onSubmit={handleNikSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nomor Induk Kependudukan (NIK)</label>
              <input
                type="text"
                value={nik}
                onChange={e => { setNik(e.target.value.replace(/\D/g, '').slice(0, 16)); setError(''); }}
                placeholder="Masukkan 16 digit NIK"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                autoFocus
                maxLength={16}
              />
              <p className="text-[11px] text-slate-400 mt-1 text-center">{nik.length}/16 digit</p>
            </div>
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <button type="submit" disabled={loading || nik.length < 5} className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><ArrowRight size={16} /> Lanjutkan</>}
            </button>
          </form>
          <button onClick={onBack} className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-700 font-semibold transition-colors">
            Kembali ke Portal
          </button>
        </div>
      </div>
    </div>
  );
}
