---
name: Loudmouth HQ
description: Social media operations platform for agency owners who hate boring tools.
colors:
  canvas: "#131313"
  surface: "#1e1e1e"
  surface-raised: "#2a2a2a"
  loudmouth-green: "#CCFF00"
  text-primary: "#ffffff"
  text-secondary: "#a0a0a0"
  border-subtle: "#FFFFFF24"
  error: "#E8001C"
typography:
  display:
    fontFamily: "'Anton', Impact, Helvetica, sans-serif"
    fontSize: "clamp(2rem, 5vw, 4rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0"
  headline:
    fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.5px"
  body:
    fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Space Mono', 'Courier New', monospace"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "1.5px"
rounded:
  input: "8px"
  card: "12px"
  modal: "14px"
  badge: "20px"
  pill: "24px"
spacing:
  xs: "6px"
  sm: "16px"
  md: "20px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.loudmouth-green}"
    textColor: "#000000"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "10px 12px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.error}"
    rounded: "{rounded.pill}"
    padding: "10px 14px"
  input-default:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.input}"
    padding: "10px 14px"
---

# Design System: Loudmouth HQ

## 1. Overview

**Creative North Star: "The Agency Floor"**

Loudmouth HQ is a creative studio running at full capacity: organized, loud, aesthetically uncompromising. The visual system is built for agency owners and social media managers who spend their working hours inside this tool — people who are decisive, time-pressured, and would rather hold a strong position than hedge toward a safe one.

The palette is deep dark with one loud accent. The typography is a three-family system: Anton for display moments, Space Grotesk for reading, Space Mono for interface chrome and metadata. There is no neutral white space — the canvas is near-black, and everything sits on it with purpose. The design is flat by default; depth is conveyed through tonal surface layering rather than shadows. The one exception is the modal layer, which uses a heavy drop shadow to assert clear separation from the content beneath.

This system rejects the enterprise grey of legacy B2B tools (Salesforce, Jira: muted surfaces, cramped type, apology-grey everything) and the minimalist Swiss tradition (ultra-restrained white space, quiet typography, correct-but-joyless). Both fail the same test: they don't take a position. Loudmouth HQ takes a position.

