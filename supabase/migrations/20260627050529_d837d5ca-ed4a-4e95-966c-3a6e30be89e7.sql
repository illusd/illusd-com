DROP POLICY IF EXISTS "authors update own" ON public.articles;
DROP POLICY IF EXISTS "Authors can update their own articles" ON public.articles;
DROP POLICY IF EXISTS "authors delete own" ON public.articles;

CREATE POLICY "creators can update articles"
  ON public.articles FOR UPDATE
  USING (public.has_role(auth.uid(), 'creator'))
  WITH CHECK (public.has_role(auth.uid(), 'creator'));

CREATE POLICY "creators can delete articles"
  ON public.articles FOR DELETE
  USING (public.has_role(auth.uid(), 'creator'));