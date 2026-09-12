-- Tambah kolom cara_pengadaan ke tabel apbdesa
-- Berdasarkan Perpres 12/2019 & Keputusan Deputi LKPP No. 2/2024 & No. 1/2025
-- Opsi: Swakelola, Pembelian Langsung, Permintaan Penawaran, Lelang/Tender, Penunjukan Langsung

ALTER TABLE apbdesa ADD COLUMN IF NOT EXISTS cara_pengadaan text DEFAULT 'Swakelola';

-- Set default untuk data existing
UPDATE apbdesa SET cara_pengadaan = 'Swakelola' WHERE cara_pengadaan IS NULL;

-- Constraint agar hanya opsi yang valid
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'apbdesa_cara_pengadaan_check') THEN
    ALTER TABLE apbdesa ADD CONSTRAINT apbdesa_cara_pengadaan_check 
      CHECK (cara_pengadaan IN ('Swakelola', 'Pembelian Langsung', 'Permintaan Penawaran', 'Lelang/Tender', 'Penunjukan Langsung'));
  END IF;
END $$;
