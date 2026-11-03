import data from '../../../data/settings/identify.json';
import objectStep from '../../../data/components/settings/identify/ObjectStep.json';
import { createStore, uid } from '../../../stores/createStore';

/* Identify Settings store (MOD-SDS data-model Part 4). Module-level: survives navigation inside the
   app and resets on reload — the intended behaviour of GAP-SDS-20 (the observed store reset on
   leaving /settings/identify/*). Profiles belong to one source; templates, tags, patterns, agents and
   the centralized server are shared by every source. */

export type ObjKind = 'share' | 'exchangeServer' | 'exchangeOnline' | 'sharepointServer' | 'sharepointOnline' | 'onedrive' | 'dropbox';
export type IdfSource = { id: string; label: string; logo: string; kind: ObjKind; sql: boolean };
export type ConnField = { id: string; label: string; hint?: string; type?: 'select' | 'password'; options?: string[] };

export const IDF_SOURCES = data.exports.IDF_SOURCES as IdfSource[];
export const CONN_FIELDS = objectStep.exports.CONN_FIELDS as Record<ObjKind, ConnField[]>;
export const FILE_TYPES = data.exports.FILE_TYPES as string[];
export const SQL_LOCAL = data.exports.SQL_LOCAL as string[];
export const SQL_NETWORK = data.exports.SQL_NETWORK as string[];
export const SQL_DATABASES = data.exports.SQL_DATABASES as string[];
export const CLASSIFICATION_SERVERS = data.exports.CLASSIFICATION_SERVERS as string[];
export const DATASETS = data.exports.DATASETS as Record<string, { path: string; server: string }[]>;
export const AUDITED_SERVERS = data.exports.AUDITED_SERVERS as Record<string, string[]>;
export const MAILBOXES_ONPREM = data.exports.MAILBOXES_ONPREM as string[];
export const MAILBOXES_ONLINE = data.exports.MAILBOXES_ONLINE as { name: string; upn: string }[];
export const SP_SITES = data.exports.SP_SITES as string[];
export const OD_ACCOUNTS = data.exports.OD_ACCOUNTS as string[];
export const MONTHS = data.exports.MONTHS as string[];
export const WEEKDAYS = data.exports.WEEKDAYS as string[];

export const sourceById = (id: string | undefined) => IDF_SOURCES.find((s) => s.id === id);

export type ObjectRow = { id: string; path: string; server: string; upn?: string };
export type SqlValue = { server: string; auth: 'windows' | 'sql'; user: string; password: string; dbMode: 'create' | 'select'; db: string };
export type Schedule = {
  kind: 'weekly' | 'monthly'; month: number; year: number; day: number;
  hour: string; minute: string; second: string; days: string[]; months: string[]; dates: number[];
};
export type ProfileStatus = 'Running' | 'Paused' | 'Completed';
export type FileCriteria = 'All' | 'Include' | 'Exclude';
export type Profile = {
  id: string; sourceId: string; name: string; description: string; conn: Record<string, string>;
  objects: ObjectRow[]; templateIds: string[]; fileCriteria: FileCriteria; extensions: string[]; ocr: boolean;
  sizeOp: string; sizeValue: string; sizeUnit: string; sql: SqlValue;
  onTheFly: boolean; classifyNow: boolean; scheduled: boolean; schedule: Schedule | null; classificationServer: string;
  progress: number; status: ProfileStatus; agentCommunication: string; lastStart: string; lastEnd: string;
};
export type Kind = 'Default' | 'Custom';
export type Template = { id: string; name: string; description: string; tagIds: string[]; kind: Kind };
export type Tag = { id: string; name: string; description: string; patternIds: string[]; kind: Kind };
export type Pattern = {
  id: string; name: string; type: 'Regular Expression' | 'String'; description: string; expression: string; kind: Kind;
  riskLevel: string; monetaryValue: string; evidence: boolean; keywords: string; regexInclude: string; keywordsExclude: string; proximity: string;
};
export type Agent = { id: string; server: string; path: string; user: string; password: string; profile: string };
export type CentralServer = SqlValue & { id: string; connTimeout: string; queryTimeout: string; importPrevious: boolean };

type State = {
  profiles: Profile[]; templates: Template[]; tags: Tag[]; patterns: Pattern[];
  agents: Agent[]; removing: string[]; central: CentralServer[];
};

export const idfStore = createStore<State>({
  profiles: data.exports.SEED_PROFILES as unknown as Profile[],
  templates: data.exports.SEED_TEMPLATES as Template[],
  tags: data.exports.SEED_TAGS as Tag[],
  patterns: data.exports.SEED_PATTERNS as Pattern[],
  agents: data.exports.SEED_AGENTS as Agent[],
  removing: [],
  central: data.exports.SEED_CENTRAL as unknown as CentralServer[],
});

const set = idfStore.set;
export const newId = (p: string) => uid(p);

