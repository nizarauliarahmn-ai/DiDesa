-- Add CTA & popup flags to global_updates (Log Pembaruan / Changelog System)
-- 1. cta_route  : target navigasi internal saat pengguna menekan tombol utama, misal "/?admin_tab=surat"
-- 2. cta_label  : teks tombol utama, misal "Coba Buat Surat"
-- 3. is_popup   : 1 = log ini diterbitkan sebagai Pop-up pengumuman utama (otomatis muncul ke akun desa)

ALTER TABLE public.global_updates
  ADD COLUMN IF NOT EXISTS cta_route TEXT,
  ADD COLUMN IF NOT EXISTS cta_label TEXT,
  ADD COLUMN IF NOT EXISTS is_popup INTEGER DEFAULT 0;