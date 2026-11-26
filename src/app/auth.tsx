import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

/* ENT-PLAT-User / ENT-PLAT-Session (modules/platform/data-model.md). Prototype authentication. */
export type Permission =
  | 'Auditor.Reports.Predefined.View' | 'Trust.Reports.View' | 'Detect.Alerts.Predefined.Access' | 'Protect.Access'
  | 'EDiscovery.Cases.View' | 'MyLepide.Access' | 'Dashboard.Predefined.Access' | 'LepideAI.Access';
export type User = { name: string; email: string; initials: string; roleId: 1 | 2 | 3; roleLabel: string; permissions: Permission[] };

const KEY = 'lepide.session';
export const LOCKED_MESSAGE = 'This account is locked after too many failed attempts. Contact your administrator.';
export const EMPTY_MESSAGE = 'Enter your email and password to continue.';

export function buildUser(emailRaw: string): User {
  const email = emailRaw.trim().toLowerCase();
  const parts = (email.split('@')[0] || '').split(/[._-]+/).filter(Boolean);
  const name = parts.length ? parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : 'Console User';
  const initials = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || 'CU';
  return {
    name, email, initials, roleId: 2, roleLabel: 'Scoped product user',
    // Prototype grants every module so the whole console is reachable (the gating mechanism stays; GAP-PLAT-04).
    permissions: ['Auditor.Reports.Predefined.View', 'Trust.Reports.View', 'Detect.Alerts.Predefined.Access', 'Protect.Access', 'EDiscovery.Cases.View', 'MyLepide.Access', 'Dashboard.Predefined.Access', 'LepideAI.Access'],
  };
}

function read(): User | null {
  for (const st of [sessionStorage, localStorage]) {
    try {
      const raw = st.getItem(KEY);
      // Prototype: permissions are re-derived on load so sessions stored before a grant change stay current.
      if (raw) { const u = JSON.parse(raw) as User; return { ...u, permissions: buildUser(u.email || 'user').permissions }; }
    } catch { /* unreadable → no session */ }
  }
  // Without-login branch: no sign-in page; everyone opens the console as the prototype user.
  return DEFAULT_USER;
}
const DEFAULT_USER = buildUser('console.user@example.com');

type Auth = {
  user: User | null;
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ ok: true } | { ok: false; message: string }>;
  signOut: () => void;
  hasPermission: (p: Permission) => boolean;
};
const Ctx = createContext<Auth>(null as unknown as Auth);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(read);
  const signIn = useCallback<Auth['signIn']>(async (email, password, remember = false) => {
    if (!email.trim() || !password) return { ok: false, message: EMPTY_MESSAGE };
    await new Promise((r) => setTimeout(r, 900)); // simulated round trip (prototype)
    if (password.toLowerCase() === 'locked') return { ok: false, message: LOCKED_MESSAGE };
    const u = buildUser(email);
    try { (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(u)); } catch { /* storage failures are swallowed */ }
    setUser(u);
    return { ok: true };
  }, []);
  const signOut = useCallback(() => {
    try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch { /* ignore */ }
    setUser(DEFAULT_USER);
  }, []);
  const hasPermission = useCallback((p: Permission) => !!user && user.permissions.includes(p), [user]);
  return <Ctx.Provider value={{ user, signIn, signOut, hasPermission }}>{children}</Ctx.Provider>;
}

/** Route guard. Without-login branch: there is always a user, so it only renders its children. */
export function RequireAuth({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
