# Report Library (`src/reports`) — MOD-RLIB

One configurable set of report screens shared by **Auditor**, **Trust** and **Identify**, plus the report
stores for all three modules and the **My Lepide** favourites API. Spec:
`product-blueprint/modules/report-library/*`. Look: `ui-design-system/04-screen-patterns.md` § 3–6.

Import everything from `'../../reports'` (the folder's `index.ts`). Auditor (`src/modules/auditor`) is the
worked example.

---

## 1. Mount a report module

```tsx
// src/modules/trust/index.tsx
import { ReportModuleRoutes, defineReportModule, type ReportViewData } from '../../reports';
import PermissionsByUser from './PermissionsByUser';

export const TRUST_MODULE = defineReportModule('trust', {
  loadViews: () => import('../../data/trustReportViews.json')
    .then((m) => (m.default as unknown as { exports: { default: Record<string, ReportViewData> } }).exports.default),
  // optional: renderCell, fixedFilters, description (overrides)
});

export default function Trust() {
  return (
    <ReportModuleRoutes module={TRUST_MODULE}
      dedicated={{ 'reports/permissions-by-user': <PermissionsByUser /> /* …one per dedicated path */ }} />
  );
}
```

`ReportModuleRoutes` owns every route under the base path (the app registers `/<module>/*`):

| Route (relative) | Screen |
|---|---|
| index | SCR-RLIB-01 hub |
| `reports/new` | SCR-RLIB-03 builder (needs `state.draft`, else redirects to the hub) |
| each key of `dedicated` | your page (declared **before** `reports/:slug`) |
| `children` (extra `<Route>`s) | your extra pages, also before `reports/:slug` |
| `reports/:slug` | SCR-RLIB-02 generic view (re-mounted per navigation) |
| `*` | redirect to the hub |

Props: `module` (required), `dedicated?: Record<relativePath, ReactNode>`, `renderCell?` (overrides
`module.renderCell`), `children?` (extra routes).

### `defineReportModule(key, extra)`

Merges the seeded base config for `key` (`'auditor' | 'trust' | 'identify'`) with what your module
plugs in. The base already holds `label`, `tileName`, `title`, `basePath`, `pinned`, `dedicated`,
`openAllReports`, `description` (from `src/data/auditor/modules.json`); folders and rows live in the
store (seeded from the three catalogue files).

| Field you supply | Type | Notes |
|---|---|---|
| `loadViews` (required) | `() => Promise<Record<slug, ReportViewData>>` | Lazy; cached per module. A slug without an entry generates to "No records found." and keeps Modify filters disabled. |
| `renderCell` | `(cell: { slug, column, value, cells, columns, row }) => ReactNode \| undefined` | Custom cell in the generic view and its record drawer (Identify "Preview"). `undefined` keeps the default formatting. |
| `fixedFilters` | `(slug) => FixedFilterCard[] \| undefined` | Fixed select cards in the Modify Filters "Report filter" section, appended to the filter line (DLG-AUD-04). |
| `description`, `dedicated`, … | | Any base field can be overridden. |

`ReportViewData = { columns, filterFields, defaultFilter, dateRange, total, rows: string[][] }`.

### Navigation contracts the library honours

- **Open a report** (`useOpenReport()` → `openReport(moduleOrKey, slug, rowId, name)`): dedicated slug with a
  path → `navigate(path, { state: { rowId } })`; dedicated `null` → info toast "<name> has its own page in
  the product, which isn't part of this prototype yet."; otherwise `<basePath>/reports/<slug>` with
  `{ rowId }`.
- **Generic view entry state**: `{ rowId?, generated? }`. No `rowId` → the Predefined row with that slug
  (links from Lepide AI / Detect / Dashboards). `generated: true` starts in the generated state (Identify).
  A refresh / pasted link (`location.key === 'default'`), an unknown or disabled row, or a dedicated slug
  redirects to the hub.
- **Hub entry state**: `{ folderId }` makes that folder active and open (the folder breadcrumb uses it,
  GAP-RLIB-08 intended). After a builder Save the saved folder is focused automatically.

---

## 2. Dedicated pages

Inside a dedicated route you have the module context and the same building blocks the generic view uses:

```tsx
const entry = useReportEntry('permissions-by-user', { dedicatedPage: true });
if (entry.redirect || !entry.row) return <Navigate to={entry.module.basePath} replace />;
// entry.title (custom row name when opened from a custom report), entry.folder, entry.row
<ReportCrumbs title={entry.title} folder={entry.folder} />   // Home › tileName › Reports › folder › title (31 chars)
```

| Export | Use |
|---|---|
| `useReportModule()` / `useOptionalReportModule()` | `{ module, focusFolderId, setFocusFolderId }` (null outside a module route) |
| `useReportViews(module)` | The module's view data (`null` until loaded) |
| `useReportEntry(slug, { dedicatedPage? })` | Row resolution + redirect test + title/folder |
| `ReportCrumbs` | Report breadcrumb |
| `FilterBar` | D-08 chip bar: `line`, `locked` (parsed default filter), `applied`, `onRemove`, `onAdd`, `onClear`, `dateChip`, `fieldCount` |
| `ModifyFiltersDrawer` | DLG-RLIB-07: `open`, `onClose`, `fields`, `applied`, `onApply(filters)`, `locked`, `dateText`, `fixedCards`/`onFixedChange`, `modal?` (default non-modal right-hand region). Your page shows the toast "Modify Filters" / "n filter(s) applied." / "Filters cleared." |
| `DateRangeMenu` | DLG-RLIB-06 presets + Custom Range calendar; `value: { preset, text }`, `onApply`, `trigger` render prop |
| `ReportTable` + `useTableModel` | Lepide Design System table with sortable headers, column filter row, pager ("Total Records - n" by default), row open + selection, row actions, skeleton loading. `useTableModel({ rows, columns, pageSizes, defaultPageSize, resetKey })` returns `processed` (filtered + sorted, all pages) for exports and drawers; changing `resetKey` returns to page 1. |
| `RecordDrawer` | D-10 record drawer with previous/next and ← → keys (non-modal) |
| `SidePanel` | Non-modal floating drawer (Lepide Design System drawer anatomy, no scrim). Add `rlib--side` (+ `rlib--side-md` / `rlib--side-chat`) to your `.sub` while open so the main region narrows. |
| `formatCell(column, value)`, `cellClass`, `colWidth` | Lepide Design System automatic cell formatting (operations/risk tones, people, times, mono paths) |
| `filterLine`, `splitFilterLine`, `parseFilterPart`, `applyFilters`, `applyFiltersBy`, `matches` | Filter semantics (Contains default; Equals / Not Equals / Not Contains / Starts With / Ends With) |
| `queueReportExport({ reportId, reportName, format, filtersApplied, fileName, build, done, failTitle })` | GAP-RLIB-05 intended: queues an ExportRecord (`queueExport`, visible in Settings › Exported Files) and downloads `build()` when that job completes (also after a Retry), then shows the `done` toast. Show your own "queued" toast. |
| `csvBlob`, `reportPdf`, `reportFileName`, `saveBlob`, `PdfDoc` | File builders (`PdfDoc` = small Helvetica PDF writer for custom layouts) |
| `CreateReportDialog`, `CreateFolderDialog`, `ShareDialog`, `SharedWithDialog`, `MoveReportDialog` | DLG-RLIB-01, 02, 09, 10, 11 |
| `ReportTree` | TreeNavigator (one open folder, groups, search, pinned row, disabled rows) — reusable for My Lepide |

---

## 3. Stores (all three modules) and My Lepide

```ts
import { useReportSlice, reportActions, useMyLepide, useOpenReport, REPORT_MODULE_BASES } from '../../reports';
```

| Export | Behaviour |
|---|---|
| `reportsStore` | `createStore` of `{ auditor, trust, identify }`, each `{ folders, rows }`. Module-level: survives navigation, resets on reload. |
| `useReportSlice(key)` | Live `{ folders, rows }` of one module |
| `reportActions.createFolder(key, name)` | Appends `{ id: custom-…, name, component: name, children: [], custom: true }` |
| `reportActions.removeFolder(key, folderId)` | Removes the folder and its rows |
| `reportActions.toggleMyLepide(key, rowId)` | On → `myLepideOn = today (DD-MM-YYYY)`; off → cleared |
| `reportActions.addCustomReport(key, draft, addedBy, config?)` | Custom row first in rows, node last in the folder; `config = { columns, filters, dateRange }` |
| `reportActions.removeReport(key, rowId)` | Row and tree node removed |
| `reportActions.share / unshare / moveReport` | DLG-RLIB-09 / 10 / 11 |
| **`useMyLepide()`** | `{ rows: MyLepideRow[], remove(moduleKey, rowId) }` — every module's rows with `myLepide && !disabled`, in order Auditor, Trust, Identify. `MyLepideRow = { row, module (base config: key, tileName, basePath, dedicated…), folder: { id: '<key>:<folderId>', name }, addedOn }`. `remove` switches the hub toggle off. |
| `removeFromMyLepide(moduleKey, rowId)` | Same as `remove`, callable outside React |
| `useOpenReport()` | The open-report rule for My Lepide links (see § 1) |
| `REPORT_MODULE_BASES`, `MODULE_KEYS` | Base config of the three modules |
| `displayTitle(row)` | `name` for Custom rows / no component, else `name (component)` |
| `folderNameFor(key, row)`, `flattenReports`, `countReports`, `todayDMY` | Helpers |

Seed normalisation (data files untouched): duplicate tree entries dropped, tree ids aligned with row ids
by slug (GAP-AUD-03), tree reports without a row dropped (GAP-AUD-04), component case aligned with the
folder (GAP-AUD-07).

---

## 4. Behaviour notes (GAP intended fixes built here)

- GAP-RLIB-01: the My Lepide toggle is disabled on disabled rows (tooltip "<name> (not available)").
- GAP-RLIB-03: "All Reports" and the pinned report name are rejected as folder names.
- GAP-RLIB-04 / 10: Share (DLG-RLIB-09), Shared With (DLG-RLIB-10, from the "Shared with" avatar stack) and
  Move (DLG-RLIB-11, custom rows) are built; directory = Settings › Manage Domains' first domain.
- GAP-RLIB-05: exports are background jobs (see `queueReportExport`).
- GAP-RLIB-06: the builder uses the base report's columns, filter fields, default filter and date range;
  Save stores `{ columns, filters, dateRange }` and the view applies them (falls back to the 7-column
  sample when the base slug has no view data).
- GAP-RLIB-07: "Custom Range" opens a calendar. Rows are **not** re-queried by date (the demo dataset is
  fixed); the chosen range feeds the filter bar and the PDF "Duration".
- GAP-RLIB-08: the folder crumb opens the hub with that folder active and open.
- GAP-RLIB-13: each filter card has an operator (default Contains).
- GAP-RLIB-15: custom rows take the base report's component.
