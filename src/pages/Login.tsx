import { useState } from 'react';
import { Button, Input, PasswordInput } from '../components/ui';
import { useAuth } from '../services/auth';
import { Icon } from '../utils/icons';

// نفس شاشة بلتاجي المقسومة: الفورم + لوح كحلي بالهوية (بيختفي تحت 900px)
export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await login(email, pw); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="auth">
      <aside className="auth__aside">
        <div className="auth__brand"><span className="brand__mark">N</span><div><div className="brand__name">Nexora AI</div><div className="brand__desc">إدارة العملاء والاشتراكات</div></div></div>
        <h2>كل مراكزك واشتراكاتهم في مكان واحد</h2>
        <p>تابع التجديدات، وعمولات السيلز، وحسابات المشاريع.</p>
        <ul className="auth__points">
          <li><Icon name="checkCircle" size={18} />تنبيه قبل انتهاء الاشتراك</li>
          <li><Icon name="checkCircle" size={18} />عمولة كل سيلز محسوبة تلقائيًا</li>
          <li><Icon name="checkCircle" size={18} />كلمات المرور مشفّرة</li>
        </ul>
      </aside>
      <main className="auth__main" style={{ position: "relative" }}>
        <a href="https://nexora-showcase.pages.dev/" className="back-site">→ رجوع للموقع</a>
        <form className="auth__card" onSubmit={submit}>
          <h1>تسجيل الدخول</h1>
          <p className="lead">ادخل بحسابك عشان تكمل.</p>
          <div style={{ display: 'grid', gap: 14 }}>
            <Input label="رقم الموبايل أو الإيميل" type="text" dir="ltr" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            <PasswordInput label="كلمة المرور" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            {err && <div className="alert alert-danger">{err}</div>}
            <Button type="submit" block loading={busy}>دخول</Button>
          </div>
        </form>
      </main>
    </div>
  );
}
