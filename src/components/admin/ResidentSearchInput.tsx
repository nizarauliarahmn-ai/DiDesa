import React, { useState, useRef } from 'react';
import { Search, RefreshCw, Check } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

// Kolom yang sah (valid) pada tabel `residents` — hanya kolom ini yang dipakai
// untuk query search agar tidak pernah memuat kolom yang tidak ada.
export const RESIDENT_VALID_COLUMNS = [
  'nik', 'name', 'gender', 'gender_color', 'birth_place', 'birth_date',
  'rt_rw', 'rt', 'rw', 'address', 'desa', 'photo'
];

export interface ResidentSearchInputProps {
  tenantId: string | null;
  /** Teks yang tampil di kotak pencarian (dipakai saat edit data lama). */
  initialText?: string;
  /** Mulai langsung dalam mode "Ketik Manual" (untuk data lama tanpa residentId). */
  initialManual?: boolean;
  /** Label unik untuk console.log debugging, mis. 'LPM/BPD' atau 'RT/RW'. */
  logLabel?: string;
  /** Dipanggil saat warga dipilih dari dropdown — parent mengisi form (auto-fill). */
  onSelect: (resident: any) => void;
  /** Dipanggil setiap kali nama diketik manual / mode manual aktif. */
  onManualName: (name: string) => void;
  /** Dipanggil saat mode manual berubah (untuk reset auto-fill di parent). */
  onManualChange?: (manual: boolean) => void;
}

const getInitials = (name: string) => {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

export default function ResidentSearchInput({
  tenantId,
  initialText = '',
  initialManual = false,
  logLabel = 'LPM/BPD/RTRW',
  onSelect,
  onManualName,
  onManualChange,
}: ResidentSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState(initialText);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(initialManual);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2 || manual) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    setOpen(true);
    console.log('Keyword Pencarian:', q);
    debounceRef.current = setTimeout(async () => {
      try {
        // Resolve tenant secara dinamis agar pencarian tidak diblokir saat tenantId belum siap
        let tid = tenantId;
        if (!tid) {
          tid = await resolveCurrentTenant();
        }

        // Escape karakter khusus PostgREST agar tidak merusak filter .or()
        const safeQ = q.replace(/[%,()*]/g, ' ').replace(/\s+/g, ' ').trim();
        console.log('Resident Search → tenant_id:', tid, '| keyword:', safeQ);

        let builder = supabase
          .from('residents')
          .select(RESIDENT_VALID_COLUMNS.join(','));

        // Isolasi multi-tenant: filter hanya jika tenant valid — jangan memblokir seluruh data saat null
        if (tid) {
          builder = builder.eq('tenant_id', tid);
        } else {
          console.warn('Resident search: tenant_id null — pencarian dijalankan tanpa filter desa.');
        }

        const { data, error } = await builder
          .or(`name.ilike.%${safeQ}%,nik.ilike.%${safeQ}%`)
          .limit(8);

        console.log(`Search Result ${logLabel}:`, data, error);

        if (error) {
          console.error(`Error searching residents (${logLabel}):`, error);
          setResults([]);
        } else {
          setResults((data || []).filter((r: any) => String(r.is_deleted) !== '1' && r.is_deleted !== true));
        }
        setSearching(false);
      } catch (e) {
        console.error(`Error searching residents (${logLabel}):`, e);
        setResults([]);
        setSearching(false);
      }
    }, 300);
  };

  const enterManual = (carryText?: string) => {
    setManual(true);
    setResults([]);
    setOpen(false);
    onManualName(String(carryText ?? searchQuery ?? '').trim().toUpperCase());
    onManualChange?.(true);
  };

  const exitManual = () => {
    setManual(false);
    setSearchQuery(searchQuery);
    onManualChange?.(false);
  };

  const handleSelect = (resident: any) => {
    setSearchQuery(resident.name || '');
    setResults([]);
    setOpen(false);
    setManual(false);
    onManualChange?.(false);
    onSelect(resident);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Nama Lengkap</label>
        <button
          type="button"
          onClick={() => (manual ? exitManual() : enterManual())}
          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${manual ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'}`}
        >
          {manual ? '✏️ Ketik Manual' : '🔎 Cari Warga'}
        </button>
      </div>

      <div className="relative">
        <div className="flex items-center gap-2">
          {!manual ? (
            <>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500"
                  value={searchQuery}
                  onChange={e => {
                    const v = e.target.value;
                    setSearchQuery(v);
                    runSearch(v);
                  }}
                  onFocus={() => { if (searchQuery.trim().length >= 2) setOpen(true); }}
                  placeholder="Cari warga berdasarkan Nama / NIK..."
                />
              </div>
              <button
                type="button"
                onClick={() => enterManual()}
                className="shrink-0 text-[10px] font-bold px-2.5 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-300 hover:bg-gray-200"
                title="Lewati pencarian, ketik nama manual"
              >
                Skip
              </button>
            </>
          ) : (
            <input
              type="text"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500"
              value={searchQuery}
              onChange={e => {
                const v = e.target.value;
                setSearchQuery(v);
                onManualName(v.toUpperCase());
              }}
              placeholder="Nama pejabat / pengurus"
            />
          )}
        </div>

        {open && !manual && (
          <div className="absolute z-20 mt-1.5 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            {searching ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Mencari data warga...
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                Data tidak ditemukan.{' '}
                <button type="button" onClick={() => enterManual()} className="text-emerald-600 font-bold hover:underline">
                  Klik di sini untuk ketik manual
                </button>
              </div>
            ) : (
              <ul className="max-h-56 overflow-y-auto custom-scrollbar">
                {results.map((r, i) => (
                  <li key={r.nik || i}>
                    <button
                      type="button"
                      onClick={() => handleSelect(r)}
                      className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                    >
                      <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                        {getInitials(r.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-gray-900 dark:text-white truncate uppercase">{r.name}</span>
                        <span className="block text-[11px] text-gray-500 dark:text-slate-400 truncate">
                          NIK. {r.nik} • {r.gender || '-'}{r.rt_rw ? ` • RT/RW ${r.rt_rw}` : ''}
                        </span>
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold shrink-0">Pilih</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {manual && (
        <p className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500">
          <Check size={12} /> Mode manual aktif — masukkan data secara manual.
        </p>
      )}
    </div>
  );
}
