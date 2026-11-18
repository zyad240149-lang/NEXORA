import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, ErrorState, Input, Modal, Skeleton, StatusBadge } from '../components/ui';
import { currentSub, db } from '../data/db';
import { subState } from '../data/status';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../services/auth';
import type { Goal } from '../types';
import { fmtDate } from '../utils/format';

// الهدف = عدد مشتركين. التقدم = المشتركين اللي اشتراكهم ساري دلوقتي
export default function Goals() {
  const toast = useToast();
  const admin = useAuth().user?.role === 'admin';
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);
  const [edit, setEdit] = useState<Goal | 'new' | null>(null);
  const reload = useCallback(() => {
    setError(false);
    Promise.all([db.goals(), db.customers()]).then(([g, cs]) => {
      setGoals(g); setTotal(cs.length);
      setActiveCount(cs.filter((c) => ['active', 'soon'].includes(subState(currentSub(c)).key)).length);
    }).catch(() => setError(true));
  }, []);
  useEffect(reload, [reload]);
  const del = async (g: Goal) => {
    if (!confirm(`حذف الهدف «${g.name}»؟`)) return;
    try { await db.deleteGoal(g.id); toast.success('تم الحذف'); reload(); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>الأهداف</h1><p>أهداف عدد المشتركين والتقدم فيها. الهدف الرئيسي بيظهر في الرئيسية.</p></div>
        {admin && <Button icon="plus" onClick={() => setEdit('new')}>هدف جديد</Button>}
      </div>
      {error ? <ErrorState onRetry={reload} /> : !goals ? <Skeleton h={200} /> : goals.length === 0 ? (
        <div className="card"><div className="card__body"><EmptyState icon="target" title="مفيش أهداف" text="أضف أول هدف من «هدف جديد»." /></div></div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((activeCount / g.target) * 100));
            const days = Math.ceil((Date.parse(g.end) - Date.now()) / 864e5);
            const left = Math.max(0, g.target - activeCount);
            return (
              <div key={g.id} className="card">
                <div className="card__head">
                  <h3>{g.name} {g.main && <StatusBadge label="الهدف الرئيسي" tone="brand" />}</h3>
                  {admin && <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" variant="ghost" icon="edit" onClick={() => setEdit(g)} aria-label="تعديل" />
                    <Button size="sm" variant="ghost" icon="trash" onClick={() => del(g)} aria-label="حذف" />
                  </div>}
                </div>
                <div className="card__body">
                  {g.desc && <p className="muted" style={{ marginTop: 0 }}>{g.desc}</p>}
                  <div className="row-between" style={{ marginBottom: 8 }}>
                    <strong className="num" style={{ fontSize: 22 }}>{activeCount} / {g.target}</strong>
                    <span className="num">{pct}%</span>
                  </div>
                  <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: 'var(--brand)' }} /></div>
                  <p className="muted-sm" style={{ marginTop: 10 }}>
                    من {fmtDate(g.start)} إلى {fmtDate(g.end)} · {left ? <>فاضل <span className="num">{left}</span> مشترك</> : 'اتحقق 🎉'}
                    {days > 0 ? <> · باقي <span className="num">{days}</span> يوم</> : ' · انتهت المدة'}
                    {total !== activeCount && <> · (إجمالي المسجلين <span className="num">{total}</span>)</>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {edit && <GoalModal goal={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}

function GoalModal({ goal, onClose, onSaved }: { goal?: Goal; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ name: goal?.name ?? '', desc: goal?.desc ?? '', target: String(goal?.target ?? ''), start: (goal?.start ?? today).slice(0, 10), end: (goal?.end ?? '').slice(0, 10), main: goal?.main ?? false });
  const [busy, setBusy] = useState(false);
  const set = (k: 'name' | 'desc' | 'target' | 'start' | 'end') => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (!f.name.trim()) return toast.error('اكتب اسم الهدف');
    if (!(Number(f.target) > 0)) return toast.error('اكتب عدد المشتركين المستهدف');
    if (!f.end || f.end <= f.start) return toast.error('تاريخ النهاية لازم يكون بعد البداية');
    setBusy(true);
    try {
      await db.saveGoal({ id: goal?.id, name: f.name.trim(), desc: f.desc, target: Number(f.target), start: new Date(f.start + 'T00:00:00').toISOString(), end: new Date(f.end + 'T00:00:00').toISOString(), main: f.main });
      toast.success('تم الحفظ'); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal title={goal ? 'تعديل هدف' : 'هدف جديد'} onClose={onClose}
      footer={<><Button onClick={save} loading={busy}>حفظ</Button><Button variant="outline" onClick={onClose}>إلغاء</Button></>}>
      <div className="form-grid">
        <Input label="اسم الهدف" value={f.name} onChange={set('name')} placeholder="مثلًا: 30 مشترك" />
        <Input label="عدد المشتركين المستهدف" type="number" value={f.target} onChange={set('target')} />
        <Input label="من" type="date" value={f.start} onChange={set('start')} />
        <Input label="إلى" type="date" value={f.end} onChange={set('end')} />
        <Input label="وصف" value={f.desc} onChange={set('desc')} />
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <input type="checkbox" checked={f.main} onChange={(e) => setF({ ...f, main: e.target.checked })} /> الهدف الرئيسي (يظهر في الرئيسية)
      </label>
    </Modal>
  );
}