**Key Characteristics:**
- Deep-dark canvas, near-black, no light mode
- One accent color (Loudmouth Green #CCFF00) used with restraint — its rarity is the signal
- Three-family type system where Space Mono owns all interface chrome
- Pill-radius buttons at uniform height; every button group wrapped in BTN_ROW
- Flat surfaces with tonal depth; one modal shadow, nothing else
- Zero decoration: no gradient fills, no glass effects, no ornament

## 2. Colors: The Signal Palette

One charged accent against near-black. The palette works through contrast, not variety.

### Primary
- **Loudmouth Green** (`#CCFF00`): The brand's only saturated color. Primary CTAs, active nav states, focus rings, selected indicators. Appears on ≤10% of any surface at a time — its rarity is what gives it signal.

### Neutral
- **Operations Black** (`#131313`): App canvas and body background. Not pure black; dark enough that everything else reads as elevated above it.
- **Dark Panel** (`#1e1e1e`): Cards, panels, modal backgrounds. The first tonal step above canvas.
- **Raised Surface** (`#2a2a2a`): Elevated interactive surfaces: hover backgrounds, secondary fills, muted interactive zones.
- **Full White** (`#ffffff`): Primary text, card headings.
- **Quiet Type** (`#a0a0a0`): Secondary text, ghost button labels, section headers, supporting metadata.
- **Ghost Border** (`rgba(255,255,255,0.14)` / `#FFFFFF24`): All dividers and strokes. A translucent white that works at every surface depth.

### Destructive
- **Alert Red** (`#E8001C`): Error states, danger button labels, validation failures. Used at need, never decoratively.

**The One Voice Rule.** Loudmouth Green appears on ≤10% of any given screen. It is not a fill, a text decoration, or a background. It appears on primary buttons, active states, focus rings, and selected indicators — and nowhere else. Its scarcity is its authority.

**The Tonal Layers Rule.** Depth is expressed through surface values, not shadows. `canvas → surface → surface-raised` is the three-step elevation stack. Do not add a fourth layer.

## 3. Typography

**Display Font:** Anton (with Impact, Helvetica fallback)
**Body Font:** Space Grotesk (with Helvetica Neue, Arial fallback)
**Label/Mono Font:** Space Mono (with Courier New fallback)

**Character:** A three-family system where each font knows its exact role. Anton commands attention — condensed, authoritative, no effort required. Space Grotesk carries the reading load — warm geometric, legible at small sizes. Space Mono owns interface chrome entirely: every button, label, metadata field, and section header is mono. The combination reads as designed-with-intent rather than system default.

### Hierarchy
- **Display** (Anton, 400, `clamp(2rem, 5vw, 4rem)`, line-height 1.0): Large portal hero titles, major section display headings. Anton is inherently uppercase; do not double-apply `text-transform: uppercase`.
- **Headline** (Space Grotesk, 700, 28px, line-height 1.2, letter-spacing -0.5px): Main content-area section titles (`DISPLAY_TITLE`). Direct, no decoration, slight negative tracking.
- **Title** (Space Grotesk, 700, 16–18px, line-height 1.3): Card headings, subsection labels, list headings.
- **Body** (Space Grotesk, 400, 13px, line-height 1.5): General UI prose, descriptions, form helper text. Cap line length at 65–75ch where readable.
- **Label** (Space Mono, 700, 10px, line-height 1, letter-spacing 1.5px, UPPERCASE): All button text, form labels, section headers, metadata. The interface voice.

**The Mono Owns Chrome Rule.** Any text that is interface structure rather than content — buttons, labels, metadata, nav items, section headers — uses Space Mono. Space Grotesk is for content and reading. The distinction is never negotiable.

## 4. Elevation

This system is flat by default. Depth is expressed through tonal surface layering: `canvas (#131313) → surface (#1e1e1e) → surface-raised (#2a2a2a)`. Most elements carry no box-shadow.

The one exception is the modal layer, which uses a heavy ambient shadow to assert clear Z-position above the content beneath. No other component uses a shadow.

### Shadow Vocabulary
- **Modal drop** (`0 24px 60px rgba(0,0,0,0.5)`): Applied only to modal containers. Conveys hard Z-separation. Not for cards, panels, or hover states.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Do not add `box-shadow` to cards, panels, or interactive elements as decoration or hover feedback. If an element needs to feel elevated, use a darker background or a Ghost Border — not a shadow.

## 5. Components

### Buttons

All action buttons render at the same height: 10px top/bottom padding, line-height 1, `white-space: nowrap`. All variants use full pill radius (24px). Never override padding to resize a button in context — change the token if the height is wrong.

- **Shape:** Full pill (24px radius)
- **Primary:** Loudmouth Green fill (`#CCFF00`), black text, Space Mono 11px uppercase 1.5px tracking, 10px 20px padding. No border.
- **Ghost:** Transparent fill, Quiet Type text (`#a0a0a0`), 1px Ghost Border stroke, Space Mono 10px uppercase, 10px 12px padding.
- **Danger:** Transparent fill, Alert Red text (`#E8001C`), 1px error-tint border (`rgba(232,0,28,0.35)`), Space Mono 10px uppercase, 10px 14px padding.
- **Base:** `btn(override)` — transparent, Ghost Border, Quiet Type, MONO uppercase. Override only what the variant requires.
- **Button Groups:** Always wrapped in `BTN_ROW` (flex, 6px gap, align-items center). Buttons size to content — `flex: 1` is prohibited.

### Inputs / Fields

- **Style:** Canvas background (`#131313`), Full White text, 1.5px Ghost Border stroke, 8px radius (gently curved). Space Grotesk 13px.
- **Labels:** Always Space Mono, 10px, 600 weight, uppercase, 1.5px tracking, Quiet Type color. Block display, 4px margin below.
- **Focus:** Loudmouth Green ring (`--ring: #CCFF00`) via CSS variable.
- **Error:** Alert Red (`#E8001C`) border stroke on validation failure.

### Cards / Containers

- **Corner Style:** Gently curved (12px radius)
- **Background:** Dark Panel (`#1e1e1e`)
- **Shadow Strategy:** None. Elevation via tonal surface contrast against canvas.
- **Border:** 1px Ghost Border (`rgba(255,255,255,0.14)`)
- **Internal Padding:** 20px

### Modals

- **Background:** Dark Panel (`#1e1e1e`)
- **Corner Style:** 14px radius
- **Shadow:** Heavy ambient drop (`0 24px 60px rgba(0,0,0,0.5)`) — the only shadow in the system
- **Internal Padding:** 32px
- **Border:** 1px Ghost Border

### Badges / Chips

- **Style:** Full pill (20px radius), Space Mono 9px uppercase, 0.8px letter-spacing, 2px 8px padding
- **Default variant:** Raised Surface background (`#2a2a2a`), Quiet Type text
- **Accent variant:** Loudmouth Green background (`#CCFF00`), black text

### Navigation / Page Headers

- **Page Header Bar:** Canvas background, 1px Ghost Border bottom, 16px top/bottom padding, 44px left/right padding
- **Page Title:** Space Mono 11px, 700, uppercase, 2px letter-spacing, Full White
- **Section Header:** Space Mono 10px, 600, uppercase, 1.8px letter-spacing, Quiet Type

## 6. Do's and Don'ts

### Do:
- **Do** use the three-font system with strict role separation: Anton for display, Space Grotesk for reading, Space Mono for chrome.
- **Do** express depth through surface tones (`canvas → surface → surface-raised`), not shadows.
- **Do** keep Loudmouth Green on ≤10% of any given screen: CTAs, active indicators, focus rings only.
- **Do** wrap all button groups in `BTN_ROW`. Buttons size to content, always.
- **Do** apply the modal shadow (`0 24px 60px rgba(0,0,0,0.5)`) only on the modal layer.
- **Do** write interface copy that is terse and declarative. Labels are commands, not suggestions.
- **Do** use Ghost Border (`rgba(255,255,255,0.14)`) as the universal stroke — it works at every surface depth.

### Don't:
- **Don't** use enterprise grey: muted surfaces, cramped type, apology-grey everything. If it looks like Salesforce or Jira, it's wrong.
- **Don't** use minimalist Swiss restraint: invisible typography, joyless white space, timid design choices. This tool has opinions.
- **Don't** apply `box-shadow` to cards, panels, or list items as decoration or hover feedback. Shadows belong to modals only.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe. Rewrite with background tints or full borders.
- **Don't** use `background-clip: text` with a gradient. Single solid color, always.
- **Don't** use glassmorphism (blur effects, semi-transparent "glass" cards) decoratively.
- **Don't** put Loudmouth Green on container backgrounds, body text, or decorative fills. It is a signal, not a theme color.
- **Don't** use `flex: 1` on buttons. Buttons size to content; the container is full-width if needed.
- **Don't** use white or near-white surfaces. The canvas is dark and stays dark.
