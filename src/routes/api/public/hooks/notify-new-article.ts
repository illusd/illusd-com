import { createFileRoute } from "@tanstack/react-router";
import webpush from "web-push";

export const Route = createFileRoute("/api/public/hooks/notify-new-article")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-notify-secret");
        if (!secret || secret !== process.env.PUSH_NOTIFY_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        const payload = (await request.json()) as {
          id?: string;
          episode_num?: number | null;
          episode_title?: string | null;
          topic_title?: string;
        };

        if (!payload?.id || !payload.topic_title) {
          return new Response("Invalid payload", { status: 400 });
        }

        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || "mailto:lan.2015.se@gmail.com",
          process.env.VAPID_PUBLIC_KEY!,
          process.env.VAPID_PRIVATE_KEY!,
        );

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: subs, error } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth");

        if (error) {
          return new Response(`DB error: ${error.message}`, { status: 500 });
        }

        const epTxt = payload.episode_num != null ? `Ep.${payload.episode_num} ` : "";
        const head = `${epTxt}${payload.episode_title ?? payload.topic_title}`;
        const body = `${head} — ${payload.topic_title}`;
        const notification = JSON.stringify({
          title: "新文章 / New Article",
          body,
          url: `/article/${payload.id}`,
          tag: `article-${payload.id}`,
        });

        const expired: string[] = [];
        await Promise.all(
          (subs ?? []).map(async (s) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: s.endpoint,
                  keys: { p256dh: s.p256dh, auth: s.auth },
                },
                notification,
              );
            } catch (err: unknown) {
              const status = (err as { statusCode?: number })?.statusCode;
              if (status === 404 || status === 410) expired.push(s.endpoint);
            }
          }),
        );

        if (expired.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", expired);
        }

        return Response.json({
          ok: true,
          sent: (subs?.length ?? 0) - expired.length,
          expired: expired.length,
        });
      },
    },
  },
});
