# Trades Page Implementation Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Trades page — a tabbed, paginated trade journal with a TanStack Table, Add/Edit drawer, and Delete confirmation, backed by Supabase with per-user RLS.

**Architecture:** Two new DB tables (`patches`, `trades`). Server Component loads patches; a Client Component manages active tab via nuqs and fetches trades per patch. All calculated columns are derived in TypeScript from stored fields — nothing computed is persisted.

**Tech Stack:** Next.js App Router, Supabase, TanStack Table, react-hook-form + yup, shadcn/ui Sheet + AlertDialog, nuqs, react-i18next.

---

## 1. Database Schema

### 1.1 `patches` table

One row per batch of ~100 trades. Tab label is auto-derived as `patch_number × 100 + " Trades"` (e.g. "100 Trades", "200 Trades").

```sql
create table public.patches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  patch_number int not null,
  created_at timestamptz default now() not null,
  unique (user_id, patch_number)
);

alter table public.patches enable row level security;

create policy "Users can view their own patches"
  on public.patches for select using (auth.uid() = user_id);

create policy "Users can insert their own patches"
  on public.patches for insert with check (auth.uid() = user_id);

create policy "Users can delete their own patches"
  on public.patches for delete using (auth.uid() = user_id);

create index patches_user_id_idx on public.patches (user_id);
```

### 1.2 `trades` table (full redesign — drop existing placeholder)

```sql
-- Drop existing placeholder
drop table if exists public.trades cascade;

create table public.trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  patch_id uuid references public.patches(id) on delete cascade not null,
  trade_number int not null,
  trade_date date not null,
  trade_time time not null,
  coin text not null,
  direction text check (direction in ('long', 'short')) not null,
  order_type text check (order_type in ('market', 'limit')) not null,
  avg_entry numeric(20, 8) not null,
  stop_loss numeric(20, 8) not null,
  avg_exit numeric(20, 8) not null,
  risk numeric(12, 2) not null,
  rules_followed boolean not null,
  setup_type text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (patch_id, trade_number)
);

alter table public.trades enable row level security;

create policy "Users can view their own trades"
  on public.trades for select using (auth.uid() = user_id);

create policy "Users can insert their own trades"
  on public.trades for insert with check (auth.uid() = user_id);

create policy "Users can update their own trades"
  on public.trades for update using (auth.uid() = user_id);

create policy "Users can delete their own trades"
  on public.trades for delete using (auth.uid() = user_id);

create index trades_user_id_idx on public.trades (user_id);
create index trades_patch_id_idx on public.trades (patch_id);
create index trades_patch_trade_number_idx on public.trades (patch_id, trade_number);
```

> **Note:** `trade_number` is the sequential number within a patch (1–100). It is assigned by the app at insert time — not a DB sequence — as `max(trade_number) + 1` within the patch.

---

## 2. Computed Fields

All derived in `lib/trades/calculations.ts`. None are stored in the DB.

### Inputs (stored)
`avg_entry`, `stop_loss`, `avg_exit`, `risk`, `direction`

### Derivations

```
dirFactor     = direction === 'long' ? 1 : -1
priceDiff     = (avg_exit − avg_entry) × dirFactor
riskDistance  = (avg_entry − stop_loss) × dirFactor   // always positive for valid trade
r_multiple    = priceDiff / riskDistance
pnl           = r_multiple × risk
realised_win  = pnl > 0 ? pnl : null
realised_loss = pnl < 0 ? abs(pnl) : null
deviation     = (realised_loss − risk) / risk × 100   // only for losing trades (pnl < 0); null for winning trades — confirm formula with user if wins also need a value
risk_volatility (per trade i) = i === 0 ? null : (risk_i − risk_{i-1}) / risk_{i-1} × 100
cumulative_pnl (per trade i)  = sum of pnl for trades 0..i within patch
cumulative_r   (per trade i)  = sum of r_multiple for trades 0..i within patch
```

