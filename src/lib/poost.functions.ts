import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

async function requireCreatorUserId(): Promise<string> {
  const auth = getRequest().headers.get("authorization");
  if (!auth || !/^Bearer\s+/i.test(auth)) throw new Error("請先登入創作者帳號");
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) throw new Error("請先登入創作者帳號");
  const email = (data.user.email ?? "").toLowerCase();
  const { data: isCreator } = await supabaseAdmin.rpc("is_creator_by_email" as any, { _email: email });
  if (!isCreator) throw new Error("只有創作者可以發布 Poost");
  return data.user.id;
}

export const createPoostAsCreator = createServerFn({ method: "POST" })
  .inputValidator((data: { content: string }) => data)
  .handler(async ({ data }) => {
    const authorId = await requireCreatorUserId();
    const content = data.content?.trim();
    if (!content) throw new Error("請輸入 Poost 內容");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("poosts" as any)
      .insert({ author_id: authorId, content } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id as string };
  });
