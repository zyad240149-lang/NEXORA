-- حسابات الخدمات (Supabase وغيرها) ومشاريعها.
-- كلمة المرور بتتشفّر في المتصفح (AES-GCM بكلمة سر رئيسية) قبل ما تتبعت — القاعدة مابتشوفش النص الأصلي أبدًا.
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  service text not null default 'Supabase',
  email text not null,
  project_name text,
  project_ref text,
  url text,
  password_enc text,          -- base64(salt|iv|ciphertext) — مشفّر من الواجهة
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.accounts enable row level security;
drop policy if exists accounts_staff on public.accounts;
create policy accounts_staff on public.accounts for all to authenticated using (true) with check (true);
revoke all on public.accounts from anon;
grant select, insert, update, delete on public.accounts to authenticated;
