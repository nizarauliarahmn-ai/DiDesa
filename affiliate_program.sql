-- ============================================================
-- Skema Database Program Affiliator DiDesa
-- Tabel: affiliates, affiliate_referrals, affiliate_payouts
-- Jalankan di Supabase SQL Editor (berurutan dari atas ke bawah)
-- ============================================================

-- 1) Tabel Affiliates (affiliator)
create table public.affiliates (
  id uuid default gen_random_uuid() primary key,
  user_id text,
  user_email text,
  email text not null unique,
  nama text not null,
  no_wa text,
  daerah_kerja text,
  referral_code text not null unique,
  custom_voucher_code text,
  bank_name text,
  bank_account_no text,
  bank_account_holder text,
  commission_rate numeric default 750000 not null,
  status text not null default 'pending', -- pending | active | suspended
  created_at timestamp with time zone not null default now()
);

-- 2) Tabel Affiliate Referrals (desa yang direferensikan)
create table public.affiliate_referrals (
  id uuid default gen_random_uuid() primary key,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  village_id text not null references public.tenants(id) on delete cascade,
  village_name text,
  status text not null default 'trial', -- trial | active
  commission_amount numeric default 0 not null,
  created_at timestamp with time zone not null default now()
);

-- 3) Tabel Affiliate Payouts (pencairan komisi)
create table public.affiliate_payouts (
  id uuid default gen_random_uuid() primary key,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  amount numeric not null default 0,
  status text not null default 'pending', -- pending | approved | rejected | paid
  payment_receipt_url text,
  created_at timestamp with time zone not null default now()
);

-- Index pendukung query dashboard
create index idx_affiliates_status on public.affiliates(status);
create index idx_affiliates_email on public.affiliates(email);
create index idx_affiliate_referrals_affiliate on public.affiliate_referrals(affiliate_id, created_at);
create index idx_affiliate_referrals_village on public.affiliate_referrals(village_id);
create index idx_affiliate_payouts_affiliate on public.affiliate_payouts(affiliate_id, created_at);

-- ============================================================
-- Row Level Security
-- Catatan: mengikuti pola yang sudah dipakai proyek (guest_book)
-- yang membolehkan anon read/insert untuk fitur publik/kios.
-- Verifikasi otorisasi admin dilakukan pada lapisan aplikasi.
-- ============================================================

alter table public.affiliates enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.affiliate_payouts enable row level security;

-- affiliates: daftar bisa dibaca (untuk lookup akun affiliator di dashboard publik)
create policy "Affiliates dapat dibaca publik"
on public.affiliates for select
using (true);

-- affiliates: pendaftaran dari landing page /afiliasi
create policy "Siapa saja dapat mendaftar menjadi affiliator"
on public.affiliates for insert
with check (true);

-- affiliates: update kode voucher & data bank oleh pemilik (dashboard)
create policy "Affiliates dapat diupdate"
on public.affiliates for update
using (true);

-- affiliate_referrals: read (dashboard menampilkan daftar referensi)
create policy "Referrals dapat dibaca publik"
on public.affiliate_referrals for select
using (true);

-- affiliate_referrals: dashboard "tambah desa referensi"
create policy "Siapa saja dapat menambahkan referensi desa"
on public.affiliate_referrals for insert
with check (true);

-- affiliate_referrals: update status (trial -> active) oleh admin/sistem
create policy "Referrals dapat diupdate"
on public.affiliate_referrals for update
using (true);

-- affiliate_payouts: read (dashboard menampilkan riwayat payout)
create policy "Payouts dapat dibaca publik"
on public.affiliate_payouts for select
using (true);

-- affiliate_payouts: pengajuan payout oleh affiliator
create policy "Siapa saja dapat mengajukan payout"
on public.affiliate_payouts for insert
with check (true);

-- affiliate_payouts: update status & bukti pembayaran oleh admin
create policy "Payouts dapat diupdate"
on public.affiliate_payouts for update
using (true);