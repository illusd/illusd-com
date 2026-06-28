ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

WITH latest AS (
  SELECT id
  FROM public.articles
  ORDER BY created_at DESC
  LIMIT 3
)
UPDATE public.articles
SET is_featured = true
WHERE id IN (SELECT id FROM latest)
  AND NOT EXISTS (SELECT 1 FROM public.articles WHERE is_featured = true);