/* ---------- time stamps: "DD-MM-YYYY hh:mm:ss AM/PM" ---------- */
const p2 = (n: number) => String(n).padStart(2, '0');
export const fmtDay = (d: Date) => `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}`;
export function stamp(d = new Date()) {
  const h = d.getHours() % 12 || 12;
  return `${fmtDay(d)} ${p2(h)}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/* ---------- profiles ---------- */
export const saveProfile = (p: Profile) => set((s) => ({
  ...s, profiles: s.profiles.some((x) => x.id === p.id) ? s.profiles.map((x) => (x.id === p.id ? p : x)) : [...s.profiles, p],
}));
export const deleteProfile = (id: string) => set((s) => ({ ...s, profiles: s.profiles.filter((x) => x.id !== id) }));
export const pauseProfile = (id: string) => set((s) => ({
  ...s, profiles: s.profiles.map((x) => (x.id === id ? { ...x, status: 'Paused', lastEnd: stamp() } : x)),
}));
export const runProfile = (id: string) => set((s) => ({
  ...s, profiles: s.profiles.map((x) => (x.id === id
    ? { ...x, status: 'Running', progress: x.status === 'Completed' ? 0 : x.progress, lastStart: stamp(), lastEnd: '—' } : x)),
}));

/* Progress model [Prototype-only], intended behaviour of GAP-SDS-02: a Running profile gains 5 points
   every 400 ms; reaching 100 % sets Completed and the end time. */
setInterval(() => {
  const s = idfStore.get();
  if (!s.profiles.some((p) => p.status === 'Running')) return;
  set((st) => ({
    ...st, profiles: st.profiles.map((p) => {
      if (p.status !== 'Running') return p;
      const progress = Math.min(100, p.progress + 5);
      return progress >= 100 ? { ...p, progress: 100, status: 'Completed', lastEnd: stamp() } : { ...p, progress };
    }),
  }));
}, 400);

/* ---------- templates, tags, patterns ---------- */
export const saveTemplate = (t: Template) => set((s) => ({
  ...s, templates: s.templates.some((x) => x.id === t.id) ? s.templates.map((x) => (x.id === t.id ? t : x)) : [...s.templates, t],
}));
export const deleteTemplate = (id: string) => set((s) => ({
  ...s, templates: s.templates.filter((x) => x.id !== id),
  profiles: s.profiles.map((p) => ({ ...p, templateIds: p.templateIds.filter((x) => x !== id) })),
}));
export const saveTag = (t: Tag) => set((s) => ({
  ...s, tags: s.tags.some((x) => x.id === t.id) ? s.tags.map((x) => (x.id === t.id ? t : x)) : [...s.tags, t],
}));
export const deleteTag = (id: string) => set((s) => ({
  ...s, tags: s.tags.filter((x) => x.id !== id),
  templates: s.templates.map((t) => ({ ...t, tagIds: t.tagIds.filter((x) => x !== id) })),
}));
export const savePattern = (p: Pattern) => set((s) => ({
  ...s, patterns: s.patterns.some((x) => x.id === p.id) ? s.patterns.map((x) => (x.id === p.id ? p : x)) : [...s.patterns, p],
}));
export const deletePattern = (id: string) => set((s) => ({
  ...s, patterns: s.patterns.filter((x) => x.id !== id),
  tags: s.tags.map((t) => ({ ...t, patternIds: t.patternIds.filter((x) => x !== id) })),
}));

/* ---------- agents, central server ---------- */
export const addAgents = (xs: Omit<Agent, 'id'>[]) => set((s) => ({ ...s, agents: [...s.agents, ...xs.map((x) => ({ ...x, id: uid('ag') }))] }));
export const updateAgent = (id: string, patch: Partial<Agent>) => set((s) => ({ ...s, agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
export const markRemoving = (id: string) => set((s) => ({ ...s, removing: [...s.removing, id] }));
export const removeAgent = (id: string) => set((s) => ({ ...s, agents: s.agents.filter((a) => a.id !== id), removing: s.removing.filter((x) => x !== id) }));
export const saveCentral = (c: CentralServer) => set((s) => ({
  ...s, central: s.central.some((x) => x.id === c.id) ? s.central.map((x) => (x.id === c.id ? c : x)) : [...s.central, c],
}));

/* ---------- helpers ---------- */
export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function describeSchedule(s: Schedule) {
  const t = `${s.hour}:${s.minute}:${s.second}`;
  const start = `${p2(s.day)}-${p2(s.month + 1)}-${s.year}`;
  return s.kind === 'weekly'
    ? `Run at ${t} every ${s.days.join(', ')}. Schedule start from ${start}.`
    : `Run at ${t} on day ${s.dates.join(', ')} of ${s.months.join(', ')}. Schedule start from ${start}.`;
}

export function downloadText(name: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const isIp = (v: string) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(v);
export const isHost = (v: string) => isIp(v) || /^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(v);
export const isUnc = (v: string) => /^\\\\[^\\\s]+\\[^\\]+/.test(v);
export const uncHost = (v: string) => (/^\\\\([^\\]+)/.exec(v)?.[1] ?? '');
