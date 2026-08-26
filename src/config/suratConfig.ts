/**
 * Konfigurasi Terpusat Surat (Single Source of Truth)
 * 
 * File ini adalah Single Source of Truth untuk semua metadata jenis surat.
 * Semua komponen (menu, form, dashboard) harus mengambil data dari sini.
 * 
 * JANGAN hardcode nama/kode surat di komponen individual!
 */

import { LetterClassification } from '../utils/letterClassifications';

// Re-export tipe dari konfigurasi asli
export type { LetterClassification, LetterField } from '../utils/letterClassifications';

/**
 * Daftar klasifikasi surat standar (Master Config)
 * Sumber kebenaran tunggal untuk semua metadata surat.
 * 
 * Properti:
 * - id: ID unik internal
 * - jenis: Nama lengkap tampilan (contoh: "SKTM")
 * - klasifikasi: Kode singkat (contoh: "SKTM") - DIGUNAKAN UNTUK BADGE
 * - kodeKlasifikasi: Kode arsip numerik (contoh: "400")
 * - deskripsi: Deskripsi tambahan (opsional)
 * - kodeKlasifikasi: Kode arsip numerik untuk nomor surat
 * - noUrutTerakhir: Counter nomor urut
 * - isVisible: Apakah terlihat di menu publik
 * - fields: Definisi field form dinamis (opsional)
 */
export const SURAT_CONFIG = {
  // Kategori: Surat Kependudukan
  SKTM: { 
    id: '8', 
    jenis: 'SKTM', 
    klasifikasi: 'SKTM', 
    kodeKlasifikasi: '400', 
    deskripsi: 'Surat Keterangan Tidak Mampu', 
    noUrutTerakhir: 15, 
    isVisible: true,
    fields: [
      { id: 'pekerjaan_ortu', label: 'Pekerjaan Orang Tua / Wali', type: 'text', required: true },
      { id: 'penghasilan', label: 'Rata-rata Penghasilan Per Bulan', type: 'number', required: true, placeholder: 'Dalam Rupiah' },
      { id: 'tujuan', label: 'Tujuan Pembuatan SKTM', type: 'text', required: true, placeholder: 'Contoh: Keringanan Biaya Rumah Sakit / Sekolah' }
    ]
  },
  SKD: { 
    id: '5', 
    jenis: 'SKD', 
    klasifikasi: 'SDP', 
    kodeKlasifikasi: '145', 
    deskripsi: 'Surat Keterangan Domisili Perorangan', 
    noUrutTerakhir: 18, 
    isVisible: true 
  },
  SKU: { 
    id: '15', 
    jenis: 'SKU', 
    klasifikasi: 'SKU', 
    kodeKlasifikasi: '500', 
    deskripsi: 'Surat Keterangan Tempat Usaha', 
    noUrutTerakhir: 11, 
    isVisible: true,
    fields: [
      { id: 'nama_usaha', label: 'Nama Usaha / Toko', type: 'text', required: true, placeholder: 'Contoh: Warung Berkah' },
      { id: 'jenis_usaha', label: 'Jenis Usaha', type: 'text', required: true, placeholder: 'Contoh: Kelontong / Pertanian' },
      { id: 'alamat_usaha', label: 'Alamat Usaha', type: 'textarea', required: true }
    ]
  },
  SKH: { 
    id: '11', 
    jenis: 'SKH', 
    klasifikasi: 'SKH', 
    kodeKlasifikasi: '331', 
    deskripsi: 'Surat Pengantar Keterangan Kehilangan', 
    noUrutTerakhir: 9, 
    isVisible: true 
  },
  SKM: { 
    id: '3', 
    jenis: 'SKM', 
    klasifikasi: 'SKM', 
    kodeKlasifikasi: '474.2', 
    deskripsi: 'SK Kematian', 
    noUrutTerakhir: 3, 
    isVisible: true 
  },
  SKAW: { 
    id: '31', 
    jenis: 'SK AHLI WARIS', 
    klasifikasi: 'SKAW', 
    kodeKlasifikasi: '474', 
    deskripsi: 'Surat Keterangan & Pernyataan Ahli Waris', 
    noUrutTerakhir: 2, 
    isVisible: true,
    fields: [
      { id: 'nama_almarhum', label: 'Nama Almarhum', type: 'text', required: true },
      { id: 'nik_almarhum', label: 'NIK Almarhum', type: 'text', required: true },
      { id: 'tempat_lahir', label: 'Tempat Lahir', type: 'text', required: true },
      { id: 'tanggal_lahir', label: 'Tanggal Lahir', type: 'date', required: true },
      { id: 'jenis_kelamin_almarhum', label: 'Jenis Kelamin', type: 'select', required: true, options: ['Laki-Laki', 'Perempuan'] },
      { id: 'agama_almarhum', label: 'Agama', type: 'text', required: true, placeholder: 'Islam' },
      { id: 'pekerjaan_almarhum', label: 'Pekerjaan Almarhum', type: 'text', required: true },
      { id: 'alamat_almarhum', label: 'Alamat Almarhum', type: 'textarea', required: true },
      { id: 'rt_almarhum', label: 'RT', type: 'text', required: true, placeholder: '001' },
      { id: 'rw_almarhum', label: 'RW', type: 'text', required: true, placeholder: '001' },
      { id: 'nama_pasangan', label: 'Nama Pasangan', type: 'text' },
      { id: 'nik_pasangan', label: 'NIK Pasangan', type: 'text' },
      { id: 'tanggal_nikah', label: 'Tanggal Nikah', type: 'date' }
    ]
  },
  SKBM: { 
    id: '10', 
    jenis: 'SKBM', 
    klasifikasi: 'SKBM', 
    kodeKlasifikasi: '474', 
    deskripsi: 'Surat Keterangan Belum Pernah Menikah', 
    noUrutTerakhir: 6, 
    isVisible: true 
  },
  SKP: { 
    id: '12', 
    jenis: 'SKP', 
    klasifikasi: 'SKP', 
    kodeKlasifikasi: '475', 
    deskripsi: 'Surat Keterangan Pindah', 
    noUrutTerakhir: 0, 
    isVisible: true 
  },
  SKPH: { 
    id: '28', 
    jenis: 'SKPH', 
    klasifikasi: 'SKPH', 
    kodeKlasifikasi: '400', 
    deskripsi: 'Surat Keterangan Penghasilan', 
    noUrutTerakhir: 4, 
    isVisible: true 
  },
  SKKT: { 
    id: '9', 
    jenis: 'SKKT', 
    klasifikasi: 'SKKT', 
    kodeKlasifikasi: '593', 
    deskripsi: 'SK Kepemilikan Tanah', 
    noUrutTerakhir: 1, 
    isVisible: true 
  },
  SKL: { 
    id: '17', 
    jenis: 'SKL', 
    klasifikasi: 'SKL', 
    kodeKlasifikasi: '474.1', 
    deskripsi: 'Surat Keterangan Lahir', 
    noUrutTerakhir: 4, 
    isVisible: true 
  },
  SDU: { 
    id: '30', 
    jenis: 'SDU', 
    klasifikasi: 'SDU', 
    kodeKlasifikasi: '500', 
    deskripsi: 'Surat Keterangan Domisili Usaha', 
    noUrutTerakhir: 0, 
    isVisible: true 
  },
};

