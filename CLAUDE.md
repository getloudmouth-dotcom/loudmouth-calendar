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

**State architecture:** `App.jsx` is a monolithic state container — all app state and data-fetching functions live here. State is passed down as props (no Redux, no Zustand). `AppContext` exposes seven values:

| Key | Type | What it is |
|---|---|---|
| `can` | `(toolKey) => boolean` | RBAC check; resolved from `ROLE_TOOLS` ∪ `role_tool_defaults` ∪ `user_tool_access` |
| `showToast` | `(msg, type?) => void` | Sonner toast wrapper; `type` is `"success"` / `"error"` / `"info"` |
| `user` | Supabase auth user | `{ id, email, user_metadata, ... }` |
| `isOnline` | `boolean` | Tracks `navigator.onLine` |
| `clients` | `Client[]` | Rows from the `clients` Supabase table |
| `allCalendars` | `Calendar[]` | Source of truth for sidebar + builder; populated by `loadAllCalendars()` |
| `createCalendarForClient` | `(clientId, name) => Promise<Calendar>` | Inserts a new calendar and refreshes `allCalendars` |

The full `@typedef AppContextValue` lives in `src/AppContext.js`. Consumers should read from `useApp()` rather than receive these as props.

**Routing is URL-based, not React Router:** `App.jsx` reads `window.location` and URL search params to decide what to render:
- `?exportToken=` → headless Puppeteer PDF capture mode (renders calendar pages, signals `window.__EXPORT_READY__`)
- `?cp=` → public content plan view (unauthenticated)
- `?cpExport=` → headless content plan PDF export
- `?billingExport=` → headless invoice PDF export
- `/privacy-policy` → `PrivacyPolicyView`
- Hash `#type=invite` → invite setup flow
- Otherwise → Auth → ProfileSetup → DashboardPortal or CalendarBuilder

**Portal system:** `DashboardPortal` is the main authenticated shell. It renders a sidebar nav and swaps between portals based on `activePortal` state. The valid values are exported as `PORTALS` in `src/constants.js` — always use `PORTALS.HOME` / `PORTALS.CALENDAR` / etc., never the raw strings:

| `activePortal` | Renders |
|---|---|
| `null` | Home / landing |
| `"calendar"` | `CalendarListPortal` (and `CalendarBuilder` when a calendar is opened) |
| `"content-plan"` | `ContentPlanPortal` |
| `"scheduling"` | `SchedulingPortal` |
| `"admin"` | `AdminPortal` |
| `"billing"` | `BillingPortal` |
| `"grid"` | `GridCreatorPortal` (with `GridView` and `MonthWorkspace` tabs) |
| `"clients"` | `ClientListPortal`, or `ClientPortal` when `workspaceClientId` is set |

Nav items are gated by RBAC via `can(toolKey)`.

**RBAC:** Roles (`admin`, `smm`, `account_manager`, `graphic_designer`, etc.) are stored in `profiles.role`. Default tool access per role is in `constants.js` (`ROLE_TOOLS`) and can be overridden per-user in the `user_tool_access` Supabase table. The `roleToolDefaults` table in Supabase can override the `ROLE_TOOLS` constants at runtime. The resolved permission set is computed in `App.jsx` via `useMemo` and exposed as `can()`.

**Supabase tables used:**
- Calendar/content: `calendars`, `calendar_drafts`, `calendar_collaborators`, `scheduled_posts`, `content_plans`, `content_plan_items`, `content_plan_shares`
- Identity/RBAC: `profiles`, `user_tool_access`, `role_tool_defaults`
- Clients: `clients`
- Billing/FreshBooks: `invoices`, `invoice_line_items`, `invoice_events`, `freshbooks_tokens`
- Drive thumbnail proxy cache: `thumbnails`, `thumbnail_cache`

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

## Naming glossary (overloaded terms)

The same word means different things in different contexts. When in doubt:

### "client"
1. **Business client row** — `clients` Supabase table; `clientId`, `clientName`, `workspaceClientId`. The default meaning anywhere in `src/`.
2. **Google OAuth handle** — only inside `initTokenClient(...)` callbacks. Always named `googleAuthClient`, never `client`.
3. **Workspace scope** — `workspaceClientId` (which client the admin is currently viewing in `MonthWorkspace`/`ClientPortal`) is intentionally separate from `clientId` (the calendar builder's selection).
4. **Supabase HTTP client** — only in `api/`, accessed via `_supabaseCache.client` / `_redisCache.client` / `_sbCache.client`.
5. **Twilio handle** — `twilioClient` in `api/share-content-plan.js`.

### "draft"
1. **`draftHistory` / `restoreDraft`** — versioned snapshots in `App.jsx`, loaded on-demand by `loadDraftHistory()`.
2. **`calendar_drafts` table** — the current authoritative post payload for a calendar. Despite the name, this is not "history" — it's the live state. The most recent row by `saved_at` is what the builder loads.
3. **Invoice status `"draft"`** — billing-only enum in `api/billing/*`; no relation to calendar drafts.

### Calendar state slices

All in `src/App.jsx` unless noted:
- `allCalendars` — full list, populated by `loadAllCalendars()`. Source of truth for the sidebar + builder.
- `currentCalendarId` — what's open in `CalendarBuilder`. `null` = no edit session.
- `workspaceCalendarId` — what's open in `MonthWorkspace` (the client portal view).
- `schedulingCalId` — transient flag during `toggleSchedule(cal)`; cleared after the call.
- `selectedCalendarId` (in `GridCreatorPortal.jsx`) — local to the grid creator's client picker; not synced to App state.

Function-parameter convention: `cal` = full calendar object (from `allCalendars`); `calId` = string id only.
