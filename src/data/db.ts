// ===============================================================
// الطبقة الوحيدة اللي بتكلّم البيانات. Supabase لو متربط، وإلا localStorage
// (أول تشغيل محلي بيتعبّى من البيانات المحفوظة من النسخة القديمة).
// ===============================================================
import { supabase } from '../lib/supabase';
import type { Account, Customer, Goal, SalesRep, Subscription } from '../types';
import { addDuration } from '../utils/format';

const KEY = 'nexora_cloud_v1';
type Local = { customers: Customer[]; goals: Goal[]; accounts?: Account[]; reps?: SalesRep[] };
const nn = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
const uid = () => crypto.randomUUID();

async function loadSeed(): Promise<Local> {
  try {
    const m = await import('./seed.json');
    const d = (m as any).default ?? m;
    return {
      customers: (d.customers ?? []).map((c: any) => ({ ...c, name: c.name.trim(), biz: (c.biz ?? '').trim(), subs: (c.subs ?? []).map((s: any) => ({ ...s, customerId: c.id })) })),
      goals: (d.goals ?? []).map((g: any) => ({ id: g.id, name: g.name, desc: g.desc ?? '', start: g.start, end: g.end, target: g.target, main: !!g.main })),
    };
  } catch { return { customers: [], goals: [] }; }
}
async function local(): Promise<Local> {
  try { const j = localStorage.getItem(KEY); if (j) return JSON.parse(j); } catch { /* ignore */ }
  const s = await loadSeed(); saveLocal(s); return s;
}
function saveLocal(d: Local) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ } }

const map = {
  customer: (r: any, subs: Subscription[]): Customer => ({ id: r.id, name: r.name, country: r.country, code: r.phone_code, phone: r.phone ?? '', biz: r.business ?? '', url: r.url ?? '', notes: r.notes ?? '', created: r.created_at, salesId: r.sales_rep_id ?? null, salesPct: nn(r.sales_pct), branches: r.branches ?? [], managerName: r.manager_name ?? '', managerPhone: r.manager_phone ?? '', contractManagerName: r.contract_manager_name ?? '', contractManagerPhone: r.contract_manager_phone ?? '', subs }),
  sub: (r: any): Subscription => ({ id: r.id, customerId: r.customer_id, price: Number(r.price), cur: r.currency, start: r.starts_at, months: r.months, unit: r.duration_unit ?? 'm', end: r.ends_at, pay: r.pay_status, payNote: r.pay_note ?? '', salesId: r.sales_rep_id ?? null, salesPct: nn(r.sales_pct), commissionPaid: !!r.commission_paid }),
  rep: (r: any): SalesRep => ({ id: r.id, name: r.name, phone: r.phone ?? '', defaultPct: Number(r.default_pct), active: r.active }),
  account: (r: any): Account => ({ id: r.id, service: r.service, email: r.email, projectName: r.project_name ?? '', projectRef: r.project_ref ?? '', url: r.url ?? '', passwordEnc: r.password_enc ?? '', notes: r.notes ?? '', active: r.active, created: r.created_at }),
  goal: (r: any): Goal => ({ id: r.id, name: r.name, desc: r.description ?? '', start: r.starts_at, end: r.ends_at, target: r.target, main: r.is_main }),
};
const ok = <T,>({ data, error }: { data: T; error: any }) => { if (error) throw new Error(error.message); return data; };

