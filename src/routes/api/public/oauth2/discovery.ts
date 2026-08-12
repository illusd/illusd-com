import { createFileRoute } from "@tanstack/react-router";

const CORS = { "Access-Control-Allow-Origin": "*" };

export const Route = createFileRoute("/api/public/oauth2/discovery")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        return new Response(
          JSON.stringify({
            issuer: origin,
            authorization_endpoint: `${origin}/oauth2/authorize`,
            token_endpoint: `${origin}/api/public/oauth2/token`,
            userinfo_endpoint: `${origin}/api/public/oauth2/userinfo`,
            registration_page: `${origin}/oauth2/apps`,
            response_types_supported: ["code"],
            grant_types_supported: ["authorization_code", "refresh_token"],
            code_challenge_methods_supported: ["S256", "plain"],
            token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
            scopes_supported: ["openid", "email", "profile"],
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
        );
      },
    },
  },
});
