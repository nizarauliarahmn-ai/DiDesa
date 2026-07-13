import { fetchResidentsCached } from '../../utils/apiCache';
import React, { useState, useEffect, useMemo } from 'react';
import { SAAS_CONFIG } from '../admin/surat/AdminSuratMasterTemplate';
import { 
  ShieldCheck, FileText, Send, History, CheckCircle, Clock, AlertTriangle, 
  Printer, X, Eye, ZoomIn, ZoomOut, Search, UserCheck, MessageSquare, AlertCircle
} from 'lucide-react';
import { getResidentLetters, addLetterHistory, LetterHistory } from '../../utils/letterHistory';
import { showToast } from '../../utils/toast';
import { getLetterClassifications, LetterClassification } from '../../utils/letterClassifications';

export default function LayananMandiri() {
  const [nikInput, setNikInput] = useState('');
  const [residents, setResidents] = useState<any[]>([]);
  const [verifiedResident, setVerifiedResident] = useState<any | null>(() => {
    const saved = localStorage.getItem('didesa_verified_resident');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeSubTab, setActiveSubTab] = useState<'surat' | 'riwayat' | 'aspirasi'>('surat');

  // Request Letter Form States
  const [letterType, setLetterType] = useState('Surat Keterangan Tidak Mampu (SKTM)');
  const [classifications, setClassifications] = useState<LetterClassification[]>([]);
  const [purpose, setPurpose] = useState('');
  const [additionalText, setAdditionalText] = useState('');

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
      setLetterType(visibleClasses[0].jenis);
    }
  }, []);

  // Fetch residents for NIK verification
  useEffect(() => {
    fetchResidentsCached()
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setResidents(data);
        }
      })
      .catch(err => {
        // Silent catch for network errors during dev server restarts
      });
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nikInput.trim()) {
      showToast('Harap masukkan NIK Anda', 'error');
      return;
    }

    const found = residents.find(r => r.nik === nikInput.trim());
    if (found) {
      setVerifiedResident(found);
      localStorage.setItem('didesa_verified_resident', JSON.stringify(found));
      showToast(`NIK terverifikasi! Selamat datang, ${found.name}`, 'success');
    } else {
      showToast('NIK tidak ditemukan dalam database kependudukan desa. Pastikan NIK Anda benar.', 'error');
    }
  };

  const handleLogoutResident = () => {
    setVerifiedResident(null);
    localStorage.removeItem('didesa_verified_resident');
    setNikInput('');
    showToast('Sesi mandiri ditutup.', 'info');
  };

  // Personal Letter Requests list
  const personalLetters = useMemo(() => {
    if (!verifiedResident) return [];
    return getResidentLetters(verifiedResident.nik, verifiedResident.name);
  }, [verifiedResident, letterType]); // trigger update on letter submit

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
    const code = letterCodeMap[letterType] || 'SKM';
    const shortDesa = (localStorage.getItem('kop_desa') || 'WASAH HILIR')
      .toUpperCase()
      .replace(/DESA|KELURAHAN/gi, '')
      .trim()
      .split(' ')[0] || 'DESA';
    const currentYear = new Date().getFullYear();
    const finalNumber = `140/${formatNum}/DS-${shortDesa}/${code}/${currentYear}`;

    // Create a new letter record
    const newLetter = {
      nomor: finalNumber,
      jenis: letterType,
      nik: verifiedResident.nik,
      nama: verifiedResident.name,
      tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      keperluan: purpose.trim(),
      status: 'Proses' as const // Citizens file in queue state
    };

    // Add to localStorage letters history list
    addLetterHistory(newLetter);

    // Call server notification endpoint to alert the admin panel in real-time
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Pengajuan Surat Online Mandiri',
        message: `Warga atas nama ${verifiedResident.name} (NIK: ${verifiedResident.nik}) mengajukan ${letterType} untuk keperluan: ${purpose.trim()}`,
        category: 'Services'
      })
    })
    .then(r => r.json())
    .catch(err => console.error("Notification post failed:", err));

    setPurpose('');
    setAdditionalText('');
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

    // Trigger notification to admin
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Aspirasi Warga: ${aspirationCategory}`,
        message: `${verifiedResident.name} mengirim pengaduan/aspirasi: "${aspirationMessage.trim()}"`,
        category: 'Services'
      })
    })
    .then(r => r.json())
    .then(() => {
      showToast('Aspirasi & Pengaduan Anda berhasil dikirim ke Pemdes!', 'success');
      setAspirationMessage('');
    })
    .catch(err => {
      console.error("Aspiration submit error:", err);
      showToast('Gagal mengirim aspirasi, silakan coba beberapa saat lagi.', 'error');
    });
  };

  // Print letter preview helper
  const renderLetterPrintContent = (surat: LetterHistory) => {
    const logoUrl = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
    const kabupatenName = localStorage.getItem('kop_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan';
    const kecamatanName = localStorage.getItem('kop_kecamatan') || 'Kecamatan Simpur';
    const desaName = localStorage.getItem('kop_desa') || 'Desa Wasah Hilir';
    const alamatKantor = localStorage.getItem('kop_alamat') || 'Jalan Keramat, Simpur, Hulu Sungai Selatan, Kalimantan Selatan 71261';
    const kontakKantor = localStorage.getItem('kop_kontak') || '0813 4686 7519, pemdeswasahhilir@gmail.com';
    const namaKades = localStorage.getItem('kop_kades') || 'Fazakkir Rahmad';

    const rtRwStr = verifiedResident?.rt_rw ? `RT/RW ${verifiedResident.rt_rw}` : 'RT 02/01';

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
          <p className="text-xs font-mono">Nomor: {surat.nomor}</p>
        </div>

        {/* Content */}
        <div className="text-xs text-justify space-y-4 text-black">
          <p className="indent-8">
            Yang bertanda tangan di bawah ini Kepala {desaName}, {kecamatanName}, {kabupatenName}, menerangkan dengan sebenarnya bahwa warga kami:
          </p>

          <div className="pl-8 space-y-2 text-xs">
            <div className="grid grid-cols-[140px_10px_1fr]"><span>Nama</span><span>:</span><span className="font-bold">{surat.nama}</span></div>
            <div className="grid grid-cols-[140px_10px_1fr]"><span>NIK</span><span>:</span><span className="font-mono font-bold">{surat.nik}</span></div>
            <div className="grid grid-cols-[140px_10px_1fr]"><span>Tempat, Tgl Lahir</span><span>:</span><span>{verifiedResident?.birthPlace || 'Wasah Hilir'}, {verifiedResident?.birthDate || '12-06-1985'}</span></div>
            <div className="grid grid-cols-[140px_10px_1fr]"><span>Jenis Kelamin</span><span>:</span><span>{verifiedResident?.gender || 'Laki-laki'}</span></div>
            <div className="grid grid-cols-[140px_10px_1fr]"><span>Alamat / Domisili</span><span>:</span><span>{verifiedResident?.address || 'Dusun Krajan'} {rtRwStr}</span></div>
          </div>

          <p className="indent-8">
            Adalah benar yang bersangkutan merupakan penduduk sah dari {desaName} yang saat ini tergolong prasejahtera / membutuhkan pengantar dokumen administrasi. Surat pengantar keterangan ini kami berikan secara resmi guna melengkapi persyaratan:
          </p>

          <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-justify italic font-bold">
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
          <div className="hidden print:block text-[10px] text-gray-500 text-left pt-4 border-t border-gray-300 w-full shrink-0" style={{marginTop: '50px'}} dangerouslySetInnerHTML={{__html: SAAS_CONFIG.globalFooterHTML}} />
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
        <div className="max-w-xl mx-auto bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-sm text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Portal Layanan Mandiri Warga</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed font-semibold">
              Masukkan Nomor Induk Kependudukan (NIK) Anda untuk mengakses layanan pengajuan surat online dan melacak riwayat administrasi kependudukan Anda.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">NOMOR INDUK KEPENDUDUKAN (NIK)</label>
              <input 
                type="text" 
                placeholder="Masukkan 16 digit NIK Anda..." 
                value={nikInput}
                onChange={(e) => setNikInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm hover:bg-emerald-800 transition-all shadow-sm active:scale-95"
            >
              Verifikasi & Masuk Portal
            </button>
          </form>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50 text-left flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">Petunjuk Simulasi Sandbox</p>
              <p className="text-xs text-amber-700 font-semibold leading-relaxed">
                Anda dapat menggunakan NIK terdaftar <span className="font-mono font-extrabold">3201020405060001</span> (Ahmad Bukhori) atau NIK terdaftar lainnya dari database kependudukan untuk menguji portal warga ini.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Authenticated Resident View
        <div className="space-y-6">
          {/* Welcoming Top banner */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-100 text-emerald-700 shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Selamat Datang, {verifiedResident.name}</h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5">NIK: <span className="font-mono">{verifiedResident.nik}</span> &bull; Domisili: RT {verifiedResident.rtRw || '02 / 01'}</p>
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
          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => setActiveSubTab('surat')}
              className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'surat' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <FileText className="w-4 h-4" /> Pengajuan Surat
            </button>
            <button 
              onClick={() => setActiveSubTab('riwayat')}
              className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'riwayat' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <History className="w-4 h-4" /> Riwayat Pengajuan ({personalLetters.length})
            </button>
            <button 
              onClick={() => setActiveSubTab('aspirasi')}
              className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'aspirasi' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <MessageSquare className="w-4 h-4" /> Aspirasi & Pengaduan
            </button>
          </div>

          {/* Active Sub View render */}
          <div className="pt-2 animate-in fade-in duration-200">
            {activeSubTab === 'surat' && (
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">Kirim Pengajuan Surat Baru</h4>
                  <p className="text-xs text-gray-400 font-semibold">Isi rincian permohonan surat secara akurat. Permohonan Anda akan langsung terdata dalam antrean admin desa.</p>
                </div>

                <form onSubmit={handleRequestLetter} className="space-y-4 max-w-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">JENIS DOKUMEN SURAT</label>
                      <select 
                        value={letterType}
                        onChange={(e) => setLetterType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 text-xs bg-gray-50 font-bold text-gray-600 outline-none"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">KETERANGAN TAMBAHAN / CATATAN (OPSIONAL)</label>
                    <textarea 
                      placeholder="Masukkan catatan pendukung bila diperlukan..."
                      value={additionalText}
                      onChange={(e) => setAdditionalText(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="flex items-center justify-center gap-2 bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-xs hover:bg-emerald-800 transition-all shadow-sm active:scale-95"
                  >
                    <Send className="w-4 h-4" /> Kirim Pengajuan Surat
                  </button>
                </form>
              </div>
            )}

            {activeSubTab === 'riwayat' && (
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">Riwayat Pengajuan Surat Anda</h4>
                  <p className="text-xs text-gray-400 font-semibold">Pantau proses approval dan nomor registrasi surat resmi Anda di bawah ini.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
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
                          <tr key={letter.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-4">
                              {letter.status === 'Selesai' ? (
                                <span className="font-mono font-bold text-gray-900">{letter.nomor}</span>
                              ) : (
                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Menunggu Persetujuan Admin</span>
                              )}
                            </td>
                            <td className="py-4 font-bold text-gray-800">
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
                                  className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
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
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">Aspirasi & Pengaduan Warga Desa</h4>
                  <p className="text-xs text-gray-400 font-semibold">Ada aspirasi, keluhan infrastruktur, atau laporan pelayanan publik? Sampaikan secara langsung demi kemajuan bersama Desa Wasah Hilir.</p>
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
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${aspirationCategory === cat ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="flex items-center justify-center gap-2 bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-xs hover:bg-emerald-800 transition-all shadow-sm active:scale-95"
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
          <div className="bg-gray-100 rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Cetak Mandiri Surat Resmi</h3>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Nomor: {selectedLetter.nomor} &bull; Jenis: {selectedLetter.jenis}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={triggerPrintLetter}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Cetak Sekarang
                </button>
                <button 
                  onClick={() => setSelectedLetter(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
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
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md rounded-xl p-1.5 flex items-center gap-1 z-30">
                  <button onClick={() => setZoomLevel(p => Math.max(0.4, p - 0.1))} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ZoomOut className="w-4 h-4" /></button>
                  <span className="text-[10px] font-extrabold text-gray-700 min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={() => setZoomLevel(p => Math.min(1.5, p + 0.1))} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ZoomIn className="w-4 h-4" /></button>
                </div>

                <div 
                  className="bg-white p-12 shadow-lg border border-gray-300 transform origin-top shrink-0 mb-12"
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
