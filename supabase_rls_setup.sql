-- ==========================================================
-- SCRIPT SOLUSI RLS SUPABASE (Row Level Security) - DiDesa SaaS
-- ==========================================================
-- Salin dan jalankan seluruh script ini di Supabase SQL Editor Anda
-- Dashboard Supabase -> Project -> SQL Editor -> New Query -> Run

-- 1. Buat Tabel global_settings jika belum ada
CREATE TABLE IF NOT EXISTS public.global_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- 3. Hapus Policy lama jika ada agar tidak konflik
DROP POLICY IF EXISTS "Allow public select on global_settings" ON public.global_settings;
DROP POLICY IF EXISTS "Allow public write on global_settings" ON public.global_settings;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.global_settings;

-- 4. Buat Policy Baca (SELECT) untuk Publik
CREATE POLICY "Allow public select on global_settings" 
ON public.global_settings 
FOR SELECT 
TO public 
USING (true);

-- 5. Buat Policy Tulis/Ubah (INSERT/UPDATE/DELETE) untuk Publik & Admin
CREATE POLICY "Allow public write on global_settings" 
ON public.global_settings 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 6. Aktifkan Realtime Replication untuk tabel global_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_settings;