/**
 * Helper untuk mendapatkan konfigurasi surat berdasarkan kode klasifikasi (mis: 'SKD')
 */
export function getSuratConfig(klasifikasi: string) {
  return SURAT_CONFIG[klasifikasi as keyof typeof SURAT_CONFIG];
}

/**
 * Mendapatkan daftar semua surat yang terlihat (untuk menu)
 */
export function getVisibleSuratList() {
  return Object.values(SURAT_CONFIG).filter(s => s.isVisible !== false);
}

/**
 * Mendapatkan kode badge (klasifikasi) untuk ditampilkan di UI
 * Contoh: getBadgeCode('SKD') -> 'SKD'
 */
export function getBadgeCode(klasifikasi: string): string {
  const config = SURAT_CONFIG[klasifikasi as keyof typeof SURAT_CONFIG];
  return config?.klasifikasi || klasifikasi;
}

/**
 * Mendapatkan nama tampilan resmi
 */
export function getDisplayName(klasifikasi: string): string {
  const config = SURAT_CONFIG[klasifikasi as keyof typeof SURAT_CONFIG];
  return config?.jenis || klasifikasi;
}

/**
 * Mendapatkan deskripsi
 */
export function getDeskripsi(klasifikasi: string): string {
  const config = SURAT_CONFIG[klasifikasi as keyof typeof SURAT_CONFIG];
  return config?.deskripsi || '';
}

/**
 * Mendapatkan kode arsip (kodeKlasifikasi)
 */
export function getKodeArsip(klasifikasi: string): string {
  const config = SURAT_CONFIG[klasifikasi as keyof typeof SURAT_CONFIG];
  return config?.kodeKlasifikasi || '';
}

/**
 * Mendapatkan field form dinamis (jika ada)
 */
export function getFormFields(klasifikasi: string) {
  const config = SURAT_CONFIG[klasifikasi as keyof typeof SURAT_CONFIG];
  return config?.fields || [];
}

export default SURAT_CONFIG;