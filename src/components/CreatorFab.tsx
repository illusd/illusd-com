import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function CreatorFab() {
  const { isCreator } = useAuth();
  if (!isCreator) return null;
  return (
    <Link
      to="/new-article"
      aria-label="新增文章"
      className="fixed bottom-6 right-6 z-20 h-14 w-14 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:opacity-90 transition"
    >
      <Plus size={24} strokeWidth={1.5} />
    </Link>
  );
}
