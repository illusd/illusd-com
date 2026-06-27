import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export function describeRecaptchaErrors(errors: string[] = []): string {
  if (errors.includes("missing-input-secret")) return "伺服器尚未設定 reCAPTCHA Secret Key（captcha_api）";
  if (errors.includes("invalid-input-secret")) return "reCAPTCHA Secret Key（captcha_api）無效，請檢查 Cloud secrets";
  if (errors.includes("missing-input-response")) return "請先完成 reCAPTCHA 人機驗證";
  if (errors.includes("invalid-input-response")) return "reCAPTCHA 驗證碼無效，請重新勾選後再試";
  if (errors.includes("timeout-or-duplicate")) return "reCAPTCHA 已逾時或已使用，請重新勾選後再試";
  if (errors.includes("bad-request")) return "reCAPTCHA 驗證請求格式錯誤";
  return errors.length ? `人機驗證失敗：${errors.join(", ")}` : "人機驗證失敗，請重試";
}

/** Exposes the public reCAPTCHA site key (stored as `captcha_html` secret). */
export const getRecaptchaSiteKey = createServerFn({ method: "GET" }).handler(async () => {
  const siteKey = process.env.captcha_html ?? "";
  return { siteKey, configured: !!siteKey };
});

/** Verifies a reCAPTCHA token server-side using the `captcha_api` secret key. */
export const verifyRecaptcha = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(10).max(4000) }).parse(d))
  .handler(async ({ data }) => {
    const secret = process.env.captcha_api;
    if (!secret) return { ok: false, error: describeRecaptchaErrors(["missing-input-secret"]), errors: ["missing-input-secret"] };
    const body = new URLSearchParams({ secret, response: data.token });
    try {
      const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) {
        return { ok: false, error: `reCAPTCHA 驗證服務回應異常（HTTP ${res.status}）`, errors: ["network-error"] };
      }
      const json = (await res.json()) as { success?: boolean; score?: number; "error-codes"?: string[] };
      const errors = json["error-codes"] ?? [];
      return {
        ok: !!json.success,
        score: json.score ?? null,
        errors,
        error: json.success ? null : describeRecaptchaErrors(errors),
      };
    } catch {
      return { ok: false, error: "reCAPTCHA 驗證服務暫時無法連線，請稍後再試", errors: ["network-error"] };
    }
  });
