import { defineReportModule, type ReportViewData } from '../../reports';
import { renderTrustCell } from './investigate';

/* ENT-TRU-TrustModuleConfig: base config (label "Trust", tileName "Lepide Trust", title "Trust - Report",
   basePath /trust, no pinned report, the six dedicated slugs, no folder open on arrival) and the
   catalogue (9 folders, 63 rows) come from the Report Library seed. Trust plugs in its lazy view loader
   and the cells that open the Trust investigation dialogs (DLG-RLIB-13 / DLG-RLIB-15). */

export const TRUST_MODULE = defineReportModule('trust', {
  // ENT-RLIB-ReportViewData for 19 slugs (13 with rows; the six dedicated slugs are empty and never shown).
  loadViews: () => import('../../data/trustReportViews.json')
    .then((m) => (m.default as unknown as { exports: { default: Record<string, ReportViewData> } }).exports.default),
  renderCell: renderTrustCell,
});
