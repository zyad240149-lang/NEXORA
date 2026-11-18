// نقل البيانات المحفوظة من النسخة القديمة (../بيانات-محفوظة/nexora-data.json) لـ Supabase.
// آمن للتكرار: العميل بيتعرف بـ legacy_id، فإعادة التشغيل مابتكرّرش حاجة.
// الاستخدام: node scripts/import-saved.mjs
import { readFileSync } from 'node:fs';
import { sql } from './_env.mjs';

const d = JSON.parse(readFileSync(new URL('../../بيانات-محفوظة/nexora-data.json', import.meta.url), 'utf8'));
const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

for (const c of d.customers ?? []) {
  const [row] = await sql(`insert into public.customers (legacy_id, name, country, phone_code, phone, business, url, notes, created_at)
    values (${q(c.id)}, ${q(c.name.trim())}, ${q(c.country)}, ${q(c.code)}, ${q(c.phone)}, ${q((c.biz ?? '').trim())}, ${q(c.url)}, ${q(c.notes)}, ${q(c.created)})
    on conflict (legacy_id) do update set name = excluded.name returning id, (xmax = 0) as inserted`);
  if (!row.inserted) { console.log('  = موجود', c.name.trim()); continue; }
  for (const s of c.subs ?? []) {
    await sql(`insert into public.subscriptions (customer_id, price, currency, starts_at, months, pay_status, pay_note)
      values ('${row.id}', ${Number(s.price)}, ${q(s.cur)}, ${q(s.start)}, ${Number(s.months)}, ${q(s.pay)}, ${q(s.payNote)})`);
  }
  console.log('  ✓', c.name.trim(), `(${(c.subs ?? []).length} اشتراك)`);
}
const [{ n }] = await sql('select count(*)::int as n from public.goals');
if (!n) for (const g of d.goals ?? []) {
  await sql(`insert into public.goals (name, description, starts_at, ends_at, target, is_main) values (${q(g.name)}, ${q(g.desc)}, ${q(g.start)}, ${q(g.end)}, ${Number(g.target)}, ${g.main ? 'true' : 'false'})`);
}
console.log('done');
