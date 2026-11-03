import comp from '../../../data/settings/components.json';
import assets from '../../../data/components/settings/components/assets.json';
import { createStore, uid } from '../../../stores/createStore';

/* MOD-SDS Part 2 — ENT-SDS-Connection. Module-level store (GAP-SDS-01 intended: session scope, so
   the panel keeps its connections while the user visits the File Server console). */

export type Family = 'm365' | 'exchange' | 'sharepoint' | 'dropbox' | 's3' | 'gsuite';
export type Kind = 'onedrive' | 'azure' | 'teams' | 'copilot' | 'exchange' | 'sharepoint' | 'dropbox' | 's3' | 'gsuite';
export type M365App = 'onedrive' | 'azure' | 'teams' | 'copilot';
export type ScopeMode = 'all' | 'selected' | 'excluding';
export type AuditScope = { mode: ScopeMode; items: string[] };
export type DatabaseSettings = {
  server: string; auth: 'windows' | 'sql'; user: string; password: string; mode: 'create' | 'select'; name: string;
  chatRetention: boolean; retentionDays: string;
};
export type Connection = {
  id: string; family: Family; name: string; apps: M365App[]; fields: Record<string, string>;
  objects: AuditScope; operations: AuditScope; database: DatabaseSettings; connectedOn: string;
};
export type CredentialField = { key: string; label: string; secret?: boolean; note?: string; info?: boolean; placeholder?: string };
export type ListRow = { name: string; desc: string };

const X = comp.exports;
export const M365_APPS = X.M365_APPS as M365App[];
export const CLOUD_FAMILIES = X.CLOUD_FAMILIES as Family[];
export const CATALOG = X.CATALOG as Kind[];
export const KIND_LABEL = X.KIND_LABEL as Record<Kind, string>;
export const FAMILY_LABEL = X.FAMILY_LABEL as Record<Family, string>;
export const AUDIT_MODES = X.AUDIT_MODES as { value: ScopeMode; label: string }[];
export const CLOUD_FIELDS = X.CLOUD_FIELDS as Record<string, CredentialField[]>;
export const TENANT_FIELDS = X.TENANT_FIELDS as CredentialField[];
export const COPILOT_EMAIL_FIELD = X.COPILOT_EMAIL_FIELD as CredentialField;
export const SUBSCRIPTION_TYPES = X.SUBSCRIPTION_TYPES as string[];
export const DATABASES = X.DATABASES as string[];
export const HELP_STEPS = X.HELP_STEPS as Record<string, string[]>;
export const FIELD_TIPS = X.FIELD_TIPS as Record<string, string>;
export const MAILBOXES = X.MAILBOXES as ListRow[];
export const EXCHANGE_OPERATIONS = X.EXCHANGE_OPERATIONS as ListRow[];
export const SHAREPOINT_OBJECTS = X.SHAREPOINT_OBJECTS as ListRow[];
export const SHAREPOINT_OPERATIONS = X.SHAREPOINT_OPERATIONS as ListRow[];

export const KIND_LOGO = assets.exports.KIND_LOGO as Record<Kind, string>;
export const FAMILY_LOGO = assets.exports.FAMILY_LOGO as Record<Family, string>;

export const isCloud = (f: Family) => CLOUD_FAMILIES.includes(f);
export const familyOf = (k: Kind): Family => ((M365_APPS as string[]).includes(k) ? 'm365' : (k as Family));

/** A kind is covered when a connection of its family exists (and, for an M365 app, that tenant audits the app). */
export function coveringConnections(list: Connection[], k: Kind) {
  const f = familyOf(k);
  return list.filter((c) => c.family === f && (f !== 'm365' || c.apps.includes(k as M365App)));
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** Where the wizard was started from (cancel/save return there). */
export type WizardReq = { mode: 'add' | 'edit'; family: Family; kind?: Kind; editId?: string; returnTo?: string | null };

type McState = { connections: Connection[]; wizard: WizardReq | null };
export const mcStore = createStore<McState>({ connections: clone(X.SEED_CONNECTIONS) as unknown as Connection[], wizard: null });

export const newConnId = () => uid('mc');

const p2 = (n: number) => String(n).padStart(2, '0');
/** "DD-MM-YYYY HH:mm:ss" */
export const connectedStamp = (d = new Date()) =>
  `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
