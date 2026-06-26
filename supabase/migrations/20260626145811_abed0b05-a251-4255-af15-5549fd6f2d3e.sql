-- short URL table
CREATE TABLE public.short_links (
  code TEXT PRIMARY KEY,
  target_url TEXT NOT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.short_links TO anon, authenticated;
GRANT ALL ON public.short_links TO service_role;
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "short_links public read" ON public.short_links
  FOR SELECT USING (true);
-- inserts go through a service-role server function (cap captcha verified)

-- short file table
CREATE TABLE public.short_files (
  code TEXT PRIMARY KEY,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size BIGINT NOT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.short_files TO anon, authenticated;
GRANT ALL ON public.short_files TO service_role;
ALTER TABLE public.short_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "short_files public read" ON public.short_files
  FOR SELECT USING (true);

CREATE INDEX short_files_created_by_idx ON public.short_files(created_by);
CREATE INDEX short_links_created_by_idx ON public.short_links(created_by);
