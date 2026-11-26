/* Active Directory data source (Figma "Active Directory config" › Final Flow): the configuration a domain is added
   with, the sample directory each wizard step lists, and helpers. The flow and content follow the Figma file; the
   look is the Lepide Design System (WizardFrame, MiniTable, fields). */

export type AdMode = 'express' | 'advanced';
export type AdComponentId =
  | 'auditAd' | 'auditGp' | 'auditExchange' | 'adBackup' | 'gpBackup' | 'health' | 'mailbox' | 'cleaner' | 'passwordReminder';
export type AdServerGroup = 'ad' | 'gp';
export type AdServer = {
  name: string; group: AdServerGroup; ip: string; change: boolean; health: boolean; mailbox: boolean;
  agent: 'Installed' | 'Not Installed';
};
export type OuScope = 'all' | 'only' | 'except';
export type ClassScope = 'all' | 'only' | 'except';

export type AdConfig = {
  mode: AdMode;
  agent: 'none' | 'default' | 'share'; sharePath: string;
  autoAudit: boolean; gpo: string | null; gpoBackup: boolean;
  components: AdComponentId[]; servers: AdServer[]; preferredDc: string;
  sqlServer: string; sqlAuth: 'windows' | 'sql'; sqlUser: string; database: string; dataPath: string; backupPath: string;
  ouScope: OuScope; ous: string[];
  classScope: ClassScope; adClasses: string[]; exClasses: string[];
  failedLogon: boolean; logonLogoff: boolean;
  added: string;
};

export const AD_COMPONENTS: { id: AdComponentId; label: string; settings?: boolean }[] = [
  { id: 'auditAd', label: 'Audit Active Directory' },
  { id: 'auditGp', label: 'Audit Group Policy' },
  { id: 'auditExchange', label: 'Audit Exchange Server' },
  { id: 'adBackup', label: 'Active Directory Backup', settings: true },
  { id: 'gpBackup', label: 'Group Policy Backup', settings: true },
  { id: 'health', label: 'Health Monitoring' },
  { id: 'mailbox', label: 'Non-Owner Mailbox Auditing', settings: true },
  { id: 'cleaner', label: 'Active Directory Cleaner', settings: true },
  { id: 'passwordReminder', label: 'User Password Expiration Reminder', settings: true },
];
export const DEFAULT_COMPONENTS: AdComponentId[] = ['auditAd', 'auditGp', 'auditExchange'];
export const componentLabel = (id: AdComponentId) => AD_COMPONENTS.find((c) => c.id === id)?.label ?? id;

export const SERVER_GROUP_LABEL: Record<AdServerGroup, string> = { ad: 'Active Directory & Exchange Server', gp: 'Group Policy' };

export const OU_SCOPE: { value: OuScope; label: string }[] = [
  { value: 'all', label: 'All organizational units' },
  { value: 'only', label: 'Only selected organizational unit(s)' },
  { value: 'except', label: 'All except selected organizational unit(s)' },
];
export const CLASS_SCOPE: { value: ClassScope; label: string }[] = [
  { value: 'all', label: 'All object classes' },
  { value: 'only', label: 'Only selected classes' },
  { value: 'except', label: 'All but excluding selected classes' },
];

export const AD_OBJECT_CLASSES = [
  'Account', 'ACS Policy', 'ACS Resource Limit', 'ACS Subnet', 'Address Book Container', 'Address Template', 'Application Entity',
  'Application Process', 'Application Settings', 'Certification Authority', 'Class Store', 'Computer', 'Contact', 'Container',
  'Domain DNS', 'Group', 'Group Policy Container', 'Organizational Unit', 'Print Queue', 'RID Manager', 'Secret', 'Site', 'Subnet', 'User',
];
export const EXCHANGE_OBJECT_CLASSES = [
  'Address List', 'Database Availability Group', 'Dynamic Distribution Group', 'Exchange Organization', 'Exchange Server',
  'Mail-enabled Public Folder', 'Mailbox Database', 'Mobile Mailbox Policy', 'Offline Address Book', 'Receive Connector',
  'Retention Policy', 'Send Connector', 'Transport Rule',
];

export const GPOS = ['Default Domain Controllers Policy', 'Default Domain Policy', 'Standard Domain Guidelines', 'Standard Domain Policy'];

/** The audit settings the software applies when it enables auditing (Configure Auditing dialog). */
export const AUDIT_POLICIES = 'System, Logon/Logoff, Object Access, Privilege Use, Detailed Tracking, Policy Change, Account Management, DS Access, Account Logon';
export const AUDIT_ENTRIES = [
  { target: 'All Active Directory objects', context: 'Domain', principal: 'Everyone', access: 'Write all properties, delete, modify permissions' },
  { target: 'Configuration partition', context: 'Configuration', principal: 'Everyone', access: 'Write all properties, delete' },
  { target: 'Schema partition', context: 'Schema', principal: 'Everyone', access: 'Write all properties' },
];

export const DEFAULT_DATA_PATH = 'C:\\Program Files (x86)\\Lepide Data Security Platform\\';
export const SQL_SERVERS = ['192.168.30.32', 'NDR27\\SQL19', 'LDSP-SQL01\\LEPIDE'];
export const DATABASES = ['Lepide_AD', 'LEPIDE200', 'Richard_Data1'];

/* ---------- sample directory for a domain ---------- */
const up = (d: string) => d.trim().toUpperCase();
const isIp = (d: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(d.trim());
/** The DNS name a domain is shown as (an IP address resolves to the sample domain LDSP2.COM). */
export const dnsOf = (domain: string) => (isIp(domain) ? 'LDSP2.COM' : up(domain));

export function scanServers(domain: string): AdServer[] {
  const dns = dnsOf(domain);
  const ad = ['DC01', 'DC02', 'DC03', 'EXCH01', 'EXCH02'].map((h, i) => ({ name: `${h}.${dns}`, group: 'ad' as const, ip: `192.168.30.${21 + i}` }));
  const gp = ['DC01', 'DC02'].map((h, i) => ({ name: `${h}.${dns}`, group: 'gp' as const, ip: `192.168.30.${21 + i}` }));
  return [...ad, ...gp].map((s) => ({ ...s, change: true, health: false, mailbox: false, agent: 'Not Installed' }));
}

export function ouPaths(domain: string): string[] {
  const dns = dnsOf(domain);
  return [
    'Domain Controllers', 'Finance', 'Finance/Payroll', 'Finance/Accounts Payable', 'Human Resources', 'Human Resources/Recruiting',
    'IT', 'IT/Servers', 'IT/Service Accounts', 'Marketing', 'Sales', 'Sales/EMEA', 'Sales/North America', 'Legal', 'Disabled Users',
  ].map((p) => `${dns}/${p}`);
}

export const isValidIp = (v: string) => isIp(v) && v.trim().split('.').every((n) => Number(n) <= 255);

export function defaultConfig(domain: string, mode: AdMode = 'advanced'): AdConfig {
  const servers = scanServers(domain);
  return {
    mode, agent: 'default', sharePath: '', autoAudit: true, gpo: 'Audit AD', gpoBackup: true,
    components: [...DEFAULT_COMPONENTS], servers, preferredDc: servers[0].name,
    sqlServer: SQL_SERVERS[0], sqlAuth: 'windows', sqlUser: '', database: 'Lepide_AD', dataPath: DEFAULT_DATA_PATH, backupPath: DEFAULT_DATA_PATH,
    ouScope: 'all', ous: [], classScope: 'except', adClasses: ['Secret', 'RID Manager', 'Print Queue'], exClasses: [], failedLogon: true, logonLogoff: false,
    added: '',
  };
}
