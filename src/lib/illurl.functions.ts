import { createServerFn } from "@tanstack/react-start";

function describeRecaptchaServerError(errors: string[] = []): string {
  if (errors.includes("missing-input-secret")) return "伺服器尚未設定 reCAPTCHA Secret Key（captcha_api）";
  if (errors.includes("invalid-input-secret")) return "reCAPTCHA Secret Key（captcha_api）無效，請檢查 Cloud secrets";
  if (errors.includes("missing-input-response")) return "請先完成 reCAPTCHA 人機驗證";
  if (errors.includes("invalid-input-response")) return "reCAPTCHA 驗證碼無效，請重新勾選後再試";
  if (errors.includes("timeout-or-duplicate")) return "reCAPTCHA 已逾時或已使用，請重新勾選後再試";
  return errors.length ? `人機驗證失敗：${errors.join(", ")}` : "人機驗證失敗，請重試";
}

async function verifyRecaptchaServer(token: string | null | undefined): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: describeRecaptchaServerError(["missing-input-response"]) };
  const secret = process.env.captcha_api;
  if (!secret) return { ok: false, error: describeRecaptchaServerError(["missing-input-secret"]) };
  const body = new URLSearchParams({ secret, response: token });
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return { ok: false, error: `reCAPTCHA 驗證服務回應異常（HTTP ${res.status}）` };
    const json = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    const errors = json["error-codes"] ?? [];
    return { ok: !!json.success, error: json.success ? undefined : describeRecaptchaServerError(errors) };
  } catch {
    return { ok: false, error: "reCAPTCHA 驗證服務暫時無法連線，請稍後再試" };
  }
}

const DIGITS = "0123456789";
const ALPHANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_FILE_BYTES = 200 * 1024 * 1024;

function randomCode(charset: string, len = 5): string {
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += charset[arr[i] % charset.length];
  return out;
}

async function reserveCode(
  exists: (code: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = randomCode(DIGITS);
    if (!(await exists(code))) return code;
  }
  for (let i = 0; i < 24; i++) {
    const code = randomCode(ALPHANUM);
    if (!(await exists(code))) return code;
  }
  throw new Error("無法產生短碼，請稍後再試");
}

function safeUrl(input: string): string {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    throw new Error("請輸入有效的 https / http 網址");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("僅支援 http / https 連結");
  }
  if (/illusd\.com$/i.test(u.hostname)) {
    throw new Error("不可短化 illusd.com 自家網址");
  }
  return u.toString();
}

interface CreateShortLinkInput {
  capToken: string;
  targetUrl: string;
}

export const createShortLink = createServerFn({ method: "POST" })
  .inputValidator((data: CreateShortLinkInput) => data)
  .handler(async ({ data }) => {
    const captcha = await verifyRecaptchaServer(data.capToken);
    if (!captcha.ok) throw new Error(captcha.error || "人機驗證失敗，請重試");
    const target = safeUrl(data.targetUrl);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = await reserveCode(async (c) => {
      const { data: row } = await supabaseAdmin
        .from("short_links")
        .select("code")
        .eq("code", c)
        .maybeSingle();
      return !!row;
    });
    const { error } = await supabaseAdmin
      .from("short_links")
      .insert({ code, target_url: target });
    if (error) throw new Error(error.message);
    return { code, url: `https://illusd.com/${code}` };
  });

interface PrepareShortFileInput {
  capToken: string;
  filename: string;
  mime: string;
  size: number;
}

export const prepareShortFile = createServerFn({ method: "POST" })
  .inputValidator((data: PrepareShortFileInput) => data)
  .handler(async ({ data }) => {
    const captcha = await verifyRecaptchaServer(data.capToken);
    if (!captcha.ok) throw new Error(captcha.error || "人機驗證失敗，請重試");
    if (!data.filename || data.filename.length > 255) {
      throw new Error("檔名無效");
    }
    if (!Number.isFinite(data.size) || data.size <= 0 || data.size > MAX_FILE_BYTES) {
      throw new Error(`檔案大小須在 1 byte 到 ${MAX_FILE_BYTES / (1024 * 1024)} MB 之間`);
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = await reserveCode(async (c) => {
      const { data: row } = await supabaseAdmin
        .from("short_files")
        .select("code")
        .eq("code", c)
        .maybeSingle();
      return !!row;
    });
    const ext = data.filename.includes(".")
      ? data.filename.split(".").pop()!.toLowerCase().slice(0, 16)
      : "bin";
    const storagePath = `${code}/${crypto.randomUUID()}.${ext}`;
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("illurl-files")
      .createSignedUploadUrl(storagePath);
    if (signErr || !signed) throw new Error(signErr?.message ?? "建立上傳連結失敗");
    const { error: insertErr } = await supabaseAdmin.from("short_files").insert({
      code,
      storage_path: storagePath,
      filename: data.filename.slice(0, 255),
      mime: data.mime || "application/octet-stream",
      size: data.size,
    });
    if (insertErr) throw new Error(insertErr.message);
    return {
      code,
      url: `https://illusd.com/f/${code}`,
      uploadUrl: signed.signedUrl,
      token: signed.token,
      path: storagePath,
    };
  });
