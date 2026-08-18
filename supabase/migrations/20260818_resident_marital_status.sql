-- ============================================================================
-- Migration: Tambah Kolom Status Perkawinan pada residents
-- Jalankan skrip ini di Supabase Editor (SQL Editor) sekali saja.
-- Kolom ini dipakai oleh alur impor penduduk, edit detail, dan pembuatan surat.
-- ============================================================================
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS marital_status VARCHAR DEFAULT '';
