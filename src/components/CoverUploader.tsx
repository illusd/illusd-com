import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("圖片大小不可超過 10MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("article-images").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      toast.error(`上傳失敗：${error.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("article-images").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
    toast.success("封面已上傳");
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
          <img src={value} alt="封面預覽" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-background/80 backdrop-blur p-1.5 border hairline opacity-0 group-hover:opacity-100 transition"
            aria-label="移除封面"
          >
            <X size={14} />
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
          {uploading ? "上傳中…" : "點此上傳封面（jpg / png，最大 10MB）"}
        </button>
      )}
    </div>
  );
}
