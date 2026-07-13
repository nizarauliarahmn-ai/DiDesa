# Panduan Setup & Arsitektur Supabase Multi-Tenant DiDesa

**Dokumen Perencanaan Sistem**
Disusun untuk: Tim Sistem DiDesa (sistemdidesa.id)

---

## 1. Konsep Dasar (Arsitektur Multi-Tenant)

Karena kita ingin memisahkan:
1. **Web White Label** (Blueprint)
2. **Dummy** (Demo Klien)
3. **Desa Wasah Hilir** (Data Riil)

Namun tetap menggunakan **1 Supabase** dan **1 Hosting**, kita akan menggunakan arsitektur **Multi-Tenant dengan Row-Level Security (RLS)**. Konsep ini menambahkan satu kolom khusus bernama `tenant_id` (atau `kode_desa`) di setiap tabel database. 

Semua data dari semua desa akan masuk ke tabel yang sama, namun Supabase akan mengunci dan memfilter data tersebut secara otomatis berdasarkan desa yang sedang login. Admin Wasah Hilir tidak akan pernah bisa melihat data desa Dummy, dan sebaliknya.

---

## 2. Langkah Pembuatan Project Supabase

1. Buka [supabase.com](https://supabase.com) dan login menggunakan email perusahaan (`...@sistemdidesa.id`).
2. Buat **Organization** baru dengan nama "Sistem DiDesa".
3. Buat **Project** baru, misalnya bernama **"DiDesa Core"** atau **"DiDesa Production"**.
4. Simpan **Project URL** dan **API Key (anon/public)**. Ini akan dimasukkan ke environment variables `.env` di hosting.

---

## 3. Struktur Tabel Utama (Skema Multi-Tenant)

### A. Tabel `tenants` (Daftar Desa/Klien)
Tabel ini menyimpan daftar klien yang aktif.
- `id` (UUID, Primary Key)
- `kode_desa` (String, unik, contoh: "blueprint", "demo", "wasah-hilir")
- `nama_desa` (String, contoh: "Desa Wasah Hilir")
- `domain` (String, contoh: "wasahhilir.sistemdidesa.id")
- `status` (String: "active", "suspended")

### B. Tabel `profiles` (Data Admin/User)
Terhubung dengan Supabase Auth.
- `id` (UUID, berelasi ke `auth.users.id`)
- `tenant_id` (UUID, berelasi ke `tenants.id`)
- `role` (String: "super_admin", "admin", "public")
- `nama_lengkap` (String)

### C. Tabel `penduduk`, `surat`, dll.
Setiap tabel transaksi dan master data HARUS memiliki kolom `tenant_id`.
- `id` (UUID)
- `tenant_id` (UUID, berelasi ke `tenants.id`) -> **Penting!**
- `nik`, `nama`, dll.

---

## 4. Pengaturan Row-Level Security (RLS) di Supabase

Ini adalah inti dari keamanan sistem ini. Anda harus mengaktifkan RLS di semua tabel (`penduduk`, `surat`, dll).

**Contoh Kebijakan (Policy) RLS untuk tabel `penduduk`:**
```sql
CREATE POLICY "Admin hanya bisa melihat penduduk di desanya"
ON public.penduduk
FOR SELECT
USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
```
Dengan script di atas, ketika Admin Wasah Hilir melakukan query `SELECT * FROM penduduk`, Supabase akan otomatis HANYA mengembalikan data penduduk milik Wasah Hilir, tanpa Anda perlu memfilternya secara manual di kode React.

---

## 5. Pengaturan Storage (Penyimpanan File)

Untuk file seperti Logo Desa, Berkas Persyaratan, dan Surat Keluar, kita tetap menggunakan 1 Bucket (misal: `didesa-storage`). Namun, strukturnya dipisah berdasarkan folder `tenant_id`:

```
didesa-storage/
├── blueprint/
│   ├── logos/
│   └── arsip_surat/
├── demo/
│   ├── logos/
│   └── arsip_surat/
└── wasah-hilir/
    ├── logos/
    └── arsip_surat/
```

Policy RLS di Storage juga diatur agar user hanya bisa upload/download ke folder yang sesuai dengan `tenant_id` mereka.

---

## 6. Integrasi di Level Aplikasi (Frontend/Hosting)

Saat aplikasi DiDesa diakses di browser, aplikasi perlu tahu "ini sedang membuka desa apa?".

**Opsi 1: Berdasarkan Subdomain (Direkomendasikan)**
- `blueprint.sistemdidesa.id`
- `demo.sistemdidesa.id`
- `wasahhilir.sistemdidesa.id`
Aplikasi akan membaca URL, kemudian mengirimkan kode desa ke Supabase saat login.

**Opsi 2: Berdasarkan Akun Login**
User masuk melalui satu portal login terpusat (`app.sistemdidesa.id`). Setelah berhasil login, Supabase akan melihat profil user tersebut dan mengarahkannya ke dashboard desanya (karena `tenant_id` sudah melekat di akunnya).

---

## 7. Keuntungan Arsitektur Ini untuk sistemdidesa.id
1. **Hemat Biaya & Skalabel:** Anda hanya membayar 1 instance database (Supabase) dan 1 Hosting untuk RATUSAN desa klien nantinya.
2. **Satu Kode Sumber:** Jika ada perbaikan bug atau fitur baru, cukup perbarui 1 kode, dan semua klien (White Label, Demo, Wasah Hilir) akan langsung mendapatkan pembaruannya secara bersamaan.
3. **Pemisahan Aman:** Klien tidak akan menyadari bahwa mereka berbagi server, karena data secara matematis dikunci oleh RLS Supabase.
4. **Sentralisasi Super Admin:** Anda sebagai pemilik `sistemdidesa.id` dapat membuat dashboard "Super Admin Master" yang bisa memantau statistik dari semua desa klien.
