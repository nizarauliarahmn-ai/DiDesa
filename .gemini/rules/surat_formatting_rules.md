# Master Rule: Format & Cetak Surat DiDesa

## 1. Format Nama Penanda Tangan (Signature Block Names)
- **Bold**: Nama penanda tangan wajib dicetak tebal (`font-weight: bold` / `<strong>`).
- **Tanpa Garis Bawah**: **DILARANG** menggunakan garis bawah (`text-decoration: underline` atau `<u>`).
- **Huruf Besar Semua (UPPERCASE)**: Nama utama penanda tangan wajib kapital penuh.
- **Format Gelar**: Jika penanda tangan memiliki gelar (akademik, militer, keagamaan, kehormatan):
  - Hanya **nama utamanya** yang dicetak UPPERCASE.
  - Gelar ditulis dengan format penulisan gelar standar.
  - *Contoh*: `PELDA (PURN) FAZAKKIR RAHMAD`, `H. FAZAKKIR RAHMAD, S.E.`, `DR. H. M. NOR, M.SI.`

## 2. Pengikatan Dinamis Data Super Admin / Pengaturan Desa
- Semua data penanda tangan (Kepala Desa, Jabatan, NIP), Kop Surat, Logo, dan Alamat **WAJIB terhubung secara dinamis** dengan data di *Pengaturan Desa / Super Admin* (`village_super_admin`, `village_super_admin_role`, `kop_kades`, `kop_desa`, `kop_kecamatan`, `kop_kabupaten`, `kop_logo_url`, `kop_alamat`, `kop_kontak`).
- **Dilarang keras** menggunakan nama/data *hardcode* jika data Pengaturan Desa tersedia.

## 3. Pemisahan Halaman Dokumen (Multi-Page A4 Isolation)
- Jika dokumen memiliki **lebih dari 1 halaman** (misalnya 2 halaman A4 pada SKKT):
  - Setiap halaman **wajib dipisah secara fisik & visual** menggunakan `page-break-before: always;` dan struktur container A4 terisolasi.
  - Setiap halaman memiliki **Kop Surat Resmi** dan **SaaS Global Footer** masing-masing secara utuh dan terpisah.
  - Tidak boleh ada konten halaman 1 yang meluber/menumpuk ke halaman 2 secara tidak teratur.
