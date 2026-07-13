-- ==============================================================================
-- SCRIPT SETUP DATABASE SUPABASE "DIDESA" (MULTI-TENANT)
-- Silakan copy paste seluruh kode ini ke SQL Editor di Supabase Anda, lalu klik "Run"
-- ==============================================================================

-- 1. Buat Tabel `tenants` (Data Desa/Klien)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_desa VARCHAR UNIQUE NOT NULL,
    nama_desa VARCHAR NOT NULL,
    domain VARCHAR UNIQUE,
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat Tabel `profiles` (Data User/Admin)
-- Tabel ini berelasi dengan tabel bawaan Supabase yaitu auth.users
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    role VARCHAR DEFAULT 'admin', -- e.g., 'super_admin', 'admin', 'warga'
    nama_lengkap VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Buat Tabel `penduduk` (Data Master Penduduk)
CREATE TABLE public.penduduk (
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
    UNIQUE (tenant_id, nik) -- NIK tidak boleh ganda di dalam satu desa
);

-- 4. Buat Tabel `surat` (Data Permohonan Surat)
CREATE TABLE public.surat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    penduduk_id UUID REFERENCES public.penduduk(id) ON DELETE CASCADE,
    jenis_surat VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending', -- pending, disetujui, ditolak
    keterangan TEXT,
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

-- Policy untuk Tabel `tenants`
-- Publik bisa melihat daftar tenant (berguna untuk login / verifikasi domain)
CREATE POLICY "Publik bisa melihat data tenant" 
ON public.tenants FOR SELECT USING (true);

-- Policy untuk Tabel `profiles`
-- User hanya bisa melihat dan mengedit profilnya sendiri
CREATE POLICY "User bisa melihat profil sendiri" 
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "User bisa mengupdate profil sendiri" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policy untuk Tabel `penduduk` (ISOLASI DATA DESA)
-- User HANYA BISA melakukan (SELECT, INSERT, UPDATE, DELETE) pada data penduduk yang tenant_id-nya SAMA dengan tenant_id profil mereka.
CREATE POLICY "Isolasi data penduduk per tenant" 
ON public.penduduk FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk Tabel `surat` (ISOLASI DATA SURAT)
CREATE POLICY "Isolasi data surat per tenant" 
ON public.surat FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);


-- ==============================================================================
-- FUNGSI OTOMATIS: BUAT PROFIL KETIKA ADA USER BARU REGISTER (Opsional)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nama_lengkap)
  VALUES (new.id, new.raw_user_meta_data->>'nama_lengkap');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
