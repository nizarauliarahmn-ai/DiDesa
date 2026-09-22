-- =============================================================
-- Tabel: usulan_submissions
-- Menyimpan usulan baru & perbaikan dari masyarakat / aparatur
-- yang diajukan melalui portal publik.
-- Status: pending -> disetujui / ditolak
-- =============================================================

CREATE TABLE IF NOT EXISTS usulan_submissions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('usulan_baru', 'perbaikan')),
  usulan_id     TEXT DEFAULT NULL,
  uraian_usulan TEXT NOT NULL,
  kategori      TEXT DEFAULT 'Infrastruktur',
  lokasi_rt_rw  TEXT DEFAULT NULL,
  pengusul      TEXT NOT NULL,
  pengusul_kontak TEXT DEFAULT NULL,
  catatan       TEXT DEFAULT NULL,
  field_yang_diperbaiki TEXT DEFAULT NULL,
  nilai_baru    TEXT DEFAULT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'disetujui', 'ditolak')),
  admin_note    TEXT DEFAULT NULL,
  reviewed_at   TIMESTAMPTZ DEFAULT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk multi-tenant & status
CREATE INDEX IF NOT EXISTS idx_usulan_submissions_tenant ON usulan_submissions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_usulan_submissions_status ON usulan_submissions (tenant_id, status);

-- RLS: anon bisa INSERT (publik), anon+authenticated bisa SELECT/UPDATE (admin)
ALTER TABLE usulan_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: publik bisa insert (submit usulan/perbaikan)
DROP POLICY IF EXISTS "Publik bisa submit usulan" ON usulan_submissions;
CREATE POLICY "Publik bisa submit usulan"
  ON usulan_submissions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: admin bisa baca semua
DROP POLICY IF EXISTS "Bisa baca submissions" ON usulan_submissions;
CREATE POLICY "Bisa baca submissions"
  ON usulan_submissions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: admin bisa update (approve/reject)
DROP POLICY IF EXISTS "Bisa update submissions" ON usulan_submissions;
CREATE POLICY "Bisa update submissions"
  ON usulan_submissions FOR UPDATE
  TO anon, authenticated
  USING (true);
