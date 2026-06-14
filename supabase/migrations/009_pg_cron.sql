-- Schedule the sync job. Requires:
--   1) pg_cron extension enabled  (Dashboard → Database → Extensions → enable "pg_cron")
--   2) http     extension enabled  (Dashboard → Database → Extensions → enable "http")
-- Both are available on the Supabase free tier.

-- Unschedule any existing job with this name (safe re-run)
do $$
begin
  perform cron.unschedule('sync-wc-results');
exception when others then
  -- ignore: job didn't exist
  null;
end $$;

-- Run every 15 minutes
select cron.schedule(
  'sync-wc-results',
  '*/15 * * * *',
  $cmd$ select public.sync_match_results(); $cmd$
);

-- To inspect history later:
--   select * from cron.job;                          -- scheduled jobs
--   select * from cron.job_run_details order by start_time desc limit 20;
