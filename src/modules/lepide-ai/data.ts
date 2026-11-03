import raw from '../../data/lepideAi.json';

/* Lepide AI seed data and pure helpers (modules/lepide-ai/data-model.md). */

export type ActionType = 'disable' | 'view-report' | 'tune-settings';
export type Alert = { id: string; message: string };
export type MsgAction = { label: string; variant: 'primary' | 'secondary' | 'ghost'; action: string };
export type Msg = {
  id: string; role: 'user' | 'ai'; content: string; timestamp: number;
  finding?: string; why?: string; affected?: string; nextStep?: string; actions?: MsgAction[];
  kind?: 'alert-user' | 'alert-ai-prompt' | 'alert-ai-result'; actionLabel?: string; subtitle?: string;
  /** Alert flows: which alert/action the turn belongs to, and the pill picked on a prompt. */
  alertId?: string; alertAction?: ActionType; chosen?: string;
};
export type ChatEntry = { id: string; title: string; timestamp: number; messages: Msg[] };
export type AlertHistoryEntry = { id: string; alertId: string; alertMessage: string; action: ActionType; timestamp: number };
export type Reply = Pick<Msg, 'content' | 'finding' | 'why' | 'affected' | 'nextStep' | 'actions'>;
export type BucketKey = 'today' | 'yesterday' | 'lastWeek' | 'thisMonth' | 'older';

const E = raw.exports;

export const ACTION_LABEL = E.ACTION_LABEL as Record<ActionType, string>;
export const BUCKETS = E.BUCKETS as BucketKey[];
export const BUCKET_LABELS = E.BUCKET_LABELS as Record<BucketKey, string>;
export const AI_RESPONSES = E.AI_RESPONSES as unknown as Record<string, Reply>;
export const PROMPT_CHIPS = E.PROMPT_CHIPS as Record<'ciso' | 'admin' | 'auditor' | 'newuser', string[]>;
export const FOLLOW_UP_MAP = E.FOLLOW_UP_MAP as Record<string, string[]>;
export const EXPLORE_ACTIONS = E.EXPLORE_ACTIONS as { id: string; title: string; description: string; icon: string; prompt: string }[];
export const IDLE_NUDGES = E.IDLE_NUDGES as { text: string; prompt: string }[];

/* Seed timestamps were frozen when the seed was generated; the spec gives them as offsets from load
   time (c1 = now − 1 h), so rebase every seed time on the moment the module loads. */
const LOADED = Date.now();
const ANCHOR = (E.SEED_CHAT_HISTORY as ChatEntry[])[0].timestamp + 3600_000;
const rebase = (t: number) => t - ANCHOR + LOADED;

/** GAP-AI-09 (intended): six distinct alerts. a5 duplicated a2; it now carries the failed sign-in
    alert text from the seed alert history (h7), the only distinct alert copy the spec provides. */
const A5_MESSAGE = 'Heads up: 5 failed sign-ins from an unrecognised location for user "priya.mehta" in the last 10 minutes. Want me to dig in?';
export const INITIAL_ALERTS: Alert[] = (E.INITIAL_ALERTS as Alert[]).map((a) => (a.id === 'a5' ? { ...a, message: A5_MESSAGE } : a));

/** GAP-AI-01 (intended): each alert opens its own Auditor report (flows.md § FLW-AI-04). */
export const ALERT_REPORT: Record<string, { name: string; path: string }> = {
  a1: { name: 'Schema Changes', path: '/auditor/reports/schema-changes' },
  a2: { name: 'Data Accessed by Copilot', path: '/auditor/reports/data-accessed-by-copilot' },
  a3: { name: 'Admin Group Changes', path: '/auditor/reports/admin-group-changes' },
  a4: { name: 'Files Copied', path: '/auditor/reports/files-copied' },
  a5: { name: 'Failed Logons', path: '/auditor/reports/failed-logons' },
  a6: { name: 'Files Copied', path: '/auditor/reports/files-copied' },
};
export const reportFor = (alertId?: string) => ALERT_REPORT[alertId ?? ''] ?? ALERT_REPORT.a4;

export const SEED_CHAT_HISTORY: ChatEntry[] = (E.SEED_CHAT_HISTORY as ChatEntry[]).map((c) => ({
  ...c, timestamp: rebase(c.timestamp), messages: c.messages.map((m) => ({ ...m, timestamp: rebase(m.timestamp) })),
}));
export const SEED_ALERT_HISTORY: AlertHistoryEntry[] = (E.SEED_ALERT_HISTORY as AlertHistoryEntry[]).map((e) => ({ ...e, timestamp: rebase(e.timestamp) }));

