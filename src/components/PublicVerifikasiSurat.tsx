import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Building2, Calendar, FileText, User, Hash, ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function PublicVerifikasiSurat() {
  const [loading, setLoading] = useState(true);
  const [letter, setLetter] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const letterId = urlParams.get('id') || urlParams.get('no') || '';

  useEffect(() => {
    const fetchLetter = async () => {
      if (!letterId) {
        setError("ID Surat tidak valid atau tidak ditemukan dalam URL.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Search by ID or nomor
        const { data, error: dbError } = await supabase
          .from('surat')
          .select('*')
          .or(`id.eq.${letterId},nomor.eq.${letterId}`)
          .single();

        if (dbError || !data) {
          setError("Dokumen surat tidak ditemukan dalam sistem database resmi desa.");
        } else {
          setLetter(data);
        }
      } catch (err: any) {
        setError("Gagal memverifikasi dokumen: " + (err.message || "Kesalahan jaringan"));
      } finally {
        setLoading(false);
      }
    };

    fetchLetter();
  }, [letterId]);

  // Mask NIK for privacy protection: 320101******0002
  const maskNik = (nikStr: string) => {
    if (!nikStr || nikStr.length < 12) return nikStr || '-';
    return `${nikStr.slice(0, 6)}******${nikStr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      {/* Container Card */}
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden my-auto">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-6 md:p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <ShieldCheck className="w-64 h-64" />
          </div>

          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner">
            <Building2 className="w-9 h-9 text-emerald-300" />
          </div>

          <h2 className="text-xs font-extrabold uppercase tracking-widest text-emerald-200">SISTEM VERIFIKASI DOKUMEN RESMI</h2>
          <h1 className="text-2xl font-black mt-1 tracking-tight">PEMERINTAH DESA SUKAMAJU</h1>
          <p className="text-xs text-emerald-100/80 mt-1 font-medium">Kabupaten Bogor, Jawa Barat • Terintegrasi di sistemdidesa.id</p>
        </div>

        {/* Dynamic Verification Content */}
        <div className="p-6 md:p-8 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Memverifikasi keaslian dokumen di server...</p>
            </div>
          ) : error || !letter ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-950/50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100 dark:border-red-900">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-red-700 dark:text-red-400">DOKUMEN TIDAK TERVERIFIKASI</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">{error}</p>
              </div>
              <div className="pt-4">
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Verified Success Badge */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex items-center gap-4 text-emerald-900 dark:text-emerald-200">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                    DOKUMEN TERVERIFIKASI SAH & RESMI VIA PLATFORM DiDesa
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
                    Dokumen ini terdaftar secara sah dalam arsip pelayanan elektronik Pemerintah Desa.
                  </p>
                </div>
              </div>

              {/* Letter Details Grid */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="flex justify-between items-start border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jenis Surat</span>
                    <p className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">{letter.jenis_surat || "Surat Keterangan"}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold rounded-lg text-[10px]">
                    Status: {letter.status?.toUpperCase() || 'SELESAI'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nomor Surat</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{letter.nomor || "-"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Diterbitkan</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">
                      {letter.created_at ? new Date(letter.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Pemohon</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{letter.nama || "-"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NIK Pemohon (Protected)</span>
                    <p className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs mt-0.5">{maskNik(letter.nik)}</p>
                  </div>
                </div>

                {letter.keterangan && (
                  <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-3 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perihal / Keperluan</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{letter.keterangan}</p>
                  </div>
                )}
              </div>

              {/* TTE Signer Details */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">PENANDATANGAN SAH</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">KEPALA DESA SUKAMAJU</p>
                  <p className="text-slate-600 dark:text-slate-400 font-semibold">Drs. H. Sukirman</p>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-400">
                  <span className="block font-bold text-emerald-600">BSrE / TTE Verified</span>
                  <span>ID: {letter.id?.slice(0, 8)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100/60 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 font-medium">
          Dikelola secara aman oleh <strong>DiDesa — Platform Smart Village Indonesia</strong>
        </div>
      </div>
    </div>
  );
}
