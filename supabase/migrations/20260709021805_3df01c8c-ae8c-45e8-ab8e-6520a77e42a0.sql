CREATE TABLE public.ai_cache (
  cache_key text PRIMARY KEY,
  content text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_cache TO anon, authenticated;
GRANT ALL ON public.ai_cache TO service_role;
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_cache public read" ON public.ai_cache FOR SELECT USING (true);