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
  success:  "#7fd99e",
  warn:     "#ff6b6b",
  note:     "#FFE94D",   // sticky-note yellow — posting notes overlay
  noteText: "#2A2200",   // solid dark text on note
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

// ── Section display heading ───────────────────────────────────────────────────
// Use for main content-area section titles inside portals and panels.
// Pattern:
//   <div style={{ marginBottom: 40 }}>
//     <div style={DISPLAY_TITLE}>Section Name</div>
//     <div style={DISPLAY_SUBTITLE}>optional description or count</div>
//   </div>

export const DISPLAY_TITLE = {
  fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -0.5,
};

export const DISPLAY_SUBTITLE = {
  marginTop: 8, fontFamily: SANS, fontSize: 13, color: C.meta,
};

// ── Auth / setup screens ──────────────────────────────────────────────────────
// Used by AuthView, InviteSetupView, ProfileSetupView. AUTH_SHELL is the full-
// screen wrapper; AUTH_CARD is the centered card. Keep these in sync across the
// three views so the auth flow feels like one set.

export const AUTH_SHELL = {
  minHeight: "100vh", background: C.canvas,
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: SANS, padding: "24px 16px",
};

export const AUTH_CARD = {
  background: C.surface, borderRadius: 16, padding: 32,
  width: "100%", maxWidth: 380,
  border: `1px solid ${C.border}`,
  boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
  boxSizing: "border-box",
};

// ── Segmented control ─────────────────────────────────────────────────────────
// Two-or-more equal-width buttons sharing one rounded container (e.g., the
// Log In / Sign Up toggle on AuthView). Segmented controls intentionally use
// flex: 1 — the "no flex: 1" rule applies to action buttons in BTN_ROW, not to
// segments which must be equal width by definition.

export const SEGMENT_GROUP = {
  display: "flex",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  overflow: "hidden",
};

export const segmentBtn = (active) => ({
  flex: 1, padding: "9px 0",
  background: active ? C.accent : "transparent",
  color: active ? "#000" : C.meta,
  border: "none", cursor: "pointer",
  fontFamily: MONO, fontSize: 10, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "1px",
  lineHeight: 1, transition: "all 0.15s",
});

// ── Document / paper surface ──────────────────────────────────────────────────
// Mirrors the white-page styling used by CalendarPage.jsx (the Calendar Builder
// preview). Use anywhere a surface should read as a printable artifact.

export const DOC = {
  page:         "#ffffff",
  text:         "#111111",
  meta:         "#555555",
  metaSoft:     "#888888",
  border:       "#e8e8e8",
  borderStrong: "#d0d0d0",
  accent:       "#1a1a2e",
  cell:         "#f7f7f7",
};

export const DOC_PAGE_OUTER = {
  padding: "32px 24px 100px",
  background: C.canvas,
};

export const DOC_PAGE = {
  background: DOC.page,
  color: DOC.text,
  maxWidth: 900,
  margin: "0 auto",
  padding: "56px 64px",
  border: `1px solid ${DOC.border}`,
  borderRadius: 2,
  boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
  fontFamily: SANS,
  boxSizing: "border-box",
};

export const DOC_INPUT = {
  ...INPUT,
  background: DOC.page,
  color: DOC.text,
  border: `1.5px solid ${DOC.border}`,
};

export const DOC_LABEL = {
  ...LABEL,
  color: DOC.meta,
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
