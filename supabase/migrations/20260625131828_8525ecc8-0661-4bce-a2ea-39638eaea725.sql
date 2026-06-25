
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('creator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated, anon;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles readable by all" ON public.user_roles FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ CREATOR ALLOWLIST ============
CREATE TABLE public.creator_allowlist (
  email text PRIMARY KEY,
  creator_id text NOT NULL UNIQUE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.creator_allowlist TO authenticated, anon;
GRANT ALL ON public.creator_allowlist TO service_role;
ALTER TABLE public.creator_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allowlist readable" ON public.creator_allowlist FOR SELECT USING (true);

INSERT INTO public.creator_allowlist (email, creator_id, display_name) VALUES
  ('lan.2015.se@gmail.com', 'illusd_creators', 'illusd'),
  ('aicoding2025tw@gmail.com', 'banban_creators', 'banban');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  creator_id text UNIQUE,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============ NEW USER TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_allow public.creator_allowlist%ROWTYPE;
BEGIN
  SELECT * INTO v_allow FROM public.creator_allowlist WHERE email = NEW.email;

  INSERT INTO public.profiles (id, email, display_name, creator_id, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
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
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ARTICLES ============
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_title text NOT NULL,
  episode_num int,
  episode_title text,
  topic_title text NOT NULL,
  cover_url text,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles public read" ON public.articles FOR SELECT USING (true);
CREATE POLICY "creators insert articles" ON public.articles FOR INSERT
  WITH CHECK (auth.uid() = author_id AND public.has_role(auth.uid(), 'creator'));
CREATE POLICY "authors update own" ON public.articles FOR UPDATE
  USING (auth.uid() = author_id);
CREATE POLICY "authors delete own" ON public.articles FOR DELETE
  USING (auth.uid() = author_id);

CREATE INDEX articles_topic_idx ON public.articles(topic_title);
CREATE INDEX articles_created_idx ON public.articles(created_at DESC);

-- ============ COMMENTS ============
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments public read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "auth insert comments" ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own comments delete" ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX comments_article_idx ON public.comments(article_id, created_at DESC);

-- ============ LIKES ============
CREATE TABLE public.likes (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, user_id)
);
GRANT SELECT ON public.likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes public read" ON public.likes FOR SELECT USING (true);
CREATE POLICY "auth like" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth unlike" ON public.likes FOR DELETE USING (auth.uid() = user_id);
