import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, Info, CheckCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  type = 'danger'
}: ConfirmModalProps) {
  
  const getThemeClasses = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-50 text-red-600 border-red-100',
          confirmBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white shadow-red-100',
          icon: Trash2
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white shadow-amber-100',
          icon: AlertTriangle
        };
      case 'success':
        return {
          iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white shadow-emerald-100',
          icon: CheckCircle
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white shadow-blue-100',
          icon: Info
        };
    }
  };

  const theme = getThemeClasses();
  const Icon = theme.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 p-6 flex flex-col items-center text-center z-10"
          >
            {/* Close Button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Wrapper */}
            <div className={`p-4 rounded-2xl border mb-5 ${theme.iconBg} flex items-center justify-center`}>
              <Icon className="w-8 h-8 animate-pulse" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
              {title}
            </h3>

            {/* Message */}
            <div className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-6 leading-relaxed px-2">
              {message}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-100 dark:border-slate-800 hover:border-gray-200 text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-gray-100"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all shadow-lg dark:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme.confirmBtn}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
