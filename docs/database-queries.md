# Database Queries

Run these queries on **`trading-logs-prod`** before go-live.
For development, run on **`trading-logs-dev`**.

Supabase SQL editor: Dashboard → SQL Editor → New query.

---

## Notes

- Supabase handles the `auth.users` table automatically — do not create it manually.
- All custom tables live in the `public` schema.
- Enable **Row Level Security (RLS)** on every table immediately after creation.
- Use `auth.uid()` in RLS policies to scope data to the logged-in user.

---

## Tables

### profiles

Extends `auth.users` with app-specific user data. Created automatically via trigger on signup.

```sql
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

-- Users can only read and update their own profile
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

### trades

Core table. Each row is one manually logged trade.

```sql
create table public.trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  direction text check (direction in ('long', 'short')) not null,
  entry_price numeric not null,
  exit_price numeric,
  quantity numeric not null,
  entry_date timestamptz not null,
  exit_date timestamptz,
  pnl numeric,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.trades enable row level security;

-- Users can only access their own trades
create policy "Users can view their own trades"
  on public.trades for select
  using (auth.uid() = user_id);

create policy "Users can insert their own trades"
  on public.trades for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own trades"
  on public.trades for update
  using (auth.uid() = user_id);

create policy "Users can delete their own trades"
  on public.trades for delete
  using (auth.uid() = user_id);
```

---

## Indexes

```sql
-- Speed up per-user trade lookups
create index trades_user_id_idx on public.trades (user_id);

-- Speed up date-range filtering
create index trades_entry_date_idx on public.trades (entry_date desc);
```

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

---

## Checklist Before Running on Production

- [ ] Run `profiles` table + trigger first
- [ ] Run `trades` table
- [ ] Run indexes
- [ ] Confirm RLS is enabled: Supabase → Table Editor → each table → RLS badge should show "Enabled"
- [ ] Test with a real signup to confirm profile trigger fires
