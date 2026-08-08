import React, { useState, useRef, useEffect } from 'react';
import { ResidentStatusBadge } from './ResidentStatusBadge';
import { capitalizeResidentFields } from '../../../utils/textUtils';
import { UserPlus } from 'lucide-react';

interface UnifiedResidentSearchProps {
  formData: any;
  setFormData: (data: any) => void;
  residents: any[];
  onOpenQuickAdd: () => void;
}

export function UnifiedResidentSearch({ formData, setFormData, residents, onOpenQuickAdd }: UnifiedResidentSearchProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeField, setActiveField] = useState<'nama' | 'nik' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setActiveField(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResident = (res: any) => {
    const rt_rw = res.rt_rw || '001/001';
    const [rt, rw] = rt_rw.split('/');

    setFormData((prev: any) => ({
      ...prev,
      nama: capitalizeResidentFields(res).name,
      nik: res.nik,
      tempatLahir: capitalizeResidentFields(res).birthPlace,
      tanggalLahir: res.birthDate,
      jenisKelamin: res.gender || 'Laki-Laki',
      agama: res.religion || 'Islam',
      pekerjaan: res.job || 'Wiraswasta',
      alamat: capitalizeResidentFields(res).address,
      rt: rt || '001',
      rw: rw || '001',
    }));
    setShowDropdown(false);
    setActiveField(null);
  };

  const getFilteredResidents = () => {
    if (!activeField) return [];
    const query = activeField === 'nama' ? formData.nama : formData.nik;
    if (!query) return [];
    
    return residents.filter((r: any) => 
      (r.name || '').toLowerCase().includes((query || '').toLowerCase()) || 
      (r.nik || '').includes(query || '')
    ).slice(0, 5);
  };

  const filteredResidents = getFilteredResidents();

  const renderDropdown = (field: 'nama' | 'nik') => {
    const queryVal = field === 'nama' ? formData.nama : formData.nik;
    if (!showDropdown || activeField !== field || !queryVal) return null;

    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-30">
        {filteredResidents.length > 0 ? (
          filteredResidents.map((res: any) => (
            <button
              key={res.nik}
              onClick={() => handleSelectResident(res)}
              className="w-full p-3.5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer"
              type="button"
            >
              <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/50 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0 text-sm">
                {res.name?.[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{res.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">NIK: {res.nik} &bull; {res.desa || 'Desa'}</p>
              </div>
            </button>
          ))
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowDropdown(false);
              onOpenQuickAdd();
            }}
            className="w-full p-3.5 flex items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-colors cursor-pointer group"
          >
            <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/60 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 font-bold group-hover:scale-105 transition-transform">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-emerald-700 dark:text-emerald-400 text-xs truncate">
                + Tambah "{queryVal}" sebagai Warga Baru
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Warga belum ada di Data Desa. Klik untuk mendaftarkan.
              </p>
            </div>
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-2 relative" ref={activeField === 'nama' ? dropdownRef : null}>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
        <input 
          type="text"
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
          placeholder="Ketik nama warga..."
          value={formData.nama || ''}
          onChange={(e) => {
            const val = e.target.value;
            setFormData(typeof setFormData === 'function' ? (prev: any) => ({...prev, nama: val}) : {...formData, nama: val});
            setActiveField('nama');
            setShowDropdown(true);
          }}
          onFocus={() => {
            setActiveField('nama');
            if (formData.nama) setShowDropdown(true);
          }}
        />
        {renderDropdown('nama')}
      </div>

      <div className="space-y-2 relative" ref={activeField === 'nik' ? dropdownRef : null}>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK</label>
        <input 
          type="text"
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
          placeholder="Ketik NIK warga..."
          value={formData.nik || ''}
          onChange={(e) => {
            const val = e.target.value;
            setFormData(typeof setFormData === 'function' ? (prev: any) => ({...prev, nik: val}) : {...formData, nik: val});
            setActiveField('nik');
            setShowDropdown(true);
          }}
          onFocus={() => {
            setActiveField('nik');
            if (formData.nik) setShowDropdown(true);
          }}
        />
        {renderDropdown('nik')}
        <ResidentStatusBadge
          nik={formData.nik}
          name={formData.nama}
          onOpenQuickAdd={() => onOpenQuickAdd()}
        />
      </div>
    </>
  );
}
