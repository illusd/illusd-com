
-- 1) profiles: remove publicly-readable email column (email lives in auth.users)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- 2) creator_allowlist: remove public SELECT (only the SECURITY DEFINER trigger needs it)
DROP POLICY IF EXISTS "allowlist readable" ON public.creator_allowlist;

-- 3) user_roles: restrict SELECT to the owning user
DROP POLICY IF EXISTS "roles readable by all" ON public.user_roles;
CREATE POLICY "own roles readable"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4) Storage policies for the 'article-images' bucket.
-- Public read; only authenticated creators may write, and only within their own folder (creator_id/...).
CREATE POLICY "article-images public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'article-images');

CREATE POLICY "article-images creator insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'article-images'
    AND public.has_role(auth.uid(), 'creator')
    AND (storage.foldername(name))[1] = (
      SELECT creator_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "article-images creator update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'article-images'
    AND public.has_role(auth.uid(), 'creator')
    AND (storage.foldername(name))[1] = (
      SELECT creator_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "article-images creator delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'article-images'
    AND public.has_role(auth.uid(), 'creator')
    AND (storage.foldername(name))[1] = (
      SELECT creator_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Also drop email from the handle_new_user insert since profiles.email no longer exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_allow public.creator_allowlist%ROWTYPE;
BEGIN
  SELECT * INTO v_allow FROM public.creator_allowlist WHERE email = NEW.email;

  INSERT INTO public.profiles (id, display_name, creator_id, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(v_allow.display_name, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_allow.creator_id,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  IF v_allow.email IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'creator')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
