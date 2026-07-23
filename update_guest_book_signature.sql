-- Tambahkan kolom signature_base64 ke tabel guest_book
ALTER TABLE public.guest_book 
ADD COLUMN IF NOT EXISTS signature_base64 text;

-- Keterangan: Kolom ini akan menyimpan data gambar tanda tangan dalam format base64
