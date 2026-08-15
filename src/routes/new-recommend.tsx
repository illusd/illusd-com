import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { createRecommendationAsCreator } from "@/lib/recommend.functions";

export const Route = createFileRoute("/new-recommend")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "新增推薦平台 — illusd.com" },
      { name: "description", content: "創作者新增推薦平台：名稱、網址與推薦說明。" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "新增推薦平台 — illusd.com" },
      { property: "og:description", content: "創作者新增推薦平台。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewRecommendPage,
});

function NewRecommendPage() {
  const { isCreator } = useAuth();
  const navigate = useNavigate();
  const create = useServerFn(createRecommendationAsCreator);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isCreator) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-serif text-2xl">只有創作者可以建立推薦</h1>
      </main>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: { name, url, description } });
      toast.success("已新增推薦");
      navigate({ to: "/recommend" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg px-5 py-14">
      <h1 className="font-serif text-3xl">新增推薦</h1>
      <form onSubmit={onSubmit} className="mt-10 space-y-6">
        <div>
          <label className="block text-xs tracking-wider text-muted-foreground mb-1">平台名稱</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border-b hairline py-2 text-sm focus:outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="block text-xs tracking-wider text-muted-foreground mb-1">平台網址</label>
          <input
            required
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-transparent border-b hairline py-2 text-sm focus:outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="block text-xs tracking-wider text-muted-foreground mb-1">推薦說明</label>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-transparent border hairline p-3 text-sm focus:outline-none focus:border-foreground"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-foreground text-background py-3 text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50"
        >
          發布推薦
        </button>
      </form>
    </main>
  );
}
