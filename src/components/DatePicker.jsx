import { useState } from "react";
import { getDayName, formatDate } from "../utils";
import { C } from "../theme";

export default function DatePicker({ day, month, year, daysInMonth, selectedDays, onChangeDay }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)} style={{ background: C.surface, color: C.text, borderRadius: 20, padding: "6px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 6 }}>
        {getDayName(year, month, day)} {formatDate(month, day)}
        <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "110%", left: 0, zIndex: 999, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", minWidth: 220 }}>
          <div style={{ fontSize: 11, color: C.meta, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontWeight: 600 }}>Change date</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 9, color: C.meta, fontWeight: 700, padding: "2px 0" }}>{d}</div>
            ))}
            {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const isSelected = d === day;
              const isTaken = selectedDays.includes(d) && d !== day;
              return (
                <div key={d} onClick={() => { if (isTaken) return; onChangeDay(d); setOpen(false); }} style={{
                  textAlign: "center", padding: "5px 2px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  cursor: isTaken ? "not-allowed" : "pointer",
                  background: isSelected ? C.canvas : "transparent",
                  color: isSelected ? C.accent : isTaken ? C.meta : C.text,
                  transition: "all 0.1s",
                }}onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                onMouseLeave={e => e.currentTarget.style.background = isSelected ? C.canvas : "transparent"}
              >{d}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
