-- public read on illurl-files bucket (we keep bucket private at provider level
-- but allow anon SELECT to mirror Supabase getPublicUrl behavior for delivery)
CREATE POLICY "illurl-files public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'illurl-files');

-- writes go through service-role server functions only; no INSERT/UPDATE/DELETE policy for anon
