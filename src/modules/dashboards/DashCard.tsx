import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Chart, EmptyState, IconButton, PageLoader, type ChartKind, type IconName } from '../../ui';
import type { GraphState, WidgetTool } from './store';

/* Shared region · Dashboard card (screens.md, end). Lepide Design System: `.lf-card.panel` with a title row, a caption line
   (stamp, subtitle), the chart, and a "View report" link at the foot. */

const TOOL: Record<WidgetTool, { icon: IconName; label: string }> = {
  list: { icon: 'list', label: 'View as list' },
  filter: { icon: 'filter', label: 'Filter' },
  calendar: { icon: 'calendar', label: 'Select date range' },
};

type D = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const n = (v: unknown) => (typeof v === 'number' ? v.toLocaleString() : String(v ?? ''));

/** The data behind a card as a table (list tool; intended behaviour in FLW-DSH-07 step 4). */
function tableOf(kind: ChartKind, d: D): { head: string[]; rows: string[][] } {
  if (d.segments) return { head: ['Label', 'Value'], rows: d.segments.map((s: D) => [s.label, n(s.value)]) };
  if (d.rings) return { head: ['Label', 'Value'], rows: d.rings.map((r: D) => [r.label, `${r.value} / ${r.max ?? 100}`]) };
  if (kind === 'speedometer') return { head: ['Label', 'Value'], rows: [[d.name || 'Risk score', n(d.value)]] };
  if (d.series && (d.cats || d.labels || d.rows)) {
    const cats: string[] = d.cats || d.labels || d.rows;
    return { head: ['Label', ...d.series.map((s: D) => s.name)], rows: cats.map((c, i) => [c, ...d.series.map((s: D) => n(s.values[i]))]) };
  }
  if (d.values && d.labels) return { head: ['Label', d.name || 'Value'], rows: d.labels.map((l: string, i: number) => [l, n(d.values[i])]) };
  if (d.bars) {
    const label = (i: number) => { const k = (d.markers || []).indexOf(i); return k > -1 ? d.labels[k] : `Point ${i + 1}`; };
    return { head: ['Label', d.barName || 'Count', d.lineName || 'Trend'], rows: d.bars.map((b: number, i: number) => [label(i), n(b), n(d.line[i])]) };
  }
  if (d.points) return { head: ['Label', 'X', 'Y', 'Size'], rows: d.points.map((p: D) => [p.label, n(p.x), n(p.y), n(p.size)]) };
  return { head: [], rows: [] };
}

export function DashCard({ title, subtitle, titleEdit, tools = ['calendar'], stamp, editing, state = 'ready', span = 1, kind, data, nonce = 0,
  onTool, onRename, onEdit, onDelete, reportTo }: {
  title: string; subtitle?: string; titleEdit?: boolean; tools?: WidgetTool[]; stamp?: string; editing?: boolean; state?: GraphState;
  span?: 1 | 2 | 3; kind: ChartKind; data: D; nonce?: number;
  onTool?: (t: WidgetTool) => void; onRename?: () => void; onEdit?: () => void; onDelete?: () => void; reportTo?: string;
}) {
  const [asList, setAsList] = useState(false);
  const cls = 'lf-card lf-card--lift panel dashboards-card' + (span === 2 ? ' panel--wide' : span === 3 ? ' dashboards-card--full' : '') + (editing ? ' dashboards-card--edit' : '');
  const height = span > 1 ? 300 : 270;

  if (state === 'loading') {
    return (
      <section className={cls} aria-busy="true" aria-label={title ? `${title}, loading` : 'Loading graph'}>
        <div className="dashboards-card__body"><PageLoader text="Loading graph" /></div>
      </section>
    );
  }
  const ready = state === 'ready';
  const table = asList ? tableOf(kind, data) : null;
  return (
    <section className={cls} aria-label={title}>
      <header className="dashboards-card__head">
        <div className="dashboards-card__title">
          <h3>{title}</h3>
          {titleEdit && ready && <IconButton icon="edit" size={14} label={`Rename ${title}`} onClick={onRename} />}
        </div>
        <div className="dashboards-card__tools">
          {editing ? (
            <>
              <IconButton icon="edit" size={15} label={`Edit ${title}`} onClick={onEdit} />
              <IconButton icon="trash" size={15} label={`Delete ${title}`} danger onClick={onDelete} />
            </>
          ) : ready && tools.map((t) => (
            <IconButton key={t} icon={TOOL[t].icon} size={15} label={TOOL[t].label}
              aria-pressed={t === 'list' ? asList : undefined}
              onClick={() => { if (t === 'list') setAsList((v) => !v); onTool?.(t); }} />
          ))}
        </div>
      </header>
      {ready && (stamp || subtitle) && (
        <p className="dashboards-card__cap">
          {stamp && <span>Last Updated on {stamp}</span>}
          {subtitle && <span className="dashboards-card__sub">{subtitle}</span>}
        </p>
      )}
      <div className="dashboards-card__body">
        {state === 'nodata' ? <EmptyState compact icon="file-search" title="No data generated yet" />
          : state === 'notconfigured' ? <EmptyState compact icon="settings" title="Component is not configured." />
          : table ? (
            <div className="tbl-wrap dashboards-card__table" style={{ maxHeight: height }}>
              <table className="lf-table lf-table--auto">
                <thead><tr>{table.head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ) : <Chart key={nonce} kind={kind} data={data} height={height} title={`${title} chart`} />}
      </div>
      {ready && reportTo && (
        <footer className="dashboards-card__foot"><Link className="lf-link" to={reportTo}>View report</Link></footer>
      )}
    </section>
  );
}
