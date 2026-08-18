-- ============================================================================
-- Migration: Tambah kolom created_at & deleted_at pada tabel public.residents
-- Dipakai oleh UI: urutan "Terbaru", badge BARU, dan proses hapus ke Recycle Bin.
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor.
-- ============================================================================

-- 1. Kolom timestamp pembuatan data (default otomatis = waktu insert)
ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Kolom timestamp pemindahan ke Tong Sampah / arsip (soft delete)
ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Indeks untuk mempercepat pengurutan & filter "terbaru"
CREATE INDEX IF NOT EXISTS idx_residents_created_at
  ON public.residents (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_residents_deleted_at
  ON public.residents (deleted_at);

-- 4. (Opsional) Isi created_at historis = waktu migrasi hanya untuk baris yang masih NULL,
--    agar kolom tidak kosong bagi data lama. Lewati jika tidak ingin mengubah urutan lama.
UPDATE public.residents
   SET created_at = NOW()
 WHERE created_at IS NULL;

-- Verifikasi
SELECT column_name
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'residents'
   AND column_name IN ('created_at', 'deleted_at')
 ORDER BY column_name;