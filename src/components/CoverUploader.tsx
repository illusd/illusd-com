import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ARTICLE_IMAGE_BUCKET, toArticleImageRef } from "@/lib/articleCover";
import { useArticleCoverUrl } from "@/hooks/useArticleCoverUrl";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB cover image

export function CoverUploader({
  value,
  onChange,
  userId,
}: {
  value: string;
  onChange: (url: string) => void;
  userId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { t } = useTranslation();
  const previewUrl = useArticleCoverUrl(value);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("upload.select_image"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("upload.too_large"));
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(ARTICLE_IMAGE_BUCKET).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      toast.error(t("upload.failed", { message: error.message }));
      setUploading(false);
      return;
    }
    onChange(toArticleImageRef(path));
    setUploading(false);
    toast.success(t("upload.uploaded"));
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="mt-1 relative aspect-[3/2] border hairline overflow-hidden bg-muted group">
          {previewUrl ? (
            <img src={previewUrl} alt={t("upload.preview_alt")} className="w-full h-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
              {t("common.loading")}
            </div>
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-background/80 backdrop-blur p-1.5 border hairline opacity-0 group-hover:opacity-100 transition"
            aria-label={t("upload.remove_cover")}
          >
            <X size={14} />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute left-2 bottom-2 bg-background/85 backdrop-blur border hairline px-3 py-1.5 text-xs hover:bg-accent transition disabled:opacity-50"
          >
            {uploading ? t("upload.uploading") : t("upload.replace_cover")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full aspect-[3/2] border hairline border-dashed flex flex-col items-center justify-center gap-2 hover:bg-accent transition text-sm text-muted-foreground disabled:opacity-50"
        >
          <Upload size={20} strokeWidth={1.25} />
          {uploading ? t("upload.uploading") : t("upload.cta")}
        </button>
      )}
    </div>
  );
}
