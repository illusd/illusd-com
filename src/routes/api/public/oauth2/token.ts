import { createFileRoute } from "@tanstack/react-router";
import {
  ACCESS_TOKEN_TTL_SEC,
  randomToken,
  sha256Base64Url,
  sha256Hex,
} from "@/lib/oauth2.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });
}

function oauthError(status: number, error: string, description?: string) {
  return json(status, { error, error_description: description });
}

async function readParams(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  const out: Record<string, string> = {};
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    for (const [k, v] of Object.entries(body)) if (typeof v === "string") out[k] = v;
  } else {
    const form = new URLSearchParams(await request.text());
    form.forEach((v, k) => (out[k] = v));
  }
  return out;
}

function basicAuth(request: Request): { id: string; secret: string } | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    if (idx < 0) return null;
    return {
      id: decodeURIComponent(decoded.slice(0, idx)),
      secret: decodeURIComponent(decoded.slice(idx + 1)),
    };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/oauth2/token")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const params = await readParams(request);
        const creds = basicAuth(request);
        const clientId = creds?.id ?? params["client_id"];
        const clientSecret = creds?.secret ?? params["client_secret"];
        if (!clientId) return oauthError(400, "invalid_request", "缺少 client_id");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: clientRow } = await supabaseAdmin
          .from("oauth_clients" as any)
          .select("client_id, client_secret_hash, redirect_uris")
          .eq("client_id", clientId)
          .maybeSingle();
        const client = clientRow as unknown as
          | { client_id: string; client_secret_hash: string; redirect_uris: string[] }
          | null;
        if (!client) return oauthError(401, "invalid_client", "client_id 不存在");

        const grantType = params["grant_type"];
        const isPkce = Boolean(params["code_verifier"]);
        if (!isPkce || clientSecret) {
          if (!clientSecret) return oauthError(401, "invalid_client", "缺少 client_secret");
          if ((await sha256Hex(clientSecret)) !== client.client_secret_hash)
            return oauthError(401, "invalid_client", "client_secret 不正確");
        }

        const issue = async (userId: string, scope: string) => {
          const accessToken = randomToken(32);
          const refreshToken = randomToken(32);
          const { error } = await supabaseAdmin.from("oauth_access_tokens" as any).insert({
            access_token_hash: await sha256Hex(accessToken),
            refresh_token_hash: await sha256Hex(refreshToken),
            client_id: clientId,
            user_id: userId,
            scope,
            expires_at: new Date(Date.now() + ACCESS_TOKEN_TTL_SEC * 1000).toISOString(),
          } as any);
          if (error) return oauthError(500, "server_error", error.message);
          return json(200, {
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: ACCESS_TOKEN_TTL_SEC,
            refresh_token: refreshToken,
            scope,
          });
        };

        if (grantType === "authorization_code") {
          const code = params["code"];
          const redirectUri = params["redirect_uri"];
          if (!code || !redirectUri) return oauthError(400, "invalid_request", "缺少 code 或 redirect_uri");

          const { data: codeRow } = await supabaseAdmin
            .from("oauth_authorization_codes" as any)
            .select("code, client_id, user_id, redirect_uri, scope, code_challenge, code_challenge_method, used, expires_at")
            .eq("code", code)
            .maybeSingle();
          const authCode = codeRow as unknown as
            | {
                code: string;
                client_id: string;
                user_id: string;
                redirect_uri: string;
                scope: string;
                code_challenge: string | null;
                code_challenge_method: string | null;
                used: boolean;
                expires_at: string;
              }
            | null;
          if (!authCode) return oauthError(400, "invalid_grant", "授權碼無效");
          if (authCode.used) return oauthError(400, "invalid_grant", "授權碼已被使用");
          if (new Date(authCode.expires_at).getTime() < Date.now())
            return oauthError(400, "invalid_grant", "授權碼已過期");
          if (authCode.client_id !== clientId) return oauthError(400, "invalid_grant", "授權碼不屬於這個應用程式");
          if (authCode.redirect_uri !== redirectUri) return oauthError(400, "invalid_grant", "redirect_uri 不一致");

          if (authCode.code_challenge) {
            const verifier = params["code_verifier"];
            if (!verifier) return oauthError(400, "invalid_grant", "缺少 code_verifier");
            const computed =
              authCode.code_challenge_method === "plain" ? verifier : await sha256Base64Url(verifier);
            if (computed !== authCode.code_challenge) return oauthError(400, "invalid_grant", "code_verifier 不正確");
          }

          await supabaseAdmin
            .from("oauth_authorization_codes" as any)
            .update({ used: true } as any)
            .eq("code", code);

          return issue(authCode.user_id, authCode.scope);
        }

        if (grantType === "refresh_token") {
          const refreshToken = params["refresh_token"];
          if (!refreshToken) return oauthError(400, "invalid_request", "缺少 refresh_token");
          const hash = await sha256Hex(refreshToken);
          const { data: tokenRow } = await supabaseAdmin
            .from("oauth_access_tokens" as any)
            .select("id, client_id, user_id, scope, revoked")
            .eq("refresh_token_hash", hash)
            .maybeSingle();
          const token = tokenRow as unknown as
            | { id: string; client_id: string; user_id: string; scope: string; revoked: boolean }
            | null;
          if (!token || token.revoked || token.client_id !== clientId)
            return oauthError(400, "invalid_grant", "refresh_token 無效");
          await supabaseAdmin
            .from("oauth_access_tokens" as any)
            .update({ revoked: true } as any)
            .eq("id", token.id);
          return issue(token.user_id, token.scope);
        }

        return oauthError(400, "unsupported_grant_type", "只支援 authorization_code 與 refresh_token");
      },
    },
  },
});
