-- السيلز: كل مركز (عميل) ممكن يتربط بسيلز ونسبة من الاشتراك.
-- العمولة = سعر الاشتراك × النسبة. النسبة بتتنسخ على الاشتراك وقت إنشائه، فتغيير نسبة العميل بعدين مابيغيّرش عمولات قديمة.
create table if not exists public.sales_reps (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  phone text,
  default_pct numeric(5, 2) not null default 10 check (default_pct between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.customers add column if not exists sales_rep_id uuid references public.sales_reps(id) on delete set null;
alter table public.customers add column if not exists sales_pct numeric(5, 2) check (sales_pct between 0 and 100);
alter table public.subscriptions add column if not exists sales_rep_id uuid references public.sales_reps(id) on delete set null;
alter table public.subscriptions add column if not exists sales_pct numeric(5, 2) check (sales_pct between 0 and 100);
alter table public.subscriptions add column if not exists commission_paid boolean not null default false;

alter table public.sales_reps enable row level security;
drop policy if exists sales_reps_staff on public.sales_reps;
create policy sales_reps_staff on public.sales_reps for all to authenticated using (true) with check (true);
revoke all on public.sales_reps from anon;
grant select, insert, update, delete on public.sales_reps to authenticated;
