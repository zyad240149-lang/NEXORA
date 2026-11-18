import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, ErrorState, Input, Modal, PasswordInput, Select, Skeleton, StatusBadge } from '../components/ui';
import { db } from '../data/db';
import { useToast } from '../hooks/useToast';
import type { Account } from '../types';
import { open, seal, vault } from '../utils/vault';

const SERVICES = ['Supabase', 'Cloudflare', 'GitHub', 'Google', 'أخرى'].map((v) => ({ value: v, label: v }));

export default function Accounts() {
  const toast = useToast();
  const [rows, setRows] = useState<Account[] | null>(null);
  const [error, setError] = useState(false);
  const [unlocked, setUnlocked] = useState(!!vault.get());
  const [shown, setShown] = useState<Record<string, string>>({});
  const [edit, setEdit] = useState<Account | 'new' | null>(null);
  const [q, setQ] = useState('');
  const reload = useCallback(() => { setError(false); db.accounts().then(setRows).catch(() => setError(true)); }, []);
  useEffect(reload, [reload]);

  const reveal = async (a: Account) => {
    if (shown[a.id]) return setShown(({ [a.id]: _, ...rest }) => rest);
    try { setShown({ ...shown, [a.id]: await open(a.passwordEnc, vault.get()!) }); } catch { toast.error('الكلمة الرئيسية مش مطابقة للي اتشفّرت بيها كلمة المرور دي'); }
  };
  const copy = async (a: Account) => {
    try { await navigator.clipboard.writeText(shown[a.id] ?? await open(a.passwordEnc, vault.get()!)); toast.success('اتنسخت كلمة المرور'); } catch { toast.error('تعذّر فك التشفير'); }
  };
  const del = async (a: Account) => {
    if (!confirm(`حذف حساب ${a.email}${a.projectName ? ` (${a.projectName})` : ''}؟`)) return;
    try { await db.deleteAccount(a.id); toast.success('تم الحذف'); reload(); } catch (e) { toast.error((e as Error).message); }
  };
  const list = (rows ?? []).filter((a) => !q.trim() || `${a.service} ${a.email} ${a.projectName} ${a.projectRef}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>الحسابات والمشاريع</h1><p>حسابات Supabase وغيرها، ومشاريع كل حساب، وكلمات المرور مشفّرة.</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unlocked && <Button variant="outline" icon="lock" onClick={() => { vault.set(null); setShown({}); setUnlocked(false); }}>قفل</Button>}
          <Button icon="plus" onClick={() => setEdit('new')} disabled={!unlocked}>إضافة حساب / مشروع</Button>
        </div>
      </div>

      {!unlocked && <Unlock rows={rows ?? []} onOpen={() => setUnlocked(true)} />}

      <div className="card" style={{ marginTop: unlocked ? 0 : 16 }}>
        <div className="card__body" style={{ paddingBottom: 0 }}>
          <Input label="بحث" icon="search" placeholder="الإيميل أو اسم المشروع أو الـ ref" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="card__body">
          {error ? <ErrorState onRetry={reload} /> : !rows ? <Skeleton h={200} /> : list.length === 0 ? (
            <EmptyState icon="lock" title="مفيش حسابات" text={unlocked ? 'أضف أول حساب من «إضافة حساب / مشروع».' : 'افتح الخزنة الأول بالكلمة الرئيسية.'} />
          ) : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>الخدمة</th><th>الحساب (الإيميل)</th><th>المشروع</th><th>Project ref</th><th>كلمة المرور</th><th>الحالة</th><th className="actions">الإجراءات</th></tr></thead>
              <tbody>{list.map((a) => (
                <tr key={a.id}>
                  <td>{a.service}</td>
                  <td dir="ltr" style={{ textAlign: 'end', fontWeight: 600 }}>{a.email}</td>
                  <td>{a.url ? <a href={a.url} target="_blank" rel="noreferrer">{a.projectName || a.url}</a> : a.projectName || '—'}{a.notes && <div className="muted-sm">{a.notes}</div>}</td>
                  <td className="num" dir="ltr" style={{ textAlign: 'end' }}>{a.projectRef || '—'}</td>
                  <td>{!a.passwordEnc ? '—' : (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <code dir="ltr" style={{ minWidth: 90 }}>{shown[a.id] ?? '••••••••'}</code>
                      {unlocked && <>
                        <Button size="sm" variant="ghost" icon={shown[a.id] ? 'eyeOff' : 'eye'} onClick={() => reveal(a)} aria-label="إظهار" />
                        <Button size="sm" variant="ghost" icon="copy" onClick={() => copy(a)} aria-label="نسخ" />
                      </>}
                    </div>)}</td>
                  <td><StatusBadge label={a.active ? 'شغّال' : 'متوقف'} tone={a.active ? 'ok' : 'muted'} /></td>
                  <td className="actions"><div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" variant="ghost" icon="edit" onClick={() => setEdit(a)} disabled={!unlocked} aria-label="تعديل" />
                    <Button size="sm" variant="ghost" icon="trash" onClick={() => del(a)} aria-label="حذف" />
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>
      {edit && <AccountModal account={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); setShown({}); reload(); }} />}
    </div>
  );
}

// فتح الخزنة: الكلمة الرئيسية بتتأكّد بفك أول كلمة مرور محفوظة (لو فيه). أول مرة = أي كلمة بتبقى هي الرئيسية.
function Unlock({ rows, onOpen }: { rows: Account[]; onOpen: () => void }) {
  const toast = useToast();
  const [m, setM] = useState('');
  const [busy, setBusy] = useState(false);
  const first = rows.find((r) => r.passwordEnc);
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (m.length < 8) return toast.error('الكلمة الرئيسية 8 حروف على الأقل');
    setBusy(true);
    try { if (first) await open(first.passwordEnc, m); vault.set(m); onOpen(); }
    catch { toast.error('الكلمة الرئيسية غلط'); } finally { setBusy(false); }
  };
  return (
    <form className="card" onSubmit={go}>
      <div className="card__body" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px' }}>
          <PasswordInput label={first ? 'الكلمة الرئيسية لفتح الخزنة' : 'اختار كلمة رئيسية للخزنة (أول مرة)'} value={m} onChange={(e) => setM(e.target.value)} autoComplete="off" />
        </div>
        <Button type="submit" icon="lock" loading={busy}>فتح</Button>
      </div>
      <div className="card__body muted-sm" style={{ paddingTop: 0 }}>الكلمة الرئيسية مش بتتحفظ في أي مكان، لا على السيرفر ولا على الجهاز. لو نسيتها مش هتقدر ترجّع كلمات المرور.</div>
    </form>
  );
}

function AccountModal({ account, onClose, onSaved }: { account?: Account; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ service: account?.service ?? 'Supabase', email: account?.email ?? '', projectName: account?.projectName ?? '', projectRef: account?.projectRef ?? '', url: account?.url ?? '', notes: account?.notes ?? '', active: account?.active ?? true });
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (!f.email.trim()) return toast.error('اكتب إيميل الحساب');
    setBusy(true);
    try {
      const passwordEnc = pw ? await seal(pw, vault.get()!) : account?.passwordEnc ?? '';
      await db.saveAccount({ id: account?.id, ...f, email: f.email.trim(), projectRef: f.projectRef.trim(), passwordEnc });
      toast.success('تم الحفظ'); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal title={account ? 'تعديل حساب' : 'حساب / مشروع جديد'} onClose={onClose}
      footer={<><Button onClick={save} loading={busy}>حفظ</Button><Button variant="outline" onClick={onClose}>إلغاء</Button></>}>
      <div className="form-grid">
        <Select label="الخدمة" value={f.service} onChange={set('service')} options={SERVICES} />
        <Input label="إيميل الحساب" type="email" dir="ltr" value={f.email} onChange={set('email')} />
        <Input label="اسم المشروع" value={f.projectName} onChange={set('projectName')} placeholder="مثلًا: بلتاجي" />
        <Input label="Project ref" dir="ltr" value={f.projectRef} onChange={set('projectRef')} />
        <Input label="رابط المشروع" dir="ltr" value={f.url} onChange={set('url')} />
        <PasswordInput label={account?.passwordEnc ? 'كلمة مرور جديدة (سيبها فاضية لو مش هتغيّرها)' : 'كلمة المرور (قاعدة البيانات أو الحساب)'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <Select label="الحالة" value={f.active ? '1' : '0'} onChange={(e) => setF({ ...f, active: e.target.value === '1' })} options={[{ value: '1', label: 'شغّال' }, { value: '0', label: 'متوقف' }]} />
        <Input label="ملاحظات" value={f.notes} onChange={set('notes')} />
      </div>
    </Modal>
  );
}
