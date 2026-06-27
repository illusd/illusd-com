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

    setUrl("");
    supabase.storage
      .from(ARTICLE_IMAGE_BUCKET)
      .createSignedUrl(path, 60 * 60)
      .then(({ data, error }) => {
        if (!alive) return;
        setUrl(error ? "" : data?.signedUrl ?? "");
      });

    return () => {
      alive = false;
    };
  }, [value]);

  return url;
}
