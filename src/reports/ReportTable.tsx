import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon, Menu, SkeletonRows } from '../ui';

/* Report table (Lepide Design System 03 § 9) with the state lifted into `useTableModel` so report screens can read the
   filtered + sorted list (exports, record drawer) and reset the page when their own filters change.
   Built here because the kit DataTable owns its state and fixes the pager label. */

export type RCol<T> = {
  key: string;
  header: string;
  /** Plain value for sort, filter and the default cell. */
  value: (row: T) => string | number | boolean | null | undefined;
  render?: (row: T) => ReactNode;
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  /** Extra td class (lf-mono, lf-num, …). */
  cls?: string;
};

type Sort = { key: string; dir: 'asc' | 'desc' } | null;

const toCmp = (v: unknown) => (typeof v === 'boolean' ? (v ? 1 : 0) : v ?? '');
export const compareValues = (a: unknown, b: unknown) => {
  const x = toCmp(a), y = toCmp(b);
  if (typeof x === 'number' && typeof y === 'number') return x - y;
  return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' });
};

/** Filter (column contains) → sort → page, all on the full set (FLW-SHARED-10). */
export function useTableModel<T>({ rows, columns, pageSizes, defaultPageSize, resetKey }: {
  rows: T[]; columns: RCol<T>[]; pageSizes: number[]; defaultPageSize: number; resetKey?: unknown;
}) {
  const [sort, setSort] = useState<Sort>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(defaultPageSize);

  const processed = useMemo(() => {
    let out = rows;
    for (const [k, f] of Object.entries(filters)) {
      const c = columns.find((x) => x.key === k); const t = f.trim().toLowerCase();
      if (c && t) out = out.filter((r) => String(c.value(r) ?? '').toLowerCase().includes(t));
    }
    if (sort) {
      const c = columns.find((x) => x.key === sort.key);
      if (c) out = [...out].sort((a, b) => compareValues(c.value(a), c.value(b)) * (sort.dir === 'asc' ? 1 : -1));
    }
    return out;
  }, [rows, columns, filters, sort]);

  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } setPage(1); }, [filters, size, resetKey]);

  const pages = Math.max(1, Math.ceil(processed.length / size));
  const cur = Math.min(page, pages);
  return {
    processed, pages, page: cur, size, sort, filters, pageSizes,
    slice: processed.slice((cur - 1) * size, cur * size),
    offset: (cur - 1) * size,
    setPage, setSize,
    toggleSort: (key: string) => setSort((s) => (s?.key === key && s.dir === 'asc' ? { key, dir: 'desc' } : { key, dir: 'asc' })),
    setFilter: (key: string, v: string) => setFilters((f) => ({ ...f, [key]: v })),
    clearFilters: () => setFilters({}),
    anyFilter: Object.values(filters).some((v) => v.trim()),
  };
}
export type TableModel<T> = ReturnType<typeof useTableModel<T>>;

