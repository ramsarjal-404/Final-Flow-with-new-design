import { defineReportModule } from '../../../reports';
import { PreviewCell } from './PreviewCell';
import { CLASSIFIED_FILES, identifyViews } from './views';

/* ENT-IDN-IdentifyCatalog: Identify's ReportModule. The base config (title "Identify - Reports", tileName
   "Lepide Identify", openAllReports, no pinned report, dedicated {}) and the catalogue (10 folders,
   8 reports) come from the Report Library seed; Identify plugs in its generated views and the Preview cell. */

export const CLASSIFIED_FILES_ROW_ID = 'idf-3';

export const IDENTIFY_MODULE = defineReportModule('identify', {
  loadViews: () => Promise.resolve(identifyViews()),
  // Preview cell only for classified-files / "Preview"; undefined keeps the default formatting.
  renderCell: ({ slug, column, value, cells, columns }) =>
    slug === CLASSIFIED_FILES && column === 'Preview' ? <PreviewCell value={value} cells={cells} columns={columns} /> : undefined,
});
