import { createFileRoute, redirect, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const lookupShortLink = createServerFn({ method: "GET" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("short_links")
      .select("target_url")
      .eq("code", data.code)
      .maybeSingle();
    return row?.target_url ?? null;
  });

export const Route = createFileRoute("/$code")({
  loader: async ({ params }) => {
    const code = params.code;
    if (!/^[0-9A-Z]{5}$/.test(code)) throw notFound();
    const target = await lookupShortLink({ data: { code } });
    if (!target) throw notFound();
    throw redirect({ href: target, statusCode: 302 });
  },
  component: () => null,
});
