import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Exposes the public reCAPTCHA site key (stored as `captcha_html` secret). */
export const getRecaptchaSiteKey = createServerFn({ method: "GET" }).handler(async () => {
  return { siteKey: process.env.captcha_html ?? "" };
});

/** Verifies a reCAPTCHA token server-side using the `captcha_api` secret key. */
export const verifyRecaptcha = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(10).max(4000) }).parse(d))
  .handler(async ({ data }) => {
    const secret = process.env.captcha_api;
    if (!secret) return { ok: false, error: "captcha not configured" };
    const body = new URLSearchParams({ secret, response: data.token });
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json()) as { success?: boolean; score?: number; "error-codes"?: string[] };
    return { ok: !!json.success, score: json.score ?? null, errors: json["error-codes"] ?? [] };
  });
