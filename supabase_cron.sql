-- Enable the pg_cron extension if it isn't already enabled
create extension if not exists pg_cron;

-- Schedule a job to run every day at midnight to delete messages older than 24 hours
select cron.schedule(
  'delete-old-messages',
  '0 0 * * *',
  $$ delete from public.messages where created_at < now() - interval '1 day' $$
);

-- Schedule a job to run every day at midnight to delete transcripts older than 24 hours
select cron.schedule(
  'delete-old-transcripts',
  '0 0 * * *',
  $$ delete from public.transcripts where created_at < now() - interval '1 day' $$
);
