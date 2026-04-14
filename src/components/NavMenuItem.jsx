import { useState } from "react";

export default function NavMenuItem({ onClick, color = "#333", children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: "100%", padding: "10px 16px", background: hovered ? "#f7f7f7" : "none", border: "none", textAlign: "left", fontSize: 13, color, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "background 0.12s", boxShadow: hovered ? "inset 0 0 0 1px rgba(0,0,0,0.04)" : "none" }}
    >{children}</button>
  );
}
