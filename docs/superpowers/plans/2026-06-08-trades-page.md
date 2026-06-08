# Trades Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Trades page — patch tabs, a TanStack Table with 20 columns (11 auto-calculated), an Add/Edit drawer, and a delete confirmation dialog, all backed by Supabase with per-user RLS.

**Architecture:** Two new DB tables (`patches`, `trades`). The `trades/page.tsx` Server Component fetches patch list and passes it to `TradesClient` (Client Component), which owns tab state (nuqs), trade fetching, and all CRUD interactions. Calculated fields are derived in pure TypeScript — nothing computed is persisted. See spec: `docs/superpowers/specs/2026-06-08-trades-page-design.md`.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, TanStack Table v8, react-hook-form v7 + yup, shadcn/ui (Sheet, AlertDialog, Tabs, Select, Table), nuqs v2, react-i18next.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `docs/database-queries.md` | Modify | Add patches + redesigned trades SQL |
| `messages/en.json` | Modify | Add all trades i18n keys |
| `messages/ar.json` | Modify | Arabic translations for trades keys |
| `lib/trades/types.ts` | Create | Shared TypeScript types |
| `lib/trades/calculations.ts` | Create | Pure calculation functions |
| `lib/schemas/trade.ts` | Create | Yup validation schema |
| `lib/trades/actions.ts` | Create | Server actions (CRUD) |
| `components/trades/patch-tabs.tsx` | Create | Tab bar + new patch button |
| `components/trades/trades-table.tsx` | Create | TanStack Table with all 20 columns |
| `components/trades/trade-drawer.tsx` | Create | Add/Edit Sheet form |
| `components/trades/delete-trade-dialog.tsx` | Create | Delete AlertDialog |
| `components/trades/trades-client.tsx` | Create | Client orchestrator |
| `app/(dashboard)/trades/page.tsx` | Modify | Replace stub with Server Component |

---

## Task 1: Install missing shadcn UI components

**Files:**
- Creates: `components/ui/table.tsx`, `components/ui/tabs.tsx`, `components/ui/select.tsx`, `components/ui/alert-dialog.tsx`

- [ ] **Step 1: Run shadcn add for all four missing components**

```bash
cd /Users/moaaz/Apps/trading-logs
npx shadcn@latest add table tabs select alert-dialog
```

Expected: four new files created in `components/ui/`. If prompted, press `y` for any overwrites.

- [ ] **Step 2: Verify the files exist**

```bash
ls components/ui/table.tsx components/ui/tabs.tsx components/ui/select.tsx components/ui/alert-dialog.tsx
```

Expected: all four paths printed with no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/table.tsx components/ui/tabs.tsx components/ui/select.tsx components/ui/alert-dialog.tsx
git commit -m "feat: install table, tabs, select, alert-dialog shadcn components"
```

---

## Task 2: Database schema — add patches table and redesign trades table

**Files:**
- Modify: `docs/database-queries.md`

- [ ] **Step 1: Append the new SQL to `docs/database-queries.md`**

Add the following section after the existing `## Indexes` section:

````markdown
---

## patches

One row per batch of ~100 trades per user. Tab label = `patch_number × 100 + " Trades"`.

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

---

## trades (redesign — run AFTER dropping old table)

> **Warning:** This drops the existing `trades` table. The old schema was a placeholder with no real data. Run on dev first.

```sql
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
````

- [ ] **Step 2: Run the SQL on the dev Supabase project**

Open Supabase Dashboard → `trading-logs-dev` → SQL Editor → New query. Run the `patches` block first, then the `trades` redesign block.

Verify in Table Editor: both `patches` and `trades` tables appear with RLS badges showing "Enabled".

- [ ] **Step 3: Commit**

```bash
git add docs/database-queries.md
git commit -m "docs: add patches table and redesigned trades table SQL"
```

---

## Task 3: Add i18n keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ar.json`

- [ ] **Step 1: Add trades keys to `messages/en.json`**

