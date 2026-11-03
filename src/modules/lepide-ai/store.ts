import { createStore } from '../../stores/createStore';
import {
  ACTION_LABEL, INITIAL_ALERTS, SEED_ALERT_HISTORY, SEED_CHAT_HISTORY, replyFor, reportFor,
  type ActionType, type Alert, type AlertHistoryEntry, type ChatEntry, type Msg, type Reply,
} from './data';

/* ENT-AI-SessionState. Module-level, so it survives route changes inside the SPA (the console mounts its
   provider above the router for the same reason) and pending replies keep running while the user is away
   (FLW-AI-04: the View Report result lands while the Auditor report is open).
   GAP-AI-12 (intended): alert actions, read state, alert-history entries, conversations and saved alert
   settings persist per user in localStorage["lepide-ai-state:<email>"]. */

export type AiState = 'idle' | 'thinking' | 'responding';
export type LeftView = 'alerts' | 'chat-history' | 'alert-history';
export type TuneDraft = { name: string; status: boolean; description: string };
export const TUNE_DEFAULT: TuneDraft = { name: 'Potential brute force attack', status: true, description: 'Critical findings report' };

type Persisted = {
  actionsByAlert: Record<string, ActionType[]>;
  readAlerts: string[];
  sessionHistory: AlertHistoryEntry[];
  savedChats: ChatEntry[];
  tuneSaved: Record<string, TuneDraft>;
};
type State = Persisted & {
  user: string | null;
  messages: Msg[];
  aiState: AiState;
  chatKey: number;
  leftView: LeftView;
  viewingChatId: string | null;
  /** Conversation the thread is saved under (seed id when continuing a past chat). */
  chatId: string | null;
  tuneAlertId: string | null;
  /** AI messages whose last section has revealed (follow-ups wait for it — GAP-AI-14). */
  settled: string[];
};

const EMPTY: Persisted = { actionsByAlert: {}, readAlerts: [], sessionHistory: [], savedChats: [], tuneSaved: {} };
export const aiStore = createStore<State>({
  ...EMPTY, user: null, messages: [], aiState: 'idle', chatKey: 0, leftView: 'alerts', viewingChatId: null, chatId: null, tuneAlertId: null, settled: [],
});

/** AI messages that already streamed once (render instantly afterwards). */
export const revealed = new Set<string>();

let gen = 0;
let seq = 100;
const SESSION = Date.now().toString(36);
const nextId = () => `msg-${SESSION}-${++seq}`;
const keyFor = (email: string) => `lepide-ai-state:${email}`;
const set = aiStore.set;
const get = aiStore.get;

function persist() {
  const s = get(); if (!s.user) return;
  const p: Persisted = { actionsByAlert: s.actionsByAlert, readAlerts: s.readAlerts, sessionHistory: s.sessionHistory, savedChats: s.savedChats, tuneSaved: s.tuneSaved };
  try { localStorage.setItem(keyFor(s.user), JSON.stringify(p)); } catch { /* storage unavailable: session only */ }
}

/** Load the signed-in user's saved state once (or again when the user changes). */
export function hydrate(email: string) {
  if (get().user === email) return;
  let p: Persisted = EMPTY;
  try { const raw = localStorage.getItem(keyFor(email)); if (raw) p = { ...EMPTY, ...(JSON.parse(raw) as Persisted) }; } catch { /* corrupt → defaults */ }
  p.savedChats.forEach((c) => c.messages.forEach((m) => revealed.add(m.id)));
  gen++;
  set((s) => ({ ...s, ...p, user: email, messages: [], aiState: 'idle', viewingChatId: null, chatId: null, tuneAlertId: null, settled: [], leftView: 'alerts' }));
}

