-- Jalankan kode SQL ini di menu SQL Editor pada Dashboard Supabase Anda

ALTER TABLE public.aspirasi 
ADD COLUMN tanggapan_admin TEXT,
ADD COLUMN tanggapan_date TIMESTAMPTZ,
ADD COLUMN file_bukti TEXT;
