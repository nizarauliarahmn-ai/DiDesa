-- Tambah 10 kolom detail kegiatan ke tabel apbdesa

ALTER TABLE apbdesa ADD COLUMN IF NOT EXISTS bidang text DEFAULT 'Penyelenggaraan Pemerintahan Desa';
ALTER TABLE apbdesa ADD COLUMN IF NOT EXISTS jenis_belanja text DEFAULT 'Belanja Modal';
ALTER TABLE apbdesa ADD COLUMN IF NOT EXISTS pka text;
ALTER TABLE apbdesa ADD COLUMN IF NOT EXISTS ketua_tpk text;
ALTER TABLE apbdesa ADD COLUMN IF NOT EXISTS sekretaris_tpk text;
ALTER TABLE apbdesa ADD COLUMN IF NOT EXISTS anggota_tpk text;
ALTER TABLE apbdesa ADD COLUMN IF NOT EXISTS jenis_kegiatan text DEFAULT 'Pengadaan';
ALTER TABLE apbdesa ADD COLUMN IF NOT EXISTS fisik_non_fisik text DEFAULT 'Fisik';
ALTER TABLE apbdesa ADD COLUMN IF NOT EXISTS status_spj text DEFAULT 'Belum';
ALTER TABLE apbdesa ADD COLUMN IF NOT EXISTS catatan_kendala text;

-- Set default untuk data existing
UPDATE apbdesa SET bidang = 'Penyelenggaraan Pemerintahan Desa' WHERE bidang IS NULL;
UPDATE apbdesa SET jenis_belanja = 'Belanja Modal' WHERE jenis_belanja IS NULL;
UPDATE apbdesa SET jenis_kegiatan = 'Pengadaan' WHERE jenis_kegiatan IS NULL;
UPDATE apbdesa SET fisik_non_fisik = 'Fisik' WHERE fisik_non_fisik IS NULL;
UPDATE apbdesa SET status_spj = 'Belum' WHERE status_spj IS NULL;
