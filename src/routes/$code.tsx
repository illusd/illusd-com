import { createFileRoute, redirect, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

// Single-segment dynamic short code at the site root.
// Only matches 5-character codes from [0-9A-Z]; everything else 404s.

const lookupShortLink = createServerFn({ method: "GET" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: row } = await sb
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
