-- مدة الاشتراك بوحدة: يوم / شهر / سنة (months = عدد الوحدات). الاشتراكات الموجودة = شهور.
alter table public.subscriptions add column if not exists duration_unit text not null default 'm' check (duration_unit in ('d', 'm', 'y'));
alter table public.subscriptions drop column if exists ends_at;
alter table public.subscriptions add column ends_at timestamptz generated always as (
  ((starts_at at time zone 'Africa/Cairo') + case duration_unit
     when 'd' then make_interval(days => months)
     when 'y' then make_interval(years => months)
     else make_interval(months => months) end) at time zone 'Africa/Cairo'
) stored;
create index if not exists subscriptions_ends_idx on public.subscriptions(ends_at);
