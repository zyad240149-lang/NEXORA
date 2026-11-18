import { useState } from 'react';
import { Button, EmptyState, ErrorState, Input, Skeleton, StatusBadge } from '../components/ui';
import CustomerModal from '../components/CustomerModal';
import SubModal from '../components/SubModal';
import { currentSub, db } from '../data/db';
import { subState } from '../data/status';
import { useCustomers } from '../hooks/useCustomers';
import { useToast } from '../hooks/useToast';
import type { Customer } from '../types';
import { fmtDate, money } from '../utils/format';
import { useAuth } from '../services/auth';

export default function Customers() {
  const { rows, error, reload } = useCustomers();
  const toast = useToast();
  const admin = useAuth().user?.role === 'admin';
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Customer | 'new' | null>(null);
  const [subFor, setSubFor] = useState<Customer | null>(null);
  const list = (rows ?? []).filter((c) => !q.trim() || `${c.name} ${c.phone} ${c.biz} ${c.branches.join(' ')} ${c.managerName} ${c.contractManagerName}`.includes(q.trim()));
  const del = async (c: Customer) => {
    if (!confirm(`حذف المشترك «${c.name}» وكل اشتراكاته؟`)) return;
    try { await db.deleteCustomer(c.id); toast.success('تم الحذف'); reload(); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>المشتركين</h1><p>كل مشتركين Nexora — <span className="num">{rows?.length ?? 0}</span> مشترك</p></div>
        <Button icon="plus" onClick={() => setEdit('new')}>مشترك جديد</Button>
      </div>
      <div className="card">
        <div className="card__body" style={{ paddingBottom: 0 }}>
          <Input label="بحث" icon="search" placeholder="الاسم أو الجوال أو النشاط" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="card__body">
          {error ? <ErrorState onRetry={reload} /> : !rows ? <Skeleton h={220} /> : list.length === 0 ? (
            <EmptyState icon="users" title="مفيش مشتركين" text={q ? 'مفيش نتايج مطابقة.' : 'أضف أول مشترك من زرار «مشترك جديد».'} />
          ) : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>المشترك</th><th>الفروع</th><th>المسؤول</th><th>الجوال</th><th>الاشتراك الحالي</th><th>ينتهي</th><th>الحالة</th><th className="actions">الإجراءات</th></tr></thead>
              <tbody>{list.map((c) => {
                const s = currentSub(c);
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}{c.biz && <div className="muted-sm">{c.biz}</div>}</td>
                    <td>{c.branches.length ? <><span className="num">{c.branches.length}</span><div className="muted-sm">{c.branches.join('، ')}</div></> : '—'}</td>
                    <td>{c.managerName && <div>{c.managerName} <span className="muted-sm">مدير</span></div>}{c.contractManagerName && <div>{c.contractManagerName} <span className="muted-sm">مدير تعاقد</span></div>}{!c.managerName && !c.contractManagerName && '—'}</td>
                    <td className="num" dir="ltr" style={{ textAlign: 'end' }}>{c.code} {c.phone}</td>
                    <td className="num">{s ? `${money(s.price, s.cur)} / ${s.months} شهر` : '—'}</td>
                    <td>{s ? fmtDate(s.end) : '—'}</td>
                    <td><StatusBadge {...subState(s)} /></td>
                    <td className="actions"><div style={{ display: 'flex', gap: 6 }}>
                      {admin && <Button size="sm" variant="outline" icon="plus" onClick={() => setSubFor(c)}>اشتراك</Button>}
                      <Button size="sm" variant="ghost" icon="edit" onClick={() => setEdit(c)} aria-label="تعديل" />
                      {admin && <Button size="sm" variant="ghost" icon="trash" onClick={() => del(c)} aria-label="حذف" />}
                    </div></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
        </div>
      </div>
      {edit && <CustomerModal customer={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {subFor && <SubModal customer={subFor} onClose={() => setSubFor(null)} onSaved={() => { setSubFor(null); reload(); }} />}
    </div>
  );
}
