import { useMemo } from 'react';
import { createStore } from '../stores/createStore';
import { MODULE_KEYS, REPORT_MODULE_BASES, seedSlices, type ModuleSlice } from './seed';
import type {
  CatalogFolder, CatalogNode, CatalogReportNode, CustomReportConfig, ModuleKey, MyLepideRow, ReportDraft, ReportRow, SharedMember,
} from './types';

/* ENT-RLIB-ReportStore: `{ auditor, trust, identify }`, each `{ folders, rows }`. Module-level store:
   survives navigation between modules, resets to the seed on reload (GAP-RLIB-09 stays open). */

export const reportsStore = createStore<Record<ModuleKey, ModuleSlice>>(seedSlices());

/* ---------------- helpers ---------------- */

const p2 = (n: number) => String(n).padStart(2, '0');
/** Today as DD-MM-YYYY (the format the data model fixes for report dates). */
export const todayDMY = (d = new Date()) => `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}`;

/** Display title: `name` for custom rows or rows without a component, else `name (component)`. */
export const displayTitle = (r: Pick<ReportRow, 'name' | 'component' | 'type'>) =>
  r.type === 'Custom' || !r.component ? r.name : `${r.name} (${r.component})`;

/** Report nodes of a node list, groups flattened, in tree order. */
export function flattenReports(nodes: CatalogNode[]): CatalogReportNode[] {
  return nodes.flatMap((n) => (n.kind === 'group' ? flattenReports(n.children) : [n]));
}
export const countReports = (nodes: CatalogNode[]) => flattenReports(nodes).length;

const removeNode = (nodes: CatalogNode[], id: string): CatalogNode[] =>
  nodes.filter((n) => n.kind === 'group' || n.id !== id).map((n) => (n.kind === 'group' ? { ...n, children: removeNode(n.children, id) } : n));

const setSlice = (key: ModuleKey, fn: (s: ModuleSlice) => ModuleSlice) => reportsStore.set((all) => ({ ...all, [key]: fn(all[key]) }));
const patchRow = (key: ModuleKey, rowId: string, fn: (r: ReportRow) => ReportRow) =>
  setSlice(key, (s) => ({ ...s, rows: s.rows.map((r) => (r.id === rowId ? fn(r) : r)) }));

let seq = 0;
const customId = () => `custom-${Date.now()}${seq++ ? '-' + seq : ''}`;

/** Names a new custom folder may not take (GAP-RLIB-03 intended: also "All Reports" and the pinned report). */
export function folderNameTaken(key: ModuleKey, name: string) {
  const n = name.trim().toLowerCase();
  const pinned = REPORT_MODULE_BASES[key].pinned?.name.toLowerCase();
  return n === 'all reports' || n === pinned || reportsStore.get()[key].folders.some((f) => f.name.toLowerCase() === n);
}

/* ---------------- actions (ENT-RLIB-ReportStore members) ---------------- */

