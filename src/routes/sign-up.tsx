import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Recaptcha } from "@/components/Recaptcha";
import { verifyRecaptcha } from "@/lib/recaptcha.functions";
import { useServerFn } from "@tanstack/react-start";
import { useDraftPersist } from "@/hooks/useDraftPersist";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

export const Route = createFileRoute("/sign-up")({
  head: () => {
    const title = i18n.t("meta.sign_up_title");
    const description = i18n.t("meta.sign_up_description");
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
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  useDraftPersist("sign-up:email", email, setEmail);
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [capToken, setCapToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verifyToken = useServerFn(verifyRecaptcha);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/" });
    }
  }, [user, loading, navigate]);

  const guardConsent = () => {
    if (!agreed) {
      toast.error(t("auth.agree_required"));
      return false;
    }
    return true;
  };

  const guardCaptcha = async () => {
    if (!capToken) {
      const message = t("auth.captcha_wait");
      setCaptchaError(message);
      toast.error(message);
      return false;
    }
    try {
      const res = await verifyToken({ data: { token: capToken } });
      if (!res.ok) {
        const message = res.error || t("auth.captcha_failed");
        setCaptchaError(message);
        toast.error(message);
        return false;
      }
      setCaptchaError(null);
      return true;
    } catch (error) {
      const message = (error as Error).message || t("auth.captcha_unavailable");
      setCaptchaError(message);
      toast.error(message);
      return false;
    }
  };

  const handleGoogle = async () => {
    if (!guardConsent()) return;
    if (!(await guardCaptcha())) return;
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) {
      toast.error(t("auth.google_failed"));
      setBusy(false);
      return;
    }
    if (!res.redirected) {
      toast.success(t("auth.signin_success"));
      navigate({ to: "/" });
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (!guardConsent()) return;
    if (!(await guardCaptcha())) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success(t("auth.signup_success"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.signin_success"));
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error((err as Error).message ?? t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-start justify-center px-5 pt-16 pb-24">
      <div className="w-full max-w-sm">
        <Link to="/" className="text-xs tracking-widest text-muted-foreground">{t("common.back_home")}</Link>
        <h1 className="font-serif text-3xl mt-6">
          {mode === "signup" ? t("auth.create_account") : t("auth.welcome_back")}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {mode === "signup" ? t("auth.create_desc") : t("auth.signin_desc")}
        </p>

        <button
          onClick={handleGoogle}
          disabled={busy || !agreed}
          className="mt-8 w-full border hairline py-3 text-sm hover:bg-accent transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          {t("auth.google")}
        </button>

        <div className="flex items-center gap-3 my-6 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> {t("auth.or")} <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <div>
            <label className="block text-xs tracking-wider text-muted-foreground mb-1">{t("auth.email")}</label>
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
            <label className="block text-xs tracking-wider text-muted-foreground mb-1">{t("auth.password")}</label>
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

          <div className="pt-2">
            <Recaptcha
              onVerified={(token) => {
                setCapToken(token);
                if (token) setCaptchaError(null);
              }}
              onError={setCaptchaError}
            />
            {captchaError && <p role="alert" className="text-xs text-destructive mt-2">{captchaError}</p>}
          </div>

          <label className="flex items-start gap-2 text-xs leading-relaxed pt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-foreground"
            />
            <span>
              {t("auth.agree_prefix")}{" "}
              <Link to="/terms-of-service" className="underline">{t("footer.terms")}</Link>{" "}
              {t("auth.agree_and")}{" "}
              <Link to="/privacy" className="underline">{t("footer.privacy")}</Link>{t("auth.agree_suffix")}
            </span>
          </label>

          <button
            type="submit"
            disabled={busy || !agreed}
            className="w-full bg-foreground text-background py-3 text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === "signup" ? t("auth.sign_up") : t("auth.sign_in")}
          </button>
        </form>

        <p className="mt-6 text-xs text-center text-muted-foreground">
          {mode === "signup" ? t("auth.have_account") : t("auth.no_account")}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="underline underline-offset-2 text-foreground"
          >
            {mode === "signup" ? t("auth.sign_in") : t("auth.sign_up")}
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
