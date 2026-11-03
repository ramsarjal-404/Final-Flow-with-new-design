import detect from '../../data/detect.json';
import auditorCatalog from '../../data/auditorCatalog.json';
import trustCatalog from '../../data/trustCatalog.json';
import { createStore } from '../../stores/createStore';

/* MOD-DET data model (modules/detect/data-model.md). Seeds come from src/data/detect.json; the
   report picker reads the Auditor and Trust catalogues directly. */

const X = detect.exports;

export const ALERT_ACTIONS = X.ALERT_ACTIONS as ActionKind[];
export const ACTION_SHORT = X.ACTION_SHORT as Record<ActionKind, string>;
export const EMAIL_TO_USER = X.EMAIL_TO_USER as string;
export const DEFAULT_THRESHOLD = X.DEFAULT_THRESHOLD as Threshold;
export const ALERT_ENVIRONMENTS = X.ALERT_ENVIRONMENTS as { id: string; label: string }[];
export const STATUS_REPORT_KINDS = X.STATUS_REPORT_KINDS as { id: 'delivered' | 'failed'; label: string }[];
export const WIZARD_SOURCES = X.WIZARD_SOURCES as { id: Product; label: string; reports: string[] }[];
export const FILTER_FIELDS = X.FILTER_FIELDS as string[];
export const FILTER_OPERATORS = X.FILTER_OPERATORS as string[];
export const VALUE_FILTER_FIELDS = X.VALUE_FILTER_FIELDS as string[];
export const VALUE_FILTER_INCLUDES = X.VALUE_FILTER_INCLUDES as string[];
export const REASON_OPTIONS = X.REASON_OPTIONS as string[];
export const OPERATION_OPTIONS = X.OPERATION_OPTIONS as string[];
export const THRESHOLD_UNITS = X.THRESHOLD_UNITS as string[];
export const ALERT_TYPES = X.ALERT_TYPES as AlertType[];
export const REPORT_FORMATS = X.REPORT_FORMATS as string[];
export const SCRIPT_PARAMETERS = X.SCRIPT_PARAMETERS as string[];
export const MOBILE_APP_ID = X.MOBILE_APP_ID as string;

/* ENT-DET-BackupObject (DLG-DET-11; local catalogue in the source too). */
export const BACKUP_SERVERS = ['LPDE4-DC01', 'LPDE4-DC02'];
export const BACKUP_OBJECTS = [
  { path: 'LPDE4\\Neal.Gamby', cls: 'user' },
  { path: 'LPDE4\\Michel.Marsh', cls: 'user' },
  { path: 'LPDE4\\Rand.Warner', cls: 'user' },
  { path: 'LPDE4\\svc-backup', cls: 'user' },
  { path: 'LPDE4\\Domain Admins', cls: 'group' },
  { path: 'LPDE4\\Finance-RW', cls: 'group' },
  { path: 'OU=Finance,DC=lpde4,DC=local', cls: 'organizationalUnit' },
];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

/* ---------------- entity types ---------------- */
export type Product = 'auditor' | 'trust';
export type ActionKind = 'Send Email Alert' | 'Show in LiveFeed' | 'Send Alert to App' | 'Execute Script' | 'Send Alert to SIEM';
export type AlertType = 'Critical' | 'Warning' | 'Normal';
export type FilterRule = { id: string; field: string; operator: string; value: string };
export type ValueFilter = { field: string; include: string; values: { value: string; checked: boolean }[] };
export type Threshold = { enabled: boolean; sameUser: boolean; times: number | ''; within: number | ''; unit: string };
export type ActionSettings = {
  sender?: string; recipients?: string; pastOn?: boolean; pastDays?: string; formats?: string[]; content?: string; toUser?: boolean; userMessage?: string;
  appAccounts?: string[];
  path?: string; runAs?: 'system' | 'account'; scriptAccount?: string; notify?: boolean; notifySummary?: string; paramOn?: boolean; param?: string;
  siem?: string;
};
export type DeliveryAction = { id: string; kind: ActionKind; details: string; sendTo?: string; settings?: ActionSettings };
export type ThreatAlert = {
  id: string; name: string; description: string; agentStatus: string; status: 'Enabled' | 'Disabled';
  reports: string[]; filters: Record<string, FilterRule[]>; valueFilter?: ValueFilter; threshold: Threshold;
  actions: DeliveryAction[]; processRemotely: boolean; agent: string; alertType: AlertType;
};
export type StatusRow = {
  id: string; environment: string; delivered: boolean; from: string; to: string; subject: string; sentOn: string;
  title: string; changes: number; source: string; reportPath: string;
};

