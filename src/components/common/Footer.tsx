import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Mail, Phone, Globe, Instagram, Music, ChevronUp, MessageSquare, Send, X as CloseIcon, Facebook, Twitter, Youtube, Linkedin } from 'lucide-react';
import { addFeedback } from '../../utils/feedbackData';

export default function Footer({ isAdmin = false }: { isAdmin?: boolean }) {
  const footerRef = useRef<HTMLElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    nama: '',
    pesan: '',
    kategori: 'Saran' as 'Saran' | 'Kritik' | 'Bug'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Global Branding
  const [globalName, setGlobalName] = useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalLogo, setGlobalLogo] = useState(() => localStorage.getItem('global_app_logo') || '');
  const [globalColor, setGlobalColor] = useState(() => localStorage.getItem('global_app_color') || '#047857');
  
  // Dynamic Footer Settings
  const [globalFooterDesc, setGlobalFooterDesc] = useState(() => localStorage.getItem('global_footer_desc') ?? 'Solusi Digital Terpadu untuk Tata Kelola & Administrasi Desa Mandiri yang Modern dan Transparan.');
  const [globalFooterEmail, setGlobalFooterEmail] = useState(() => localStorage.getItem('global_footer_email') ?? 'info@didesa.id');
  const [globalFooterPhone, setGlobalFooterPhone] = useState(() => localStorage.getItem('global_footer_phone') ?? '+62 813-4686-7519');
  const [globalFooterAffiliateTitle, setGlobalFooterAffiliateTitle] = useState(() => localStorage.getItem('global_footer_affiliate_title') ?? 'AFFILIATOR');
  const [globalFooterAffiliateSubtitle, setGlobalFooterAffiliateSubtitle] = useState(() => localStorage.getItem('global_footer_affiliate_subtitle') ?? 'Mendigitalisasi desa & raih komisi nyata.');
  const [globalFooterAffiliateLink, setGlobalFooterAffiliateLink] = useState(() => localStorage.getItem('global_footer_affiliate_link') ?? 'https://wa.me/6281346867519?text=Affiliator');
  const [globalFooterSocial1Icon, setGlobalFooterSocial1Icon] = useState(() => localStorage.getItem('global_footer_social1_icon') ?? 'instagram');
  const [globalFooterSocial1Link, setGlobalFooterSocial1Link] = useState(() => localStorage.getItem('global_footer_social1_link') ?? 'https://instagram.com/didesa.id');
  const [globalFooterSocial2Icon, setGlobalFooterSocial2Icon] = useState(() => localStorage.getItem('global_footer_social2_icon') ?? 'tiktok');
  const [globalFooterSocial2Link, setGlobalFooterSocial2Link] = useState(() => localStorage.getItem('global_footer_social2_link') ?? 'https://tiktok.com/@didesa.id');
  const [globalFooterCopyright, setGlobalFooterCopyright] = useState(() => localStorage.getItem('global_footer_copyright') ?? '© 2026 • HAK CIPTA DILINDUNGI');

  const renderSocialIcon = (iconUrl: string) => {
    if (!iconUrl) return <Globe className="w-4 h-4" />;
    if (iconUrl.startsWith('http') || iconUrl.startsWith('data:')) {
      return <img src={iconUrl} alt="Social" className="w-4 h-4 object-contain opacity-70 group-hover:opacity-100 transition-opacity" />;
    }
    // Fallback for legacy static icon names
    switch(iconUrl) {
      case 'instagram': return <Instagram className="w-4 h-4" />;
      case 'tiktok': return <Music className="w-4 h-4" />;
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'twitter': return <Twitter className="w-4 h-4" />;
      case 'youtube': return <Youtube className="w-4 h-4" />;
      case 'linkedin': return <Linkedin className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.pesan) return;
    setIsSubmitting(true);

    const authUser = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
    const villageName = localStorage.getItem('kop_desa') || 'Umum';

    addFeedback({
      nama: authUser.name || feedbackForm.nama || 'Anonim',
      desa: villageName,
      email: authUser.email || '-',
      pesan: feedbackForm.pesan,
      tanggal: new Date().toISOString().split('T')[0],
      kategori: feedbackForm.kategori
    });

    setTimeout(() => {
      setIsSubmitting(false);
      setIsModalOpen(false);
      setFeedbackForm({ nama: '', pesan: '', kategori: 'Saran' });
      setIsSuccessModalOpen(true);
      
      // Auto close success modal after 4 seconds
      setTimeout(() => {
        setIsSuccessModalOpen(false);
      }, 4000);
    }, 1000);
  };

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!footerRef.current) {
            ticking = false;
            return;
          }
          const scrollParent = footerRef.current.closest('.overflow-y-auto');
          if (!scrollParent) {
            ticking = false;
            return;
          }

          const { scrollTop, scrollHeight, clientHeight } = scrollParent as HTMLElement;
          // Deteksi jika user sudah mencapai batas bawah (toleransi 20px)
          const isBottom = scrollHeight - scrollTop - clientHeight < 20;
          setIsAtBottom(isBottom);
          ticking = false;
        });
        ticking = true;
      }
    };

    const scrollParent = footerRef.current?.closest('.overflow-y-auto');
    if (scrollParent) {
      scrollParent.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
    }

    const handleBrandingUpdate = () => {
      setGlobalName(localStorage.getItem('global_app_name') || 'DiDesa');
      setGlobalLogo(localStorage.getItem('global_app_logo') || '');
      setGlobalColor(localStorage.getItem('global_app_color') || '#047857');
      setGlobalFooterDesc(localStorage.getItem('global_footer_desc') ?? 'Solusi Digital Terpadu untuk Tata Kelola & Administrasi Desa Mandiri yang Modern dan Transparan.');
      setGlobalFooterEmail(localStorage.getItem('global_footer_email') ?? 'info@didesa.id');
      setGlobalFooterPhone(localStorage.getItem('global_footer_phone') ?? '+62 813-4686-7519');
      setGlobalFooterAffiliateTitle(localStorage.getItem('global_footer_affiliate_title') ?? 'AFFILIATOR');
      setGlobalFooterAffiliateSubtitle(localStorage.getItem('global_footer_affiliate_subtitle') ?? 'Mendigitalisasi desa & raih komisi nyata.');
      setGlobalFooterAffiliateLink(localStorage.getItem('global_footer_affiliate_link') ?? 'https://wa.me/6281346867519?text=Affiliator');
      setGlobalFooterSocial1Icon(localStorage.getItem('global_footer_social1_icon') ?? 'instagram');
      setGlobalFooterSocial1Link(localStorage.getItem('global_footer_social1_link') ?? 'https://instagram.com/didesa.id');
      setGlobalFooterSocial2Icon(localStorage.getItem('global_footer_social2_icon') ?? 'tiktok');
      setGlobalFooterSocial2Link(localStorage.getItem('global_footer_social2_link') ?? 'https://tiktok.com/@didesa.id');
      setGlobalFooterCopyright(localStorage.getItem('global_footer_copyright') ?? '© 2026 • HAK CIPTA DILINDUNGI');
    };

    window.addEventListener('global_branding_updated', handleBrandingUpdate);

    return () => {
      scrollParent?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('global_branding_updated', handleBrandingUpdate);
    };
  }, []);

  return (
    <footer 
      ref={footerRef}
      className={`print:hidden fixed bottom-[70px] lg:bottom-0 ${
        isAdmin 
          ? 'left-4 lg:left-[calc(18rem+1.5rem)] right-4 lg:right-6' 
          : 'left-4 lg:left-1/2 right-4 lg:right-auto lg:-translate-x-1/2 lg:w-[calc(100%-4rem)] max-w-7xl'
      } z-40 rounded-t-2xl lg:rounded-b-none rounded-b-2xl will-change-transform group select-none print:hidden border border-white/60 overflow-hidden ${
        isAtBottom 
          ? 'translate-y-0 shadow-[0_-8px_32px_rgba(0,0,0,0.05)]' 
          : 'translate-y-[calc(100%-48px)] hover:translate-y-0 hover:shadow-[0_-8px_32px_rgba(0,0,0,0.15)]'
      }`}
      style={{
        transition: 'transform 0.6s cubic-bezier(0.2, 1, 0.2, 1)',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.3) 100%)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.8), 0 -8px 32px rgba(0, 0, 0, 0.05)'
      }}
    >
      {/* Brand Bar */}
      <div className="h-[55px] px-4 md:px-8 flex items-center justify-between border-b border-white/20">
        <div className="flex items-center gap-3 transition-transform duration-500 group-hover:translate-y-[-2px]">
          <div 
            className="w-5 h-5 rounded flex items-center justify-center text-white font-black text-[8px] shadow-sm dark:shadow-none shrink-0"
            style={{ backgroundColor: globalColor }}
          >
            {globalLogo ? <img src={globalLogo} className="w-3.5 h-3.5 object-contain" /> : globalName.charAt(0)}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-black tracking-tight text-slate-800 dark:text-slate-100 uppercase">{globalName} Indonesia</span>
            {globalFooterCopyright && (
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">{globalFooterCopyright}</span>
            )}
          </div>
        </div>

        <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-2 transition-all duration-500 ${isAtBottom ? 'opacity-0 scale-90 translate-y-2 pointer-events-none' : 'opacity-100 scale-100 translate-y-0 group-hover:opacity-0 group-hover:scale-90 group-hover:translate-y-2 group-hover:pointer-events-none'}`}>
          <span className="text-[9px] font-black text-emerald-800 uppercase tracking-[0.2em] flex items-center gap-2">
            Informasi & Kemitraan
            <ChevronUp className="w-3 h-3 text-emerald-600 animate-bounce" />
          </span>
        </div>

        <button 
          onClick={() => {
            const scrollContainer = document.querySelector('.overflow-y-auto');
            if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`text-[9px] font-black text-slate-500 dark:text-slate-400 hover:text-emerald-700 transition-all duration-300 uppercase tracking-widest flex items-center gap-1 ${isAtBottom ? 'opacity-100 translate-y-[-2px]' : 'opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-[-2px] group-hover:pointer-events-auto'}`}
        >
          KEMBALI KE ATAS
        </button>
      </div>

      {/* Main Content (Compact Grid) */}
      <div className="px-4 md:px-8 py-5 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-5 items-center">
          
          {/* Info Section */}
          <div className="lg:col-span-3">
            {globalFooterDesc && (
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed opacity-80 text-center sm:text-left">
                {globalFooterDesc}
              </p>
            )}
          </div>

          {/* Contact Section */}
          <div className="lg:col-span-3 flex flex-col gap-1.5 items-center sm:items-start">
            <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Kontak Hubungi</h4>
            <div className="flex flex-col gap-1 items-center sm:items-start">
              {globalFooterEmail && (
                <a href={`mailto:${globalFooterEmail}`} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 hover:text-emerald-700 font-bold transition-colors">
                  <Mail className="w-3 h-3 text-emerald-600" /> {globalFooterEmail}
                </a>
              )}
              {globalFooterPhone && (
                <a href={`tel:${globalFooterPhone.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 hover:text-emerald-700 font-bold transition-colors">
                  <Phone className="w-3 h-3 text-emerald-600" /> {globalFooterPhone}
                </a>
              )}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-1 flex items-center gap-2 text-[10px] text-emerald-700 font-bold tracking-wide hover:opacity-70 group/saran"
              >
                <MessageSquare className="w-3 h-3 group-hover/saran:scale-110 transition-transform" /> 
                <span>Kirim Saran Fitur</span>
              </button>
            </div>

            {/* Saran Fitur Modal */}
            {isModalOpen && createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">
                  <div className="bg-emerald-700 p-6 text-white flex justify-between items-center">
                    <div>
                       <h3 className="text-xl font-bold">Kirim Saran & Kritik</h3>
                       <p className="text-emerald-100 text-xs mt-1">Bantu kami mengembangkan {globalName} lebih baik.</p>
                     </div>
                     <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                       <CloseIcon size={20} />
                     </button>
                   </div>
                   <form onSubmit={handleSubmitFeedback} className="p-6 space-y-4">
                     <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Anda (Opsional)</label>
                       <input 
                         type="text" 
                         value={feedbackForm.nama}
                         onChange={e => setFeedbackForm({...feedbackForm, nama: e.target.value})}
                         className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                         placeholder="Nama Anda..."
                       />
                     </div>
                     <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kategori</label>
                       <div className="grid grid-cols-3 gap-2">
                         {(['Saran', 'Kritik', 'Bug'] as const).map(cat => (
                           <button
                             key={cat}
                             type="button"
                             onClick={() => setFeedbackForm({...feedbackForm, kategori: cat})}
                             className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${feedbackForm.kategori === cat ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg dark:shadow-none shadow-emerald-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-200'}`}
                           >
                             {cat}
                           </button>
                         ))}
                       </div>
                     </div>
                     <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pesan</label>
                       <textarea 
                         required
                         value={feedbackForm.pesan}
                         onChange={e => setFeedbackForm({...feedbackForm, pesan: e.target.value})}
                         rows={4}
                         className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all resize-none"
                         placeholder="Tuliskan saran, kritik, atau bug yang Anda temukan di sini..."
                       />
                     </div>
                     <button 
                       disabled={isSubmitting}
                       className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-xl shadow-emerald-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                     >
                       {isSubmitting ? (
                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       ) : (
                         <>
                           <Send size={18} />
                           <span>Kirim Sekarang</span>
                         </>
                       )}
                     </button>
                   </form>
                 </div>
               </div>,
               document.body
             )}
             
             {/* Success Modal */}
             {isSuccessModalOpen && createPortal(
               <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                 <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">
                   <div className="p-8 text-center flex flex-col items-center">
                     <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                       <Send className="w-8 h-8 text-emerald-600" />
                     </div>
                     <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Terima Kasih!</h3>
                     <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
                       Saran dan masukan Anda sangat berharga untuk membuat <strong>{globalName}</strong> menjadi lebih baik lagi di masa depan.
                     </p>
                     <button 
                       onClick={() => setIsSuccessModalOpen(false)}
                       className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-200 transition-all active:scale-[0.98]"
                     >
                       Selesai
                     </button>
                   </div>
                 </div>
               </div>,
               document.body
             )}
           </div>

          {/* Affiliator Card */}
          <div className="lg:col-span-4">
            {globalFooterAffiliateTitle && (
              <div className="bg-emerald-700/80 backdrop-blur-md rounded-xl p-3 flex items-center justify-between gap-3 border border-emerald-600/30 shadow-lg dark:shadow-none shadow-emerald-900/5 group/card relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 transition-transform group-hover/card:scale-150 duration-700" />
                <div className="flex-1 space-y-0.5 relative z-10">
                  <h4 className="text-[9px] font-black text-emerald-100 uppercase tracking-widest leading-none">{globalFooterAffiliateTitle}</h4>
                  {globalFooterAffiliateSubtitle && (
                    <p className="text-[10px] text-white font-bold leading-tight">
                      {globalFooterAffiliateSubtitle}
                    </p>
                  )}
                </div>
                {globalFooterAffiliateLink && (
                  <a 
                    href={globalFooterAffiliateLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="whitespace-nowrap px-4 py-1.5 bg-white dark:bg-slate-900 text-emerald-800 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-50 transition-all shadow-sm dark:shadow-none active:scale-95 relative z-10"
                  >
                    GABUNG
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Social Icons */}
          <div className="lg:col-span-2 flex justify-center lg:justify-end gap-2">
            {globalFooterSocial1Link && (
              <a href={globalFooterSocial1Link} target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/40 border border-white/50 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 flex items-center justify-center transition-all hover:-translate-y-0.5 shadow-sm dark:shadow-none overflow-hidden">
                {renderSocialIcon(globalFooterSocial1Icon)}
              </a>
            )}
            {globalFooterSocial2Link && (
              <a href={globalFooterSocial2Link} target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/40 border border-white/50 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 flex items-center justify-center transition-all hover:-translate-y-0.5 shadow-sm dark:shadow-none overflow-hidden">
                {renderSocialIcon(globalFooterSocial2Icon)}
              </a>
            )}
          </div>

        </div>
      </div>
    </footer>
  );
}