/* ---------------- derived ---------------- */
export const alertHistory = (s: State) => [...s.sessionHistory, ...SEED_ALERT_HISTORY];
export function chatList(s: State): ChatEntry[] {
  const saved = new Map(s.savedChats.map((c) => [c.id, c]));
  return [...s.savedChats, ...SEED_CHAT_HISTORY.filter((c) => !saved.has(c.id))];
}
/** The alert/action has a confirmation open in the thread (ConfirmThenMutate pending state). */
export function isPending(s: State, alertId: string, action: ActionType) {
  const turns = s.messages.filter((m) => m.alertId === alertId && m.alertAction === action);
  const last = turns[turns.length - 1];
  return !!last && last.kind !== 'alert-ai-result';
}
export const isLocked = (s: State, alertId: string, action: ActionType) => (s.actionsByAlert[alertId] ?? []).includes(action);

/* ---------------- conversation ---------------- */
function saveChat() {
  set((s) => {
    if (!s.chatId || !s.messages.length) return s;
    const prev = chatList(s).find((c) => c.id === s.chatId);
    const firstUser = s.messages.find((m) => m.role === 'user') ?? s.messages[0];
    const entry: ChatEntry = { id: s.chatId, title: prev?.title ?? firstUser.content, timestamp: s.messages[s.messages.length - 1].timestamp, messages: s.messages };
    return { ...s, savedChats: [entry, ...s.savedChats.filter((c) => c.id !== entry.id)] };
  });
  persist();
}
function push(m: Omit<Msg, 'id' | 'timestamp'>) {
  const msg: Msg = { ...m, id: nextId(), timestamp: Date.now() };
  set((s) => ({ ...s, chatId: s.chatId ?? `chat-${SESSION}-${seq}`, messages: [...s.messages, msg] }));
  saveChat();
  return msg;
}
const setState = (aiState: AiState) => set((s) => ({ ...s, aiState }));

/** Shared timing: thinking → append → responding → idle; dropped if the conversation was reset. */
function respond(thinkMs: number, make: () => Omit<Msg, 'id' | 'timestamp'>, respondMs: number) {
  const g = gen;
  setState('thinking');
  setTimeout(() => {
    if (g !== gen) return;
    push(make());
    setState('responding');
    setTimeout(() => { if (g === gen) setState('idle'); }, respondMs);
  }, thinkMs);
}

/** FLW-AI-02: ask a question (typed, chip, tile, nudge, follow-up, composer, Home's ask box). */
export function ask(text: string) {
  const t = text.trim();
  if (!t || get().aiState === 'thinking') return;
  push({ role: 'user', content: t });
  respond(1200 + Math.random() * 600, () => ({ role: 'ai', ...(replyFor(t) as Reply) }), 600);
}

/** FLW-AI-09: discard any pending reply, clear the thread, remount the chat pane. */
export function newChat() {
  gen++;
  set((s) => ({ ...s, messages: [], aiState: 'idle', viewingChatId: null, chatId: null, settled: [], chatKey: s.chatKey + 1 }));
}

/** FLW-AI-07: open a past chat (AI text renders instantly). */
export function selectChat(entry: ChatEntry) {
  gen++;
  entry.messages.forEach((m) => revealed.add(m.id));
  set((s) => ({ ...s, messages: entry.messages.map((m) => ({ ...m })), aiState: 'idle', viewingChatId: entry.id, chatId: entry.id, settled: entry.messages.map((m) => m.id) }));
}

export function settle(id: string) {
  if (get().settled.includes(id)) return;
  set((s) => ({ ...s, settled: [...s.settled, id] }));
}

