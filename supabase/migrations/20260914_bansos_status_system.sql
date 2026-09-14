-- Bantuan Status System: Usulan → Aktif → Pernah Mendapat
-- Adds formal status tracking to bansos_recipients

-- 1. Add status field (usulan / aktif / pernah_mendapat)
ALTER TABLE bansos_recipients ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'aktif';

-- 2. Add year tracking fields
ALTER TABLE bansos_recipients ADD COLUMN IF NOT EXISTS tahun_mulai integer;
ALTER TABLE bansos_recipients ADD COLUMN IF NOT EXISTS tahun_akhir integer;

-- 3. Add stop tracking fields
ALTER TABLE bansos_recipients ADD COLUMN IF NOT EXISTS alasan_berhenti text;
ALTER TABLE bansos_recipients ADD COLUMN IF NOT EXISTS tanggal_berhenti date;

-- 4. Backfill: existing 'aktif' records get tahun_mulai = tahun
UPDATE bansos_recipients SET tahun_mulai = tahun WHERE tahun_mulai IS NULL AND status = 'aktif';

-- 5. Backfill: records from previous years that are no longer current → pernah_mendapat
UPDATE bansos_recipients SET status = 'pernah_mendapat', tahun_akhir = tahun
WHERE status = 'aktif' AND tahun < EXTRACT(YEAR FROM NOW());

-- 6. Add check constraint for valid statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bansos_recipients_status_check'
  ) THEN
    ALTER TABLE bansos_recipients ADD CONSTRAINT bansos_recipients_status_check
      CHECK (status IN ('usulan', 'aktif', 'pernah_mendapat'));
  END IF;
END $$;

-- 7. Add index for status-based queries
CREATE INDEX IF NOT EXISTS idx_bansos_recipients_status ON bansos_recipients (tenant_id, status, tahun);
