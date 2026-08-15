import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Trash2, RefreshCw } from "lucide-react";
import {
  createOAuthClient,
  deleteOAuthClient,
  listOAuthClients,
  rotateOAuthClientSecret,
  updateOAuthClient,
} from "@/lib/oauth2.functions";

export const Route = createFileRoute("/_authenticated/oauth2/apps")({
  head: () => ({
    meta: [
      { title: "OAuth2 應用程式 — illusd.com" },
      { name: "description", content: "註冊並管理使用 illusd 帳號登入的 OAuth 2.0 應用程式。" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "OAuth2 應用程式 — illusd.com" },
      { property: "og:description", content: "註冊並管理 illusd OAuth 2.0 應用程式。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OAuthAppsPage,
});

interface ClientRow {
  id: string;
  client_id: string;
  name: string;
  homepage_url: string;
  redirect_uris: string[];
  verified: boolean;
  created_at: string;
}

const copy = async (v: string) => {
  await navigator.clipboard.writeText(v);
  toast.success("已複製");
};

function OAuthAppsPage() {
  const list = useServerFn(listOAuthClients);
  const create = useServerFn(createOAuthClient);
  const update = useServerFn(updateOAuthClient);
  const rotate = useServerFn(rotateOAuthClientSecret);
  const remove = useServerFn(deleteOAuthClient);

  const [rows, setRows] = useState<ClientRow[] | null>(null);
  const [name, setName] = useState("");
  const [homepage, setHomepage] = useState("");
  const [uris, setUris] = useState("");
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<{ client_id: string; client_secret: string } | null>(null);

  const reload = useCallback(async () => {
    try {
      setRows(await list({}));
    } catch (e) {
      toast.error((e as Error).message);
      setRows([]);
    }
  }, [list]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const redirect_uris = uris
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await create({ data: { name, homepage_url: homepage, redirect_uris } });
      setSecret({ client_id: res.client_id, client_secret: res.client_secret });
      setName("");
      setHomepage("");
      setUris("");
      await reload();
      toast.success(res.verified ? "已註冊（官方 Verified）" : "已註冊應用程式");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onSaveUris = async (row: ClientRow, value: string) => {
    try {
      const redirect_uris = value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      await update({ data: { id: row.id, name: row.name, homepage_url: row.homepage_url, redirect_uris } });
      await reload();
      toast.success("已更新回呼網址");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="font-serif text-3xl">OAuth2 應用程式</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        註冊你的應用程式即可讓使用者以 illusd 帳號登入。首頁網址為
        <code className="text-xs"> https://org.illusd.com </code>
        者會自動標記為 <span className="border hairline px-1 text-[10px] tracking-widest">Verified</span> 官方應用。
      </p>

      <form onSubmit={onCreate} className="mt-10 space-y-5 border hairline p-5">
        <div>
          <label className="block text-xs tracking-wider text-muted-foreground mb-1">應用程式名稱</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border-b hairline py-2 text-sm focus:outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="block text-xs tracking-wider text-muted-foreground mb-1">首頁網址</label>
          <input
            required
            placeholder="https://example.com"
            value={homepage}
            onChange={(e) => setHomepage(e.target.value)}
            className="w-full bg-transparent border-b hairline py-2 text-sm focus:outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="block text-xs tracking-wider text-muted-foreground mb-1">
            回呼網址（每行一個，https 或 http://localhost）
          </label>
          <textarea
            required
            rows={3}
            placeholder={"https://example.com/oauth/callback\nhttp://localhost:3000/callback"}
            value={uris}
            onChange={(e) => setUris(e.target.value)}
            className="w-full bg-transparent border hairline p-3 text-sm focus:outline-none focus:border-foreground"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-foreground text-background py-3 text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50"
        >
          註冊應用程式
        </button>
      </form>

      {secret && (
        <div className="mt-6 border hairline p-5 text-sm">
          <p className="text-xs tracking-widest text-muted-foreground">CLIENT SECRET（僅顯示一次）</p>
          <p className="mt-3 break-all text-xs">client_id：{secret.client_id}</p>
          <p className="mt-1 break-all text-xs">client_secret：{secret.client_secret}</p>
          <button
            onClick={() => copy(`${secret.client_id}\n${secret.client_secret}`)}
            className="mt-4 inline-flex items-center gap-2 border hairline px-3 py-1.5 text-xs hover:bg-accent transition"
          >
            <Copy size={12} strokeWidth={1.5} /> 複製
          </button>
        </div>
      )}

      <h2 className="mt-14 font-serif text-2xl">我的應用程式</h2>
      {rows === null ? (
        <p className="mt-6 text-sm text-muted-foreground">載入中…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">尚未註冊任何應用程式。</p>
      ) : (
        <ul className="mt-6 space-y-8">
          {rows.map((row) => (
            <li key={row.id} className="border-b hairline pb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg">{row.name}</h3>
                    {row.verified && (
                      <span className="border hairline px-2 py-0.5 text-[10px] tracking-widest">Verified</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground break-all">{row.homepage_url}</p>
                  <p className="mt-2 text-xs break-all">client_id：{row.client_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-label="複製 client_id"
                    onClick={() => copy(row.client_id)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    <Copy size={16} strokeWidth={1.25} />
                  </button>
                  <button
                    aria-label="輪替 client_secret"
                    onClick={async () => {
                      if (!confirm("輪替後舊的 client_secret 會立即失效，確定嗎？")) return;
                      try {
                        const res = await rotate({ data: { id: row.id } });
                        setSecret({ client_id: row.client_id, client_secret: res.client_secret });
                        toast.success("已產生新的 client_secret");
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw size={16} strokeWidth={1.25} />
                  </button>
                  <button
                    aria-label="刪除應用程式"
                    onClick={async () => {
                      if (!confirm("刪除後所有授權都會失效，確定嗎？")) return;
                      try {
                        await remove({ data: { id: row.id } });
                        await reload();
                        toast.success("已刪除");
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 size={16} strokeWidth={1.25} />
                  </button>
                </div>
              </div>
              <label className="mt-4 block text-xs tracking-wider text-muted-foreground mb-1">回呼網址</label>
              <textarea
                rows={2}
                defaultValue={row.redirect_uris.join("\n")}
                onBlur={(e) => void onSaveUris(row, e.target.value)}
                className="w-full bg-transparent border hairline p-3 text-xs focus:outline-none focus:border-foreground"
              />
            </li>
          ))}
        </ul>
      )}

      <section className="mt-16 text-sm leading-relaxed">
        <h2 className="font-serif text-2xl">串接說明</h2>
        <ol className="mt-4 space-y-3 text-muted-foreground">
          <li>
            1. 將使用者導向：
            <code className="block mt-1 text-xs break-all text-foreground">
              https://illusd.com/oauth2/authorize?client_id=...&redirect_uri=...&response_type=code&scope=openid%20email%20profile&state=xyz
            </code>
            支援 PKCE：加上 <code className="text-xs">code_challenge</code> 與{" "}
            <code className="text-xs">code_challenge_method=S256</code>。
          </li>
          <li>
            2. 使用者同意後會帶著 <code className="text-xs">code</code> 與 <code className="text-xs">state</code>{" "}
            回到你的回呼網址。
          </li>
          <li>
            3. 以 code 交換 token：
            <code className="block mt-1 text-xs break-all text-foreground">
              POST https://illusd.com/api/public/oauth2/token
              (grant_type=authorization_code&code=...&redirect_uri=...&client_id=...&client_secret=...)
            </code>
            也支援 <code className="text-xs">grant_type=refresh_token</code> 與 HTTP Basic 驗證。
          </li>
          <li>
            4. 讀取使用者資料：
            <code className="block mt-1 text-xs break-all text-foreground">
              GET https://illusd.com/api/public/oauth2/userinfo（Authorization: Bearer &lt;access_token&gt;）
            </code>
          </li>
          <li>
            5. Discovery 文件：
            <code className="block mt-1 text-xs break-all text-foreground">
              GET https://illusd.com/api/public/oauth2/discovery
            </code>
          </li>
        </ol>
        <p className="mt-6 text-xs text-muted-foreground">
          我們永遠不會把使用者密碼交給應用程式；只會回傳 access token 與已授權的基本資料。
        </p>
      </section>
    </main>
  );
}
