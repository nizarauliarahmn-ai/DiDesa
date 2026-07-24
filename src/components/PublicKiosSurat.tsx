import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, FileText, CheckCircle2, User, Home, ArrowLeft } from 'lucide-react';
import { getLetterClassifications, LetterClassification } from '../utils/letterClassifications';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { addLetterHistory } from '../utils/letterHistory';
import { fetchResidentsCached } from '../utils/apiCache';
import { showToast } from '../utils/toast';

export default function PublicKiosSurat() {
  const [step, setStep] = useState(1);
  const [nik, setNik] = useState('');
  const [verifiedResident, setVerifiedResident] = useState<any>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  
  const [letterTypes, setLetterTypes] = useState<LetterClassification[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<LetterClassification | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [desaName, setDesaName] = useState('');
  const [isTenantValid, setIsTenantValid] = useState<boolean | null>(null);
  const [isDisclaimerChecked, setIsDisclaimerChecked] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    const tIdParam = urlParams.get('t_id');
    
    if (!tenantParam && !tIdParam) {
      setIsTenantValid(false);
      return;
    }
    setIsTenantValid(true);

    const types = getLetterClassifications().filter(t => t.isVisible);
    setLetterTypes(types);
    
    const storedDesa = localStorage.getItem('kop_desa') || localStorage.getItem('village_name');
    if (storedDesa) setDesaName(storedDesa);
  }, []);

  const handleVerifyNik = async () => {
    if (nik.length < 16) {
      showToast('NIK harus 16 digit', 'error');
      return;
    }
    
    try {
      const res = await fetchResidentsCached();
      if (!res.ok) throw new Error('Network response was not ok');
      const residents = await res.json();
      const match = residents.find((r: any) => r.nik === nik);
      if (match) {
        setVerifiedResident(match);
        setStep(2);
      } else {
        setIsManualEntry(true);
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat memverifikasi NIK', 'error');
    }
  };

  const handleManualEntryContinue = () => {
    if (!manualName.trim()) {
      showToast('Harap masukkan nama lengkap Anda', 'error');
      return;
    }
    setVerifiedResident({
      nik: nik,
      name: manualName.trim()
    });
    setStep(2);
  };

  const handleSelectLetter = (lt: LetterClassification) => {
    setSelectedLetter(lt);
    setFormData({}); // reset form
    if (lt.fields && lt.fields.length > 0) {
      setStep(3); // Go to dynamic form
    } else {
      setStep(3); // Go to generic purpose form
    }
  };

  const handleSubmit = async () => {
    if (!verifiedResident || !selectedLetter) return;
    
    // Validate required fields
    if (selectedLetter.fields && selectedLetter.fields.length > 0) {
      for (const field of selectedLetter.fields) {
        if (field.required && !formData[field.id]) {
          showToast(`Harap isi ${field.label}`, 'error');
          return;
        }
      }
    } else {
      if (!formData['keperluan']) {
        showToast('Harap isi keperluan surat', 'error');
        return;
      }
    }

    // Generate simulated letter code
    const randomNum = Math.floor(Math.random() * 800) + 100;
    const formatNum = String(randomNum).padStart(3, '0');
    const shortDesa = desaName.toUpperCase().replace(/DESA|KELURAHAN/gi, '').trim().split(' ')[0] || 'DESA';
    const currentYear = new Date().getFullYear();
    const finalNumber = `140/${formatNum}/DS-${shortDesa}/${selectedLetter.klasifikasi}/${currentYear}`;

    let formattedKeperluan = formData['keperluan'] || '';
    if (selectedLetter.fields && selectedLetter.fields.length > 0) {
      // Build a readable string from fields for the legacy "keperluan" column
      const details = selectedLetter.fields.map(f => {
        return `${f.label}: ${formData[f.id] || '-'}`;
      }).join(', ');
      
      // We check if there's a specific 'tujuan' field to act as the main necessity
      if (formData['tujuan']) {
        formattedKeperluan = `${formData['tujuan']} (${details})`;
      } else {
        formattedKeperluan = `Persyaratan administrasi (${details})`;
      }
    }

    const tenantId = await resolveCurrentTenant();

    if (!tenantId) {
      showToast('Gagal memproses surat, Tenant ID tidak ditemukan.', 'error');
      return;
    }

    try {
      const { supabase } = await import('../utils/supabase');
      
      // 1. Insert into surat
      await supabase.from('surat').insert([{
        tenant_id: tenantId,
        jenis_surat: selectedLetter.jenis,
        keterangan: formattedKeperluan,
        status: 'pending',
        nomor: finalNumber,
        nik: verifiedResident.nik,
        nama: verifiedResident.name,
        data: selectedLetter.fields ? formData : null
      }]);

      // 2. Insert into notifications
      const { error: notifErr } = await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`,
        tenant_id: tenantId,
        title: 'Permohonan Surat Kios',
        message: `Warga atas nama ${verifiedResident.name} (NIK: ${verifiedResident.nik}) mengajukan ${selectedLetter.jenis}.`,
        category: 'Services',
        is_read: false,
        timestamp: new Date().toISOString()
      }]);
      if (notifErr) console.error('Gagal membuat notif surat:', notifErr);
    } catch (error) {
      console.error("Gagal mengirim data ke server:", error);
    }

    setStep(4);
    setIsDisclaimerChecked(false);
    
    // Auto reset after 10s
    setTimeout(() => {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('tenant') || p.get('t_id');
      window.location.search = t ? `?tenant=${t}&tab=kios` : '?tab=kios';
    }, 10000);
  };

  const renderDynamicForm = () => {
    if (!selectedLetter) return null;
    
    const fields = selectedLetter.fields;
    
    if (!fields || fields.length === 0) {
      return (
        <div className="space-y-4">
          <label className="block text-xl font-bold text-gray-700">Keperluan Pembuatan Surat</label>
          <textarea
            value={formData['keperluan'] || ''}
            onChange={(e) => setFormData({...formData, keperluan: e.target.value})}
            className="w-full p-6 text-xl rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none transition-all resize-none h-48"
            placeholder="Contoh: Untuk persyaratan pendaftaran sekolah anak..."
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {fields.map(field => (
          <div key={field.id} className="space-y-2">
            <label className="block text-xl font-bold text-gray-700">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={formData[field.id] || ''}
                onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                className="w-full p-4 text-xl rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none transition-all resize-none h-32"
                placeholder={field.placeholder || ''}
              />
            ) : field.type === 'select' ? (
              <select
                value={formData[field.id] || ''}
                onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                className="w-full p-4 text-xl rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none transition-all"
              >
                <option value="">-- Pilih --</option>
                {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={formData[field.id] || ''}
                onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                className="w-full p-4 text-xl rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none transition-all"
                placeholder={field.placeholder || ''}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none relative overflow-hidden">
      
      {isTenantValid === false && (
        <div className="absolute inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-3xl p-10 max-w-lg text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🔒</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Akses Ditolak</h2>
            <p className="text-slate-600 text-lg mb-8">Kios Belum Dikonfigurasi. Silakan buka tautan Kios melalui Dashboard Admin Desa Anda.</p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white shadow-sm px-8 py-4 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Permohonan Surat</h1>
            <p className="text-slate-500 text-sm">Layanan Mandiri {desaName}</p>
          </div>
        </div>
        
        {step < 4 && (
          <button 
            onClick={() => { const p = new URLSearchParams(window.location.search); const t = p.get('tenant') || p.get('t_id'); window.location.search = t ? `?tenant=${t}&tab=kios` : '?tab=kios'; }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold transition-colors"
          >
            <Home className="w-5 h-5" /> Kembali ke Beranda
          </button>
        )}
      </header>

      {/* Progress Bar */}
      {step < 4 && (
        <div className="w-full h-2 bg-slate-200">
          <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>
      )}

      {/* Main Content area */}
      <main className="flex-1 relative flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: NIK Verification */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}
              className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-2xl text-center"
            >
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-4xl font-black text-slate-800 mb-4">Verifikasi Identitas</h2>
              <p className="text-xl text-slate-500 mb-8">Silakan masukkan 16 digit NIK Anda untuk melanjutkan permohonan surat.</p>
              
              {!isManualEntry ? (
                <div className="flex flex-col items-center w-full">
                  <input 
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, '').slice(0, 16))}
                    className="w-full text-center text-4xl font-mono tracking-[0.2em] p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl mb-8 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none"
                    placeholder="0000000000000000"
                  />

                  <button 
                    onClick={handleVerifyNik}
                    disabled={nik.length < 16}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-2xl font-bold rounded-2xl transition-colors shadow-lg shadow-blue-600/30"
                  >
                    Lanjutkan
                  </button>

                  <button 
                    onClick={() => setIsManualEntry(true)}
                    className="mt-6 text-blue-600 font-bold text-lg hover:underline transition-colors"
                  >
                    Bukan Penduduk Desa? Isi Data Manual
                  </button>
                </div>
              ) : (
                <div className="space-y-6 text-left w-full">
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-800 mb-6">
                    <p className="font-medium">
                      {nik.length === 16 ? "Data NIK tidak ditemukan di database warga. " : ""}
                      Silakan masukkan identitas Anda untuk melanjutkan permohonan.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xl font-bold text-gray-700 mb-2">Nama Lengkap Sesuai KTP</label>
                    <input 
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      className="w-full p-4 text-xl rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none transition-all uppercase"
                      placeholder="NAMA LENGKAP"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsManualEntry(false)}
                      className="w-1/3 py-5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xl font-bold rounded-2xl transition-colors"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleManualEntryContinue}
                      disabled={!manualName.trim()}
                      className="w-2/3 py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xl font-bold rounded-2xl transition-colors shadow-lg shadow-blue-600/30"
                    >
                      Lanjutkan Formulir
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: Select Letter Type */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-5xl"
            >
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setStep(1)} className="p-3 bg-white rounded-full shadow hover:bg-slate-50">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-3xl font-black text-slate-800">Pilih Jenis Surat</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-[60vh] overflow-y-auto pr-4 pb-12">
                {letterTypes.map(lt => (
                  <motion.button
                    key={lt.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectLetter(lt)}
                    className="bg-white p-6 rounded-2xl shadow hover:shadow-lg border-2 border-transparent hover:border-blue-500 text-left flex flex-col h-full transition-all"
                  >
                    <div className="flex-1">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">{lt.jenis}</h3>
                      {lt.deskripsi && <p className="text-slate-500 text-sm line-clamp-2">{lt.deskripsi}</p>}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-blue-600 font-semibold">
                      <span>Pilih</span>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Dynamic Form */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-3xl bg-white p-10 rounded-3xl shadow-xl"
            >
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                <button onClick={() => setStep(2)} className="p-3 bg-slate-50 rounded-full hover:bg-slate-100">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h2 className="text-3xl font-black text-slate-800">Lengkapi Isian</h2>
                  <p className="text-slate-500 text-lg">{selectedLetter?.jenis}</p>
                </div>
              </div>

              <div className="max-h-[50vh] overflow-y-auto pr-4 pb-8 custom-scrollbar">
                {renderDynamicForm()}
              </div>

              <div className="mt-2 mb-8">
                <label className="flex items-start gap-4 p-5 bg-rose-50 rounded-2xl border border-rose-100 cursor-pointer hover:bg-rose-100 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={isDisclaimerChecked}
                    onChange={(e) => setIsDisclaimerChecked(e.target.checked)}
                    className="mt-1 w-6 h-6 text-emerald-600 rounded-md border-gray-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-lg font-medium text-rose-900 leading-snug">
                    Saya menyatakan bertanggung jawab penuh atas kebenaran data dan informasi yang saya berikan. Segala bentuk pemalsuan data dapat diproses sesuai hukum yang berlaku.
                  </span>
                </label>
              </div>
              
              <button 
                onClick={handleSubmit}
                disabled={!isDisclaimerChecked}
                className={`w-full py-5 text-white text-2xl font-bold rounded-2xl transition-colors shadow-lg ${isDisclaimerChecked ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30' : 'bg-gray-400 cursor-not-allowed shadow-none'}`}
              >
                Kirim Permohonan
              </button>
            </motion.div>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-12 rounded-3xl shadow-xl w-full max-w-2xl text-center"
            >
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8"
              >
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </motion.div>
              <h2 className="text-4xl font-black text-slate-800 mb-4">Terima Kasih!</h2>
              <p className="text-2xl text-slate-600 mb-8 leading-relaxed">
                Permohonan <strong className="text-slate-800">{selectedLetter?.jenis}</strong> Anda telah masuk ke sistem.
              </p>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left max-w-md mx-auto mb-8">
                <p className="text-slate-500 text-lg text-center font-medium">Silakan menunggu panggilan dari petugas loket untuk pencetakan dan pengambilan surat.</p>
              </div>
              <p className="text-sm text-slate-400">Layar ini akan kembali ke halaman utama secara otomatis...</p>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
