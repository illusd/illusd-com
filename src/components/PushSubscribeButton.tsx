import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { subscribePush, unsubscribePush } from "@/lib/push.functions";

const VAPID_PUBLIC_KEY =
  "BNDoGIGuCOh25iS8vv0GKG2E9SL0yMJO58HG2SwYzbM3VvqMJtpFrJe3xXJo_SIqV-Yag5jtOkgutv-gTuMNsUg";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushSubscribeButton({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const sub = useServerFn(subscribePush);
  const unsub = useServerFn(unsubscribePush);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((s) => setSubscribed(!!s))
      .catch(() => setSupported(false));
  }, []);

  const handleClick = async () => {
    if (!supported) {
      toast.error(t("push.unsupported"));
      return;
    }
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();

      if (existing && subscribed) {
        await unsub({ data: { endpoint: existing.endpoint } });
        await existing.unsubscribe();
        setSubscribed(false);
        toast.success(t("push.unsubscribed_toast"));
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error(t("push.denied"));
        return;
      }
      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
      const json = newSub.toJSON();
      await sub({
        data: {
          endpoint: newSub.endpoint,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
          userAgent: navigator.userAgent,
        },
      });
      setSubscribed(true);
      toast.success(t("push.subscribed_toast"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) {
    // Avoid SSR/client text mismatch — render an inert shell on the server.
    return (
      <span
        suppressHydrationWarning
        className={`inline-flex items-center gap-2 text-sm border hairline px-3 py-1.5 opacity-0 ${className}`}
        aria-hidden="true"
      >
        <Bell size={14} strokeWidth={1.5} />
        <span>—</span>
      </span>
    );
  }

  if (!supported) return null;

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      title={subscribed ? t("push.subscribed") : t("push.subscribe")}
      className={`inline-flex items-center gap-2 text-sm border hairline px-3 py-1.5 hover:bg-accent transition disabled:opacity-50 ${className}`}
    >
      {subscribed ? (
        <BellRing size={14} strokeWidth={1.5} />
      ) : (
        <Bell size={14} strokeWidth={1.5} />
      )}
      <span>{subscribed ? t("push.subscribed") : t("push.subscribe")}</span>
    </button>
  );
}