export const db = {
  async customers(): Promise<Customer[]> {
    if (!supabase) return (await local()).customers.map((c) => ({ ...c, branches: c.branches ?? [], managerName: c.managerName ?? '', managerPhone: c.managerPhone ?? '', contractManagerName: c.contractManagerName ?? '', contractManagerPhone: c.contractManagerPhone ?? '', salesId: c.salesId ?? null, salesPct: c.salesPct ?? null, subs: c.subs.map((s) => ({ ...s, unit: s.unit ?? 'm', salesId: s.salesId ?? null, salesPct: s.salesPct ?? null, commissionPaid: !!s.commissionPaid })) }));
    const [cs, ss] = await Promise.all([supabase.from('customers').select('*').order('created_at'), supabase.from('subscriptions').select('*').order('starts_at')]);
    const subs = (ok(ss) as any[]).map(map.sub);
    return (ok(cs) as any[]).map((r) => map.customer(r, subs.filter((s) => s.customerId === r.id)));
  },
  async saveGoal(g: Omit<Goal, 'id'> & { id?: string }) {
    if (!supabase) {
      const d = await local(); if (g.main) d.goals.forEach((x) => { x.main = false; });
      const i = d.goals.findIndex((x) => x.id === g.id);
      if (i >= 0) d.goals[i] = { ...g, id: d.goals[i].id }; else d.goals.push({ ...g, id: uid() });
      return saveLocal(d);
    }
    if (g.main) ok(await supabase.from('goals').update({ is_main: false }).neq('id', g.id ?? '00000000-0000-0000-0000-000000000000'));
    const row = { name: g.name, description: g.desc, starts_at: g.start, ends_at: g.end, target: g.target, is_main: g.main };
    ok(g.id ? await supabase.from('goals').update(row).eq('id', g.id) : await supabase.from('goals').insert(row));
  },
  async deleteGoal(id: string) {
    if (!supabase) { const d = await local(); d.goals = d.goals.filter((x) => x.id !== id); return saveLocal(d); }
    ok(await supabase.from('goals').delete().eq('id', id));
  },
  async goals(): Promise<Goal[]> {
    if (!supabase) return (await local()).goals;
    return (ok(await supabase.from('goals').select('*').order('starts_at')) as any[]).map(map.goal);
  },
  // اشتراكات العميل اللي لسه مالهاش سيلز بتاخد السيلز والنسبة الجديدين (اللي ليها سيلز مابتتلمسش)
  async saveCustomer(c: Omit<Customer, 'subs' | 'created' | 'id'> & { id?: string }): Promise<string> {
    if (!supabase) {
      const d = await local(); const i = d.customers.findIndex((x) => x.id === c.id);
      if (i >= 0) {
        d.customers[i] = { ...d.customers[i], ...c, id: d.customers[i].id };
        if (c.salesId) d.customers[i].subs.forEach((s) => { if (!s.salesId) { s.salesId = c.salesId; s.salesPct = c.salesPct; } });
        saveLocal(d); return d.customers[i].id;
      }
      const nid = uid(); d.customers.push({ ...c, id: nid, created: new Date().toISOString(), subs: [] });
      saveLocal(d); return nid;
    }
    const row = { name: c.name, country: c.country, phone_code: c.code, phone: c.phone, business: c.biz, url: c.url, notes: c.notes, sales_rep_id: c.salesId, sales_pct: c.salesId ? c.salesPct : null, branches: c.branches, manager_name: c.managerName || null, manager_phone: c.managerPhone || null, contract_manager_name: c.contractManagerName || null, contract_manager_phone: c.contractManagerPhone || null };
    if (!c.id) return (ok(await supabase.from('customers').insert(row).select('id').single()) as any).id;
    ok(await supabase.from('customers').update(row).eq('id', c.id));
    if (c.salesId) ok(await supabase.from('subscriptions').update({ sales_rep_id: c.salesId, sales_pct: c.salesPct }).eq('customer_id', c.id).is('sales_rep_id', null));
    return c.id;
  },
  async deleteCustomer(id: string) {
    if (!supabase) { const d = await local(); d.customers = d.customers.filter((x) => x.id !== id); return saveLocal(d); }
    ok(await supabase.from('customers').delete().eq('id', id));
  },
  async saveSub(s: Omit<Subscription, 'id' | 'end'> & { id?: string }) {
    const end = addDuration(s.start, s.months, s.unit);
    if (!supabase) {
      const d = await local(); const c = d.customers.find((x) => x.id === s.customerId)!;
      const i = c.subs.findIndex((x) => x.id === s.id);
      const full = { ...s, id: s.id || uid(), end };
      if (i >= 0) c.subs[i] = full; else c.subs.push(full);
      return saveLocal(d);
    }
    const row = { customer_id: s.customerId, price: s.price, currency: s.cur, starts_at: s.start, months: s.months, duration_unit: s.unit, pay_status: s.pay, pay_note: s.payNote, sales_rep_id: s.salesId, sales_pct: s.salesId ? s.salesPct : null, commission_paid: s.commissionPaid };
    ok(s.id ? await supabase.from('subscriptions').update(row).eq('id', s.id) : await supabase.from('subscriptions').insert(row));
  },
  async deleteSub(customerId: string, id: string) {
    if (!supabase) { const d = await local(); const c = d.customers.find((x) => x.id === customerId)!; c.subs = c.subs.filter((s) => s.id !== id); return saveLocal(d); }
    ok(await supabase.from('subscriptions').delete().eq('id', id));
  },
  async setCommissionPaid(customerId: string, id: string, paid: boolean) {
    if (!supabase) { const d = await local(); const s = d.customers.find((x) => x.id === customerId)?.subs.find((x) => x.id === id); if (s) s.commissionPaid = paid; return saveLocal(d); }
    ok(await supabase.from('subscriptions').update({ commission_paid: paid }).eq('id', id));
  },
  async reps(): Promise<SalesRep[]> {
    if (!supabase) return (await local()).reps ?? [];
    return (ok(await supabase.from('sales_reps').select('*').order('name')) as any[]).map(map.rep);
  },
  async saveRep(r: Omit<SalesRep, 'id'> & { id?: string }): Promise<string> {
    if (!supabase) {
      const d = await local(); d.reps ??= []; const i = d.reps.findIndex((x) => x.id === r.id);
      const id = i >= 0 ? d.reps[i].id : uid();
      if (i >= 0) d.reps[i] = { ...d.reps[i], ...r, id }; else d.reps.push({ ...r, id });
      saveLocal(d); return id;
    }
    const row = { name: r.name, phone: r.phone, default_pct: r.defaultPct, active: r.active };
    if (r.id) { ok(await supabase.from('sales_reps').update(row).eq('id', r.id)); return r.id; }
    return (ok(await supabase.from('sales_reps').insert(row).select('id').single()) as any).id;
  },
  async deleteRep(id: string) {
    if (!supabase) {
      const d = await local(); d.reps = (d.reps ?? []).filter((x) => x.id !== id);
      d.customers.forEach((c) => { if (c.salesId === id) { c.salesId = null; c.salesPct = null; } c.subs.forEach((s) => { if (s.salesId === id) { s.salesId = null; s.salesPct = null; } }); });
      return saveLocal(d);
    }
    ok(await supabase.from('sales_reps').delete().eq('id', id));
  },
  async accounts(): Promise<Account[]> {
    if (!supabase) return (await local()).accounts ?? [];
    return (ok(await supabase.from('accounts').select('*').order('service').order('email')) as any[]).map(map.account);
  },
  async saveAccount(a: Omit<Account, 'id' | 'created'> & { id?: string }) {
    if (!supabase) {
      const d = await local(); d.accounts ??= []; const i = d.accounts.findIndex((x) => x.id === a.id);
      if (i >= 0) d.accounts[i] = { ...d.accounts[i], ...a, id: d.accounts[i].id };
      else d.accounts.push({ ...a, id: uid(), created: new Date().toISOString() });
      return saveLocal(d);
    }
    const row = { service: a.service, email: a.email, project_name: a.projectName, project_ref: a.projectRef, url: a.url, password_enc: a.passwordEnc || null, notes: a.notes, active: a.active };
    ok(a.id ? await supabase.from('accounts').update(row).eq('id', a.id) : await supabase.from('accounts').insert(row));
  },
  async deleteAccount(id: string) {
    if (!supabase) { const d = await local(); d.accounts = (d.accounts ?? []).filter((x) => x.id !== id); return saveLocal(d); }
    ok(await supabase.from('accounts').delete().eq('id', id));
  },
};

// آخر اشتراك للعميل = الحالي
export const commission = (s: Subscription) => (s.salesId && s.salesPct ? Math.round(s.price * s.salesPct) / 100 : 0);
export const currentSub =(c: Customer) => [...c.subs].sort((a, b) => Date.parse(b.end) - Date.parse(a.end))[0];
