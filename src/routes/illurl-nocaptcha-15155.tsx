import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { useServerFn } from "@tanstack/react-start";

const DIGITS = "0123456789";
const ALPHANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function randomCode(charset: string, len = 5): string {
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += charset[arr[i] % charset.length];
  return out;
}

function safeUrl(input: string): string {
  const u = new URL(input);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("僅支援 http/https");
  if (/illusd\.com$/i.test(u.hostname)) throw new Error("不可短化 illusd.com");
  return u.toString();
}

const nocaptchaShorten = createServerFn({ method: "POST" })
  .inputValidator((d: { targetUrl: string; email?: string }) => d)
  .handler(async ({ data }) => {
    const target = safeUrl(data.targetUrl);
    const email = (data.email ?? "").trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let isPermanent = false;
    if (email) {
      const { data: isCreator } = await supabaseAdmin.rpc("is_creator_by_email" as any, { _email: email });
      if (isCreator) isPermanent = true;
      else {
        const { data: kofi } = await supabaseAdmin
          .from("kofi_supporters" as any)
          .select("email")
          .eq("email", email)
          .maybeSingle();
        if (kofi) isPermanent = true;
      }
    }
    const expiresAt = isPermanent ? null : new Date(Date.now() + ONE_YEAR_MS).toISOString();

    let code = "";
    for (let i = 0; i < 32; i++) {
      const c = i < 8 ? randomCode(DIGITS) : randomCode(ALPHANUM);
      const { data: row } = await supabaseAdmin.from("short_links").select("code").eq("code", c).maybeSingle();
      if (!row) { code = c; break; }
    }
    if (!code) throw new Error("無法產生短碼");

    const { error } = await supabaseAdmin
      .from("short_links")
      .insert({ code, target_url: target, created_by: null, expires_at: expiresAt } as any);
    if (error) throw new Error(error.message);
    return { url: `https://illusd.com/${code}`, permanent: isPermanent };
  });

export const Route = createFileRoute("/illurl-nocaptcha-15155")({
  head: () => ({ meta: [{ title: "illurl (no captcha)" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const run = useServerFn(nocaptchaShorten);
  const [url, setUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState("");
  const [fileResult, setFileResult] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(""); setResult("");
    try {
      const r = await run({ data: { targetUrl: url, email: email || undefined } });
      setResult(`${r.url} ${r.permanent ? "(永久)" : "(1年)"}`);
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFileBusy(true); setErr(""); setFileResult("");
    try {
      const r = await run({ data: { targetUrl: fileUrl, email: email || undefined } });
      setFileResult(`${r.url} ${r.permanent ? "(永久)" : "(1年)"}`);
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setFileBusy(false);
    }
  };

  return (
    <main>
      <h1>illurl (no captcha)</h1>

      <h2>縮網址</h2>
      <form onSubmit={submit}>
        <p>
          <label>網址：<input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" /></label>
        </p>
        <p><button type="submit" disabled={busy}>{busy ? "產生中..." : "生成短網址"}</button></p>
      </form>
      {result && <p>結果：{result}</p>}

      <h2>縮檔案（貼檔案網址，不接受上傳）</h2>
      <form onSubmit={submitFile}>
        <p>
          <label>檔案網址：<input type="url" required value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://cdn.example.com/file.pdf" /></label>
        </p>
        <p><button type="submit" disabled={fileBusy}>{fileBusy ? "產生中..." : "生成檔案短網址"}</button></p>
      </form>
      {fileResult && <p>結果：{fileResult}</p>}

      <h2>Email（會員/創作者信箱，選填，可生成永久連結）</h2>
      <p>
        <label>Email：<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
      </p>

      {err && <p>錯誤：{err}</p>}
    </main>
  );
}
