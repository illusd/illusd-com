import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ImagePlus, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { prepareFeedbackImage, submitFeedback } from "@/lib/feedback.functions";

export const Route = createFileRoute("/feedback")({
  head: () => ({ meta: [{ title: "回饋 — illusd.com" }, { name: "description", content: "送出 illusd.com 使用回饋與截圖。" }] }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const { t } = useTranslation();
  const prepareImage = useServerFn(prepareFeedbackImage);
  const submit = useServerFn(submitFeedback);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 4)) {
        const prep = await prepareImage({ data: { filename: file.name, mime: file.type || "image/jpeg", size: file.size } });
        const { error } = await supabase.storage.from("illurl-files").uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type || "image/jpeg" });
        if (error) throw error;
        uploaded.push(prep.url);
      }
      setImages((prev) => [...prev, ...uploaded]);
      toast.success(t("feedback.uploaded"));
    } catch (err) {
      toast.error((err as Error).message || t("upload.failed", { message: "" }));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await submit({ data: { email, message, imageUrls: images } });
      setMessage("");
      setImages([]);
      toast.success(t("feedback.sent"));
    } catch (err) {
      toast.error((err as Error).message || t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link to="/" className="text-xs tracking-widest text-muted-foreground">{t("common.back_home")}</Link>
      <h1 className="font-serif text-3xl mt-6">{t("feedback.title")}</h1>
      <p className="text-sm text-muted-foreground mt-2">{t("feedback.desc")}</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <section>
          <label className="block text-xs tracking-widest text-muted-foreground mb-2">{t("auth.email")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-transparent border-b hairline py-2 focus:outline-none focus:border-foreground" />
        </section>
        <section>
          <label className="block text-xs tracking-widest text-muted-foreground mb-2">{t("feedback.message")}</label>
          <textarea required rows={8} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("feedback.placeholder")} className="w-full bg-transparent border hairline p-3 text-sm leading-relaxed focus:outline-none focus:border-foreground" />
        </section>
        <section className="border hairline p-4">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer hover:opacity-70">
            <ImagePlus size={16} strokeWidth={1.5} />
            {uploading ? t("upload.uploading") : t("feedback.upload")}
            <input type="file" accept="image/*" multiple className="sr-only" disabled={uploading} onChange={(e) => uploadImages(e.target.files)} />
          </label>
          {images.length > 0 && <ul className="mt-3 text-xs space-y-1">{images.map((u) => <li key={u}><a href={u} className="underline break-all" target="_blank" rel="noreferrer">{u}</a></li>)}</ul>}
        </section>
        <button disabled={busy || !message.trim()} className="w-full bg-foreground text-background py-3 text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
          <Send size={15} strokeWidth={1.5} /> {busy ? t("feedback.sending") : t("feedback.send")}
        </button>
      </form>
    </main>
  );
}
