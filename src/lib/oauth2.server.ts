// Server-only helpers for the illusd OAuth 2.0 authorization server.

export const OFFICIAL_HOMEPAGE = "https://org.illusd.com";
export const DEFAULT_SCOPE = "openid email profile";
export const ACCESS_TOKEN_TTL_SEC = 60 * 60; // 1 hour
export const CODE_TTL_SEC = 10 * 60; // 10 minutes

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  let bin = "";
  for (const b of new Uint8Array(digest)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isOfficialHomepage(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "org.illusd.com");
  } catch {
    return false;
  }
}

/** Redirect URIs must be absolute, https (or http://localhost), and carry no fragment. */
export function normalizeRedirectUri(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (u.hash) return null;
  const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1";
  if (u.protocol === "https:" || (u.protocol === "http:" && isLocal)) return u.toString();
  // Allow native app custom schemes (e.g. myapp://callback)
  if (/^[a-z][a-z0-9+.-]*:$/.test(u.protocol) && u.protocol !== "javascript:" && u.protocol !== "data:") {
    return value;
  }
  return null;
}

export function redirectUriMatches(registered: string[], candidate: string): boolean {
  return registered.some((r) => r === candidate);
}

export function appendParams(redirectUri: string, params: Record<string, string | undefined>): string {
  const hasQuery = redirectUri.includes("?");
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  return `${redirectUri}${hasQuery ? "&" : "?"}${search.toString()}`;
}
