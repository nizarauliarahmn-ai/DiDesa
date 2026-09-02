import React, { useState, useEffect } from 'react';
import { SAAS_CONFIG } from '../admin/surat/AdminSuratMasterTemplate';
import { 
  ShieldCheck, FileText, Send, History, CheckCircle, Clock, AlertTriangle, 
  Printer, X, Eye, ZoomIn, ZoomOut, UserCheck, MessageSquare, AlertCircle,
  Loader2, Lock
} from 'lucide-react';
import { fetchResidentLettersAsync, LetterHistory } from '../../utils/letterHistory';
import { showToast } from '../../utils/toast';
import { getLetterClassifications, LetterClassification, generateLetterNumberAsync } from '../../utils/letterClassifications';
import { getBadgeCode, getDisplayName, getVisibleSuratList } from '../../config/suratConfig';
import { resolveCurrentTenant } from '../../utils/tenantResolver';
import { supabase } from '../../utils/supabase';
import {
  lookupResidentByNik, createWargaSession, getWargaSession, clearWargaSession, getSessionRemainingMinutes
} from '../../utils/wargaOtp';

export default function LayananMandiri() {
  const [nikInput, setNikInput] = useState('');
  const [verifiedResident, setVerifiedResident] = useState<any | null>(() => getWargaSession());

  const [authNotice, setAuthNotice] = useState('');
  const [isCheckingNik, setIsCheckingNik] = useState(false);
  const [lookupAttempts, setLookupAttempts] = useState(0);
  const [lookupLockCountdown, setLookupLockCountdown] = useState(0);

  const [activeSubTab, setActiveSubTab] = useState<'surat' | 'riwayat' | 'aspirasi'>('surat');

  // Request Letter Form States
  const [letterType, setLetterType] = useState('Surat Keterangan Tidak Mampu (SKTM)');
  const [classifications, setClassifications] = useState<LetterClassification[]>([]);
  const [purpose, setPurpose] = useState('');
  const [additionalText, setAdditionalText] = useState('');
  const [isDisclaimerChecked, setIsDisclaimerChecked] = useState(false);
  const [personalLetters, setPersonalLetters] = useState<LetterHistory[]>([]);

  // Aspiration Form States
  const [aspirationCategory, setAspirationCategory] = useState('Infrastruktur');
  const [aspirationMessage, setAspirationMessage] = useState('');

  // Print Preview States
  const [selectedLetter, setSelectedLetter] = useState<LetterHistory | null>(null);
  const [zoomLevel, setZoomLevel] = useState(0.85);

  // Load visible letter classifications dynamically
  useEffect(() => {
    const visibleClasses = getLetterClassifications().filter(c => c.isVisible !== false);
    setClassifications(visibleClasses);
    if (visibleClasses.length > 0) {
      setLetterType(`${visibleClasses[0].jenis} (${visibleClasses[0].klasifikasi})`);
    }
  }, []);

  // Countdown lockout percobaan NIK salah
  useEffect(() => {
    if (lookupLockCountdown <= 0) return;
    const t = setInterval(() => setLookupLockCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [lookupLockCountdown]);

  const resetLogin = () => {
    setNikInput('');
    setAuthNotice('');
    setLookupAttempts(0);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupLockCountdown > 0) {
      setAuthNotice(`Terlalu banyak percobaan. Coba lagi dalam ${lookupLockCountdown} detik.`);
      return;
    }
    const cleanNik = nikInput.trim();
    if (!cleanNik) {
      setAuthNotice('Harap masukkan NIK Anda.');
      return;
    }
    if (!/^\d{16}$/.test(cleanNik)) {
      setAuthNotice('NIK harus terdiri dari 16 digit angka.');
      return;
    }
    setAuthNotice('');
    setIsCheckingNik(true);
    try {
      const resident = await lookupResidentByNik(cleanNik);
      if (!resident) {
        const next = lookupAttempts + 1;
        setLookupAttempts(next);
        if (next >= 5) {
          setLookupAttempts(0);
          setLookupLockCountdown(60);
        }
        setAuthNotice('NIK tidak ditemukan dalam database kependudukan desa. Pastikan NIK Anda benar.');
        return;
      }
      setLookupAttempts(0);
      const session = createWargaSession(resident);
      setVerifiedResident(session);
      setNikInput('');
      showToast(`NIK terverifikasi! Selamat datang, ${session.name}`, 'success');
    } finally {
      setIsCheckingNik(false);
    }
  };

  const handleLogoutResident = () => {
    clearWargaSession();
    setVerifiedResident(null);
    resetLogin();
    showToast('Sesi mandiri ditutup. Terima kasih!', 'info');
  };

  const loadPersonalLetters = async () => {
    if (verifiedResident) {
      const letters = await fetchResidentLettersAsync(verifiedResident.nik, verifiedResident.name);
      setPersonalLetters(letters);
    } else {
      setPersonalLetters([]);
    }
  };

  useEffect(() => {
    loadPersonalLetters();
  }, [verifiedResident, letterType]);

  const handleRequestLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedResident) return;
    if (!purpose.trim()) {
      showToast('Harap isi keperluan pengajuan surat Anda', 'error');
      return;
    }

    // Generate simulated letter code
    const randomNum = Math.floor(Math.random() * 800) + 100;
    const formatNum = String(randomNum).padStart(3, '0');
    const letterCodeMap: { [key: string]: string } = {
      'Surat Keterangan Tidak Mampu (SKTM)': 'SKTM',
      'Surat Keterangan Usaha (SKU)': 'SKU',
      'Surat Keterangan Domisili': 'SKD',
      'Surat Pengantar Kehilangan': 'SKH'
    };
    const code = letterCodeMap[letterType] || 'SKTM';
    const targetClass = classifications.find(c => c.jenis === letterType || c.klasifikasi === code);
    const kodeKlasifikasi = targetClass?.kodeKlasifikasi || '140';

    resolveCurrentTenant().then(tenantId => {
      if (!tenantId) {
        showToast('Gagal memproses surat, Tenant ID tidak ditemukan.', 'error');
        return;
      }
      generateLetterNumberAsync(code, kodeKlasifikasi).then(finalNumber => {
      Promise.resolve().then(async () => {
        try {
        await supabase.from('surat').insert([{
          tenant_id: tenantId,
          jenis_surat: letterType,
          keterangan: purpose.trim(),
          status: 'pending',
          nomor: finalNumber,
          nik: verifiedResident.nik,
          nama: verifiedResident.name,
          data: null
        }]);

        const { error: notifErr1 } = await supabase.from('notifications').insert([{
          id: `notif-${Date.now()}`,
          tenant_id: tenantId,
          title: 'Permohonan Layanan Mandiri',
          message: `Warga atas nama ${verifiedResident.name} (NIK: ${verifiedResident.nik}) mengajukan ${letterType} untuk keperluan: ${purpose.trim()}`,
          category: 'Services',
          is_read: false,
          timestamp: new Date().toISOString()
        }]);
        if (notifErr1) console.error('Gagal insert notif permohonan:', notifErr1);
        
        loadPersonalLetters();
      } catch (err) {
        console.error("Notification post failed:", err);
      }
    });
    });
    });

    setPurpose('');
    setAdditionalText('');
    setIsDisclaimerChecked(false);
    showToast('Pengajuan permohonan surat berhasil dikirim! Menunggu persetujuan admin.', 'success');
    setActiveSubTab('riwayat');
  };

  const handleSendAspiration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedResident) return;
    if (!aspirationMessage.trim()) {
      showToast('Harap masukkan pesan aspirasi atau pengaduan Anda', 'error');
      return;
    }

    resolveCurrentTenant().then(tenantId => {
      if (!tenantId) {
        showToast('Gagal mengirim aspirasi, Tenant ID tidak ditemukan.', 'error');
        return;
      }
      Promise.resolve().then(async () => {
        try {
        await supabase.from('aspirasi').insert([{
          tenant_id: tenantId,
          kategori: aspirationCategory,
          pesan: aspirationMessage.trim(),
          nama_pengirim: verifiedResident.name,
          status: 'Baru'
        }]);

        const { error: notifErr2 } = await supabase.from('notifications').insert([{
          id: `notif-${Date.now()}`,
          tenant_id: tenantId,
          title: `Aspirasi Warga: ${aspirationCategory}`,
          message: `${verifiedResident.name} mengirim pengaduan/aspirasi: "${aspirationMessage.trim()}"`,
          category: 'Services',
          is_read: false,
          timestamp: new Date().toISOString()
        }]);
        if (notifErr2) console.error('Gagal insert notif aspirasi:', notifErr2);
        
        showToast('Aspirasi & Pengaduan Anda berhasil dikirim ke Pemdes!', 'success');
        setAspirationMessage('');
      } catch (err) {
        console.error("Aspiration submit error:", err);
        showToast('Gagal mengirim aspirasi, silakan coba beberapa saat lagi.', 'error');
      }
    });
    });
  };

  // Print letter preview helper
  const renderLetterPrintContent = (surat: LetterHistory) => {
    const logoUrl = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
    const kabupatenName = localStorage.getItem('kop_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan';
    const kecamatanName = localStorage.getItem('kop_kecamatan') || 'Kecamatan Simpur';
    const desaName = localStorage.getItem('kop_desa') || 'Desa Ketupat';
    const alamatKantor = localStorage.getItem('kop_alamat') || 'Jalan Keramat, Simpur, Hulu Sungai Selatan, Kalimantan Selatan 71261';
    const kontakKantor = localStorage.getItem('kop_kontak') || '0813 4686 7519, pemdesKetupat@gmail.com';
    const namaKades = localStorage.getItem('kop_kades') || '';

    const rtRwStr = verifiedResident?.rtRw ? `RT/RW ${verifiedResident.rtRw}` : 'RT 02/01';

    return (
      <div className="text-black text-left font-sans leading-relaxed p-2" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Kop Surat */}
        <div className="flex flex-col mb-[25px]">
          <div className="flex items-center pb-2 border-b-[3px] border-black">
            <div className="w-[80px] h-[90px] shrink-0 flex items-center justify-center mr-[15px]">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 text-center pr-[80px]">
              <h5 className="text-[12px] uppercase font-bold text-black" style={{ lineHeight: '1.2', letterSpacing: '1px' }}>{kabupatenName}</h5>
              <h5 className="text-[12px] uppercase font-bold text-black" style={{ lineHeight: '1.2', letterSpacing: '1px' }}>{kecamatanName}</h5>
              <h5 className="font-black text-[22px] uppercase mt-[2px] leading-none text-black" style={{ letterSpacing: '2px' }}>{desaName}</h5>
              <p className="text-[9px] text-black mt-[4px] capitalize">{alamatKantor}</p>
              <p className="text-[9px] text-black">{kontakKantor}</p>
            </div>
          </div>
          <div className="w-full border-b-[1px] border-black mt-[2px]"></div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h6 className="font-bold underline uppercase text-sm">{surat.jenis.toUpperCase()}</h6>
          <p className="text-xs font-mono uppercase">Nomor: {surat.nomor.toUpperCase()}</p>
        </div>

        {/* Content */}
        <div className="text-xs text-justify space-y-4 text-black">
          <p className="indent-8">
            Yang bertanda tangan di bawah ini Kepala {desaName}, {kecamatanName}, {kabupatenName}, menerangkan dengan sebenarnya bahwa warga kami:
          </p>

          <div className="pl-8 space-y-2 text-xs">
            <div className="grid grid-cols-[140px_10px_1fr]"><span>Nama</span><span>:</span><span className="font-bold">{surat.nama}</span></div>
            <div className="grid grid-cols-[140px_10px_1fr]"><span>NIK</span><span>:</span><span className="font-mono font-bold">{surat.nik}</span></div>
            <div className="grid grid-cols-[140px_10px_1fr]"><span>Tempat, Tgl Lahir</span><span>:</span><span>{verifiedResident?.birthPlace || 'Ketupat'}, {verifiedResident?.birthDate || '12-06-1985'}</span></div>
            <div className="grid grid-cols-[140px_10px_1fr]"><span>Jenis Kelamin</span><span>:</span><span>{verifiedResident?.gender || 'Laki-laki'}</span></div>
            <div className="grid grid-cols-[140px_10px_1fr]"><span>Alamat / Domisili</span><span>:</span><span>{verifiedResident?.address || 'Dusun Krajan'} {rtRwStr}</span></div>
          </div>

          <p className="indent-8">
            Adalah benar yang bersangkutan merupakan penduduk sah dari {desaName} yang saat ini tergolong prasejahtera / membutuhkan pengantar dokumen administrasi. Surat pengantar keterangan ini kami berikan secara resmi guna melengkapi persyaratan:
          </p>

          <div className="p-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-lg text-justify italic font-bold">
            "{surat.keperluan}"
          </div>

          <p className="indent-8">
            Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan dan dipergunakan sebagaimana mestinya dengan tertib kependudukan yang berlaku.
          </p>

          {/* Signature */}
          <div className="mt-16 flex justify-end">
            <div className="text-center w-[200px]">
              <p>{desaName.replace(/desa|kelurahan/gi, '').trim()}, {surat.tanggal}</p>
              <p>Kepala {desaName},</p>
              <div className="h-16" />
              <p className="font-bold underline uppercase">{namaKades}</p>
            </div>
          </div>
          {/* SAAS Footer Injection */}
          <div className="hidden print:block text-[10px] text-gray-500 dark:text-slate-400 text-left pt-4 border-t border-gray-300 dark:border-slate-600 w-full shrink-0" style={{marginTop: '50px'}} dangerouslySetInnerHTML={{__html: SAAS_CONFIG.globalFooterHTML}} />
        </div>
      </div>
    );
  };

  const triggerPrintLetter = () => {
    try {
      window.print();
    } catch (e) {
      showToast('Fasilitas print diblokir oleh iframe browser. Silakan buka aplikasi di tab baru.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Printable Style Block */}
      {selectedLetter && (
        <style type="text/css" media="print">
          {`
            @page { 
              size: A4 portrait; 
              margin: 0 !important; 
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
            }
            body * { visibility: hidden !important; }
            #public-print-modal-container, #public-print-modal-container * { visibility: visible !important; }
            #public-print-modal-container { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 15mm 20mm 15mm 20mm !important; box-sizing: border-box !important; }
          `}
        </style>
      )}

      {/* Verification Layer */}
      {!verifiedResident ? (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Portal Layanan Mandiri Warga</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed font-semibold">
              Masukkan Nomor Induk Kependudukan (NIK) Anda untuk mengakses pengajuan surat dan riwayat administrasi. Sesi berakhir otomatis setelah 60 menit demi keamanan data.
            </p>
          </div>

          {authNotice && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-xl text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 leading-relaxed">{authNotice}</p>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">NOMOR INDUK KEPENDUDUKAN (NIK)</label>
              <input 
                type="text" 
                inputMode="numeric"
                maxLength={16}
                placeholder="Masukkan 16 digit NIK Anda..." 
                value={nikInput}
                onChange={(e) => setNikInput(e.target.value.replace(/\D/g, '').slice(0, 16))}
                disabled={isCheckingNik}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 dark:bg-slate-800/50 disabled:opacity-60"
              />
            </div>
            <button 
              type="submit"
              disabled={isCheckingNik}
              className="w-full bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm hover:bg-emerald-800 transition-all shadow-sm dark:shadow-none active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isCheckingNik ? (<><Loader2 size={16} className="animate-spin" /> Memeriksa NIK...</>) : (<><ShieldCheck size={16} /> Verifikasi & Masuk Portal</>)}
            </button>
          </form>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50 text-left flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">Petunjuk Simulasi Sandbox</p>
              <p className="text-xs text-amber-700 font-semibold leading-relaxed">
                Gunakan NIK terdaftar <span className="font-mono font-extrabold">3201020405060001</span> (Ahmad Bukhori) atau NIK terdaftar lain dari database kependudukan untuk menguji portal warga ini.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Authenticated Resident View
        <div className="space-y-6">
          {/* Welcoming Top banner */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-100 text-emerald-700 shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Selamat Datang, {verifiedResident.name}</h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5">NIK: <span className="font-mono">{verifiedResident.nik}</span> &bull; Domisili: RT {verifiedResident.rtRw || '02 / 01'}</p>
                <p className="text-[11px] text-gray-400 font-semibold mt-1 inline-flex items-center gap-1">
                  <Lock size={11} className="text-emerald-600" /> Sesi aktif &bull; otomatis berakhir dalam <span className="font-mono font-bold">{getSessionRemainingMinutes(verifiedResident)} menit</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleLogoutResident}
                className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                Tutup Sesi Mandiri
              </button>
            </div>
          </div>

          {/* Sub menu controls */}
          <div className="flex border-b border-gray-200 dark:border-slate-700">
            <button 
              onClick={() => setActiveSubTab('surat')}
              className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'surat' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}
            >
              <FileText className="w-4 h-4" /> Pengajuan Surat
            </button>
            <button 
              onClick={() => setActiveSubTab('riwayat')}
              className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'riwayat' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}
            >
              <History className="w-4 h-4" /> Riwayat Pengajuan ({personalLetters.length})
            </button>
            <button 
              onClick={() => setActiveSubTab('aspirasi')}
              className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'aspirasi' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}
            >
              <MessageSquare className="w-4 h-4" /> Aspirasi & Pengaduan
            </button>
          </div>

          {/* Active Sub View render */}
          <div className="pt-2 animate-in fade-in duration-200">
            {activeSubTab === 'surat' && (
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-6">
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">Kirim Pengajuan Surat Baru</h4>
                  <p className="text-xs text-gray-400 font-semibold">Isi rincian permohonan surat secara akurat. Permohonan Anda akan langsung terdata dalam antrean admin desa.</p>
                </div>

                <form onSubmit={handleRequestLetter} className="space-y-4 max-w-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">JENIS DOKUMEN SURAT</label>
                      <select 
                        value={letterType}
                        onChange={(e) => setLetterType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        {classifications.length > 0 ? (
                          classifications.map((c) => (
                            <option key={c.id} value={c.jenis}>{c.jenis}</option>
                          ))
                        ) : (
                          <option value="Surat Keterangan Tidak Mampu (SKTM)">Surat Keterangan Tidak Mampu (SKTM)</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">NAMA PEMOHON (SESUAI NIK)</label>
                      <input 
                        type="text" 
                        value={verifiedResident.name} 
                        readOnly 
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-slate-800 text-xs bg-gray-50 dark:bg-slate-800 font-bold text-gray-600 dark:text-slate-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">KEPERLUAN UTAMA PENGGUNAAN SURAT</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Pengurusan Beasiswa Kuliah Anak, Pengajuan Kredit Usaha Rakyat..."
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">KETERANGAN TAMBAHAN / CATATAN (OPSIONAL)</label>
                    <textarea 
                      placeholder="Masukkan catatan pendukung bila diperlukan..."
                      value={additionalText}
                      onChange={(e) => setAdditionalText(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-900/30 cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors">
                      <input 
                        type="checkbox" 
                        required
                        checked={isDisclaimerChecked}
                        onChange={(e) => setIsDisclaimerChecked(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-[11px] font-medium text-rose-800 dark:text-rose-200 leading-snug">
                        Saya menyatakan bertanggung jawab penuh atas kebenaran data dan informasi yang saya berikan. Segala bentuk pemalsuan data dapat diproses sesuai hukum yang berlaku.
                      </span>
                    </label>
                  </div>

                  <button 
                    type="submit"
                    disabled={!isDisclaimerChecked}
                    className={`flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-xl text-xs transition-all shadow-sm dark:shadow-none ${isDisclaimerChecked ? 'bg-emerald-700 text-white hover:bg-emerald-800 active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'}`}
                  >
                    <Send className="w-4 h-4" /> Kirim Pengajuan Surat
                  </button>
                </form>
              </div>
            )}

            {activeSubTab === 'riwayat' && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">Riwayat Pengajuan Surat Anda</h4>
                  <p className="text-xs text-gray-400 font-semibold">Pantau proses approval dan nomor registrasi surat resmi Anda di bawah ini.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 font-bold text-xs uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Nomor Surat / ID</th>
                        <th className="pb-3 font-semibold">Jenis Surat</th>
                        <th className="pb-3 font-semibold">Tanggal Diajukan</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-center">Aksi Dokumen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {personalLetters.length > 0 ? (
                        personalLetters.map(letter => (
                          <tr key={letter.id} className="hover:bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                            <td className="py-4">
                              {letter.status === 'Selesai' ? (
                                <span className="font-mono font-bold text-gray-900 dark:text-white uppercase">{letter.nomor.toUpperCase()}</span>
                              ) : (
                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Menunggu Persetujuan Admin</span>
                              )}
                            </td>
                            <td className="py-4 font-bold text-gray-800 dark:text-slate-100">
                              {letter.jenis}
                            </td>
                            <td className="py-4 text-xs font-semibold text-gray-400 uppercase tracking-tight">
                              {letter.tanggal}
                            </td>
                            <td className="py-4">
                              {letter.status === 'Selesai' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                  <CheckCircle className="w-3 h-3" /> SIAP CETAK / SELESAI
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                  <Clock className="w-3 h-3 animate-spin" /> PROSES VERIFIKASI
                                </span>
                              )}
                            </td>
                            <td className="py-4 text-center">
                              {letter.status === 'Selesai' ? (
                                <button 
                                  onClick={() => setSelectedLetter(letter)}
                                  className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm dark:shadow-none"
                                >
                                  <Eye className="w-4 h-4" /> Cetak Mandiri
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400 font-bold italic flex items-center justify-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Sedang Diproses</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-400 text-xs font-bold">
                            Belum ada riwayat pengajuan surat online.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSubTab === 'aspirasi' && (
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-6">
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">Aspirasi & Pengaduan Warga Desa</h4>
                  <p className="text-xs text-gray-400 font-semibold">Ada aspirasi, keluhan infrastruktur, atau laporan pelayanan publik? Sampaikan secara langsung demi kemajuan bersama Desa Ketupat.</p>
                </div>

                <form onSubmit={handleSendAspiration} className="space-y-4 max-w-2xl">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">KATEGORI PERMASALAHAN / ASPIRASI</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['Infrastruktur', 'Pelayanan Publik', 'Keamanan & Tibum', 'Sosial & Bantuan'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setAspirationCategory(cat)}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${aspirationCategory === cat ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm dark:shadow-none' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">DETAIL PESAN ASPIRASI ATAU LAPORAN PENGADUAN</label>
                    <textarea 
                      placeholder="Uraikan secara lengkap dan santun kejadian, saran, atau keluhan Anda..."
                      value={aspirationMessage}
                      onChange={(e) => setAspirationMessage(e.target.value)}
                      rows={4}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="flex items-center justify-center gap-2 bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-xs hover:bg-emerald-800 transition-all shadow-sm dark:shadow-none active:scale-95"
                  >
                    <Send className="w-4 h-4" /> Kirim Pengaduan & Aspirasi
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Citizen letter Print Preview Modal */}
      {selectedLetter && (
        <div id="public-print-modal-container" className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
          <div className="bg-gray-100 dark:bg-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Cetak Mandiri Surat Resmi</h3>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Nomor: <span className="uppercase">{selectedLetter.nomor.toUpperCase()}</span> &bull; Jenis: {selectedLetter.jenis}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={triggerPrintLetter}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm dark:shadow-none"
                >
                  <Printer className="w-4 h-4" /> Cetak Sekarang
                </button>
                <button 
                  onClick={() => setSelectedLetter(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Preview Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Scale Zoom preview paper */}
              <div className="flex-1 bg-gray-200 p-6 overflow-auto flex justify-center items-start min-h-[350px] relative">
                {/* Floating controls */}
                <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700 shadow-md dark:shadow-none rounded-xl p-1.5 flex items-center gap-1 z-30">
                  <button onClick={() => setZoomLevel(p => Math.max(0.4, p - 0.1))} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-slate-400"><ZoomOut className="w-4 h-4" /></button>
                  <span className="text-[10px] font-extrabold text-gray-700 dark:text-slate-300 min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={() => setZoomLevel(p => Math.min(1.5, p + 0.1))} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-slate-400"><ZoomIn className="w-4 h-4" /></button>
                </div>

                <div 
                  className="bg-white dark:bg-slate-900 p-12 shadow-lg dark:shadow-none border border-gray-300 dark:border-slate-600 transform origin-top shrink-0 mb-12"
                  style={{
                    width: '794px',
                    minHeight: '1123px',
                    transform: `scale(${zoomLevel})`,
                    marginBottom: `${(zoomLevel - 1) * 1123}px`,
                    marginRight: zoomLevel > 1 ? `${(zoomLevel - 1) * 794}px` : '0px',
                    marginLeft: zoomLevel > 1 ? `${(zoomLevel - 1) * 794}px` : '0px',
                  }}
                >
                  {renderLetterPrintContent(selectedLetter)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
