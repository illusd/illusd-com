import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Apple-style 留言成功 overlay。完全黑底，白色描邊圓圈 + 勾勾動畫。
 * 顯示約 2.2 秒後自動關閉；點擊任何位置可立即關閉。
 */
export function CommentSuccessOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, 2200);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  const title =
    i18n.language === "ja" ? "コメント送信完了！"
    : i18n.language === "en" ? "Comment posted!"
    : "留言成功！";
  const subtitle =
    i18n.language === "ja" ? "コメントが公開されました"
    : i18n.language === "en" ? "Your comment is now live"
    : "您的評論已順利發佈並公開顯示";

  // suppress unused warning – t kept for future
  void t;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black select-none cursor-pointer"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <style>{`
        @keyframes cs-pop { 0% { transform: scale(.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes cs-draw-circle { to { stroke-dashoffset: 0; } }
        @keyframes cs-draw-check  { to { stroke-dashoffset: 0; } }
        @keyframes cs-text-in     { to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div className="text-center flex flex-col items-center justify-center">
        <div
          className="mb-9"
          style={{
            width: 105,
            height: 105,
            animation: "cs-pop .6s cubic-bezier(.16,1,.3,1) forwards",
          }}
        >
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#fff"
              strokeWidth={7}
              strokeLinecap="round"
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "center",
                strokeDasharray: 264,
                strokeDashoffset: 264,
                animation: "cs-draw-circle .85s cubic-bezier(.4,0,.2,1) forwards",
              }}
            />
            <path
              d="M33 51.5 L44 62.5 L67 38.5"
              fill="none"
              stroke="#fff"
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 60,
                strokeDashoffset: 60,
                animation: "cs-draw-check .4s cubic-bezier(.4,0,.2,1) .65s forwards",
              }}
            />
          </svg>
        </div>
        <h1
          className="m-0"
          style={{
            color: "#fff",
            fontSize: "2.3rem",
            fontWeight: 500,
            letterSpacing: 1,
            whiteSpace: "nowrap",
            opacity: 0,
            transform: "translateY(12px)",
            animation: "cs-text-in .8s cubic-bezier(.25,1,.5,1) .45s forwards",
          }}
        >
          {title}
        </h1>
        <p
          className="m-0 mt-3"
          style={{
            color: "#86868b",
            fontSize: "1.05rem",
            letterSpacing: 0.5,
            opacity: 0,
            transform: "translateY(12px)",
            animation: "cs-text-in .8s cubic-bezier(.25,1,.5,1) .65s forwards",
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}
