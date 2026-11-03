import deepJson from '../../data/trustDeepReports.json';

/* Trust deep-report seed (src/data/trustDeepReports.json, verbatim from the product; typos are the
   product's — GAP-TRU-21). Typed views of the entities in modules/trust/data-model.md § 4–9. */

export type DeepSlug =
  | 'permissions-by-user' | 'permissions-by-object' | 'excessive-permissions-by-user'
  | 'excessive-permissions-by-object' | 'stale-data-report' | 'anomaly-analysis';

/** ENT-TRU-DeepReportMeta. */
export type DeepReportMeta = { filterLine: string; filterFields: string[]; dateRange: string | null; exportable: boolean };
/** ENT-TRU-TreeNode. */
export type TreeNode = { name: string; count?: string; selectable?: boolean; children?: TreeNode[] };
export type ObjectKind = 'folder' | 'file' | 'text' | 'pdf';
/** 13-character code string: g used, r excessive, d denied, - not applicable. */
export type Perms = string;

export type PbuFolder = { name: string; everyone: boolean; broken: boolean; path: string; owner: string; lastScan: string; lastModified: string; effective: string };
export type PbuFile = { name: string; kind: ObjectKind; everyone: boolean; broken: boolean; notAccessed: boolean; contentType: string; compliance: string; monetary: string; risk: string; effective: string };
export type PobjObject = { name: string; kind: ObjectKind; everyone: boolean; broken: boolean; notAccessed: boolean; type: string; owner: string; contentType: string; compliance: string; monetary: string; risk: string; lastScan: string };
export type AceEntry = { access: 'Allowed' | 'Denied'; permission: string; method: string; drill?: boolean; inheritedFrom: string; appliesTo: string; perms: Perms };
export type AclAccount = { account: string; group?: boolean; effective: string; entries: AceEntry[] };
export type EffectiveRow = { account: string; effective: string; perms: Perms };
export type EpuFolder = { server: string; name: string; everyone: boolean; broken: boolean; path: string; owner: string; lastScan: string; lastModified: string; perms: Perms };
export type EpoObject = { name: string; kind: ObjectKind; everyone: boolean; broken: boolean; owner: string; lastScan: string };
export type EpoFile = { name: string; kind: ObjectKind; everyone: boolean; broken: boolean; notAccessed: boolean; contentType: string; compliance: string; monetary: string; risk: string };
export type StaleFile = { server: string; folder: string; file: string; size: string; accessed: string; lastScan: string; owner: string };
export type StaleFolder = { path: string; staleSize: string; totalSize: string; staleCount: string; totalCount: string; owner: string; lastScan: string };
export type AnomalyUser = { user: string; components: string; total: number };
export type Anomaly = { when: string; details: string };
export type AnomalyDetail = { path: string; operation: string; process: string; source: string; severity: string; when: string };
export type AnomalyChart = { title: string; labels: string[]; series: { name: string; values: number[] }[] };

const D = deepJson.exports as unknown as {
  PERMISSIONS: string[];
  PBU_TREE: TreeNode; OBJECT_TREE: TreeNode; OBJECT_TREE_BROKEN: TreeNode; STALE_TREE: TreeNode; EPU_USER_TREE: TreeNode;
  DEEP_REPORT_META: Record<DeepSlug, DeepReportMeta>;
  FINANCE_PATH: string;
  PBU_FOLDERS: PbuFolder[]; PBU_FILES: PbuFile[];
  POBJ_OBJECTS: PobjObject[]; POBJ_ACCOUNTS: AclAccount[]; POBJ_BY_USER: EffectiveRow[]; POBJ_GROUP_MODAL: AclAccount; POBJ_MEMBERS: EffectiveRow[];
  EPU_FOLDERS: EpuFolder[]; EPO_OBJECTS: EpoObject[]; EPO_FOLDER_PERMISSIONS: EffectiveRow[]; EPO_FILES: EpoFile[];
  STALE_FILES: StaleFile[]; STALE_FOLDERS: StaleFolder[];
  ANOMALY_USERS: AnomalyUser[]; ANOMALIES: Anomaly[]; ANOMALY_DETAIL: AnomalyDetail; ANOMALY_CHART: AnomalyChart;
};

/** ENT-TRU-PermissionRight, in column order. */
export const RIGHTS = D.PERMISSIONS;
export const META = D.DEEP_REPORT_META;
export const FINANCE_PATH = D.FINANCE_PATH;
export const SEED = D;

/** The user every EPU seed row belongs to (data-model § 7, derived field `user`). */
export const EPU_ROW_USER = 'lpde4\\Marty.Byrde';
/** The only user with anomaly seed rows (GAP-TRU-16). */
export const ANOMALY_SEED_USER = 'LPDE4\\justin.Hammer';
