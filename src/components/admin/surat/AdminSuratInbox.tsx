import { UnifiedResidentSearch } from '../penduduk/UnifiedResidentSearch';
import React, { useState, useEffect } from 'react';
import { Search, FileText, CheckCircle, Clock } from 'lucide-react';
import { fetchLetterHistoryAsync, LetterHistory, updateLetterHistoryAsync } from '../../../utils/letterHistory';

interface AdminSuratInboxProps {
  onEditLetter?: (letter: LetterHistory) => void;
}

export default function AdminSuratInbox({ onEditLetter }: AdminSuratInboxProps) {
  const [suratList, setSuratList] = useState<LetterHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchLetterHistoryAsync().then(data => {
      // Filter hanya yang berstatus pending/Menunggu, hilangkan 'Proses'
      const pending = data.filter(s => s.status === 'pending' || (s.status as string) === 'Menunggu');
      setSuratList(pending);
      setIsLoading(false);
    });
  }, []);

  const handleReview = async (s: LetterHistory) => {
    if (onEditLetter) {
      if (s.status === 'pending' || (s.status as string) === 'Menunggu') {
        await updateLetterHistoryAsync(s.id, { status: 'Proses' });
        const updated: LetterHistory = { ...s, status: 'Proses' };
        setSuratList(prev => prev.filter(item => item.id !== s.id));
        onEditLetter(updated);
      } else {
        onEditLetter(s);
      }
    }
  };

  const filteredSurat = suratList.filter(s => {
    const q = debouncedSearchQuery.toLowerCase();
    const matchesSearch = 
      (s.nik || '').toLowerCase().includes(q) ||
      (s.nama || '').toLowerCase().includes(q) ||
      (s.jenis || '').toLowerCase().includes(q);
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-6 h-6 text-orange-500" />
            Kotak Masuk Permohonan
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daftar permohonan surat dari Layanan Mandiri yang perlu di-review dan disetujui.
          </p>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari berdasarkan NIK, Nama, atau Jenis Surat..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm outline-none transition-all dark:text-slate-100"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jenis Surat</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Pemohon</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <p>Memuat kotak masuk...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSurat.length > 0 ? (
                filteredSurat.map(surat => (
                  <tr key={surat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {surat.tanggal}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-500">
                          {surat.jenis}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 max-w-xs">
                        Keperluan: {surat.keperluan}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {surat.nama}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        NIK: {surat.nik}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleReview(surat)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Review Permohonan
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                      </div>
                      <p className="font-medium text-slate-600 dark:text-slate-300">Hore! Kotak masuk kosong.</p>
                      <p className="text-sm">Semua permohonan telah selesai direview.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
