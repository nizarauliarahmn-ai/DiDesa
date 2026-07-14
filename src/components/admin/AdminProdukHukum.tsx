import React, { useState } from 'react';
import { FileText, Save, PlusCircle, Search } from 'lucide-react';
import { showToast } from '../../utils/toast';

export default function AdminProdukHukum() {
  const [activeTab, setActiveTab] = useState<'sk' | 'perdes'>('sk');

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Produk Hukum & SK</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Kelola penomoran SK Kades, Perdes, dan Perkades</p>
        </div>
        <button 
          onClick={() => showToast("Fitur tambah produk hukum dalam pengembangan", "info")}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors shadow-sm dark:shadow-none"
        >
          <PlusCircle size={18} />
          <span>Tambah Data</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden min-h-[500px] flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mb-6">
          <FileText size={32} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Penomoran Produk Hukum</h3>
        <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Fitur ini akan berfungsi untuk merekam penomoran SK, Perdes, Perkades, dan dokumen hukum desa lainnya secara terpusat. Sedang dalam tahap pengembangan lanjutan.
        </p>
      </div>
    </div>
  );
}