export const reportActions = {
  createFolder(key: ModuleKey, name: string): CatalogFolder {
    const f: CatalogFolder = { id: customId(), name, component: name, children: [], custom: true };
    setSlice(key, (s) => ({ ...s, folders: [...s.folders, f] }));
    return f;
  },
  /** Removes the folder and every row whose folderId matches. */
  removeFolder(key: ModuleKey, folderId: string) {
    setSlice(key, (s) => ({ folders: s.folders.filter((f) => f.id !== folderId), rows: s.rows.filter((r) => r.folderId !== folderId) }));
  },
  /** On → myLepideOn = today; off → cleared. */
  toggleMyLepide(key: ModuleKey, rowId: string) {
    patchRow(key, rowId, (r) => (r.myLepide ? { ...r, myLepide: false, myLepideOn: undefined } : { ...r, myLepide: true, myLepideOn: todayDMY() }));
  },
  /** Builder Save: Custom row first in rows, report node last in the folder. */
  addCustomReport(key: ModuleKey, draft: ReportDraft, addedBy: string, config?: CustomReportConfig): ReportRow {
    const s = reportsStore.get()[key];
    const baseRow = s.rows.find((r) => r.slug === draft.predefinedReportId && r.type === 'Predefined');
    const row: ReportRow = {
      id: customId(), name: draft.name,
      // GAP-RLIB-15 intended: the base report's component (falls back to the folder's).
      component: baseRow?.component || s.folders.find((f) => f.id === draft.folderId)?.component || '',
      componentView: baseRow?.componentView ?? '', folderId: draft.folderId, description: draft.description,
      slug: draft.predefinedReportId, myLepide: false, type: 'Custom', sharedWith: [], sharedBy: '',
      addedBy, addedOn: todayDMY(), disabled: false, config,
    };
    const node: CatalogReportNode = { kind: 'report', id: row.id, name: row.name, slug: row.slug, description: row.description, disabled: false };
    setSlice(key, (x) => ({
      rows: [row, ...x.rows],
      folders: x.folders.map((f) => (f.id === draft.folderId ? { ...f, children: [...f.children, node] } : f)),
    }));
    return row;
  },
  /** Removes the row and any tree node with that id. */
  removeReport(key: ModuleKey, rowId: string) {
    setSlice(key, (s) => ({ rows: s.rows.filter((r) => r.id !== rowId), folders: s.folders.map((f) => ({ ...f, children: removeNode(f.children, rowId) })) }));
  },
  /** DLG-RLIB-09: add members to `sharedWith`; `sharedBy` = the sharer. */
  share(key: ModuleKey, rowId: string, members: SharedMember[], sharer: string) {
    patchRow(key, rowId, (r) => {
      const cur = r.sharedMembers ?? r.sharedWith.map((n) => ({ id: n, name: n, type: 'User' as const, domain: '' }));
      const merged = [...cur, ...members.filter((m) => !cur.some((c) => c.id === m.id))];
      return { ...r, sharedMembers: merged, sharedWith: merged.map((m) => m.name), sharedBy: sharer };
    });
  },
  /** DLG-RLIB-10: remove members from `sharedWith`. */
  unshare(key: ModuleKey, rowId: string, memberIds: string[]) {
    patchRow(key, rowId, (r) => {
      const cur = r.sharedMembers ?? r.sharedWith.map((n) => ({ id: n, name: n, type: 'User' as const, domain: '' }));
      const left = cur.filter((m) => !memberIds.includes(m.id));
      return { ...r, sharedMembers: left, sharedWith: left.map((m) => m.name), sharedBy: left.length ? r.sharedBy : '' };
    });
  },
  /** DLG-RLIB-11: move a custom report to another folder (row folderId + tree node). */
  moveReport(key: ModuleKey, rowId: string, folderId: string) {
    setSlice(key, (s) => {
      const row = s.rows.find((r) => r.id === rowId);
      if (!row || row.folderId === folderId) return s;
      const node: CatalogReportNode = { kind: 'report', id: row.id, name: row.name, slug: row.slug, description: row.description, disabled: row.disabled };
      return {
        rows: s.rows.map((r) => (r.id === rowId ? { ...r, folderId } : r)),
        folders: s.folders.map((f) => {
          const children = removeNode(f.children, rowId);
          return f.id === folderId ? { ...f, children: [...children, node] } : { ...f, children };
        }),
      };
    });
  },
};

/* ---------------- hooks ---------------- */

/** One module's live `{ folders, rows }`. */
export const useReportSlice = (key: ModuleKey) => reportsStore.use((s) => s[key]);

/** Name of a row's folder: folder name, else the row's component, else "Reports". */
export function folderNameFor(key: ModuleKey, row: ReportRow, slices = reportsStore.get()) {
  return slices[key].folders.find((f) => f.id === row.folderId)?.name || row.component || 'Reports';
}

/** My Lepide projection (ENT-RLIB-MyLepideRow): every module's rows with `myLepide && !disabled`. */
export function useMyLepide(): { rows: MyLepideRow[]; remove: (moduleKey: ModuleKey, rowId: string) => void } {
  const all = reportsStore.use();
  const rows = useMemo(() => MODULE_KEYS.flatMap((k) => all[k].rows.filter((r) => r.myLepide && !r.disabled).map((row): MyLepideRow => ({
    row, module: REPORT_MODULE_BASES[k],
    folder: { id: `${k}:${row.folderId}`, name: folderNameFor(k, row, all) },
    addedOn: row.myLepideOn ?? (row.addedOn || todayDMY()),
  }))), [all]);
  return { rows, remove: removeFromMyLepide };
}

/** Switch a row's My Lepide flag off (the hub toggle reflects it at once). */
export function removeFromMyLepide(moduleKey: ModuleKey, rowId: string) {
  patchRow(moduleKey, rowId, (r) => ({ ...r, myLepide: false, myLepideOn: undefined }));
}
