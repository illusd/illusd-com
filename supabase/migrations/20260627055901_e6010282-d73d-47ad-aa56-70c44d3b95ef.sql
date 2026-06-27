CREATE OR REPLACE FUNCTION public.sync_current_user_creator_profile()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_name text;
  v_avatar text;
  v_allow public.creator_allowlist%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  v_email := auth.jwt() ->> 'email';
  v_name := COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    auth.jwt() -> 'user_metadata' ->> 'name',
    split_part(COALESCE(v_email, ''), '@', 1),
    'Reader'
  );
  v_avatar := auth.jwt() -> 'user_metadata' ->> 'avatar_url';

  SELECT * INTO v_allow
  FROM public.creator_allowlist
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  INSERT INTO public.profiles (id, display_name, creator_id, avatar_url)
  VALUES (
    auth.uid(),
    COALESCE(v_allow.display_name, v_name),
    v_allow.creator_id,
    v_avatar
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    creator_id = COALESCE(EXCLUDED.creator_id, public.profiles.creator_id),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  IF v_allow.email IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'creator')
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'user')
  ON CONFLICT DO NOTHING;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_current_user_creator_profile() TO authenticated;

DROP POLICY IF EXISTS "creators insert articles" ON public.articles;
DROP POLICY IF EXISTS "creators can update articles" ON public.articles;
DROP POLICY IF EXISTS "creators can delete articles" ON public.articles;

CREATE POLICY "creators insert articles"
ON public.articles
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = author_id) AND public.has_role(auth.uid(), 'creator'));

CREATE POLICY "creators can update articles"
ON public.articles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'creator'))
WITH CHECK (public.has_role(auth.uid(), 'creator'));

CREATE POLICY "creators can delete articles"
ON public.articles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'creator'));

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;