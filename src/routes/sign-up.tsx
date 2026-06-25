import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/sign-up")({
  head: () => {
    const title = "註冊 / 登入 — illusd";
    const description = "註冊或登入 illusd，留言、按讚並追蹤你喜歡的創作者與系列。";
    const url = "https://illusd.com/sign-up";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: SignUpPage,
});

type Mode = "signin" | "signup";

function SignUpPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/" });
    }
  }, [user, loading, navigate]);

  const handleGoogle = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) {
      toast.error("Google 登入失敗，請稍後再試");
      setBusy(false);
      return;
    }
    if (!res.redirected) {
      toast.success("登入成功");
      navigate({ to: "/" });
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("註冊成功！請至信箱確認驗證信。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("登入成功");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error((err as Error).message ?? "發生錯誤");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-start justify-center px-5 pt-16 pb-24">
      <div className="w-full max-w-sm">
        <Link to="/" className="text-xs tracking-widest text-muted-foreground">← 回首頁</Link>
        <h1 className="font-serif text-3xl mt-6">
          {mode === "signup" ? "建立帳號" : "歡迎回來"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {mode === "signup" ? "註冊後即可留言與按讚。" : "登入以繼續閱讀與互動。"}
        </p>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="mt-8 w-full border hairline py-3 text-sm hover:bg-accent transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <GoogleIcon />
          使用 Google 繼續
        </button>

        <div className="flex items-center gap-3 my-6 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> 或 <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <div>
            <label className="block text-xs tracking-wider text-muted-foreground mb-1">EMAIL</label>
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

          {/* Cloudflare Turnstile placeholder — drop in widget once site key is available */}
          <div
            id="cf-turnstile-slot"
            className="text-[11px] text-muted-foreground border hairline border-dashed p-3 mt-2"
          >
            Cloudflare 機器人驗證將於此顯示（待提供 Turnstile site key 後啟用）
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
          {mode === "signup" ? "已有帳號？" : "還沒有帳號？"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="underline underline-offset-2 text-foreground"
          >
            {mode === "signup" ? "登入" : "註冊"}
          </button>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.4 29.4 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 16.3 4.5 9.6 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-4.9c-2 1.5-4.5 2.4-6.9 2.4-5.3 0-9.8-3.1-11.3-7.6l-6.5 5C9.5 39 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.8-3.6 5.1l6 4.9C42.4 34.4 43.5 29.7 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
