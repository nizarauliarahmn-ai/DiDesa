-- ============================================================================
-- Migration: Tabel log penerima bantuan sosial (bansos_recipients)
-- Jalankan skrip ini di Supabase Editor (SQL Editor) sekali saja.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bansos_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  program_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  nama TEXT,
  tahun INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'aktif',
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bansos_recipients_tenant_program
  ON public.bansos_recipients (tenant_id, program_id, tahun);

ALTER TABLE public.bansos_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert bansos_recipients anon" ON public.bansos_recipients
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow select bansos_recipients anon" ON public.bansos_recipients
  FOR SELECT TO anon USING (true);
