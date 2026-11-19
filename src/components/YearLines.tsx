import { useState } from 'react';
import type { Customer } from '../types';

// خط لكل سنة: عدد العملاء الجدد في كل شهر (يناير → ديسمبر)، علشان تقارن السنين ببعض.
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const COLORS = ['#223468', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];
const ym = (iso: string) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit' }).formatToParts(new Date(iso));
  return [Number(p.find((x) => x.type === 'year')!.value), Number(p.find((x) => x.type === 'month')!.value) - 1] as const;
};

export function YearLines({ rows }: { rows: Customer[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [cumulative, setCumulative] = useState(false);
  const [nowY, nowM] = ym(new Date().toISOString());

  const byYear: Record<number, number[]> = {};
  rows.forEach((c) => { if (!c.created) return; const [y, m] = ym(c.created); (byYear[y] ??= Array(12).fill(0))[m]++; });
  if (!byYear[nowY]) byYear[nowY] = Array(12).fill(0);
  const years = Object.keys(byYear).map(Number).sort();
  const series = years.map((y, i) => {
    let run = 0;
    const vals = byYear[y].map((v) => (cumulative ? (run += v) : v));
    const last = y === nowY ? nowM : 11; // السنة الحالية لحد الشهر الحالي بس
    return { y, color: COLORS[i % COLORS.length], vals: vals.slice(0, last + 1), sum: byYear[y].reduce((a, b) => a + b, 0) };
  });

  // مقارنة السنة دي بنفس الفترة من السنة اللي فاتت
  const thisYTD = byYear[nowY].slice(0, nowM + 1).reduce((a, b) => a + b, 0);
  const lastYTD = byYear[nowY - 1]?.slice(0, nowM + 1).reduce((a, b) => a + b, 0);
  const yoy = lastYTD ? Math.round(((thisYTD - lastYTD) / lastYTD) * 100) : null;

  const W = 900, H = 300, padT = 24, padB = 40, padX = 44;
  const maxV = Math.max(4, ...series.flatMap((s) => s.vals));
  const step = Math.ceil(maxV / 4), top = step * 4;
  const colW = (W - padX * 2) / 12;
  const x = (m: number) => padX + colW * (m + 0.5);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);

  return (
    <>
      <div className="growth-sum" style={{ gridTemplateColumns: `repeat(${Math.min(series.length + 1, 4)}, 1fr)` }}>
        {series.slice().reverse().slice(0, 3).map((s) => (
          <div key={s.y} style={{ borderInlineStart: `4px solid ${s.color}` }}><span>عملاء {s.y}{s.y === nowY ? ' (لحد دلوقتي)' : ''}</span><b className="num">{s.sum}</b></div>
        ))}
        <div className="gs-main"><span>مقارنة بنفس الفترة {nowY - 1}</span><b className="num">{yoy === null ? '—' : `${yoy > 0 ? '▲ +' : yoy < 0 ? '▼ ' : ''}${yoy}%`}</b><em>{yoy === null ? `مفيش بيانات لسنة ${nowY - 1}` : `${thisYTD} مقابل ${lastYTD} عميل`}</em></div>
      </div>

      <div className="g-legend" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 18 }}>{series.map((s) => <span key={s.y}><i className="lg-line" style={{ background: s.color }} />{s.y}</span>)}</div>
        <div className="g-toggle">
          <button className={!cumulative ? 'on' : ''} onClick={() => setCumulative(false)}>جدد كل شهر</button>
          <button className={cumulative ? 'on' : ''} onClick={() => setCumulative(true)}>تراكمي</button>
        </div>
      </div>

      <svg className="g-svg" viewBox={`0 0 ${W} ${H}`} onMouseLeave={() => setHover(null)} role="img" aria-label="خط لكل سنة">
        {[0, 1, 2, 3, 4].map((t) => (
          <g key={t}><line x1={padX} x2={W - padX} y1={y(t * step)} y2={y(t * step)} className="g-grid" /><text x={padX - 12} y={y(t * step) + 4} className="g-axis" textAnchor="end">{t * step}</text></g>
        ))}
        {MONTHS.map((m, i) => (
          <g key={m} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }}>
            <rect x={x(i) - colW / 2} y={padT} width={colW} height={H - padT - padB} fill={hover === i ? 'rgba(34,52,104,.06)' : 'transparent'} />
            <text x={x(i)} y={H - 14} textAnchor="middle" className={`g-month ${hover === i ? 'now' : ''}`}>{m.slice(0, 3)}</text>
          </g>
        ))}
        {series.map((s) => (
          <g key={s.y} pointerEvents="none">
            <path d={s.vals.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
            {s.vals.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 6 : 4} fill="#fff" stroke={s.color} strokeWidth={3} />)}
            <text x={x(s.vals.length - 1) + 10} y={y(s.vals[s.vals.length - 1]) + 4} className="g-num" style={{ fill: s.color }}>{s.y}</text>
          </g>
        ))}
      </svg>

      <div className="g-detail">
        {hover === null ? <span>عدّي على أي شهر عشان تقارن السنين فيه.</span> : <>
          <b>{MONTHS[hover]}</b>
          {series.map((s) => <span key={s.y}><i className="lg-line" style={{ background: s.color, display: 'inline-block', verticalAlign: 'middle', marginInlineEnd: 6 }} />{s.y}: <b className="num">{s.vals[hover] ?? '—'}</b></span>)}
        </>}
      </div>
    </>
  );
}
