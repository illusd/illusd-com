import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/oauth2/$")({
  ssr: false,
  component: OAuth2LoginPage,
});

function parseOAuthPath(): { app: string | null; callback: string | null } {
  if (typeof window === "undefined") return { app: null, callback: null };
  // Use raw href to keep the `://` in the callback intact.
  const href = window.location.href;
  const marker = "/oauth2/";
  const idx = href.indexOf(marker);
  if (idx === -1) return { app: null, callback: null };
  const rest = href.slice(idx + marker.length);
  // Split on the first `/callbackurl=` to preserve `://` and query strings inside the URL.
  const appMatch = rest.match(/^apps=([^/]*)/);
  const app = appMatch ? decodeURIComponent(appMatch[1]) : null;
  const cbIdx = rest.indexOf("/callbackurl=");
  const callback = cbIdx >= 0 ? decodeURIComponent(rest.slice(cbIdx + "/callbackurl=".length)) : null;
  return { app: app || null, callback: callback || null };
}

function buildRedirect(callback: string, email: string, password: string) {
  try {
    const u = new URL(callback);
    u.searchParams.set("email", email);
    u.searchParams.set("password", password);
    return u.toString();
  } catch {
    const sep = callback.includes("?") ? "&" : "?";
    return `${callback}${sep}email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  }
}

function OAuth2LoginPage() {
  const navigate = useNavigate();
  const [{ app, callback }, setParsed] = useState<{ app: string | null; callback: string | null }>({
    app: null,
    callback: null,
  });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<null | { email: string; password: string }>(null);

  useEffect(() => {
    setParsed(parseOAuthPath());
  }, []);

  const appName = app || "";
  const valid = Boolean(app && callback);

  const finishAndRedirect = (creds: { email: string; password: string }) => {
    setSuccess(creds);
    if (!callback) return;
    const target = buildRedirect(callback, creds.email, creds.password);
    setTimeout(() => {
      window.location.href = target;
    }, 1600);
  };

  const handleGoogle = async () => {
    if (!valid) return;
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.href,
    });
    if (res.error) {
      toast.error("Google 登入失敗");
      setBusy(false);
      return;
    }
    if (!res.redirected) {
      const { data } = await supabase.auth.getUser();
      const em = data.user?.email ?? "";
      finishAndRedirect({ email: em, password: "(google-oauth)" });
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !email || !password) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.href },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      finishAndRedirect({ email, password });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const brand = useMemo(() => appName || "應用程式", [appName]);

  if (!valid) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-5">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-2xl">無效的 OAuth2 連結</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            網址格式必須為 <code className="text-xs">/oauth2/apps=應用名稱/callbackurl=回呼網址</code>，
            且必須提供應用名稱。
          </p>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-5">
        <div className="max-w-sm text-center">
          <div className="mx-auto w-12 h-12 rounded-full border hairline flex items-center justify-center text-xl">✓</div>
          <h1 className="mt-6 font-serif text-2xl">登入成功</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            即將返回 <span className="text-foreground">{brand}</span>…
          </p>
          <p className="mt-4 text-xs text-muted-foreground break-all">
            回呼：{callback}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-start justify-center px-5 pt-16 pb-24">
      <div className="w-full max-w-sm">
        <button
          onClick={() => navigate({ to: "/" })}
          className="text-xs tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← 返回
        </button>
        <h1 className="font-serif text-3xl mt-6">
          {mode === "signup" ? `註冊 ${brand}` : `登入 ${brand}`}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {brand} 透過 OAuth2 委由本服務進行身份驗證。
        </p>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="mt-8 w-full border hairline py-3 text-sm hover:bg-accent transition flex items-center justify-center gap-2 disabled:opacity-50"
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
            {mode === "signup" ? "註冊並授權" : "登入並授權"}
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

        <p className="mt-8 text-[10px] text-muted-foreground break-all">
          授權後將以查詢參數形式將 email 與 password 回傳至：<br />
          {callback}
        </p>
      </div>
    </main>
  );
}
