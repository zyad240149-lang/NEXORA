import { useState } from 'react';
import { Button, EmptyState, ErrorState, Select, Skeleton, StatusBadge } from '../components/ui';
import SubModal from '../components/SubModal';
import { db } from '../data/db';
import { PAY, subState } from '../data/status';
import { useCustomers } from '../hooks/useCustomers';
import { useToast } from '../hooks/useToast';
import type { Customer, Subscription } from '../types';
import { fmtDate, money } from '../utils/format';

const STATES = [{ value: '', label: 'الكل' }, { value: 'active', label: 'نشط' }, { value: 'soon', label: 'ينتهي قريبًا' }, { value: 'expired', label: 'منتهي' }];

export default function Subscriptions() {
  const { rows, error, reload } = useCustomers();
  const toast = useToast();
  const [state, setState] = useState('');
  const [edit, setEdit] = useState<{ c: Customer; s: Subscription } | null>(null);
  const all = (rows ?? []).flatMap((c) => c.subs.map((s) => ({ c, s, st: subState(s) })))
    .filter((x) => !state || x.st.key === state)
    .sort((a, b) => Date.parse(a.s.end) - Date.parse(b.s.end));
  const del = async (c: Customer, s: Subscription) => {
    if (!confirm('حذف الاشتراك ده؟')) return;
    try { await db.deleteSub(c.id, s.id); toast.success('تم الحذف'); reload(); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="page">
      <div className="page-head"><div><h1>الاشتراكات</h1><p>كل الاشتراكات مرتبة حسب تاريخ الانتهاء.</p></div></div>
      <div className="card">
        <div className="card__body" style={{ paddingBottom: 0, maxWidth: 280 }}>
          <Select label="الحالة" value={state} onChange={(e) => setState(e.target.value)} options={STATES} />
        </div>
        <div className="card__body">
          {error ? <ErrorState onRetry={reload} /> : !rows ? <Skeleton h={220} /> : all.length === 0 ? <EmptyState icon="receipt" title="مفيش اشتراكات" /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>العميل</th><th>السعر</th><th>المدة</th><th>البداية</th><th>النهاية</th><th>الدفع</th><th>الحالة</th><th className="actions">الإجراءات</th></tr></thead>
              <tbody>{all.map(({ c, s, st }) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="num">{money(s.price, s.cur)}</td>
                  <td className="num">{s.months} شهر</td>
                  <td>{fmtDate(s.start)}</td>
                  <td>{fmtDate(s.end)}</td>
                  <td><StatusBadge {...PAY[s.pay]} />{s.payNote && <div className="muted-sm">{s.payNote}</div>}</td>
                  <td><StatusBadge {...st} /></td>
                  <td className="actions"><div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" variant="ghost" icon="edit" onClick={() => setEdit({ c, s })} aria-label="تعديل" />
                    <Button size="sm" variant="ghost" icon="trash" onClick={() => del(c, s)} aria-label="حذف" />
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>
      {edit && <SubModal customer={edit.c} sub={edit.s} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}
