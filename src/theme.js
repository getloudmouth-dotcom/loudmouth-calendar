// ── Loudmouth Design System ───────────────────────────────────────────────────
// Single source of truth for all styles. Import from here before writing any
// inline styles. Never hardcode colors, fonts, or button patterns elsewhere.
//
// shadcn/ui components pick up the CSS variables in index.css automatically.
// Inline-style components use these JS token objects directly.

// Typography
export const SANS = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif";
export const MONO = "'Space Mono', 'Courier New', monospace";
export const DISP = "'Anton', Impact, Helvetica, sans-serif";

// Color palette
export const C = {
  canvas:   "#131313",
  surface:  "#1e1e1e",
  surface2: "#2a2a2a",
  accent:   "#CCFF00",   // chartreuse brand — primary CTAs, active states
  text:     "#ffffff",
  meta:     "#a0a0a0",
  border:   "rgba(255,255,255,0.14)",
  error:    "#E8001C",
};

// ── Buttons ───────────────────────────────────────────────────────────────────
// All action buttons share 10px vertical padding so they render at the same height.
// Never override padding to resize a button in context — change the token if needed.
// Never pass flex: 1 as an override — buttons must size to content.
// Use BTN_ROW as the container; make the container full-width if needed.

export const btn = (override = {}) => ({
  border: `1px solid ${C.border}`, borderRadius: 24, background: "transparent",
  color: C.meta, fontFamily: MONO, fontSize: 10, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "1.5px", cursor: "pointer",
  lineHeight: 1, whiteSpace: "nowrap", transition: "all 0.15s", ...override,
});

export const primaryBtn = {
  background: C.accent, color: "#000", border: "none", borderRadius: 24,
  padding: "10px 20px", fontSize: 11, fontWeight: 700, cursor: "pointer",
  fontFamily: MONO, textTransform: "uppercase", letterSpacing: "1.5px",
  lineHeight: 1, whiteSpace: "nowrap",
};

export const ghostBtn = {
  background: "transparent", color: C.meta, border: `1px solid ${C.border}`,
  borderRadius: 24, padding: "10px 12px", fontSize: 10, fontWeight: 700,
  cursor: "pointer", fontFamily: MONO, textTransform: "uppercase",
  letterSpacing: "1.5px", lineHeight: 1, whiteSpace: "nowrap", transition: "all 0.15s",
};

export const dangerBtn = {
  background: "none", color: C.error, border: `1px solid rgba(232,0,28,0.35)`,
  borderRadius: 24, fontFamily: MONO, fontWeight: 700, fontSize: 10,
  textTransform: "uppercase", letterSpacing: "1px", padding: "10px 14px",
  cursor: "pointer", lineHeight: 1, whiteSpace: "nowrap",
};

// ── Forms ─────────────────────────────────────────────────────────────────────

export const INPUT = {
  width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`,
  borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box",
  background: C.canvas, color: C.text, fontFamily: SANS, lineHeight: 1,
};

export const LABEL = {
  fontSize: 10, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px",
  display: "block", marginBottom: 4, fontWeight: 600, fontFamily: MONO, lineHeight: 1,
};

// ── Button row container ──────────────────────────────────────────────────────

// Always wrap button groups in BTN_ROW. Buttons size to content — never flex: 1.
export const BTN_ROW = {
  display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
};

// ── Layout primitives ─────────────────────────────────────────────────────────

export const CARD = {
  background: C.surface, borderRadius: 12,
  border: `1px solid ${C.border}`, padding: 20,
};

export const MODAL = {
  background: C.surface, borderRadius: 14, padding: 32,
  border: `1px solid ${C.border}`,
  boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
};

// ── Micro-components ──────────────────────────────────────────────────────────

export const BADGE = {
  borderRadius: 20, padding: "2px 8px", fontSize: 9, fontWeight: 700,
  fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.8px",
  lineHeight: 1, whiteSpace: "nowrap",
};

export const SECTION_HEADER = {
  fontFamily: MONO, fontSize: 10, fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "1.8px",
  color: C.meta, whiteSpace: "nowrap",
};

// ── Page header bar ───────────────────────────────────────────────────────────

// Wrapper for every portal's top header bar. Contains PAGE_TITLE + optional actions.
export const PAGE_HEADER = {
  padding: "16px 44px", background: C.canvas,
  borderBottom: `1px solid ${C.border}`,
  display: "flex", alignItems: "center", gap: 16,
};

// Portal title text inside PAGE_HEADER.
export const PAGE_TITLE = {
  fontFamily: MONO, fontSize: 11, fontWeight: 700,
  color: C.text, textTransform: "uppercase", letterSpacing: "2px",
  lineHeight: 1, whiteSpace: "nowrap",
};
