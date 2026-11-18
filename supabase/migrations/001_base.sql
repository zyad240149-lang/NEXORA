-- Nexora: العملاء والاشتراكات والأهداف. الدخول للمدير بس (أي مستخدم مسجّل في Supabase Auth = موظف إدارة).
create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,                 -- رقم العميل في النسخة القديمة (C-001...)
  name text not null check (length(trim(name)) > 0),
  country text not null default 'EG' check (country in ('EG', 'SA')),
  phone_code text not null default '+20',
  phone text,
  business text,
  url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'EGP' check (currency in ('EGP', 'SAR')),
  starts_at timestamptz not null,
  months int not null check (months > 0),
  ends_at timestamptz generated always as ((starts_at at time zone 'Africa/Cairo' + make_interval(months => months)) at time zone 'Africa/Cairo') stored,
  pay_status text not null default 'unpaid' check (pay_status in ('paid', 'partial', 'unpaid')),
  pay_note text,
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_customer_idx on public.subscriptions(customer_id);
create index if not exists subscriptions_ends_idx on public.subscriptions(ends_at);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  target int not null check (target > 0),
  is_main boolean not null default false
);

alter table public.customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.goals enable row level security;

do $$ declare t text; begin
  foreach t in array array['customers', 'subscriptions', 'goals'] loop
    execute format('drop policy if exists %1$s_staff on public.%1$s', t);
    execute format('create policy %1$s_staff on public.%1$s for all to authenticated using (true) with check (true)', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
