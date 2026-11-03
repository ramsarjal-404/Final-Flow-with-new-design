import { createStore } from '../../stores/createStore';
import type { ChartKind } from '../../ui';
import predefinedJson from '../../data/dashboards/predefined.json';
import storeJson from '../../data/dashboards/store.json';
import typesJson from '../../data/dashboards/types.json';
import modulesJson from '../../data/auditor/modules.json';

/* MOD-DSH data (modules/dashboards/data-model.md). Store scope: module-level, survives navigation,
   a full reload restores the seed (GAP-DSH-05). */

export type WidgetTool = 'list' | 'filter' | 'calendar';
export type Widget = {
  id: string; title: string; subtitle?: string; kind: ChartKind; span?: 1 | 2 | 3; tools?: WidgetTool[]; titleEdit?: boolean;
  data?: Record<string, unknown>;
};
export type DashboardSection = { title: string; widgets: Widget[] };
export type ChartStyle = 'bar' | 'stacked' | 'line' | 'donut';
export type GraphConfig = { module: string; report: string; style: ChartStyle; title: string; label: string; top: string; column: string; kind?: ChartKind };
export type GraphState = 'loading' | 'nodata' | 'notconfigured' | 'ready';
export type Graph = { id: string; config: GraphConfig; state: GraphState; updated?: string };
export type Dashboard = {
  id: string; name: string; title?: string; description: string; sharedWith: string; sharedBy: string; addedBy: string; addedOn: string;
  predefined: boolean; manage?: boolean; widgets: Widget[]; sections?: DashboardSection[]; graphs?: Graph[];
};
export type ShareKind = 'users' | 'groups';
export type Share = { kind: ShareKind; names: string[] };
export type Principal = { name: string; domain: string };

export const PREDEFINED = predefinedJson.exports.PREDEFINED_DASHBOARDS as unknown as Dashboard[];
export const PRINCIPALS = storeJson.exports.PRINCIPALS as { users: Principal[]; groups: Principal[] };
export const STYLE_KIND = typesJson.exports.STYLE_KIND as Record<ChartStyle, ChartKind>;

/** Seeded custom dashboards (data-model.md § Seed data; blank metadata, GAP-DSH-14). */
const CUSTOM: Dashboard[] = [
  { id: 'custom-a', name: 'Custom Dashboard A', description: '', sharedWith: '', sharedBy: '', addedBy: '', addedOn: '', predefined: false, widgets: [],
    graphs: [{ id: 'ga1', state: 'ready', config: { title: 'Failed Logons', report: 'Failed Logons', module: 'Auditor', style: 'bar', label: 'Server Name', top: '10', column: 'Count', kind: 'pairedBars' } }] },
  { id: 'custom-b', name: 'Custom Dashboard B', description: '', sharedWith: '', sharedBy: '', addedBy: '', addedOn: '', predefined: false, widgets: [],
    graphs: [{ id: 'gb1', state: 'ready', config: { title: 'Top 10 Admins', report: 'Admin Group Changes', module: 'Auditor', style: 'bar', label: 'Server Name', top: '10', column: 'Count' } }] },
];

export const dashStore = createStore<{ dashboards: Dashboard[]; shares: Record<string, Share> }>({
  dashboards: [...PREDEFINED, ...CUSTOM], shares: {},
});

export const useDashboards = () => dashStore.use((s) => s.dashboards);
export const useDashboard = (id: string | undefined) => dashStore.use((s) => s.dashboards.find((d) => d.id === id));

/** Upsert by id (new ids append at the end). */
export function saveDashboard(d: Dashboard) {
  dashStore.set((s) => ({ ...s, dashboards: s.dashboards.some((x) => x.id === d.id) ? s.dashboards.map((x) => (x.id === d.id ? d : x)) : [...s.dashboards, d] }));
}
export function removeDashboard(id: string) {
  dashStore.set((s) => { const shares = { ...s.shares }; delete shares[id]; return { dashboards: s.dashboards.filter((d) => d.id !== id), shares }; });
}
/** Writing a share also derives the row's Shared With / Shared By (blank when nobody). */
export function setShare(id: string, share: Share, by: string) {
  dashStore.set((s) => ({
    shares: { ...s.shares, [id]: share },
    dashboards: s.dashboards.map((d) => (d.id === id ? { ...d, sharedWith: share.names.join(', '), sharedBy: share.names.length ? by : '' } : d)),
  }));
}
export function updateGraphs(id: string, fn: (g: Graph) => Graph) {
  dashStore.set((s) => ({ ...s, dashboards: s.dashboards.map((d) => (d.id === id && d.graphs ? { ...d, graphs: d.graphs.map(fn) } : d)) }));
}

/* ------------------------------------------------------------------ formats */
const p2 = (n: number) => String(n).padStart(2, '0');
/** `DD/MM/YYYY` (date part of dashStamp). */
export const dashDate = (d = new Date()) => `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
/** `DD/MM/YYYY h:mm AM|PM` — 12-hour clock, no leading zero on the hour. */
export function dashStamp(d = new Date()) {
  const h = d.getHours() % 12 || 12;
  return `${dashDate(d)} ${h}:${p2(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}
/** Fixed predefined stamp (GAP-DSH-10). */
export const FIXED_STAMP = '21/08/2022 1:08 PM';

/* ------------------------------------------------------------------ graphs */
export const graphTitle = (c: GraphConfig) => c.title || c.report;
export const isConfigured = (c: GraphConfig) => c.title.trim() !== '' && !!c.label && !!c.top && !!c.column;

const allWidgets = PREDEFINED.flatMap((d) => [...d.widgets, ...(d.sections ?? []).flatMap((s) => s.widgets)]);
/** Drawn chart: the graph's kind with the sample data of the first predefined widget of that kind (GAP-DSH-03). */
export function graphWidget(g: Graph): { kind: ChartKind; data: Record<string, unknown> } {
  const kind = g.config.kind ?? STYLE_KIND[g.config.style] ?? 'columns';
  return { kind, data: allWidgets.find((w) => w.kind === kind)?.data ?? {} };
}

/* ------------------------------------------------------------------ report catalogues */
type Row = { name: string; slug: string; disabled: boolean };
type ReportModule = { key: string; label: string; basePath: string; rows: Row[]; dedicated?: Record<string, string> };
const M = modulesJson.exports as unknown as Record<'AUDITOR_MODULE' | 'TRUST_MODULE' | 'IDENTIFY_MODULE', ReportModule>;
export const REPORT_MODULES: ReportModule[] = [M.AUDITOR_MODULE, M.TRUST_MODULE, M.IDENTIFY_MODULE];
export const MODULE_LABELS = REPORT_MODULES.map((m) => m.label);

/** Report names offered by the wizard: non-disabled rows, de-duplicated by name, catalogue order. */
export function reportNames(label: string): string[] {
  const m = REPORT_MODULES.find((x) => x.label === label) ?? REPORT_MODULES[0];
  return [...new Set(m.rows.filter((r) => !r.disabled).map((r) => r.name))];
}

/**
 * "View report" route: module by label (fallback Auditor), first catalogue row with that exact name →
 * `<basePath>/reports/<slug>`, else the module root. A dedicated-page slug opens its page (GAP-DSH-12 intended).
 */
export function reportPath(c: GraphConfig): string {
  const m = REPORT_MODULES.find((x) => x.label === c.module) ?? REPORT_MODULES[0];
  const row = m.rows.find((r) => r.name === c.report);
  if (!row) return m.basePath;
  return m.dedicated?.[row.slug] ?? `${m.basePath}/reports/${row.slug}`;
}
