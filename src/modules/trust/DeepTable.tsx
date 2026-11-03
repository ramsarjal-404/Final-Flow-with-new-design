import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, EmptyState, Icon, SkeletonRows } from '../../ui';
import { ReportPager, useTableModel, type RCol } from '../../reports';

/* Deep-report DataTable (SCR-TRU-03 § 5). Headers and the per-column search row are always rendered;
   the pager under it reads "Total Records - N" with sizes 5, 10, 20, 50, 100 (default 50). Search and sort
   run on the full list before paging; the page returns to 1 when rows, status, filters or sort change.
   Rows are used only while the report is `ready`. Built here (not the library ReportTable) because the
   deep frame needs icon headers, status rows with nodes and highlighted rows. */

export type Status = 'idle' | 'loading' | 'ready';
export type DCol<T> = RCol<T> & { headNode?: ReactNode; narrow?: boolean };

export const NO_MATCH = 'No results match your search or filters.';
export const IDLE_PRIMARY = 'Please click on the "Generate report" button to view the records for this report.';
export const IDLE_OTHER = 'Generate the report to view these records.';
export const PAGE_SIZES = [5, 10, 20, 50, 100];

/** Table state for a deep table; pass `rows` unfiltered by status (the hook empties them unless ready). */
export function useDeepModel<T>(rows: T[], columns: DCol<T>[], status: Status, gen: number) {
  const list = status === 'ready' ? rows : [];
  return useTableModel({ rows: list, columns, pageSizes: PAGE_SIZES, defaultPageSize: 50, resetKey: `${gen}|${status}|${list.length}` });
}
export type DeepModel<T> = ReturnType<typeof useDeepModel<T>>;

export function DeepTable<T>({
  model, columns, rowKey, title, titleId, aside, status, primary, emptyText, onGenerate, onRowOpen, selectedKey, rowLabel,
  fill, flat, noFilterRow, className,
}: {
  model: DeepModel<T>; columns: DCol<T>[]; rowKey: (r: T) => string;
  title?: ReactNode; titleId?: string; aside?: ReactNode; status: Status;
  /** The page's primary table carries the NoDataState and the loader. */
  primary?: boolean;
  /** Ready but no rows: the page's own empty message (default: the no-match copy). */
  emptyText?: string;
  onGenerate?: () => void;
  onRowOpen?: (r: T) => void; selectedKey?: string | null; rowLabel?: (r: T) => string;
  fill?: boolean; flat?: boolean; noFilterRow?: boolean; className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState<number | undefined>(undefined);
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth)); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pin: React.CSSProperties = { position: 'sticky', left: 0, width: wrapW };
  const hasFilterRow = !noFilterRow && columns.some((c) => c.filterable);
  const ready = status === 'ready';
  const total = ready ? model.processed.length : 0;
  const sortBy = (k: string) => { model.toggleSort(k); model.setPage(1); };

  let message: ReactNode = null;
  if (status === 'idle') {
    message = primary
      ? <EmptyState compact icon="refresh" title={IDLE_PRIMARY}
          action={onGenerate && <Button variant="primary" icon="refresh" onClick={onGenerate}>Generate report</Button>} />
      : IDLE_OTHER;
  } else if (status === 'loading' && !primary) message = 'Loading…';
  else if (ready && model.slice.length === 0) message = model.processed.length === 0 && !model.anyFilter && emptyText ? emptyText : NO_MATCH;

  return (
    <section className={'lf-card tablecard tru-table' + (fill ? '' : ' tablecard--static') + (flat ? ' tablecard--flat' : '') + (className ? ' ' + className : '')}
      aria-labelledby={titleId}>
      {(title || aside) && (
        <div className="toolbar">
          <h3 className="lf-card__title" id={titleId} style={{ margin: 0 }}>
            <span className="tru-title">{title}</span>
            {status === 'loading' && primary
              ? <small className="tru-loading" role="status" aria-label="Generating report"><span className="lf-spin" aria-hidden="true" />Generating report…</small>
              : ready && <small className="count-chip">{total.toLocaleString()} record{total === 1 ? '' : 's'}</small>}
          </h3>
          {aside}
        </div>
      )}
      <div ref={wrapRef} className="tbl-wrap" onScroll={(e) => e.currentTarget.classList.toggle('is-scrolled', e.currentTarget.scrollLeft > 0)}>
        <table className="lf-table">
          <thead>
            <tr>
              {columns.map((c) => {
                const dir = model.sort?.key === c.key ? model.sort.dir : undefined;
                return (
                  <th key={c.key} className={c.narrow ? 'tru-th-narrow' : undefined} style={{ width: c.width, minWidth: c.minWidth ?? c.width }}
                    aria-sort={dir ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.sortable ? (
                      <button type="button" className="th-sort" data-dir={dir} onClick={() => sortBy(c.key)}>
                        {c.headNode ?? c.header}<Icon name={dir === 'asc' ? 'up' : dir === 'desc' ? 'down' : 'sort'} size={12} />
                      </button>
                    ) : (c.headNode ?? c.header)}
                  </th>
                );
              })}
            </tr>
            {hasFilterRow && (
              <tr className="filter-row">
                {columns.map((c) => (
                  <th key={c.key}>
                    {c.filterable && (
                      <span className={'filter-input' + (model.filters[c.key] ? ' has-value' : '')}>
                        <Icon name="search" size={12} />
                        <input value={model.filters[c.key] ?? ''} placeholder="Filter" aria-label={`Filter ${c.header}`} maxLength={200}
                          onChange={(e) => model.setFilter(c.key, e.target.value)} />
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          {status === 'loading' && primary ? <SkeletonRows rows={5} cols={columns.length} /> : (
            <tbody className="rows-in">
              {message !== null ? (
                <tr><td colSpan={columns.length} className="empty-cell tru-msg" style={{ maxWidth: 'none', position: 'static', padding: 0, height: 'auto' }}>
                  <div style={{ ...pin, minHeight: status === 'idle' && primary ? 0 : 120, display: 'grid', placeItems: 'center', padding: status === 'idle' && primary ? 0 : '0 16px' }}>{message}</div>
                </td></tr>
              ) : model.slice.map((r) => {
                const k = rowKey(r);
                const sel = selectedKey === k;
                return (
                  <tr key={k} className={onRowOpen ? 'lf-row' + (sel ? ' is-sel' : '') : undefined} tabIndex={onRowOpen ? 0 : undefined}
                    aria-selected={onRowOpen ? sel : undefined} aria-label={onRowOpen && rowLabel ? rowLabel(r) : undefined}
                    onClick={(e) => { if (!onRowOpen) return; if ((e.target as Element).closest('button,a,input,label,select')) return; onRowOpen(r); }}
                    onKeyDown={(e) => { if (onRowOpen && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onRowOpen(r); } }}>
                    {columns.map((c) => {
                      const v = c.value(r);
                      const content = c.render ? c.render(r) : (v === '' || v === null || v === undefined ? <span className="lf-na">—</span> : String(v));
                      return <td key={c.key} className={c.cls} title={!c.narrow && (typeof v === 'string' || typeof v === 'number') ? String(v) : undefined}>{content}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>
      <ReportPager total={total} label={(n) => `Total Records - ${n.toLocaleString()}`} page={ready ? model.page : 1} pages={ready ? model.pages : 1}
        size={model.size} sizes={model.pageSizes} onPage={model.setPage} onSize={model.setSize} />
    </section>
  );
}
