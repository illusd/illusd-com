
-- Webhook event log
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text,
  status text NOT NULL, -- ok | invalid_token | invalid_payload | error
  http_status integer NOT NULL,
  email text,
  message_id text,
  reason text,
  links_upgraded integer DEFAULT 0,
  files_upgraded integer DEFAULT 0,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creators can read webhook events" ON public.webhook_events
  FOR SELECT TO authenticated USING (public.is_current_user_creator());
CREATE INDEX webhook_events_created_at_idx ON public.webhook_events (created_at DESC);

-- Reminder tracking
ALTER TABLE public.short_links ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at timestamptz;
ALTER TABLE public.short_files ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at timestamptz;

-- Creators unlimited: check function
CREATE OR REPLACE FUNCTION public.is_creator_by_email(_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.creator_allowlist WHERE lower(email) = lower(_email))
$$;

-- Schedule reminder cron (7-day before expiry) — daily at 03:30 UTC
SELECT cron.unschedule('illurl-expiry-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='illurl-expiry-reminders');
SELECT cron.schedule(
  'illurl-expiry-reminders',
  '30 3 * * *',
  $$ SELECT net.http_post(
    url := 'https://illusd.com/api/public/hooks/illurl-expiry-reminders',
    headers := '{"Content-Type":"application/json","x-notify-secret":"illusd_push_2026_a8f3k29dj4kf8s7d6"}'::jsonb,
    body := '{}'::jsonb
  ) $$
);
