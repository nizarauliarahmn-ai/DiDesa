import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import { resolveCurrentTenant } from '../../../utils/tenantResolver';

interface BackdateConfigProps {
  prefix: string;
  suffix: string;
  tanggalSurat: string;
  onTanggalSuratChange: (value: string) => void;
  isBackdate: boolean;
  onBackdateChange: (value: boolean) => void;
  manualSequence: string;
  onManualSequenceChange: (value: string) => void;
  normalNomor?: string;
  onCustomNomorSurat?: (value: string) => void;
}

export default function BackdateConfig({
  prefix,
  suffix,
  tanggalSurat,
  onTanggalSuratChange,
  isBackdate,
  onBackdateChange,
  manualSequence,
  onManualSequenceChange,
  normalNomor,
  onCustomNomorSurat,
}: BackdateConfigProps) {
  const [lastSequenceHint, setLastSequenceHint] = useState('');
  const [isFetchingHint, setIsFetchingHint] = useState(false);
  const normalNomorRef = useRef('');
  const previousIsBackdate = useRef(isBackdate);

  const tahunDariTanggalSurat = tanggalSurat ? new Date(tanggalSurat).getFullYear() : new Date().getFullYear();

  const buildInsertNomorSurat = (seq: string) => {
    const trimmed = (seq || '').trim();
    return trimmed ? `${prefix}/${trimmed}/${suffix}/${tahunDariTanggalSurat}`.toUpperCase() : '';
  };

  const handleSequenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    onManualSequenceChange(value);
    onCustomNomorSurat?.(buildInsertNomorSurat(value));
  };

  // Pertahankan nomor normal (auto) agar bisa dipulihkan saat sisipan dimatikan
  useEffect(() => {
    if (!isBackdate && normalNomor && normalNomor.trim() !== '') {
      normalNomorRef.current = normalNomor;
    }
  }, [normalNomor, isBackdate]);

  // Toggle berubah: saat menyala kosongkan sequence & nomor; saat mati pulihkan nomor normal
  useEffect(() => {
    if (previousIsBackdate.current === isBackdate) {
      previousIsBackdate.current = isBackdate;
      return;
    }
    previousIsBackdate.current = isBackdate;

    if (isBackdate) {
      onManualSequenceChange('');
      onCustomNomorSurat?.('');
    } else {
      onCustomNomorSurat?.(normalNomorRef.current);
    }
  }, [isBackdate]);

  // Smart Hint: cari nomor surat terakhir sebelum/tepat tanggal surat sisipan
  useEffect(() => {
    if (!isBackdate) {
      setLastSequenceHint('');
      setIsFetchingHint(false);
      return;
    }

    let cancelled = false;

    async function fetchLastNumberHint() {
      setIsFetchingHint(true);
      try {
        const tenantId = await resolveCurrentTenant();
        if (!tenantId || cancelled) return;

        const endOfDay = new Date(tanggalSurat);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('surat')
          .select('nomor')
          .eq('tenant_id', tenantId)
          .lte('created_at', endOfDay.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        let seq = '';
        if (data && data[0]?.nomor) {
          const parts = String(data[0].nomor).split('/').map(p => p.trim()).filter(Boolean);
          if (parts.length >= 2 && /^\d+(?:\.\d+)?$/.test(parts[1])) {
            seq = parts[1].split('.')[0];
          } else {
            for (const p of parts) {
              if (/^\d{2,4}$/.test(p) && p !== prefix) {
                seq = p;
                break;
              }
            }
          }
        }
        if (!cancelled) setLastSequenceHint(seq);
      } catch (e) {
        console.error('Gagal mengambil hint nomor surat terakhir:', e);
        if (!cancelled) setLastSequenceHint('');
      } finally {
        if (!cancelled) setIsFetchingHint(false);
      }
    }

    fetchLastNumberHint();
    return () => { cancelled = true; };
  }, [isBackdate, tanggalSurat]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
      <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
        <Calendar className="w-4 h-4 text-emerald-600" /> Pengaturan Tanggal & Nomor Surat
      </h3>

      <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <div>
            <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">Buat Surat Sisipan (Tanggal Mundur)</span>
            <span className="block text-[10px] text-slate-500 mt-0.5">Aktifkan untuk menyisipkan surat lama. Nomor surat wajib diisi manual.</span>
          </div>
          <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${isBackdate ? 'rotate-180' : ''}`} />
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
          <input
            type="checkbox"
            checked={isBackdate}
            onChange={(e) => onBackdateChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </div>

      {isBackdate && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Tanggal Surat {isBackdate ? '(Backdate)' : '(Hari Ini)'}
          </label>
          <input
            type="date"
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            value={tanggalSurat}
            disabled={!isBackdate}
            max={isBackdate ? new Date().toISOString().split('T')[0] : undefined}
            onChange={(e) => onTanggalSuratChange(e.target.value)}
          />
          <p className="text-[10px] text-slate-500">
            {isBackdate
              ? 'Pilih tanggal surat (maksimal hari ini). Nomor surat diisi manual di bawah.'
              : 'Tanggal terkunci ke hari ini. Aktifkan toggle di atas untuk membuat surat sisipan.'}
          </p>
        </div>

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Nomor Urut Sisipan <span className="text-red-500">*</span>
          </label>
          {isBackdate ? (
            <>
              <input
                type="text"
                value={manualSequence}
                onChange={handleSequenceChange}
                placeholder="Contoh: 045.A"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                required
              />

              {isFetchingHint ? (
                <p className="mt-1.5 text-xs text-slate-500 font-medium">Memuat nomor terakhir...</p>
              ) : lastSequenceHint ? (
                <p className="mt-1.5 text-xs text-blue-600 font-medium">
                  💡 Terakhir: <b>{lastSequenceHint}</b> (Saran: <b>{lastSequenceHint}.A</b>)
                </p>
              ) : null}

              <div className="mt-2.5 p-2 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-600 rounded-md text-center shadow-inner overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <span className="text-[9px] text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5 font-bold">
                  Pratinjau Nomor:
                </span>
                <div className="font-bold text-gray-700 dark:text-slate-200 text-[11px] tracking-wide whitespace-nowrap">
                  {prefix} / <span className="text-emerald-600 dark:text-emerald-400 border-b border-emerald-300 px-0.5">{manualSequence || '___'}</span> / {suffix} / {tahunDariTanggalSurat}
                </div>
              </div>
            </>
          ) : (
            <input
              type="text"
              value={normalNomor || ''}
              disabled
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          )}
        </div>
      </div>
      )}
    </div>
  );
}