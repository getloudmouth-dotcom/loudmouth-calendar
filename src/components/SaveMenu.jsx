import { useState } from "react";
import NavMenuItem from "./NavMenuItem";
import { C } from "../theme";

export default function SaveMenu({ onSave, onExport, showExport }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: "#D7FA06", color: "#111", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        💾 Save
        <span style={{ fontSize: 9, display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▾</span>
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.5)", minWidth: 170, overflow: "hidden", zIndex: 200 }}>
            <NavMenuItem onClick={() => { setOpen(false); onSave(); }}>💾 Save Draft</NavMenuItem>
            {showExport && <NavMenuItem onClick={() => { setOpen(false); onExport(); }}>↓ Export PDF</NavMenuItem>}
          </div>
        </>
      )}
    </div>
  );
}
