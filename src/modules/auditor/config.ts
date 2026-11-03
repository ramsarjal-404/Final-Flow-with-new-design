import { defineReportModule, type FixedFilterCard, type ReportViewData } from '../../reports';

/* ENT-AUD-AuditorCatalogue: Auditor's ReportModule. Base config (title "Auditor - Report", tileName
   "Lepide Auditor", pinned "All Environment Changes", dedicated Data Accessed by Copilot) and the
   catalogue come from the Report Library seed; Auditor plugs in its view loader and DLG-AUD-04. */

export const COPILOT_REPORT_SLUG = 'copilot-sensitive-data-accessed-by-copilot';
export const COPILOT_REPORT_PATH = '/auditor/reports/data-accessed-by-copilot';
export const USAGE_COMPARISON_SLUG = 'copilot-copilot-usage-comparison';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** DLG-AUD-04 [Secondary source]: the three fixed cards of Copilot Usage Comparison. */
const usageCards = (): FixedFilterCard[] => [
  { field: 'Reporting Period', options: ['Year', 'Month', 'Week'], value: 'Year' },
  { field: 'Time Period', options: ['Current Year', 'Previous Year', 'Year Before Last'], value: 'Current Year' },
  { field: 'Pick Month/Date/Day', options: MONTHS, value: 'January' },
];

export const AUDITOR_MODULE = defineReportModule('auditor', {
  // ENT-AUD-AuditorReportView: 49 slugs, loaded lazily (930 KB).
  loadViews: () => import('../../data/auditorReportViews.json')
    .then((m) => (m.default as unknown as { exports: { default: Record<string, ReportViewData> } }).exports.default),
  fixedFilters: (slug) => (slug === USAGE_COMPARISON_SLUG ? usageCards() : undefined),
});
