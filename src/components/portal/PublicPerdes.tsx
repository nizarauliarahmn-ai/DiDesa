import React, { useState, useEffect } from 'react';
import { FileText, Download, Link2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

interface PerdesData {
  id: string;
  no: number;
  tahun: string;
  uraian: string;
  tanggal: string;
  tanggalDiundangkan: string;
  jenisDokumen: string;
  ketLain: string;
  linkFile: string;
  documentData: string;
  documentName: string;
  documentType: string;
}

export default function PublicPerdes({ onBack }: { onBack: () => void }) {
  const [perdes, setPerdes] = useState<PerdesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const perdesId = params.get('perdes_id');
    if (perdesId) fetchPerdes(perdesId);
    else setLoading(false);
  }, []);

  const fetchPerdes = async (id: string) => {
    try {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('saas_settings')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'produk_hukum_data')
        .single();

      if (error || !data?.value) { setLoading(false); return; }

      const all = JSON.parse(data.value);
      const perdesItems: PerdesData[] = all['perdes'] || [];
      const found = perdesItems.find((item) => item.id === id);
      setPerdes(found || null);
    } catch {
      setPerdes(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = () => {
    if (!perdes?.documentData) return;
    const byteCharacters = atob(perdes.documentData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: perdes.documentType || 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = perdes.documentName || 'Dokumen_Perdes.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (val: any): string => {
    if (!val) return '-';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      const d = new Date(val);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (typeof val === 'number') {
      const d = new Date((val - 25569) * 86400 * 1000);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return String(val);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!perdes) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <FileText size={48} className="text-gray-300" />
        <p className="text-gray-500">Data Perdes tidak ditemukan.</p>
        <p className="text-xs text-gray-400">Dokumen ini dikelola oleh <a href="https://sistemdidesa.id" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">sistemdidesa.id</a></p>
        <p className="text-[10px] text-gray-300 mt-1">2026 · DiDesa · Sistem Digitalisasi Desa Modern di Indonesia</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-sm font-medium mb-6">
          <ArrowLeft size={16} /> Kembali
        </button>
        <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4">
            <div className="flex items-center gap-2 text-white">
              <FileText size={20} />
              <h1 className="text-lg font-bold">PERATURAN DESA</h1>
            </div>
            <p className="text-emerald-100 text-xs mt-1">Dokumen resmi produk hukum desa</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Nomor</p>
              <p className="text-sm font-bold text-slate-800">{perdes.no || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Tahun</p>
              <p className="text-sm font-bold text-slate-800">{perdes.tahun || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Uraian</p>
              <p className="text-sm text-slate-700 leading-relaxed">{perdes.uraian || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Tanggal</p>
                <p className="text-sm text-slate-700">{formatDate(perdes.tanggal)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Tgl Diundangkan</p>
                <p className="text-sm text-slate-700">{formatDate(perdes.tanggalDiundangkan)}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Jenis Dokumen</p>
              <p className="text-sm font-medium text-slate-700">{perdes.jenisDokumen || '-'}</p>
            </div>
            {perdes.ketLain && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Keterangan</p>
                <p className="text-sm text-slate-700">{perdes.ketLain}</p>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap gap-3">
            {perdes.linkFile && (
              <a href={perdes.linkFile} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                <Link2 size={15} /> Buka Link
              </a>
            )}
            {perdes.documentData && (
              <button onClick={handleDownloadDocument}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors">
                <Download size={15} /> Unduh Dokumen
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Dokumen ini dikelola oleh <a href="https://sistemdidesa.id" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">sistemdidesa.id</a></p>
        <p className="text-center text-[10px] text-gray-300 mt-2">2026 · DiDesa · Sistem Digitalisasi Desa Modern di Indonesia</p>
      </div>
    </div>
  );
}
