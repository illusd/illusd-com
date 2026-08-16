// Server-only: verify the bearer token belongs to a registered creator.
import { getRequest } from "@tanstack/react-start/server";

export async function requireCreatorUserId(): Promise<string> {
  const auth = getRequest().headers.get("authorization");
  if (!auth || !/^Bearer\s+/i.test(auth)) throw new Error("請先登入創作者帳號");
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) throw new Error("請先登入創作者帳號");
  const email = (data.user.email ?? "").toLowerCase();
  const { data: isCreator } = await supabaseAdmin.rpc("is_creator_by_email" as any, { _email: email });
  if (!isCreator) throw new Error("只有創作者可以匯出資料");
  return data.user.id;
}
