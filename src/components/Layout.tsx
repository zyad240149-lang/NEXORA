import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '../utils/icons';
import { isCloud } from '../lib/supabase';
import { useAuth } from '../services/auth';
import { initials } from '../utils/format';

type NavItem = { to: string; label: string; icon: string; end?: boolean; admin?: boolean };
// نفس شكل قائمة بلتاجي: مجموعات بعناوين (admin = للمدير بس)
const ALL_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: 'الرئيسية', items: [{ to: '/', label: 'الرئيسية', icon: 'grid', end: true }] },
  { title: 'المشتركين', items: [
    { to: '/customers', label: 'المشتركين', icon: 'users' },
    { to: '/goals', label: 'الأهداف', icon: 'target' },
    { to: '/subscriptions', label: 'الاشتراكات', icon: 'receipt' },
    { to: '/sales', label: 'السيلز', icon: 'trend' },
  ] },
  { title: 'الإدارة', items: [{ to: '/accounts', label: 'الحسابات والمشاريع', icon: 'lock', admin: true }] },
];

function Brand() {
  return (
    <div className="brand">
      <span className="brand__mark">N</span>
      <div style={{ minWidth: 0 }}><div className="brand__name">Nexora AI</div><div className="brand__desc">إدارة العملاء والاشتراكات</div></div>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const NAV_GROUPS = ALL_GROUPS.map((g) => ({ ...g, items: g.items.filter((n) => !n.admin || user?.role === 'admin') })).filter((g) => g.items.length);
  const NAV = NAV_GROUPS.flatMap((g) => g.items);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label="فتح القائمة"><Icon name="menu" size={20} /></button>
      </header>
      <div className={`backdrop ${open ? 'show' : ''}`} onClick={close} />
      <nav className="bottom-nav no-print" aria-label="التنقل الأساسي">
        {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end}><Icon name={n.icon} size={21} /><span>{n.label}</span></NavLink>)}
      </nav>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Brand />
        <nav className="nav" onClick={close}>
          {NAV_GROUPS.map((g) => (
            <div key={g.title} className="nav-group">
              <div className="nav-label">{g.title}</div>
              {g.items.map((n) => <NavLink key={n.to} to={n.to} end={n.end}><Icon name={n.icon} size={20} /><span>{n.label}</span></NavLink>)}
            </div>
          ))}
        </nav>
        <div className="sidebar__spacer" />
        <div className="user-box">
          <div className="user-box__row">
            <span className="avatar">{user ? initials(user.name) : ''}</span>
            <div style={{ minWidth: 0 }}>
              <div className="user-box__name">{user?.name}</div>
              <div className="user-box__meta">{user?.role === 'admin' ? 'مدير' : 'سيلز'} · {isCloud ? 'متصل بالسيرفر' : 'وضع محلي'}</div>
            </div>
          </div>
          {isCloud && <button className="logout-btn" onClick={logout}><Icon name="logout" size={18} />تسجيل الخروج</button>}
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
