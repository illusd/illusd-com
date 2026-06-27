
-- Ensure has_role is callable by both roles (storage RLS runs as the caller's role)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- Replace article-images write policies: use auth.uid() folder instead of profiles.creator_id
DROP POLICY IF EXISTS "article-images creator insert" ON storage.objects;
DROP POLICY IF EXISTS "article-images creator update" ON storage.objects;
DROP POLICY IF EXISTS "article-images creator delete" ON storage.objects;

CREATE POLICY "article-images creator insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'article-images'
    AND public.has_role(auth.uid(), 'creator')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "article-images creator update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'article-images'
    AND public.has_role(auth.uid(), 'creator')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "article-images creator delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'article-images'
    AND public.has_role(auth.uid(), 'creator')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow article authors to update their own articles (for the new edit feature)
DROP POLICY IF EXISTS "Authors can update their own articles" ON public.articles;
CREATE POLICY "Authors can update their own articles"
  ON public.articles FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);
