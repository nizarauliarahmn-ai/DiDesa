-- ============================================================================
-- Migration: custom_recipient_presets
-- Menyimpan daftar penerima undangan kustom milik masing-masing tenant/desa.
-- Jalankan skrip ini di Supabase SQL Editor sekali saja (idempotent).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.custom_recipient_presets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom created_by ada (aman jika tabel sudah dibuat dari versi sebelumnya,
-- sebelum index dibuat agar tidak error "column does not exist")
ALTER TABLE public.custom_recipient_presets ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_custom_recipient_presets_tenant
  ON public.custom_recipient_presets (tenant_id, created_by, created_at DESC);

-- Policy RLS: mengikuti pola tabel lain (surat, aspirasi, dst.) yang memakai
-- akses terbuka + filter tenant_id di level aplikasi (anon key tanpa klaim tenant).
ALTER TABLE public.custom_recipient_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses Publik Custom Recipient Presets" ON public.custom_recipient_presets;
CREATE POLICY "Akses Publik Custom Recipient Presets"
  ON public.custom_recipient_presets
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);