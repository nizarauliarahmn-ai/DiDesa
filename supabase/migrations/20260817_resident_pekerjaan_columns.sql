-- ============================================================================
-- Migration: Tambah Kolom Pekerjaan (fallback nama) pada residents
-- Jalankan skrip ini di Supabase Editor (SQL Editor) sekali saja.
-- Kolom utama tetap `job`; kolom berikut sebagai fallback kompatibilitas nama.
-- ============================================================================

-- Pekerjaan (fallback alias)
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS pekerjaan VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS jenis_pekerjaan VARCHAR DEFAULT '';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS pekerjaan_nama VARCHAR DEFAULT '';
