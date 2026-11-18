import { useEffect, useState } from 'react';
import { Button, Input, Modal, Select } from './ui';
import { db } from '../data/db';
import { useToast } from '../hooks/useToast';
import type { Customer, PayStatus, SalesRep } from '../types';
import { useAuth } from '../services/auth';
import { Icon } from '../utils/icons';
import { money } from '../utils/format';

const COUNTRIES = [{ value: 'EG', label: 'مصر (+20)' }, { value: 'SA', label: 'السعودية (+966)' }];
const CODE: Record<string, string> = { EG: '+20', SA: '+966' };
const NEW = '__new';

export default function CustomerModal({ customer, onClose, onSaved }: { customer?: Customer; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const isSales = user?.role === 'sales';
  const [f, setF] = useState({
    name: customer?.name ?? '', country: customer?.country ?? 'EG', phone: customer?.phone ?? '', biz: customer?.biz ?? '', url: customer?.url ?? '', notes: customer?.notes ?? '',
    managerName: customer?.managerName ?? '', managerPhone: customer?.managerPhone ?? '', contractManagerName: customer?.contractManagerName ?? '', contractManagerPhone: customer?.contractManagerPhone ?? '',
  });
  const [branches, setBranches] = useState<string[]>(customer?.branches?.length ? customer.branches : ['']);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [salesId, setSalesId] = useState(customer?.salesId ?? '');
  const [pct, setPct] = useState(customer?.salesPct != null ? String(customer.salesPct) : '');
  const [newRep, setNewRep] = useState('');
  // اشتراك أول مع إضافة المشترك (اختياري — للمدير بس)
  const [sub, setSub] = useState({ price: '', cur: 'EGP', start: new Date().toISOString().slice(0, 10), months: '12', pay: 'paid' as PayStatus });
  const [busy, setBusy] = useState(false);
  useEffect(() => { db.reps().then(setReps).catch(() => {}); }, []);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const setS = (k: keyof typeof sub) => (e: { target: { value: string } }) => setSub({ ...sub, [k]: e.target.value });
  const pickRep = (id: string) => {
    setSalesId(id);
    const r = reps.find((x) => x.id === id);
    if (r) setPct(String(r.defaultPct)); else if (id === NEW && !pct) setPct('10'); else if (!id) setPct('');
  };
  const withSub = !customer && !isSales && Number(sub.price) > 0;
  const save = async () => {
    if (!f.name.trim()) return toast.error('اكتب اسم المركز');
    const p = Number(pct);
    if (salesId && (pct === '' || !(p >= 0 && p <= 100))) return toast.error('نسبة السيلز لازم تكون بين 0 و 100');
    if (salesId === NEW && !newRep.trim()) return toast.error('اكتب اسم السيلز الجديد');
    if (withSub && !(Number(sub.months) > 0)) return toast.error('اكتب مدة الاشتراك');
    setBusy(true);
    try {
      const rid = isSales ? user!.salesRepId : salesId === NEW ? await db.saveRep({ name: newRep.trim(), phone: '', defaultPct: p, active: true }) : salesId || null;
      const id = await db.saveCustomer({
        id: customer?.id, ...f, name: f.name.trim(), code: CODE[f.country], salesId: rid, salesPct: rid ? p : null,
        branches: branches.map((b) => b.trim()).filter(Boolean),
        managerName: f.managerName.trim(), contractManagerName: f.contractManagerName.trim(),
      });
      if (withSub) {
        await db.saveSub({ customerId: id, price: Number(sub.price), cur: sub.cur, start: new Date(sub.start + 'T00:00:00').toISOString(), months: Number(sub.months), pay: sub.pay, payNote: '', salesId: rid, salesPct: rid ? p : null, commissionPaid: false });
      }
      toast.success(withSub ? 'تم حفظ المشترك والاشتراك' : 'تم الحفظ'); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const repOptions = [{ value: '', label: 'بدون سيلز' }, ...reps.filter((r) => r.active || r.id === salesId).map((r) => ({ value: r.id, label: `${r.name} (${r.defaultPct}%)` })), { value: NEW, label: '+ سيلز جديد' }];
  const h4 = { margin: '18px 0 8px' };
  return (
    <Modal wide title={customer ? 'تعديل مشترك' : 'مشترك جديد'} onClose={onClose}
      footer={<><Button onClick={save} loading={busy}>حفظ</Button><Button variant="outline" onClick={onClose}>إلغاء</Button></>}>
      <div className="form-grid">
        <Input label="اسم المركز / المشترك" value={f.name} onChange={set('name')} />
        <Input label="النشاط" value={f.biz} onChange={set('biz')} />
        <Select label="الدولة" value={f.country} onChange={set('country')} options={COUNTRIES} />
        <Input label="الجوال" type="tel" value={f.phone} onChange={set('phone')} />
        <Input label="الرابط" value={f.url} onChange={set('url')} />
        <Input label="ملاحظات" value={f.notes} onChange={set('notes')} />
      </div>

      <h4 style={h4}>الفروع <span className="muted num">({branches.filter((b) => b.trim()).length})</span></h4>
      <div style={{ display: 'grid', gap: 8 }}>
        {branches.map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}><Input label={`الفرع ${i + 1}`} placeholder="مثلًا: مدينة نصر" value={b} onChange={(e) => setBranches(branches.map((x, j) => (j === i ? e.target.value : x)))} /></div>
            {branches.length > 1 && <Button variant="ghost" icon="trash" aria-label="حذف الفرع" onClick={() => setBranches(branches.filter((_, j) => j !== i))} />}
          </div>
        ))}
        <div><Button size="sm" variant="outline" icon="plus" onClick={() => setBranches([...branches, ''])}>إضافة فرع</Button></div>
      </div>

      <h4 style={h4}>المسؤولين <span className="muted-sm">(واحد منهم أو الاتنين)</span></h4>
      <div className="form-grid">
        <Input label="اسم المدير" value={f.managerName} onChange={set('managerName')} />
        <Input label="جوال المدير" type="tel" value={f.managerPhone} onChange={set('managerPhone')} />
        <Input label="اسم مدير التعاقد" value={f.contractManagerName} onChange={set('contractManagerName')} />
        <Input label="جوال مدير التعاقد" type="tel" value={f.contractManagerPhone} onChange={set('contractManagerPhone')} />
      </div>

      {!customer && !isSales && <>
        <h4 style={h4}>الاشتراك <span className="muted-sm">(اختياري — سيبه فاضي لو هتضيفه بعدين)</span></h4>
        <div className="form-grid">
          <Input label="السعر" type="number" value={sub.price} onChange={setS('price')} />
          <Select label="العملة" value={sub.cur} onChange={setS('cur')} options={[{ value: 'EGP', label: 'جنيه مصري' }, { value: 'SAR', label: 'ريال سعودي' }]} />
          <Input label="تاريخ البداية" type="date" value={sub.start} onChange={setS('start')} />
          <Input label="المدة (شهور)" type="number" value={sub.months} onChange={setS('months')} />
          <Select label="الدفع" value={sub.pay} onChange={setS('pay')} options={[{ value: 'paid', label: 'مدفوع' }, { value: 'partial', label: 'مدفوع جزئيًا' }, { value: 'unpaid', label: 'غير مدفوع' }]} />
        </div>
      </>}

      {!isSales && <>
        <h4 style={h4}>السيلز</h4>
        <div className="form-grid">
          <Select label="السيلز" value={salesId} onChange={(e) => pickRep(e.target.value)} options={repOptions} />
          {salesId === NEW && <Input label="اسم السيلز الجديد" value={newRep} onChange={(e) => setNewRep(e.target.value)} />}
          {salesId && <Input label="نسبة السيلز من الاشتراك (%)" type="number" min={0} max={100} step="0.5" value={pct} onChange={(e) => setPct(e.target.value)}
            hint={withSub ? `عمولة السيلز: ${money(Math.round(Number(sub.price) * Number(pct || 0)) / 100, sub.cur)}` : undefined} />}
        </div>
        {salesId && customer && customer.subs.some((s) => !s.salesId) && <p className="muted-sm" style={{ marginTop: 6 }}><Icon name="alert" size={14} /> الاشتراكات الحالية اللي مالهاش سيلز هتتسجل على السيلز ده بنفس النسبة.</p>}
      </>}
    </Modal>
  );
}
