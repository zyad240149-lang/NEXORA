// إنشاء مستخدم (مدير أو سيلز) من جهاز المطوّر.
// الاستخدام: node scripts/create-user.mjs <email> <password> <name> [admin|sales] [sales_rep_id]
import { env, sql } from './_env.mjs';

const [email, password, name, role = 'admin', rep = null] = process.argv.slice(2);
if (!email || !password || !name) { console.error('usage: create-user.mjs <email> <password> <name> [admin|sales] [sales_rep_id]'); process.exit(1); }
const r = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, email_confirm: true }),
});
const j = await r.json();
if (!r.ok) { console.error(j); process.exit(1); }
const q = (v) => (v ? `'${String(v).replace(/'/g, "''")}'` : 'null');
await sql(`insert into public.profiles (id, name, role, sales_rep_id) values ('${j.id}', ${q(name)}, ${q(role)}, ${q(rep)})`);
console.log('✓', email, role);
