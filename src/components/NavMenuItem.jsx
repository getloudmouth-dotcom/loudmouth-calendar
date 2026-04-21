import { useState } from "react";

const SANS = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif";

export default function NavMenuItem({ onClick, color, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: "100%", padding: "9px 16px", background: hovered ? "rgba(255,255,255,0.06)" : "transparent", border: "none", textAlign: "left", fontSize: 13, color: color || "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "background 0.12s", fontFamily: SANS, lineHeight: 1 }}
    >{children}</button>
  );
}
