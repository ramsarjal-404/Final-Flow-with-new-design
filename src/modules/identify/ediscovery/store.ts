import { createStore, uid } from '../../../stores/createStore';
import type { ToastInput } from '../../../ui';
import seed from '../../../data/ediscovery.json';

/* e-Discovery store (modules/identify/data-model.md). Module-level: survives moving between Cases,
   Search and Settings and leaving e-Discovery for another module; a reload restores the seed
   (README § H "State and persistence").

   Built to the intended behaviour of these gaps:
   - GAP-IDN-07  timestamps are 24-hour without an AM/PM suffix (seed values are normalised).
   - GAP-IDN-12  a new Index case starts "In Progress" and completes after a (simulated) run.
   - GAP-IDN-14  run / index jobs live here, not in a page, so they complete regardless of navigation.
   - GAP-IDN-16  every value the wizards collect is kept on the case / location (`settings`).
   - GAP-IDN-17  a location keeps every source path (multi-path location).
   - GAP-IDN-20  uninstalling an agent marks the cases / locations that name it.
   - GAP-IDN-23  a scheduler starts "Pending" cases and "Scheduled" locations at their time.
   - GAP-IDN-25  deleting a case clears the stored query for it.
   - GAP-IDN-03  updating an agent keeps its row position. */

export type CaseType = 'Index' | 'Non-Index';
export type CaseStatus = 'Completed' | 'Never Started' | 'In Progress' | 'Pending' | 'On Hold' | 'Cancelled';
export type Operator = '' | 'AND' | 'OR';
export type SourcePath = { id: string; folder: string; server: string };

/** Values collected by the wizards (GAP-IDN-16). The password is never stored. */
export type ScanSettings = {
  component: string;
  user: string;
  fileCriteria: 'All' | 'Include' | 'Exclude';
  fileTypes: string[];
  ocr: boolean;
  lastModified: string;
  sizeLimit: string;
  sizeUnit: 'MB' | 'KB';
  schedule: string;
  laterAt: string;
  host: 'Local Host' | 'Agent Server';
  threads: number;
};

export type Case = {
  id: string; name: string; description: string; agent: string; agentStatus: string; status: CaseStatus;
  lastStart: string; lastEnd: string; type: CaseType; locations: string[]; sources: SourcePath[];
  keywords: string[]; operator: Operator; settings?: ScanSettings;
};
export type Agent = { id: string; server: string; path: string; user: string; scanned: string };
export type LocationStatus = 'Starting' | 'Indexing' | 'Indexed' | 'Scheduled' | 'Not Indexed';
export type Location = {
  id: string; name: string; description: string; sharePath: string; lastIndex: string; status: LocationStatus; agent: string;
  sources?: SourcePath[]; settings?: ScanSettings; scheduledAt?: string;
};
export type IndexedDocument = { id: string; path: string; content: string };
export type SearchQuery = { caseId: string; keys: string[]; operator: Operator; exact: boolean; ran: boolean };

const X = seed.exports;
export const AGENT_STATUS_TONE = X.AGENT_STATUS_TONE as Record<string, 'success' | 'warning' | 'neutral'>;
export const COMPONENTS = X.COMPONENTS as string[];
export const FILE_TYPES = X.FILE_TYPES as string[];
export const DOCUMENTS = X.DOCUMENTS as IndexedDocument[];

