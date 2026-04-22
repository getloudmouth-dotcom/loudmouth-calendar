# Frontend Design Rules

**Before writing ANY styles, import from `src/theme.js` first.**

## Tokens to use

| Need | Use |
|---|---|
| Colors | `C.canvas`, `C.surface`, `C.surface2`, `C.accent`, `C.text`, `C.meta`, `C.border`, `C.error` |
| Fonts | `SANS`, `MONO`, `DISP` |
| Buttons | `btn(override)`, `primaryBtn`, `ghostBtn`, `dangerBtn` |
| Forms | `INPUT`, `LABEL` |
| Layout | `CARD`, `MODAL`, `BADGE`, `SECTION_HEADER`, `PAGE_HEADER`, `PAGE_TITLE` |
| Button groups | `BTN_ROW` — always wrap button rows in this |

## Rules

- **Never hardcode a hex color.** Use `C.*` instead.
- **Never hardcode a font string.** Use `SANS`, `MONO`, or `DISP`.
- **Never write a new button style from scratch.** Use `btn()` with overrides, or `primaryBtn` / `ghostBtn` / `dangerBtn`.
- **For any modal or dialog:** use `<AppDialog>` from `src/components/AppDialog.jsx`.
- **For toast notifications:** call `showToast(msg, type)` from `AppContext` — it uses Sonner under the hood.
- **For dropdown/select UI:** use shadcn `<Select>` from `src/components/ui/select.jsx`.
- **Adding a new token?** Add it to `src/theme.js` first, then use it. Never define styles locally if they could be reused.
- **Every portal must have a `PAGE_HEADER` bar at the top.** Use `<div style={PAGE_HEADER}>` as the wrapper and `<div style={PAGE_TITLE}>` for the portal name. Never write a custom header bar inline. The `PAGE_HEADER` bar contains only the portal title — no action buttons.
- **Action buttons in portals with a tab bar go in the tab row, not the header.** Place them right-aligned using a `flex: 1` spacer after the tab buttons. This keeps the `PAGE_HEADER` clean and the buttons on the same visual row as the tabs.
- **Never override button padding to resize a button in context.** All action buttons (`primaryBtn`, `ghostBtn`, `dangerBtn`) use 10px vertical padding so they render at the same height. Use the token as-is; if the size is wrong, change the token.
- **Never pass `flex: 1` as a `btn()` override.** Buttons must size to content. If you need a full-width button row, make the *container* full-width. Always use `BTN_ROW` as the container for any group of buttons.

## shadcn/ui components available

Located in `src/components/ui/`:
- `dialog.jsx` — via `<AppDialog>` wrapper
- `select.jsx` — styled dropdowns
- `sonner.jsx` — toast system (Toaster already mounted in DashboardPortal)
- `button.jsx` — shadcn base button (prefer `primaryBtn`/`ghostBtn` inline for now)
