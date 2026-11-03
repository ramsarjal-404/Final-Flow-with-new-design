import modulesJson from '../data/auditor/modules.json';
import auditorCatalog from '../data/auditorCatalog.json';
import trustCatalog from '../data/trustCatalog.json';
import identifyCatalog from '../data/identifyCatalog.json';
import type { CatalogFolder, CatalogNode, CatalogReportNode, ModuleKey, ReportModuleBase, ReportRow } from './types';

/* Seed for the three report modules (ENT-RLIB-ReportModule base config + catalogue).
   Config scalars come from src/data/auditor/modules.json; folders and rows from the three catalogue
   files. Seed normalisation applies these GAP intended fixes at import (the data files stay verbatim):
   - GAP-RLIB-12 / GAP-AUD-03: one tree entry per report id; tree ids aligned with row ids by slug.
   - GAP-AUD-04: tree report nodes with no table row (Nutanix "TTHT") are dropped.
   - GAP-AUD-07: row components that differ from their folder's only by case use the folder's spelling. */

type ModuleJson = {
  key: ModuleKey; label: string; tileName: string; title: string; basePath: string;
  pinned?: CatalogReportNode; dedicated: Record<string, string | null>; openAllReports?: boolean;
};
const M = modulesJson.exports as unknown as Record<'AUDITOR_MODULE' | 'TRUST_MODULE' | 'IDENTIFY_MODULE', ModuleJson>;

/** Hub description lines (Lepide Design System copy from the reference HTML, allowed by D-20 for Auditor and Trust). */
const HUB_DESCRIPTIONS: Partial<Record<ModuleKey, string>> = {
  auditor: 'Change and activity reports across every data source your account audits. Pick a folder, open a report, or build your own from a predefined one.',
  trust: 'Permission and privileged-access reports across the data sources your account can see. Pick a folder, then open a report or pin it to My Lepide.',
};

const base = (m: ModuleJson): ReportModuleBase => ({
  key: m.key, label: m.label, tileName: m.tileName, title: m.title, basePath: m.basePath,
  pinned: m.pinned, dedicated: m.dedicated ?? {}, openAllReports: !!m.openAllReports, description: HUB_DESCRIPTIONS[m.key],
});

/** Base config of every report module, in My Lepide order (Auditor, Trust, Identify). */
export const REPORT_MODULE_BASES: Record<ModuleKey, ReportModuleBase> = {
  auditor: base(M.AUDITOR_MODULE),
  trust: base(M.TRUST_MODULE),
  identify: base(M.IDENTIFY_MODULE),
};
export const MODULE_KEYS: ModuleKey[] = ['auditor', 'trust', 'identify'];

function normalise(foldersIn: CatalogFolder[], rowsIn: ReportRow[]) {
  const rows = rowsIn.map((r) => ({ ...r, sharedWith: [...r.sharedWith] }));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const folders = foldersIn.map((f) => {
    const inFolder = rows.filter((r) => r.folderId === f.id);
    const seen = new Set<string>();
    const fix = (nodes: CatalogNode[]): CatalogNode[] => nodes.flatMap((n): CatalogNode[] => {
      if (n.kind === 'group') return [{ ...n, children: fix(n.children) }];
      let id = n.id;
      if (!byId.has(id)) { const twin = inFolder.find((r) => r.slug === n.slug); if (!twin) return []; id = twin.id; }
      if (seen.has(id)) return [];
      seen.add(id);
      return [{ ...n, id }];
    });
    return { ...f, children: fix(f.children) };
  });
  for (const r of rows) {
    const f = folders.find((x) => x.id === r.folderId);
    if (f && r.component !== f.component && r.component.toLowerCase() === f.component.toLowerCase()) r.component = f.component;
  }
  return { folders, rows };
}

export type ModuleSlice = { folders: CatalogFolder[]; rows: ReportRow[] };

export function seedSlices(): Record<ModuleKey, ModuleSlice> {
  const a = auditorCatalog.exports as unknown as { AUDITOR_FOLDERS: CatalogFolder[]; AUDITOR_ROWS: ReportRow[] };
  const t = trustCatalog.exports as unknown as { TRUST_FOLDERS: CatalogFolder[]; TRUST_ROWS: ReportRow[] };
  const i = identifyCatalog.exports as unknown as { IDENTIFY_FOLDERS: CatalogFolder[]; IDENTIFY_ROWS: ReportRow[] };
  return {
    auditor: normalise(a.AUDITOR_FOLDERS, a.AUDITOR_ROWS),
    trust: normalise(t.TRUST_FOLDERS, t.TRUST_ROWS),
    identify: normalise(i.IDENTIFY_FOLDERS, i.IDENTIFY_ROWS),
  };
}
