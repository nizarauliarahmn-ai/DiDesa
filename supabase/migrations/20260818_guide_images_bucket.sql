-- ============================================================================
-- Migration: Storage Bucket guide-images untuk foto pada konten Panduan & Tutorial
-- Jalankan skrip ini di Supabase Editor (SQL Editor) sekali saja.
-- ============================================================================

-- 1. Buat bucket publik untuk gambar konten panduan (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('guide-images', 'guide-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Berikan akses READ + WRITE ke bucket guide-images (idempotent)
DROP POLICY IF EXISTS "Public Access Guide Images" ON storage.objects;
CREATE POLICY "Public Access Guide Images" ON storage.objects
FOR ALL USING (bucket_id = 'guide-images')
WITH CHECK (bucket_id = 'guide-images');