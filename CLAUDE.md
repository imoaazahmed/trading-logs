# Claude Instructions

## Git

**Never commit or push unless explicitly told to.** Always show changes first and wait for the user to say "commit" or "push".

## Performance

**Performance is the #1 priority.** Every decision must favor speed:
- Prefer Server Components; only use `"use client"` when necessary
- Minimize client-side JS and bundle size
- Avoid request waterfalls — fetch in parallel or at the server level
- Lazy load non-critical UI

## App Overview

**Trading Logs** — a trade journaling app. Users manually log their trades. Future roadmap includes auto-fetching trades from connected brokers (not in scope yet).

## Pages & Layout

### Pre-login
- Landing page (`/`)
- Auth: login, signup, forgot password, reset password

### Post-login
- **Navbar** (top):
  - Left: brand logo — links to landing page pre-login, overview page post-login
  - Right: dark/light theme toggle | language toggle (EN ↔ AR) | user avatar menu (settings, logout)
- **Sidebar** (left):
  - Overview
  - Trades

## Buttons

- **Primary action** → `<Button>` (default variant, no `variant` prop needed)
- **Secondary action** → `<Button variant="outline">`
- Never use `ghost` for visible action buttons; reserve it for icon-only controls (theme toggle, locale switcher, etc.)
- **Loading state** — add `<Spinner data-icon="inline-start" />` inside the button; it handles spacing automatically. Never swap the label text for "Saving…" or similar.

## Forms

**All forms use react-hook-form + yup. No exceptions.**

- Define schemas in `lib/schemas/` using `yup.object()`
- Use `yupResolver` from `@hookform/resolvers/yup`
- Yup error messages must be translation keys (e.g. `"validation.email.required"`) so they pass through `t()`
- Server action signatures accept plain typed objects (not `FormData`)
- Call server actions inside `handleSubmit`; handle server errors with `setError("root", ...)`
- Display field errors below each input; display root errors at the top of the form

## i18n Rule

**Every piece of visible text must use `t()` — no hardcoded strings in JSX, ever.**

When adding any English text:
1. Add the key + English value to `messages/en.json`
2. Add the key + Arabic translation to `messages/ar.json`
3. Use `t("key")` in the component

Components that call `useTranslation()` must be `"use client"`. If a Server Component needs translated text, extract the text into a child Client Component.

Server actions that return user-facing messages should return a translation key (e.g. `{ error: "auth.resetPassword.mismatch" }`), not a raw string. The client then calls `t(state.error)`.

## Tech Stack

| Concern | Tool |
|---|---|
| Framework | Next.js App Router, TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (`radix-lyra` style, `rtl: true` in `components.json`) |
| Icons | Lucide |
| i18n | react-i18next, cookie-based locale (`NEXT_LOCALE`), `en` + `ar` |
| RTL | `dir` on `<html>` + `DirectionProvider` in `layout.tsx`; Noto Sans Arabic via `[dir="rtl"]` in `globals.css` |
| URL State | nuqs — always use `useQueryState` / `useQueryStates` for URL search params, never roll manual `useSearchParams` + `router.push` |
| Tables | TanStack Table (`@tanstack/react-table`) — always use for any table UI, no exceptions |
| Charts | Recharts — always use for any chart/data visualization, no exceptions |
| QR Codes | qrcode.react — always use for any QR code generation, no exceptions |
| Drag & Drop | @dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`) — always use for any drag-and-drop UI, no exceptions |
| Database & Auth | Supabase |
| Deployment | Vercel |

## Environments

| Env | Supabase Project |
|---|---|
| Development | `trading-logs-dev` |
| Production | `trading-logs-prod` |

See `docs/deployment.md` for deploy checklist and `docs/database-queries.md` for production DB queries.
