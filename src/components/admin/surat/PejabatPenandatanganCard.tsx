import { resolveKadesName } from '../../../utils/letterOfficers';
import { useState, useEffect } from 'react';

interface PejabatPenandatanganCardProps {
  namaPejabat: string;
  setNamaPejabat: (name: string) => void;
  jabatanPejabat: string;
  setJabatanPejabat: (role: string) => void;
}

export default function PejabatPenandatanganCard({
  namaPejabat,
  setNamaPejabat,
  jabatanPejabat,
  setJabatanPejabat,
}: PejabatPenandatanganCardProps) {
  // Load officers from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('village_officers');
    if (stored) {
      const list = JSON.parse(stored);
      // Set initial jabatan if namaPejabat matches an officer
      const found = list.find((o: any) => o.name === namaPejabat);
      if (found) {
        setJabatanPejabat(found.role);
      }
    }
  }, [namaPejabat]);

  const handleNamaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setNamaPejabat(name);
    // Update role if found in stored officers list
    try {
      const stored = localStorage.getItem('village_officers');
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find((o: any) => o.name === name);
        if (found) {
          setJabatanPejabat(found.role);
        }
      }
    } catch (e) {}
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path className="stroke-2" strokeLinecap="round" strokeLinejoin="round" d="M12 7v6m4 4h4m-4 4h4M4.06 12A11.95 11.95 0 0112 2.01a11.95 11.95 0 0110.94 18.99A11.96 11.96 0 0112 22a11.95 11.95 0 01-10.94-3.01A11.96 11.96 0 01.06 12z" />
          </svg>
        </div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Pejabat Penandatangan</h3>
      </div>

      <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50">
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-amber-900">Nama Pejabat</label>
            <select
              value={namaPejabat}
              onChange={handleNamaChange}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold"
            >
              <option value="">-- Pilih Pejabat --</option>
              <option value={resolveKadesName() || ''}>{resolveKadesName() || 'Kepala Desa (Default)'}</option>
              {/* Options will be populated dynamically if needed */}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-amber-900">Jabatan</label>
            <input
              type="text"
              value={jabatanPejabat}
              onChange={(e) => setJabatanPejabat(e.target.value)}
              readOnly
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold"
            />
          </div>
        </div>
      </div>
    </div>
  );
}