Inside the root object, add after the existing `"errors"` block:

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
  "patchLabel": "{{count}} Trades",
  "emptyState": "No trades yet. Click \"Add Trade\" to log your first trade.",
  "tabSuffix": "Trades",
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
}
```

Also add these to the existing `"errors"` block:

```json
"generic": "Something went wrong. Please try again.",
"unauthorized": "You must be signed in to do that."
```

Also add these to the existing `"validation"` block, nested under a new `"trades"` key:

```json
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
```

- [ ] **Step 2: Add corresponding Arabic keys to `messages/ar.json`**

Add the same structure under the same keys with Arabic translations:

```json
"trades": {
  "title": "التداولات",
  "addTrade": "إضافة تداول",
  "editTrade": "تعديل التداول",
  "deleteTrade": "حذف التداول",
  "deleteConfirmTitle": "حذف التداول #{{number}}؟",
  "deleteConfirmDescription": "لا يمكن التراجع عن هذا الإجراء.",
  "confirm": "تأكيد",
  "cancel": "إلغاء",
  "tradeCount": "{{count}} / 100 تداول",
  "newPatch": "دفعة جديدة",
  "patchLabel": "{{count}} تداول",
  "emptyState": "لا توجد تداولات بعد. انقر على \"إضافة تداول\" لتسجيل أول تداول.",
  "tabSuffix": "تداول",
  "columns": {
    "number": "#",
    "date": "التاريخ",
    "time": "الوقت",
    "coin": "العملة",
    "direction": "الاتجاه",
    "orderType": "نوع الأمر",
    "avgEntry": "متوسط الدخول",
    "stopLoss": "وقف الخسارة",
    "avgExit": "متوسط الخروج",
    "risk": "المخاطرة",
    "realisedLoss": "الخسارة المحققة",
    "realisedWin": "الربح المحقق",
    "deviation": "الانحراف",
    "rMultiple": "R+/-",
    "riskVolatility": "تقلب المخاطرة",
    "cumulativePnl": "الربح/الخسارة التراكمي $",
    "cumulativeR": "R التراكمي",
    "rulesFollowed": "القواعد؟",
    "setupType": "نوع الإعداد",
    "actions": "إجراءات"
  },
  "form": {
    "date": "التاريخ",
    "time": "الوقت",
    "coin": "العملة",
    "coinPlaceholder": "مثال: BTC",
    "direction": "الاتجاه",
    "directionLong": "شراء",
    "directionShort": "بيع",
    "orderType": "نوع الأمر",
    "orderTypeMarket": "سوق",
    "orderTypeLimit": "محدد",
    "avgEntry": "متوسط الدخول",
    "stopLoss": "وقف الخسارة",
    "avgExit": "متوسط الخروج",
    "risk": "المخاطرة ($)",
    "rulesFollowed": "القواعد؟",
    "rulesYes": "نعم",
    "rulesNo": "لا",
    "setupType": "نوع الإعداد",
    "setupTypePlaceholder": "مثال: SFP، اتجاه السوق",
    "preview": "معاينة محسوبة",
    "save": "حفظ",
    "saving": "جارٍ الحفظ…"
  },
  "direction": {
    "long": "شراء",
    "short": "بيع"
  },
  "orderType": {
    "market": "سوق",
    "limit": "محدد"
  }
}
```

Add to `"errors"` in ar.json:

```json
"generic": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
"unauthorized": "يجب تسجيل الدخول للقيام بذلك."
```

Add to `"validation"` in ar.json:

```json
"trades": {
  "coinRequired": "العملة مطلوبة",
  "avgEntryRequired": "متوسط الدخول مطلوب",
  "avgEntryPositive": "يجب أن يكون رقماً موجباً",
  "stopLossRequired": "وقف الخسارة مطلوب",
  "stopLossPositive": "يجب أن يكون رقماً موجباً",
  "stopLossLong": "يجب أن يكون وقف الخسارة أقل من متوسط الدخول لصفقة الشراء",
  "stopLossShort": "يجب أن يكون وقف الخسارة أعلى من متوسط الدخول لصفقة البيع",
  "avgExitRequired": "متوسط الخروج مطلوب",
  "avgExitPositive": "يجب أن يكون رقماً موجباً",
  "riskRequired": "المخاطرة مطلوبة",
  "riskPositive": "يجب أن يكون رقماً موجباً",
  "directionRequired": "الاتجاه مطلوب",
  "orderTypeRequired": "نوع الأمر مطلوب",
  "setupTypeRequired": "نوع الإعداد مطلوب",
  "dateRequired": "التاريخ مطلوب",
  "timeRequired": "الوقت مطلوب"
}
```

- [ ] **Step 3: Verify JSON is valid**

```bash
node -e "require('./messages/en.json'); require('./messages/ar.json'); console.log('JSON valid')"
```

Expected: `JSON valid`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ar.json
git commit -m "feat: add trades i18n keys (en + ar)"
```

---

## Task 4: Create TypeScript types

**Files:**
- Create: `lib/trades/types.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/trades/types.ts
export type Patch = {
  id: string
  user_id: string
  patch_number: number
  created_at: string
}

export type RawTrade = {
  id: string
  patch_id: string
  trade_number: number
  trade_date: string       // "YYYY-MM-DD"
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
  deviation: number | null      // null for winning trades
  risk_volatility: number | null // null for first trade in patch
  cumulative_pnl: number
  cumulative_r: number
}

export type TradeFormData = {
  trade_date: string         // "YYYY-MM-DD"
  trade_time: string         // "HH:MM" from form input, converted to "HH:MM:SS" before saving
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

export type TradePreview = {
  r_multiple: number
  realised_win: number | null
  realised_loss: number | null
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/trades/types.ts
git commit -m "feat: add trades TypeScript types"
```

---

## Task 5: Create calculation functions

