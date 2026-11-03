import admin from '../data/settings/admin.json';
import { createStore, uid } from './createStore';

/* Admin store (modules/settings-administration/data-model.md § Stores): module-level singleton,
   survives navigation, resets on reload. This file defines the parts every Settings page shares
   (date format, activity log, administrator name) plus the slices of General Settings, Role
   Management, Lepide IQ, Logs, Application URL and Manage Domains. Every mutation writes a log line
   (ENT-SAD-LogEntry). */

export type DateFormatId = 'DD-MMM-YYYY' | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD';
export const DATE_FORMATS = admin.exports.DATE_FORMATS as { id: DateFormatId; label: string }[];
export type GeneralSettings = typeof admin.exports.DEFAULT_GENERAL;
export type LogEntry = { id: string; action: string; byWhom: string; performedOn: string /* ISO */ };

/** Prototype administrator name used in log lines (intended: the signed-in user). */
export const ADMIN_NAME = 'jirjodhan';

export type Role = 'Admin' | 'Data Viewer';
export const ROLES = admin.exports.ROLES as Role[];
export type MemberType = 'User' | 'Group';
/** ENT-SAD-Member */
export type Member = { id: string; name: string; logonId: string; domain: string; addedOn: string /* ISO */; type: MemberType; role: Role };
/** ENT-SAD-DirectoryEntry ([Prototype-only]) */
export type DirectoryEntry = { id: string; name: string; type: MemberType };
/** ENT-SAD-ManagedDomain (password is stored, never displayed) */
export type ManagedDomain = { id: string; domain: string; controller: string; logonName: string; password: string };
/** ENT-SAD-AllowlistEntry */
export type AllowlistEntry = { id: string; value: string; description: string };
/** ENT-SAD-RetentionSchedule */
export type RetentionTarget = 'tenant' | 'domain';
export type RetentionSchedule = { id: string; target: RetentionTarget; name: string; days: number };
/** ENT-SAD-IqCredential (kept in the admin store for the session: GAP-SAD-02 intended) */
export type IqCredential = { id: string; name: string; endpoint: string; apiKey: string; model: string };

export const LOG_TENANTS = admin.exports.LOG_TENANTS as string[];
export const LOG_DOMAINS = admin.exports.LOG_DOMAINS as string[];
export const DATE_TIME_DISPLAY = admin.exports.DATE_TIME_DISPLAY as string[];
export const REFRESH_INTERVALS = admin.exports.REFRESH_INTERVALS as string[];
export const BACKUP_RETENTION = admin.exports.BACKUP_RETENTION as string[];
export const LOGON_DB_SIZES = admin.exports.LOGON_DB_SIZES as string[];

type AdminState = {
  dateFormat: DateFormatId;
  general: GeneralSettings;
  logs: LogEntry[];
  members: Member[];
  domains: ManagedDomain[];
  allowlist: AllowlistEntry[];
  appUrl: string;
  schedules: RetentionSchedule[];
  iqCredentials: IqCredential[];
  /** Free slot kept for compatibility with earlier callers. */
  ext: Record<string, unknown>;
};

/* ---------------- seeds ---------------- */

/** Seed members: 13 users, all Admin, added 17-02-2025 11:48:15 AM. Domain spelt like the managed
    domain (GAP-SAD-14 intended) so the Delete Domain warning counts them. */
