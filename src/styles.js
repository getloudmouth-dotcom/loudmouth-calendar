/* Shared design tokens — dark system, Loudmouth branded */

export const labelStyle = {
  fontSize: 10,
  color: "#949494",
  textTransform: "uppercase",
  letterSpacing: "1.5px",
  display: "block",
  marginBottom: 4,
  fontWeight: 600,
  fontFamily: "'Space Mono', monospace",
  lineHeight: 1,
};

export const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  border: "1.5px solid rgba(255,255,255,0.14)",
  borderRadius: 8,
  fontSize: 13,
  outline: "none",
  fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  transition: "border-color 0.15s",
  background: "#131313",
  color: "#ffffff",
  boxSizing: "border-box",
};

/* Primary: chartreuse fill, black text, pill shape */
export const primaryBtn = {
  background: "#CCFF00",
  color: "#000000",
  border: "none",
  padding: "10px 20px",
  borderRadius: 24,
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  fontFamily: "'Space Mono', monospace",
  transition: "background 0.18s",
  lineHeight: 1,
};

/* Secondary: ghost pill */
export const secondaryBtn = {
  background: "transparent",
  color: "#949494",
  border: "1px solid rgba(255,255,255,0.14)",
  padding: "8px 16px",
  borderRadius: 24,
  fontSize: 10,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  fontFamily: "'Space Mono', monospace",
  transition: "all 0.15s",
  lineHeight: 1,
};
