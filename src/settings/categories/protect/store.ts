import mod from '../../../data/settings/modules.json';
import { createStore, uid } from '../../../stores/createStore';

/* Protect Settings store (MOD-SDS data-model Part 5). Module-level: survives navigation inside the
   app and resets on reload — the intended behaviour of GAP-SDS-21 (and GAP-SDS-14 for the email
   configuration, which is kept once saved). */

const X = mod.exports;

export type HrmsField = { key: string; label: string; sample: string; secret?: boolean };
export type HrmsProvider = { id: 'zoho' | 'workable'; label: string; logo: string; fields: HrmsField[] };
export const HRMS_PROVIDERS = X.HRMS_PROVIDERS as HrmsProvider[];
export const MATCH_ATTRIBUTES = X.MATCH_ATTRIBUTES as string[];
export const WEEK_DAYS = X.WEEK_DAYS as string[];
export const MONTH_DAYS = X.MONTH_DAYS as string[];
export const HOURS = X.HOURS as string[];

export type IntegrationRow = { id: string; adUser: string; sam: string; email: string; manager: string; hrUser: string; hrEmail: string; isNew?: boolean };
export const HRMS_INTEGRATION = X.HRMS_INTEGRATION as IntegrationRow[];
export const HRMS_EDIT_ROWS = X.HRMS_EDIT_ROWS as IntegrationRow[];
export const AD_INTEGRATION = X.AD_INTEGRATION as IntegrationRow[];
export const AD_MANAGER_SUGGESTIONS = X.AD_MANAGER_SUGGESTIONS as string[];

export type SuperAdmin = { id: string; name: string; domain: string };
export const SUPER_ADMINS = X.SUPER_ADMINS as SuperAdmin[];
export const CURRENT_ADMIN = X.CURRENT_ADMIN as string;
export const CSV_GUIDELINES = X.CSV_GUIDELINES as string[];
export const CSV_TEMPLATE = X.CSV_TEMPLATE as string;
export const FILE_SERVERS = X.FILE_SERVERS as string[];
export type WinrmStep = { id: string; title: string; body: string[]; commands?: { label: string; command: string }[]; steps?: string[]; footnote?: string };
export const WINRM_STEPS = X.WINRM_STEPS as WinrmStep[];

export type SyncSchedule = { syncNow: boolean; scheduled: boolean; frequency: 'Weekly' | 'Monthly' | null; day: string; time: string };
/** Detail-step values kept with the source so edit mode can be prefilled (GAP-SDS-26 intended). */
export type WizardDetails = Record<string, string>;
export type WizardResult = { domain: string; rows: IntegrationRow[]; schedule: SyncSchedule; details: WizardDetails };
export type CsvMember = { id: string; user: string; email: string; manager: string };
export type TeamSource =
  | { kind: 'hrms'; provider: 'zoho' | 'workable'; result: WizardResult }
  | { kind: 'ad'; result: WizardResult }
  | { kind: 'csv'; domain: string; fileName: string; members: CsvMember[] };

export type AgentStatus = 'Installed' | 'Installing' | 'In Que' | 'Not installed';
export type ProtectAgent = { id: string; fileServer: string; status: AgentStatus; uncPath: string; logonUser: string };
/** Shown status text: "In Que" is a copy defect (GAP-SDS-10) shown as "In Queue". */
export const statusText = (s: AgentStatus) => (s === 'In Que' ? 'In Queue' : s);
export const AGENT_UNC = 'C:\\Users\\User05\\Desktop\\dm\\protect-agent';

export type EmailConfig = {
  graph: boolean; displayName: string; sender: string; recipient: string; tenant: string; client: string; secret: string;
  auth: boolean; logon: string; password: string; server: string; port: string; ssl: string;
};
export const EMPTY_EMAIL: EmailConfig = {
  graph: true, displayName: '', sender: '', recipient: '', tenant: '', client: '', secret: '',
  auth: true, logon: '', password: '', server: '', port: '25', ssl: '',
};

type State = {
  source: TeamSource | null;
  superAdmin: { name: string; domain: string } | null;
  email: EmailConfig | null;
  agents: ProtectAgent[];
  share: { path: string; user: string } | null;
  retention: string;
};

export const protectStore = createStore<State>({
  source: null,
  superAdmin: null,
  email: null,
  agents: (X.PROTECT_AGENTS as ProtectAgent[]).map((a) => ({ ...a })),
  share: null,
  retention: '5',
});

export const setSource = (source: TeamSource | null) => protectStore.set((s) => ({ ...s, source }));
export const patchAgent = (id: string, patch: Partial<ProtectAgent>) =>
  protectStore.set((s) => ({ ...s, agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));

/* Simulated install (Prototype-only): In Que → Installing (+1.5 s) → Installed (+4 s); each extra
   server in the same batch starts 0.8 s later. Timers live at module scope so they survive navigation. */
const timers = new Map<string, number[]>();
export function cancelInstall(id: string) { (timers.get(id) ?? []).forEach((t) => clearTimeout(t)); timers.delete(id); }
export function startInstall(ids: string[]) {
  ids.forEach((id, i) => {
    cancelInstall(id);
    const extra = i * 800;
    patchAgent(id, { status: 'In Que' });
    timers.set(id, [
      window.setTimeout(() => patchAgent(id, { status: 'Installing' }), 1500 + extra),
      window.setTimeout(() => { patchAgent(id, { status: 'Installed' }); timers.delete(id); }, 4000 + extra),
    ]);
  });
}
export function addAgents(servers: string[], user: string) {
  const recs: ProtectAgent[] = servers.map((fs) => ({ id: uid('pa'), fileServer: fs, status: 'In Que', uncPath: AGENT_UNC, logonUser: user }));
  protectStore.set((s) => ({ ...s, agents: [...s.agents, ...recs] }));
  startInstall(recs.map((r) => r.id));
}

/** "Weekly — every <day> at <time>" · "Monthly — day <n> at <time>" · "Synced once — no schedule" · "No schedule". */
export function scheduleText(s: SyncSchedule) {
  if (s.scheduled && s.frequency === 'Weekly') return `Weekly — every ${s.day} at ${s.time}`;
  if (s.scheduled && s.frequency === 'Monthly') return `Monthly — day ${s.day} at ${s.time}`;
  if (s.syncNow) return 'Synced once — no schedule';
  return 'No schedule';
}

/* ---------- CSV helpers ---------- */
const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export const toCsv = (head: string[], rows: string[][]) => [head, ...rows].map((r) => r.map(esc).join(',')).join('\n') + '\n';
export function downloadText(name: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function splitLine(line: string) {
  const out: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur); return out.map((x) => x.trim());
}
/** Parses "User Name,Email,Manager" (header optional); rows without a user name are skipped. */
export function parseMembers(text: string): CsvMember[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length && /^\s*"?user\s*name"?\s*(,|$)/i.test(lines[0])) lines.shift();
  return lines.map(splitLine).filter((c) => c[0]).map((c) => ({ id: uid('m'), user: c[0], email: c[1] ?? '', manager: c[2] ?? '' }));
}
