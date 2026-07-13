import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Rocket, ShieldCheck, Zap, Info } from 'lucide-react';
import Markdown from 'react-markdown';

interface GlobalUpdate {
  id: string;
  title: string;
  content: string;
  version: string;
  release_date: string;
  type: string;
}

export const GlobalUpdateNotifier: React.FC = () => {
  const [latestUpdate, setLatestUpdate] = useState<GlobalUpdate | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Global Branding
  const [globalName, setGlobalName] = useState(() => localStorage.getItem('global_app_name') || 'DiDesa');
  const [globalColor, setGlobalColor] = useState(() => localStorage.getItem('global_app_color') || '#047857');

  useEffect(() => {
    const handleBrandingUpdate = () => {
      setGlobalName(localStorage.getItem('global_app_name') || 'DiDesa');
      setGlobalColor(localStorage.getItem('global_app_color') || '#047857');
    };
    window.addEventListener('global_branding_updated', handleBrandingUpdate);

    const fetchUpdates = async () => {
      try {
        const response = await fetch('/api/global-updates');
        if (!response.ok) return;
        const updates: GlobalUpdate[] = await response.json();
        
        if (updates.length > 0) {
          const latest = updates[0];
          const lastSeenVersion = localStorage.getItem('didesa_last_seen_version');
          
          if (lastSeenVersion !== latest.version) {
            setLatestUpdate(latest);
            // Don't show immediately, wait a bit for the app to settle
            setTimeout(() => setIsVisible(true), 2000);
          }
        }
      } catch (err) {
        console.error('Failed to fetch global updates:', err);
      }
    };

    fetchUpdates();
    return () => window.removeEventListener('global_branding_updated', handleBrandingUpdate);
  }, []);

  const handleClose = () => {
    if (latestUpdate) {
      localStorage.setItem('didesa_last_seen_version', latestUpdate.version);
    }
    setIsVisible(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'feature': return <Rocket className="w-6 h-6 text-blue-500" />;
      case 'fix': return <ShieldCheck className="w-6 h-6 text-emerald-500" />;
      case 'improvement': return <Zap className="w-6 h-6 text-amber-500" />;
      default: return <Info className="w-6 h-6 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'feature': return 'Fitur Baru';
      case 'fix': return 'Perbaikan Sistem';
      case 'improvement': return 'Peningkatan';
      default: return 'Pembaruan';
    }
  };

  if (!latestUpdate) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div 
              className="relative p-6 text-white"
              style={{ background: `linear-gradient(135deg, ${globalColor}, ${globalColor}dd)` }}
            >
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Apa Yang Baru di {globalName}?</h2>
                  <p className="text-white/80 text-xs font-medium">Versi {latestUpdate.version} • {new Date(latestUpdate.release_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto text-gray-700">
              <div 
                className="flex items-start gap-4 mb-6 p-4 rounded-xl border"
                style={{ backgroundColor: `${globalColor}08`, borderColor: `${globalColor}20` }}
              >
                <div className="shrink-0">
                  {getIcon(latestUpdate.type)}
                </div>
                <div>
                  <span 
                    className="inline-block px-2 py-0.5 rounded-full bg-white text-[10px] font-bold border mb-1"
                    style={{ color: globalColor, borderColor: `${globalColor}30` }}
                  >
                    {getTypeLabel(latestUpdate.type)}
                  </span>
                  <h3 className="font-bold text-lg leading-tight" style={{ color: globalColor }}>{latestUpdate.title}</h3>
                </div>
              </div>

              <div className="prose prose-slate max-w-none text-gray-600 text-sm leading-relaxed">
                <Markdown>{latestUpdate.content}</Markdown>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleClose}
                className="px-8 py-3 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95"
                style={{ backgroundColor: globalColor, boxShadow: `0 4px 12px ${globalColor}33` }}
              >
                Mengerti & Lanjutkan
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
