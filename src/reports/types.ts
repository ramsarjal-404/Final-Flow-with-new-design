import type { ReactNode } from 'react';

/* Report Library entities (modules/report-library/data-model.md). */

export type ModuleKey = 'auditor' | 'trust' | 'identify';

/** ENT-RLIB-CatalogNode (report). */
export type CatalogReportNode = { kind: 'report'; id: string; name: string; slug: string; description: string; disabled: boolean };
/** ENT-RLIB-CatalogNode (group, nests to any depth). */
export type CatalogGroupNode = { kind: 'group'; id: string; name: string; children: CatalogNode[] };
export type CatalogNode = CatalogReportNode | CatalogGroupNode;

/** ENT-RLIB-CatalogFolder. */
export type CatalogFolder = { id: string; name: string; component: string; children: CatalogNode[]; custom?: boolean };

/** Filter operators (GAP-RLIB-13 intended: operator per card; default Contains). */
export type FilterOp = 'Equals' | 'Not Equals' | 'Contains' | 'Not Contains' | 'Starts With' | 'Ends With';
export const FILTER_OPS: FilterOp[] = ['Equals', 'Not Equals', 'Contains', 'Not Contains', 'Starts With', 'Ends With'];

/** ENT-RLIB-AppliedFilter (`op` defaults to Contains). */
export type AppliedFilter = { field: string; value: string; op?: FilterOp };

/** Saved builder configuration of a custom report (GAP-RLIB-06 intended). */
export type CustomReportConfig = { columns: string[]; filters: AppliedFilter[]; dateRange: string | null };

/** A member a report is shared with (DLG-RLIB-09 / 10). */
export type SharedMember = { id: string; name: string; type: 'User' | 'Group'; domain: string };

/** ENT-RLIB-ReportRow. */
export type ReportRow = {
  id: string;
  name: string;
  component: string;
  componentView: string;
  folderId: string;
  description: string;
  slug: string;
  myLepide: boolean;
  type: 'Predefined' | 'Custom';
  /** Display names (column "Shared with"). */
  sharedWith: string[];
  /** Full member records behind `sharedWith` (session shares only). */
  sharedMembers?: SharedMember[];
  sharedBy: string;
  addedBy: string;
  addedOn: string;
  disabled: boolean;
  /** DD-MM-YYYY, set when the My Lepide toggle is switched on. */
  myLepideOn?: string;
  /** Custom rows: the builder's columns, filters and date range. */
  config?: CustomReportConfig;
};

/** ENT-RLIB-ReportViewData. */
export type ReportViewData = {
  columns: string[];
  filterFields: string[];
  defaultFilter: string;
  dateRange: string | null;
  total: number;
  rows: string[][];
};

/** ENT-RLIB-ReportDraft (router state from DLG-RLIB-01 to SCR-RLIB-03). */
export type ReportDraft = { name: string; folderId: string; predefinedReportId: string; description: string };

/** Arguments of `module.renderCell`. Return `undefined` to keep the default cell. */
export type RenderCellArgs = { slug: string; column: string; value: string; cells: string[]; columns: string[]; row: ReportRow };

/** A fixed, select-valued filter card shown in the Modify Filters "Report filter" section (DLG-AUD-04 style). */
export type FixedFilterCard = { field: string; options: string[]; value: string };

/** The static part of ENT-RLIB-ReportModule (seed config; known for all three modules). */
export type ReportModuleBase = {
  key: ModuleKey;
  label: string;
  tileName: string;
  title: string;
  basePath: string;
  pinned?: CatalogReportNode;
  dedicated: Record<string, string | null>;
  openAllReports?: boolean;
  /** Optional line under the hub title (D-20: Lepide Design System copy allowed for Auditor and Trust). */
  description?: string;
};

/** ENT-RLIB-ReportModule: base + what the owning module plugs in. */
export type ReportModule = ReportModuleBase & {
  /** Lazy per-slug view data (cached by the library after the first call). */
  loadViews: () => Promise<Record<string, ReportViewData>>;
  /** Custom cell for the generic view (Identify "Preview"). */
  renderCell?: (cell: RenderCellArgs) => ReactNode | undefined;
  /** Fixed filter cards per slug (DLG-AUD-04). Appended to the default filter line. */
  fixedFilters?: (slug: string) => FixedFilterCard[] | undefined;
};

/** ENT-RLIB-MyLepideRow. */
export type MyLepideRow = {
  row: ReportRow;
  module: ReportModuleBase;
  folder: { id: string; name: string };
  addedOn: string;
};
