# Deployment

**Target:** Vercel
**Repo branch → environment mapping:**

| Branch | Environment | Supabase Project |
|---|---|---|
| `develop` | Preview / Dev | `trading-logs-dev` |
| `main` | Production | `trading-logs-prod` |

---

## Environment Variables

Set these in Vercel for each environment (Settings → Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

Get values from: Supabase dashboard → project → Settings → API.

> Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it to the client.

---

## Vercel Project Settings

- **Framework Preset:** Next.js
- **Root Directory:** `/`
- **Build Command:** `next build`
- **Output Directory:** `.next`

---

## Pre-deployment Checklist

### Database
- [ ] Run all queries in `docs/database-queries.md` on `trading-logs-prod`
- [ ] Confirm RLS (Row Level Security) is enabled on all tables
- [ ] Confirm RLS policies are correct for production

### Auth (Supabase)
- [ ] Set production site URL in Supabase: Authentication → URL Configuration → Site URL
- [ ] Add production domain to Redirect URLs (for OAuth / magic links / password reset)
- [ ] Test: signup, login, forgot password, reset password end-to-end

### Vercel
- [ ] All environment variables set for Production environment
- [ ] Custom domain configured (if applicable)
- [ ] Verify `NEXT_LOCALE` cookie works across production domain

### Smoke Test After Deploy
- [ ] Landing page loads
- [ ] Auth flow works (sign up → login → logout)
- [ ] EN ↔ AR language toggle works
- [ ] Dark / light theme toggle works
- [ ] RTL layout renders correctly in Arabic
- [ ] Overview and Trades pages load after login
