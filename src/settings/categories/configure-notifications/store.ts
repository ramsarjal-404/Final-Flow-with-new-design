import notify from '../../../data/settings/notify.json';
import { createStore } from '../../../stores/createStore';

/* ENT-SAD-NotifyComponent / NotifyConfig / SiemProfile / SiemFeed.
   GAP-SAD-02 / GAP-SAD-03 intended: saved configurations and SIEM profiles persist for the
   session (module-level store: survives tab switches and navigation, resets on reload).
   Tab, search and the open panel stay page state. */

export type NotifyComponent = { id: string; name: string; logo: string; options: string[] };
export const NOTIFY_COMPONENTS = notify.exports.NOTIFY_COMPONENTS as NotifyComponent[];
export const NOTIFY_HOURS = notify.exports.NOTIFY_HOURS as string[];

export const SIEM_TOP_REPORT = notify.exports.SIEM_TOP_REPORT as string;
export const SIEM_REPORT_TREE = notify.exports.SIEM_REPORT_TREE as { name: string; reports: string[] }[];
export const SIEM_FILTER_COLUMNS = notify.exports.SIEM_FILTER_COLUMNS as string[];
export const SIEM_INCLUDES = notify.exports.SIEM_INCLUDES as SiemInclude[];
export const SIEM_COMPONENT_CLASSES = notify.exports.SIEM_COMPONENT_CLASSES as string[];

export type NotifyConfig = { options: string[]; every: string; sender: string /* Detect account id */; recipients: string; enabled: boolean };

export type SiemInclude = 'All' | 'Selected Only' | 'All but excluding selected';
export type SiemFilter = { include: SiemInclude; values: string[] };
export type SiemFeed = { reports: string[]; filters: Record<string, SiemFilter>; remote: boolean; agent: string; alertName: string };
export type SiemProfile = {
  id: string; name: string; ip: string; port: number; cef: boolean; enabled: boolean; lastSent: string;
  feed: SiemFeed | null; accountId: string;
};

export const notifyStore = createStore<{ configs: Record<string, NotifyConfig>; siem: SiemProfile[] }>({ configs: {}, siem: [] });

export const reportPath = (group: string, report: string) => `${group} › ${report}`;

/** The query text shown on the Confirmation step, the success dialog and the details dialog. */
export function siemQuery(reports: string[], filters: Record<string, SiemFilter>) {
  const lines = ['<START>'];
  for (const r of reports) {
    lines.push(`ReportPath : ${r}`, 'Threshold Count : N/A', 'Threshold Time : N/A');
  }
  for (const c of SIEM_FILTER_COLUMNS) {
    const f = filters[c] ?? { include: 'All', values: [] };
    lines.push(c, `Filter Selection : ${f.include}`);
    if (f.include !== 'All') for (const v of f.values) lines.push(`Filter : ${v}`);
  }
  lines.push('<END>');
  return lines.join('\n');
}
