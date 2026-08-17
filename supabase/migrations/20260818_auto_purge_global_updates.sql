-- Auto-cleanup Log Pembaruan (global_updates) agar tidak menumpuk di Supabase.
-- Kebijakan retensi: data yang berumur > 90 hari otomatis dihapus setiap hari.

-- 1) Aktifkan ekstensi pg_cron (jika belum) untuk scheduler terjadwal.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2) Fungsi pembersih: hapus baris yang release_date-nya lebih lama dari 90 hari.
--    Guard regex dipakai agar casting TEXT -> DATE tidak gagal pada format tak terduga.
CREATE OR REPLACE FUNCTION public.purge_old_global_updates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.global_updates
  WHERE release_date IS NOT NULL
    AND release_date <> ''
    AND release_date ~ '^\d{4}-\d{2}-\d{2}'
    AND (release_date)::date < (CURRENT_DATE - INTERVAL '90 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 3) Hapus jadwal lama (idempoten) lalu daftarkan jadwal harian jam 03:00.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-global-updates-daily') THEN
    PERFORM cron.unschedule('purge-old-global-updates-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-old-global-updates-daily',
  '0 3 * * *',
  $$SELECT public.purge_old_global_updates();$$
);