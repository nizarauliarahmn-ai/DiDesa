import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, Clock, AlertTriangle, Eye, X, MessageSquareText, UploadCloud, Edit2, MessageCircle, Printer, Calendar } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

export interface Aspirasi {
  id: string;
  sender: string;
  category: string;
  subject: string;
  content: string;
  fileName?: string | null;
  adminResponse?: {
    text: string;
    fileName?: string | null;
    date: string;
  } | null;
  status: 'Menunggu' | 'Proses' | 'Selesai';
  date: string;
}


export default function AdminAspirasi({
  searchQuery: externalSearchQuery,
  setSearchQuery: externalSetSearchQuery,
  debouncedSearchQuery: externalDebouncedSearchQuery
}: {
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  debouncedSearchQuery?: string;
} = {}) {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localDebouncedSearchQuery, setLocalDebouncedSearchQuery] = useState('');
  
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = externalSetSearchQuery !== undefined ? externalSetSearchQuery : setLocalSearchQuery;

  // Handle local debouncing if no external debounced query is provided
  React.useEffect(() => {
    if (externalDebouncedSearchQuery !== undefined) return;
    const timer = setTimeout(() => {
      setLocalDebouncedSearchQuery(localSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery, externalDebouncedSearchQuery]);

  const debouncedSearchQuery = externalDebouncedSearchQuery !== undefined ? externalDebouncedSearchQuery : localDebouncedSearchQuery;
  const [filter, setFilter] = useState('Semua');
  const [selectedAspirasi, setSelectedAspirasi] = useState<Aspirasi | null>(null);
  const [aspirasiList, setAspirasiList] = useState<Aspirasi[]>([]);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [responseText, setResponseText] = useState('');
  const [newStatus, setNewStatus] = useState<'Menunggu' | 'Proses' | 'Selesai'>('Menunggu');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');

  const handlePrint = () => {
    let toPrint = [...aspirasiList];
    if (printStartDate) {
      toPrint = toPrint.filter(a => new Date(a.date) >= new Date(printStartDate));
    }
    if (printEndDate) {
      toPrint = toPrint.filter(a => new Date(a.date) <= new Date(printEndDate));
    }

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const printWindow = iframe.contentWindow;
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Laporan Aspirasi Warga</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            body { font-family: sans-serif; padding: 20mm; color: #111827; margin: 0; }
            .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
            h2 { margin: 0 0 10px 0; font-size: 24px; }
            p.period { color: #4b5563; font-size: 14px; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background-color: #f9fafb; font-weight: 600; color: #374151; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .status { font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase; }
            .status.Selesai { color: #047857; background-color: #d1fae5; }
            .status.Proses { color: #1d4ed8; background-color: #dbeafe; }
            .status.Menunggu { color: #b45309; background-color: #fef3c7; }
            .print-btn { padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 20px; }
            @media print {
              .print-btn { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">Cetak Dokumen</button>
          <div class="header">
            <h2>Laporan Aspirasi Warga</h2>
            <p class="period">Periode: ${printStartDate || 'Awal'} s/d ${printEndDate || 'Akhir'}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID Tiket</th>
                <th>Tanggal</th>
                <th>Pengirim</th>
                <th>Kategori</th>
                <th>Subjek</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${toPrint.map(a => `
                <tr>
                  <td>${a.id}</td>
                  <td>${a.date}</td>
                  <td>${a.sender}</td>
                  <td style="text-transform: capitalize;">${a.category}</td>
                  <td>${a.subject}</td>
                  <td><span class="status ${a.status}">${a.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
    
    setShowPrintModal(false);
  };


  useEffect(() => {
    const loadAspirasi = async () => {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) return;

      const { data, error } = await supabase
        .from('aspirasi')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (data) {
        const formatted: Aspirasi[] = data.map((item: any) => ({
          id: item.id,
          sender: item.nama_pengirim || 'Anonim',
          category: item.kategori,
          subject: item.kategori, // Since kiosk only sends kategori and pesan
          content: item.pesan,
          status: item.status === 'Baru' ? 'Menunggu' : item.status,
          date: item.created_at,
          fileName: null,
          adminResponse: item.tanggapan_admin ? {
            text: item.tanggapan_admin,
            fileName: item.file_bukti || null,
            date: item.tanggapan_date || item.created_at
          } : null
        }));
        setAspirasiList(formatted);
      }
    };
    loadAspirasi();
    
    const channel = supabase
      .channel('aspirasi_admin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aspirasi' }, () => {
         loadAspirasi();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async () => {
    if (!selectedAspirasi) return;
    
    const { error } = await supabase
      .from('aspirasi')
      .update({
        status: newStatus === 'Menunggu' ? 'Baru' : newStatus,
        tanggapan_admin: responseText || null,
        tanggapan_date: responseText ? new Date().toISOString() : null,
        file_bukti: proofFile ? proofFile.name : null
      })
      .eq('id', selectedAspirasi.id);

    if (error) {
      showToast('Gagal memperbarui status aspirasi', 'error');
      console.error(error);
      return;
    }
    
    showToast('Status aspirasi berhasil diperbarui', 'success');
    setSelectedAspirasi({ 
      ...selectedAspirasi, 
      status: newStatus,
      adminResponse: responseText ? { text: responseText, fileName: proofFile ? proofFile.name : null, date: new Date().toISOString() } : selectedAspirasi.adminResponse
    });
    setProofFile(null);
  };

  const filteredAspirasi = aspirasiList.filter(a => {
    const matchesSearch = a.subject.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || a.id.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    const matchesFilter = filter === 'Semua' || a.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <>
    <div className="max-w-6xl mx-auto pb-24 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Aspirasi Warga</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Kelola dan tindak lanjuti masukan dari masyarakat</p>
        </div>
        <button 
          onClick={() => setShowPrintModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors shadow-sm dark:shadow-none"
        >
          <Printer size={18} />
          Cetak Laporan
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm dark:shadow-none p-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Cari nomor tiket atau subjek..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            <Filter className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
            {['Semua', 'Menunggu', 'Proses', 'Selesai'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  filter === f 
                    ? 'bg-emerald-600 text-white shadow-sm dark:shadow-none' 
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800">
                <th className="py-4 px-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tiket</th>
                <th className="py-4 px-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                <th className="py-4 px-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Pengirim</th>
                <th className="py-4 px-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Subjek</th>
                <th className="py-4 px-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="py-4 px-4 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAspirasi.map(aspirasi => (
                <tr key={aspirasi.id} onClick={() => { setSelectedAspirasi(aspirasi); setNewStatus(aspirasi.status); setResponseText(aspirasi.adminResponse?.text || ''); }} className="hover:bg-emerald-50/50 transition-colors cursor-pointer group">
                  <td className="py-4 px-4 text-sm font-bold text-gray-900 dark:text-white">{aspirasi.id}</td>
                  <td className="py-4 px-4 text-sm font-medium text-gray-500 dark:text-slate-400">{aspirasi.date}</td>
                  <td className="py-4 px-4 text-sm font-bold text-gray-700 dark:text-slate-300">{aspirasi.sender}</td>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900 dark:text-white max-w-[200px] truncate">{aspirasi.subject}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      aspirasi.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      aspirasi.status === 'Proses' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {aspirasi.status === 'Selesai' ? <CheckCircle size={12} /> : 
                       aspirasi.status === 'Proses' ? <Clock size={12} /> : 
                       <AlertTriangle size={12} />}
                      {aspirasi.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button 
                      className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 group-hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Jawab
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAspirasi.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 dark:text-slate-400 font-medium">
                    Tidak ada aspirasi yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAspirasi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <MessageSquareText className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white leading-none">Detail Aspirasi</h3>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-1 uppercase tracking-wider">{selectedAspirasi.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAspirasi(null)}
                className="w-8 h-8 flex items-center justify-center bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Kategori</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{selectedAspirasi.category}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pengirim</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedAspirasi.sender}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Subjek</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedAspirasi.subject}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Isi Aspirasi</p>
                  <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-800 text-sm font-medium text-gray-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                    {selectedAspirasi.content}
                  </div>
                </div>
                {selectedAspirasi.fileName && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Lampiran</p>
                    <div className="flex items-center gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                        <CheckCircle size={14} />
                      </div>
                      <span className="text-xs font-bold text-emerald-800">{selectedAspirasi.fileName}</span>
                    </div>
                  </div>
                )}
                {selectedAspirasi.adminResponse && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tanggapan Admin</p>
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                      <p className="text-sm font-medium text-emerald-900 whitespace-pre-wrap">{selectedAspirasi.adminResponse.text}</p>
                      {selectedAspirasi.adminResponse.fileName && (
                        <div className="flex items-center gap-2 p-2 bg-white/60 border border-emerald-200/50 rounded-lg inline-flex">
                          <CheckCircle size={14} className="text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-800">{selectedAspirasi.adminResponse.fileName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status Saat Ini</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedAspirasi.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      selectedAspirasi.status === 'Proses' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {selectedAspirasi.status === 'Selesai' ? <CheckCircle size={14} /> : 
                       selectedAspirasi.status === 'Proses' ? <Clock size={14} /> : 
                       <AlertTriangle size={14} />}
                      {selectedAspirasi.status}
                    </span>
                  </div>
                  
                  <div className="space-y-4 bg-blue-50/30 p-4 rounded-xl border border-blue-100 mt-4">
                    <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <MessageCircle size={16} /> Form Jawaban & Tindak Lanjut
                    </h4>
                    
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Ubah Status</label>
                      <select 
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as any)}
                      >
                        <option value="Menunggu">Menunggu</option>
                        <option value="Proses">Diproses</option>
                        <option value="Selesai">Selesai Ditangani</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 block">Tanggapan/Jawaban (Opsional)</label>
                      <textarea
                        placeholder="Ketik tanggapan Anda di sini..."
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 min-h-[100px] resize-none"
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                      ></textarea>
                    </div>

                    <div className="pt-2">
                      <p className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">Lampiran Foto/Dokumen (Opsional)</p>
                      <label className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-900 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <UploadCloud size={16} className="text-gray-500 dark:text-slate-400" />
                        <span className="text-xs font-bold text-gray-600 dark:text-slate-400">
                          {proofFile ? proofFile.name : 'Pilih Berkas'}
                        </span>
                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setProofFile(e.target.files[0]);
                        }} />
                      </label>
                    </div>
                    
                    <div className="pt-2">
                      <button 
                        onClick={handleUpdateStatus}
                        className="w-full py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md dark:shadow-none shadow-blue-600/20"
                      >
                        Kirim Jawaban
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedAspirasi(null)}
                className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Printer size={20} className="text-slate-700 dark:text-slate-300" /> Cetak Laporan
              </h3>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Pilih rentang tanggal aspirasi yang ingin dicetak.</p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block uppercase tracking-wider">Tanggal Mulai</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      type="date" 
                      value={printStartDate}
                      onChange={(e) => setPrintStartDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-10 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block uppercase tracking-wider">Tanggal Akhir</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      type="date" 
                      value={printEndDate}
                      onChange={(e) => setPrintEndDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-10 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handlePrint}
                className="px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-md dark:shadow-none shadow-blue-600/20"
              >
                Buat Laporan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
