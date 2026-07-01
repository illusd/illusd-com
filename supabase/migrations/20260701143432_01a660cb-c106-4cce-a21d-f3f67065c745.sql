
CREATE TABLE public.rednote_films (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  film_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  target_url TEXT,
  video_path TEXT,
  video_mime TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rednote_films TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rednote_films TO authenticated;
GRANT ALL ON public.rednote_films TO service_role;

ALTER TABLE public.rednote_films ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read films" ON public.rednote_films FOR SELECT USING (true);
CREATE POLICY "Creators manage films" ON public.rednote_films FOR ALL TO authenticated
  USING (public.is_current_user_creator()) WITH CHECK (public.is_current_user_creator());

CREATE TRIGGER rednote_films_touch BEFORE UPDATE ON public.rednote_films
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.rednote_open_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES public.rednote_films(film_id) ON DELETE CASCADE,
  open_id TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (film_id, open_id)
);

GRANT SELECT, UPDATE ON public.rednote_open_codes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rednote_open_codes TO authenticated;
GRANT ALL ON public.rednote_open_codes TO service_role;

ALTER TABLE public.rednote_open_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read open codes" ON public.rednote_open_codes FOR SELECT USING (true);
CREATE POLICY "Public can mark used" ON public.rednote_open_codes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Creators create codes" ON public.rednote_open_codes FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_creator());
CREATE POLICY "Creators delete codes" ON public.rednote_open_codes FOR DELETE TO authenticated
  USING (public.is_current_user_creator());

CREATE POLICY "Public read rednote videos" ON storage.objects FOR SELECT
  USING (bucket_id = 'rednote-videos');
CREATE POLICY "Creators upload rednote videos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rednote-videos' AND public.is_current_user_creator());
CREATE POLICY "Creators delete rednote videos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'rednote-videos' AND public.is_current_user_creator());
