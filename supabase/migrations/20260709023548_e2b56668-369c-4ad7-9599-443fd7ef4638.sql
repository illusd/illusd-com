
CREATE TABLE public.illurl_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX ON public.illurl_api_keys(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.illurl_api_keys TO authenticated;
GRANT ALL ON public.illurl_api_keys TO service_role;
ALTER TABLE public.illurl_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own keys" ON public.illurl_api_keys FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
