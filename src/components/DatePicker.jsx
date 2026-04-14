import { useState } from "react";
import { getDayName, formatDate } from "../utils";

export default function DatePicker({ day, month, year, daysInMonth, selectedDays, onChangeDay }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)} style={{ background: "#1a1a2e", color: "white", borderRadius: 20, padding: "6px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 6 }}>
        {getDayName(year, month, day)} {formatDate(month, day)}
        <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "110%", left: 0, zIndex: 999, background: "white", border: "1.5px solid #e0e0e0", borderRadius: 10, padding: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 220 }}>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontWeight: 600 }}>Change date</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 9, color: "#ccc", fontWeight: 700, padding: "2px 0" }}>{d}</div>
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
                  background: isSelected ? "#1a1a2e" : "transparent",
                  color: isSelected ? "#D7FA06" : isTaken ? "#ddd" : "#333",
                  transition: "all 0.1s",
                }}onMouseEnter={e => e.currentTarget.style.background = "#f0f0f0"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >{d}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
