// Daily cron: send a single reminder 7 days before an illurl link/file expires.
import { createFileRoute } from "@tanstack/react-router";

const SITE_NAME = "illusd.com";
const SITE_URL = "https://illusd.com";
const FROM_DOMAIN = "mails.illusd.com";
const SENDER_DOMAIN = "mails.illusd.com";
const REMIND_WINDOW_DAYS = 7;

function renderHtml(opts: {
  itemsHtml: string;
  donateUrl: string;
  myUrl: string;
}) {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"></head>
<body style="background:#FCFBF8;font-family:'Noto Sans TC',Arial,sans-serif;color:#333;padding:24px">
  <div style="max-width:560px;margin:0 auto">
    <h1 style="font-size:20px;color:#111;margin:0 0 16px">你的 illurl 即將到期</h1>
    <p style="font-size:14px;line-height:1.7">以下短連結 / 檔案將於 7 天內自動刪除：</p>
    <ul style="font-size:13px;line-height:1.8;padding-left:20px">${opts.itemsHtml}</ul>
    <p style="font-size:14px;line-height:1.7;margin-top:24px">若希望保留為 <strong>永久連結</strong>，可前往 <a href="${opts.donateUrl}" style="color:#111">Ko-fi 贊助</a> 升級為會員，所有現有與未來連結都將自動轉為永久。</p>
    <p style="font-size:13px;line-height:1.7"><a href="${opts.myUrl}" style="color:#111">前往「我的 illurl」管理</a></p>
    <hr style="border:none;border-top:1px solid #e8e6df;margin:24px 0">
    <p style="font-size:11px;color:#999">© ${SITE_NAME}</p>
  </div>
</body></html>`;
}

export const Route = createFileRoute("/api/public/hooks/illurl-expiry-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-notify-secret");
        if (!secret || secret !== process.env.PUSH_NOTIFY_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = Date.now();
        const windowEnd = new Date(now + REMIND_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const nowIso = new Date(now).toISOString();

        const [{ data: links }, { data: files }] = await Promise.all([
          supabaseAdmin
            .from("short_links")
            .select("code, target_url, created_by, expires_at, expiry_reminder_sent_at" as any)
            .not("expires_at", "is", null)
            .lte("expires_at", windowEnd)
            .gte("expires_at", nowIso)
            .is("expiry_reminder_sent_at" as any, null),
          supabaseAdmin
            .from("short_files")
            .select("code, filename, created_by, expires_at, expiry_reminder_sent_at" as any)
            .not("expires_at", "is", null)
            .lte("expires_at", windowEnd)
            .gte("expires_at", nowIso)
            .is("expiry_reminder_sent_at" as any, null),
        ]);

        // Group by user
        const buckets = new Map<string, { links: any[]; files: any[] }>();
        for (const r of (links ?? []) as any[]) {
          if (!r.created_by) continue;
          if (!buckets.has(r.created_by)) buckets.set(r.created_by, { links: [], files: [] });
          buckets.get(r.created_by)!.links.push(r);
        }
        for (const r of (files ?? []) as any[]) {
          if (!r.created_by) continue;
          if (!buckets.has(r.created_by)) buckets.set(r.created_by, { links: [], files: [] });
          buckets.get(r.created_by)!.files.push(r);
        }

        let sent = 0;
        const donateUrl = `${SITE_URL}/donate`;
        const myUrl = `${SITE_URL}/my/illurl`;

        for (const [userId, group] of buckets) {
          try {
            const { data: ures } = await supabaseAdmin.auth.admin.getUserById(userId);
            const email = ures?.user?.email;
            if (!email) continue;

            const itemsHtml =
              group.links
                .map(
                  (l) =>
                    `<li><code>illusd.com/${l.code}</code> → ${l.target_url} <br><small>到期：${new Date(l.expires_at).toLocaleString("zh-TW")}</small></li>`,
                )
                .join("") +
              group.files
                .map(
                  (f) =>
                    `<li><code>illusd.com/f/${f.code}</code> · ${f.filename} <br><small>到期：${new Date(f.expires_at).toLocaleString("zh-TW")}</small></li>`,
                )
                .join("");

            const html = renderHtml({ itemsHtml, donateUrl, myUrl });
            const messageId = `illurl-expiry-${userId}-${new Date().toISOString().slice(0, 10)}`;

            await supabaseAdmin.from("email_send_log").insert({
              message_id: messageId,
              template_name: "illurl_expiry_reminder",
              recipient_email: email,
              status: "pending",
            } as any);

            const { error: enqErr } = await supabaseAdmin.rpc("enqueue_email" as any, {
              queue_name: "transactional_emails",
              payload: {
                message_id: messageId,
                to: email,
                from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
                sender_domain: SENDER_DOMAIN,
                subject: "你的 illurl 即將到期",
                html,
                text: `以下短連結即將於 7 天內到期。前往 ${myUrl} 管理，或於 ${donateUrl} 升級為永久連結。`,
                purpose: "transactional",
                label: "illurl_expiry_reminder",
                queued_at: new Date().toISOString(),
              },
            });

            if (enqErr) {
              await supabaseAdmin.from("email_send_log").insert({
                message_id: messageId,
                template_name: "illurl_expiry_reminder",
                recipient_email: email,
                status: "failed",
                error_message: enqErr.message,
              } as any);
              continue;
            }

            // Mark reminder sent
            const linkCodes = group.links.map((l) => l.code);
            const fileCodes = group.files.map((f) => f.code);
            if (linkCodes.length) {
              await supabaseAdmin
                .from("short_links")
                .update({ expiry_reminder_sent_at: new Date().toISOString() } as any)
                .in("code", linkCodes);
            }
            if (fileCodes.length) {
              await supabaseAdmin
                .from("short_files")
                .update({ expiry_reminder_sent_at: new Date().toISOString() } as any)
                .in("code", fileCodes);
            }
            sent++;
          } catch (e) {
            console.warn("illurl reminder failed for user", userId, e);
          }
        }

        return Response.json({ ok: true, recipients: sent, candidates: buckets.size });
      },
    },
  },
});
