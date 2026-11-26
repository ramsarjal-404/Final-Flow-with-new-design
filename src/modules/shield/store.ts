// @ts-nocheck — ported from the live prototype (https://lepide-new-ui.vercel.app/shield); shapes are in ./types.ts.
/* The AI Shield store (people, sessions, endpoints, policies, activity, retention) and every action that changes it. Each change is written to Admin activity. */
import { createStore, uid } from '../../stores/createStore';
import { ROLES, SEED_POLICIES, YOU_EMAIL, SEED_PEOPLE, SEED_ENDPOINTS, SEED_SESSIONS, SEED_ACTIVITY } from './data';

export const shieldStore = createStore({
  people: SEED_PEOPLE,
  activity: SEED_ACTIVITY,
  sessions: SEED_SESSIONS,
  endpoints: SEED_ENDPOINTS,
  categories: SEED_POLICIES,
  policyVersion: 3,
  policyPublishedAt: SEED_ACTIVITY.find((t) => t.kind === 'rules').at,
  retentionMonths: 6,
  afterRetention: 'archive',
});
export const currentAdmin = () => shieldStore.get().people.find((t) => t.email === YOU_EMAIL);
export const personByEmail = (t) => shieldStore.get().people.find((n) => n.email === t);
export function logActivity(t, n, o, c = currentAdmin().name, d = 'admin') {
  shieldStore.set((u) => ({
    ...u,
    activity: [
      {
        id: uid('act'),
        at: new Date().toISOString(),
        actor: c,
        actorRole: d,
        action: t,
        detail: n,
        kind: o,
      },
      ...u.activity,
    ],
  }));
}
export function addPerson(t) {
  const n = {
    id: uid('usr'),
    ...t,
    status: t.source === 'local' ? 'active' : 'invited',
    addedAt: new Date().toISOString(),
    lastActive: null,
  };
  shieldStore.set((c) => ({
    ...c,
    people: [n, ...c.people],
  }));
  const o = t.source === 'ad' ? 'Active Directory' : t.source === 'entra' ? 'Microsoft Entra ID' : 'a local account';
  return (
    logActivity(
      `Added person as ${ROLES[t.role].label}`,
      `${t.name} · ${t.email} · via ${o}`,
      t.role === 'approver' ? 'roles' : 'people',
    ),
    n
  );
}
export function updatePerson(t, n) {
  const o = shieldStore.get().people.find((c) => c.id === t);
  o &&
    (shieldStore.set((c) => ({
      ...c,
      people: c.people.map((d) =>
        d.id === t
          ? {
              ...d,
              ...n,
            }
          : d,
      ),
    })),
    n.role && n.role !== o.role
      ? logActivity(
          `Changed role to ${ROLES[n.role].label}`,
          `${n.name ?? o.name} · was ${ROLES[o.role].label}`,
          n.role === 'approver' || o.role === 'approver' ? 'roles' : 'people',
        )
      : logActivity('Edited person', `${n.name ?? o.name} · ${n.email ?? o.email}`, 'people'));
}
export function removePerson(t) {
  const n = shieldStore.get().people.find((o) => o.id === t);
  n &&
    (shieldStore.set((o) => ({
      ...o,
      people: o.people.filter((c) => c.id !== t),
    })),
    logActivity('Removed person', `${n.name} · ${n.email}`, n.role === 'approver' ? 'roles' : 'people'));
}
export function markLeftDirectory(t) {
  const n = shieldStore.get().people.find((o) => o.id === t);
  n &&
    (shieldStore.set((o) => ({
      ...o,
      people: o.people.map((c) =>
        c.id === t
          ? {
              ...c,
              status: 'left',
            }
          : c,
      ),
    })),
    logActivity(
      'Removed from directory',
      `${n.name} · Active Directory no longer vouches for this account · sign-in disabled, history kept`,
      'system',
      'Lepide Shield',
      'system',
    ));
}
export const PASSWORD_WORDS = [
  'amber',
  'harbor',
  'cedar',
  'maple',
  'orbit',
  'quartz',
  'river',
  'summit',
  'violet',
  'willow',
  'ember',
  'falcon',
];
export function resetPassword(t) {
  const n = shieldStore.get().people.find((d) => d.id === t);
  if (!n) return '';
  const o = () => PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)],
    c = `${o()}-${o()}-${String(Math.floor(Math.random() * 90) + 10)}`;
  return (
    logActivity('Reset a password', `${n.name} · one-time password · must be changed at next sign-in`, 'people'), c
  );
}
export const keywordCount = (t) => t.reduce((n, o) => n + o.keywords.length, 0);
export function publishPolicy(t) {
  const n = shieldStore.get().policyVersion + 1;
  return (
    shieldStore.set((o) => ({
      ...o,
      categories: t,
      policyVersion: n,
      policyPublishedAt: new Date().toISOString(),
    })),
    logActivity(
      'Protection policy updated',
      `Version ${n} · ${t.length} policies watching ${keywordCount(t)} keywords`,
      'rules',
    ),
    n
  );
}
export function markSessionReviewed(t) {
  var c;
  const n = shieldStore.get().sessions.find((d) => d.id === t);
  if (!n) return;
  shieldStore.set((d) => ({
    ...d,
    sessions: d.sessions.map((u) =>
      u.id === t
        ? {
            ...u,
            reviewed: !0,
          }
        : u,
    ),
  }));
  const o = ((c = personByEmail(n.person)) == null ? void 0 : c.name) ?? n.person;
  logActivity('Reviewed a session', `${o} · ${n.tool} · nothing further needed`, 'other');
}
export function setRetention(t, n) {
  shieldStore.set((o) => ({
    ...o,
    retentionMonths: t,
    afterRetention: n,
  })),
    logActivity(
      'Retention policy changed',
      `Keep ${t} month${t === 1 ? '' : 's'} · then ${n === 'archive' ? 'archive to \\\\backup01\\lepide-archive' : 'delete'}`,
      'other',
    );
}
