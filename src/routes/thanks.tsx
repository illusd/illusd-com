import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { FullscreenStateOverlay } from "@/components/animations/AppleStateAnimation";

export const Route = createFileRoute("/thanks")({
  head: () => ({
    meta: [
      { title: "謝謝您的贊助 — illusd" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThanksPage,
});

function ThanksPage() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/" }), 3000);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <FullscreenStateOverlay
      variant="success"
      title="謝謝您的贊助！"
      subtitle="感謝您的支持，我們會繼續努力"
    />
  );
}
