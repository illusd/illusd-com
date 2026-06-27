import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { getRecaptchaSiteKey } from "@/lib/recaptcha.functions";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (t: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: string;
        },
      ) => number;
      reset: (id?: number) => void;
    };
  }
}

const SCRIPT_ID = "google-recaptcha-script";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha) return resolve();
    if (document.getElementById(SCRIPT_ID)) {
      const startedAt = Date.now();
      const check = setInterval(() => {
        if (window.grecaptcha) {
          clearInterval(check);
          resolve();
        } else if (Date.now() - startedAt > 10000) {
          clearInterval(check);
          reject(new Error("recaptcha_timeout"));
        }
      }, 100);
      return;
    }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("recaptcha_script_failed"));
    document.head.appendChild(s);
  });
}

/**
 * Google reCAPTCHA v2 checkbox. Calls `onVerified` with the token (or null on reset/expiry).
 * Site key is fetched from the `captcha_html` Cloud secret via a server function.
 */
export function Recaptcha({
  onVerified,
  onError,
}: {
  onVerified: (token: string | null) => void;
  onError?: (message: string) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchKey = useServerFn(getRecaptchaSiteKey);
  const { t } = useTranslation();

  const reportError = (message: string) => {
    setError(message);
    setLoading(false);
    onVerified(null);
    onError?.(message);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { siteKey } = await fetchKey();
        if (!siteKey) {
          reportError(t("recaptcha.missing_site_key"));
          return;
        }
        await loadScript();
        if (!mounted || !holder.current || !window.grecaptcha) return;
        window.grecaptcha.ready(() => {
          if (!holder.current || widgetId.current !== null) return;
          try {
            widgetId.current = window.grecaptcha!.render(holder.current, {
              sitekey: siteKey,
              callback: (t: string) => {
                setError(null);
                setLoading(false);
                onVerified(t);
              },
              "expired-callback": () => {
                reportError(t("recaptcha.expired"));
              },
              "error-callback": () => {
                reportError(t("recaptcha.error"));
              },
            });
            setLoading(false);
          } catch (e) {
            const code = (e as Error).message;
            reportError(code === "recaptcha_timeout" ? t("recaptcha.timeout") : code || t("recaptcha.init_failed"));
          }
        });
      } catch (e) {
        const code = (e as Error).message;
        reportError(code === "recaptcha_script_failed" ? t("recaptcha.script_failed") : code || t("recaptcha.load_failed"));
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="border hairline p-3">
      <div ref={holder} />
      {loading && <p className="text-xs text-muted-foreground mt-2">{t("recaptcha.loading")}</p>}
      {error && <p role="alert" className="text-xs text-destructive mt-2">{error}</p>}
      <div className="text-[10px] tracking-[0.3em] text-muted-foreground mt-2">reCAPTCHA</div>
    </div>
  );
}
