import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, ErrorState, Input, Modal, Select, Skeleton, StatusBadge } from '../components/ui';
import { commission, db } from '../data/db';
import { useToast } from '../hooks/useToast';
import type { Customer, SalesRep } from '../types';
import { fmtDate, money } from '../utils/format';
import { useAuth } from '../services/auth';

const sumByCur = (xs: { cur: string; v: number }[]) => {
  const o: Record<string, number> = {};
  xs.forEach((x) => { o[x.cur] = (o[x.cur] ?? 0) + x.v; });
  return Object.entries(o).map(([c, v]) => money(v, c)).join(' + ') || '0';
};

export default function Sales() {
  const toast = useToast();
  const admin = useAuth().user?.role === 'admin';
  const [reps, setReps] = useState<SalesRep[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState(false);
  const [edit, setEdit] = useState<SalesRep | 'new' | null>(null);
  const [rep, setRep] = useState('');
  const [paid, setPaid] = useState('');
  const reload = useCallback(() => {
    setError(false);
    Promise.all([db.reps(), db.customers()]).then(([r, c]) => { setReps(r); setCustomers(c); }).catch(() => setError(true));
  }, []);
  useEffect(reload, [reload]);

  const lines = customers.flatMap((c) => c.subs.filter((s) => s.salesId).map((s) => ({ c, s, v: commission(s) })));
  const repName = (id: string | null) => reps?.find((r) => r.id === id)?.name ?? '—';
  const shown = lines.filter((l) => (!rep || l.s.salesId === rep) && (!paid || String(l.s.commissionPaid) === paid))
    .sort((a, b) => Date.parse(b.s.start) - Date.parse(a.s.start));
  const togglePaid = async (c: Customer, id: string, v: boolean) => {
    try { await db.setCommissionPaid(c.id, id, v); reload(); } catch (e) { toast.error((e as Error).message); }
  };
  const del = async (r: SalesRep) => {
    if (!confirm(`حذف السيلز «${r.name}»؟ المراكز والاشتراكات المرتبطة بيه هتبقى بدون سيلز.`)) return;
    try { await db.deleteRep(r.id); toast.success('تم الحذف'); reload(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>السيلز</h1><p>فريق السيلز ونسبة كل واحد من اشتراكات المراكز اللي جابها.</p></div>
        {admin && <Button icon="plus" onClick={() => setEdit('new')}>سيلز جديد</Button>}
      </div>

      {error ? <ErrorState onRetry={reload} /> : !reps ? <Skeleton h={200} /> : (<>
        <div className="card">
          <div className="card__head"><h3>فريق السيلز</h3></div>
          <div className="card__body">
            {reps.length === 0 ? <EmptyState icon="users" title="مفيش سيلز" text="أضف سيلز من هنا، أو من نافذة إضافة مركز." /> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>الاسم</th><th>النسبة الافتراضية</th><th>المراكز</th><th>إجمالي العمولة</th><th>مستحق (لم يُصرف)</th><th>الحالة</th><th className="actions">الإجراءات</th></tr></thead>
                <tbody>{reps.map((r) => {
                  const mine = lines.filter((l) => l.s.salesId === r.id);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.name}{r.phone && <div className="muted-sm num" dir="ltr" style={{ textAlign: 'end' }}>{r.phone}</div>}</td>
                      <td className="num">{r.defaultPct}%</td>
                      <td className="num">{customers.filter((c) => c.salesId === r.id).length}</td>
                      <td className="num">{sumByCur(mine.map((l) => ({ cur: l.s.cur, v: l.v })))}</td>
                      <td className="num" style={{ color: 'var(--warn)', fontWeight: 600 }}>{sumByCur(mine.filter((l) => !l.s.commissionPaid).map((l) => ({ cur: l.s.cur, v: l.v })))}</td>
                      <td><StatusBadge label={r.active ? 'شغّال' : 'متوقف'} tone={r.active ? 'ok' : 'muted'} /></td>
                      <td className="actions">{admin && <div style={{ display: 'flex', gap: 6 }}>
                        <Button size="sm" variant="ghost" icon="edit" onClick={() => setEdit(r)} aria-label="تعديل" />
                        <Button size="sm" variant="ghost" icon="trash" onClick={() => del(r)} aria-label="حذف" />
                      </div>}</td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card__head"><h3>العمولات</h3></div>
          <div className="card__body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingBottom: 0 }}>
            <div style={{ minWidth: 200 }}><Select label="السيلز" value={rep} onChange={(e) => setRep(e.target.value)} options={[{ value: '', label: 'الكل' }, ...reps.map((r) => ({ value: r.id, label: r.name }))]} /></div>
            <div style={{ minWidth: 200 }}><Select label="الصرف" value={paid} onChange={(e) => setPaid(e.target.value)} options={[{ value: '', label: 'الكل' }, { value: 'false', label: 'لم تُصرف' }, { value: 'true', label: 'اتصرفت' }]} /></div>
          </div>
          <div className="card__body">
            {shown.length === 0 ? <EmptyState icon="wallet" title="مفيش عمولات" text="العمولة بتظهر لما يبقى للمركز سيلز وله اشتراك." /> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>المركز</th><th>السيلز</th><th>الاشتراك</th><th>البداية</th><th>النسبة</th><th>العمولة</th><th>دفع العميل</th><th>صرف العمولة</th></tr></thead>
                <tbody>{shown.map(({ c, s, v }) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{repName(s.salesId)}</td>
                    <td className="num">{money(s.price, s.cur)}</td>
                    <td>{fmtDate(s.start)}</td>
                    <td className="num">{s.salesPct}%</td>
                    <td className="num" style={{ fontWeight: 700 }}>{money(v, s.cur)}</td>
                    <td><StatusBadge label={s.pay === 'paid' ? 'مدفوع' : s.pay === 'partial' ? 'جزئي' : 'غير مدفوع'} tone={s.pay === 'paid' ? 'ok' : s.pay === 'partial' ? 'warn' : 'danger'} /></td>
                    <td>{!admin ? <StatusBadge label={s.commissionPaid ? 'اتصرفت' : 'لم تُصرف'} tone={s.commissionPaid ? 'ok' : 'warn'} /> : s.commissionPaid
                      ? <Button size="sm" variant="ghost" icon="checkCircle" onClick={() => togglePaid(c, s.id, false)}>اتصرفت</Button>
                      : <Button size="sm" variant="outline" onClick={() => togglePaid(c, s.id, true)}>تسجيل صرف</Button>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
        </div>
      </>)}
      {edit && <RepModal rep={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}

function RepModal({ rep, onClose, onSaved }: { rep?: SalesRep; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: rep?.name ?? '', phone: rep?.phone ?? '', pct: String(rep?.defaultPct ?? 10), active: rep?.active ?? true });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const p = Number(f.pct);
    if (!f.name.trim()) return toast.error('اكتب اسم السيلز');
    if (!(p >= 0 && p <= 100)) return toast.error('النسبة لازم تكون بين 0 و 100');
    setBusy(true);
    try { await db.saveRep({ id: rep?.id, name: f.name.trim(), phone: f.phone, defaultPct: p, active: f.active }); toast.success('تم الحفظ'); onSaved(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal title={rep ? 'تعديل سيلز' : 'سيلز جديد'} onClose={onClose}
      footer={<><Button onClick={save} loading={busy}>حفظ</Button><Button variant="outline" onClick={onClose}>إلغاء</Button></>}>
      <div className="form-grid">
        <Input label="الاسم" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="الجوال" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <Input label="النسبة الافتراضية (%)" type="number" min={0} max={100} step="0.5" value={f.pct} onChange={(e) => setF({ ...f, pct: e.target.value })} hint="بتتحط تلقائيًا لما تختاره لمركز، وتقدر تغيّرها لكل مركز." />
        <Select label="الحالة" value={f.active ? '1' : '0'} onChange={(e) => setF({ ...f, active: e.target.value === '1' })} options={[{ value: '1', label: 'شغّال' }, { value: '0', label: 'متوقف' }]} />
      </div>
    </Modal>
  );
}
