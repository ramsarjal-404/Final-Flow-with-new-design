import ds from '../../../data/settings/datasource.json';
import { createStore, uid } from '../../../stores/createStore';
import { defaultConfig } from './adData';
import type { AdConfig } from './adData';

/* MOD-SDS Part 1 (data-model.md): AdDomain, FileServer, AuditRule, AuditPolicy, UserGroup, Backup,
   FsGeneralSettings. Module-level store = session scope (GAP-SDS-18 intended: survive navigation;
   resets on reload). */

export type ServerType = 'windows' | 'netapp7' | 'netappCluster' | 'emc' | 'nasuni' | 'nutanix';
export type AgentStatus = 'Installed' | 'Not Installed' | 'File Server Unavailable or Access Denied' | 'Installed via foreign Server';
export type AuditStatus = 'Auditing Started' | 'Auditing Stopped';

export type DataSourceTile = { id: string; label: string; logo: string; activeDirectory?: boolean; fileServerType?: 'list' | ServerType };
export type AdDomain = { id: string; domain: string; controller: string; logon: string; config: AdConfig };
export type FileServer = {
  id: string; name: string; type: ServerType; domain: string; agentStatus: AgentStatus; auditStatus: AuditStatus; lastUpdate: string;
  communication: 'agent' | 'winrm'; logonUser: string; logonPassword?: string; sharePath: string; sqlServer: string; database: string;
  authMode: string; timeGap: number; patternMode: boolean; dataInsertion: string; domainController?: string;
};
export type DomainObject = { name: string; objectClass: string; dn: string };
export type AuditTarget = { name: string; type: 'User' | 'Group' };
export type RuleUsers = 'All users' | 'Specific users' | 'Excluded users';
export type AuditRule = { id: string; name: string; servers: string[]; policy: string; enabled: boolean; users: RuleUsers; targets: AuditTarget[]; priority: number };
export type PolicyObject = { id: string; kind: string; value: string; include: boolean };
export type AuditPolicy = { id: string; name: string; description: string; objects: PolicyObject[] };
export type GroupUser = { id: string; name: string; domain: string; type: 'domain user' | 'domain group' | 'local user'; policy: string; description: string };
export type UserGroup = { id: string; name: string; description: string; policy: string; users: GroupUser[] };
export type Backup = { id: string; name: string; path: string; created: string };
export type FsGeneral = { port: string; serviceAccount: 'service' | 'user'; serviceUser: string; notify: boolean; notifyEmail: string };
export type WinRmStep = { id: string; title: string; body: string[] };

const X = ds.exports;
export const DATA_SOURCES = X.DATA_SOURCES as DataSourceTile[];
export const SERVER_TYPE_LABEL = X.SERVER_TYPE_LABEL as Record<ServerType, string>;
export const ADD_TITLE = X.ADD_TITLE as Record<ServerType, string>;
export const SINGLE_TYPES = X.SINGLE_TYPES as { type: ServerType; label: string }[];
export const MULTIPLE_TYPES = X.MULTIPLE_TYPES as { type: ServerType; label: string }[];
export const DOMAIN_COMPUTERS = X.DOMAIN_COMPUTERS as DomainObject[];
export const DOMAIN_USERS = X.DOMAIN_USERS as DomainObject[];
export const DOMAIN_OUS: DomainObject[] = [
  { name: 'Servers', objectClass: 'organizationalUnit', dn: 'OU=Servers,DC=chily,DC=local' },
  { name: 'Finance', objectClass: 'organizationalUnit', dn: 'OU=Finance,DC=chily,DC=local' },
  { name: 'RJ45', objectClass: 'organizationalUnit', dn: 'OU=RJ45,DC=chily,DC=local' },
];
export const DOMAINS = X.DOMAINS as string[];
export const POLICY_OBJECT_KINDS = X.POLICY_OBJECT_KINDS as string[];
export const POLICY_OBJECT_VALUES = X.POLICY_OBJECT_VALUES as Record<string, string[]>;
export const WINRM_STEPS = X.WINRM_STEPS as WinRmStep[];

/** The signed-in Windows account shown in "Current user (…)" choices. */
export const CURRENT_USER = 'CHILY\\DEVL150';

type DsState = {
  adDomains: AdDomain[]; servers: FileServer[]; rules: AuditRule[]; policies: AuditPolicy[];
  groups: UserGroup[]; backups: Backup[]; general: FsGeneral;
};

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const seedConfig = (domain: string): AdConfig => {
  const c = defaultConfig(domain);
  return { ...c, added: 'Nov 03 2026, 09:12 AM', servers: c.servers.map((s) => ({ ...s, agent: 'Installed', health: s.group === 'ad' })), components: [...c.components, 'health'] };
};

