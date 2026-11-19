import { useState } from 'react';
import { Button, Input, Modal, Select } from './ui';
import { db } from '../data/db';
import { useToast } from '../hooks/useToast';
import type { Customer, DurUnit, PayStatus, Subscription } from '../types';
import { addDuration, fmtDate, fmtDuration, money } from '../utils/format';

// مدد جاهزة + «مخصص» (عدد × وحدة) + «لحد تاريخ معيّن» (بيتحسب بالأيام)
const PRESETS: { key: string; n: number; u: DurUnit; label: string }[] = [
  { key: '1m', n: 1, u: 'm', label: 'شهر' }, { key: '3m', n: 3, u: 'm', label: '3 شهور' }, { key: '6m', n: 6, u: 'm', label: '6 شهور' },
  { key: '1y', n: 1, u: 'y', label: 'سنة' }, { key: '2y', n: 2, u: 'y', label: 'سنتين' },
];
const UNITS = [{ value: 'd', label: 'يوم' }, { value: 'm', label: 'شهر' }, { value: 'y', label: 'سنة' }];
const ymd = (iso: string) => iso.slice(0, 10);
const toIso = (d: string) => new Date(d + 'T00:00:00').toISOString();

export default function SubModal({ customer, sub, renewFrom, onClose, onSaved }: { customer: Customer; sub?: Subscription; renewFrom?: Subscription; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const base = sub ?? renewFrom;
  const n0 = base?.months ?? 1, u0: DurUnit = base?.unit ?? 'y';
  const preset0 = PRESETS.find((p) => p.n === n0 && p.u === u0)?.key ?? 'custom';
  const [f, setF] = useState({
    price: String(base?.price ?? ''), cur: base?.cur ?? (customer.country === 'SA' ? 'SAR' : 'EGP'),
    // تجديد: يبدأ من نهاية الاشتراك اللي قبله
    start: ymd(sub?.start ?? renewFrom?.end ?? new Date().toISOString()),
    n: String(n0), unit: u0, preset: preset0, endDate: ymd(sub?.end ?? addDuration(new Date().toISOString(), 1, 'y')),
    pay: (sub?.pay ?? 'paid') as PayStatus, payNote: sub?.payNote ?? '',
    pct: String((sub ? sub.salesPct : customer.salesPct) ?? ''),
  });
  const salesId = sub ? sub.salesId : customer.salesId;
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  // المدة الفعلية حسب الاختيار
  const dur = (() => {
    if (f.preset === 'until') {
      const days = Math.round((Date.parse(f.endDate) - Date.parse(f.start)) / 864e5);
      return { n: days, u: 'd' as DurUnit };
    }
    const p = PRESETS.find((x) => x.key === f.preset);
    return p ? { n: p.n, u: p.u } : { n: Number(f.n), u: f.unit as DurUnit };
  })();
  const endIso = dur.n > 0 && f.start ? addDuration(toIso(f.start), dur.n, dur.u) : '';
  const isPast = endIso && Date.parse(endIso) < Date.now();

  const save = async () => {
    if (!(Number(f.price) > 0)) return toast.error('اكتب السعر');
    if (!f.start) return toast.error('اختار تاريخ البداية');
    if (!(dur.n > 0)) return toast.error(f.preset === 'until' ? 'تاريخ النهاية لازم يكون بعد البداية' : 'اكتب المدة');
    setBusy(true);
    try {
      await db.saveSub({ id: sub?.id, customerId: customer.id, price: Number(f.price), cur: f.cur, start: toIso(f.start), months: dur.n, unit: dur.u, pay: f.pay, payNote: f.payNote, salesId, salesPct: salesId ? Number(f.pct) || 0 : null, commissionPaid: sub?.commissionPaid ?? false });
      toast.success('تم حفظ الاشتراك'); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal title={sub ? 'تعديل اشتراك' : renewFrom ? 'تجديد اشتراك' : 'اشتراك جديد'} patient={customer.name} onClose={onClose}
      footer={<><Button onClick={save} loading={busy}>حفظ</Button><Button variant="outline" onClick={onClose}>إلغاء</Button></>}>
      <div className="form-grid">
        <Input label="السعر" type="number" value={f.price} onChange={set('price')} />
        <Select label="العملة" value={f.cur} onChange={set('cur')} options={[{ value: 'EGP', label: 'جنيه مصري' }, { value: 'SAR', label: 'ريال سعودي' }]} />
        <Input label="تاريخ البداية" type="date" value={f.start} onChange={set('start')} hint="للاشتراك القديم: اختار تاريخ بدايته الحقيقي" />
        <Select label="المدة" value={f.preset} onChange={set('preset')}
          options={[...PRESETS.map((p) => ({ value: p.key, label: p.label })), { value: 'custom', label: 'مدة مخصصة…' }, { value: 'until', label: 'لحد تاريخ معيّن…' }]} />
        {f.preset === 'custom' && <>
          <Input label="العدد" type="number" min={1} value={f.n} onChange={set('n')} />
          <Select label="الوحدة" value={f.unit} onChange={set('unit')} options={UNITS} />
        </>}
        {f.preset === 'until' && <Input label="تاريخ النهاية" type="date" value={f.endDate} onChange={set('endDate')} />}
        <Select label="الدفع" value={f.pay} onChange={set('pay')} options={[{ value: 'paid', label: 'مدفوع' }, { value: 'partial', label: 'مدفوع جزئيًا' }, { value: 'unpaid', label: 'غير مدفوع' }]} />
        <Input label="ملاحظة الدفع" value={f.payNote} onChange={set('payNote')} />
        {salesId && <Input label="نسبة السيلز (%)" type="number" min={0} max={100} step="0.5" value={f.pct} onChange={set('pct')}
          hint={`عمولة السيلز: ${money(Math.round(Number(f.price || 0) * Number(f.pct || 0)) / 100, f.cur)}`} />}
      </div>
      {endIso && (
        <div className={`alert ${isPast ? 'alert-warn' : 'alert-info'}`} style={{ marginTop: 14 }}>
          المدة: <b>{fmtDuration(dur.n, dur.u)}</b> — من {fmtDate(toIso(f.start))} إلى <b>{fmtDate(endIso)}</b>
          {isPast && ' (اشتراك قديم منتهي — هيتسجل في السجل)'}
        </div>
      )}
    </Modal>
  );
}
