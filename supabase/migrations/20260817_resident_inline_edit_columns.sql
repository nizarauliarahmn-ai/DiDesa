-- ============================================================================
-- Migration: Pastikan kolom edit in-place pada residents tersedia
-- Jalankan skrip ini di Supabase Editor (SQL Editor) sekali saja.
-- Semua ADD COLUMN memakai IF NOT EXISTS sehingga aman dijalankan berulang.
-- ============================================================================

-- Kesejahteraan & Kesehatan (fallback apabila 20260814_resident_extra_fields.sql belum dijalankan)
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS disabilitas VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS status_dtks VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS golongan_darah VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS no_whatsapp VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS dusun VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS status_domisili VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS pendidikan_terakhir VARCHAR DEFAULT '';

-- Status keberadaan (fallback pada beberapa alur mutasi)
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS status_keberadaan VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS status_penduduk VARCHAR DEFAULT '';