export function ReportTable<T>({
  model, columns, rowKey, title, count, toolbarStart, toolbarEnd, onRowOpen, selectedKey, rowActions, isRowDisabled,
  loading, empty, noResults = 'No results match your search or filters.', totalLabel, noPager, note, rowTitle, className, openArrow, actionsHeader,
}: {
  model: TableModel<T>; columns: RCol<T>[]; rowKey: (r: T) => string;
  title?: ReactNode; count?: ReactNode; toolbarStart?: ReactNode; toolbarEnd?: ReactNode;
  onRowOpen?: (r: T, index: number) => void; selectedKey?: string | null; rowActions?: (r: T) => ReactNode; isRowDisabled?: (r: T) => boolean;
  loading?: boolean; empty?: ReactNode; noResults?: string; totalLabel?: (n: number) => string; noPager?: boolean; note?: ReactNode;
  rowTitle?: string; className?: string; openArrow?: boolean; actionsHeader?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState<number | undefined>(undefined);
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth)); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pin: React.CSSProperties = { position: 'sticky', left: 0, width: wrapW };
  const hasFilterRow = columns.some((c) => c.filterable);
  const showArrow = openArrow ?? !!onRowOpen;
  const colCount = columns.length + (rowActions ? 1 : 0) + (showArrow ? 1 : 0);
  const list = noPager ? model.processed : model.slice;
  const offset = noPager ? 0 : model.offset;
  const isEmpty = !loading && empty && model.processed.length === 0 && !model.anyFilter;

  return (
    <section className={'lf-card tablecard' + (className ? ' ' + className : '')}>
      {(title || toolbarStart || toolbarEnd) && (
        <div className="toolbar">
          <h3 className="lf-card__title" style={{ margin: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{toolbarStart}{title}</span>
            {count !== undefined && <small className="count-chip">{count}</small>}
          </h3>
          {toolbarEnd && <div className="row row--wrap">{toolbarEnd}</div>}
        </div>
      )}
      {isEmpty ? empty : (
        <>
          <div ref={wrapRef} className="tbl-wrap" onScroll={(e) => e.currentTarget.classList.toggle('is-scrolled', e.currentTarget.scrollLeft > 0)}>
            <table className="lf-table">
              <thead>
                <tr>
                  {columns.map((c) => {
                    const dir = model.sort?.key === c.key ? model.sort.dir : undefined;
                    return (
                      <th key={c.key} style={{ width: c.width, minWidth: c.minWidth ?? c.width }} aria-sort={dir ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                        {c.sortable ? (
                          <button type="button" className="th-sort" data-dir={dir} onClick={() => model.toggleSort(c.key)}>
                            {c.header}<Icon name={dir === 'asc' ? 'up' : dir === 'desc' ? 'down' : 'sort'} size={12} />
                          </button>
                        ) : c.header}
                      </th>
                    );
                  })}
                  {rowActions && <th style={{ width: 120 }}>{actionsHeader ?? <span className="sr-only">Action</span>}</th>}
                  {showArrow && <th style={{ width: 52 }}><span className="sr-only">Open</span></th>}
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
                    {rowActions && <th />}{showArrow && <th />}
                  </tr>
                )}
              </thead>
              {loading ? <SkeletonRows rows={8} cols={colCount} /> : (
                <tbody className="rows-in">
                  {list.length === 0 ? (
                    <tr><td colSpan={colCount} className="empty-cell" style={{ maxWidth: 'none', position: 'static', padding: 0 }}>
                      <div style={{ ...pin, height: 180, display: 'grid', placeItems: 'center', padding: '0 16px' }}>{noResults}</div></td></tr>
                  ) : list.map((r, i) => {
                    const k = rowKey(r); const dis = isRowDisabled?.(r);
                    return (
                      <tr key={k} className={'lf-row' + (selectedKey === k ? ' is-sel' : '')} tabIndex={onRowOpen ? 0 : undefined}
                        aria-selected={onRowOpen ? selectedKey === k : undefined} title={rowTitle}
                        onClick={(e) => { if (!onRowOpen || dis) return; if ((e.target as Element).closest('button,a,input,label,select,.lf-toggle')) return; onRowOpen(r, offset + i); }}
                        onKeyDown={(e) => { if (onRowOpen && !dis && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onRowOpen(r, offset + i); } }}
                        style={onRowOpen ? undefined : { cursor: 'default' }}>
                        {columns.map((c) => {
                          const v = c.value(r);
                          const content = c.render ? c.render(r) : (v === '' || v === null || v === undefined ? <span className="lf-na">—</span> : String(v));
                          return <td key={c.key} className={c.cls} title={typeof v === 'string' || typeof v === 'number' ? String(v) : undefined}>{content}</td>;
                        })}
                        {rowActions && <td className="lf-row__end" style={{ width: 120 }}><span className="lf-row__actions">{rowActions(r)}</span></td>}
                        {showArrow && <td className="lf-row__end"><span className="lf-row__open" aria-hidden="true"><Icon name="arrow" size={15} /></span></td>}
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>
          {!noPager && !loading && (
            <ReportPager total={model.processed.length} label={totalLabel ?? ((n) => `Total Records - ${n.toLocaleString()}`)} page={model.page} pages={model.pages}
              size={model.size} sizes={model.pageSizes} onPage={model.setPage} onSize={model.setSize} />
          )}
          {note}
        </>
      )}
    </section>
  );
}

/** Lepide Design System pager (03 § 9.6) with the architecture's total wording. */
export function ReportPager({ total, label, page, pages, size, sizes, onPage, onSize }: {
  total: number; label: (n: number) => string; page: number; pages: number; size: number; sizes: number[]; onPage: (p: number) => void; onSize: (s: number) => void;
}) {
  const [input, setInput] = useState(String(page));
  useEffect(() => setInput(String(page)), [page]);
  const commit = () => { const n = Number(input); if (Number.isInteger(n) && n >= 1 && n <= pages) onPage(n); else setInput(String(page)); };
  return (
    <div className="pager">
      <span className="total">{label(total)}</span>
      <button type="button" className="lf-btn" aria-label="First page" disabled={page <= 1} onClick={() => onPage(1)}><Icon name="chevrons-left" size={15} /></button>
      <button type="button" className="lf-btn" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}><Icon name="chevron-left" size={15} /></button>
      <span className="pg"><input value={input} aria-label="Page" onChange={(e) => setInput(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} /><span>/ {pages}</span></span>
      <button type="button" className="lf-btn" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}><Icon name="chevron-right" size={15} /></button>
      <button type="button" className="lf-btn" aria-label="Last page" disabled={page >= pages} onClick={() => onPage(pages)}><Icon name="chevrons-right" size={15} /></button>
      <Menu align="up" label="Rows per page" items={sizes.map((s) => ({ label: `${s} / page`, selected: s === size, onSelect: () => onSize(s) }))}
        trigger={(p) => <button type="button" className="lf-btn" style={{ width: 'auto', padding: '0 12px 0 14px', borderRadius: 999, gap: 6, fontWeight: 600 }} {...p}>{size} / page<Icon name="chevron" size={14} /></button>} />
    </div>
  );
}
