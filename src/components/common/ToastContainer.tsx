import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; id: number } | null>(null);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setToast({
          message: customEvent.detail.message,
          type: customEvent.detail.type || 'success',
          id: Date.now()
        });
      }
    };
    window.addEventListener('app-toast', handleToast);
    return () => window.removeEventListener('app-toast', handleToast);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div 
          key={toast.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.2 } }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="fixed bottom-5 right-5 z-[9999]"
        >
          <div className={`flex items-center gap-3 px-4.5 py-3.5 rounded-2xl border shadow-xl bg-white max-w-sm ${
            toast.type === 'success' ? 'border-emerald-200 text-emerald-800' :
            toast.type === 'error' ? 'border-rose-200 text-rose-800' :
            'border-blue-200 text-blue-800'
          }`}>
            {toast.type === 'success' && (
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            )}
            {toast.type === 'error' && (
              <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
            )}
            {toast.type === 'info' && (
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-[13px] font-bold leading-snug">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)} 
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors ml-2 flex-shrink-0"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
