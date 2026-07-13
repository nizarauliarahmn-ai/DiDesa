import React, { useState } from 'react';
import { Send, CloudUpload, Info, Search, Radar, HelpCircle, Shield, Clock, CheckCircle } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { saveAspirasi, getAspirasi, Aspirasi } from '../../utils/aspirasiData';

export default function AspirasiWarga() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    sender: '',
    category: '',
    subject: '',
    content: ''
  });
  const [ticketSearch, setTicketSearch] = useState('');
  const [trackedTicket, setTrackedTicket] = useState<Aspirasi | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [bannerUrl, setBannerUrl] = useState(() => localStorage.getItem('village_aspirasi_banner_url') || 'https://images.unsplash.com/photo-1596422846543-74c6fc1e0308?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
  const [aspirasiBannerYOffset, setAspirasiBannerYOffset] = useState(() => localStorage.getItem('village_aspirasi_banner_y_offset') || '50');
  const [aspirasiBannerZoom, setAspirasiBannerZoom] = useState(() => localStorage.getItem('village_aspirasi_banner_zoom') || '100');
  const [villageName, setVillageName] = useState(() => localStorage.getItem('kop_desa') || localStorage.getItem('village_name') || 'Desa Sukamaju');
  
  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setBannerUrl(localStorage.getItem('village_aspirasi_banner_url') || 'https://images.unsplash.com/photo-1596422846543-74c6fc1e0308?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
      setAspirasiBannerYOffset(localStorage.getItem('village_aspirasi_banner_y_offset') || '50');
      setAspirasiBannerZoom(localStorage.getItem('village_aspirasi_banner_zoom') || '100');
      setVillageName(localStorage.getItem('kop_desa') || localStorage.getItem('village_name') || 'Desa Sukamaju');
    };
    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('village_settings_updated', handleSettingsUpdate);
  }, []);

  React.useEffect(() => {
    const handleUpdate = () => {
      if (ticketSearch.trim() && searchAttempted) {
        const allAspirasi = getAspirasi();
        const found = allAspirasi.find(a => a.id.toLowerCase() === ticketSearch.trim().toLowerCase());
        setTrackedTicket(found || null);
      }
    };
    window.addEventListener('didesa_aspirasi_updated', handleUpdate);
    return () => window.removeEventListener('didesa_aspirasi_updated', handleUpdate);
  }, [ticketSearch, searchAttempted]);

  const handleSearchTicket = () => {
    if (!ticketSearch.trim()) return;
    const allAspirasi = getAspirasi();
    const found = allAspirasi.find(a => a.id.toLowerCase() === ticketSearch.trim().toLowerCase());
    setTrackedTicket(found || null);
    setSearchAttempted(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const newAspirasi = {
      id: `TKT-${Math.floor(100000 + Math.random() * 900000)}`,
      sender: formData.sender || 'Anonim',
      category: formData.category || 'umum',
      subject: formData.subject,
      content: formData.content,
      fileName: file ? file.name : null,
      status: 'Menunggu' as const,
      date: new Date().toISOString().split('T')[0]
    };
    
    saveAspirasi(newAspirasi);
    
    setTimeout(() => {
      setIsSubmitting(false);
      showToast('Aspirasi berhasil dikirim! Tiket: ' + newAspirasi.id, 'success');
      (e.target as HTMLFormElement).reset();
      setFile(null);
      setFormData({ sender: '', category: '', subject: '', content: '' });
    }, 1000);
  };

  return (
    <div className="pb-24">
      {/* Hero Section */}
      <section className="relative h-[300px] md:h-[400px] w-full flex items-center overflow-hidden rounded-3xl mb-8 -mt-2 bg-slate-900">
        <div className="absolute inset-0 z-0">
          <img 
            className="w-full h-full object-cover brightness-50 transition-all duration-300" 
            src={bannerUrl} 
            alt="Pemandangan Desa" 
            style={{ 
              objectPosition: `center ${aspirasiBannerYOffset}%`,
              transform: `scale(${parseFloat(aspirasiBannerZoom || '100') / 100})`,
              transformOrigin: 'center center'
            }}
          />
        </div>
        <div className="relative z-10 px-8 max-w-7xl mx-auto w-full text-white">
          <div className="max-w-2xl">
            <span className="bg-emerald-600/90 backdrop-blur-md text-emerald-50 px-4 py-1.5 rounded-full text-xs font-bold mb-4 inline-block tracking-wider uppercase shadow-sm">
              Portal Aspirasi Digital
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight leading-tight">
              Suara Warga {villageName}
            </h1>
            <p className="text-lg opacity-90 leading-relaxed font-medium">
              Sampaikan aspirasi, saran, kritik, atau laporan Anda secara langsung. Kami berkomitmen pada transparansi dan partisipasi aktif dalam pembangunan desa kita.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-20">
        {/* Left Side: Form Section (8 Columns) */}
        <div className="lg:col-span-8">
          <div className="bg-white shadow-xl shadow-slate-200/50 rounded-3xl p-6 md:p-8 border border-slate-100">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Kirim Aspirasi & Laporan</h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">Formulir digital untuk layanan pengaduan dan saran warga.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Nama Lengkap (Opsional)</label>
                  <input 
                    type="text" 
                    value={formData.sender}
                    onChange={(e) => setFormData({...formData, sender: e.target.value})}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium" 
                    placeholder="Masukkan nama Anda (kosongkan jika anonim)" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Kategori Aspirasi</label>
                  <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium">
                    <option value="">Pilih Kategori</option>
                    <option value="pengaduan">Pengaduan (Laporan)</option>
                    <option value="saran">Saran</option>
                    <option value="kritik">Kritik</option>
                    <option value="aspirasi_umum">Aspirasi Umum</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Subjek</label>
                <input 
                  list="subjek-options"
                  type="text" 
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium" 
                  placeholder="Pilih atau ketik ringkasan singkat aspirasi Anda" 
                />
                <datalist id="subjek-options">
                  <option value="Infrastruktur Jalan Rusak" />
                  <option value="Pelayanan Administrasi Desa" />
                  <option value="Fasilitas Kesehatan/Posyandu" />
                  <option value="Bantuan Sosial (Bansos)" />
                  <option value="Kebersihan dan Lingkungan" />
                  <option value="Lampu Penerangan Jalan" />
                </datalist>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Deskripsi Detail</label>
                <textarea 
                  required
                  rows={4} 
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium resize-none" 
                  placeholder="Ceritakan aspirasi Anda secara mendalam agar kami dapat menindaklanjuti dengan tepat..."
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Lampiran Foto/Dokumen (Opsional)</label>
                <label className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group block w-full text-center">
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
                  }} />
                  {!file ? (
                    <>
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <CloudUpload className="w-6 h-6 text-emerald-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Klik untuk unggah atau seret berkas ke sini</p>
                      <p className="text-xs text-slate-500 font-medium">Format: JPG, PNG, PDF (Maks. 5MB)</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                      <p className="text-sm font-bold text-emerald-700">{file.name}</p>
                      <p className="text-xs text-emerald-600/70 font-medium">Klik untuk mengubah berkas</p>
                    </>
                  )}
                </label>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl text-amber-800 border border-amber-100">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-sm font-medium leading-relaxed">
                  Setiap masukan atau laporan akan diproses dalam 2x24 jam kerja sesuai dengan Standar Operasional Prosedur Desa Digital.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-700 text-white text-base font-bold rounded-xl hover:bg-emerald-800 focus:ring-4 focus:ring-emerald-500/30 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Mengirim...
                  </span>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Kirim Aspirasi
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Sidebar Tracking & Stats (4 Columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Tracking Section */}
          <div className="bg-white shadow-xl shadow-slate-200/40 rounded-3xl p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Radar className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Lacak Aspirasi Saya</h3>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-4 leading-relaxed">
              Masukkan nomor tiket untuk melihat status tindak lanjut.
            </p>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchTicket()}
                className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium uppercase" 
                placeholder="TKT-XXXXXX" 
              />
              <button onClick={handleSearchTicket} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 cursor-pointer">
                <Search className="w-5 h-5" />
              </button>
            </div>
            
            {searchAttempted && (
              <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                {trackedTicket ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{trackedTicket.id}</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">{trackedTicket.subject}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        trackedTicket.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' :
                        trackedTicket.status === 'Proses' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {trackedTicket.status}
                      </span>
                    </div>
                    
                    {trackedTicket.adminResponse && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-emerald-100 shadow-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Tanggapan Admin</p>
                        <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{trackedTicket.adminResponse.text}</p>
                        {trackedTicket.adminResponse.fileName && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-flex">
                            <CheckCircle size={12} />
                            <span>Lampiran Tersedia</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-500 text-center py-2">Tiket tidak ditemukan. Periksa kembali nomor tiket Anda.</p>
                )}
              </div>
            )}
          </div>

          {/* Glassmorphic Stat Cards */}
          <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl"></div>
            
            <h3 className="text-xs font-bold text-emerald-300 mb-6 uppercase tracking-widest relative z-10">
              Statistik Respon
            </h3>
            
            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-300" />
                  </div>
                  <span className="text-sm font-medium text-emerald-100">Selesai Ditangani</span>
                </div>
                <span className="text-2xl font-bold text-white">1.240</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Clock className="w-5 h-5 text-amber-300" />
                  </div>
                  <span className="text-sm font-medium text-emerald-100">Dalam Proses</span>
                </div>
                <span className="text-2xl font-bold text-white">84</span>
              </div>
              
              <div className="pt-2">
                <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden mb-2">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '93%' }}></div>
                </div>
                <p className="text-xs font-bold text-emerald-200 text-center uppercase tracking-wider">
                  93% Tingkat Penyelesaian
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Quick Links */}
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-4 tracking-tight">Panduan Aspirasi</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-3 p-3 hover:bg-white rounded-xl transition-all cursor-pointer group shadow-sm hover:shadow-md border border-transparent hover:border-slate-100">
                <div className="w-8 h-8 bg-slate-100 group-hover:bg-emerald-50 rounded-lg flex items-center justify-center transition-colors">
                  <HelpCircle className="w-4 h-4 text-slate-500 group-hover:text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Cara menyampaikan pengaduan?</span>
              </li>
              <li className="flex items-center gap-3 p-3 hover:bg-white rounded-xl transition-all cursor-pointer group shadow-sm hover:shadow-md border border-transparent hover:border-slate-100">
                <div className="w-8 h-8 bg-slate-100 group-hover:bg-emerald-50 rounded-lg flex items-center justify-center transition-colors">
                  <Shield className="w-4 h-4 text-slate-500 group-hover:text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Kerahasiaan identitas pelapor</span>
              </li>
              <li className="flex items-center gap-3 p-3 hover:bg-white rounded-xl transition-all cursor-pointer group shadow-sm hover:shadow-md border border-transparent hover:border-slate-100">
                <div className="w-8 h-8 bg-slate-100 group-hover:bg-emerald-50 rounded-lg flex items-center justify-center transition-colors">
                  <Clock className="w-4 h-4 text-slate-500 group-hover:text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Waktu pengerjaan tindak lanjut</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
