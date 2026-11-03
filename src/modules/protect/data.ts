/* Protect seed data, typed, plus the derived helpers the spec describes (data-model.md). */
import policiesJson from '../../data/protect/policies.json';
import permJson from '../../data/protect/permission.json';
import dashJson from '../../data/protect/dashboard.json';
import wsJson from '../../data/protect/workspace.json';

const P = policiesJson.exports;
const PM = permJson.exports;
const D = dashJson.exports;
const W = wsJson.exports;

/* ------------------------------------------------------------------ stamps */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const pad = (n: number | string) => String(n).padStart(2, '0');
/** AD Cleaner stamp "DD Mon YYYY, HH:MM". */
export const stamp = (d = new Date()) => `${pad(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
/** Permission stamp "DD/MM/YYYY HH:MM AM|PM" (24-hour hour, as the product prints it). */
export const permStamp = (d = new Date()) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
/** Next daily run at HH:MM: today if still ahead, otherwise tomorrow. */
export function nextRun(time: string) {
  const [h, m] = time.split(':').map(Number); const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth(), n.getDate(), h, m);
  if (d <= n) d.setDate(d.getDate() + 1);
  return stamp(d);
}
export const shortDate = (d: Date) => `${pad(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}`;
export const addDays = (n: number, from = new Date()) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + n);

/** Deterministic PRNG (seeded populations). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ------------------------------------------------------------------ AD Cleaner policies */
export type PolicyStatus = 'completed' | 'progress' | 'scheduled' | 'draft';
export const STATUS = P.STATUS as Record<PolicyStatus, { label: string; pct: number; clock?: boolean }>;
export type Policy = {
  id: string; name: string; desc: string; status: PolicyStatus; updated: string; module: string; ptype: string; scheduled: string; active: boolean;
  task?: string; domain?: string; time?: string; destructive?: boolean; deletes?: string[]; action?: string; config?: Cfg;
};
export const SEED_POLICIES = P.SEED_POLICIES as Policy[];

export type TaskAction = { key: string; icon: string; short: string; name: string; desc: string; days: number | null; on: boolean; ou?: string; del?: boolean };
export type HygieneTask = { key: string; platform: 'ad' | 'entra'; builtin?: boolean; label: string; ptype: string; desc: string; unit?: string; intro?: string; actions?: TaskAction[]; chips: string[] };
export const TASKS = P.HYGIENE_TASKS as HygieneTask[];
export const taskOf = (k?: string) => TASKS.find((t) => t.key === k) ?? TASKS[0];
export const PLATFORMS = P.PLATFORMS as Record<'ad' | 'entra', string>;
export const DOMAINS = P.DOMAINS as string[];
export const TENANTS = P.TENANTS as string[];
export const G_QUARANTINE = P.G_QUARANTINE as string;
export const ACCOUNTS = P.ACCOUNTS as string[];
export const SENDERS = P.SENDERS as { value: string; label: string }[];
export const REPORT_COLS = P.REPORT_COLS as string[];
export const TYPE_LBL = P.TYPE_LBL as Record<TplType, string>;
export const STATUS_LBL = P.STATUS_LBL as Record<TplStatus, string>;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Object type a task deletes — used by the activation acknowledgement (GAP-PRO-09 intended). */
export const DELETE_NOUN: Record<string, [string, string]> = {
  accounts: ['account', 'accounts'], groups: ['group', 'groups'], disabled: ['account', 'accounts'], computers: ['computer', 'computers'],
  entraDevices: ['device', 'devices'], entraUsers: ['user', 'users'], entraGuests: ['guest', 'guests'],
};

/* ------------------------------------------------------------------ creator config */
export type Rung = { key: string; name: string; desc: string; enabled: boolean; hasDays: boolean; days: string; notify: boolean; notifyHidden?: boolean; ou?: string; ouLabel?: string; del?: boolean; short?: string };
export type TplType = 'both' | 'user' | 'computer';
export type TplStatus = 'all' | 'enabled' | 'disabled';
export type Template = { name: string; type: TplType; status: TplStatus; excluded: string[]; rungs: Rung[] };
export type ReportTemplate = { name: string; cols: string[] };
export type Cfg = {
  name: string; desc: string; task: string; tenant: string; domain: string; dcMode: 'all' | 'selected'; dcChecked: boolean; ous: string[];
  templates: Template[]; template: string; groupRungs: Rung[]; taskRungs: Rung[];
  sender: string; senders: { value: string; label: string }[]; recipients: string[]; hh: string; mm: string;
  reportOn: boolean; reportDays: string; reportStatus: TplStatus; reportTemplate: string; reportTemplates: ReportTemplate[];
};

type RawRung = { key: string; name: string; desc: string; enabled: boolean; days: string; notify: boolean; ou?: string; del?: boolean };
const toRung = (r: RawRung, short?: string): Rung => ({ ...r, hasDays: true, short });
export const defaultRungs = (): Rung[] => (P.DEFAULT_RUNGS as RawRung[]).map((r) => toRung(r, { pwd: 'Reset', disable: 'Disable', move: 'Move', delete: 'Delete' }[r.key]));
export const defaultGroupRungs = (): Rung[] => (P.DEFAULT_GROUP_RUNGS as RawRung[]).map((r) => ({ ...toRung(r, { report: 'Report', quarantine: 'Quarantine', delete: 'Delete' }[r.key]), notifyHidden: r.key === 'report', ou: r.ou }));
export function taskRungsFor(key: string): Rung[] {
  const t = taskOf(key);
  return (t.actions ?? []).map((a) => ({
    key: a.key, name: a.name, desc: a.desc, enabled: a.on, hasDays: a.days !== null, days: a.days === null ? '' : String(a.days), notify: true,
    notifyHidden: a.key === 'report' || a.key === 'export', ou: a.ou ? '' : undefined, ouLabel: a.ou, del: a.del, short: a.short,
  }));
}
export const newTemplate = (): Template => ({ name: '', type: 'both', status: 'all', excluded: [], rungs: defaultRungs() });
export function defaultConfig(): Cfg {
  return {
    name: '', desc: '', task: 'accounts', tenant: TENANTS[0], domain: DOMAINS[0], dcMode: 'all', dcChecked: true, ous: [],
    templates: [], template: '', groupRungs: defaultGroupRungs(), taskRungs: [],
    sender: SENDERS[0].value, senders: SENDERS.map((s) => ({ ...s })), recipients: [], hh: '13', mm: '30',
    reportOn: true, reportDays: '20', reportStatus: 'enabled', reportTemplate: 'Default Email Template 1',
    reportTemplates: [{ name: 'Default Email Template 1', cols: [...REPORT_COLS] }],
  };
}
export const isEntra = (c: Cfg) => taskOf(c.task).platform === 'entra';
export const hasScope = (c: Cfg) => (isEntra(c) ? !!c.tenant : !!c.domain.trim() || c.ous.length > 0 || c.dcChecked);
export const tplSummary = (t: Template) => {
  const n = t.excluded.length + 1;
  return [TYPE_LBL[t.type], STATUS_LBL[t.status], `${t.rungs.filter((r) => r.enabled).length} of 4 steps enabled`, `${n} excluded account${n === 1 ? '' : 's'}`];
};
export const ladderOf = (c: Cfg): Rung[] => (c.task === 'accounts' ? c.templates.find((t) => t.name === c.template)?.rungs ?? [] : c.task === 'groups' ? c.groupRungs : c.taskRungs);
export function deletesOf(c: Cfg): string[] {
  const del = ladderOf(c).some((r) => r.enabled && r.del);
  return del ? [c.task] : [];
}
export function actionSummary(c: Cfg) {
  if (c.task === 'accounts') return c.template || 'No cleanup actions';
  const on = ladderOf(c).filter((r) => r.enabled).map((r) => r.short ?? r.name);
  if (c.task === 'groups') return on.length ? 'Groups: ' + on.join(' → ') : 'No actions';
  return on.length ? on.join(' → ') : 'No actions';
}
/** Rebuild a config for a seed policy that has none stored. */
export function configFromPolicy(p: Policy): Cfg {
  const c = defaultConfig(); const t = taskOf(p.task);
  const [hh, mm] = (p.time ?? '13:30').split(':');
  return { ...c, name: p.name, desc: p.desc, task: t.key, domain: t.platform === 'ad' ? p.domain ?? c.domain : c.domain,
    tenant: t.platform === 'entra' ? p.domain ?? c.tenant : c.tenant, hh, mm, taskRungs: t.builtin ? [] : taskRungsFor(t.key) };
}

/* ------------------------------------------------------------------ organizational units */
export type OU = { n: string; p: string };
const OU_BASE: [string, 'CN' | 'OU'][] = [
  ['Users', 'CN'], ['Computers', 'CN'], ['ForeignSecurityPrincipals', 'CN'], ['Program Data', 'CN'], ['Microsoft', 'CN'], ['Managed Service Accounts', 'CN'], ['Keys', 'CN'],
  ['Domain Controllers', 'OU'], ['DCD01', 'OU'], ['IT', 'OU'], ['LADSS -1', 'OU'], ['LADSS-2', 'OU'], ['Local Users -1', 'OU'], ['Local Users -2', 'OU'], ['Local Users -3', 'OU'],
  ['Training', 'OU'], ['training02', 'OU'],
];
const GROUP_OUS = ['Groups', 'Projects', 'Departments', 'Distribution Lists', 'Legacy Applications', G_QUARANTINE];
export const dcOf = (domain: string) => domain.split('.').filter(Boolean).map((p) => 'DC=' + p).join(',');
/** OUs of a domain. Domains other than the primary one lack a few seed OUs, so changing the domain can drop selections. */
export function ousFor(domain: string): OU[] {
  const di = Math.max(0, DOMAINS.indexOf(domain)); const dc = dcOf(domain || DOMAINS[0]);
  const base = OU_BASE.filter(([n, k], i) => di === 0 || k === 'CN' || ['Domain Controllers', 'DCD01'].includes(n) || (i + di) % 4 !== 0);
  return [...base.map(([n, k]) => ({ n, p: `${k}=${n},${dc}` })), ...GROUP_OUS.map((n) => ({ n, p: `OU=${n},${dc}` }))];
}
export const ouPath = (domain: string, n: string) => ousFor(domain).find((o) => o.n === n)?.p ?? `OU=${n},${dcOf(domain)}`;

export function accountTag(a: string): string {
  if (a === 'Administrator') return 'Protected';
  if (a === 'Guest' || a === 'krbtgt') return 'Built-in';
  if (a.endsWith('$')) return 'Computer';
  if (a.startsWith('svc-')) return 'Service';
  return 'User';
}

/* ------------------------------------------------------------------ permission policies */
export type PermStatus = 'completed' | 'restoreProgress' | 'scanProgress' | 'restoreQueue' | 'automationQueue';
export const PERM_STATUS = PM.PERM_STATUS as Record<PermStatus, { label: string; pct: number; clock?: boolean }>;
export type Schedule = { kind: 'weekly' | 'monthly'; days: (string | number)[]; h: string; m: string; s: string };
export type PermPolicy = {
  id: string; name: string; desc: string; status: PermStatus; updated: string; ptype: string; scheduled: string; active: boolean; isDefault?: boolean;
  criteria?: string; period?: string; members?: string[]; shares?: string[]; schedule?: Schedule | null; executePolicy?: boolean; emailNotify?: boolean;
};
export const SEED_PERM = PM.SEED_PERM_POLICIES as PermPolicy[];
/** GAP-PRO-09: the seed's impossible "30/02/24" is corrected to a valid date. */
export const RESTORE_POINTS = (PM.RESTORE_POINTS as string[]).map((p) => p.replace('30/02/24', '29/02/24'));
export const CRITERIA = PM.CRITERIA as { value: string; label: string }[];
export const ACTION_TYPES = PM.ACTION_TYPES as string[];
export type Member = { id: string; name: string; title: string; email: string; kind: 'lead' | 'team' | 'member'; parent?: string };
export const MEMBERS = PM.MEMBERS as Member[];
export type FileServer = { id: string; name: string; shares: { id: string; name: string }[] };
export const FILE_SERVERS = PM.FILE_SERVERS as FileServer[];
export const WEEKDAYS = PM.WEEKDAYS as string[];

const hh12 = (h: number) => { const x = h % 12; return pad(x === 0 ? 12 : x); };
/** "Every Month of - 1,5,12 at 02:30:00 PM." / "Every Week of - Monday, Friday at …" (weekdays sorted Monday→Sunday, GAP-PRO-09). */
export function scheduleText(s: Schedule) {
  const h = Number(s.h); const t = `${hh12(h)}:${s.m}:${s.s} ${h < 12 ? 'AM' : 'PM'}`;
  if (s.kind === 'monthly') return `Every Month of - ${[...s.days].map(Number).sort((a, b) => a - b).join(',')} at ${t}.`;
  return `Every Week of - ${[...s.days].sort((a, b) => WEEKDAYS.indexOf(String(a)) - WEEKDAYS.indexOf(String(b))).join(', ')} at ${t}.`;
}
/** Next run matching the schedule, searched up to 400 days ahead. */
export function nextPermRun(s: Schedule | null | undefined) {
  if (!s || !s.days.length) return 'Not scheduled';
  const now = new Date();
  for (let i = 0; i <= 400; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, Number(s.h), Number(s.m), Number(s.s));
    if (d <= now) continue;
    const ok = s.kind === 'monthly' ? s.days.map(Number).includes(d.getDate()) : s.days.includes(WEEKDAYS[(d.getDay() + 6) % 7]);
    if (ok) return permStamp(d);
  }
  return 'Not scheduled';
}

/* ------------------------------------------------------------------ team */
export type Person = { id: string; name: string; kind: 'lead' | 'manager' | 'employee'; department: string; title: string; email: string; canEnroll?: boolean; excluded?: boolean; children?: Person[] };
export const TEAM_ROOT = PM.TEAM_ROOT as Person;

/* ------------------------------------------------------------------ dashboard */
export const DCS = D.DCS as string[];
export const OVERVIEW = D.OVERVIEW as { c1: { ex: number[]; al: number[] }; c2: { ex: number[]; al: number[] }; c4: { ex: number[]; al: number[] }; c5: number[] };
export const TEAM = D.TEAM as { label: string; value: number; color: string }[];
export const POLICY_OVERVIEW = D.POLICY_OVERVIEW as { label: string; value: number; tone: string; pill: string; icon: string }[];
type Pair = { users: number[]; computers: number[] };
export const AD = D.AD as {
  age: { labels: string[] } & Pair; lifecycle: { labels: string[]; colors: string[] } & Pair; never: { users: number; computers: number };
  upcoming: { labels: string[]; colors: string[]; due30: string[]; due90: string[]; d30: Pair; d90: Pair };
  trend: Record<'d30' | 'd90', { labels: string[]; detected: Pair; remediated: Pair }>;
};
export type NotifType = 'sync' | 'permission' | 'threat' | 'report' | 'access' | 'stale' | 'adcleaner';
export const NOTIF_TYPES = D.NOTIF_TYPES as Record<NotifType, { tone: string; cat: string }>;
export type Notif = { id: number; type: NotifType; src: 'AD' | 'Z'; unread: boolean; ago: string; text: (string | { b: string })[]; link?: string };
export const NOTIFICATIONS = D.NOTIFICATIONS as Notif[];

/* ------------------------------------------------------------------ workspace config */
export const BUCKETS = W.BUCKETS as string[];
export const STAGES = W.STAGES as string[];
export const WS_OUS = W.OUS as string[];
export const CAP = W.CAP as number;
export type ViewKey = 'accounts' | 'schedule' | 'activity' | 'runs' | 'groups';
export const VIEWS = W.VIEWS as Record<ViewKey, { title: string; description: string; label: string; search: string; columns: string[] }>;