const SEED_DOMAIN = 'chilly.com';
const SEED_MEMBERS: [string, string][] = [
  ['Rohit Guleria', 'rohitguleriai'], ['Jir Jodhan', 'jirjodhan'], ['Abhineet Kumar', 'abhineet.kumar'],
  ['Ankit Sharma', 'ankit.sharma'], ['Ishan Singh', 'ishan.singh'], ['Richard Moore', 'richard.moore'],
  ['David Clarke', 'david.clarke'], ['Harry Wilson', 'harry.wilson'], ['Neha Kapoor', 'neha.kapoor'],
  ['Priya Nair', 'priya.nair'], ['Sameer Khan', 'sameer.khan'], ['Vikram Rathore', 'vikram.rathore'],
  ['Emma Thompson', 'emma.thompson'],
];
const SEED_ADDED = new Date(2025, 1, 17, 11, 48, 15).toISOString();
const seedMembers = (): Member[] => SEED_MEMBERS.map(([name, login], i) => ({
  id: `mem-seed-${i + 1}`, name, logonId: `${login}@${SEED_DOMAIN}`, domain: SEED_DOMAIN, addedOn: SEED_ADDED, type: 'User', role: 'Admin',
}));

const seedDomains = (): ManagedDomain[] => [
  { id: 'dom-seed-1', domain: 'Chilly.com', controller: '192.168.70.12', logonName: 'Rohitguleriai@chilly.com', password: 'Lepide@123' },
];

const seedAllowlist = (): AllowlistEntry[] => [
  { id: 'ip-seed-1', value: '192.168.70.0/24', description: 'Head office network' },
  { id: 'ip-seed-2', value: '10.20.4.15', description: 'SIEM collector' },
];

/** 160 seed log entries spread back in time (newest first), written by a few administrators,
    using the module's own log-line vocabulary. */
function seedLogs(): LogEntry[] {
  const who = [ADMIN_NAME, ADMIN_NAME, 'rohitguleriai', ADMIN_NAME, 'richard.moore'];
  const DOMS = ['ldsp2.com', 'abc.com', 'corp.chilly.com'];
  const phrases: ((i: number) => string)[] = [
    () => 'updated General Settings',
    (i) => `added member ${SEED_MEMBERS[i % 13][1]}@${SEED_DOMAIN} as ${i % 3 ? 'Admin' : 'Data Viewer'}`,
    (i) => `changed role of ${SEED_MEMBERS[(i + 4) % 13][1]}@${SEED_DOMAIN} to ${i % 2 ? 'Data Viewer' : 'Admin'}`,
    () => 'updated API white listing',
    (i) => `changed date format to ${DATE_FORMATS[i % 4].id}`,
    (i) => `scheduled logon activity deletion for ${LOG_DOMAINS[i % 4]} in ${[30, 60, 90, 180][i % 4]} days`,
    (i) => `removed member ${['temp.user', 'contractor01', 'qa.tester'][i % 3]}@${SEED_DOMAIN}`,
    () => 'updated domain Chilly.com',
    (i) => `cancelled logon activity deletion for ${LOG_TENANTS[i % 4]}`,
    () => 'updated Application URL to https://lepide.chilly.com',
    (i) => `added domain ${DOMS[i % 3]}`,
    (i) => `removed domain ${DOMS[i % 3]}`,
  ];
  let t = Date.now() - 40 * 60 * 1000; // newest seed entry 40 minutes ago
  const out: LogEntry[] = [];
  for (let i = 0; i < 160; i++) {
    const by = who[(i * 7) % who.length];
    const verb = phrases[(i * 5 + (i >> 2)) % phrases.length](i);
    out.push({ id: `log-seed-${i + 1}`, action: `${by} ${verb}`, byWhom: by, performedOn: new Date(t).toISOString() });
    // 3–17 hours between entries: 160 entries cover roughly the last two months
    t -= (3 + ((i * 37) % 15)) * 3600 * 1000 + ((i * 7919) % 3600) * 1000;
  }
  return out;
}

export const adminStore = createStore<AdminState>({
  dateFormat: 'DD-MM-YYYY',
  general: { ...admin.exports.DEFAULT_GENERAL },
  logs: seedLogs(),
  members: seedMembers(),
  domains: seedDomains(),
  allowlist: seedAllowlist(),
  appUrl: '',
  schedules: [],
  iqCredentials: [],
  ext: {},
});

