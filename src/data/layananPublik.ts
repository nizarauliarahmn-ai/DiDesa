/** Direktori Pusat Layanan — layanan kementerian/lembaga dalam satu tempat.
 *  Hanya memakai URL resmi yang terverifikasi; tanpa PKS, berupa deep-link + syarat.
 *  Catatan: syarat bersifat umum — warga tetap konfirmasi ke perangkat desa.
 */

export interface LayananPublik {
  id: string;
  kementerian: string;
  nama: string;
  deskripsi: string;
  syarat: string[];
  url: string;
  internal?: boolean;
  kategori: 'Kependudukan' | 'Sosial' | 'Kesehatan' | 'Pemilu' | 'Keagamaan' | 'Dana Desa' | 'Layanan Desa';
}

export const KATEGORI_LAYANAN: Array<'Semua' | LayananPublik['kategori']> = [
  'Semua',
  'Kependudukan',
  'Sosial',
  'Kesehatan',
  'Pemilu',
  'Keagamaan',
  'Dana Desa',
  'Layanan Desa',
];

export const LAYANAN_PUBLIK: LayananPublik[] = [
  {
    id: 'dukcapil-ktp',
    kementerian: 'Dukcapil · Kemendagri',
    nama: 'KTP-el Baru / Perpanjangan',
    deskripsi: 'Penerbitan dan perpanjangan Kartu Tanda Penduduk elektronik.',
    syarat: ['Surat pengantar RT/RW', 'Fotokopi Kartu Keluarga', 'KTP-el lama (untuk perpanjangan)', 'Pas foto (bila diminta)'],
    url: 'https://dukcapil.kemendagri.go.id',
    kategori: 'Kependudukan',
  },
  {
    id: 'dukcapil-kk',
    kementerian: 'Dukcapil · Kemendagri',
    nama: 'Kartu Keluarga (KK)',
    deskripsi: 'Penerbitan KK baru, pembaruan, atau pecah KK.',
    syarat: ['Surat pengantar RT/RW', 'KK lama (untuk pembaruan)', 'Akta kelahiran / buku nikah terkait'],
    url: 'https://dukcapil.kemendagri.go.id',
    kategori: 'Kependudukan',
  },
  {
    id: 'dukcapil-akta',
    kementerian: 'Dukcapil · Kemendagri',
    nama: 'Akta Kelahiran',
    deskripsi: 'Pencatatan kelahiran dan penerbitan akta.',
    syarat: ['Surat Keterangan Lahir (SKL) dari faskes', 'KK', 'KTP-el orang tua', 'Buku nikah / SPTJM'],
    url: 'https://dukcapil.kemendagri.go.id',
    kategori: 'Kependudukan',
  },
  {
    id: 'dukcapil-pindah',
    kementerian: 'Dukcapil · Kemendagri',
    nama: 'Surat Pindah (SKPWNI)',
    deskripsi: 'Lapor pindah datang/keluar antar desa, kabupaten, atau provinsi.',
    syarat: ['KTP-el dan KK asli', 'Surat pengantar RT/RW', 'F1-06 dari desa asal (untuk datang)'],
    url: 'https://dukcapil.kemendagri.go.id',
    kategori: 'Kependudukan',
  },
  {
    id: 'kemensos-cek',
    kementerian: 'Kemensos',
    nama: 'Cek Penerima Bansos',
    deskripsi: 'Cek status kepesertaan bansos (PKH, BPNT, BST) berdasarkan NIK.',
    syarat: ['NIK 16 digit sesuai KTP', 'Kode verifikasi pada halaman'],
    url: 'https://cekbansos.kemensos.go.id/',
    kategori: 'Sosial',
  },
  {
    id: 'kemensos-usul',
    kementerian: 'Kemensos',
    nama: 'Usul / Sanggah DTKS',
    deskripsi: 'Usulkan diri/tetangga yang layak atau sanggah penerima yang tidak layak via operator desa (SIKS-NG).',
    syarat: ['Terdaftar di database kependudukan desa', 'Berita Acara Musdes/Muskel (untuk usulan)', 'KTP dan KK'],
    url: 'https://siks.kemensos.go.id',
    kategori: 'Sosial',
  },
  {
    id: 'kemenkes-satusehat',
    kementerian: 'Kemenkes',
    nama: 'SATUSEHAT Mobile',
    deskripsi: 'Akses data kesehatan: imunisasi anak, skrining, dan sertifikat vaksin.',
    syarat: ['NIK', 'Akun SATUSEHAT Mobile'],
    url: 'https://satusehat.kemkes.go.id',
    kategori: 'Kesehatan',
  },
  {
    id: 'bpjs-kesehatan',
    kementerian: 'BPJS Kesehatan',
    nama: 'JKN: Daftar & Cek Status',
    deskripsi: 'Pendaftaran peserta dan pengecekan status kepesertaan JKN-KIS.',
    syarat: ['NIK dan KK', 'Nomor HP aktif', 'Buku rekening (untuk autodebet)'],
    url: 'https://www.bpjs-kesehatan.go.id',
    kategori: 'Kesehatan',
  },
  {
    id: 'kpu-dpt',
    kementerian: 'KPU',
    nama: 'Cek Daftar Pemilih (DPT)',
    deskripsi: 'Pastikan nama terdaftar sebagai pemilih pada pemilu/pilkada.',
    syarat: ['NIK 16 digit'],
    url: 'https://www.kpu.go.id',
    kategori: 'Pemilu',
  },
  {
    id: 'kemenag-nikah',
    kementerian: 'Kemenag',
    nama: 'Layanan Nikah (SIMKAH)',
    deskripsi: 'Pendaftaran kehendak nikah dan informasi alur pencatatan pernikahan.',
    syarat: ['Surat pengantar RT/RW (N1–N4 dari desa)', 'KTP, KK, akta kelahiran catin', 'Pas foto berlatar biru'],
    url: 'https://kemenag.go.id',
    kategori: 'Keagamaan',
  },
  {
    id: 'kemendes-dana',
    kementerian: 'Kemendes PDTT',
    nama: 'Informasi Dana Desa',
    deskripsi: 'Transparansi dan informasi pemanfaatan Dana Desa.',
    syarat: ['Tidak ada — informasi publik'],
    url: 'https://kemendesa.go.id',
    kategori: 'Dana Desa',
  },
  {
    id: 'desa-surat',
    kementerian: 'Pemerintah Desa',
    nama: 'Surat Keterangan Desa',
    deskripsi: 'Ajukan SKTM, SKU, domisili, dan surat keterangan lain langsung dari desa.',
    syarat: ['NIK terdaftar sebagai warga desa', 'Keperluan yang jelas'],
    url: '?tab=kios_surat',
    internal: true,
    kategori: 'Layanan Desa',
  },
];
/** Syarat pembuatan surat di SistemDesa — tampil di portal warga.
 *  Bersifat umum; perangkat desa dapat meminta dokumen tambahan.
 */
