import React from 'react';
import { Calendar } from 'lucide-react';

interface YearFilterProps {
  value: string;
  onChange: (year: string) => void;
  className?: string;
}

export default function YearFilter({ value, onChange, className = '' }: YearFilterProps) {
  const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar size={14} className="text-gray-400 shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-3 pr-8 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 outline-none focus:border-emerald-500 transition-colors cursor-pointer"
      >
        <option value="Semua Tahun">Semua Tahun</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
