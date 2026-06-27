
-- Ko-fi 支持者紀錄
CREATE TABLE public.kofi_supporters (
  email text PRIMARY KEY,
  kofi_transaction_id text,
  tier_name text,
  is_subscription boolean DEFAULT false,
  last_donation_at timestamptz NOT NULL DEFAULT now(),
  total_amount numeric DEFAULT 0,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kofi_supporters TO authenticated;
GRANT ALL ON public.kofi_supporters TO service_role;
ALTER TABLE public.kofi_supporters ENABLE ROW LEVEL SECURITY;
-- 不開放任何客戶端讀取；僅由 SECURITY DEFINER 函式或 service_role 存取

-- 透過已認證使用者的 email 判斷會員身分
CREATE OR REPLACE FUNCTION public.is_current_user_kofi_member()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kofi_supporters
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_current_user_kofi_member() TO authenticated, anon;

-- illurl 加上 expires_at；NULL = 永久
ALTER TABLE public.short_links ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.short_files ADD COLUMN IF NOT EXISTS expires_at timestamptz;
CREATE INDEX IF NOT EXISTS short_links_expires_idx ON public.short_links(expires_at);
CREATE INDEX IF NOT EXISTS short_files_expires_idx ON public.short_files(expires_at);

-- 清理過期短連結 / 檔案
CREATE OR REPLACE FUNCTION public.cleanup_expired_short()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.short_links WHERE expires_at IS NOT NULL AND expires_at < now();
  DELETE FROM public.short_files WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$;