/* ---------------- date formatting ---------------- */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const p2 = (n: number) => String(n).padStart(2, '0');

/** A date in the General Settings date format. */
export function formatDate(d: Date | string, fmt: DateFormatId = adminStore.get().dateFormat) {
  const x = typeof d === 'string' ? new Date(d) : d;
  const dd = p2(x.getDate()), mm = p2(x.getMonth() + 1), yyyy = String(x.getFullYear());
  switch (fmt) {
    case 'DD-MMM-YYYY': return `${dd}-${MON[x.getMonth()]}-${yyyy}`;
    case 'MM-DD-YYYY': return `${mm}-${dd}-${yyyy}`;
    case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
    default: return `${dd}-${mm}-${yyyy}`;
  }
}
/** `{date in the chosen format} hh:mm:ss AM|PM`, e.g. `17-02-2025 11:48:15 AM`. */
export function formatDateTime(d: Date | string, fmt?: DateFormatId) {
  const x = typeof d === 'string' ? new Date(d) : d;
  const h = x.getHours() % 12 || 12;
  return `${formatDate(x, fmt)} ${p2(h)}:${p2(x.getMinutes())}:${p2(x.getSeconds())} ${x.getHours() < 12 ? 'AM' : 'PM'}`;
}
/** React hook: re-renders when the date format changes. */
export const useDateFormat = () => adminStore.use((s) => s.dateFormat);

/** Append an activity-log line `{administrator} {verb phrase}` (newest first). */
export function addLog(verbPhrase: string) {
  adminStore.set((s) => ({ ...s, logs: [{ id: uid('log'), action: `${ADMIN_NAME} ${verbPhrase}`, byWhom: ADMIN_NAME, performedOn: new Date().toISOString() }, ...s.logs] }));
}

/* ---------------- directory ([Prototype-only]) ---------------- */

