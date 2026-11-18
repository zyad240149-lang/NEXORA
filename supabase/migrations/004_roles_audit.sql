-- الأدوار والصلاحيات وسجل التعديلات.
--   admin : كل حاجة (العملاء، الاشتراكات، السيلز، الحسابات، المستخدمين)
--   sales : يشوف المراكز والاشتراكات والعمولات بتاعته بس، ويضيف مركز يتسجّل باسمه تلقائيًا. مايشوفش «الحسابات والمشاريع».
-- أي مستخدم في Auth مالوش صف في profiles = مالوش أي صلاحية.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'sales')),
  sales_rep_id uuid references public.sales_reps(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.my_role() returns text language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() and active $$;
create or replace function public.my_rep() returns uuid language sql stable security definer set search_path = public as
$$ select sales_rep_id from profiles where id = auth.uid() and active and role = 'sales' $$;
revoke all on function public.my_role() from public, anon;
revoke all on function public.my_rep() from public, anon;
grant execute on function public.my_role() to authenticated;
grant execute on function public.my_rep() to authenticated;

-- استبدال سياسات «أي مسجّل» القديمة
do $$ declare t text; begin
  foreach t in array array['customers', 'subscriptions', 'goals', 'accounts', 'sales_reps'] loop
    execute format('drop policy if exists %1$s_staff on public.%1$s', t);
  end loop;
end $$;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select to authenticated using (id = auth.uid() or my_role() = 'admin');
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');
grant select, insert, update, delete on public.profiles to authenticated;
revoke all on public.profiles from anon;

-- المدير: كل الجداول
do $$ declare t text; begin
  foreach t in array array['customers', 'subscriptions', 'goals', 'accounts', 'sales_reps'] loop
    execute format('drop policy if exists %1$s_admin on public.%1$s', t);
    execute format($p$create policy %1$s_admin on public.%1$s for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin')$p$, t);
  end loop;
end $$;

-- السيلز
drop policy if exists customers_sales_read on public.customers;
create policy customers_sales_read on public.customers for select to authenticated using (my_role() = 'sales' and sales_rep_id = my_rep());
drop policy if exists customers_sales_insert on public.customers;
create policy customers_sales_insert on public.customers for insert to authenticated with check (my_role() = 'sales' and sales_rep_id = my_rep());
drop policy if exists customers_sales_update on public.customers;
create policy customers_sales_update on public.customers for update to authenticated using (my_role() = 'sales' and sales_rep_id = my_rep()) with check (sales_rep_id = my_rep());
drop policy if exists subs_sales_read on public.subscriptions;
create policy subs_sales_read on public.subscriptions for select to authenticated using (my_role() = 'sales' and sales_rep_id = my_rep());
drop policy if exists reps_sales_read on public.sales_reps;
create policy reps_sales_read on public.sales_reps for select to authenticated using (my_role() = 'sales' and id = my_rep());
drop policy if exists goals_sales_read on public.goals;
create policy goals_sales_read on public.goals for select to authenticated using (my_role() = 'sales');

-- السيلز مايقدرش يغيّر نسبته بنفسه: النسبة على المركز بتتحط من النسبة الافتراضية بتاعته
create or replace function public.customers_sales_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if my_role() = 'sales' then
    new.sales_rep_id := my_rep();
    if tg_op = 'INSERT' then
      new.sales_pct := (select default_pct from sales_reps where id = my_rep());
    else
      new.sales_pct := old.sales_pct;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists customers_sales_guard on public.customers;
create trigger customers_sales_guard before insert or update on public.customers for each row execute function public.customers_sales_guard();

-- سجل التعديلات: مين عمل إيه وإمتى (للمدير بس)
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  user_name text,
  table_name text not null,
  action text not null,
  row_id text,
  old_data jsonb,
  new_data jsonb
);
alter table public.audit_log enable row level security;
drop policy if exists audit_admin on public.audit_log;
create policy audit_admin on public.audit_log for select to authenticated using (my_role() = 'admin');
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create or replace function public.audit_row() returns trigger language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  -- كلمات المرور المشفّرة مابتتسجّلش في السجل
  if tg_table_name = 'accounts' then o := o - 'password_enc'; n := n - 'password_enc'; end if;
  insert into audit_log(user_id, user_name, table_name, action, row_id, old_data, new_data)
  values (auth.uid(), (select name from profiles where id = auth.uid()), tg_table_name, lower(tg_op), coalesce(n->>'id', o->>'id'), o, n);
  return coalesce(new, old);
end $$;
do $$ declare t text; begin
  foreach t in array array['customers', 'subscriptions', 'sales_reps', 'accounts', 'goals', 'profiles'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit_row()', t);
  end loop;
end $$;
revoke all on function public.audit_row() from public, anon, authenticated;
revoke all on function public.customers_sales_guard() from public, anon, authenticated;
