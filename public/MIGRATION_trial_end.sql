-- ==============================================================================
-- MIGRATION: Tambah kolom trial_end ke tabel tenants
-- Jalankan di SQL Editor Supabase jika kolom belum ada
-- ==============================================================================

-- Tambah kolom trial_end (opsional, NULL = bukan trial)
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

-- Tambah kolom admin_email & admin_password (jika belum ada)
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS admin_email VARCHAR;

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS admin_password VARCHAR;

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS kades_email VARCHAR;

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS kades_password VARCHAR;
