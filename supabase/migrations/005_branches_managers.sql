-- المشترك (المركز): فروعه + المدير ومدير التعاقد (واحد منهم أو الاتنين)
alter table public.customers add column if not exists branches jsonb not null default '[]'::jsonb
  check (jsonb_typeof(branches) = 'array');
alter table public.customers add column if not exists manager_name text;
alter table public.customers add column if not exists manager_phone text;
alter table public.customers add column if not exists contract_manager_name text;
alter table public.customers add column if not exists contract_manager_phone text;
