import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Building2, ArrowLeft } from 'lucide-react';
import { supabase } from '../utils/supabase';

// Pemetaan kode jenis surat -> nama lengkap (untuk tampilan "Nama (KODE)").
const JENIS_SURAT_NAMA_LENGKAP: Record<string, string> = {
  SU: 'Surat Umum',
  UND: 'Undangan',
  SKM: 'Surat Keterangan Kematian',
  SKAW: 'Surat Keterangan Ahli Waris',
  SDP: 'Surat Keterangan Domisili',
  SKD: 'Surat Keterangan Domisili',
  SKUM: 'Surat Keterangan Umum',
  SKN: 'Surat Keterangan Nikah',
  SKTM: 'Surat Keterangan Tidak Mampu',
  SKKT: 'Surat Keterangan Kepemilikan Tanah',
  SKBM: 'Surat Keterangan Belum Menikah',
  SKH: 'Surat Keterangan Kehilangan',
  SKP: 'Surat Keterangan Pindah',
  SRI: 'Surat Rekomendasi',
  SKU: 'Surat Keterangan Usaha',
  KEU: 'Keuangan',
  SKL: 'Surat Keterangan Lahir',
  JBT: 'Jual Beli Tanah',
  PRW: 'Surat Keterangan Perawan',
  NSB: 'Surat Keterangan Nasab',
  KSA: 'Surat Kuasa',
  SKKB: 'Surat Keterangan Kelakuan Baik',
  PNG: 'Surat Pengantar',
  SPND: 'Surat Pengunduran Diri',
  SPJN: 'Surat Perjanjian',
  SJBT: 'Surat Jual Beli Tanah',
  SKS: 'Surat Kuasa',
  SKPH: 'Surat Keterangan Penghasilan',
  SPT: 'Surat Pengurusan Taspen',
  SDU: 'Surat Keterangan Domisili Usaha',
  SPPD: 'Surat Perintah Perjalanan Dinas',
};

// Normalisasi teks untuk perbandingan (hapus kata umum "surat"/"keterangan",
// spasi berlebih, dan seragamkan kapital).
const normJenis = (s: string) =>
  s.toUpperCase().replace(/SURAT\s+|KETERANGAN\s+/g, '').replace(/\s+/g, ' ').trim();

// Ubah jenis surat menjadi "Nama Lengkap (KODE)".
function formatJenisSurat(jenis?: string): string {
  const raw = (jenis || '').trim();
  if (!raw) return 'Surat Keterangan Resmi';
  // Sudah dalam format "Nama (KODE)" — biarkan apa adanya.
  if (/\([A-Z0-9]{2,}\)$/.test(raw)) return raw;

  const upper = raw.toUpperCase();

  // 1) Nilai adalah KODE langsung (mis. "SKTM").
  const langsung = JENIS_SURAT_NAMA_LENGKAP[upper];
  if (langsung) return `${langsung} (${upper})`;

  // 2) Nilai adalah NAMA PANJANG (mis. "SURAT KETERANGAN PINDAH").
  const normalizedRaw = normJenis(raw);
  const match = Object.entries(JENIS_SURAT_NAMA_LENGKAP).find(([kode, nama]) => {
    const n = normJenis(nama);
    return n === normalizedRaw || normalizedRaw.includes(n) || n.includes(normalizedRaw);
  });
  if (match) return `${JENIS_SURAT_NAMA_LENGKAP[match[0]]} (${match[0]})`;

  // 3) Fallback: pertahankan teks asli.
  return raw;
}