export interface SyaratSurat {
  id: string;
  kode: string;
  nama: string;
  syarat: string[];
}

export const SYARAT_SURAT_DESA: SyaratSurat[] = [
  {
    id: 'sktm',
    kode: 'SKTM',
    nama: 'Keterangan Tidak Mampu',
    syarat: ['KTP-el', 'Kartu Keluarga', 'Surat pengantar RT/RW'],
  },
  {
    id: 'sku',
    kode: 'SKU',
    nama: 'Keterangan Usaha',
    syarat: ['KTP-el', 'Kartu Keluarga', 'Surat pengantar RT/RW', 'Info jenis & alamat usaha'],
  },
  {
    id: 'sdp',
    kode: 'SDP',
    nama: 'Keterangan Domisili',
    syarat: ['KTP-el', 'Kartu Keluarga', 'Surat pengantar RT/RW'],
  },
  {
    id: 'skum',
    kode: 'SKUM',
    nama: 'Keterangan Umum',
    syarat: ['KTP-el', 'Kartu Keluarga', 'Keperluan yang jelas'],
  },
  {
    id: 'skl',
    kode: 'SKL',
    nama: 'Keterangan Lahir',
    syarat: ['SKL dari faskes', 'KK orang tua', 'KTP-el orang tua'],
  },
  {
    id: 'skm',
    kode: 'SKM',
    nama: 'Keterangan Meninggal',
    syarat: ['KTP almarhum/almarhumah', 'Kartu Keluarga', 'Surat pengantar RT/RW'],
  },
  {
    id: 'skbm',
    kode: 'SKBM',
    nama: 'Keterangan Belum Menikah',
    syarat: ['KTP-el', 'Kartu Keluarga', 'Surat pengantar RT/RW'],
  },
  {
    id: 'skph',
    kode: 'SKPH',
    nama: 'Keterangan Penghasilan',
    syarat: ['KTP-el', 'Kartu Keluarga', 'Slip gaji / keterangan RT/RW'],
  },
  {
    id: 'skaw',
    kode: 'SKAW',
    nama: 'Keterangan Ahli Waris',
    syarat: ['KTP para ahli waris', 'KK pewaris', 'Akta kematian pewaris', 'Surat pengantar RT/RW'],
  },
  {
    id: 'nikah',
    kode: 'NIKAH',
    nama: 'Pengantar Nikah (N1–N4)',
    syarat: ['KTP-el dan KK catin', 'Akta kelahiran', 'Pas foto berlatar biru', 'Surat pengantar RT/RW'],
  },
];