The `enrichTrades(rawTrades: RawTrade[]): EnrichedTrade[]` function in `lib/trades/calculations.ts` applies all derivations in one pass over the sorted trade list.

---

## 3. File Structure

### New files
| File | Responsibility |
|---|---|
| `lib/trades/actions.ts` | Server actions: createPatch, addTrade, updateTrade, deleteTrade, getPatchTrades |
| `lib/trades/calculations.ts` | Pure functions: enrichTrades, individual field helpers |
| `lib/schemas/trade.ts` | Yup schema for the Add/Edit form |
| `components/trades/trades-client.tsx` | Client Component: tab state, trade fetching, renders table + drawer |
| `components/trades/patch-tabs.tsx` | Tab bar with patch list and "new patch" button |
| `components/trades/trades-table.tsx` | TanStack Table with all columns |
| `components/trades/trade-drawer.tsx` | Sheet-based Add/Edit form |
| `components/trades/delete-trade-dialog.tsx` | AlertDialog confirmation for delete |

### Modified files
| File | Change |
|---|---|
| `app/(dashboard)/trades/page.tsx` | Replace stub with Server Component that loads patches |
| `docs/database-queries.md` | Add patches + redesigned trades SQL |
| `messages/en.json` | Add all trades-related i18n keys |
| `messages/ar.json` | Arabic translations for all new keys |

---

## 4. Data Flow

```
trades/page.tsx (Server Component)
  1. getUser() — auth guard (already in dashboard layout)
  2. fetchPatches(userId) — SELECT from patches ORDER BY patch_number
  3. If no patches → call createPatch server action → creates patch #1
  4. Render <TradesClient patches={patches} />

TradesClient (Client Component)
  1. Read ?patch=<uuid> from URL via nuqs (default: last patch)
  2. On mount / patch change → call getPatchTrades(patchId) server action
  3. enrichTrades(rawTrades) → computed fields added
  4. Render <PatchTabs> + "Add Trade" button + <TradesTable> + <TradeDrawer>

Add Trade flow:
  User clicks "Add Trade" → TradeDrawer opens (mode: "add")
  Form submit → addTrade(patchId, formData) server action
  → revalidatePath("/trades") → drawer closes → table refreshes

Edit flow:
  User clicks pencil icon on row → TradeDrawer opens (mode: "edit", prefilled)
  Form submit → updateTrade(tradeId, formData)
  → revalidatePath("/trades") → drawer closes → table refreshes

Delete flow:
  User clicks trash icon → DeleteTradeDialog opens
  User confirms → deleteTrade(tradeId)
  → revalidatePath("/trades") → dialog closes → table refreshes
```

---

## 5. UI Specification

### 5.1 Page Layout

```
┌─ Navbar ─────────────────────────────────────────────────────────────┐
├─ Sidebar ──┬─ Main content (bg-muted) ──────────────────────────────┤
│            │  ┌─ patch tabs ──────────────────────── [+ new patch] ─┐│
│            │  │  100 Trades │ 200 Trades │ [400 Trades] (active)    ││
│            │  └───────────────────────────────────────────────────── ┘│
│            │                                                          │
│            │  [18 / 100 trades]              [Add Trade (primary btn)]│
│            │  ┌─ TanStack Table ─────────────────────────────────────┐│
│            │  │ # │ Date │ Time │ Coin │ Dir │ … │ Rules? │ Setup │ ⋯ ││
│            │  │ 1 │ …    │ …    │ BTC  │ L   │ … │ Yes    │ SFP   │ ⋯ ││
│            │  └──────────────────────────────────────────────────────┘│
└────────────┴──────────────────────────────────────────────────────────┘
```

### 5.2 Table Columns (in order)

