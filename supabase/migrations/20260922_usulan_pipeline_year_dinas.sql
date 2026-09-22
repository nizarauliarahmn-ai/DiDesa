-- =============================================================
-- Tambah kolom tahun pipeline & dinas penanggung jawab
-- pada tabel usulan_desas
-- =============================================================

-- pipeline_year: tahun anggaran saat usulan masuk ke RPJMDesa/RKPDesa/APBDesa
ALTER TABLE usulan_desas ADD COLUMN IF NOT EXISTS pipeline_year TEXT DEFAULT NULL;

-- dinas_penanggung_jawab: nama dinas/OPD yang mengerjakan (saat status Dikerjakan)
ALTER TABLE usulan_desas ADD COLUMN IF NOT EXISTS dinas_penanggung_jawab TEXT DEFAULT NULL;
