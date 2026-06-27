import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getRecaptchaSiteKey } from "@/lib/recaptcha.functions";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        el: HTMLElement,
        opts: { sitekey: string; callback: (t: string) => void; "expired-callback"?: () => void; theme?: string },
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
      const check = setInterval(() => {
        if (window.grecaptcha) {
          clearInterval(check);
          resolve();
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
    s.onerror = () => reject(new Error("recaptcha load failed"));
    document.head.appendChild(s);
  });
}

/**
 * Google reCAPTCHA v2 checkbox. Calls `onVerified` with the token (or null on reset/expiry).
 * Site key is fetched from the `captcha_html` Cloud secret via a server function.
 */
export function Recaptcha({ onVerified }: { onVerified: (token: string | null) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchKey = useServerFn(getRecaptchaSiteKey);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { siteKey } = await fetchKey();
        if (!siteKey) {
          setError("尚未設定 reCAPTCHA 金鑰");
          return;
        }
        await loadScript();
        if (!mounted || !holder.current || !window.grecaptcha) return;
        window.grecaptcha.ready(() => {
          if (!holder.current || widgetId.current !== null) return;
          widgetId.current = window.grecaptcha!.render(holder.current, {
            sitekey: siteKey,
            callback: (t: string) => onVerified(t),
            "expired-callback": () => onVerified(null),
          });
        });
      } catch (e) {
        setError((e as Error).message);
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
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      <div className="text-[10px] tracking-[0.3em] text-muted-foreground mt-2">reCAPTCHA</div>
    </div>
  );
}
