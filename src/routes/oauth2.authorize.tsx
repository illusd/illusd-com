import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { approveAuthorization, denyAuthorization, getAuthorizationRequest } from "@/lib/oauth2.functions";

export const Route = createFileRoute("/oauth2/authorize")({
  ssr: false,
  component: AuthorizePage,
  head: () => ({
    meta: [
      { title: "授權應用程式 — illusd.com" },
      { name: "description", content: "使用 illusd 帳號安全地授權第三方應用程式存取你的基本資料。" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "授權應用程式 — illusd.com" },
      { property: "og:description", content: "使用 illusd 帳號安全地授權第三方應用程式。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type ClientInfo = { name: string; homepage_url: string; verified: boolean };

const SCOPE_LABELS: Record<string, string> = {
  openid: "確認你的 illusd 帳號身分",
  email: "讀取你的電子郵件地址",
  profile: "讀取你的顯示名稱與頭像",
};

function AuthorizePage() {
  const [params, setParams] = useState<URLSearchParams | null>(null);
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "auth"; client: ClientInfo; scope: string }
    | { phase: "consent"; client: ClientInfo; scope: string; email: string }
  >({ phase: "loading" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setParams(sp);

    const run = async () => {
      const clientId = sp.get("client_id") ?? "";
      const redirectUri = sp.get("redirect_uri") ?? "";
      if (!clientId || !redirectUri) {
        setState({
          phase: "error",
          message: "缺少必要參數：client_id 與 redirect_uri。請確認應用程式的授權連結。",
        });
        return;
      }
      const res = await getAuthorizationRequest({
        data: {
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: sp.get("response_type") ?? "code",
          scope: sp.get("scope") ?? undefined,
        },
      });
      if (!("ok" in res)) {
        setState({ phase: "error", message: res.message });
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setState({ phase: "consent", client: res.client, scope: res.scope, email: data.user.email ?? "" });
      } else {
        setState({ phase: "auth", client: res.client, scope: res.scope });
      }
    };
    void run().catch((e) => setState({ phase: "error", message: (e as Error).message }));
  }, []);

  const refreshAfterAuth = async () => {
    if (state.phase !== "auth") return;
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setState({ phase: "consent", client: state.client, scope: state.scope, email: data.user.email ?? "" });
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.href });
    if (res.error) {
      toast.error("Google 登入失敗");
      setBusy(false);
      return;
    }
    if (res.redirected) return;
    await refreshAfterAuth();
    setBusy(false);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.href },
        });
        if (error) throw error;
        toast.success("已寄出驗證信，請完成驗證後回到此頁");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await refreshAfterAuth();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!params) return;
    setBusy(true);
    try {
      const res = await approveAuthorization({
        data: {
          client_id: params.get("client_id") ?? "",
          redirect_uri: params.get("redirect_uri") ?? "",
          scope: params.get("scope") ?? undefined,
          state: params.get("state") ?? undefined,
          code_challenge: params.get("code_challenge") ?? undefined,
          code_challenge_method:
            (params.get("code_challenge_method") as "S256" | "plain" | null) ?? undefined,
        },
      });
      window.location.href = res.redirect_to;
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };

  const handleDeny = async () => {
    if (!params) return;
    setBusy(true);
    try {
      const res = await denyAuthorization({
        data: {
          client_id: params.get("client_id") ?? "",
          redirect_uri: params.get("redirect_uri") ?? "",
          state: params.get("state") ?? undefined,
        },
      });
      window.location.href = res.redirect_to;
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };

  if (state.phase === "loading") {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-5">
        <p className="text-sm text-muted-foreground">載入中…</p>
      </main>
    );
  }

  if (state.phase === "error") {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-5">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-2xl">無法完成授權</h1>
          <p className="mt-3 text-sm text-muted-foreground">{state.message}</p>
          <p className="mt-6 text-xs text-muted-foreground">
            開發者可前往 <a className="underline underline-offset-2" href="/oauth2/apps">/oauth2/apps</a> 註冊應用程式與回呼網址。
          </p>
        </div>
      </main>
    );
  }

  const scopes = state.scope.split(/\s+/).filter(Boolean);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-start justify-center px-5 pt-16 pb-24">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl">{state.client.name}</h1>
          {state.client.verified && (
            <span className="text-[10px] tracking-widest border hairline px-2 py-0.5">Verified</span>
          )}
        </div>
        <a
          href={state.client.homepage_url}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-1 block text-xs text-muted-foreground underline underline-offset-2 break-all"
        >
          {state.client.homepage_url}
        </a>

        {state.phase === "auth" ? (
          <>
            <p className="mt-6 text-sm text-muted-foreground">
              請先以 illusd 帳號登入，即可授權「{state.client.name}」。
            </p>
            <button
              onClick={handleGoogle}
              disabled={busy}
              className="mt-8 w-full border hairline py-3 text-sm hover:bg-accent transition disabled:opacity-50"
            >
              使用 Google 繼續
            </button>
            <div className="flex items-center gap-3 my-6 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" /> 或 <div className="flex-1 h-px bg-border" />
            </div>
            <form onSubmit={handleEmail} className="space-y-3">
              <div>
                <label className="block text-xs tracking-wider text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b hairline py-2 text-sm focus:outline-none focus:border-foreground"
                />
              </div>
              <div>
                <label className="block text-xs tracking-wider text-muted-foreground mb-1">密碼</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b hairline py-2 text-sm focus:outline-none focus:border-foreground"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-foreground text-background py-3 text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50"
              >
                {mode === "signup" ? "註冊" : "登入"}
              </button>
            </form>
            <p className="mt-6 text-xs text-center text-muted-foreground">
              {mode === "signup" ? "已經有帳號？" : "還沒有帳號？"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="underline underline-offset-2 text-foreground"
              >
                {mode === "signup" ? "登入" : "註冊"}
              </button>
            </p>
          </>
        ) : (
          <>
            <p className="mt-6 text-sm">
              「{state.client.name}」想以你的 illusd 帳號身分存取下列資料：
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {scopes.map((s) => (
                <li key={s} className="flex gap-2">
                  <span>·</span>
                  <span>{SCOPE_LABELS[s] ?? `其他權限：${s}`}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              目前登入帳號：{state.email || "（未提供 Email）"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              授權不會提供你的密碼，也不會繞過 illusd 的權限規則。你隨時可以在 /oauth2/apps 撤銷授權。
            </p>
            <div className="mt-8 space-y-3">
              <button
                onClick={handleApprove}
                disabled={busy}
                className="w-full bg-foreground text-background py-3 text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50"
              >
                同意並繼續
              </button>
              <button
                onClick={handleDeny}
                disabled={busy}
                className="w-full border hairline py-3 text-sm hover:bg-accent transition disabled:opacity-50"
              >
                取消授權
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
