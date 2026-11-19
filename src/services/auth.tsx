import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isCloud, supabase } from '../lib/supabase';

export type Role = 'admin' | 'sales';
export type User = { id: string; email: string; name: string; role: Role; salesRepId: string | null };
type Ctx = { user: User | null; ready: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> };

const AuthCtx = createContext<Ctx>(null!);
// الوضع المحلي (من غير سيرفر): مدير افتراضي
const LOCAL_USER: User = { id: 'local', email: '', name: 'المدير', role: 'admin', salesRepId: null };

async function loadProfile(id: string, email: string): Promise<User | null> {
  const { data } = await supabase!.from('profiles').select('name, role, sales_rep_id, active').eq('id', id).maybeSingle();
  if (!data || !data.active) return null;
  return { id, email, name: data.name, role: data.role, salesRepId: data.sales_rep_id };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(isCloud ? null : LOCAL_USER);
  const [ready, setReady] = useState(!isCloud);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session;
      setUser(s ? await loadProfile(s.user.id, s.user.email ?? '') : null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') setUser(null); });
    return () => sub.subscription.unsubscribe();
  }, []);
  const login = async (email: string, password: string) => {
    const { data, error } = await supabase!.auth.signInWithPassword({ email: email.includes('@') ? email.trim() : email.replace(/\D/g, '') + '@nexora.local', password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'البيانات أو كلمة المرور غلط' : error.message);
    const u = await loadProfile(data.user.id, data.user.email ?? '');
    if (!u) { await supabase!.auth.signOut(); throw new Error('الحساب ده مالوش صلاحية دخول للسيستم'); }
    setUser(u);
  };
  const logout = async () => { if (supabase) await supabase.auth.signOut(); setUser(isCloud ? null : LOCAL_USER); };
  return <AuthCtx.Provider value={{ user, ready, login, logout }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