/* ---------------- ENT-DET-DetectSessionStore (alerts + status rows; accounts live in src/stores/deliveryAccounts.ts) ---------------- */
export const detectStore = createStore({
  alerts: X.THREAT_ALERTS as unknown as ThreatAlert[],
  statusRows: X.ALERT_STATUS_ROWS as StatusRow[],
});
/** Replace by id when present, else prepend (data-model.md). */
export const saveAlert = (a: ThreatAlert) => detectStore.set((s) => (s.alerts.some((x) => x.id === a.id)
  ? { ...s, alerts: s.alerts.map((x) => (x.id === a.id ? a : x)) }
  : { ...s, alerts: [a, ...s.alerts] }));
export const removeAlert = (id: string) => detectStore.set((s) => ({ ...s, alerts: s.alerts.filter((a) => a.id !== id) }));
export const removeStatusRow = (id: string) => detectStore.set((s) => ({ ...s, statusRows: s.statusRows.filter((r) => r.id !== id) }));

/* ---------------- report catalogue (Auditor + Trust) ---------------- */
type CatNode = { kind?: string; id?: string; name: string; disabled?: boolean; children?: CatNode[] };
export type CatGroup = { id: string; name: string; reports: { name: string; disabled: boolean }[]; groups: CatGroup[] };
const toGroup = (n: CatNode, path: string): CatGroup => {
  const id = path + '/' + (n.id ?? n.name);
  const kids = n.children ?? [];
  return {
    id, name: n.name,
    reports: kids.filter((k) => k.kind === 'report').map((k) => ({ name: k.name, disabled: !!k.disabled })),
    groups: kids.filter((k) => k.kind !== 'report').map((k) => toGroup(k, id)),
  };
};
const AUD = auditorCatalog.exports as unknown as { ALL_ENVIRONMENT_REPORT: CatNode; AUDITOR_FOLDERS: CatNode[] };
const TRU = trustCatalog.exports as unknown as { TRUST_FOLDERS: CatNode[] };
export const PRODUCTS: { id: Product; label: string; folders: CatGroup[] }[] = [
  {
    id: 'auditor', label: 'Lepide Auditor',
    folders: [
      { id: 'auditor/all-environment', name: 'All Environment', reports: [{ name: AUD.ALL_ENVIRONMENT_REPORT.name, disabled: !!AUD.ALL_ENVIRONMENT_REPORT.disabled }], groups: [] },
      ...AUD.AUDITOR_FOLDERS.map((f) => toGroup(f, 'auditor')),
    ],
  },
  // GAP-DET-02 decision: Trust reports are filed under "Lepide Trust" in Add and Edit alike.
  { id: 'trust', label: 'Lepide Trust', folders: TRU.TRUST_FOLDERS.map((f) => toGroup(f, 'trust')) },
];
const allNames = (g: CatGroup): string[] => [...g.reports.map((r) => r.name), ...g.groups.flatMap(allNames)];
const PRODUCT_NAMES: Record<Product, Set<string>> = {
  auditor: new Set(PRODUCTS[0].folders.flatMap(allNames)),
  trust: new Set(PRODUCTS[1].folders.flatMap(allNames)),
};
/** A report's product: the catalogue that lists it (Auditor first), then the seed catalogue, else Auditor. */
export function productOf(report: string): Product {
  if (PRODUCT_NAMES.auditor.has(report)) return 'auditor';
  if (PRODUCT_NAMES.trust.has(report)) return 'trust';
  return WIZARD_SOURCES.find((s) => s.reports.includes(report))?.id ?? 'auditor';
}
export const groupNames = allNames;

/* ---------------- derived display values ---------------- */
const OP_TOKEN: Record<string, string> = { Equal: 'EqualTo', 'Not Equal': 'NotEqualTo', Contains: 'Contains', 'Does Not Contain': 'DoesNotContain' };
export type FilterBlock = { report: string; rules: string[] };
export function filterBlocks(a: Pick<ThreatAlert, 'reports' | 'filters' | 'valueFilter'>): FilterBlock[] {
  const blocks = a.reports.map((report) => ({
    report,
    rules: (a.filters[report] ?? []).map((r) => `${r.field} ${OP_TOKEN[r.operator] ?? r.operator} ${r.value}`),
  }));
  const vf = a.valueFilter;
  // GAP-DET-12 intended: a value filter with no ticked values is omitted like an empty one.
  const ticked = vf ? vf.values.filter((v) => v.checked).map((v) => v.value) : [];
  if (vf && vf.include !== 'All' && ticked.length && blocks.length) {
    blocks[0] = { ...blocks[0], rules: [`${vf.field} ${vf.include}: ${ticked.join(', ')}`, ...blocks[0].rules] };
  }
  return blocks;
}
export const deliveryMechanism = (a: ThreatAlert) => a.actions.map((x) => ACTION_SHORT[x.kind] + ' Alert').join(', ');
export const sendToOf = (a: ThreatAlert) => a.actions.map((x) => x.sendTo).filter(Boolean).join(', ');

