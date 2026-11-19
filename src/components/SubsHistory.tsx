import { useState } from 'react';
import { Button, EmptyState, Modal, StatusBadge } from './ui';
import SubModal from './SubModal';
import { db } from '../data/db';
import { PAY, subState } from '../data/status';
import { useToast } from '../hooks/useToast';
import type { Customer, Subscription } from '../types';
import { fmtDate, fmtDuration, money } from '../utils/format';

// كل اشتراكات المشترك (الحالي والقديمة) — إضافة اشتراك قديم، تعديل المدة، تجديد، حذف
export default function SubsHistory({ customer, onClose, onChanged }: { customer: Customer; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<{ sub?: Subscription; renewFrom?: Subscription } | null>(null);
  const subs = [...customer.subs].sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  const totals: Record<string, number> = {};
  subs.forEach((s) => { if (s.pay !== 'unpaid') totals[s.cur] = (totals[s.cur] ?? 0) + s.price; });
  const del = async (s: Subscription) => {
    if (!confirm(`حذف اشتراك ${fmtDate(s.start)} ← ${fmtDate(s.end)}؟`)) return;
    try { await db.deleteSub(customer.id, s.id); toast.success('تم الحذف'); onChanged(); } catch (e) { toast.error((e as Error).message); }
  };
  if (form) return <SubModal customer={customer} sub={form.sub} renewFrom={form.renewFrom} onClose={() => setForm(null)} onSaved={() => { setForm(null); onChanged(); }} />;
  return (
    <Modal wide title="اشتراكات المشترك" patient={customer.name} onClose={onClose}
      footer={<>
        <Button icon="plus" onClick={() => setForm({})}>إضافة اشتراك (جديد أو قديم)</Button>
        {subs[0] && <Button variant="outline" icon="refresh" onClick={() => setForm({ renewFrom: [...subs].sort((a, b) => Date.parse(b.end) - Date.parse(a.end))[0] })}>تجديد</Button>}
        <Button variant="ghost" onClick={onClose}>إغلاق</Button>
      </>}>
      {subs.length === 0 ? <EmptyState icon="receipt" title="مفيش اشتراكات" text="أضف الاشتراك الحالي أو أي اشتراكات قديمة." /> : (<>
        <p className="muted" style={{ marginTop: 0 }}><span className="num">{subs.length}</span> اشتراك · إجمالي المحصّل: <span className="num">{Object.entries(totals).map(([c, v]) => money(v, c)).join(' + ') || '0'}</span></p>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>من</th><th>إلى</th><th>المدة</th><th>السعر</th><th>الدفع</th><th>الحالة</th><th className="actions">الإجراءات</th></tr></thead>
          <tbody>{subs.map((s) => (
            <tr key={s.id}>
              <td>{fmtDate(s.start)}</td>
              <td>{fmtDate(s.end)}</td>
              <td className="num">{fmtDuration(s.months, s.unit)}</td>
              <td className="num">{money(s.price, s.cur)}</td>
              <td><StatusBadge {...PAY[s.pay]} /></td>
              <td><StatusBadge {...subState(s)} /></td>
              <td className="actions"><div style={{ display: 'flex', gap: 6 }}>
                <Button size="sm" variant="ghost" icon="edit" onClick={() => setForm({ sub: s })} aria-label="تعديل المدة والبيانات" />
                <Button size="sm" variant="ghost" icon="trash" onClick={() => del(s)} aria-label="حذف" />
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
      </>)}
    </Modal>
  );
}
