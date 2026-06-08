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

## Tech Stack

| Concern | Tool |
|---|---|
| Framework | Next.js App Router, TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (`radix-lyra` style, `rtl: true` in `components.json`) |
| Icons | Lucide |
| i18n | react-i18next, cookie-based locale (`NEXT_LOCALE`), `en` + `ar` |
| RTL | `dir` on `<html>` + `DirectionProvider` in `layout.tsx`; Noto Sans Arabic via `[dir="rtl"]` in `globals.css` |
| Database & Auth | Supabase |
| Deployment | Vercel |

## Environments

| Env | Supabase Project |
|---|---|
| Development | `trading-logs-dev` |
| Production | `trading-logs-prod` |

See `docs/deployment.md` for deploy checklist and `docs/database-queries.md` for production DB queries.
