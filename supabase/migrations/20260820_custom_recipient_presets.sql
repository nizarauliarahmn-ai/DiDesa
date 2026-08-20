-- ============================================================================
-- Migration: custom_recipient_presets
-- Menyimpan daftar penerima undangan kustom milik masing-masing tenant/desa.
-- Jalankan skrip ini di Supabase SQL Editor sekali saja (idempotent).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.custom_recipient_presets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_recipient_presets_tenant
  ON public.custom_recipient_presets (tenant_id, created_at DESC);

-- Policy RLS: baca/tulis hanya untuk tenant yang bersangkutan
ALTER TABLE public.custom_recipient_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Custom Recipient Presets Select Own Tenant" ON public.custom_recipient_presets;
CREATE POLICY "Custom Recipient Presets Select Own Tenant"
  ON public.custom_recipient_presets
  FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id') OR tenant_id = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS "Custom Recipient Presets Insert Own Tenant" ON public.custom_recipient_presets;
CREATE POLICY "Custom Recipient Presets Insert Own Tenant"
  ON public.custom_recipient_presets
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id') OR tenant_id = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS "Custom Recipient Presets Delete Own Tenant" ON public.custom_recipient_presets;
CREATE POLICY "Custom Recipient Presets Delete Own Tenant"
  ON public.custom_recipient_presets
  FOR DELETE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id') OR tenant_id = current_setting('app.tenant_id', true));