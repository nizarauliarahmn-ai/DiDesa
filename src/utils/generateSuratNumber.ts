/**
 * Central helper untuk penomoran surat.
 * ATURAN UNIVERSAL: SELURUH segmen (kode klasifikasi, kode desa, kode jenis surat)
 * dipaksa FULL UPPERCASE tanpa pengecualian, untuk SEMUA jenis & format surat.
 */

export interface FormatNomorSuratParams {
  kodeKlasifikasi: string;
  nomorUrut: number | string;
  singkatanDesa?: string;
  singkatanSurat?: string;
  tahun?: number;
}

export const formatNomorSurat = ({
  kodeKlasifikasi,
  nomorUrut,
  singkatanDesa,
  singkatanSurat,
  tahun,
}: FormatNomorSuratParams): string => {
  const cleanDesa = (singkatanDesa || 'WHI').trim().toUpperCase();
  const cleanSurat = (singkatanSurat || '').trim().toUpperCase();
  const cleanUrut = String(nomorUrut).padStart(3, '0');
  const cleanKode = (kodeKlasifikasi || '140').trim().toUpperCase();
  const cleanTahun = String(tahun || new Date().getFullYear());

  return `${cleanKode}/${cleanUrut}/${cleanDesa}-${cleanSurat}/${cleanTahun}`;
};

export const DEFAULT_SURAT_FORMAT = '[NO KODE SURAT]/[NO URUT SURAT]/WHI-[KODE]/[TAHUN]';
