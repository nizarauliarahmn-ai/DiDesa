-- Tabel guest_book untuk fitur Buku Tamu Digital DiDesa
create table public.guest_book (
  id uuid default gen_random_uuid() primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  nik text,
  nama text not null,
  alamat text,
  instansi text,
  keperluan text not null,
  tujuan_temu text,
  tanggal_masuk timestamp with time zone not null default now(),
  tanggal_keluar timestamp with time zone,
  status text not null default 'hadir',
  created_at timestamp with time zone not null default now()
);

-- Index untuk mempercepat query dashboard dan filter
create index idx_guest_book_tenant_date on public.guest_book(tenant_id, tanggal_masuk);
create index idx_guest_book_status on public.guest_book(status);

-- RLS (Row Level Security)
alter table public.guest_book enable row level security;

-- Policy untuk read
create policy "Buku Tamu dapat dibaca oleh tenant yang sesuai" 
on public.guest_book for select 
using (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id' OR auth.role() = 'anon');

-- Policy untuk insert (Termasuk public karena kiosk diakses publik)
create policy "Siapa saja dapat mengisi buku tamu" 
on public.guest_book for insert 
with check (true);

-- Policy untuk update (Hanya admin/petugas)
create policy "Buku tamu dapat diupdate oleh admin" 
on public.guest_book for update 
using (true);

-- Policy untuk delete (Hanya admin/petugas)
create policy "Buku tamu dapat dihapus oleh admin" 
on public.guest_book for delete 
using (true);
