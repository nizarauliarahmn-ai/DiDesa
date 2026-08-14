-- ============================================================================
-- Migration: Tabel master usulan pembangunan desa (usulan_desas)
-- Jalankan skrip ini di Supabase SQL Editor sekali saja.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usulan_desas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  kode_usulan TEXT NOT NULL,
  uraian_usulan TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT 'Infrastruktur',
  lokasi_rt_rw TEXT,
  pengusul TEXT,
  diteruskan_tags TEXT[] DEFAULT '{}',
  status_terakomodir TEXT NOT NULL DEFAULT 'Belum',
  skala_prioritas INTEGER,
  keterangan TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usulan_desas_tenant_kode
  ON public.usulan_desas (tenant_id, kode_usulan);

CREATE INDEX IF NOT EXISTS idx_usulan_desas_tenant_kategori
  ON public.usulan_desas (tenant_id, kategori);

CREATE INDEX IF NOT EXISTS idx_usulan_desas_tenant_status
  ON public.usulan_desas (tenant_id, status_terakomodir);

ALTER TABLE public.usulan_desas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert usulan_desas anon" ON public.usulan_desas
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow select usulan_desas anon" ON public.usulan_desas
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow update usulan_desas anon" ON public.usulan_desas
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete usulan_desas anon" ON public.usulan_desas
  FOR DELETE TO anon USING (true);