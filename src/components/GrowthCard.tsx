import { useState } from 'react';
import type { Customer } from '../types';

// نمو العملاء شهريًا: أعمدة = عملاء جدد كل شهر، خط = إجمالي العملاء، وسهم مقارنة بالشهر اللي فات.
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const keyOf = (d: Date) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit' }).formatToParts(d);
  return `${p.find((x) => x.type === 'year')!.value}-${p.find((x) => x.type === 'month')!.value}`;
};

export function GrowthCard({ rows }: { rows: Customer[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const counts: Record<string, number> = {};
  rows.forEach((c) => { if (c.created) { const k = keyOf(new Date(c.created)); counts[k] = (counts[k] ?? 0) + 1; } });

  // من الشهر اللي قبل أول عميل (4 شهور على الأقل) لحد الشهر الحالي، بحد أقصى 12 شهر
  const now = new Date();
  const all = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 15);
    const k = keyOf(d);
    return { k, label: MONTHS[Number(k.slice(5)) - 1], year: k.slice(0, 4), n: counts[k] ?? 0 };
  });
  const firstIdx = all.findIndex((m) => m.n > 0);
  const start = Math.min(8, firstIdx < 0 ? 8 : Math.max(0, firstIdx - 1));
  const months = all.slice(start);
  let run = rows.filter((c) => c.created && keyOf(new Date(c.created)) < months[0].k).length;
  const data = months.map((m) => ({ ...m, total: (run += m.n) }));

  const L = data.length, cur = data[L - 1], prev = data[L - 2];
  const diff = cur.n - prev.n;
  const pct = prev.n ? Math.round((diff / prev.n) * 100) : cur.n ? 100 : 0;
  const up = diff > 0, flat = diff === 0;
  const growthTotal = prev.total ? Math.round(((cur.total - prev.total) / prev.total) * 100) : 0;

  // أبعاد الرسم
  const W = 900, H = 300, padT = 30, padB = 44, padX = 44;
  const maxV = Math.max(4, ...data.map((d) => d.total));
  const step = Math.ceil(maxV / 4);
  const top = step * 4;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const colW = (W - padX * 2) / L;
  // الزمن من الشمال لليمين (زي أي رسم نمو): الأقدم شمال والأحدث يمين
  const x = (i: number) => padX + colW * (i + 0.5);
  const barW = Math.min(46, colW * 0.5);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.total)}`).join(' ');
  const area = `${line} L${x(L - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const sel = hover !== null ? data[hover] : cur;

  return (
    <div className="card growth" style={{ marginTop: 16 }}>
      <div className="card__head">
        <div>
          <h3>نمو العملاء شهريًا</h3>
          <div className="muted-sm">مقارنة {cur.label} بـ{prev.label}</div>
        </div>
        <div className={`growth-arrow ${flat ? 'g-flat' : up ? 'g-up' : 'g-down'}`}>
          <span className="g-ico">{flat ? '●' : up ? '▲' : '▼'}</span>
          <div><b className="num">{flat ? 'ثابت' : `${up ? '+' : ''}${pct}%`}</b><small>عملاء جدد</small></div>
        </div>
      </div>
      <div className="card__body">
        <div className="growth-sum">
          <div className="gs-main"><span>عملاء جدد في {cur.label}</span><b className="num">{cur.n}</b><em className={up ? 'up' : flat ? '' : 'down'}>{flat ? 'زي الشهر اللي فات' : `${up ? '▲ أكتر' : '▼ أقل'} بـ ${Math.abs(diff)} عن ${prev.label}`}</em></div>
          <div><span>عملاء جدد في {prev.label}</span><b className="num">{prev.n}</b></div>
          <div><span>إجمالي العملاء</span><b className="num">{cur.total}</b><em className="up">{growthTotal > 0 ? `▲ ${growthTotal}% نمو` : '—'}</em></div>
        </div>

        <div className="g-legend"><span><i className="lg-bar" />عملاء جدد</span><span><i className="lg-line" />إجمالي العملاء</span></div>
        <svg className="g-svg" viewBox={`0 0 ${W} ${H}`} onMouseLeave={() => setHover(null)} role="img" aria-label="رسم نمو العملاء">
          <defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity=".25" /><stop offset="1" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs>
          {[0, 1, 2, 3, 4].map((t) => (
            <g key={t}>
              <line x1={padX} x2={W - padX} y1={y(t * step)} y2={y(t * step)} className="g-grid" />
              <text x={padX - 12} y={y(t * step) + 4} className="g-axis" textAnchor="end">{t * step}</text>
            </g>
          ))}
          {data.map((d, i) => (
            <g key={d.k} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }}>
              <rect x={x(i) - colW / 2} y={padT} width={colW} height={H - padT - padB} fill={hover === i ? 'rgba(34,52,104,.06)' : 'transparent'} />
              {d.n > 0 && <rect x={x(i) - barW / 2} y={y(d.n)} width={barW} height={y(0) - y(d.n)} rx={6} className={i === L - 1 ? 'g-bar-now' : 'g-bar'} />}
              {d.n > 0 && <text x={x(i)} y={y(d.n) - 8} textAnchor="middle" className="g-num">{d.n}</text>}
              <text x={x(i)} y={H - 18} textAnchor="middle" className={`g-month ${i === L - 1 ? 'now' : ''}`}>{d.label}</text>
            </g>
          ))}
          <path d={area} fill="url(#gArea)" pointerEvents="none" />
          <path d={line} className="g-line" pointerEvents="none" />
          {data.map((d, i) => <circle key={d.k} cx={x(i)} cy={y(d.total)} r={hover === i || i === L - 1 ? 6 : 4} className="g-dot" pointerEvents="none" />)}
        </svg>
        <div className="g-detail">
          <b>{sel.label} {sel.year}</b>
          <span>عملاء جدد: <b className="num">{sel.n}</b></span>
          <span>الإجمالي: <b className="num">{sel.total}</b></span>
        </div>
      </div>
    </div>
  );
}