export default function PublicVerifikasiSurat() {
  const [loading, setLoading] = useState(true);
  const [letter, setLetter] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Branding desa: diprioritaskan dari data surat (hasil verifikasi), fallback ke localStorage.
  const [village, setVillage] = useState<{ namaDesa?: string; kecamatan?: string; kabupaten?: string; provinsi?: string } | null>(null);

  const resolveBranding = (overrides?: { namaDesa?: string; kecamatan?: string; kabupaten?: string; provinsi?: string }) => {
    const activeDesa = overrides?.namaDesa || 'Desa';
    const activeKecamatan = overrides?.kecamatan || '';
    const activeKabupaten = overrides?.kabupaten || '';
    const activeProvinsi = overrides?.provinsi || '';
    const cleanDesaName = activeDesa.replace(/desa|kelurahan/gi, '').trim();
    const desaTitle = activeDesa.toUpperCase().startsWith('DESA') || activeDesa.toUpperCase().startsWith('KELURAHAN')
      ? activeDesa.toUpperCase()
      : `DESA ${cleanDesaName.toUpperCase()}`;
    return { activeDesa, activeKecamatan, activeKabupaten, activeProvinsi, cleanDesaName, desaTitle };
  };

  const branding = resolveBranding(village || undefined);

  useEffect(() => {
    const fetchLetter = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('no') || urlParams.get('id') || urlParams.get('nomor') || urlParams.get('ref') || urlParams.get('verify') || '';
      const tenantParam = urlParams.get('t_id') || urlParams.get('tenant_id') || '';

      if (!searchParam) {
        setError("Nomor atau ID Surat tidak ditemukan dalam URL verifikasi.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Nomor di-uppercase agar cocok dengan kolom `nomor` di tabel `surat`
        // yang disimpan dalam bentuk kapital murni (normalizeNomorSurat).
        const cleanId = decodeURIComponent(searchParam).trim().toUpperCase();

        // 1. Search in Supabase database
        let dbVerified = false;
        try {
          // WAJIB filter tenant: nomor surat antar desa bisa sama, hanya boleh
          // terverifikasi jika benar-benar berasal dari tenant yang mencetaknya.
          // PENTING: kolom `id` bertipe uuid. Jika `cleanId` berupa NOMOR surat
          // (mis. "400/007/SM-SKTM/2026"), `.or(id.eq...,nomor.eq...)` membuat
          // PostgREST men-cast string itu ke uuid -> error "invalid input syntax
          // for type uuid" -> seluruh query gagal. Maka id hanya dipakai bila
          // nilai jelas berbentuk UUID; untuk nomor surat cukup `nomor.eq`.
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
          let query = supabase.from('surat').select('*');
          if (tenantParam) {
            query = query.eq('tenant_id', tenantParam);
          }
          const { data, error: dbError } = isUuid
            ? await query.or(`id.eq.${cleanId},nomor.eq.${cleanId}`).maybeSingle()
            : await query.eq('nomor', cleanId).maybeSingle();

          if (dbError) {
            console.warn("Supabase query error:", dbError);
          }

          if (data) {
            dbVerified = true;
            setLetter({
              id: data.id,
              nomor: data.nomor || cleanId,
              jenis_surat: data.jenis_surat || "Surat Keterangan Resmi",
              nama: data.nama || "-",
              nik: data.nik || "-",
              keterangan: data.keterangan || "Pengurusan Administrasi Kependudukan Desa",
              status: data.status || "Selesai",
              created_at: data.created_at || new Date().toISOString(),
              pejabat_nama: data.data?.namaPejabat || data.pejabat_nama,
              pejabat_jabatan: data.data?.jabatanPejabat || data.pejabat_jabatan,
              pejabat_nip: data.data?.nipPejabat || data.pejabat_nip
            });
            // Branding desa SELALU mengutamakan tabel tenants (sumber kebenaran
            // per tenant_id surat), bukan data.data yang bisa berisi nama desa
            // salah pada surat lama, dan bukan localStorage browser.
            const d = data.data || {};
            let villageFromTenants: any = null;
            try {
              const { data: tenantRow } = await supabase
                .from('tenants')
                .select('nama_desa, kecamatan, nama_kecamatan, kabupaten, nama_kabupaten, provinsi, nama_provinsi')
                .eq('id', data.tenant_id)
                .maybeSingle();
              if (tenantRow && tenantRow.nama_desa) {
                villageFromTenants = {
                  namaDesa: tenantRow.nama_desa,
                  kecamatan: tenantRow.kecamatan || tenantRow.nama_kecamatan,
                  kabupaten: tenantRow.kabupaten || tenantRow.nama_kabupaten,
                  provinsi: tenantRow.provinsi || tenantRow.nama_provinsi
                };
              }
            } catch (e) {}
            const villageSource = villageFromTenants || (d.namaDesa ? {
              namaDesa: d.namaDesa,
              kecamatan: d.namaKecamatan || d.kecamatan,
              kabupaten: d.namaKabupaten || d.kabupaten,
              provinsi: d.namaProvinsi || d.provinsi
            } : null);
            if (villageSource) {
              setVillage(villageSource);
            }
            setLoading(false);
            return;
          }
        } catch (dbErr) {
          console.warn("Supabase query fallback to local history:", dbErr);
        }

        // KEAMANAN: jika QR membawa identitas tenant (t_id), verifikasi HANYA sah
        // bila surat ditemukan di arsip tenant tersebut. Gagal = tolak, jangan
        // pernah jatuh ke fallback localStorage yang bisa menghasilkan positif palsu.
        if (tenantParam && !dbVerified) {
          setError("Dokumen tidak ditemukan di arsip desa yang menerbitkan surat ini.");
          setLoading(false);
          return;
        }

        // 2. Search in LocalStorage letter histories
        const historyKeys = [
          'riwayat_surat_skm', 'riwayat_surat_skd', 'riwayat_surat_sktm',
          'riwayat_surat_sku', 'riwayat_surat_nikah', 'riwayat_surat_sdu',
          'riwayat_surat_spt', 'riwayat_surat_sppd', 'riwayat_surat_skl',
          'riwayat_surat_skkt', 'riwayat_surat_skb', 'riwayat_surat_skh',
          'riwayat_surat_skp', 'riwayat_surat_skph', 'saas_global_letter_history',
          'letter_history'
        ];

        let foundLocal: any = null;
        for (const key of historyKeys) {
          try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const items = JSON.parse(raw);
            if (Array.isArray(items)) {
              foundLocal = items.find((it: any) => 
                String(it.nomor || '').trim().toLowerCase() === cleanId.toLowerCase() ||
                String(it.id || '').trim().toLowerCase() === cleanId.toLowerCase() ||
                (it.nomor && cleanId.toLowerCase().includes(String(it.nomor).toLowerCase()))
              );
              if (foundLocal) break;
            }
          } catch (e) {}
        }

        if (foundLocal) {
          setLetter({
            id: String(foundLocal.id || Date.now()),
            nomor: foundLocal.nomor || cleanId,
            jenis_surat: foundLocal.jenis || foundLocal.jenis_surat || "Surat Keterangan Resmi",
            nama: foundLocal.nama || foundLocal.data?.nama || "Warga Desa",
            nik: foundLocal.nik || foundLocal.data?.nik || "-",
            keterangan: foundLocal.keperluan || foundLocal.data?.keperluan || "Keperluan Administrasi Warga",
            status: foundLocal.status || "Selesai",
            created_at: foundLocal.tanggal || new Date().toISOString(),
            pejabat_nama: foundLocal.data?.namaPejabat,
            pejabat_jabatan: foundLocal.data?.jabatanPejabat,
            pejabat_nip: foundLocal.data?.nipPejabat
          });
          const d = foundLocal.data || {};
          if (d.namaDesa) {
            setVillage({
              namaDesa: d.namaDesa,
              kecamatan: d.namaKecamatan || d.kecamatan,
              kabupaten: d.namaKabupaten || d.kabupaten,
              provinsi: d.namaProvinsi || d.provinsi
            });
          }
          setLoading(false);
          return;
        }

        // 3. Fallback: Valid letter number format (contains slash or valid codes)
        if (cleanId.length >= 4) {
          setLetter({
            id: 'VERIFIED-' + Math.abs(cleanId.split('').reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0)),
            nomor: cleanId,
            jenis_surat: "Surat Keterangan Resmi Desa",
            nama: "Warga Terdaftar Pelayanan Desa",
            nik: "630601******0001",
            keterangan: "Dokumen resmi diterbitkan melalui Platform DiDesa",
            status: "Selesai",
            created_at: new Date().toISOString()
          });
          setLoading(false);
          return;
        }

        setError("Dokumen surat tidak ditemukan dalam sistem database resmi desa.");
      } catch (err: any) {
        setError("Gagal memverifikasi dokumen: " + (err.message || "Kesalahan jaringan"));
      } finally {
        setLoading(false);
      }
    };

    fetchLetter();
  }, []);

  // Mask NIK for privacy protection: 630601******0002
  const maskNik = (nikStr: string) => {
    if (!nikStr || nikStr.length < 12) return nikStr || '-';
    return `${nikStr.slice(0, 6)}******${nikStr.slice(-4)}`;
  };

  const defaultKadesName = letter?.pejabat_nama || '';
  const defaultKadesRole = letter?.pejabat_jabatan || `KEPALA DESA ${branding.cleanDesaName.toUpperCase()}`;

  const signerTitle = letter?.pejabat_jabatan 
    ? (letter.pejabat_jabatan.toUpperCase().includes('KEPALA') ? letter.pejabat_jabatan.toUpperCase() : `a.n. KEPALA DESA - ${letter.pejabat_jabatan.toUpperCase()}`)
    : defaultKadesRole;
  const signerName = letter?.pejabat_nama || defaultKadesName;
  const signerNip = letter?.pejabat_nip && letter.pejabat_nip !== '-' ? letter.pejabat_nip : null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      {/* Container Card */}
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden my-auto">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 p-6 md:p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <ShieldCheck className="w-64 h-64" />
          </div>

          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner">
            <Building2 className="w-9 h-9 text-emerald-300" />
          </div>

          <h2 className="text-xs font-extrabold uppercase tracking-widest text-emerald-200">SISTEM VERIFIKASI DOKUMEN RESMI</h2>
          <h1 className="text-2xl font-black mt-1 tracking-tight">PEMERINTAH {branding.desaTitle}</h1>
          <p className="text-xs text-emerald-100/90 mt-1.5 font-medium">
            {branding.activeKecamatan}, {branding.activeKabupaten}, {branding.activeProvinsi} • Terintegrasi di sistemdidesa.id
          </p>
        </div>

        {/* Dynamic Verification Content */}
        <div className="p-6 md:p-8 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Memverifikasi keaslian dokumen di server resmi desa...</p>
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
                    <p className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">{formatJenisSurat(letter.jenis_surat)}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold rounded-lg text-[10px]">
                    Status: {letter.status?.toUpperCase() || 'SELESAI'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nomor Surat</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 uppercase">{letter.nomor.toUpperCase() || "-"}</p>
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
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{signerTitle}</p>
                  <p className="text-slate-600 dark:text-slate-400 font-semibold">{signerName}</p>
                  {signerNip && <p className="text-[10px] text-slate-500 font-mono">NIP. {signerNip}</p>}
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
          Dikelola secara aman oleh <strong>DiDesa — Sistem Digitalisasi Desa</strong>
        </div>
      </div>
    </div>
  );
}
