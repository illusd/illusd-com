import { LegalFooterLinks } from "@/components/SiteFooter";

type Variant = "success" | "error";

interface Props {
  variant?: Variant;
  title: string;
  subtitle: string;
}

const CSS = `
@keyframes asa-pop { 0%{transform:scale(0.8);opacity:0} 100%{transform:scale(1);opacity:1} }
@keyframes asa-draw { to { stroke-dashoffset: 0 } }
@keyframes asa-fadeUp { to { opacity:1; transform:translateY(0) } }
.asa-svg { width:105px; height:105px; margin-bottom:35px; animation: asa-pop 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
.asa-circle { stroke:#fff; stroke-width:7; stroke-linecap:round; fill:none; transform:rotate(-90deg); transform-origin:center; stroke-dasharray:264; stroke-dashoffset:264; animation: asa-draw 0.85s cubic-bezier(0.4,0,0.2,1) forwards; }
.asa-check { stroke:#fff; stroke-width:7; stroke-linecap:round; stroke-linejoin:round; fill:none; stroke-dasharray:60; stroke-dashoffset:60; animation: asa-draw 0.4s cubic-bezier(0.4,0,0.2,1) 0.65s forwards; }
.asa-cross1 { stroke:#fff; stroke-width:7; stroke-linecap:round; fill:none; stroke-dasharray:40; stroke-dashoffset:40; animation: asa-draw 0.3s cubic-bezier(0.4,0,0.2,1) 0.65s forwards; }
.asa-cross2 { stroke:#fff; stroke-width:7; stroke-linecap:round; fill:none; stroke-dasharray:40; stroke-dashoffset:40; animation: asa-draw 0.3s cubic-bezier(0.4,0,0.2,1) 0.75s forwards; }
.asa-title { color:#fff; font-size:2.3rem; font-weight:500; margin:0 0 12px 0; letter-spacing:1px; white-space:nowrap; opacity:0; transform:translateY(12px); animation: asa-fadeUp 0.8s cubic-bezier(0.25,1,0.5,1) 0.45s forwards; font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif; }
.asa-sub { color:#86868b; font-size:1.05rem; font-weight:400; margin:0; letter-spacing:0.5px; opacity:0; transform:translateY(12px); animation: asa-fadeUp 0.8s cubic-bezier(0.25,1,0.5,1) 0.65s forwards; font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif; }
`;

export function AppleStateAnimation({ variant = "success", title, subtitle }: Props) {
  return (
    <>
      <style>{CSS}</style>
      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="asa-svg">
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <circle className="asa-circle" cx="50" cy="50" r="42" />
            {variant === "success" ? (
              <path className="asa-check" d="M33 51.5 L44 62.5 L67 38.5" />
            ) : (
              <>
                <line className="asa-cross1" x1="36" y1="36" x2="64" y2="64" />
                <line className="asa-cross2" x1="64" y1="36" x2="36" y2="64" />
              </>
            )}
          </svg>
        </div>
        <h1 className="asa-title">{title}</h1>
        <p className="asa-sub">{subtitle}</p>
      </div>
    </>
  );
}

export function FullscreenStateOverlay(props: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <AppleStateAnimation {...props} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 28 }}>
          <LegalFooterLinks className="text-xs text-white/60" />
        </div>
    </div>
  );
}
