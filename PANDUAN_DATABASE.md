# Panduan Integrasi Database: Drizzle ORM & Supabase
### Aplikasi Pengelolaan Data Penduduk & Bantuan Sosial (Desa Sukamaju)

Panduan ini disusun khusus untuk membantu Anda dalam mengkonfigurasi database nyata (**real-world production database**) menggunakan opsi **Drizzle ORM + PostgreSQL** maupun **Supabase Client**. Kedua metode ini telah diintegrasikan secara cerdas di sisi server (`server.ts` & `/server/db.ts`) dengan sistem **Fallback otomatis**. Aplikasi Anda akan berjalan dengan performa maksimal, aman dari kebocoran kunci API, dan siap untuk dikomersialkan di masa depan dengan **biaya Rp 0 (Free Tier)**.

---

## 💡 Mengapa Sistem Ini Sangat Bagus untuk Komersialisasi?
1. **Keamanan Maksimal (Zero-Client API Exposure)**: Semua interaksi database dan kunci API sensitif dikelola sepenuhnya di sisi server (Server-Side). Browser pengguna akhir tidak akan pernah melihat `DATABASE_URL` atau token autentikasi Anda.
2. **Koneksi Multi-Engine (Dual-Active Fallback)**:
   - Jika Anda mengisi `DATABASE_URL`, sistem akan otomatis menggunakan **Drizzle ORM** (Direct PostgreSQL).
   - Jika Anda mengisi `SUPABASE_URL` dan `SUPABASE_ANON_KEY`, sistem akan otomatis beralih menggunakan **Supabase Client SDK**.
   - Jika keduanya kosong, sistem akan menggunakan **Local Memory State** (untuk simulasi lokal yang aman tanpa merusak server).
3. **Biaya Rp 0**: Baik Supabase maupun Neon.tech (Penyedia PostgreSQL gratis) menawarkan kapasitas database tangguh yang lebih dari cukup untuk ratusan ribu data penduduk secara gratis.

---

## 🛠️ OPSI 1: Konfigurasi Menggunakan Drizzle ORM + PostgreSQL (Sangat Direkomendasikan)
Drizzle ORM adalah pilihan paling modern, memiliki performa query secepat kilat (ultra-low latency), dan kueri SQL murni tanpa overhead tambahan.

