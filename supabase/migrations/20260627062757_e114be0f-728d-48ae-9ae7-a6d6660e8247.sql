DROP POLICY IF EXISTS "article-images authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "article-images public read" ON storage.objects;

CREATE POLICY "article-images public signed read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'article-images');