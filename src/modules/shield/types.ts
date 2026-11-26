/* AI Shield data shapes, used by every file of the module. Values: see ./data.ts. */

export type Role = 'owner' | 'admin' | 'approver' | 'user';
export type SignInSource = 'local' | 'ad' | 'entra' | 'discovered';
export type Risk = 'low' | 'medium' | 'high' | 'critical';
export type PolicyAction = 'allow' | 'warn' | 'block' | 'block_report';
export type Outcome = 'blocked' | 'paused' | 'warned' | 'review' | 'clean';
export type ActivityKind = 'roles' | 'people' | 'rules' | 'signin' | 'system' | 'other';
export type Unit = 'Engineering' | 'Finance' | 'Legal' | 'Marketing' | 'Contractors';

export type ShieldPerson = {
  id: string;
  name: string;
  email: string;
  role: Role;
  source: SignInSource;
  status: 'active' | 'invited' | 'left';
  unit?: Unit;
  addedAt: string;
  lastActive: string | null;
  you?: boolean;
};

export type Endpoint = {
  id: string;
  name: string;
  user: string | null;
  address: string;
  agent: 'active' | 'stale' | 'none';
  extension: boolean;
  lastActive: string | null;
};

/** One prompt or upload the endpoint agent saw. `person` is an email; `category` a ProtectionPolicy id. */
export type Session = {
  id: string;
  person: string;
  tool: string;
  outcome: Outcome;
  category: string | null;
  keywords: string[];
  preview: string;
  endpoint: string;
  at: string;
  file?: string;
  reviewed?: boolean;
};

/** A protection policy: a category of sensitive data, its keywords, risk, action and the units it applies to. */
export type ProtectionPolicy = {
  id: string;
  short: string;
  title: string;
  blurb: string;
  icon: string;
  risk: Risk;
  action: PolicyAction;
  units: Unit[];
  keywords: string[];
};

export type ActivityEntry = {
  id: string;
  at: string;
  actor: string;
  actorRole: Role | 'system';
  action: string;
  detail: string;
  kind: ActivityKind;
};

export type ShieldState = {
  people: ShieldPerson[];
  activity: ActivityEntry[];
  sessions: Session[];
  endpoints: Endpoint[];
  categories: ProtectionPolicy[];
  policyVersion: number;
  policyPublishedAt: string;
  retentionMonths: number;
  afterRetention: 'archive' | 'delete';
};
