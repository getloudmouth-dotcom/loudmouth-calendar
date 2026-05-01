import { useState, useEffect } from "react";
import AppDialog from "./AppDialog";
import { C, SANS, BTN_ROW, primaryBtn, ghostBtn, LABEL } from "../theme";
import { MONTHS } from "../constants";

// Generic month/year picker. Callers compute the defaults — the dialog itself
// has no opinion about whether it's creating a new month or rekeying an
// existing one.
export default function NewMonthDialog({
  open,
  onClose,
  onConfirm,
  defaultMonth,
  defaultYear,
  title = "New Month",
  confirmLabel = "Create",
}) {
  const [month, setMonth] = useState(defaultMonth ?? new Date().getMonth());
  const [year, setYear] = useState(defaultYear ?? new Date().getFullYear());

  useEffect(() => {
    if (open) {
      setMonth(defaultMonth ?? new Date().getMonth());
      setYear(defaultYear ?? new Date().getFullYear());
    }
  }, [open, defaultMonth, defaultYear]);

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 1; y <= currentYear + 3; y++) years.push(y);

  const selectStyle = {
    width: "100%", padding: "10px 14px",
    background: C.canvas, color: C.text,
    border: `1.5px solid ${C.border}`, borderRadius: 8,
    fontSize: 13, fontFamily: SANS, outline: "none",
    boxSizing: "border-box",
  };

  return (
    <AppDialog open={open} onClose={onClose} title={title} width={380}>
      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={LABEL}>Month</div>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            style={selectStyle}
          >
            {MONTHS.map((name, idx) => (
              <option key={idx} value={idx}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={LABEL}>Year</div>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={selectStyle}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ ...BTN_ROW, justifyContent: "flex-end", marginTop: 24 }}>
        <button style={ghostBtn} onClick={onClose}>Cancel</button>
        <button
          style={primaryBtn}
          onClick={() => { onConfirm({ month, year }); onClose(); }}
        >
          {confirmLabel}
        </button>
      </div>
    </AppDialog>
  );
}
