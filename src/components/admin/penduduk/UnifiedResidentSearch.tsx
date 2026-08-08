import React, { useState, useRef, useEffect } from 'react';
import { ResidentStatusBadge } from './ResidentStatusBadge';
import { capitalizeResidentFields } from '../../../utils/textUtils';

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

  return (
    <>
      <div className="space-y-2 relative" ref={activeField === 'nama' ? dropdownRef : null}>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
        <input 
          type="text"
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
          value={formData.nama}
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
        {showDropdown && activeField === 'nama' && formData.nama && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20">
            {filteredResidents.length > 0 ? (
              filteredResidents.map((res: any) => (
                <button
                  key={res.nik}
                  onClick={() => handleSelectResident(res)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                  type="button"
                >
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-bold shrink-0">
                    {res.name?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{res.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">NIK: {res.nik} &bull; {res.desa}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">Warga tidak ditemukan di Data Desa.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    onOpenQuickAdd();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all text-xs cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  <span>+ Tambah Warga Baru</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 relative" ref={activeField === 'nik' ? dropdownRef : null}>
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK</label>
        <input 
          type="text"
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
          value={formData.nik}
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
        {showDropdown && activeField === 'nik' && formData.nik && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20">
            {filteredResidents.length > 0 ? (
              filteredResidents.map((res: any) => (
                <button
                  key={res.nik}
                  onClick={() => handleSelectResident(res)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                  type="button"
                >
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-bold shrink-0">
                    {res.name?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{res.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">NIK: {res.nik} &bull; {res.desa}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">Warga tidak ditemukan di Data Desa.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    onOpenQuickAdd();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all text-xs cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  <span>+ Tambah Warga Baru</span>
                </button>
              </div>
            )}
          </div>
        )}
        <ResidentStatusBadge
          nik={formData.nik}
          name={formData.nama}
          onOpenQuickAdd={() => onOpenQuickAdd()}
        />
      </div>
    </>
  );
}
