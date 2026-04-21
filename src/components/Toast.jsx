const MONO = "'Space Mono', 'Courier New', monospace";

export default function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === "success" ? "rgba(127,217,158,0.15)" : toast.type === "error" ? "rgba(255,68,68,0.12)" : "#1e1e1e";
  const color = toast.type === "success" ? "#7fd99e" : toast.type === "error" ? "#ff4444" : "#ffffff";
  const border = toast.type === "success" ? "1px solid #7fd99e" : toast.type === "error" ? "1px solid #ff4444" : "1px solid rgba(255,255,255,0.14)";
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 99999, background: bg, color, border, borderRadius: 12, padding: "10px 18px", fontSize: 11, fontWeight: 700, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "1px", lineHeight: 1, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", pointerEvents: "none", animation: "fadeInUp 0.2s ease" }}>
      {toast.msg}
    </div>
  );
}
