
-- push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT ON public.push_subscriptions TO anon;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can subscribe" ON public.push_subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "owner can delete own subscription" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner can view own subscription" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- comments: add parent_id, updated_at
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Allow users to update their own comments
DROP POLICY IF EXISTS "users update own comments" ON public.comments;
CREATE POLICY "users update own comments" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- comment_likes
CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT SELECT ON public.comment_likes TO anon;
GRANT ALL ON public.comment_likes TO service_role;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read comment likes" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "users like as self" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users unlike own" ON public.comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS comments_updated_at ON public.comments;
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;

-- Notify webhook on new article (pg_net)
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_new_article() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://illusd.com/api/public/hooks/notify-new-article',
    headers := '{"Content-Type":"application/json","x-notify-secret":"illusd_push_2026_a8f3k29dj4kf8s7d6"}'::jsonb,
    body := jsonb_build_object(
      'id', NEW.id,
      'episode_num', NEW.episode_num,
      'episode_title', NEW.episode_title,
      'topic_title', NEW.topic_title
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS articles_notify ON public.articles;
CREATE TRIGGER articles_notify AFTER INSERT ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_article();
