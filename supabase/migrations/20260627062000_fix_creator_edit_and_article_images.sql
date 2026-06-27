-- Make creator detection reliable for RLS and keep article covers readable.
CREATE OR REPLACE FUNCTION public.is_current_user_creator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'creator'
      )
      OR EXISTS (
        SELECT 1 FROM public.creator_allowlist
        WHERE lower(email) = lower(auth.jwt() ->> 'email')
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND creator_id IS NOT NULL
      )
    ),
    false
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_creator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- Ensure the cover bucket exists and public object URLs remain displayable.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('article-images', 'article-images', true, 10485760, ARRAY['image/*'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/*'];

DROP POLICY IF EXISTS "article-images public read" ON storage.objects;
CREATE POLICY "article-images public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'article-images');

DROP POLICY IF EXISTS "article-images creator insert" ON storage.objects;
DROP POLICY IF EXISTS "article-images creator update" ON storage.objects;
DROP POLICY IF EXISTS "article-images creator delete" ON storage.objects;

CREATE POLICY "article-images creator insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'article-images'
    AND public.is_current_user_creator()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "article-images creator update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'article-images'
    AND public.is_current_user_creator()
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'article-images'
    AND public.is_current_user_creator()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "article-images creator delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'article-images'
    AND public.is_current_user_creator()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "creators insert articles" ON public.articles;
DROP POLICY IF EXISTS "creators can update articles" ON public.articles;
DROP POLICY IF EXISTS "Authors can update their own articles" ON public.articles;

CREATE POLICY "creators insert articles"
  ON public.articles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.is_current_user_creator());

CREATE POLICY "creators can update articles"
  ON public.articles FOR UPDATE
  TO authenticated
  USING (public.is_current_user_creator())
  WITH CHECK (public.is_current_user_creator());

DROP POLICY IF EXISTS "Creators can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Creators can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Creators can delete announcements" ON public.announcements;

CREATE POLICY "Creators can insert announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_current_user_creator() AND auth.uid() = author_id);

CREATE POLICY "Creators can update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (public.is_current_user_creator())
  WITH CHECK (public.is_current_user_creator());

CREATE POLICY "Creators can delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (public.is_current_user_creator());
