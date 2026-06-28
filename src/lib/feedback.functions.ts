import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

const SITE_NAME = "illusd.com";
const FROM_DOMAIN = "mails.illusd.com";
const SENDER_DOMAIN = "mails.illusd.com";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const DIGITS = "0123456789";
const ALPHANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomCode(charset: string, len = 5): string {
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += charset[arr[i] % charset.length];
  return out;
}

async function reserveCode(exists: (code: string) => Promise<boolean>): Promise<string> {
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

async function currentUser(): Promise<{ id: string | null; email: string | null }> {
  const auth = getRequest().headers.get("authorization");
  if (!auth || !/^Bearer\s+/i.test(auth)) return { id: null, email: null };
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.getUser(token);
  return { id: data?.user?.id ?? null, email: data?.user?.email ?? null };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]!));
}

export const prepareFeedbackImage = createServerFn({ method: "POST" })
  .inputValidator((data: { filename: string; mime: string; size: number }) => data)
  .handler(async ({ data }) => {
    if (!data.mime?.startsWith("image/")) throw new Error("只能上傳圖片");
    if (!Number.isFinite(data.size) || data.size <= 0 || data.size > MAX_IMAGE_BYTES) throw new Error("圖片大小不可超過 10MB");
    const { id } = await currentUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = await reserveCode(async (c) => {
      const { data: row } = await supabaseAdmin.from("short_files").select("code").eq("code", c).maybeSingle();
      return !!row;
    });
    const ext = data.filename.includes(".") ? data.filename.split(".").pop()!.toLowerCase().slice(0, 16) : "jpg";
    const storagePath = `feedback/${code}/${crypto.randomUUID()}.${ext}`;
    const { data: signed, error: signErr } = await supabaseAdmin.storage.from("illurl-files").createSignedUploadUrl(storagePath);
    if (signErr || !signed) throw new Error(signErr?.message ?? "建立圖片上傳連結失敗");
    const { error: insertErr } = await supabaseAdmin.from("short_files").insert({
      code,
      storage_path: storagePath,
      filename: data.filename.slice(0, 255),
      mime: data.mime || "image/jpeg",
      size: data.size,
      created_by: id,
      expires_at: new Date(Date.now() + ONE_YEAR_MS).toISOString(),
    } as any);
    if (insertErr) throw new Error(insertErr.message);
    return { code, url: `https://illusd.com/f/${code}`, uploadUrl: signed.signedUrl, token: signed.token, path: storagePath };
  });

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((data: { message: string; email?: string; imageUrls?: string[] }) => data)
  .handler(async ({ data }) => {
    const message = data.message?.trim();
    if (!message) throw new Error("請輸入回饋內容");
    const user = await currentUser();
    const senderEmail = (data.email || user.email || "").trim() || null;
    const shortUrls = (data.imageUrls ?? []).filter((u) => /^https:\/\/illusd\.com\/f\/[0-9A-Z]{5}$/.test(u));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rowRaw, error } = await supabaseAdmin.from("feedback" as any).insert({
      user_id: user.id,
      email: senderEmail,
      message,
      image_urls: shortUrls,
      short_urls: shortUrls,
      email_status: "pending",
    } as any).select("id").single();
    if (error) throw new Error(error.message);
    const row = rowRaw as { id: string };

    const linksHtml = shortUrls.length
      ? `<p style="font-size:14px;line-height:1.7"><strong>圖片短網址：</strong></p><ul>${shortUrls.map((u) => `<li><a href="${u}">${u}</a></li>`).join("")}</ul>`
      : "";
    const html = `<!doctype html><html lang="zh-Hant"><body style="background:#FCFBF8;font-family:'Noto Sans TC',Arial,sans-serif;color:#111;padding:24px"><div style="max-width:640px;margin:0 auto"><h1 style="font-size:20px">illusd.com 新回饋</h1><p style="font-size:13px;color:#666">From: ${escapeHtml(senderEmail ?? "匿名")} · Feedback ID: ${row.id}</p><div style="white-space:pre-wrap;border:1px solid #e8e6df;padding:16px;font-size:14px;line-height:1.8">${escapeHtml(message)}</div>${linksHtml}<p style="font-size:11px;color:#999;margin-top:24px">圖片若無法直接顯示，請使用上方 illurl 短網址查看。</p></div></body></html>`;
    const recipients = ["iilluussdd@gmail.com", "no-reply2@illusd.com"];
    let queued = 0;
    for (const to of recipients) {
      const messageId = `feedback-${row.id}-${to}`;
      await supabaseAdmin.from("email_send_log").insert({ message_id: messageId, template_name: "feedback", recipient_email: to, status: "pending" } as any);
      const { error: enqErr } = await supabaseAdmin.rpc("enqueue_email" as any, {
        queue_name: "transactional_emails",
        payload: {
          message_id: messageId,
          to,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject: "illusd.com 新回饋",
          html,
          text: `新回饋\nFrom: ${senderEmail ?? "匿名"}\n\n${message}\n\n圖片短網址：${shortUrls.join(", ")}`,
          purpose: "transactional",
          label: "feedback",
          queued_at: new Date().toISOString(),
        },
      });
      if (!enqErr) queued++;
    }
    await supabaseAdmin.from("feedback" as any).update({ email_status: queued === recipients.length ? "queued" : "partial" } as any).eq("id", row.id);
    return { ok: true, queued };
  });
