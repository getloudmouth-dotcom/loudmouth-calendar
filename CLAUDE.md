# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # starts both Vite (port 5173) and Express API server (port 3001) concurrently
npm run build    # production build (output: dist/)
npm run preview  # preview the production build locally
```

No test runner is configured. There is no lint script — ESLint config exists at `eslint.config.js` but must be run manually via `npx eslint`.

## Architecture

**Dual-server setup:** `npm run dev` launches both processes:
- **Vite** (`localhost:5173`) — serves the React SPA and proxies `/api/*` to the Express server
- **Express** (`server.js`, port 3001) — handles API routes that require Node.js (PDF export via Puppeteer, Drive thumbnail proxying, invite/share emails, Twilio SMS reminders)

Serverless Vercel functions in `api/` mirror the Express routes and are used in production. The Express server exists solely for local dev parity.

**State architecture:** `App.jsx` is a monolithic state container — all app state and data-fetching functions live here. State is passed down as props (no Redux, no Zustand). `AppContext` exposes only three values: `can(toolKey)`, `showToast(msg, type)`, `user`, and `isOnline`.

**Routing is URL-based, not React Router:** `App.jsx` reads `window.location` and URL search params to decide what to render:
- `?exportToken=` → headless Puppeteer PDF capture mode (renders calendar pages, signals `window.__EXPORT_READY__`)
- `?cp=` → public content plan view (unauthenticated)
- `?cpExport=` → headless content plan PDF export
- `?billingExport=` → headless invoice PDF export
- `/privacy-policy` → `PrivacyPolicyView`
- Hash `#type=invite` → invite setup flow
- Otherwise → Auth → ProfileSetup → DashboardPortal or CalendarBuilder

**Portal system:** `DashboardPortal` is the main authenticated shell. It renders a sidebar nav and swaps between portals based on `activePortal` state: `CalendarListPortal`, `ContentPlanPortal`, `SchedulingPortal`, `AdminPortal`, `BillingPortal`. Nav items are gated by RBAC via `can(toolKey)`.

**RBAC:** Roles (`admin`, `smm`, `account_manager`, `graphic_designer`, etc.) are stored in `profiles.role`. Default tool access per role is in `constants.js` (`ROLE_TOOLS`) and can be overridden per-user in the `user_tool_access` Supabase table. The `roleToolDefaults` table in Supabase can override the `ROLE_TOOLS` constants at runtime. The resolved permission set is computed in `App.jsx` via `useMemo` and exposed as `can()`.

**Supabase tables used:** `calendars`, `calendar_drafts`, `calendar_collaborators`, `profiles`, `user_tool_access`, `role_tool_defaults`, `scheduled_posts`, `clients`, `content_plans`, `content_plan_items`, `content_plan_shares`.

**Content plan collab:** Realtime updates use Supabase's `postgres_changes` subscription on `calendar_drafts`, keyed by `calendar_id`. Only one channel is active at a time (`realtimeChannelRef`).

**Image pipeline:** All uploads go through Cloudinary (`CLOUDINARY_CLOUD = "djaxz6tef"`, preset `loudmouth_uploads`). Images are compressed client-side via `compressToBlob` in `utils.js` before upload. Google Drive images are fetched via the Express proxy (`/api/drive-thumb`) and then uploaded to Cloudinary.

## Frontend design rules

See `src/CLAUDE.md` for the full design system. Key constraints:
- All colors via `C.*`, all fonts via `SANS`/`MONO`/`DISP`, all from `src/theme.js`
- Buttons: use `primaryBtn`, `ghostBtn`, `dangerBtn`, or `btn(override)` — never write custom button styles
- Button groups: always wrap in `BTN_ROW`; never put `flex: 1` on a button
- Modals: use `<AppDialog>` from `src/components/AppDialog.jsx`
- Toasts: call `showToast(msg, type)` from `AppContext` (wraps Sonner)
- Dropdowns: use shadcn `<Select>` from `src/components/ui/select.jsx`
- Every portal needs a `<div style={PAGE_HEADER}>` bar containing only `<div style={PAGE_TITLE}>`; action buttons go in the tab row, not the header

## Environment variables

Required in `.env.local`:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — Supabase client (Vite-prefixed for browser)
- Cloudinary, Twilio, Google OAuth client ID, and Upstash Redis keys are used server-side in `api/` functions