| # | Column | Source | Notes |
|---|---|---|---|
| 1 | # | `trade_number` | |
| 2 | Date | `trade_date` | Formatted `dd MMM 'YY` |
| 3 | Time | `trade_time` | Formatted `hh:mm A` |
| 4 | Coin | `coin` | |
| 5 | Direction | `direction` | Capitalized |
| 6 | Order Type | `order_type` | Capitalized |
| 7 | Avg Entry | `avg_entry` | Right-aligned, `$` prefix |
| 8 | Stop Loss | `stop_loss` | Right-aligned, `$` prefix |
| 9 | Avg Exit | `avg_exit` | Right-aligned, `$` prefix |
| 10 | Risk | `risk` | Right-aligned, `$` prefix |
| 11 | Realised Loss | `realised_loss` | Computed; red text; blank if null |
| 12 | Realised Win | `realised_win` | Computed; green text; blank if null |
| 13 | Deviation | `deviation` | Computed; `%` suffix; blank for winning trades (formula confirmed for losses only) |
| 14 | R+/- | `r_multiple` | Computed; 2 decimal places |
| 15 | Risk Volatility | `risk_volatility` | Computed; `%` suffix; blank for first trade |
| 16 | Cumulative PnL $ | `cumulative_pnl` | Computed; green if positive, red if negative |
| 17 | Cumulative R | `cumulative_r` | Computed; green if positive, red if negative |
| 18 | Rules? | `rules_followed` | "Yes" / "No" |
| 19 | Setup Type | `setup_type` | |
| 20 | Actions | — | Pencil + Trash2 icon buttons |

Computed columns (11–17) have a visually muted header to indicate they are not editable.

### 5.3 Add/Edit Drawer

Right-side Sheet (`side="right"`, `side="left"` in RTL).

**Form fields (manual):**
- Date — date input
- Time — time input  
- Coin — text input (e.g. "BTC")
- Direction — Select: Long / Short
- Order Type — Select: Market / Limit
- Avg Entry — numeric input with `$` prefix
- Stop Loss — numeric input with `$` prefix
- Avg Exit — numeric input with `$` prefix
- Risk ($) — numeric input
- Rules? — Select: Yes / No
- Setup Type — text input (free-form, e.g. "SFP", "Trend Following")

**Live preview (read-only card below form):**
Shown when avg_entry, stop_loss, avg_exit, risk, and direction are all filled:
- R+/- (value + colour)
- Realised Win / Realised Loss

**Validation (yup):**
- All fields required
- avg_entry, stop_loss, avg_exit, risk must be positive numbers
- stop_loss must be below avg_entry for Long, above for Short
- direction ∈ ['long', 'short'], order_type ∈ ['market', 'limit']

**Server errors:** Displayed via `setError("root", ...)` at top of form.

### 5.4 Delete Confirmation

`AlertDialog` with title "Delete trade #N?" and description "This action cannot be undone." Confirm button is destructive variant.

### 5.5 New Patch

Clicking "+" tab button triggers `createPatch` server action (creates `patch_number = max + 1` for the user). No modal needed — immediate creation, new tab becomes active.

---

## 6. i18n Keys (additions to en.json / ar.json)