/** GAP-IDN-07: "30-11-2025 13:35:25 PM" (24-hour + suffix) → "30-11-2025 13:35:25". */
const norm = (s: string) => s.replace(/\s+(AM|PM)$/i, '');
const p2 = (n: number) => String(n).padStart(2, '0');
/** CaseTimestamp `DD-MM-YYYY HH:MM:SS` (24-hour). */
export const stamp = (d = new Date()) =>
  `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;

type State = { cases: Case[]; agents: Agent[]; locations: Location[]; query: SearchQuery | null };

export const edStore = createStore<State>({
  cases: (X.SEED_CASES as Case[]).map((c) => ({ ...c, lastStart: norm(c.lastStart), lastEnd: norm(c.lastEnd) })),
  agents: X.SEED_AGENTS as Agent[],
  locations: (X.SEED_LOCATIONS as Location[]).map((l) => ({ ...l, lastIndex: norm(l.lastIndex) })),
  query: null,
});

/* ---------- toasts for background jobs ----------
   The toast function comes from the app-level ToastProvider, so it stays valid after the
   e-Discovery page unmounts: a job that finishes while the user is elsewhere still says so. */
let notifier: ((t: ToastInput) => void) | null = null;
export const setNotifier = (fn: (t: ToastInput) => void) => { notifier = fn; };
const notify = (t: ToastInput) => notifier?.(t);

/* ---------- cases ---------- */
export const patchCase = (id: string, p: Partial<Case>) =>
  edStore.set((s) => ({ ...s, cases: s.cases.map((c) => (c.id === id ? { ...c, ...p } : c)) }));

export function addCase(c: Case) {
  edStore.set((s) => ({
    ...s,
    cases: [c, ...s.cases],
    // A new case with keywords pre-fills the stored query (not run).
    query: c.keywords.length ? { caseId: c.id, keys: [...c.keywords], operator: c.operator, exact: false, ran: false } : s.query,
  }));
}

export function removeCase(id: string) {
  cancelJob(id);
  edStore.set((s) => ({ ...s, cases: s.cases.filter((c) => c.id !== id), query: s.query?.caseId === id ? null : s.query }));
}

/* ---------- simulated server jobs (GAP-IDN-14 intended: they finish regardless of navigation) ---------- */
const jobs = new Map<string, number[]>();
function cancelJob(id: string) { (jobs.get(id) ?? []).forEach((t) => clearTimeout(t)); jobs.delete(id); }
export const isRunning = (id: string) => jobs.has(id);

/** FLW-IDN-09: In Progress now; Completed after 4.5 s with a toast. */
export function runCase(id: string) {
  cancelJob(id);
  patchCase(id, { status: 'In Progress', lastStart: stamp(), lastEnd: '—' });
  const t = window.setTimeout(() => {
    jobs.delete(id);
    const c = edStore.get().cases.find((x) => x.id === id);
    if (!c) return;
    patchCase(id, { status: 'Completed', lastEnd: stamp() });
    notify({ variant: 'success', title: 'Search completed', message: `${c.name} finished searching.` });
  }, 4500);
  jobs.set(id, [t]);
}

/* ---------- agents ---------- */
export const addAgents = (list: Agent[]) => edStore.set((s) => ({ ...s, agents: [...s.agents, ...list] }));
export const updateAgent = (server: string, p: Partial<Agent>) =>
  edStore.set((s) => ({ ...s, agents: s.agents.map((a) => (a.server === server ? { ...a, ...p } : a)) }));
/** Removes the agents and marks every case / location that named them (GAP-IDN-20 intended). */
export function removeAgents(servers: string[]) {
  const gone = new Set(servers.map((x) => x.toLowerCase()));
  edStore.set((s) => ({
    ...s,
    agents: s.agents.filter((a) => !gone.has(a.server.toLowerCase())),
    cases: s.cases.map((c) => (gone.has(c.agent.toLowerCase()) ? { ...c, agentStatus: 'Agent Uninstalled' } : c)),
  }));
}
/** Cases and locations whose Agent column names this server. */
export const usersOfAgent = (s: State, server: string) => ({
  cases: s.cases.filter((c) => c.agent.toLowerCase() === server.toLowerCase()).map((c) => c.name),
  locations: s.locations.filter((l) => l.agent.toLowerCase() === server.toLowerCase()).map((l) => l.name),
});

/* ---------- locations ---------- */
export const patchLocation = (id: string, p: Partial<Location>) =>
  edStore.set((s) => ({ ...s, locations: s.locations.map((l) => (l.id === id ? { ...l, ...p } : l)) }));
export const addLocation = (l: Location) => edStore.set((s) => ({ ...s, locations: [l, ...s.locations] }));
export function removeLocation(id: string) {
  cancelJob(id);
  edStore.set((s) => ({ ...s, locations: s.locations.filter((l) => l.id !== id) }));
}

/** FLW-IDN-15: Starting → (2.2 s) Indexing → (6.5 s from start) Indexed, Last Index = now, toast. */
export function indexLocation(id: string) {
  cancelJob(id);
  patchLocation(id, { status: 'Starting', scheduledAt: undefined });
  const a = window.setTimeout(() => patchLocation(id, { status: 'Indexing' }), 2200);
  const b = window.setTimeout(() => {
    jobs.delete(id);
    const l = edStore.get().locations.find((x) => x.id === id);
    if (!l) return;
    patchLocation(id, { status: 'Indexed', lastIndex: stamp() });
    notify({ variant: 'success', title: 'Index completed', message: `${l.name} is indexed and ready to search.` });
  }, 6500);
  jobs.set(id, [a, b]);
}

/* ---------- scheduler (GAP-IDN-23 intended) ---------- */
/** `YYYY/MM/DD HH:II` → Date, or null. */
export function parseWizardDate(s: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(s);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
}
function tick() {
  const now = Date.now();
  const s = edStore.get();
  s.cases.forEach((c) => {
    const at = c.status === 'Pending' ? parseWizardDate(c.lastStart) : null;
    if (at && at.getTime() <= now && !isRunning(c.id)) runCase(c.id);
  });
  s.locations.forEach((l) => {
    const at = l.status === 'Scheduled' && l.scheduledAt ? parseWizardDate(l.scheduledAt) : null;
    if (at && at.getTime() <= now && !isRunning(l.id)) indexLocation(l.id);
  });
}
let schedulerOn = false;
export function startScheduler() {
  if (schedulerOn) return;
  schedulerOn = true;
  window.setInterval(tick, 15000);
}

/* ---------- search query ---------- */
export const setQuery = (q: SearchQuery | null) => edStore.set((s) => ({ ...s, query: q }));
export const emptyQuery = (caseId: string): SearchQuery => ({ caseId, keys: [], operator: '', exact: false, ran: false });

export const newId = uid;
