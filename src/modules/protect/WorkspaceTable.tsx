/* Workspace table shared by the drill-down panel (DLG-PRO-04) and the AD Cleaner workspace (SCR-PRO-16). */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, Icon, SearchField, ToneTag, type StatusTone } from '../../ui';
import { CAP, VIEWS, type ViewKey } from './data';
import { CHIP_LABEL, chipValue, viewRows, type AccountRow, type ActivityRow, type GroupRow, type Params, type RunRow, type ScheduleRow } from './workspace';

const TONE: Record<string, StatusTone> = {
  'Password reset': 'info', Disabled: 'warn', 'Moved to OU': 'warn', 'Deletion review': 'bad',
  'In scope': 'good', Protected: 'none', Excluded: 'none', Queued: 'info', Scheduled: 'good', Blocked: 'bad', 'Review required': 'warn',
  Detected: 'info', Remediated: 'good', Failed: 'bad', Matched: 'info', Completed: 'good',
  'Not yet reported': 'none', Reported: 'info', Quarantined: 'warn', 'Eligible for deletion': 'bad', 'Not empty': 'none',
  Administrator: 'info', Suppressed: 'none',
};
const tag = (v: string) => <ToneTag tone={TONE[v] ?? 'none'}>{v}</ToneTag>;

type Cell = (r: never) => ReactNode;
function cellsFor(tab: ViewKey, openReport: () => void): Cell[] {
  switch (tab) {
    case 'accounts': return [
      (r: AccountRow) => <b className="protect-strong">{r.name}</b>, (r: AccountRow) => r.type, (r: AccountRow) => r.ou, (r: AccountRow) => r.last,
      (r: AccountRow) => `${r.days} days`, (r: AccountRow) => tag(r.stage), (r: AccountRow) => r.next, (r: AccountRow) => tag(r.status),
    ] as Cell[];
    case 'schedule': return [
      (r: ScheduleRow) => r.date, (r: ScheduleRow) => <b className="protect-strong">{r.account}</b>, (r: ScheduleRow) => r.action === 'Delete' ? <span className="protect-danger-text">Delete</span> : r.action,
      (r: ScheduleRow) => r.ou, (r: ScheduleRow) => r.policy, (r: ScheduleRow) => tag(r.notify), (r: ScheduleRow) => tag(r.state),
    ] as Cell[];
    case 'activity': return [
      (r: ActivityRow) => r.date, (r: ActivityRow) => tag(r.event), (r: ActivityRow) => <b className="protect-strong">{r.account}</b>, (r: ActivityRow) => r.ou,
      (r: ActivityRow) => r.policy, (r: ActivityRow) => tag(r.result), (r: ActivityRow) => r.detail,
    ] as Cell[];
    case 'runs': return [
      (r: RunRow) => r.date, (r: RunRow) => <b className="protect-strong">{r.policy}</b>, (r: RunRow) => r.duration, (r: RunRow) => r.matched, (r: RunRow) => r.succeeded,
      (r: RunRow) => r.failed, (r: RunRow) => tag(r.status),
      (r: RunRow) => r.report === 'report' ? <button type="button" className="lf-link protect-linkbtn" onClick={openReport}>View report</button> : <span className="lf-na">Not available</span>,
    ] as Cell[];
    default: return [
      (r: GroupRow) => <b className="protect-strong">{r.name}</b>, (r: GroupRow) => r.type, (r: GroupRow) => r.scope,
      (r: GroupRow) => <span>{r.ou}{r.ou !== r.home && <span className="lf-muted"> from {r.home}</span>}</span>,
      (r: GroupRow) => (r.days === null ? '—' : `${r.days} days`), (r: GroupRow) => tag(r.stage), (r: GroupRow) => r.next, (r: GroupRow) => tag(r.status),
    ] as Cell[];
  }
}
const text = (r: Record<string, unknown>) => Object.values(r).map((v) => String(v ?? '')).join(' ').toLowerCase();

export function WorkspaceTable({ tab, params, onClear, keep }: { tab: ViewKey; params: Params; onClear: () => void; keep: string[] }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const view = VIEWS[tab];
  const { rows, total } = useMemo(() => viewRows(tab, params), [tab, params]);
  const shown = useMemo(() => (q.trim() ? rows.filter((r) => text(r as unknown as Record<string, unknown>).includes(q.trim().toLowerCase())) : rows), [rows, q]);
  const visible = shown.slice(0, CAP);
  const count = q.trim() ? shown.length : total;
  const countText = visible.length < count ? `Showing ${visible.length} of ${count.toLocaleString()}` : `${count.toLocaleString()} ${count === 1 ? 'result' : 'results'}`;
  const chips = Object.entries(params).filter(([k, v]) => v && k !== 'sort' && k !== 'domain' && k !== 'tab' && CHIP_LABEL[k]);
  const clearable = Object.keys(params).some((k) => params[k] && !keep.includes(k) && k !== 'tab');
  const cells = cellsFor(tab, () => nav('/protect/ad-cleaner/report?type=report'));
  const note = tab === 'accounts' && (params.stage === 'Deletion review' || params.bucket === '180d+' || params.never === '1');
  return (
    <div className="stack protect-ws">
      {chips.length > 0 && (
        <div className="row row--wrap protect-ws__chips" aria-label="Active filters">
          {chips.map(([k, v]) => <span key={k} className="fchip fchip--lock"><Icon name="filter" /><span><i>{CHIP_LABEL[k]}:</i> <b>{chipValue(k, v)}</b></span></span>)}
          {clearable && <button type="button" className="lf-link protect-linkbtn" onClick={() => { setQ(''); onClear(); }}>Clear filters</button>}
        </div>
      )}
      {note && <div className="banner banner--warning" role="status"><Icon name="shield" /><div className="grow">Protected and excluded accounts remain blocked. Permanent deletion only applies after the policy is activated and its threshold is reached.</div></div>}
      <section className="lf-card tablecard tablecard--static protect-ws__card">
        <div className="toolbar">
          <h3 className="lf-card__title" style={{ margin: 0 }}>{view.label}<small className="count-chip" aria-live="polite">{countText}</small></h3>
          <div className="row row--wrap"><SearchField value={q} onChange={setQ} placeholder={view.search} ariaLabel={view.search} style={{ width: 260 }} /></div>
        </div>
        <div className="tbl-wrap" style={{ maxHeight: 520 }}>
          <table className="lf-table">
            <thead><tr>{view.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody className="rows-in">
              {visible.length === 0 ? (
                <tr><td colSpan={view.columns.length} style={{ padding: 0, maxWidth: 'none', whiteSpace: 'normal', position: 'static' }}>
                  <EmptyState compact icon="search" title="No results match the current filters." /></td></tr>
              ) : visible.map((r, i) => (
                <tr key={i} className="lf-row" style={{ cursor: 'default' }}>{cells.map((c, j) => <td key={j}>{(c as (x: unknown) => ReactNode)(r)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
