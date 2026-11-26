/* The AI Shield store (people, sessions, endpoints, policies, activity, retention) and every action that changes it.
   Each change is written to Admin activity. In memory: a page reload restores the seed data. */
import { createStore, uid } from '../../stores/createStore';
import { ROLES, SEED_ACTIVITY, SEED_ENDPOINTS, SEED_PEOPLE, SEED_POLICIES, SEED_SESSIONS, SERVER, YOU_EMAIL } from './data';
import type { ActivityEntry, ActivityKind, ProtectionPolicy, Role, ShieldPerson, ShieldState, Unit } from './types';

export const shieldStore = createStore<ShieldState>({
  people: SEED_PEOPLE,
  activity: SEED_ACTIVITY,
  sessions: SEED_SESSIONS,
  endpoints: SEED_ENDPOINTS,
  categories: SEED_POLICIES,
  policyVersion: 3,
  policyPublishedAt: SEED_ACTIVITY.find((a) => a.kind === 'rules')!.at,
  retentionMonths: 6,
  afterRetention: 'archive',
});

/** The signed-in admin. */
export const currentAdmin = () => shieldStore.get().people.find((p) => p.email === YOU_EMAIL)!;
/** Sessions and endpoints refer to people by email. */
export const personByEmail = (email: string | null) => shieldStore.get().people.find((p) => p.email === email);
const personById = (id: string) => shieldStore.get().people.find((p) => p.id === id);

/** Adds an entry to the top of Admin activity (by default as the signed-in admin). */
export function logActivity(
  action: string, detail: string, kind: ActivityKind,
  actor = currentAdmin().name, actorRole: ActivityEntry['actorRole'] = 'admin',
) {
  const entry: ActivityEntry = { id: uid('act'), at: new Date().toISOString(), actor, actorRole, action, detail, kind };
  shieldStore.set((s) => ({ ...s, activity: [entry, ...s.activity] }));
}

/** Approver changes count as "Appointed approvers"; everything else about people as "People changes". */
const peopleKind = (...roles: Role[]): ActivityKind => (roles.includes('approver') ? 'roles' : 'people');

export type NewPerson = Pick<ShieldPerson, 'name' | 'email' | 'role' | 'source'> & { unit?: Unit };

/** Directory accounts start Invited (access opens at their first sign-in); local accounts are Active at once. */
export function addPerson(input: NewPerson): ShieldPerson {
  const person: ShieldPerson = {
    id: uid('usr'),
    ...input,
    status: input.source === 'local' ? 'active' : 'invited',
    addedAt: new Date().toISOString(),
    lastActive: null,
  };
  shieldStore.set((s) => ({ ...s, people: [person, ...s.people] }));
  const via = input.source === 'ad' ? 'Active Directory' : input.source === 'entra' ? 'Microsoft Entra ID' : 'a local account';
  logActivity(`Added person as ${ROLES[input.role].label}`, `${input.name} · ${input.email} · via ${via}`, peopleKind(input.role));
  return person;
}

export function updatePerson(id: string, changes: Partial<NewPerson>) {
  const before = personById(id);
  if (!before) return;
  shieldStore.set((s) => ({ ...s, people: s.people.map((p) => (p.id === id ? { ...p, ...changes } : p)) }));
  const name = changes.name ?? before.name;
  if (changes.role && changes.role !== before.role) {
    logActivity(`Changed role to ${ROLES[changes.role].label}`, `${name} · was ${ROLES[before.role].label}`, peopleKind(changes.role, before.role));
  } else {
    logActivity('Edited person', `${name} · ${changes.email ?? before.email}`, 'people');
  }
}

export function removePerson(id: string) {
  const person = personById(id);
  if (!person) return;
  shieldStore.set((s) => ({ ...s, people: s.people.filter((p) => p.id !== id) }));
  logActivity('Removed person', `${person.name} · ${person.email}`, peopleKind(person.role));
}

/** What the directory sync does when someone leaves: sign-in closes, history stays. Logged as System. */
export function markLeftDirectory(id: string) {
  const person = personById(id);
  if (!person) return;
  shieldStore.set((s) => ({ ...s, people: s.people.map((p) => (p.id === id ? { ...p, status: 'left' } : p)) }));
  logActivity(
    'Removed from directory',
    `${person.name} · Active Directory no longer vouches for this account · sign-in disabled, history kept`,
    'system', 'Lepide Shield', 'system',
  );
}

const PASSWORD_WORDS = ['amber', 'harbor', 'cedar', 'maple', 'orbit', 'quartz', 'river', 'summit', 'violet', 'willow', 'ember', 'falcon'];

/** Local accounts only. Returns a one-time password like "cedar-orbit-42" (shown once). */
export function resetPassword(id: string): string {
  const person = personById(id);
  if (!person) return '';
  const word = () => PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)];
  const password = `${word()}-${word()}-${Math.floor(Math.random() * 90) + 10}`;
  logActivity('Reset a password', `${person.name} · one-time password · must be changed at next sign-in`, 'people');
  return password;
}

export const keywordCount = (policies: ProtectionPolicy[]) => policies.reduce((sum, p) => sum + p.keywords.length, 0);

/** Publishes the draft as the next policy version and returns its number. */
export function publishPolicy(policies: ProtectionPolicy[]): number {
  const version = shieldStore.get().policyVersion + 1;
  shieldStore.set((s) => ({ ...s, categories: policies, policyVersion: version, policyPublishedAt: new Date().toISOString() }));
  logActivity('Protection policy updated', `Version ${version} · ${policies.length} policies watching ${keywordCount(policies)} keywords`, 'rules');
  return version;
}

export function markSessionReviewed(id: string) {
  const session = shieldStore.get().sessions.find((s) => s.id === id);
  if (!session) return;
  shieldStore.set((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === id ? { ...x, reviewed: true } : x)) }));
  const name = personByEmail(session.person)?.name ?? session.person;
  logActivity('Reviewed a session', `${name} · ${session.tool} · nothing further needed`, 'other');
}

export function setRetention(months: number, after: ShieldState['afterRetention']) {
  shieldStore.set((s) => ({ ...s, retentionMonths: months, afterRetention: after }));
  logActivity(
    'Retention policy changed',
    `Keep ${months} month${months === 1 ? '' : 's'} · then ${after === 'archive' ? `archive to ${SERVER.archivePath}` : 'delete'}`,
    'other',
  );
}
