-- ============================================================
-- MIGRATION: Modul Perencanaan & Penganggaran Desa
-- Tables: rpjmdesa, rkpdesa, apbdesa
-- Plus: ALTER usulan_desas (add anggaran, rpjmdesa_id)
-- Date: 2026-09-10
-- ============================================================

-- 1. Tabel RPJMDesa (Rencana Pembangunan Jangka Menengah Desa — 5 tahun)
CREATE TABLE IF NOT EXISTS rpjmdesa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  kode_rpjmdesa TEXT NOT NULL,
  nama_program TEXT NOT NULL,
  kategori TEXT DEFAULT 'Infrastruktur',
  lokasi TEXT,
  sumber_data TEXT DEFAULT 'manual',
  usulan_id UUID,
  tahun_awal INTEGER NOT NULL,
  tahun_akhir INTEGER NOT NULL,
  anggaran_estimasi NUMERIC(15,2) DEFAULT 0,
  skala_prioritas INTEGER DEFAULT 3,
  keterangan TEXT,
  status TEXT DEFAULT 'Rencana',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rpjmdesa_tenant ON rpjmdesa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rpjmdesa_tenant_tahun ON rpjmdesa(tenant_id, tahun_awal);

ALTER TABLE rpjmdesa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all rpjmdesa" ON rpjmdesa;
CREATE POLICY "Allow all rpjmdesa" ON rpjmdesa FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabel RKPDesa (Rencana Kerja Pemerintah Desa — 1 tahun)
CREATE TABLE IF NOT EXISTS rkpdesa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  kode_rkpdesa TEXT NOT NULL,
  rpjmdesa_id UUID,
  nama_kegiatan TEXT NOT NULL,
  kategori TEXT DEFAULT 'Infrastruktur',
  lokasi TEXT,
  sumber_data TEXT DEFAULT 'rpjmdesa',
  tahun INTEGER NOT NULL,
  anggaran NUMERIC(15,2) DEFAULT 0,
  skala_prioritas INTEGER DEFAULT 3,
  keterangan TEXT,
  status TEXT DEFAULT 'Rencana',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rkpdesa_tenant ON rkpdesa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rkpdesa_tenant_tahun ON rkpdesa(tenant_id, tahun);

ALTER TABLE rkpdesa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all rkpdesa" ON rkpdesa;
CREATE POLICY "Allow all rkpdesa" ON rkpdesa FOR ALL USING (true) WITH CHECK (true);

-- 3. Tabel APBDesa (Anggaran Pendapatan dan Belanja Desa — monitoring pencairan)
CREATE TABLE IF NOT EXISTS apbdesa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  kode_apbdesa TEXT NOT NULL,
  rkpdesa_id UUID,
  nama_kegiatan TEXT NOT NULL,
  kategori TEXT DEFAULT 'Infrastruktur',
  lokasi TEXT,
  sumber_data TEXT DEFAULT 'rkpdesa',
  tahun INTEGER NOT NULL,
  anggaran NUMERIC(15,2) DEFAULT 0,
  tahapan_pencairan TEXT DEFAULT 'Belum',
  tanggal_pencairan TIMESTAMPTZ,
  keterangan_pencairan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apbdesa_tenant ON apbdesa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_apbdesa_tenant_tahun ON apbdesa(tenant_id, tahun);

ALTER TABLE apbdesa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all apbdesa" ON apbdesa;
CREATE POLICY "Allow all apbdesa" ON apbdesa FOR ALL USING (true) WITH CHECK (true);

-- 4. ALTER TABLE usulan_desas — tambah kolom anggaran dan rpjmdesa_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usulan_desas' AND column_name = 'anggaran') THEN
    ALTER TABLE usulan_desas ADD COLUMN anggaran NUMERIC(15,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usulan_desas' AND column_name = 'rpjmdesa_id') THEN
    ALTER TABLE usulan_desas ADD COLUMN rpjmdesa_id UUID;
  END IF;
END $$;
