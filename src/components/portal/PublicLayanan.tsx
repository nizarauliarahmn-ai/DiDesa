import React, { useState, useMemo, useRef } from 'react';
import { Search, ExternalLink, ChevronDown, ChevronLeft, ChevronRight, Building2, ClipboardList } from 'lucide-react';
import { LAYANAN_PUBLIK, KATEGORI_LAYANAN } from '../../data/layananPublik';

export default function PublicLayanan({ embedded = false }: { embedded?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState<(typeof KATEGORI_LAYANAN)[number]>('Semua');
  const [openId, setOpenId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollRow = (dir: number) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return LAYANAN_PUBLIK.filter(l => {
      const matchKat = filterKategori === 'Semua' || l.kategori === filterKategori;
      if (!matchKat) return false;
      if (!q) return true;
      return (
        l.nama.toLowerCase().includes(q) ||
        l.kementerian.toLowerCase().includes(q) ||
        l.deskripsi.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, filterKategori]);

  return (
    <div className={embedded ? 'pb-2' : 'min-h-screen bg-gray-50 dark:bg-slate-950 pb-24'}>
      <div className={embedded ? 'w-full' : 'max-w-5xl mx-auto px-4 pt-10'}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center">
            <Building2 size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Pusat Layanan Eksternal</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Layanan kementerian & lembaga luar desa dalam satu tempat</p>
          </div>
        </div>

        {/* Search + filter */}
        <div className="mt-5 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari layanan, mis. KTP, bansos, nikah..."
              className="w-full pl-10 pr-4 h-10 border border-gray-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-gray-400 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {KATEGORI_LAYANAN.map(k => (
              <button
                key={k}
                onClick={() => setFilterKategori(k)}
                className={`px-3 h-10 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  filterKategori === k
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-3">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {filtered.length} layanan{filterKategori !== 'Semua' ? ` • ${filterKategori}` : ''} • Syarat bersifat umum, konfirmasi ke perangkat desa
          </p>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => scrollRow(-1)}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Geser kiri"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scrollRow(1)}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Geser kanan"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Cards */}
        <div ref={scrollRef} className="flex gap-3 mt-4 overflow-x-auto snap-x snap-mandatory pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          {filtered.map(l => {
            const open = openId === l.id;
            return (
              <div key={l.id} className="w-[85%] sm:w-80 shrink-0 snap-start bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {l.kementerian}
                </span>
                <h2 className="text-base font-bold text-gray-900 dark:text-white mt-2">{l.nama}</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{l.deskripsi}</p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setOpenId(open ? null : l.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <ClipboardList size={14} /> Syarat
                    <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {l.internal ? (
                    <a
                      href={l.url}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                    >
                      Buka Layanan
                    </a>
                  ) : (
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                    >
                      Buka Layanan <ExternalLink size={14} />
                    </a>
                  )}
                </div>
                {open && (
                  <ul className="mt-3 space-y-1.5 border-t border-gray-100 dark:border-slate-800 pt-3">
                    {l.syarat.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-300">
                        <span className="w-4 h-4 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-12">Tidak ada layanan yang cocok.</p>
        )}
      </div>
    </div>
  );
}
