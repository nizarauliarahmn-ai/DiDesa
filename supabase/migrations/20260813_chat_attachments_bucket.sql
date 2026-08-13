-- ============================================================================
-- Migration: Pembuatan Storage Bucket chat-attachments + RLS policy
-- Jalankan skrip ini di Supabase Editor (SQL Editor) sekali saja.
-- ============================================================================

-- 1. Buat bucket publik untuk lampiran chat bantuan teknis (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Berikan akses ke bucket chat-attachments (READ + WRITE)
CREATE POLICY "Public Access Chat Files" ON storage.objects
FOR ALL USING (bucket_id = 'chat-attachments')
WITH CHECK (bucket_id = 'chat-attachments');

-- Opsional: batasi agar hanya gambar/dokumen yang boleh diunggah
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;