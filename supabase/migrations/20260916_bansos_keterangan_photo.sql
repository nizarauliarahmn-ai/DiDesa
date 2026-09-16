-- Adds keterangan (notes) and photo_url columns to bansos_recipients

ALTER TABLE bansos_recipients ADD COLUMN IF NOT EXISTS keterangan text;
ALTER TABLE bansos_recipients ADD COLUMN IF NOT EXISTS photo_url text;
