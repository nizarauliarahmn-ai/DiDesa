import React, { useState, useEffect } from 'react';
import { Joyride, STATUS, TooltipRenderProps } from 'react-joyride';
import { X, ChevronRight, Check, Sparkles } from 'lucide-react';

interface IntroductionTourProps {
  role: string;
}

const CustomTooltip = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
  size
}: TooltipRenderProps) => {
  return (
    <div {...tooltipProps} className="bg-white rounded-[24px] shadow-2xl overflow-hidden w-[340px] max-w-[90vw] font-sans border border-gray-100/50 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm border border-white/20 shadow-inner">
              <Sparkles size={14} className="animate-pulse" />
            </div>
            <h3 className="text-white font-bold text-sm tracking-wide">Panduan Cepat</h3>
          </div>
          {!isLastStep && (
            <button {...closeProps} className="text-emerald-100 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all active:scale-95">
              <X size={18} />
            </button>
          )}
        </div>
        
        <div className="relative z-10 w-full h-1.5 bg-black/20 rounded-full mt-4 overflow-hidden backdrop-blur-sm border border-black/10">
           <div className="h-full bg-white rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ width: `${((index + 1) / size) * 100}%` }} />
        </div>
      </div>
      
      <div className="p-6">
        <div className="text-gray-700 text-[15px] leading-relaxed mb-8 font-medium">
          {step.content}
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase">
              Langkah {index + 1} / {size}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button 
                {...backProps}
                className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
              >
                Kembali
              </button>
            )}
            <button 
              {...primaryProps}
              className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-700/30 transition-all flex items-center gap-1.5 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              {isLastStep ? (
                <>Selesai <Check size={16} /></>
              ) : (
                <>Lanjut <ChevronRight size={16} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function IntroductionTour({ role }: IntroductionTourProps) {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<any[]>([]);

  useEffect(() => {
    if (role === 'saas_admin') return;
    const hasSeenTour = localStorage.getItem(`has_seen_tour_${role}`);
    
    if (!hasSeenTour) {
      localStorage.setItem(`has_seen_tour_${role}`, 'true');
      const isMobile = window.innerWidth < 1024;
      
      if (role === 'admin' || role === 'kades') {
        setSteps([
          {
            target: 'body',
            content: 'Selamat datang di Panel Admin DiDesa! Mari kita mulai tur singkat untuk mengenalkan fitur-fitur utama.',
            placement: 'center',
            disableBeacon: true,
          },
          {
            target: '#tour-dashboard',
            content: 'Ini adalah Dashboard utama Anda. Di sini Anda dapat melihat statistik ringkasan dan aktivitas terbaru desa.',
          },
          {
            target: '#tour-penduduk',
            content: 'Kelola data penduduk desa secara mudah dan cepat di menu ini.',
          },
          {
            target: '#tour-surat',
            content: 'Pusat layanan administrasi persuratan elektronik. Anda dapat menyetujui atau menolak permohonan warga dari sini.',
          },
        ]);
      } else {
        setSteps([
          {
            target: 'body',
            content: 'Selamat datang di Layanan Mandiri DiDesa! Mari kita mulai tur singkat untuk mengenalkan fitur-fitur utama.',
            placement: 'center',
            disableBeacon: true,
          },
          {
            target: isMobile ? '#tour-mobile-layanan' : '#tour-public-layanan',
            content: 'Ajukan layanan surat pengantar secara mandiri di menu ini.',
          },
          {
            target: isMobile ? '#tour-mobile-aspirasi' : '#tour-public-aspirasi',
            content: 'Sampaikan aspirasi dan laporan Anda langsung kepada pemerintah desa.',
          },
          {
            target: isMobile ? '#tour-mobile-berita' : '#tour-public-berita',
            content: 'Baca berita dan pengumuman terbaru dari desa Anda.',
          }
        ]);
      }
      
      setTimeout(() => {
        setRun(true);
      }, 1000);
    }
  }, [role]);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem(`has_seen_tour_${role}`, 'true');
    }
  };

  const JoyrideComponent = Joyride as any;

  return (
    <JoyrideComponent
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      tooltipComponent={CustomTooltip}
      styles={{
        options: {
          zIndex: 10000,
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        }
      } as any}
    />
  );
}
