-- Reset semua fisik_non_fisik ke NULL agar cara pengadaan dihitung otomatis dari anggaran
-- Hanya item yang benar-benar pekerjaan fisik/bangunan yang perlu di-set manual ke 'Fisik'
UPDATE apbdesa SET fisik_non_fisik = NULL;
