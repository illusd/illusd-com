import { createFileRoute } from "@tanstack/react-router";
import { buildNewArticleNotification } from "@/lib/notifications";
import { sendWebPushNoPayload, WebPushSendError } from "@/lib/webPushCompat.server";

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

        const publicKey = process.env.VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        if (!publicKey || !privateKey) {
          return Response.json(
            { ok: false, error: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not configured" },
            { status: 500 },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: subs, error } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint");

        if (error) {
          return new Response(`DB error: ${error.message}`, { status: 500 });
        }

        const notification = buildNewArticleNotification(
          {
            id: payload.id,
            episode_num: payload.episode_num,
            episode_title: payload.episode_title,
            topic_title: payload.topic_title,
          },
          "https://illusd.com",
        );

        const expired: string[] = [];
        await Promise.all(
          (subs ?? []).map(async (s) => {
            try {
              await sendWebPushNoPayload(
                { endpoint: s.endpoint },
                {
                  subject: process.env.VAPID_SUBJECT || "mailto:lan.2015.se@gmail.com",
                  publicKey,
                  privateKey,
                },
              );
            } catch (err: unknown) {
              const status = err instanceof WebPushSendError ? err.statusCode : undefined;
              if (status === 404 || status === 410) expired.push(s.endpoint);
            }
          }),
        );

        if (expired.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", expired);
        }

        return Response.json({
          ok: true,
          notification,
          sent: (subs?.length ?? 0) - expired.length,
          expired: expired.length,
        });
      },
    },
  },
});