export const dsStore = createStore<DsState>({
  adDomains: (clone(X.AD_DOMAINS) as Omit<AdDomain, 'config'>[]).map((d) => ({ ...d, config: seedConfig(d.domain) })),
  servers: (clone(X.FILE_SERVERS) as FileServer[]).map((s) => ({ ...s, domainController: s.domainController ?? undefined })),
  rules: clone(X.AUDIT_RULES) as AuditRule[],
  policies: clone(X.AUDIT_POLICIES) as AuditPolicy[],
  groups: clone(X.USER_GROUPS) as UserGroup[],
  backups: clone(X.BACKUPS) as Backup[],
  general: { port: '3000', serviceAccount: 'user', serviceUser: 'john007', notify: false, notifyEmail: 'john007@domain.com' },
});

export const newId = (p: string) => uid(p);

/* ---------- mutations ---------- */
export const ds$ = {
  patchServers(ids: string[], patch: (s: FileServer) => Partial<FileServer>) {
    dsStore.set((st) => ({ ...st, servers: st.servers.map((s) => (ids.includes(s.id) ? { ...s, ...patch(s) } : s)) }));
  },
  addServers(list: FileServer[]) { dsStore.set((st) => ({ ...st, servers: [...st.servers, ...list] })); },
  removeServers(ids: string[]) { dsStore.set((st) => ({ ...st, servers: st.servers.filter((s) => !ids.includes(s.id)) })); },
  saveRule(r: AuditRule) {
    dsStore.set((st) => ({ ...st, rules: st.rules.some((x) => x.id === r.id) ? st.rules.map((x) => (x.id === r.id ? r : x)) : [...st.rules, r] }));
  },
  savePolicy(p: AuditPolicy) {
    dsStore.set((st) => ({ ...st, policies: st.policies.some((x) => x.id === p.id) ? st.policies.map((x) => (x.id === p.id ? p : x)) : [...st.policies, p] }));
  },
  saveGroup(g: UserGroup) {
    dsStore.set((st) => ({ ...st, groups: st.groups.some((x) => x.id === g.id) ? st.groups.map((x) => (x.id === g.id ? g : x)) : [...st.groups, g] }));
  },
};

/* ---------- rules for agent actions ---------- */
export type AgentAction = 'install' | 'uninstall' | 'start' | 'stop' | 'update' | 'upgrade';
export const ACTION_LABEL: Record<AgentAction, string> = {
  install: 'Install agent', uninstall: 'Uninstall agent', start: 'Start Auditing', stop: 'Stop Auditing', update: 'Update Agent', upgrade: 'Upgrade Agent',
};
export const isInstalled = (s: FileServer) => s.agentStatus === 'Installed' || s.agentStatus === 'Installed via foreign Server';
export function canRun(a: AgentAction, s: FileServer) {
  switch (a) {
    case 'install': return !isInstalled(s);
    case 'uninstall': case 'update': case 'upgrade': return isInstalled(s);
    case 'start': return isInstalled(s) && s.auditStatus === 'Auditing Stopped';
    case 'stop': return isInstalled(s) && s.auditStatus === 'Auditing Started';
  }
}

/* ---------- timestamps ---------- */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const p2 = (n: number) => String(n).padStart(2, '0');
const h12 = (d: Date) => { const h = d.getHours() % 12; return h === 0 ? 12 : h; };
const ap = (d: Date) => (d.getHours() < 12 ? 'AM' : 'PM');
/** "Mon DD YYYY, hh:mm AM/PM" (FileServer.lastUpdate). */
export const stampNow = (d = new Date()) => `${MON[d.getMonth()]} ${p2(d.getDate())} ${d.getFullYear()}, ${p2(h12(d))}:${p2(d.getMinutes())} ${ap(d)}`;
/** "M/D/YYYY   h:mm:ss AM/PM" (Backup.created). */
export const backupStamp = (d = new Date()) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}   ${h12(d)}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${ap(d)}`;

/** Domain/Workgroup derived from a picked domain: first label capitalised; IPs → "Chily" (BUGS #13). */
export function workgroupFrom(domain: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain.trim())) return 'Chily';
  const first = domain.trim().split('.')[0] ?? '';
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'Chily';
}
