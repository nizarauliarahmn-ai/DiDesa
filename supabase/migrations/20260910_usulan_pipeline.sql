-- =====================================================
-- Tabel: usulan_desas — tambah pipeline_status + foto_progress
-- Pipeline: Diajukan → Musrenbang → RKPDesa → RPJMDesa → APBDesa → Dikerjakan → Selesai
-- =====================================================

ALTER TABLE usulan_desas ADD COLUMN IF NOT EXISTS pipeline_status TEXT NOT NULL DEFAULT 'Diajukan';
ALTER TABLE usulan_desas ADD COLUMN IF NOT EXISTS foto_progress_url TEXT;

-- Update existing data berdasarkan diteruskan_tags dan status_terakomodir
UPDATE usulan_desas SET pipeline_status = 'RPJMDesa' WHERE 'RPJMDes 2026' = ANY(diteruskan_tags) OR 'RPJMDes 2027' = ANY(diteruskan_tags);
UPDATE usulan_desas SET pipeline_status = 'Musrenbang' WHERE ('Musrenbang 2026' = ANY(diteruskan_tags) OR 'Musrenbang 2027' = ANY(diteruskan_tags)) AND pipeline_status = 'Diajukan';
UPDATE usulan_desas SET pipeline_status = 'RKPDesa' WHERE 'RKPDes 2026' = ANY(diteruskan_tags) OR 'RKPDes 2027' = ANY(diteruskan_tags);
UPDATE usulan_desas SET pipeline_status = 'APBDesa' WHERE status_terakomodir IN ('Desa 2026', 'Desa 2027', 'Kab 2026', 'Kab 2027');
UPDATE usulan_desas SET pipeline_status = 'Ditolak' WHERE status_terakomodir = 'Ditolak';

-- Index
CREATE INDEX IF NOT EXISTS idx_usulan_pipeline ON usulan_desas(pipeline_status);
