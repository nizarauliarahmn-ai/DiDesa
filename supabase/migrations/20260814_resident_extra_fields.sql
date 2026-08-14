-- ============================================================================
-- Migration: Tambah Kolom Pendidikan, Sipil, Kesejahteraan & Kontak pada residents
-- Jalankan skrip ini di Supabase Editor (SQL Editor) sekali saja.
-- ============================================================================

-- Pendidikan & Sipil
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS pendidikan_terakhir VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS gelar_depan VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS gelar_belakang VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS no_akta_kelahiran VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS no_akta_nikah VARCHAR DEFAULT '';

-- Kesejahteraan & Kesehatan
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS no_bpjs VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS status_dtks VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS disabilitas VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS golongan_darah VARCHAR DEFAULT '';

-- Kontak & Identitas Lain
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS no_whatsapp VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS dusun VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS no_paspor VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS status_domisili VARCHAR DEFAULT '';
