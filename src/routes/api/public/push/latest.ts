import { createFileRoute } from "@tanstack/react-router";
import { buildNewArticleNotification } from "@/lib/notifications";

export const Route = createFileRoute("/api/public/push/latest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("articles")
          .select("id, episode_num, episode_title, topic_title, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!data) return Response.json({ error: "No articles" }, { status: 404 });

        return Response.json(buildNewArticleNotification(data, new URL(request.url).origin), {
          headers: { "cache-control": "no-store" },
        });
      },
    },
  },
});