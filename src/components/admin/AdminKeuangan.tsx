import NumberCounter from '../common/NumberCounter';
import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, Loader2, DollarSign, Target, TrendingUp, TrendingDown, PieChart, Info, Save } from 'lucide-react';
import { showToast } from '../../utils/toast';

export default function AdminKeuangan() {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apbdesData, setApbdesData] = useState<any>(() => {
    const saved = localStorage.getItem('didesa_apbdes_data');
    return saved ? JSON.parse(saved) : null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.type.includes('spreadsheet')) {
      showToast('Mohon unggah file PDF atau Excel dari Siskeudes.', 'error');
      return;
    }

    setIsUploading(true);
    // Simulate upload delay
    setTimeout(() => {
      setIsUploading(false);
      setIsProcessing(true);
      
      // Simulate AI Processing delay
      setTimeout(() => {
        const simulatedExtractedData = {
          tahun: new Date().getFullYear(),
          pendapatan: 1542000000,
          belanja: 1500000000,
          pembiayaan: -42000000,
          kategori: [
            { nama: 'Penyelenggaraan Pemerintahan', nilai: 450000000, persen: 30 },
            { nama: 'Pelaksanaan Pembangunan', nilai: 600000000, persen: 40 },
            { nama: 'Pembinaan Kemasyarakatan', nilai: 150000000, persen: 10 },
            { nama: 'Pemberdayaan Masyarakat', nilai: 225000000, persen: 15 },
            { nama: 'Penanggulangan Bencana', nilai: 75000000, persen: 5 },
          ],
          lastUpdated: new Date().toISOString(),
          fileName: file.name
        };
        
        setApbdesData(simulatedExtractedData);
        localStorage.setItem('didesa_apbdes_data', JSON.stringify(simulatedExtractedData));
        window.dispatchEvent(new Event('apbdes_data_updated'));
        
        setIsProcessing(false);
        showToast('Laporan APBDes berhasil diproses AI DiDesa!', 'success');
      }, 3000);
    }, 1500);
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header Info */}
      <section className="bg-slate-50 border-b border-slate-200/50 pb-6 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Manajemen Keuangan & APBDes</h2>
          <p className="text-gray-500 mt-1 text-sm">Upload laporan Siskeudes, biarkan AI DiDesa mengekstrak dan mempublikasikannya otomatis.</p>
        </div>
      </section>

      {/* Upload Section */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <h4 className="text-xl font-bold text-gray-900">Impor Laporan Siskeudes</h4>
        </div>
        
        <div className="bg-blue-50/40 border-2 border-dashed border-blue-100 p-8 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-blue-50/70 transition-all text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2 shadow-sm">
            {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
          </div>
          <div>
            <h5 className="text-lg font-bold text-gray-900 leading-snug">Unggah File PDF atau Excel Siskeudes</h5>
            <p className="text-sm text-gray-500 leading-relaxed mt-2 max-w-lg mx-auto">AI akan secara otomatis membaca struktur laporan Anda dan memperbarui data Transparansi Dana di Portal Publik.</p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isProcessing}
            className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
          >
            {isUploading || isProcessing ? 'Memproses...' : 'Pilih File Laporan'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".pdf,.xlsx,.xls" 
            className="hidden" 
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* AI Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center justify-center text-center max-w-sm w-full">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
            </div>
            <h4 className="font-extrabold text-gray-900 text-lg">AI Sedang Mengekstrak Data</h4>
            <p className="text-sm text-gray-500 mt-2 font-medium">Memindai tabel pendapatan, belanja, dan pembiayaan...</p>
          </div>
        </div>
      )}

      {/* Data Preview */}
      {apbdesData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" /> Data Terekstrak: {apbdesData.tahun}
            </h3>
            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">Sumber: {apbdesData.fileName}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border-l-4 border-emerald-500 shadow-sm">
              <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500"/> Pendapatan</p>
              <h3 className="text-2xl font-extrabold text-gray-900"><NumberCounter end={apbdesData.pendapatan} formatter={formatRupiah} /></h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border-l-4 border-rose-500 shadow-sm">
              <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-rose-500"/> Belanja</p>
              <h3 className="text-2xl font-extrabold text-gray-900"><NumberCounter end={apbdesData.belanja} formatter={formatRupiah} /></h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border-l-4 border-blue-500 shadow-sm">
              <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2"><Target className="w-4 h-4 text-blue-500"/> Pembiayaan</p>
              <h3 className="text-2xl font-extrabold text-gray-900"><NumberCounter end={apbdesData.pembiayaan} formatter={formatRupiah} /></h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-gray-400" /> Rincian Bidang Belanja
            </h4>
            <div className="space-y-4">
              {apbdesData.kategori.map((kat: any, i: number) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors gap-2">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">{kat.nama}</p>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{width: `${kat.persen}%`}}></div>
                    </div>
                  </div>
                  <div className="text-right sm:w-48">
                    <p className="font-extrabold text-gray-900">{formatRupiah(kat.nilai)}</p>
                    <p className="text-xs text-gray-500 font-bold">{kat.persen}% dari total</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 flex items-start gap-3 text-sm font-medium">
            <Info className="w-5 h-5 shrink-0 text-emerald-600" />
            <p>Data APBDes berhasil diproses dan disimpan. Data ini otomatis sinkron dengan menu Transparansi Dana di Portal Publik. Warga sekarang dapat melihat pembaruan ini.</p>
          </div>
        </div>
      )}
    </div>
  );
}