/** Builds the Delivery Settings "Details" string and the "Send To" value for one action (screens.md § DLG-DET-09). */
export function describeAction(kind: ActionKind, s: ActionSettings): { details: string; sendTo?: string } {
  switch (kind) {
    case 'Send Email Alert': {
      const emails = splitEmails(s.recipients ?? '');
      let details = `Sender's Email : ${s.sender ?? ''} ; Recipient's Email : ${emails.join(', ')}`;
      if (s.pastOn) details += ` ; Past ${s.pastDays} day(s) as ${(s.formats ?? []).join(', ')}`;
      return { details, sendTo: emails.join(', ') };
    }
    case 'Show in LiveFeed': return { details: 'Generate LiveFeed Alert' };
    case 'Send Alert to App': return { details: `App account : ${(s.appAccounts ?? []).join(', ')}` };
    case 'Execute Script': {
      let details = `Script : ${s.path ?? ''} ; Run as : ${s.runAs === 'account' ? s.scriptAccount : 'SYSTEM'}`;
      if (s.notify) details += ` ; Notify : ${s.notifySummary}`;
      if (s.paramOn && s.param) details += ` ; Input : ${s.param}`;
      return { details };
    }
    case 'Send Alert to SIEM': return { details: `SIEM account : ${s.siem ?? ''}` };
  }
}
export const splitEmails = (t: string) => t.split(',').map((x) => x.trim()).filter(Boolean);

/** Alerts whose actions use a delivery account (GAP-DET-07 intended: refuse deleting such an account). */
export function alertsUsingAccount(alerts: ThreatAlert[], name: string, type: 'Email' | 'App' | 'SIEM') {
  return alerts.filter((a) => a.actions.some((x) => {
    const s = x.settings ?? {};
    if (type === 'Email') return (x.kind === 'Send Email Alert' && s.sender === name) || (x.kind === 'Execute Script' && !!s.notify && (s.notifySummary ?? '').startsWith(name + ' →'));
    if (type === 'App') return x.kind === 'Send Alert to App' && (s.appAccounts ?? []).includes(name);
    return x.kind === 'Send Alert to SIEM' && s.siem === name;
  }));
}

/** Rename an account inside every alert action that uses it and rebuild the details strings. */
export function renameAccountInAlerts(oldName: string, newName: string, type: 'Email' | 'App' | 'SIEM') {
  if (oldName === newName) return;
  detectStore.set((st) => ({
    ...st,
    alerts: st.alerts.map((a) => ({
      ...a,
      actions: a.actions.map((x) => {
        const s = { ...(x.settings ?? {}) };
        let hit = false;
        if (type === 'Email' && x.kind === 'Send Email Alert' && s.sender === oldName) { s.sender = newName; hit = true; }
        if (type === 'Email' && x.kind === 'Execute Script' && (s.notifySummary ?? '').startsWith(oldName + ' →')) { s.notifySummary = newName + s.notifySummary!.slice(oldName.length); hit = true; }
        if (type === 'App' && x.kind === 'Send Alert to App' && (s.appAccounts ?? []).includes(oldName)) { s.appAccounts = s.appAccounts!.map((n) => (n === oldName ? newName : n)); hit = true; }
        if (type === 'SIEM' && x.kind === 'Send Alert to SIEM' && s.siem === oldName) { s.siem = newName; hit = true; }
        return hit ? { ...x, settings: s, ...describeAction(x.kind, s) } : x;
      }),
    })),
  }));
}

/* ---------------- Alert Status helpers ---------------- */
/** "DD-MM-YYYY hh:mm:ss AM/PM" → epoch ms (GAP-DET-14 intended: chronological sort). */
export function sentOnTime(s: string) {
  const m = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2}) (AM|PM)$/.exec(s);
  if (!m) return 0;
  let h = Number(m[4]) % 12; if (m[7] === 'PM') h += 12;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), h, Number(m[5]), Number(m[6])).getTime();
}
/** Product-style timestamp "DD-MM-YYYY hh:mm:ss AM/PM". */
export function stamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  const h = d.getHours() % 12 || 12;
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(h)}:${p(d.getMinutes())}:${p(d.getSeconds())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}
export const emlName = (sentOn: string) => 'alert-' + sentOn.replace(/[^0-9]+/g, '-').replace(/-$/, '') + '.eml';