```json
"trades": {
  "title": "Trades",
  "addTrade": "Add Trade",
  "editTrade": "Edit Trade",
  "deleteTrade": "Delete Trade",
  "deleteConfirmTitle": "Delete trade #{{number}}?",
  "deleteConfirmDescription": "This action cannot be undone.",
  "confirm": "Confirm",
  "cancel": "Cancel",
  "tradeCount": "{{count}} / 100 trades",
  "newPatch": "New patch",
  "columns": {
    "number": "#",
    "date": "Date",
    "time": "Time",
    "coin": "Coin",
    "direction": "Direction",
    "orderType": "Order Type",
    "avgEntry": "Avg Entry",
    "stopLoss": "Stop Loss",
    "avgExit": "Avg Exit",
    "risk": "Risk",
    "realisedLoss": "Realised Loss",
    "realisedWin": "Realised Win",
    "deviation": "Deviation",
    "rMultiple": "R+/-",
    "riskVolatility": "Risk Volatility",
    "cumulativePnl": "Cumulative PnL $",
    "cumulativeR": "Cumulative R",
    "rulesFollowed": "Rules?",
    "setupType": "Setup Type",
    "actions": "Actions"
  },
  "form": {
    "date": "Date",
    "time": "Time",
    "coin": "Coin",
    "coinPlaceholder": "e.g. BTC",
    "direction": "Direction",
    "directionLong": "Long",
    "directionShort": "Short",
    "orderType": "Order Type",
    "orderTypeMarket": "Market",
    "orderTypeLimit": "Limit",
    "avgEntry": "Avg Entry",
    "stopLoss": "Stop Loss",
    "avgExit": "Avg Exit",
    "risk": "Risk ($)",
    "rulesFollowed": "Rules?",
    "rulesYes": "Yes",
    "rulesNo": "No",
    "setupType": "Setup Type",
    "setupTypePlaceholder": "e.g. SFP, Trend Following",
    "preview": "Calculated Preview",
    "save": "Save",
    "saving": "Saving…"
  },
  "direction": {
    "long": "Long",
    "short": "Short"
  },
  "orderType": {
    "market": "Market",
    "limit": "Limit"
  }
},
"validation": {
  "trades": {
    "coinRequired": "Coin is required",
    "avgEntryRequired": "Avg entry is required",
    "avgEntryPositive": "Must be a positive number",
    "stopLossRequired": "Stop loss is required",
    "stopLossPositive": "Must be a positive number",
    "stopLossLong": "Stop loss must be below avg entry for a Long trade",
    "stopLossShort": "Stop loss must be above avg entry for a Short trade",
    "avgExitRequired": "Avg exit is required",
    "avgExitPositive": "Must be a positive number",
    "riskRequired": "Risk is required",
    "riskPositive": "Must be a positive number",
    "directionRequired": "Direction is required",
    "orderTypeRequired": "Order type is required",
    "setupTypeRequired": "Setup type is required",
    "dateRequired": "Date is required",
    "timeRequired": "Time is required"
  }
}
```

---

## 7. TypeScript Types

```typescript
// lib/trades/types.ts
export type RawTrade = {
  id: string
  patch_id: string
  trade_number: number
  trade_date: string       // ISO date string "YYYY-MM-DD"
  trade_time: string       // "HH:MM:SS"
  coin: string
  direction: 'long' | 'short'
  order_type: 'market' | 'limit'
  avg_entry: number
  stop_loss: number
  avg_exit: number
  risk: number
  rules_followed: boolean
  setup_type: string
  created_at: string
  updated_at: string
}

export type EnrichedTrade = RawTrade & {
  r_multiple: number
  pnl: number
  realised_win: number | null
  realised_loss: number | null
  deviation: number
  risk_volatility: number | null
  cumulative_pnl: number
  cumulative_r: number
}

export type TradeFormData = {
  trade_date: string
  trade_time: string
  coin: string
  direction: 'long' | 'short'
  order_type: 'market' | 'limit'
  avg_entry: number
  stop_loss: number
  avg_exit: number
  risk: number
  rules_followed: boolean
  setup_type: string
}

export type Patch = {
  id: string
  user_id: string
  patch_number: number
  created_at: string
}
```

---

## 8. Server Actions API

```typescript
// lib/trades/actions.ts

// Returns the newly created patch
createPatch(): Promise<{ data: Patch | null; error: string | null }>

// Returns trades for a patch, ordered by trade_number asc
getPatchTrades(patchId: string): Promise<{ data: RawTrade[]; error: string | null }>

// Assigns trade_number = max(trade_number) + 1 within the patch
addTrade(patchId: string, data: TradeFormData): Promise<{ error: string | null }>

updateTrade(tradeId: string, data: TradeFormData): Promise<{ error: string | null }>

deleteTrade(tradeId: string): Promise<{ error: string | null }>
```

All actions use `await createClient()` (server Supabase client) and return translation keys for errors (e.g. `"errors.generic"`).
