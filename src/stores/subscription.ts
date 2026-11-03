import seed from '../data/settings/subscription.json';
import { createStore, uid } from './createStore';

/* "Subscription module variables" (settings-administration/data-model.md § Stores): subscriptions,
   delivery records, archive jobs, restored databases, the seed-export clock and deleted seed
   exports, plus the Backup & Restore last-used section. Module-level: survive navigation, reset on
   reload. Seeds and option lists come from src/data/settings/subscription.json. */

export const SUB = seed.exports;

/* ---------- subscriptions ---------- */
export type FilterRule = { id: string; field: string; operator: string; value: string };
export type DeliveryAction = { id: string; kind: 'email' | 'disk'; from: string; to: string; formats: string[]; path: string; notify?: string };
export type ScheduleType = 'Daily' | 'Weekly' | 'Monthly';
export type SubSchedule = { id: string; type: ScheduleType; selection: string; time: string; duration: string; startOn: string };
export type Subscription = {
  id: string; name: string; description: string; enabled: boolean; reports: string[];
  filters: Record<string, FilterRule[]>; actions: DeliveryAction[]; schedules: SubSchedule[];
};
export type DeliveryRecord = {
  id: string; folder: string; outcome: 'Delivered' | 'Failed'; subscription: string; report: string; from: string; to: string;
  subject: string; sentOn: string; scheduleType: string; duration: string; scheduleTime: string;
};

/* ---------- backup, restore, archives ---------- */
export type ArchiveStatus = 'Running' | 'Scheduled' | 'Completed';
export type ArchiveJob = {
  id: string; componentType: string; componentName: string; server: string; path: string; schedule: string; status: ArchiveStatus;
  deleteOlderDays: string; olderThanDays: string; deleteRecords: boolean; shrink: boolean;
};
export type RestoredDatabase = { id: string; name: string; sqlServer: string; component: string };
export type RestoreBackup = { date: string; time: string; /** set for a GPO backup extracted in this session (GAP-SAD-06 intended) */ extracted?: string };
export type BackupSection = 'import' | 'export' | 'ad-restore' | 'archives';

/** Component Type derived from the archive component (seed: AD/GP/Exchange component → "Exchange Server"). */
export const componentTypeOf = (component: string) =>
  component === 'Active Directory, Group Policy And Exchange Server' ? 'Exchange Server' : component;

/** GAP-SAD-12 intended: one capitalisation for seeded and generated schedule text. */
const normSchedule = (s: string) => s.replace(/^Archive data on every /, 'Archive Data On Every ');

type State = {
  subscriptions: Subscription[];
  deliveries: DeliveryRecord[];
  archives: ArchiveJob[];
  restoredDbs: RestoredDatabase[];
  /** Backup & Restore section remembered for the session (default Import Database). */
  section: BackupSection;
  /** Seed export clock: ms timestamp of the first Exported Files visit. */
  seedClockStart: number | null;
  deletedSeeds: string[];
  /** GPO backups extracted with the Group Policy Backup Extractor (offered in Backup List in GP mode). */
  extractedGpBackups: RestoreBackup[];
};

export const subStore = createStore<State>({
  subscriptions: SUB.SEED_SUBSCRIPTIONS as Subscription[],
  deliveries: SUB.SEED_DELIVERIES as DeliveryRecord[],
  archives: (SUB.SEED_ARCHIVES as ArchiveJob[]).map((a) => ({ ...a, schedule: normSchedule(a.schedule) })),
  restoredDbs: SUB.SEED_RESTORED_DBS as RestoredDatabase[],
  section: 'import',
  seedClockStart: null,
  deletedSeeds: [],
  extractedGpBackups: [],
});

const upd = (fn: (s: State) => Partial<State>) => subStore.set((s) => ({ ...s, ...fn(s) }));

/* subscriptions */
export const saveSubscription = (sub: Subscription) =>
  upd((s) => ({ subscriptions: s.subscriptions.some((x) => x.id === sub.id) ? s.subscriptions.map((x) => (x.id === sub.id ? sub : x)) : [sub, ...s.subscriptions] }));
export const setSubscriptionEnabled = (id: string, enabled: boolean) =>
  upd((s) => ({ subscriptions: s.subscriptions.map((x) => (x.id === id ? { ...x, enabled } : x)) }));
export const deleteSubscription = (id: string) => upd((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== id) }));
export const deleteDelivery = (id: string) => upd((s) => ({ deliveries: s.deliveries.filter((x) => x.id !== id) }));

/* archives */
export const saveArchive = (a: ArchiveJob) =>
  upd((s) => ({ archives: s.archives.some((x) => x.id === a.id) ? s.archives.map((x) => (x.id === a.id ? a : x)) : [...s.archives, a] }));
export const setArchiveStatus = (id: string, status: ArchiveStatus) =>
  upd((s) => ({ archives: s.archives.map((x) => (x.id === id ? { ...x, status } : x)) }));
export const deleteArchive = (id: string) => upd((s) => ({ archives: s.archives.filter((x) => x.id !== id) }));
export const addRestoredDb = (d: Omit<RestoredDatabase, 'id'>) => upd((s) => ({ restoredDbs: [...s.restoredDbs, { ...d, id: uid('rdb') }] }));
export const deleteRestoredDbs = (ids: string[]) => upd((s) => ({ restoredDbs: s.restoredDbs.filter((x) => !ids.includes(x.id)) }));

/* backup & restore shell */
export const setBackupSection = (section: BackupSection) => upd(() => ({ section }));
export const addExtractedGpBackup = (b: RestoreBackup) =>
  upd((s) => ({ extractedGpBackups: s.extractedGpBackups.some((x) => x.extracted === b.extracted) ? s.extractedGpBackups : [...s.extractedGpBackups, b] }));

/* exported-files seeds */
export const startSeedClock = () => { if (subStore.get().seedClockStart === null) upd(() => ({ seedClockStart: Date.now() })); };
export const deleteSeedExport = (id: string) => upd((s) => ({ deletedSeeds: [...s.deletedSeeds, id] }));

export const newId = uid;