/* ---------------- canned replies (GAP-AI-07 intended: normalised matching) ---------------- */
export const normalise = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const BY_KEY = new Map(Object.entries(AI_RESPONSES).map(([k, v]) => [normalise(k), v]));
export const fallbackReply = (text: string): Reply => ({
  content: `I looked into "${text}" for you. Here's what I found in your environment.`,
  finding: 'Analysis based on your current connected data sources.',
  nextStep: 'Want me to dig deeper into any specific area?',
});
export const replyFor = (text: string): Reply => BY_KEY.get(normalise(text)) ?? fallbackReply(text);

/* ---------------- follow-ups (ENT-AI-FollowUpRule; GAP-AI-14: every suggestion has an answer) ---------------- */
const ALL_PROMPTS = [...PROMPT_CHIPS.ciso, ...PROMPT_CHIPS.admin, ...PROMPT_CHIPS.auditor, ...PROMPT_CHIPS.newuser];
export function followUps(history: Msg[], fallback = PROMPT_CHIPS.ciso): string[] {
  const asked = new Set(history.map((m) => normalise(m.content)));
  const unused = (xs: string[]) => xs.filter((x) => !asked.has(normalise(x)));
  const users = history.filter((m) => m.role === 'user' && !m.kind);
  if (!users.length) return fallback.slice(0, 3);
  const last = users[users.length - 1].content.toLowerCase();
  for (const [key, list] of Object.entries(FOLLOW_UP_MAP)) {
    if (last.includes(key) && unused(list).length >= 2) return unused(list).slice(0, 3);
  }
  const fb = unused(fallback);
  if (fb.length) return fb.slice(0, 3);
  // Last resort: prompts from the other role sets that still have a canned answer.
  return unused(ALL_PROMPTS).slice(0, 3);
}

/* ---------------- greetings (ENT-AI-WelcomeGreeting) ---------------- */
const GREETINGS: ((n: string) => string)[] = [
  (n) => `Hey ${n} 👋 great to see you — what shall we dig into today?`,
  (n) => { const h = new Date().getHours(); return `Good ${h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}, ${n}! Ready whenever you are — just ask me anything.`; },
  (n) => `Welcome back, ${n}! I've got your environment covered — what's on your mind?`,
  (n) => `Hi ${n} ✨ ask me anything about access, threats, or compliance.`,
  (n) => `Hey there, ${n}! I'm right here if you need a hand with anything.`,
  (n) => `Hello ${n}! What would you like to explore first?`,
  (n) => `Welcome, ${n}! Ask me anything — I'll pull the answers together for you.`,
  (n) => `Hi ${n} 😊 let's take a look at your environment together.`,
];
const IDX_KEY = 'lepide-welcome-idx';
/** Next index in the strict rotation (pure read; `commitGreeting` stores it). */
export function peekGreetingIndex(): number {
  try {
    const raw = localStorage.getItem(IDX_KEY);
    if (raw === null) return Math.floor(Math.random() * GREETINGS.length);
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? 0 : (n + 1) % GREETINGS.length;
  } catch { return Math.floor(Math.random() * GREETINGS.length); }
}
export function commitGreeting(i: number) { try { localStorage.setItem(IDX_KEY, String(i)); } catch { /* storage unavailable */ } }
export const greetingText = (i: number, name: string) => GREETINGS[i % GREETINGS.length](name);

/* ---------------- time (screens.md § Shared regions) ---------------- */
export function timeAgo(ts: number, now = Date.now()) {
  const d = now - ts;
  const m = Math.floor(d / 60000), h = Math.floor(d / 3600000), days = Math.floor(d / 86400000);
  if (h < 1) return `${Math.max(1, m)} min ago`;
  if (h < 24) return `${h}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export function bucketOf(ts: number, now = new Date()): BucketKey {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= today) return 'today';
  if (ts >= today - 86400000) return 'yesterday';
  if (ts >= today - 7 * 86400000) return 'lastWeek';
  if (ts >= new Date(now.getFullYear(), now.getMonth(), 1).getTime()) return 'thisMonth';
  return 'older';
}
export function bucketEntries<T extends { timestamp: number }>(xs: T[]): Record<BucketKey, T[]> {
  const out = { today: [], yesterday: [], lastWeek: [], thisMonth: [], older: [] } as Record<BucketKey, T[]>;
  [...xs].sort((a, b) => b.timestamp - a.timestamp).forEach((x) => out[bucketOf(x.timestamp)].push(x));
  return out;
}

/** Reply-button placeholder titles (screens.md § SCR-AI-06 reply-action table). */
export const PANEL_LABEL: Record<string, string> = {
  report: 'Generate Report', watchlist: 'Watchlist', remediation: 'Remediation', audit: 'Audit Trail', 'ad-cleanup': 'AD Cleanup',
};
