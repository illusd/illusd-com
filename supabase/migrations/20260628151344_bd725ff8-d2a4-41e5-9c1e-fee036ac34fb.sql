ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS verification_result jsonb,
  ADD COLUMN IF NOT EXISTS write_result jsonb,
  ADD COLUMN IF NOT EXISTS upgrade_before jsonb,
  ADD COLUMN IF NOT EXISTS upgrade_after jsonb;

CREATE TABLE IF NOT EXISTS public.poosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.poosts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.poosts TO authenticated;
GRANT ALL ON public.poosts TO service_role;
ALTER TABLE public.poosts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "poosts public read" ON public.poosts;
CREATE POLICY "poosts public read" ON public.poosts
  FOR SELECT TO anon, authenticated
  USING (true);
DROP POLICY IF EXISTS "creators insert poosts" ON public.poosts;
CREATE POLICY "creators insert poosts" ON public.poosts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.is_current_user_creator());
DROP POLICY IF EXISTS "creators update poosts" ON public.poosts;
CREATE POLICY "creators update poosts" ON public.poosts
  FOR UPDATE TO authenticated
  USING (public.is_current_user_creator())
  WITH CHECK (public.is_current_user_creator());
DROP POLICY IF EXISTS "creators delete poosts" ON public.poosts;
CREATE POLICY "creators delete poosts" ON public.poosts
  FOR DELETE TO authenticated
  USING (public.is_current_user_creator());
DROP TRIGGER IF EXISTS update_poosts_updated_at ON public.poosts;
CREATE TRIGGER update_poosts_updated_at
  BEFORE UPDATE ON public.poosts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  message text NOT NULL,
  image_urls text[] NOT NULL DEFAULT '{}',
  short_urls text[] NOT NULL DEFAULT '{}',
  email_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.feedback TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone can submit feedback" ON public.feedback;
CREATE POLICY "anyone can submit feedback" ON public.feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "creators can read feedback" ON public.feedback;
CREATE POLICY "creators can read feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (public.is_current_user_creator());
DROP POLICY IF EXISTS "creators can manage feedback" ON public.feedback;
CREATE POLICY "creators can manage feedback" ON public.feedback
  FOR UPDATE TO authenticated
  USING (public.is_current_user_creator())
  WITH CHECK (public.is_current_user_creator());

DROP POLICY IF EXISTS "creators can update articles" ON public.articles;
CREATE POLICY "creators can update articles"
  ON public.articles
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_creator())
  WITH CHECK (public.is_current_user_creator());

DROP POLICY IF EXISTS "article-images creator update" ON storage.objects;
DROP POLICY IF EXISTS "article-images creator delete" ON storage.objects;
CREATE POLICY "article-images creator update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'article-images' AND public.is_current_user_creator())
WITH CHECK (bucket_id = 'article-images' AND public.is_current_user_creator());
CREATE POLICY "article-images creator delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'article-images' AND public.is_current_user_creator());