/* ---------------- alerts ---------------- */
export const setLeftView = (leftView: LeftView) => set((s) => ({ ...s, leftView }));
export function toggleRead(id: string) {
  set((s) => ({ ...s, readAlerts: s.readAlerts.includes(id) ? s.readAlerts.filter((x) => x !== id) : [...s.readAlerts, id] }));
  persist();
}
function record(alert: Alert, action: ActionType) {
  const e: AlertHistoryEntry = { id: `aha-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, alertId: alert.id, alertMessage: alert.message, action, timestamp: Date.now() };
  set((s) => ({
    ...s, sessionHistory: [e, ...s.sessionHistory],
    actionsByAlert: { ...s.actionsByAlert, [alert.id]: Array.from(new Set([...(s.actionsByAlert[alert.id] ?? []), action])) },
  }));
  persist();
}

const pills = (p: string) => [
  { label: 'No', variant: 'secondary' as const, action: `${p}-no` },
  { label: 'Yes', variant: 'primary' as const, action: `${p}-yes` },
];

/** INT-AI-012/013/014. Disable and View Report confirm first (GAP-AI-02 intended: the pill is pending
    while the prompt is open, locks on "Yes", returns on "No"); every pill waits while the AI is busy (GAP-AI-04). */
export function alertAction(alert: Alert, action: ActionType) {
  const s = get();
  if (s.aiState !== 'idle') return;
  if (action === 'tune-settings') { set((x) => ({ ...x, tuneAlertId: alert.id })); return; }
  if (isLocked(s, alert.id, action) || isPending(s, alert.id, action)) return;
  push({ role: 'user', kind: 'alert-user', content: alert.message, actionLabel: ACTION_LABEL[action], alertId: alert.id, alertAction: action });
  const base = { role: 'ai' as const, kind: 'alert-ai-prompt' as const, alertId: alert.id, alertAction: action };
  if (action === 'disable') {
    respond(1000, () => ({ ...base, content: 'Are you sure you want to disable the alert?', subtitle: 'Just to let you know that the alert can be re-enabled at anytime by going to Lepide Detect', actions: pills('alert-disable') }), 350);
  } else {
    const r = reportFor(alert.id);
    respond(1000, () => ({ ...base, content: 'Are you sure you want to view the report?', subtitle: `Just to let you know that once you click the "Yes" button, you’ll be taken to the ${r.name} report in Lepide Auditor.`, actions: pills('alert-view') }), 350);
  }
}

/** INT-AI-044. Returns the route to open for View Report › Yes (the caller navigates immediately). */
export function confirmAlert(msgId: string, choice: string): string | null {
  const s = get();
  const m = s.messages.find((x) => x.id === msgId);
  if (!m || m.chosen || s.aiState !== 'idle') return null;
  set((x) => ({ ...x, messages: x.messages.map((y) => (y.id === msgId ? { ...y, chosen: choice } : y)) }));
  saveChat();
  const alert = INITIAL_ALERTS.find((a) => a.id === m.alertId) ?? { id: m.alertId ?? '', message: '' };
  const yes = choice.endsWith('-yes');
  if (yes && m.alertAction) record(alert, m.alertAction);
  const result = (content: string, subtitle?: string) =>
    respond(1100, () => ({ role: 'ai', kind: 'alert-ai-result', content, subtitle, alertId: m.alertId, alertAction: m.alertAction }), 350);
  if (choice === 'alert-disable-yes') result('Thanks! Alert has been disabled successfully', 'Let me know if you want to see more? I can guide you on tweaking this alert further');
  else if (choice === 'alert-disable-no') result("No problem — I'll keep watching this one for you.");
  else if (choice === 'alert-view-no') result("No problem — let me know if you'd like to dig into anything else.");
  else if (choice === 'alert-view-yes') {
    result('Wow! Looks like you’ve viewed the report. Nice move!', 'Want to see more Active Directory reports where the same alert is happening?');
    return reportFor(m.alertId).path;
  }
  return null;
}

/* ---------------- Edit Alert (DLG-AI-02; GAP-AI-03/05 intended: Done saves, one history entry, tick) ---------------- */
export const closeTune = () => set((s) => ({ ...s, tuneAlertId: null }));
export function saveTune(alertId: string, draft: TuneDraft) {
  set((s) => ({ ...s, tuneSaved: { ...s.tuneSaved, [alertId]: draft }, tuneAlertId: null }));
  const alert = INITIAL_ALERTS.find((a) => a.id === alertId);
  if (alert) record(alert, 'tune-settings'); else persist();
}
