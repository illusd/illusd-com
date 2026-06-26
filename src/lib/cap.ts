// Lightweight client-side proof-of-work captcha (Cap-inspired)
// Client computes sha256 of `${challenge}:${nonce}` until hash has DIFFICULTY leading hex zeros.
// Server re-hashes once to verify; honest browsers spend ~1-3s, bots pay the same per attempt.
//
// Token format: `${challengeHex}:${nonce}:${issuedAtMs}`

export const CAP_DIFFICULTY = 4;
const PREFIX = "0".repeat(CAP_DIFFICULTY);
const MAX_AGE_MS = 15 * 60 * 1000;

export function genChallenge(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyCapToken(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [challenge, nonceStr, tsStr] = parts;
  const ts = Number(tsStr);
  const nonce = Number(nonceStr);
  if (!ts || !Number.isFinite(nonce)) return false;
  if (Date.now() - ts > MAX_AGE_MS) return false;
  if (!/^[0-9a-f]{32}$/.test(challenge)) return false;
  const hash = await sha256Hex(`${challenge}:${nonce}`);
  return hash.startsWith(PREFIX);
}
