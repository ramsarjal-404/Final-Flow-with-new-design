import trust from '../../../data/settings/trust.json';
import { createStore, uid } from '../../../stores/createStore';
import type { ToastInput } from '../../../ui';

/* Trust Settings store (MOD-SDS data-model Part 3). Module-level: survives navigation inside the
   app and resets on reload — the intended session scope of GAP-SDS-19 (the shipped prototype
   reset it on leaving /settings/trust). */

const X = trust.exports;

export type TrustKind = 'ad' | 'aws' | 'azure' | 'exchange-online' | 'exchange-onprem' | 'sharepoint-online' | 'sharepoint-onprem' | 'nas' | 'none';
export type TrustSource = { id: string; label: string; logo: string; kind: TrustKind; addFileServer?: boolean };

export const TRUST_SOURCES = X.TRUST_SOURCES as TrustSource[];
export const sourceById = (id?: string) => TRUST_SOURCES.find((s) => s.id === id);

export const WEEKDAY_NAMES = X.WEEKDAY_NAMES as string[];
export const AD_SERVERS = X.AD_SERVERS as string[];
export const EXCHANGE_DOMAINS = X.EXCHANGE_DOMAINS as string[];
export const TENANTS = X.TENANTS as string[];
export const SPO_SITES = X.SPO_SITES as string[];
export const SPP_SITES = X.SPP_SITES as string[];
export const NAS_SERVERS = X.NAS_SERVERS as string[];
export const NAS_SHARES = X.NAS_SHARES as Record<string, string[]>;
export const AUDITED_SERVERS = X.AUDITED_SERVERS as string[];
export const FOLDER_TREE = X.FOLDER_TREE as string[];
export const APPLY_TO = X.APPLY_TO as string[];
export const DOMAINS = X.DOMAINS as string[];
export const AD_COMPUTERS = X.AD_COMPUTERS as { name: string; dn: string }[];
export type OuNode = { id: string; label: string; kind: 'ou' | 'computer'; children?: OuNode[] };
export const OU_TREE = X.OU_TREE as OuNode[];
export const SHARE_COMPUTERS = X.SHARE_COMPUTERS as { name: string; ip: string }[];
export const SQL_SERVERS = X.SQL_SERVERS as Record<string, string[]>;
export const DATABASES = X.DATABASES as string[];
export const STALE_OPTIONS = X.STALE_OPTIONS as string[];

/* ---------------- entities ---------------- */
export type FolderRow = { id: string; folder: string; server: string; applyTo: string };
export type DbMapping = { server: string; sqlServer: string; database: string };
export type ScanSchedule = { type: 'Daily' | 'Weekly' | 'Monthly'; time: string; startOn: string; weekdays: string[]; dates: number[] };
export type DataSetStatus = 'Successful' | 'Scheduled' | 'Running' | 'Not Scanned';
export type DataSet = {
  id: string; name: string; description: string;
  config: Record<string, string>; objects: string[];
  folders: FolderRow[]; mappings: DbMapping[];
  scanNow: boolean; schedule: ScanSchedule | null;
  remoteAgent: boolean; agent: string;
  nested?: { controller: string; user: string };
  lastScan: string; nextScan: string; status: DataSetStatus;
};
export type SqlValue = {
  server: string; auth: 'windows' | 'sql'; user: string; password: string;
  mode: 'create' | 'select'; database: string; connTimeout: string; queryTimeout: string;
};
export type SecondaryDb = { id: string; fileServer: string; sqlServer: string; database: string };
export type SourceState = { dataSets: DataSet[]; primary: SqlValue; secondary: SecondaryDb[]; stale: string };

export const DEFAULT_PRIMARY = X.DEFAULT_PRIMARY as SqlValue;

const seedSecondary = (): SecondaryDb[] =>
  [211, 212, 213, 214, 215].map((n) => ({ id: uid('sdb'), fileServer: `192.145.30.${n}`, sqlServer: 'Chily\\david09', database: 'Permission-01' }));

export const freshState = (): SourceState => ({ dataSets: [], primary: { ...DEFAULT_PRIMARY }, secondary: seedSecondary(), stale: STALE_OPTIONS[0] });