const DIR_FIRST = ['aarav', 'abhineet', 'aditi', 'akash', 'amit', 'ananya', 'ankit', 'arjun', 'david', 'deepak'];
const DIR_LAST = ['kumar', 'sharma', 'singh', 'moore', 'clarke'];
const DIR_GROUPS = ['Domain Admins', 'Finance Team', 'HR Team', 'IT Support', 'Sales', 'Marketing', 'Helpdesk', 'Security Auditors', 'Backup Operators', 'Remote Desktop Users'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The same 50 users and 10 groups for every domain; ids `{login}@{domain lower-cased}`. */
export function directoryFor(domain: string, type: MemberType): DirectoryEntry[] {
  const d = domain.toLowerCase();
  if (type === 'Group') return DIR_GROUPS.map((g) => ({ id: `${g}@${d}`, name: g, type: 'Group' as const }));
  const users: DirectoryEntry[] = [];
  for (const f of DIR_FIRST) for (const l of DIR_LAST) users.push({ id: `${f}.${l}@${d}`, name: `${cap(f)} ${cap(l)}`, type: 'User' });
  return users;
}

/* ---------------- actions ---------------- */

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const adminActions = {
  setDateFormat(id: DateFormatId) {
    adminStore.set((s) => ({ ...s, dateFormat: id }));
    addLog(`changed date format to ${id}`);
  },
  /** Merge values into the saved General Settings (Apply, or the retention row's own Update). */
  saveGeneral(values: Partial<GeneralSettings>) {
    adminStore.set((s) => ({ ...s, general: { ...s.general, ...values } }));
    addLog('updated General Settings');
  },
  setAllowlist(list: AllowlistEntry[]) {
    adminStore.set((s) => ({ ...s, allowlist: list }));
    addLog('updated API white listing');
  },
  /** Adds entries that are not members yet at the top; returns how many were added / skipped. */
  addMembers(entries: DirectoryEntry[], domain: string, role: Role) {
    const existing = adminStore.get().members;
    const fresh = entries.filter((e) => !existing.some((m) => same(m.logonId, e.id)));
    const now = new Date().toISOString();
    const rows: Member[] = fresh.map((e) => ({ id: uid('mem'), name: e.name, logonId: e.id, domain: domain.toLowerCase(), addedOn: now, type: e.type, role }));
    if (rows.length) {
      adminStore.set((s) => ({ ...s, members: [...rows, ...s.members] }));
      rows.forEach((m) => addLog(`added member ${m.logonId} as ${role}`));
    }
    return { added: rows.length, skipped: entries.length - rows.length };
  },
  changeRole(id: string, role: Role) {
    const m = adminStore.get().members.find((x) => x.id === id);
    if (!m || m.role === role) return false;
    adminStore.set((s) => ({ ...s, members: s.members.map((x) => (x.id === id ? { ...x, role } : x)) }));
    addLog(`changed role of ${m.logonId} to ${role}`);
    return true;
  },
  removeMembers(ids: string[]) {
    const gone = adminStore.get().members.filter((m) => ids.includes(m.id));
    adminStore.set((s) => ({ ...s, members: s.members.filter((m) => !ids.includes(m.id)) }));
    gone.forEach((m) => addLog(`removed member ${m.logonId}`));
    return gone.length;
  },
  /** New domains append; edits replace the row with the same id. */
  saveDomain(d: Omit<ManagedDomain, 'id'> & { id?: string }) {
    if (d.id) {
      const id = d.id;
      adminStore.set((s) => ({ ...s, domains: s.domains.map((x) => (x.id === id ? { ...x, ...d, id } : x)) }));
      addLog(`updated domain ${d.domain}`);
    } else {
      adminStore.set((s) => ({ ...s, domains: [...s.domains, { ...d, id: uid('dom') }] }));
      addLog(`added domain ${d.domain}`);
    }
  },
  deleteDomain(id: string) {
    const d = adminStore.get().domains.find((x) => x.id === id);
    if (!d) return;
    adminStore.set((s) => ({ ...s, domains: s.domains.filter((x) => x.id !== id) }));
    addLog(`removed domain ${d.domain}`);
  },
  setAppUrl(url: string) {
    adminStore.set((s) => ({ ...s, appUrl: url }));
    addLog(`updated Application URL to ${url}`);
  },
  /** One schedule per (target, name): applying again replaces its days. */
  scheduleRetention(target: RetentionTarget, name: string, days: number): 'created' | 'updated' {
    const cur = adminStore.get().schedules.find((x) => x.target === target && x.name === name);
    adminStore.set((s) => ({
      ...s,
      schedules: cur ? s.schedules.map((x) => (x.id === cur.id ? { ...x, days } : x)) : [...s.schedules, { id: uid('ret'), target, name, days }],
    }));
    addLog(`scheduled logon activity deletion for ${name} in ${days} days`);
    return cur ? 'updated' : 'created';
  },
  removeSchedule(id: string) {
    const cur = adminStore.get().schedules.find((x) => x.id === id);
    if (!cur) return;
    adminStore.set((s) => ({ ...s, schedules: s.schedules.filter((x) => x.id !== id) }));
    addLog(`cancelled logon activity deletion for ${cur.name}`);
  },
  /** New credentials append; edits stay in place. (No log line: the spec lists none for Lepide IQ.) */
  saveIqCredential(c: Omit<IqCredential, 'id'> & { id?: string }) {
    if (c.id) {
      const id = c.id;
      adminStore.set((s) => ({ ...s, iqCredentials: s.iqCredentials.map((x) => (x.id === id ? { ...c, id } : x)) }));
    } else {
      adminStore.set((s) => ({ ...s, iqCredentials: [...s.iqCredentials, { ...c, id: uid('iq') }] }));
    }
  },
  deleteIqCredential(id: string) {
    adminStore.set((s) => ({ ...s, iqCredentials: s.iqCredentials.filter((x) => x.id !== id) }));
  },
};
