-- ============================================================================
-- Migration: Kolom metadata Google Drive pada tabel usulan_desas
-- Jalankan skrip ini di Supabase SQL Editor sekali saja.
-- ============================================================================

ALTER TABLE public.usulan_desas
  ADD COLUMN IF NOT EXISTS google_drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS google_drive_view_url TEXT,
  ADD COLUMN IF NOT EXISTS google_drive_download_url TEXT;