**Files:**
- Create: `lib/trades/calculations.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/trades/calculations.ts
import type { RawTrade, EnrichedTrade, TradePreview } from './types'

function dirFactor(direction: 'long' | 'short'): 1 | -1 {
  return direction === 'long' ? 1 : -1
}

function calcR(trade: RawTrade): number {
  const factor = dirFactor(trade.direction)
  const priceDiff = (trade.avg_exit - trade.avg_entry) * factor
  const riskDistance = (trade.avg_entry - trade.stop_loss) * factor
  if (riskDistance === 0) return 0
  return priceDiff / riskDistance
}

export function enrichTrades(trades: RawTrade[]): EnrichedTrade[] {
  let cumulative_pnl = 0
  let cumulative_r = 0

  return trades.map((trade, index) => {
    const r_multiple = calcR(trade)
    const pnl = r_multiple * trade.risk
    const realised_win = pnl > 0 ? pnl : null
    const realised_loss = pnl < 0 ? Math.abs(pnl) : null
    // deviation only shown for losing trades
    const deviation =
      pnl < 0 ? (Math.abs(pnl) - trade.risk) / trade.risk * 100 : null
    const prev = index > 0 ? trades[index - 1] : null
    const risk_volatility =
      prev !== null ? (trade.risk - prev.risk) / prev.risk * 100 : null

    cumulative_pnl += pnl
    cumulative_r += r_multiple

    return {
      ...trade,
      r_multiple,
      pnl,
      realised_win,
      realised_loss,
      deviation,
      risk_volatility,
      cumulative_pnl,
      cumulative_r,
    }
  })
}

export function calcPreview(
  avg_entry: number | undefined,
  stop_loss: number | undefined,
  avg_exit: number | undefined,
  risk: number | undefined,
  direction: 'long' | 'short' | undefined
): TradePreview | null {
  if (!avg_entry || !stop_loss || !avg_exit || !risk || !direction) return null
  if (avg_entry <= 0 || stop_loss <= 0 || avg_exit <= 0 || risk <= 0) return null

  const factor = dirFactor(direction)
  const riskDistance = (avg_entry - stop_loss) * factor
  if (riskDistance <= 0) return null

  const r_multiple = (avg_exit - avg_entry) * factor / riskDistance
  const pnl = r_multiple * risk

  return {
    r_multiple,
    realised_win: pnl > 0 ? pnl : null,
    realised_loss: pnl < 0 ? Math.abs(pnl) : null,
  }
}
```

- [ ] **Step 2: Verify TypeScript (calculations + all previously created files)**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/trades/calculations.ts
git commit -m "feat: add trade calculation functions (enrichTrades, calcPreview)"
```

---

## Task 6: Create Yup validation schema

**Files:**
- Create: `lib/schemas/trade.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/schemas/trade.ts
import * as yup from 'yup'

export const tradeSchema = yup.object({
  trade_date: yup.string().required('validation.trades.dateRequired'),
  trade_time: yup.string().required('validation.trades.timeRequired'),
  coin: yup.string().required('validation.trades.coinRequired'),
  direction: yup
    .mixed<'long' | 'short'>()
    .oneOf(['long', 'short'] as const, 'validation.trades.directionRequired')
    .required('validation.trades.directionRequired'),
  order_type: yup
    .mixed<'market' | 'limit'>()
    .oneOf(['market', 'limit'] as const, 'validation.trades.orderTypeRequired')
    .required('validation.trades.orderTypeRequired'),
  avg_entry: yup
    .number()
    .typeError('validation.trades.avgEntryRequired')
    .positive('validation.trades.avgEntryPositive')
    .required('validation.trades.avgEntryRequired'),
  stop_loss: yup
    .number()
    .typeError('validation.trades.stopLossRequired')
    .positive('validation.trades.stopLossPositive')
    .required('validation.trades.stopLossRequired')
    .test('stop-loss-direction', '', function (value) {
      const { direction, avg_entry } = this.parent as {
        direction: string
        avg_entry: number
      }
      if (!value || !avg_entry || !direction) return true
      if (direction === 'long' && value >= avg_entry)
        return this.createError({ message: 'validation.trades.stopLossLong' })
      if (direction === 'short' && value <= avg_entry)
        return this.createError({ message: 'validation.trades.stopLossShort' })
      return true
    }),
  avg_exit: yup
    .number()
    .typeError('validation.trades.avgExitRequired')
    .positive('validation.trades.avgExitPositive')
    .required('validation.trades.avgExitRequired'),
  risk: yup
    .number()
    .typeError('validation.trades.riskRequired')
    .positive('validation.trades.riskPositive')
    .required('validation.trades.riskRequired'),
  rules_followed: yup.boolean().required().default(true),
  setup_type: yup.string().required('validation.trades.setupTypeRequired'),
})

export type TradeSchema = yup.InferType<typeof tradeSchema>
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/schemas/trade.ts
git commit -m "feat: add trade yup validation schema"
```

---

## Task 7: Create server actions

**Files:**
- Create: `lib/trades/actions.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/trades/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Patch, RawTrade, TradeFormData } from './types'

