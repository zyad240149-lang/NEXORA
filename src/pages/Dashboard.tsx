import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { GrowthCard } from '../components/GrowthCard';
import { EmptyState, ErrorState, Skeleton, StatusBadge } from '../components/ui';
import { currentSub, db } from '../data/db';
import { subState } from '../data/status';
import { useCustomers } from '../hooks/useCustomers';
import type { Goal } from '../types';
import { fmtDate, money } from '../utils/format';

export default function Dashboard() {
  const { rows, error, reload } = useCustomers();
  const [goal, setGoal] = useState<Goal | null>(null);
  useEffect(() => { db.goals().then((g) => setGoal(g.find((x) => x.main) ?? g[0] ?? null)).catch(() => {}); }, []);

  const states = (rows ?? []).map((c) => ({ c, s: currentSub(c), st: subState(currentSub(c)) }));
  const active = states.filter((x) => x.st.key === 'active' || x.st.key === 'soon');
  const soon = states.filter((x) => x.st.key === 'soon' || x.st.key === 'expired').sort((a, b) => Date.parse(a.s!.end) - Date.parse(b.s!.end));
  const revenue: Record<string, number> = {};
  (rows ?? []).forEach((c) => c.subs.forEach((s) => { if (s.pay !== 'unpaid') revenue[s.cur] = (revenue[s.cur] ?? 0) + s.price; }));
  const pct = goal ? Math.min(100, Math.round(((rows?.length ?? 0) / goal.target) * 100)) : 0;

  return (
    <div className="page">
      <div className="page-head"><div><h1>الرئيسية</h1><p>نظرة سريعة على العملاء والاشتراكات.</p></div></div>
      {error ? <ErrorState onRetry={reload} /> : !rows ? (
        <div className="kpi-grid">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card kpi"><Skeleton h={60} /></div>)}</div>
      ) : (<>
        <div className="kpi-grid">
          <StatCard icon="users" tone="brand" value={rows.length} label="العملاء" />
          <StatCard icon="checkCircle" tone="ok" value={active.length} label="اشتراكات سارية" />
          <StatCard icon="clock" tone="warn" value={soon.length} label="تنتهي قريبًا / منتهية" />
          <StatCard icon="wallet" tone="info" value={money(revenue.EGP ?? 0, 'EGP')} label="إجمالي المحصّل" sub={revenue.SAR ? <span className="num">+ {money(revenue.SAR, 'SAR')}</span> : undefined} />
        </div>
        <GrowthCard rows={rows} />
        {goal && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card__head"><h3>{goal.name}</h3><span className="num muted">{rows.length} / {goal.target}</span></div>
            <div className="card__body">
              <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: 'var(--brand)' }} /></div>
              <p className="muted" style={{ marginTop: 8 }}>{goal.desc} — حتى {fmtDate(goal.end)} (<span className="num">{pct}%</span>)</p>
            </div>
          </div>
        )}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card__head"><h3>تجديدات تحتاج متابعة</h3><Link to="/subscriptions" className="link-more">كل الاشتراكات</Link></div>
          <div className="card__body">
            {soon.length === 0 ? <EmptyState icon="checkCircle" title="مفيش تجديدات قريبة" /> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>العميل</th><th>ينتهي في</th><th>الحالة</th></tr></thead>
                <tbody>{soon.map(({ c, s, st }) => <tr key={c.id}><td style={{ fontWeight: 600 }}>{c.name}</td><td>{fmtDate(s!.end)}</td><td><StatusBadge {...st} /></td></tr>)}</tbody>
              </table></div>
            )}
          </div>
        </div>
      </>)}
    </div>
  );
}
