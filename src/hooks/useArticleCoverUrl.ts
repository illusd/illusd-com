import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ARTICLE_IMAGE_BUCKET, getArticleImagePath } from "@/lib/articleCover";

export function useArticleCoverUrl(value: string | null | undefined) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let alive = true;
    const raw = value?.trim() ?? "";
    if (!raw) {
      setUrl("");
      return;
    }

    const path = getArticleImagePath(raw);
    if (!path) {
      setUrl(raw);
      return;
    }

    // Keep existing public URLs visible while we request a signed URL. This
    // makes old public cover records and new private-storage records both work.
    setUrl(/^https?:\/\//i.test(raw) ? raw : "");
    supabase.storage
      .from(ARTICLE_IMAGE_BUCKET)
      .createSignedUrl(path, 60 * 60)
      .then(({ data, error }) => {
        if (!alive) return;
        if (!error && data?.signedUrl) setUrl(data.signedUrl);
      });

    return () => {
      alive = false;
    };
  }, [value]);

  return url;
}
