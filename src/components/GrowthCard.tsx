import { useState } from 'react';
import type { Customer } from '../types';

// نمو العملاء شهريًا: عدد العملاء الجدد كل شهر + سهم مقارنة بالشهر اللي قبله.
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const keyOf = (d: Date) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit' }).formatToParts(d);
  return `${p.find((x) => x.type === 'year')!.value}-${p.find((x) => x.type === 'month')!.value}`;
};

export function GrowthCard({ rows }: { rows: Customer[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const counts: Record<string, number> = {};
  rows.forEach((c) => { if (c.created) { const k = keyOf(new Date(c.created)); counts[k] = (counts[k] ?? 0) + 1; } });

  // آخر 12 شهر لحد الشهر الحالي
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 15);
    const k = keyOf(d);
    return { k, label: MONTHS[Number(k.slice(5)) - 1], year: k.slice(0, 4), n: counts[k] ?? 0 };
  });
  let run = rows.filter((c) => c.created && keyOf(new Date(c.created)) < months[0].k).length;
  const data = months.map((m) => ({ ...m, total: (run += m.n) }));

  const cur = data[11], prev = data[10];
  const diff = cur.n - prev.n;
  const pct = prev.n ? Math.round((diff / prev.n) * 100) : cur.n ? 100 : 0;
  const up = diff > 0, flat = diff === 0;
  const max = Math.max(1, ...data.map((d) => d.n));
  const sel = hover !== null ? data[hover] : null;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card__head">
        <h3>نمو العملاء شهريًا</h3>
        <div className={`growth-arrow ${flat ? 'g-flat' : up ? 'g-up' : 'g-down'}`} title="مقارنة بالشهر اللي فات">
          <span className="g-ico">{flat ? '→' : up ? '▲' : '▼'}</span>
          <span className="num">{flat ? 'زي الشهر اللي فات' : `${up ? '+' : ''}${pct}%`}</span>
        </div>
      </div>
      <div className="card__body">
        <div className="growth-sum">
          <div><b className="num">{cur.n}</b><span>عميل جديد في {cur.label}</span></div>
          <div><b className="num">{prev.n}</b><span>في {prev.label}</span></div>
          <div><b className="num">{cur.total}</b><span>إجمالي العملاء</span></div>
        </div>
        <div className="growth-chart" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <div key={d.k} className={`g-col ${i === 11 ? 'g-now' : ''} ${hover === i ? 'g-hov' : ''}`} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
              <span className="g-val num">{d.n || ''}</span>
              <div className="g-bar" style={{ height: `${(d.n / max) * 100}%` }} />
              <span className="g-lbl">{d.label.slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 8, minHeight: 22 }}>
          {sel ? <>{sel.label} {sel.year}: <b className="num">{sel.n}</b> عميل جديد، والإجمالي وقتها <b className="num">{sel.total}</b></> : 'عدّي على أي شهر عشان تشوف تفاصيله.'}
        </p>
      </div>
    </div>
  );
}
