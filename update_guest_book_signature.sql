-- 1. Tambahkan kolom signature_url ke tabel guest_book
ALTER TABLE public.guest_book 
ADD COLUMN IF NOT EXISTS signature_url text;

-- Keterangan: Kolom ini akan menyimpan link (URL) gambar tanda tangan dari Supabase Storage

-- 2. Buat Supabase Storage Bucket bernama 'signatures' (Jika belum ada)
insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', true)
on conflict (id) do nothing;

-- 3. Atur Policy Keamanan agar publik/siapa saja bisa upload ke bucket 'signatures'
create policy "Siapa saja dapat mengunggah tanda tangan"
on storage.objects for insert
with check ( bucket_id = 'signatures' );

-- 4. Atur Policy Keamanan agar publik/siapa saja bisa membaca (melihat) gambar tanda tangan
create policy "Siapa saja dapat melihat tanda tangan"
on storage.objects for select
using ( bucket_id = 'signatures' );
