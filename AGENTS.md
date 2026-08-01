# Standar Pengembangan & Panduan Agent (AGENTS.md) — DiDesa

Dokumen ini berisi sekumpulan aturan utama, panduan UI/UX, serta prinsip sistem untuk semua AI Coding Assistant (Antigravity, Cursor, Roo Code, Aider, dll) saat mengerjakan codebase **DiDesa**.

---

## 🎨 1. Panduan UI/UX & Kerapian Tabel (Strict)
- **Whitespace & No-Wrapping pada Tabel**:
  - Semua sel tabel (`th`, `td`) dan elemen badge (seperti `DUSUN / RT / RW`, `TAHUN`, `NIK`, `DTSEN`, `STATUS`) WAJIB menggunakan kelas Tailwind `whitespace-nowrap`.
  - Teks tidak boleh terlipat/terpotong menjadi dua baris di dalam pill/badge (misal `Wasah Hilir / RT 04 / RW 02` harus tetap pada 1 baris utuh).
- **Tombol Aksi**:
  - Tombol aksi pada tabel (seperti `Ke 2027`, `Hentikan`, `Hapus`) harus tersusun rapi secara horizontal (`flex items-center gap-1.5 whitespace-nowrap`) dengan warna & ikon yang jelas.
- **Aestetika & Palette Warna**:
  - Menggunakan palet warna utama **Emerald / Teal** untuk kesan instansi pemerintah desa modern.
  - Pasfoto pada tampilan detail/cetak profil menggunakan ukuran ringkas (`w-[110px]` hingga `w-[130px]`) agar tidak menyisakan ruang kosong vertikal berlebih.

---

## 🏛️ 2. Standar Regulasi & Modul Bantuan Sosial (DTSEN)
- **Istilah Regulasi Resmi**:
  - Gunakan istilah **DTSEN (Data Terpadu Sosial Ekonomi Nasional)**. Tidak menggunakan istilah lama DTKS.
- **Toggle Verifikasi Manual Admin**:
  - Status DTSEN bukan lencana otomatis universal, melainkan diaktifkan/dinonaktifkan secara manual oleh Admin Desa via tombol **Toggle (`+ Verifikasi DTSEN` / `Terdaftar DTSEN ✓`)**, tersimpan di kolom `is_dtsen`.
- **Rekomendasi Lansia Tunggal (Living Alone Elderly)**:
  - Algoritma usulan penerima bantuan memberikan prioritas utama (+60 poin kerentanan) bagi warga Lansia (Usia >= 60 tahun) yang hidup sendiri / KK Tunggal.
- **Penerima Ganda (Double / Overlap)**:
  - Sediakan filter & badge merah kontras **Tumpang Tindih** bagi warga yang menerima >1 program bantuan di tahun yang sama.
- **Hentikan & Perpanjang Bantuan**:
  - Penghentian bantuan wajib mencatat **Tanggal & Bulan Resmi Penghentian** (format lengkap) serta **Alasan Rinci** (*Meninggal Dunia, Pindah, Telah Mampu, Penerima Ganda, Hasil Musdes*).
  - Perpanjangan bantuan mendukung fitur 1-klik ke tahun berikutnya (misal `Ke 2027`).

---

## 💻 3. Aturan Kode & Integritas Fitur (Core Rules)
1. **Preserve Existing Code**:
   - Jangan pernah merusak, mengubah, atau menghapus fitur yang sudah berjalan dan disetujui pengguna sebelumnya tanpa konfirmasi eksplisit.
2. **Supabase Multi-Tenant Safety**:
   - Selalu gunakan `tenant_id` pada setiap query Supabase (`.eq('tenant_id', tenantId)`).
   - Hindari query `.order()` pada kolom opsional yang bisa menyebabkan Supabase error; utamakan pengurutan in-memory yang aman.
3. **Penyimpanan State & Fast Rendering**:
   - Gunakan `key={item.nik}` (bukan index array) pada list/animasi agar rendering React cepat dan tidak mengalami thrashing layout.

---
*Dibuat & Diterapkan untuk Pengembang & AI Agent DiDesa.*