### Langkah-langkah Penyusunan:
1. **Dapatkan Database PostgreSQL Gratis**:
   - Daftar di [Neon.tech](https://neon.tech) atau gunakan Database PostgreSQL bawaan proyek **Supabase** Anda.
   - Buat project baru dan salin **Connection String** PostgreSQL yang disediakan (biasanya berformat `postgres://username:password@hostname:port/dbname?sslmode=require`).
2. **Atur Variabel Lingkungan (`.env`)**:
   Buka menu **Settings** di AI Studio atau buat file `.env` di server Anda, lalu tambahkan:
   ```env
   DATABASE_URL="postgres://username:password@hostname:port/dbname?sslmode=require"
   ```
3. **Migrasi Otomatis (Auto-Migration)**:
   - Anda **tidak perlu repot menjalankan script SQL migrasi manual!**
   - Sistem backend kami di `/server/db.ts` dirancang secara cerdas untuk melakukan **auto-migration** (membuat tabel `residents` beserta tipe data JSONB untuk bantuan sosial secara otomatis jika tabel tersebut belum ada di database Anda) begitu server pertama kali dijalankan.

---

## 🛠️ OPSI 2: Konfigurasi Menggunakan Supabase JS Client SDK
Supabase sangat cocok bagi Anda yang menginginkan pengelolaan dashboard database berbasis web yang sangat rapi dan lengkap dengan fitur visualizer yang ramah pengguna.

### Langkah-langkah Penyusunan:
1. **Dapatkan URL & Anon Key Supabase**:
   - Masuk ke dashboard [Supabase](https://supabase.com).
   - Buat Project baru bernama `desa-sukamaju`.
   - Masuk ke menu **Project Settings** > **API**.
   - Salin **Project URL** dan **anon public** key.
2. **Atur Variabel Lingkungan (`.env`)**:
   Tambahkan nilai tersebut ke dalam file konfigurasi lingkungan Anda:
   ```env
   SUPABASE_URL="https://your-project-id.supabase.co"
   SUPABASE_ANON_KEY="your-anon-public-key"
   ```
3. **Inisialisasi Tabel di Supabase SQL Editor**:
   Buka tab **SQL Editor** di dashboard Supabase Anda, buat query baru, lalu salin dan jalankan (Run) kode berikut untuk membuat tabel penduduk:
   ```sql
   CREATE TABLE residents (
     nik TEXT PRIMARY KEY,
     initials TEXT,
     name TEXT NOT NULL,
     gender TEXT,
     gender_color TEXT,
     rt_rw TEXT,
     rt TEXT,
     rw TEXT,
     status TEXT,
     status_color TEXT,
     age INTEGER,
     birth_place TEXT,
     birth_date TEXT,
     blood_type TEXT,
     religion TEXT,
     job TEXT,
     address TEXT,
     desa TEXT,
     domicile_status TEXT,
     family_relation TEXT,
     education TEXT,
     photo TEXT,
     no_kk TEXT,
     father_name TEXT,
     mother_name TEXT,
     active_aids JSONB DEFAULT '[]'::jsonb
   );

   -- Mengaktifkan akses RLS (Row Level Security) atau bypass jika ingin diakses langsung dari server backend terpercaya Anda
   ALTER TABLE residents DISABLE ROW LEVEL SECURITY;
   ```

---

## 🔍 Skema Data Penduduk (Database Schema)
Untuk keperluan pengembangan lanjutan atau jika Anda ingin menambahkan kolom baru di masa depan, berikut adalah skema lengkap tabel `residents` yang digunakan:

| Nama Kolom (Field) | Tipe Data | Deskripsi / Kegunaan |
| :--- | :--- | :--- |
| `nik` | `TEXT` (Primary Key) | Nomor Induk Kependudukan (Unik) |
| `name` | `TEXT` (Not Null) | Nama Lengkap Penduduk |
| `no_kk` | `TEXT` | Nomor Kartu Keluarga |
| `age` | `INTEGER` | Usia Penduduk |
| `gender` | `TEXT` | Jenis Kelamin (`Laki-laki` / `Perempuan`) |
| `rt_rw` | `TEXT` | Format string RT/RW (misal: "01 / 02") |
| `rt` | `TEXT` | Nomor Rukun Tetangga |
| `rw` | `TEXT` | Nomor Rukun Warga |
| `status` | `TEXT` | Status Perkawinan |
| `family_relation`| `TEXT` | Hubungan Keluarga (`Kepala Keluarga`, `Istri`, `Anak`, dll.) |
| `education` | `TEXT` | Pendidikan Terakhir |
| `active_aids` | `JSONB` | Array Program Bantuan Sosial Aktif (Format: `["BLT Dana Desa", "PKH"]`) |
| `photo` | `TEXT` | Base64 String Foto Penduduk (untuk avatar kustom) |

---

## 📥 Cara Mengubah Dokumen Ini Menjadi File Word (.docx) atau PDF
Karena sistem asisten beroperasi dalam lingkungan pengembangan berbasis web, kami tidak dapat secara langsung mengirimkan unduhan file fisik `.doc` atau `.pdf` ke komputer Anda. Namun, Anda dapat dengan sangat mudah mengonversi file panduan ini sendiri secara profesional dengan cara berikut:

### Opsi A: Ekspor Menjadi PDF Melalui Fitur Cetak (Sangat Mudah & Cepat)
1. **Buka File Ini** di text editor atau aplikasi pembaca Markdown pilihan Anda (seperti VS Code, Obsidian, atau ekstensi browser).
2. Tekan kombinasi tombol **`Ctrl + P`** (Windows) atau **`Cmd + P`** (Mac).
3. Pada opsi Printer, pilih **"Save as PDF"** atau **"Simpan sebagai PDF"**.
4. Atur tata letak ke **Portrait** dan klik **Save**. Dokumen Anda siap dibagikan!

### Opsi B: Ubah Menjadi File Word (.docx) Melalui Pandoc / Word Online
1. **Salin Seluruh Teks** di dalam panduan Markdown ini.
2. Buka aplikasi **Microsoft Word** atau **Google Docs**.
3. **Tempel (Paste)** teks yang telah disalin. Google Docs dan Word versi terbaru akan secara otomatis mendeteksi format judul, tebal, dan tabel Markdown menjadi dokumen yang sangat rapi.
4. Klik **File** > **Save As** (Simpan Sebagai) > pilih format **Word Document (.docx)** atau **PDF**.
