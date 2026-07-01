import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

async function requireCreatorUser(): Promise<{ userId: string }> {
  const auth = getRequest().headers.get("authorization");
  if (!auth || !/^Bearer\s+/i.test(auth)) throw new Error("請先登入創作者帳號");
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) throw new Error("請先登入創作者帳號");
  const email = (data.user.email ?? "").toLowerCase();
  const { data: isCreator } = await supabaseAdmin.rpc("is_creator_by_email" as any, { _email: email });
  if (!isCreator) throw new Error("僅創作者可操作");
  return { userId: data.user.id };
}

function randomFilmId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint32Array(8);
  crypto.getRandomValues(arr);
  let out = "";
  for (const n of arr) out += chars[n % chars.length];
  return out;
}

function random6Digits(): string {
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  let out = "";
  for (const n of arr) out += (n % 10).toString();
  return out;
}

export interface RednoteFilm {
  id: string;
  film_id: string;
  title: string;
  target_url: string | null;
  video_path: string | null;
  video_mime: string | null;
  created_at: string;
}

export const listRednoteFilms = createServerFn({ method: "POST" }).handler(async (): Promise<RednoteFilm[]> => {
  await requireCreatorUser();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("rednote_films" as any)
    .select("id, film_id, title, target_url, video_path, video_mime, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RednoteFilm[];
});

export const createRednoteFilm = createServerFn({ method: "POST" })
  .inputValidator((d: { title: string; targetUrl?: string; filename?: string; mime?: string; size?: number }) => d)
  .handler(async ({ data }) => {
    const { userId } = await requireCreatorUser();
    const title = (data.title ?? "").trim();
    if (!title) throw new Error("請輸入標題");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let film_id = "";
    for (let i = 0; i < 6; i++) {
      const c = randomFilmId();
      const { data: row } = await supabaseAdmin.from("rednote_films" as any).select("film_id").eq("film_id", c).maybeSingle();
      if (!row) { film_id = c; break; }
    }
    if (!film_id) throw new Error("生成 film-id 失敗");

    let videoPath: string | null = null;
    let uploadUrl: string | null = null;
    let uploadToken: string | null = null;
    if (data.filename && data.size && data.size > 0) {
      const ext = data.filename.includes(".") ? data.filename.split(".").pop()!.toLowerCase().slice(0, 8) : "mp4";
      videoPath = `${film_id}/${crypto.randomUUID()}.${ext}`;
      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from("rednote-videos")
        .createSignedUploadUrl(videoPath);
      if (signErr || !signed) throw new Error(signErr?.message ?? "建立上傳連結失敗");
      uploadUrl = signed.signedUrl;
      uploadToken = signed.token;
    }

    const { error: insErr } = await supabaseAdmin.from("rednote_films" as any).insert({
      film_id,
      title,
      target_url: data.targetUrl?.trim() || null,
      video_path: videoPath,
      video_mime: data.mime ?? null,
      created_by: userId,
    } as any);
    if (insErr) throw new Error(insErr.message);

    return { film_id, uploadUrl, uploadToken, videoPath };
  });

export const deleteRednoteFilm = createServerFn({ method: "POST" })
  .inputValidator((d: { film_id: string }) => d)
  .handler(async ({ data }) => {
    await requireCreatorUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("rednote_films" as any).select("video_path").eq("film_id", data.film_id).maybeSingle();
    const vp = (row as any)?.video_path as string | null | undefined;
    if (vp) await supabaseAdmin.storage.from("rednote-videos").remove([vp]);
    const { error } = await supabaseAdmin.from("rednote_films" as any).delete().eq("film_id", data.film_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateOpenCode = createServerFn({ method: "POST" })
  .inputValidator((d: { film_id: string }) => d)
  .handler(async ({ data }) => {
    const { userId } = await requireCreatorUser();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let open_id = "";
    for (let i = 0; i < 10; i++) {
      const c = random6Digits();
      const { data: row } = await supabaseAdmin
        .from("rednote_open_codes" as any).select("id").eq("film_id", data.film_id).eq("open_id", c).maybeSingle();
      if (!row) { open_id = c; break; }
    }
    if (!open_id) throw new Error("生成開啟碼失敗");
    const { error } = await supabaseAdmin.from("rednote_open_codes" as any).insert({
      film_id: data.film_id, open_id, created_by: userId,
    } as any);
    if (error) throw new Error(error.message);
    return { open_id, url: `/rednote/cn/film-id=${data.film_id}/open-id=${open_id}` };
  });
