import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ACCESS_TOKEN_TTL_SEC,
  CODE_TTL_SEC,
  DEFAULT_SCOPE,
  appendParams,
  isOfficialHomepage,
  normalizeRedirectUri,
  randomToken,
  redirectUriMatches,
  sha256Hex,
} from "@/lib/oauth2.server";

export const listOAuthClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("oauth_clients" as any)
      .select("id, client_id, name, homepage_url, redirect_uris, verified, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Array<{
      id: string;
      client_id: string;
      name: string;
      homepage_url: string;
      redirect_uris: string[];
      verified: boolean;
      created_at: string;
    }>;
  });

export const createOAuthClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().trim().min(1).max(64),
        homepage_url: z.string().trim().url(),
        redirect_uris: z.array(z.string()).min(1).max(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const uris: string[] = [];
    for (const raw of data.redirect_uris) {
      const normalized = normalizeRedirectUri(raw);
      if (!normalized) throw new Error(`回呼網址無效：${raw}（必須是絕對網址，https 或 http://localhost，且不可含 #）`);
      uris.push(normalized);
    }
    const clientId = `illusd_${randomToken(12)}`;
    const clientSecret = `illsec_${randomToken(32)}`;
    const { error } = await context.supabase.from("oauth_clients" as any).insert({
      owner_id: context.userId,
      client_id: clientId,
      client_secret_hash: await sha256Hex(clientSecret),
      name: data.name,
      homepage_url: data.homepage_url,
      redirect_uris: uris,
      verified: isOfficialHomepage(data.homepage_url),
    } as any);
    if (error) throw new Error(error.message);
    return { client_id: clientId, client_secret: clientSecret, verified: isOfficialHomepage(data.homepage_url) };
  });

export const updateOAuthClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(64),
        homepage_url: z.string().trim().url(),
        redirect_uris: z.array(z.string()).min(1).max(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const uris: string[] = [];
    for (const raw of data.redirect_uris) {
      const normalized = normalizeRedirectUri(raw);
      if (!normalized) throw new Error(`回呼網址無效：${raw}`);
      uris.push(normalized);
    }
    const { error } = await context.supabase
      .from("oauth_clients" as any)
      .update({
        name: data.name,
        homepage_url: data.homepage_url,
        redirect_uris: uris,
        verified: isOfficialHomepage(data.homepage_url),
      } as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, verified: isOfficialHomepage(data.homepage_url) };
  });

export const rotateOAuthClientSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const clientSecret = `illsec_${randomToken(32)}`;
    const { error } = await context.supabase
      .from("oauth_clients" as any)
      .update({ client_secret_hash: await sha256Hex(clientSecret) } as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { client_secret: clientSecret };
  });

export const deleteOAuthClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("oauth_clients" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: validate an incoming /oauth2/authorize request and describe the client app. */
export const getAuthorizationRequest = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        client_id: z.string().min(1),
        redirect_uri: z.string().min(1),
        response_type: z.string().default("code"),
        scope: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("oauth_clients" as any)
      .select("client_id, name, homepage_url, redirect_uris, verified")
      .eq("client_id", data.client_id)
      .maybeSingle();
    const client = row as unknown as
      | { client_id: string; name: string; homepage_url: string; redirect_uris: string[]; verified: boolean }
      | null;
    if (!client) return { error: "invalid_client", message: "找不到這個應用程式（client_id 無效）" } as const;
    if (data.response_type !== "code")
      return { error: "unsupported_response_type", message: "只支援 response_type=code" } as const;
    if (!redirectUriMatches(client.redirect_uris, data.redirect_uri))
      return { error: "invalid_redirect_uri", message: "回呼網址未註冊，請聯絡應用程式開發者" } as const;
    return {
      ok: true as const,
      client: {
        name: client.name,
        homepage_url: client.homepage_url,
        verified: client.verified,
      },
      scope: data.scope?.trim() || DEFAULT_SCOPE,
    };
  });

/** Signed-in user approves: mints a single-use authorization code. */
export const approveAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        client_id: z.string().min(1),
        redirect_uri: z.string().min(1),
        scope: z.string().optional(),
        state: z.string().optional(),
        code_challenge: z.string().optional(),
        code_challenge_method: z.enum(["S256", "plain"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("oauth_clients" as any)
      .select("client_id, redirect_uris")
      .eq("client_id", data.client_id)
      .maybeSingle();
    const client = row as unknown as { client_id: string; redirect_uris: string[] } | null;
    if (!client || !redirectUriMatches(client.redirect_uris, data.redirect_uri)) {
      throw new Error("invalid_request");
    }
    const code = randomToken(32);
    const { error } = await supabaseAdmin.from("oauth_authorization_codes" as any).insert({
      code,
      client_id: data.client_id,
      user_id: context.userId,
      redirect_uri: data.redirect_uri,
      scope: data.scope?.trim() || DEFAULT_SCOPE,
      code_challenge: data.code_challenge ?? null,
      code_challenge_method: data.code_challenge ? (data.code_challenge_method ?? "S256") : null,
      expires_at: new Date(Date.now() + CODE_TTL_SEC * 1000).toISOString(),
    } as any);
    if (error) throw new Error(error.message);
    return { redirect_to: appendParams(data.redirect_uri, { code, state: data.state }) };
  });

/** Public: user denies consent — build the standard error redirect. */
export const denyAuthorization = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ client_id: z.string().min(1), redirect_uri: z.string().min(1), state: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("oauth_clients" as any)
      .select("redirect_uris")
      .eq("client_id", data.client_id)
      .maybeSingle();
    const client = row as unknown as { redirect_uris: string[] } | null;
    if (!client || !redirectUriMatches(client.redirect_uris, data.redirect_uri)) throw new Error("invalid_request");
    return {
      redirect_to: appendParams(data.redirect_uri, {
        error: "access_denied",
        error_description: "使用者拒絕授權",
        state: data.state,
      }),
    };
  });

/** Signed-in user revokes an app's access. */
export const revokeAppAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ client_id: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("oauth_access_tokens" as any)
      .update({ revoked: true } as any)
      .eq("client_id", data.client_id)
      .eq("user_id", context.userId);
    return { ok: true, ttl: ACCESS_TOKEN_TTL_SEC };
  });
