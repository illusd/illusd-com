import { useEffect, useRef, useState } from "react";
import { CAP_DIFFICULTY, genChallenge, sha256Hex } from "@/lib/cap";

const PREFIX = "0".repeat(CAP_DIFFICULTY);

type Status = "idle" | "working" | "done" | "error";

export function CapCaptcha({ onVerified }: { onVerified: (token: string | null) => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const ranRef = useRef(false);

  const solve = async () => {
    setStatus("working");
    onVerified(null);
    try {
      const challenge = genChallenge();
      let nonce = 0;
      while (true) {
        const hash = await sha256Hex(`${challenge}:${nonce}`);
        if (hash.startsWith(PREFIX)) break;
        nonce++;
        if ((nonce & 1023) === 0) {
          // yield to UI thread periodically
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      const token = `${challenge}:${nonce}:${Date.now()}`;
      setStatus("done");
      onVerified(token);
    } catch {
      setStatus("error");
      onVerified(null);
    }
  };

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    void solve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="border hairline px-3 py-2 flex items-center gap-3 text-xs">
      <div
        className={`w-2.5 h-2.5 rounded-full ${
          status === "done"
            ? "bg-foreground"
            : status === "error"
              ? "bg-destructive"
              : "bg-muted-foreground animate-pulse"
        }`}
      />
      <div className="flex-1">
        {status === "idle" && "準備人機驗證…"}
        {status === "working" && "Cap 人機驗證中…"}
        {status === "done" && "已通過人機驗證"}
        {status === "error" && (
          <button type="button" onClick={solve} className="underline">
            驗證失敗，重新嘗試
          </button>
        )}
      </div>
      <div className="text-[10px] tracking-[0.3em] text-muted-foreground">CAP</div>
    </div>
  );
}
