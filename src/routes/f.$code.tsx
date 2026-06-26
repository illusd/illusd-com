import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Download } from "lucide-react";

interface ShortFile {
  code: string;
  filename: string;
  mime: string;
  size: number;
  public_url: string;
  created_at: string;
}

const lookupShortFile = createServerFn({ method: "GET" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }): Promise<ShortFile | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("short_files")
      .select("code, filename, mime, size, storage_path, created_at")
      .eq("code", data.code)
      .maybeSingle();
    if (!row) return null;
    const { data: signed } = await supabaseAdmin.storage
      .from("illurl-files")
      .createSignedUrl(row.storage_path, 60 * 60 * 24);
    return {
      code: row.code,
      filename: row.filename,
      mime: row.mime,
      size: row.size,
      public_url: signed?.signedUrl ?? "",
      created_at: row.created_at,
    };
  });

export const Route = createFileRoute("/f/$code")({
  loader: async ({ params }) => {
    if (!/^[0-9A-Z]{5}$/.test(params.code)) throw notFound();
    const file = await lookupShortFile({ data: { code: params.code } });
    if (!file) throw notFound();
    return { file };
  },
  head: ({ params, loaderData }) => {
    const f = loaderData?.file;
    const title = f ? `${f.filename} — illurl` : "檔案 — illurl";
    const url = `https://illusd.com/f/${params.code}`;
    return {
      meta: [
        { title },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: FileViewPage,
});

function FileViewPage() {
  const { file } = Route.useLoaderData();
  const isImage = file.mime.startsWith("image/");
  const isVideo = file.mime.startsWith("video/");
  const isAudio = file.mime.startsWith("audio/");
  const isText = file.mime.startsWith("text/") || file.mime === "application/json";

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link to="/" className="text-xs tracking-widest text-muted-foreground">← 回首頁</Link>
      <h1 className="font-serif text-2xl mt-6 break-all">{file.filename}</h1>
      <div className="text-xs text-muted-foreground mt-2">
        {file.mime} · {(file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
        {new Date(file.created_at).toLocaleString("zh-TW")}
      </div>

      <div className="mt-8 border hairline overflow-hidden bg-muted/30 flex items-center justify-center">
        {isImage && <img src={file.public_url} alt={file.filename} className="max-w-full" />}
        {isVideo && <video src={file.public_url} controls className="max-w-full" />}
        {isAudio && <audio src={file.public_url} controls className="w-full p-6" />}
        {!isImage && !isVideo && !isAudio && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {isText ? "文字／二進位檔案" : "二進位檔案"}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={file.public_url}
          download={file.filename}
          className="flex items-center gap-2 bg-foreground text-background px-5 py-2.5 text-sm hover:opacity-90 transition"
        >
          <Download size={14} /> 下載
        </a>
        <a
          href={file.public_url}
          target="_blank"
          rel="noopener noreferrer"
          className="border hairline px-5 py-2.5 text-sm hover:bg-accent transition"
        >
          原始連結
        </a>
      </div>
    </main>
  );
}