export async function createPatch(): Promise<{ data: Patch | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'errors.unauthorized' }

  const { data: existing } = await supabase
    .from('patches')
    .select('patch_number')
    .eq('user_id', user.id)
    .order('patch_number', { ascending: false })
    .limit(1)

  const nextNumber = existing && existing.length > 0 ? existing[0].patch_number + 1 : 1

  const { data, error } = await supabase
    .from('patches')
    .insert({ user_id: user.id, patch_number: nextNumber })
    .select()
    .single()

  if (error) return { data: null, error: 'errors.generic' }
  revalidatePath('/trades')
  return { data: data as Patch, error: null }
}

export async function getPatchTrades(
  patchId: string
): Promise<{ data: RawTrade[]; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('patch_id', patchId)
    .order('trade_number', { ascending: true })

  if (error) return { data: [], error: 'errors.generic' }
  return { data: (data ?? []) as RawTrade[], error: null }
}

export async function addTrade(
  patchId: string,
  formData: TradeFormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'errors.unauthorized' }

  const { data: existing } = await supabase
    .from('trades')
    .select('trade_number')
    .eq('patch_id', patchId)
    .order('trade_number', { ascending: false })
    .limit(1)

  const nextNumber = existing && existing.length > 0 ? existing[0].trade_number + 1 : 1

  // Convert HH:MM to HH:MM:SS for DB time column
  const trade_time = formData.trade_time.length === 5
    ? formData.trade_time + ':00'
    : formData.trade_time

  const { error } = await supabase.from('trades').insert({
    user_id: user.id,
    patch_id: patchId,
    trade_number: nextNumber,
    ...formData,
    trade_time,
  })

  if (error) return { error: 'errors.generic' }
  revalidatePath('/trades')
  return { error: null }
}

export async function updateTrade(
  tradeId: string,
  formData: TradeFormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const trade_time = formData.trade_time.length === 5
    ? formData.trade_time + ':00'
    : formData.trade_time

  const { error } = await supabase
    .from('trades')
    .update({ ...formData, trade_time, updated_at: new Date().toISOString() })
    .eq('id', tradeId)

  if (error) return { error: 'errors.generic' }
  revalidatePath('/trades')
  return { error: null }
}

