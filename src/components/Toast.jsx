export default function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === "success" ? "#22aa66" : toast.type === "error" ? "#E8001C" : "#1a1a2e";
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 99999, background: bg, color: "white", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 32px rgba(0,0,0,0.22)", letterSpacing: "0.02em", pointerEvents: "none", animation: "fadeInUp 0.2s ease" }}>
      {toast.msg}
    </div>
  );
}
