-- Add jenis_apbdesa field to distinguish Murni vs Perubahan
-- APBDesa can have 2 versions per year: Murni (original) and Perubahan (revision)

ALTER TABLE apbdesa ADD COLUMN IF NOT EXISTS jenis varchar(20) DEFAULT 'Murni';

-- Update existing records to have 'Murni' as default
UPDATE apbdesa SET jenis = 'Murni' WHERE jenis IS NULL;

-- Add check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'apbdesa_jenis_check'
  ) THEN
    ALTER TABLE apbdesa ADD CONSTRAINT apbdesa_jenis_check CHECK (jenis IN ('Murni', 'Perubahan'));
  END IF;
END $$;

-- Update unique index to include jenis (same kegiatan can exist in Murni and Perubahan)
-- Drop old unique index if exists
DROP INDEX IF EXISTS apbdesa_kode_apbdesa_tenant_id_key;

-- Create new unique index that includes jenis
CREATE UNIQUE INDEX IF NOT EXISTS apbdesa_kode_tenant_jenis_unique
  ON apbdesa (kode_apbdesa, tenant_id, jenis);
