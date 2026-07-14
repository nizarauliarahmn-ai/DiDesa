import React, { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import { getCurrentYear } from '../../utils/dateHelper';

export default function BudgetSummary() {
  const [apbdesData, setApbdesData] = useState<any>(null);

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem('didesa_apbdes_data');
      if (saved) {
        setApbdesData(JSON.parse(saved));
      } else {
        setApbdesData(null); // Reset if not found
      }
    };

    loadData();

    window.addEventListener('apbdes_data_updated', loadData);
    return () => {
      window.removeEventListener('apbdes_data_updated', loadData);
    };
  }, []);

  const formatRupiahShort = (number: number) => {
    if (number >= 1000000000) {
      return `Rp ${(number / 1000000000).toFixed(2)} M`;
    } else if (number >= 1000000) {
      return `Rp ${(number / 1000000).toFixed(2)} Jt`;
    }
    return `Rp ${number.toLocaleString('id-ID')}`;
  };

  const pendapatan = apbdesData ? apbdesData.pendapatan : 1420000000;
  const belanja = apbdesData ? apbdesData.belanja : 1150000000;
  const persentase = ((belanja / pendapatan) * 100).toFixed(1);

  return (
    <section className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Ringkasan APBDes {apbdesData ? apbdesData.tahun : getCurrentYear()}</h4>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Transparansi Anggaran Pendapatan & Belanja Desa</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-xl shrink-0">
          <Wallet className="text-amber-600 w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
          <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-1">Pendapatan</p>
          <p className="text-xl font-bold text-emerald-700">{formatRupiahShort(pendapatan)}</p>
        </div>
        <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
          <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-1">Belanja</p>
          <p className="text-xl font-bold text-red-600">{formatRupiahShort(belanja)}</p>
        </div>
        <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
          <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-1">Realisasi</p>
          <p className="text-xl font-bold text-amber-600">{persentase}%</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm font-bold text-gray-700 dark:text-slate-300">
          <span>Penyaluran Dana Desa</span>
          <span className="text-emerald-700">{persentase}%</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="bg-emerald-600 h-full rounded-full transition-all duration-1000" style={{ width: `${persentase}%` }}></div>
        </div>
      </div>
    </section>
  );
}