export async function deleteTrade(tradeId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('trades').delete().eq('id', tradeId)
  if (error) return { error: 'errors.generic' }
  revalidatePath('/trades')
  return { error: null }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/trades/actions.ts
git commit -m "feat: add trades server actions (createPatch, addTrade, updateTrade, deleteTrade)"
```

---

## Task 8: Create PatchTabs component

**Files:**
- Create: `components/trades/patch-tabs.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/trades/patch-tabs.tsx
"use client"

import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { Patch } from '@/lib/trades/types'

type Props = {
  patches: Patch[]
  activePatchId: string
  onTabChange: (patchId: string) => void
  onNewPatch: () => void
  isCreatingPatch: boolean
}

export function PatchTabs({
  patches,
  activePatchId,
  onTabChange,
  onNewPatch,
  isCreatingPatch,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2">
      <Tabs value={activePatchId} onValueChange={onTabChange}>
        <TabsList>
          {patches.map((patch) => (
            <TabsTrigger key={patch.id} value={patch.id}>
              {t('trades.patchLabel', { count: patch.patch_number * 100 })}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onNewPatch}
        disabled={isCreatingPatch}
        aria-label={t('trades.newPatch')}
      >
        {isCreatingPatch ? <Spinner className="size-3.5" /> : <Plus className="size-4" />}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/trades/patch-tabs.tsx
git commit -m "feat: add PatchTabs component"
```

---

## Task 9: Create TradesTable component

**Files:**
- Create: `components/trades/trades-table.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/trades/trades-table.tsx
"use client"

import { useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { EnrichedTrade } from '@/lib/trades/types'

type Props = {
  trades: EnrichedTrade[]
  onEdit: (trade: EnrichedTrade) => void
  onDelete: (trade: EnrichedTrade) => void
}

function fmtCurrency(value: number): string {
  return '$' + Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtPercent(value: number): string {
  return value.toFixed(2) + '%'
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const year = y.slice(2)
  return `${parseInt(d)} ${months[parseInt(m) - 1]} '${year}`
}

function fmtTime(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':')
  const h = parseInt(hStr)
  const ampm = h >= 12 ? 'P' : 'A'
  const h12 = h % 12 || 12
  return `${h12}:${mStr} ${ampm}`
}

export function TradesTable({ trades, onEdit, onDelete }: Props) {
  const { t } = useTranslation()

  const columns = useMemo<ColumnDef<EnrichedTrade>[]>(
    () => [
      {
        accessorKey: 'trade_number',
        header: t('trades.columns.number'),
        cell: ({ getValue }) => (
          <span className="font-medium tabular-nums">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'trade_date',
        header: t('trades.columns.date'),
        cell: ({ getValue }) => fmtDate(getValue<string>()),
      },
      {
        accessorKey: 'trade_time',
        header: t('trades.columns.time'),
        cell: ({ getValue }) => fmtTime(getValue<string>()),
      },
      {
        accessorKey: 'coin',
        header: t('trades.columns.coin'),
      },
      {
        accessorKey: 'direction',
        header: t('trades.columns.direction'),
        cell: ({ getValue }) => {
          const v = getValue<string>()
          return (
            <span className={v === 'long'
              ? 'text-green-600 dark:text-green-400 font-medium'
              : 'text-red-500 font-medium'
            }>
              {t(`trades.direction.${v}`)}
            </span>
          )
        },
      },
      {
        accessorKey: 'order_type',
        header: t('trades.columns.orderType'),
        cell: ({ getValue }) => t(`trades.orderType.${getValue<string>()}`),
      },
      {
        accessorKey: 'avg_entry',
        header: t('trades.columns.avgEntry'),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{fmtCurrency(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'stop_loss',
        header: t('trades.columns.stopLoss'),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{fmtCurrency(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'avg_exit',
        header: t('trades.columns.avgExit'),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{fmtCurrency(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'risk',
        header: t('trades.columns.risk'),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{fmtCurrency(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'realised_loss',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.realisedLoss')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number | null>()
          if (v === null) return null
          return <span className="tabular-nums text-red-500">{fmtCurrency(v)}</span>
        },
      },
      {
        accessorKey: 'realised_win',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.realisedWin')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number | null>()
          if (v === null) return null
          return (
            <span className="tabular-nums text-green-600 dark:text-green-400">
              {fmtCurrency(v)}
            </span>
          )
        },
      },
      {
        accessorKey: 'deviation',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.deviation')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number | null>()
          if (v === null) return null
          return <span className="tabular-nums">{fmtPercent(v)}</span>
        },
      },
      {
        accessorKey: 'r_multiple',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.rMultiple')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number>()
          return (
            <span className={`tabular-nums font-medium ${
              v >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500'
            }`}>
              {v.toFixed(2)}
            </span>
          )
        },
      },
      {
        accessorKey: 'risk_volatility',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.riskVolatility')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number | null>()
          if (v === null) return null
          return <span className="tabular-nums">{fmtPercent(v)}</span>
        },
      },
      {
        accessorKey: 'cumulative_pnl',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.cumulativePnl')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number>()
          return (
            <span className={`tabular-nums font-medium ${
              v >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500'
            }`}>
              {(v >= 0 ? '+' : '') + fmtCurrency(Math.abs(v))}
            </span>
          )
        },
      },
      {
        accessorKey: 'cumulative_r',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.cumulativeR')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number>()
          return (
            <span className={`tabular-nums font-medium ${
              v >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500'
            }`}>
              {v.toFixed(2)}
            </span>
          )
        },
      },
      {
        accessorKey: 'rules_followed',
        header: t('trades.columns.rulesFollowed'),
        cell: ({ getValue }) => {
          const v = getValue<boolean>()
          return (
            <span className={v
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-500'
            }>
              {t(v ? 'trades.form.rulesYes' : 'trades.form.rulesNo')}
            </span>
          )
        },
      },
      {
        accessorKey: 'setup_type',
        header: t('trades.columns.setupType'),
      },
      {
        id: 'actions',
        header: t('trades.columns.actions'),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(row.original)}
              aria-label={t('trades.editTrade')}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(row.original)}
              aria-label={t('trades.deleteTrade')}
            >
              <Trash2 className="size-3.5 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [t, onEdit, onDelete]
  )

  const table = useReactTable({
    data: trades,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="rounded-md border bg-background overflow-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id} className="whitespace-nowrap">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-muted-foreground"
              >
                {t('trades.emptyState')}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/trades/trades-table.tsx
git commit -m "feat: add TradesTable component (TanStack Table, 20 columns)"
```

---

## Task 10: Create TradeDrawer component

**Files:**
- Create: `components/trades/trade-drawer.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/trades/trade-drawer.tsx
"use client"

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { tradeSchema, type TradeSchema } from '@/lib/schemas/trade'
import { calcPreview } from '@/lib/trades/calculations'
import type { EnrichedTrade } from '@/lib/trades/types'

type Props = {
  open: boolean
  initialData?: EnrichedTrade   // undefined = add mode, defined = edit mode
  onClose: () => void
  onSave: (data: TradeSchema) => Promise<string | null>
}

export function TradeDrawer({ open, initialData, onClose, onSave }: Props) {
  const { t, i18n } = useTranslation()
  const isEdit = !!initialData

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TradeSchema>({
    resolver: yupResolver(tradeSchema),
    defaultValues: { rules_followed: true },
  })

  // Reset form whenever drawer opens (new data or fresh add)
  useEffect(() => {
    if (!open) return
    if (initialData) {
      reset({
        trade_date: initialData.trade_date,
        trade_time: initialData.trade_time.slice(0, 5), // "HH:MM"
        coin: initialData.coin,
        direction: initialData.direction,
        order_type: initialData.order_type,
        avg_entry: initialData.avg_entry,
        stop_loss: initialData.stop_loss,
        avg_exit: initialData.avg_exit,
        risk: initialData.risk,
        rules_followed: initialData.rules_followed,
        setup_type: initialData.setup_type,
      })
    } else {
      reset({ rules_followed: true })
    }
  }, [open, initialData, reset])

  const [watchEntry, watchStop, watchExit, watchRisk, watchDir] = watch([
    'avg_entry', 'stop_loss', 'avg_exit', 'risk', 'direction',
  ])
  const preview = calcPreview(watchEntry, watchStop, watchExit, watchRisk, watchDir)

  async function onSubmit(data: TradeSchema) {
    const error = await onSave(data)
    if (error) setError('root', { message: error })
  }

  const side = i18n.dir() === 'rtl' ? 'left' : 'right'

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side={side} className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t(isEdit ? 'trades.editTrade' : 'trades.addTrade')}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4 pb-8">
          {errors.root && (
            <p className="text-sm text-destructive">
              {t(errors.root.message!, { defaultValue: errors.root.message })}
            </p>
          )}

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trade_date">{t('trades.form.date')}</Label>
              <Input id="trade_date" type="date" {...register('trade_date')} />
              {errors.trade_date && (
                <p className="text-xs text-destructive">{t(errors.trade_date.message!)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trade_time">{t('trades.form.time')}</Label>
              <Input id="trade_time" type="time" {...register('trade_time')} />
              {errors.trade_time && (
                <p className="text-xs text-destructive">{t(errors.trade_time.message!)}</p>
              )}
            </div>
          </div>

          {/* Coin */}
          <div className="space-y-1.5">
            <Label htmlFor="coin">{t('trades.form.coin')}</Label>
            <Input
              id="coin"
              placeholder={t('trades.form.coinPlaceholder')}
              {...register('coin')}
            />
            {errors.coin && (
              <p className="text-xs text-destructive">{t(errors.coin.message!)}</p>
            )}
          </div>

          {/* Direction + Order Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('trades.form.direction')}</Label>
              <Select
                value={watch('direction') ?? ''}
                onValueChange={(v) =>
                  setValue('direction', v as 'long' | 'short', { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('trades.form.direction')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">{t('trades.form.directionLong')}</SelectItem>
                  <SelectItem value="short">{t('trades.form.directionShort')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.direction && (
                <p className="text-xs text-destructive">{t(errors.direction.message!)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t('trades.form.orderType')}</Label>
              <Select
                value={watch('order_type') ?? ''}
                onValueChange={(v) =>
                  setValue('order_type', v as 'market' | 'limit', { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('trades.form.orderType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">{t('trades.form.orderTypeMarket')}</SelectItem>
                  <SelectItem value="limit">{t('trades.form.orderTypeLimit')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.order_type && (
                <p className="text-xs text-destructive">{t(errors.order_type.message!)}</p>
              )}
            </div>
          </div>

          {/* Avg Entry + Stop Loss */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="avg_entry">{t('trades.form.avgEntry')}</Label>
              <Input
                id="avg_entry"
                type="number"
                step="any"
                placeholder="0.00"
                {...register('avg_entry', { valueAsNumber: true })}
              />
              {errors.avg_entry && (
                <p className="text-xs text-destructive">{t(errors.avg_entry.message!)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stop_loss">{t('trades.form.stopLoss')}</Label>
              <Input
                id="stop_loss"
                type="number"
                step="any"
                placeholder="0.00"
                {...register('stop_loss', { valueAsNumber: true })}
              />
              {errors.stop_loss && (
                <p className="text-xs text-destructive">{t(errors.stop_loss.message!)}</p>
              )}
            </div>
          </div>

          {/* Avg Exit + Risk */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="avg_exit">{t('trades.form.avgExit')}</Label>
              <Input
                id="avg_exit"
                type="number"
                step="any"
                placeholder="0.00"
                {...register('avg_exit', { valueAsNumber: true })}
              />
              {errors.avg_exit && (
                <p className="text-xs text-destructive">{t(errors.avg_exit.message!)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="risk">{t('trades.form.risk')}</Label>
              <Input
                id="risk"
                type="number"
                step="any"
                placeholder="0.00"
                {...register('risk', { valueAsNumber: true })}
              />
              {errors.risk && (
                <p className="text-xs text-destructive">{t(errors.risk.message!)}</p>
              )}
            </div>
          </div>

          {/* Rules + Setup Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('trades.form.rulesFollowed')}</Label>
              <Select
                value={watch('rules_followed') ? 'yes' : 'no'}
                onValueChange={(v) =>
                  setValue('rules_followed', v === 'yes', { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t('trades.form.rulesYes')}</SelectItem>
                  <SelectItem value="no">{t('trades.form.rulesNo')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup_type">{t('trades.form.setupType')}</Label>
              <Input
                id="setup_type"
                placeholder={t('trades.form.setupTypePlaceholder')}
                {...register('setup_type')}
              />
              {errors.setup_type && (
                <p className="text-xs text-destructive">{t(errors.setup_type.message!)}</p>
              )}
            </div>
          </div>

          {/* Live preview */}
          {preview && (
            <div className="rounded-md border bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('trades.form.preview')}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>
                  {t('trades.columns.rMultiple')}:{' '}
                  <span className={`font-medium ${
                    preview.r_multiple >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-500'
                  }`}>
                    {preview.r_multiple.toFixed(2)}R
                  </span>
                </span>
                {preview.realised_win !== null && (
                  <span>
                    {t('trades.columns.realisedWin')}:{' '}
                    <span className="font-medium text-green-600 dark:text-green-400">
                      ${preview.realised_win.toFixed(2)}
                    </span>
                  </span>
                )}
                {preview.realised_loss !== null && (
                  <span>
                    {t('trades.columns.realisedLoss')}:{' '}
                    <span className="font-medium text-red-500">
                      ${preview.realised_loss.toFixed(2)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('trades.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('trades.form.saving') : t('trades.form.save')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/trades/trade-drawer.tsx
git commit -m "feat: add TradeDrawer component (add/edit Sheet form)"
```

---

## Task 11: Create DeleteTradeDialog component

**Files:**
- Create: `components/trades/delete-trade-dialog.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/trades/delete-trade-dialog.tsx
"use client"

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { EnrichedTrade } from '@/lib/trades/types'

type Props = {
  trade: EnrichedTrade | null
  onClose: () => void
  onConfirm: (tradeId: string) => Promise<void>
}

export function DeleteTradeDialog({ trade, onClose, onConfirm }: Props) {
  const { t } = useTranslation()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirm() {
    if (!trade) return
    setIsDeleting(true)
    await onConfirm(trade.id)
    setIsDeleting(false)
  }

  return (
    <AlertDialog open={!!trade} onOpenChange={(o) => { if (!o) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('trades.deleteConfirmTitle', { number: trade?.trade_number ?? '' })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('trades.deleteConfirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isDeleting}>
            {t('trades.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('trades.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/trades/delete-trade-dialog.tsx
git commit -m "feat: add DeleteTradeDialog component"
```

---

## Task 12: Create TradesClient component

**Files:**
- Create: `components/trades/trades-client.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/trades/trades-client.tsx
"use client"

import { useEffect, useState, useTransition } from 'react'
import { useQueryState } from 'nuqs'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { PatchTabs } from './patch-tabs'
import { TradesTable } from './trades-table'
import { TradeDrawer } from './trade-drawer'
import { DeleteTradeDialog } from './delete-trade-dialog'
import { enrichTrades } from '@/lib/trades/calculations'
import {
  createPatch,
  getPatchTrades,
  addTrade,
  updateTrade,
  deleteTrade,
} from '@/lib/trades/actions'
import type { Patch, RawTrade, EnrichedTrade, TradeFormData } from '@/lib/trades/types'
import type { TradeSchema } from '@/lib/schemas/trade'

type DrawerState =
  | { open: false }
  | { open: true; mode: 'add' }
  | { open: true; mode: 'edit'; trade: EnrichedTrade }

type Props = {
  patches: Patch[]
  initialPatchId: string
}

export function TradesClient({ patches: initialPatches, initialPatchId }: Props) {
  const { t } = useTranslation()
  const [patches, setPatches] = useState<Patch[]>(initialPatches)
  const [patchId, setPatchId] = useQueryState('patch', { defaultValue: initialPatchId })
  const [rawTrades, setRawTrades] = useState<RawTrade[]>([])
  const [loadingTrades, setLoadingTrades] = useState(false)
  const [drawer, setDrawer] = useState<DrawerState>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<EnrichedTrade | null>(null)
  const [isPendingPatch, startPatchTransition] = useTransition()

  // Ensure active patch ID is always valid after patches list changes
  const activePatchId =
    patches.find((p) => p.id === patchId)?.id ??
    patches.at(-1)?.id ??
    ''

  useEffect(() => {
    if (!activePatchId) return
    setLoadingTrades(true)
    getPatchTrades(activePatchId).then(({ data }) => {
      setRawTrades(data)
      setLoadingTrades(false)
    })
  }, [activePatchId])

  function handleTabChange(id: string) {
    setPatchId(id)
  }

  function handleNewPatch() {
    startPatchTransition(async () => {
      const { data } = await createPatch()
      if (data) {
        setPatches((prev) => [...prev, data])
        setPatchId(data.id)
      }
    })
  }

  async function handleSave(data: TradeSchema): Promise<string | null> {
    const formData = data as TradeFormData

    let result: { error: string | null }
    if (drawer.open && drawer.mode === 'edit') {
      result = await updateTrade(drawer.trade.id, formData)
    } else {
      result = await addTrade(activePatchId, formData)
    }

    if (result.error) return result.error

    const { data: fresh } = await getPatchTrades(activePatchId)
    setRawTrades(fresh)
    setDrawer({ open: false })
    return null
  }

  async function handleDeleteConfirm(tradeId: string) {
    await deleteTrade(tradeId)
    const { data: fresh } = await getPatchTrades(activePatchId)
    setRawTrades(fresh)
    setDeleteTarget(null)
  }

  const enriched = enrichTrades(rawTrades)

  return (
    <div className="p-6 space-y-4">
      {/* Tabs row */}
      <div className="flex flex-wrap items-center gap-4">
        {patches.length > 0 && (
          <PatchTabs
            patches={patches}
            activePatchId={activePatchId}
            onTabChange={handleTabChange}
            onNewPatch={handleNewPatch}
            isCreatingPatch={isPendingPatch}
          />
        )}
        <div className="flex items-center gap-3 ms-auto">
          <span className="text-sm text-muted-foreground">
            {t('trades.tradeCount', { count: enriched.length })}
          </span>
          <Button onClick={() => setDrawer({ open: true, mode: 'add' })}>
            {t('trades.addTrade')}
          </Button>
        </div>
      </div>

      {/* Table */}
      {loadingTrades ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Spinner />
        </div>
      ) : (
        <TradesTable
          trades={enriched}
          onEdit={(trade) => setDrawer({ open: true, mode: 'edit', trade })}
          onDelete={(trade) => setDeleteTarget(trade)}
        />
      )}

      {/* Add / Edit drawer */}
      <TradeDrawer
        open={drawer.open}
        initialData={drawer.open && drawer.mode === 'edit' ? drawer.trade : undefined}
        onClose={() => setDrawer({ open: false })}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      <DeleteTradeDialog
        trade={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/trades/trades-client.tsx
git commit -m "feat: add TradesClient orchestrator component"
```

---

## Task 13: Wire up the Trades page

**Files:**
- Modify: `app/(dashboard)/trades/page.tsx`

- [ ] **Step 1: Replace the stub with the full Server Component**

Replace the entire contents of `app/(dashboard)/trades/page.tsx` with:

```tsx
// app/(dashboard)/trades/page.tsx
import { createClient } from '@/lib/supabase/server'
import { TradesClient } from '@/components/trades/trades-client'
import type { Patch } from '@/lib/trades/types'

export default async function TradesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth is already guarded by the dashboard layout, but we need user.id for the query
  if (!user) return null

  const { data: rows } = await supabase
    .from('patches')
    .select('*')
    .eq('user_id', user.id)
    .order('patch_number', { ascending: true })

  let patches: Patch[] = (rows ?? []) as Patch[]

  // Auto-create patch #1 on first visit
  if (patches.length === 0) {
    const { data: created } = await supabase
      .from('patches')
      .insert({ user_id: user.id, patch_number: 1 })
      .select()
      .single()
    if (created) patches = [created as Patch]
  }

  const initialPatchId = patches.at(-1)?.id ?? ''

  return <TradesClient patches={patches} initialPatchId={initialPatchId} />
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/trades/page.tsx
git commit -m "feat: wire up Trades page Server Component"
```

---

## Task 14: End-to-end verification

**Files:** None (manual testing only)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:3000` and sign in.

- [ ] **Step 2: Navigate to Trades**

Click "Trades" in the sidebar. You should see:
- A single tab labelled "100 Trades"
- A badge showing "0 / 100 trades"
- An "Add Trade" button
- The empty-state message in the table

- [ ] **Step 3: Add a trade**

Click "Add Trade". The drawer should slide in from the right (left in RTL). Fill in:
- Date: any date
- Time: any time
- Coin: BTC
- Direction: Long
- Order Type: Limit
- Avg Entry: 78000
- Stop Loss: 77500
- Avg Exit: 79000
- Risk ($): 150
- Rules?: Yes
- Setup Type: Trend Following

As you fill in the last numeric fields, the preview card should appear showing:
- R+/-: `2.00R` (green)
- Realised Win: `$300.00` (green)

Click Save. The drawer should close and the table should show one row with all columns populated.

- [ ] **Step 4: Verify calculated columns**

For the trade above (Long, Entry 78000, Stop 77500, Exit 79000, Risk 150):
- R+/- = (79000 − 78000) / (78000 − 77500) = 1000/500 = **2.00** ✓
- Realised Win = 2.00 × 150 = **$300.00** ✓
- Realised Loss = blank ✓
- Deviation = blank (win trade) ✓
- Risk Volatility = blank (first trade) ✓
- Cumulative PnL = **+$300.00** ✓
- Cumulative R = **2.00** ✓

- [ ] **Step 5: Edit the trade**

Click the pencil icon. The drawer should open pre-filled with the trade's values. Change Avg Exit to 77000 (a losing trade). Click Save.

Verify updated values:
- R+/- = (77000 − 78000) / (78000 − 77500) = −1000/500 = **−2.00** (red) ✓
- Realised Loss = 2.00 × 150 = **$300.00** (red) ✓
- Deviation = (300 − 150) / 150 × 100 = **100.00%** ✓
- Cumulative PnL = **−$300.00** (red) ✓

- [ ] **Step 6: Delete the trade**

Click the trash icon. A confirmation dialog should appear: "Delete trade #1?". Click Confirm. The table should return to the empty state.

- [ ] **Step 7: Create a new patch**

Click the "+" button next to the tabs. A new tab labelled "200 Trades" should appear and become active. The table for the new patch should be empty.

- [ ] **Step 8: Verify RTL**

Switch the app language to Arabic. The sidebar and drawer should appear on the right side. The drawer should slide from the left.

- [ ] **Step 9: Final commit**

```bash
git add .
git commit -m "feat: trades page — table, patches, add/edit/delete"
```
