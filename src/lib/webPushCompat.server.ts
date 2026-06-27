interface PushSubscriptionEndpoint {
  endpoint: string;
}

interface VapidConfig {
  subject: string;
  publicKey: string;
  privateKey: string;
  ttl?: number;
}

export class WebPushSendError extends Error {
  statusCode: number;
  endpoint: string;
  responseText: string;

  constructor(message: string, statusCode: number, endpoint: string, responseText: string) {
    super(message);
    this.name = "WebPushSendError";
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.responseText = responseText;
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stringToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function derEcdsaToRaw(signature: Uint8Array): Uint8Array {
  if (signature.length === 64 || signature[0] !== 0x30) return signature;

  let offset = 2;
  if (signature[1] === 0x81) offset = 3;
  if (signature[offset] !== 0x02) return signature;
  const rLength = signature[offset + 1];
  const r = signature.subarray(offset + 2, offset + 2 + rLength);
  offset += 2 + rLength;
  if (signature[offset] !== 0x02) return signature;
  const sLength = signature[offset + 1];
  const s = signature.subarray(offset + 2, offset + 2 + sLength);

  const raw = new Uint8Array(64);
  raw.set(r.slice(Math.max(0, r.length - 32)), 32 - Math.min(32, r.length));
  raw.set(s.slice(Math.max(0, s.length - 32)), 64 - Math.min(32, s.length));
  return raw;
}

async function createVapidJwt(audience: string, config: VapidConfig): Promise<string> {
  const publicBytes = base64UrlToBytes(config.publicKey);
  const privateBytes = base64UrlToBytes(config.privateKey);
  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04) {
    throw new Error("VAPID_PUBLIC_KEY 格式錯誤：必須是未壓縮 P-256 公鑰");
  }
  if (privateBytes.length !== 32) {
    throw new Error("VAPID_PRIVATE_KEY 格式錯誤：必須是 32 bytes P-256 私鑰");
  }

  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: bytesToBase64Url(publicBytes.subarray(1, 33)),
      y: bytesToBase64Url(publicBytes.subarray(33, 65)),
      d: bytesToBase64Url(privateBytes),
      ext: false,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const header = stringToBase64Url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = stringToBase64Url(
    JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: config.subject,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(signingInput),
    ),
  );

  return `${signingInput}.${bytesToBase64Url(derEcdsaToRaw(signature))}`;
}

export async function sendWebPushNoPayload(
  subscription: PushSubscriptionEndpoint,
  config: VapidConfig,
): Promise<{ statusCode: number }> {
  const endpointUrl = new URL(subscription.endpoint);
  const jwt = await createVapidJwt(endpointUrl.origin, config);
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      TTL: String(config.ttl ?? 2_419_200),
      Urgency: "normal",
      Authorization: `vapid t=${jwt}, k=${config.publicKey}`,
    },
  });

  if (!response.ok) {
    throw new WebPushSendError(
      "Push service returned an error",
      response.status,
      subscription.endpoint,
      await response.text().catch(() => ""),
    );
  }

  return { statusCode: response.status };
}