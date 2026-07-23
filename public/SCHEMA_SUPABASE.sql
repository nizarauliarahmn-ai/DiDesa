-- ==============================================================================
-- SCRIPT SETUP DATABASE SUPABASE "DIDESA" (MULTI-TENANT)
-- Silakan copy paste seluruh kode ini ke SQL Editor di Supabase Anda, lalu klik "Run"
-- ==============================================================================

-- 1. Buat Tabel `tenants` (Data Desa/Klien)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_desa VARCHAR UNIQUE NOT NULL,
    nama_desa VARCHAR NOT NULL,
    domain VARCHAR UNIQUE,
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat Tabel `profiles` (Data User/Admin)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    role VARCHAR DEFAULT 'admin', 
    nama_lengkap VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Buat Tabel `penduduk` (Data Master Penduduk)
CREATE TABLE IF NOT EXISTS public.penduduk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    nik VARCHAR NOT NULL,
    nama VARCHAR NOT NULL,
    jenis_kelamin VARCHAR,
    tempat_lahir VARCHAR,
    tanggal_lahir DATE,
    agama VARCHAR,
    pekerjaan VARCHAR,
    alamat TEXT,
    rt VARCHAR,
    rw VARCHAR,
    status_perkawinan VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, nik)
);

-- 4. Buat Tabel `surat` (Data Permohonan Surat)
CREATE TABLE IF NOT EXISTS public.surat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    penduduk_id UUID REFERENCES public.penduduk(id) ON DELETE CASCADE,
    jenis_surat VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending', 
    keterangan TEXT,
    nik VARCHAR,
    nama VARCHAR,
    nomor VARCHAR,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Buat Tabel `aspirasi`
CREATE TABLE IF NOT EXISTS public.aspirasi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    kategori VARCHAR NOT NULL,
    pesan TEXT NOT NULL,
    nama_pengirim VARCHAR,
    status VARCHAR DEFAULT 'Baru',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Buat Tabel `notifications`
CREATE TABLE IF NOT EXISTS public.notifications (
    id VARCHAR PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR,
    message TEXT,
    category VARCHAR,
    type VARCHAR,
    is_read BOOLEAN DEFAULT false,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    time VARCHAR
);

-- 7. Buat Tabel `guest_book`
CREATE TABLE IF NOT EXISTS public.guest_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    nama VARCHAR NOT NULL,
    instansi VARCHAR,
    tujuan TEXT,
    tanggal TIMESTAMPTZ DEFAULT NOW(),
    signature_url VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- PENGATURAN ROW LEVEL SECURITY (RLS) - INTI DARI MULTI-TENANT
-- ==============================================================================

-- Aktifkan RLS di semua tabel
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penduduk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aspirasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_book ENABLE ROW LEVEL SECURITY;

-- Hapus policy yang sudah ada agar tidak error saat di-run ulang
DROP POLICY IF EXISTS "Publik bisa melihat data tenant" ON public.tenants;
DROP POLICY IF EXISTS "User bisa melihat profil sendiri" ON public.profiles;
DROP POLICY IF EXISTS "User bisa mengupdate profil sendiri" ON public.profiles;
DROP POLICY IF EXISTS "Isolasi data penduduk per tenant" ON public.penduduk;
DROP POLICY IF EXISTS "Isolasi data surat per tenant" ON public.surat;
DROP POLICY IF EXISTS "Akses Publik Insert Surat" ON public.surat;
DROP POLICY IF EXISTS "Akses Publik Update Surat" ON public.surat;
DROP POLICY IF EXISTS "Akses Publik Insert Aspirasi" ON public.aspirasi;
DROP POLICY IF EXISTS "Akses Publik Insert Notifikasi" ON public.notifications;
DROP POLICY IF EXISTS "Akses Publik Insert Buku Tamu" ON public.guest_book;

-- Policy untuk Tabel `tenants`
CREATE POLICY "Publik bisa melihat data tenant" ON public.tenants FOR SELECT USING (true);

-- Policy untuk Tabel `profiles`
CREATE POLICY "User bisa melihat profil sendiri" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "User bisa mengupdate profil sendiri" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policy untuk Tabel `penduduk`
CREATE POLICY "Isolasi data penduduk per tenant" ON public.penduduk FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk Tabel `surat` (Admin + Publik Kios)
CREATE POLICY "Isolasi data surat per tenant" ON public.surat FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Akses Publik Insert Surat" ON public.surat FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Akses Publik Update Surat" ON public.surat FOR UPDATE TO anon, authenticated USING (true);

-- Policy untuk Tabel `aspirasi`
CREATE POLICY "Akses Publik Insert Aspirasi" ON public.aspirasi FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Akses Admin Baca Aspirasi" ON public.aspirasi FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk Tabel `notifications`
CREATE POLICY "Akses Publik Insert Notifikasi" ON public.notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Akses Admin Baca Notifikasi" ON public.notifications FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk Tabel `guest_book`
CREATE POLICY "Akses Publik Insert Buku Tamu" ON public.guest_book FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Akses Admin Baca Buku Tamu" ON public.guest_book FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- ==============================================================================
-- BUCKET UNTUK TANDA TANGAN (SIGNATURES)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Akses Publik Upload Tanda Tangan" ON storage.objects;
CREATE POLICY "Akses Publik Upload Tanda Tangan" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK ( bucket_id = 'signatures' );

DROP POLICY IF EXISTS "Akses Publik Baca Tanda Tangan" ON storage.objects;
CREATE POLICY "Akses Publik Baca Tanda Tangan" ON storage.objects FOR SELECT TO anon, authenticated USING ( bucket_id = 'signatures' );

-- ==============================================================================
-- FUNGSI OTOMATIS: BUAT PROFIL KETIKA ADA USER BARU REGISTER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nama_lengkap)
  VALUES (new.id, new.raw_user_meta_data->>'nama_lengkap');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
