import { useState } from 'react';
import { Button, Input, Modal, Select } from './ui';
import { db } from '../data/db';
import { useToast } from '../hooks/useToast';
import type { Customer, PayStatus, Subscription } from '../types';
import { money } from '../utils/format';

export default function SubModal({ customer, sub, onClose, onSaved }: { customer: Customer; sub?: Subscription; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    price: String(sub?.price ?? ''), cur: sub?.cur ?? (customer.country === 'SA' ? 'SAR' : 'EGP'),
    start: (sub?.start ?? new Date().toISOString()).slice(0, 10), months: String(sub?.months ?? 12),
    pay: (sub?.pay ?? 'paid') as PayStatus, payNote: sub?.payNote ?? '',
    pct: String((sub ? sub.salesPct : customer.salesPct) ?? ''),
  });
  // اشتراك جديد بياخد سيلز العميل ونسبته وقت الإنشاء
  const salesId = sub ? sub.salesId : customer.salesId;
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (!(Number(f.price) > 0) || !(Number(f.months) > 0)) return toast.error('اكتب السعر والمدة');
    setBusy(true);
    try {
      await db.saveSub({ id: sub?.id, customerId: customer.id, price: Number(f.price), cur: f.cur, start: new Date(f.start + 'T00:00:00').toISOString(), months: Number(f.months), pay: f.pay, payNote: f.payNote, salesId, salesPct: salesId ? Number(f.pct) || 0 : null, commissionPaid: sub?.commissionPaid ?? false });
      toast.success('تم حفظ الاشتراك'); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal title={sub ? 'تعديل اشتراك' : 'اشتراك جديد'} patient={customer.name} onClose={onClose}
      footer={<><Button onClick={save} loading={busy}>حفظ</Button><Button variant="outline" onClick={onClose}>إلغاء</Button></>}>
      <div className="form-grid">
        <Input label="السعر" type="number" value={f.price} onChange={set('price')} />
        <Select label="العملة" value={f.cur} onChange={set('cur')} options={[{ value: 'EGP', label: 'جنيه مصري' }, { value: 'SAR', label: 'ريال سعودي' }]} />
        <Input label="تاريخ البداية" type="date" value={f.start} onChange={set('start')} />
        <Input label="المدة (شهور)" type="number" value={f.months} onChange={set('months')} />
        <Select label="الدفع" value={f.pay} onChange={set('pay')} options={[{ value: 'paid', label: 'مدفوع' }, { value: 'partial', label: 'مدفوع جزئيًا' }, { value: 'unpaid', label: 'غير مدفوع' }]} />
        <Input label="ملاحظة الدفع" value={f.payNote} onChange={set('payNote')} />
        {salesId && <Input label="نسبة السيلز (%)" type="number" min={0} max={100} step="0.5" value={f.pct} onChange={set('pct')}
          hint={`عمولة السيلز: ${money(Math.round(Number(f.price || 0) * Number(f.pct || 0)) / 100, f.cur)}`} />}
      </div>
    </Modal>
  );
}