type State = { sources: Record<string, SourceState>; agents: string[] };
export const trustStore = createStore<State>({ sources: {}, agents: ['192.168.30.90'] });

/** Read a source's state (created lazily). */
const fresh = new Map<string, SourceState>();
const lazyFresh = (id: string) => { if (!fresh.has(id)) fresh.set(id, freshState()); return fresh.get(id)!; };
export const getSource = (id: string) => trustStore.get().sources[id] ?? lazyFresh(id);
export const useSourceState = (id: string) => trustStore.use((s) => s.sources[id]) ?? lazyFresh(id);

export function patchSource(id: string, fn: (s: SourceState) => SourceState) {
  trustStore.set((st) => ({ ...st, sources: { ...st.sources, [id]: fn(st.sources[id] ?? lazyFresh(id)) } }));
}
export const useAgents = () => trustStore.use((s) => s.agents);
export const addAgent = (ip: string) => trustStore.set((s) => ({ ...s, agents: s.agents.includes(ip) ? s.agents : [...s.agents, ip] }));

/* ---------------- formatting helpers ---------------- */
const p2 = (n: number) => String(n).padStart(2, '0');
/** DD-MM-YYYY */
export const fmtDay = (d: Date) => `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}`;
/** DD-MM-YYYY HH:mm:ss (24 h) */
export const fmtStamp = (d = new Date()) => `${fmtDay(d)} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
/** "HH:MM:SS" → "hh:mm:ss AM|PM" */
export const time12 = (t: string) => {
  const [h, m, s] = t.split(':').map(Number);
  return `${p2(h % 12 || 12)}:${p2(m)}:${p2(s)} ${h < 12 ? 'AM' : 'PM'}`;
};
/** "1 file server" / "2 file servers" */
export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/** Read-only summary of a schedule (trust.ts `scheduleSummary`). */
export function scheduleSummary(s: ScanSchedule) {
  const at = time12(s.time);
  const tail = ` Schedule start from ${s.startOn}.`;
  if (s.type === 'Daily') return `Run every day at ${at}.${tail}`;
  if (s.type === 'Weekly') return `Run every ${s.weekdays.join(', ')} at ${at}.${tail}`;
  return `Run monthly on ${s.dates.join(', ')}${s.weekdays.length ? ` (${s.weekdays.join(', ')})` : ''} at ${at}.${tail}`;
}
export const scanType = (d: DataSet) => (d.schedule ? `${d.schedule.type} Scan` : 'Scan Once Only');

/* ---------------- simulated scan (module scope so it survives navigation) ---------------- */
type Toast = (t: ToastInput) => void;
const running = new Set<string>();
export function runScan(sourceId: string, dsId: string, toast: Toast, announce = true) {
  const ds = getSource(sourceId).dataSets.find((d) => d.id === dsId);
  if (!ds || running.has(dsId)) return;
  running.add(dsId);
  patchSource(sourceId, (s) => ({ ...s, dataSets: s.dataSets.map((d) => (d.id === dsId ? { ...d, status: 'Running' } : d)) }));
  if (announce) toast({ variant: 'info', title: 'Scan started', message: `Permission scan for ${ds.name} is running.` });
  window.setTimeout(() => {
    running.delete(dsId);
    const cur = getSource(sourceId).dataSets.find((d) => d.id === dsId);
    if (!cur) return;
    patchSource(sourceId, (s) => ({ ...s, dataSets: s.dataSets.map((d) => (d.id === dsId ? { ...d, status: 'Successful', lastScan: fmtStamp() } : d)) }));
    toast({ variant: 'success', title: 'Scan complete', message: `${cur.name} was scanned successfully.` });
  }, 1800);
}

/* ---------------- files ---------------- */
export function downloadText(name: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export const toCsv = (rows: string[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';

/** Split one CSV line (quotes supported). */
export function splitCsvLine(line: string) {
  const out: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

/* ---------------- validation helpers ---------------- */
export const isIp = (v: string) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(v.trim());
export const ipToNum = (v: string) => v.split('.').reduce((a, p) => a * 256 + Number(p), 0);
export const numToIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
