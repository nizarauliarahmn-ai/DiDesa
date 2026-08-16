import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, FileText, CheckCircle2, User, Home, ArrowLeft, Monitor, FileSignature, X } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { getLetterClassifications, LetterClassification, generateLetterNumber, generateLetterNumberAsync } from '../utils/letterClassifications';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { addLetterHistory } from '../utils/letterHistory';
import { fetchResidentsCached } from '../utils/apiCache';
import { showToast } from '../utils/toast';
import { supabase } from '../utils/supabase';
import { savePermohonanWithGuestRecord } from '../utils/kioskSubmissions';

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

  // Assistive Kiosk Sign session (sent by Admin via "Tambah Permohonan")
  const [assistSession, setAssistSession] = useState<any>(null);
  const [assistSigned, setAssistSigned] = useState(false);
  const [isAssistSigning, setIsAssistSigning] = useState(false);
  const signatureRef = React.useRef<any>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    const tIdParam = urlParams.get('t_id');
    
    if (!tenantParam && !tIdParam) {
      setIsTenantValid(false);
      return;
    }
    setIsTenantValid(true);

    const types = getLetterClassifications().filter(t => t.isVisible && !t.isSaaSDisabled);
    setLetterTypes(types);
    
    const storedDesa = localStorage.getItem('kop_desa') || localStorage.getItem('village_name');
    if (storedDesa) setDesaName(storedDesa);

    // Pick up persisted incoming-permohonan session (from kiosk portal redirect)
    const incomingStr = localStorage.getItem('kiosk_incoming_permohonan');
    if (incomingStr) {
      try {
        const payload = JSON.parse(incomingStr);
        if (payload && payload.type === 'permohonan') {
          setAssistSession(payload);
          setStep(4);
          localStorage.removeItem('kiosk_incoming_permohonan');
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Realtime listener: Admin "Tambah Permohonan" -> show verification + TTD screen
  useEffect(() => {
    if (!isTenantValid) return;
    resolveCurrentTenant().then(tenantId => {
      if (!tenantId) return;
      const channel = supabase.channel(`kiosk-notif-${tenantId}`)
        .on('broadcast', { event: 'incoming-permohonan' }, ({ payload }) => {
          if (!payload || payload.type !== 'permohonan') return;
          setAssistSigned(false);
          setAssistSession(payload);
          setStep(4);
          showToast('Permohonan diterima dari Admin. Silakan periksa data dan beri tanda tangan.', 'info');
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [isTenantValid]);

  const handleVerifyNik = async () => {
    const query = nik.trim();
    if (query.length < 3) {
      showToast('Ketikkan NIK atau minimal 3 huruf nama', 'error');
      return;
    }
    
    try {
      const res = await fetchResidentsCached();
      if (!res.ok) throw new Error('Network response was not ok');
      const residents = await res.json();
      
      let match;
      if (/^\d{16}$/.test(query)) {
        match = residents.find((r: any) => r.nik === query);
      } else {
        match = residents.find((r: any) => r.name?.toLowerCase().includes(query.toLowerCase()));
      }

      if (match) {
        setVerifiedResident(match);
        setStep(1.5);
      } else {
        setIsManualEntry(true);
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat memverifikasi identitas', 'error');
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

    // Generate official uniform letter code
    const finalNumber = await generateLetterNumberAsync(selectedLetter.klasifikasi, selectedLetter.kodeKlasifikasi || '140');

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
      
      // 1. Insert into surat (Record A: Permohonan) + auto-record buku tamu (Record B)
      await savePermohonanWithGuestRecord({
        tenantId,
        jenisSurat: selectedLetter.jenis,
        keterangan: formattedKeperluan,
        nomor: finalNumber,
        nik: verifiedResident.nik,
        nama: verifiedResident.name,
        data: selectedLetter.fields ? formData : null,
        signatureUrl: null
      });

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
      if (notifErr) {
        console.error('Gagal membuat notif surat:', notifErr);
      } else {
        window.dispatchEvent(new Event('didesa_notification_created'));
      }
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

  const handleAssistSign = async () => {
    if (!assistSession) return;
    if (!isDisclaimerChecked) {
      showToast('Harap centang pernyataan tanggung jawab terlebih dahulu.', 'error');
      return;
    }
    if (signatureRef.current?.isEmpty()) {
      showToast('Harap bubuhkan tanda tangan Anda di atas.', 'error');
      return;
    }

    setIsAssistSigning(true);
    const tenantId = await resolveCurrentTenant();
    if (!tenantId) {
      setIsAssistSigning(false);
      showToast('Gagal memproses, Tenant ID tidak ditemukan.', 'error');
      return;
    }

    try {
      // Upload TTD ke storage signatures
      let signatureUrl = null;
      try {
        const dataUrl = signatureRef.current.getTrimmedCanvas().toDataURL('image/png');
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const fileName = `${tenantId}/${Date.now()}-permohonan-ttd.png`;
        const { error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(fileName, blob, { contentType: 'image/png', cacheControl: '3600' });
        if (uploadError) {
          console.error('Failed to upload signature', uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage.from('signatures').getPublicUrl(fileName);
          signatureUrl = publicUrlData.publicUrl;
        }
      } catch (e) {
        console.error('Error processing signature', e);
      }

      const klas = getLetterClassifications().find(c => c.klasifikasi === assistSession.klasifikasi || c.jenis === assistSession.jenis);
      const finalNumber = await generateLetterNumberAsync(assistSession.klasifikasi || 'SU', assistSession.kodeKlasifikasi || '140');

      // Simpan permohonan (Record A) + auto-record buku tamu (Record B) via kioskSubmissions
      await savePermohonanWithGuestRecord({
        tenantId,
        jenisSurat: assistSession.jenis,
        keterangan: assistSession.keperluan,
        nomor: finalNumber,
        nik: assistSession.nik || null,
        nama: assistSession.nama,
        data: {
          source: 'admin_assist',
          via_kiosk: true,
          kiosk_signed: true,
          kiosk_session_id: assistSession.sessionId
        },
        signatureUrl,
        signedAt: new Date().toISOString()
      });

      // Notifikasi admin
      await supabase.from('notifications').insert([{
        id: `notif-${Date.now()}`,
        tenant_id: tenantId,
        title: 'Permohonan Siap Diterbitkan',
        message: `${assistSession.nama} telah menandatangani ${assistSession.jenis} di Kios.`,
        category: 'Services',
        is_read: false,
        timestamp: new Date().toISOString()
      }]);
      window.dispatchEvent(new Event('didesa_notification_created'));
      window.dispatchEvent(new Event('didesa_permohonan_updated'));

      // Konfirmasi balik ke Admin lewat broadcast channel
      const replyChannel = supabase.channel(`kiosk-notif-${tenantId}`);
      replyChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          replyChannel.send({
            type: 'broadcast',
            event: 'permohonan-signed',
            payload: { sessionId: assistSession.sessionId, nama: assistSession.nama, jenis: assistSession.jenis }
          });
          setTimeout(() => supabase.removeChannel(replyChannel), 1500);
        }
      });

      setAssistSigned(true);
      setIsAssistSigning(false);
    } catch (error) {
      console.error("Gagal menyimpan permohonan:", error);
      setIsAssistSigning(false);
      showToast('Gagal menyimpan permohonan. Mohon coba lagi.', 'error');
    }
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
              <p className="text-xl text-slate-500 mb-8">Silakan masukkan NIK atau Nama Lengkap Anda untuk melanjutkan permohonan surat.</p>
              
              {!isManualEntry ? (
                <div className="flex flex-col items-center w-full">
                  <input 
                    type="text"
                    data-no-cap
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerifyNik();
                    }}
                    className="w-full text-center text-3xl md:text-4xl font-mono p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl mb-8 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none"
                    placeholder="Masukkan NIK atau Nama..."
                  />

                  <button 
                    onClick={handleVerifyNik}
                    disabled={nik.trim().length < 3}
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
                      {nik.length >= 3 ? "Data tidak ditemukan di database warga. " : ""}
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
                      onClick={() => {
                        setIsManualEntry(false);
                        setNik('');
                        setManualName('');
                      }}
                      className="w-1/3 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-colors"
                    >
                      Kembali
                    </button>
                    <button 
                      onClick={() => {
                        if (manualName.trim().length < 3) {
                          showToast('Masukkan nama lengkap minimal 3 karakter', 'error');
                          return;
                        }
                        setVerifiedResident({ 
                          name: manualName.trim().toUpperCase(), 
                          nik: /^\d{16}$/.test(nik) ? nik : '0000000000000000' 
                        });
                        setStep(2);
                      }}
                      disabled={manualName.trim().length < 3}
                      className="w-2/3 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-colors"
                    >
                      Lanjutkan
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 1.5: Confirm Identity */}
          {step === 1.5 && verifiedResident && (
            <motion.div 
              key="step1.5"
              initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
              className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-2xl text-center"
            >
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-4xl font-black text-slate-800 mb-2">Konfirmasi Identitas</h2>
              <p className="text-xl text-slate-500 mb-8">Apakah ini data diri Anda?</p>
              
              <div className="bg-slate-50 rounded-2xl p-6 text-left mb-8 border border-slate-200">
                <div className="mb-4">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                  <p className="text-2xl font-black text-slate-800">{verifiedResident.name || '-'}</p>
                </div>
                <div className="mb-4">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">NIK</p>
                  <p className="text-xl font-medium text-slate-700 font-mono tracking-widest">{verifiedResident.nik || '-'}</p>
                </div>
                {verifiedResident.address && (
                  <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Alamat</p>
                    <p className="text-lg font-medium text-slate-700">{verifiedResident.address} RT {verifiedResident.rt || '00'} RW {verifiedResident.rw || '00'}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="w-1/3 py-5 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xl font-bold rounded-2xl transition-colors"
                >
                  Bukan
                </button>
                <button 
                  onClick={() => setStep(2)}
                  className="w-2/3 py-5 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-2xl transition-colors shadow-lg shadow-blue-600/30"
                >
                  Ya, Benar
                </button>
              </div>
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

          {/* STEP 4: Assistive Kiosk Sign (Admin "Tambah Permohonan") */}
          {step === 4 && assistSession && !assistSigned && (
            <motion.div 
              key="assist-sign"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-white p-10 rounded-3xl shadow-xl"
            >
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-indigo-50 rounded-2xl">
                  <Monitor className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800">Verifikasi & Tanda Tangan</h2>
                  <p className="text-slate-500 text-lg">Permohonan dibantu oleh Petugas Admin</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 mb-6 border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                    <p className="text-2xl font-black text-slate-800">{assistSession.nama || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">NIK</p>
                    <p className="text-xl font-medium text-slate-700 font-mono tracking-widest">{assistSession.nik || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Jenis Surat</p>
                    <p className="text-xl font-bold text-slate-800">{assistSession.jenis || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Keperluan</p>
                    <p className="text-lg font-medium text-slate-700">{assistSession.keperluan || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm font-bold text-slate-600 mb-2 block flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-indigo-600" />
                  Tanda Tangan Digital <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-gray-200 rounded-2xl bg-gray-50 h-40 relative overflow-hidden">
                  <SignatureCanvas 
                    ref={signatureRef}
                    clearOnResize={false}
                    canvasProps={{ className: 'w-full h-40 cursor-crosshair' }}
                  />
                  <button 
                    type="button"
                    onClick={() => signatureRef.current?.clear()}
                    className="absolute top-2 right-2 text-[10px] font-bold bg-white text-gray-500 px-2 py-1 rounded shadow border hover:text-red-500"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="flex items-start gap-4 p-5 bg-rose-50 rounded-2xl border border-rose-100 cursor-pointer hover:bg-rose-100 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={isDisclaimerChecked}
                    onChange={(e) => setIsDisclaimerChecked(e.target.checked)}
                    className="mt-1 w-6 h-6 text-emerald-600 rounded-md border-gray-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-lg font-medium text-rose-900 leading-snug">
                    Saya menyatakan bahwa data yang tercantum di atas adalah benar dan saya bertanggung jawab penuh atas permohonan ini.
                  </span>
                </label>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => { setAssistSession(null); setStep(1); }}
                  className="w-1/3 py-5 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xl font-bold rounded-2xl transition-colors"
                >
                  Bukan Saya
                </button>
                <button 
                  onClick={handleAssistSign}
                  disabled={isAssistSigning}
                  className={`w-2/3 py-5 text-white text-xl font-bold rounded-2xl transition-colors shadow-lg flex items-center justify-center gap-2 ${isAssistSigning ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'}`}
                >
                  {isAssistSigning ? (
                    <><FileText className="w-6 h-6 animate-pulse" /> Menyimpan...</>
                  ) : (
                    <><CheckCircle2 className="w-6 h-6" /> Setuju & Tanda Tangan</>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (!assistSession || assistSigned) && (
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
                Permohonan <strong className="text-slate-800">{assistSigned && assistSession ? assistSession.jenis : selectedLetter?.jenis}</strong> Anda telah ditandatangani & masuk ke sistem.
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
