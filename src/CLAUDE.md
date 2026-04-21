# Frontend Design Rules

**Before writing ANY styles, import from `src/theme.js` first.**

## Tokens to use

| Need | Use |
|---|---|
| Colors | `C.canvas`, `C.surface`, `C.surface2`, `C.accent`, `C.text`, `C.meta`, `C.border`, `C.error` |
| Fonts | `SANS`, `MONO`, `DISP` |
| Buttons | `btn(override)`, `primaryBtn`, `ghostBtn`, `dangerBtn` |
| Forms | `INPUT`, `LABEL` |
| Layout | `CARD`, `MODAL`, `BADGE`, `SECTION_HEADER` |

## Rules

- **Never hardcode a hex color.** Use `C.*` instead.
- **Never hardcode a font string.** Use `SANS`, `MONO`, or `DISP`.
- **Never write a new button style from scratch.** Use `btn()` with overrides, or `primaryBtn` / `ghostBtn` / `dangerBtn`.
- **For any modal or dialog:** use `<AppDialog>` from `src/components/AppDialog.jsx`.
- **For toast notifications:** call `showToast(msg, type)` from `AppContext` — it uses Sonner under the hood.
- **For dropdown/select UI:** use shadcn `<Select>` from `src/components/ui/select.jsx`.
- **Adding a new token?** Add it to `src/theme.js` first, then use it. Never define styles locally if they could be reused.

## shadcn/ui components available

Located in `src/components/ui/`:
- `dialog.jsx` — via `<AppDialog>` wrapper
- `select.jsx` — styled dropdowns
- `sonner.jsx` — toast system (Toaster already mounted in DashboardPortal)
- `button.jsx` — shadcn base button (prefer `primaryBtn`/`ghostBtn` inline for now)
