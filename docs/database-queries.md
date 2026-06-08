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

## Checklist Before Running on Production

- [ ] Run `profiles` table + trigger first
- [ ] Run `trades` table
- [ ] Run indexes
- [ ] Confirm RLS is enabled: Supabase → Table Editor → each table → RLS badge should show "Enabled"
- [ ] Test with a real signup to confirm profile trigger fires
