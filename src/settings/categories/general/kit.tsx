import { useEffect, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Field, Icon, Pager } from '../../../ui';

/* Shared building blocks for the administration categories owned by this builder (General,
   Role Management, Lepide IQ, Logs, Application URL, Manage Domains). Built from Lepide Design System classes only.

   - AdminTable + useTable: the Lepide Design System table card (03 § 9) with the sort/filter model lifted to the
     page, because these pages must act on exactly the rows the user sees (Role Management selection,
     Logs CSV export of the filtered + sorted set) and some tables have no pager.
   - DigitsField: NumberField variant that keeps a string, strips non-digits, caps the length and
     takes a placeholder ("Not set") and a unit suffix. */

/* ---------------- validators (data-model.md) ---------------- */

const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
export const IPV4_RE = new RegExp(`^${OCTET}(?:\\.${OCTET}){3}$`);
export const CIDR_RE = new RegExp(`^${OCTET}(?:\\.${OCTET}){3}\\/(?:3[0-2]|[12]?\\d)$`);
const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
/** DNS host name; the last label starts with a letter so dotted numbers are never taken for hosts. */
export const HOSTNAME_RE = new RegExp(`^(?=.{1,253}$)(?:${LABEL}\\.)*[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$`, 'i');
/** Domain name: label(.label)+.tld */
export const DOMAIN_RE = new RegExp(`^(?=.{1,253}$)(?:${LABEL}\\.)+[a-z]{2,63}$`, 'i');
export const isHostOrIpv4 = (v: string) => IPV4_RE.test(v) || (!/^[\d.]+$/.test(v) && HOSTNAME_RE.test(v));

/* ---------------- table model ---------------- */

export type Col<T> = {
  key: string;
  header: string;
  /** Displayed text: used for filtering, global search and the default cell. */
  text?: (r: T) => string;
  /** Sort key (defaults to the text, natural compare). */
  sortValue?: (r: T) => string | number;
  render?: (r: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  /** Show the full text as a tooltip. */
  tip?: boolean;
  width?: number;
  minWidth?: number;
  mono?: boolean;
};
export type Sort = { key: string; dir: 'asc' | 'desc' };

const textOf = <T,>(c: Col<T>, r: T) => (c.text ? c.text(r) : String((r as Record<string, unknown>)[c.key] ?? ''));
const cmp = (a: string | number, b: string | number) =>
  typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

export function useTable<T>(rows: T[], cols: Col<T>[], opts: { search?: string; searchText?: (r: T) => string; initialSort?: Sort | null } = {}) {
  const [sort, setSort] = useState<Sort | null>(opts.initialSort ?? null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const q = (opts.search ?? '').trim().toLowerCase();
  const list = useMemo(() => {
    let out = rows;
    if (q) out = out.filter((r) => (opts.searchText ? opts.searchText(r) : cols.map((c) => textOf(c, r)).join(' ')).toLowerCase().includes(q));
    for (const [k, f] of Object.entries(filters)) {
      const c = cols.find((x) => x.key === k); const t = f.trim().toLowerCase();
      if (c && t) out = out.filter((r) => textOf(c, r).toLowerCase().includes(t));
    }
    if (sort) {
      const c = cols.find((x) => x.key === sort.key);
      if (c) out = [...out].sort((a, b) => cmp(c.sortValue ? c.sortValue(a) : textOf(c, a), c.sortValue ? c.sortValue(b) : textOf(c, b)) * (sort.dir === 'asc' ? 1 : -1));
    }
    return out;
  }, [rows, cols, q, filters, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    list, total: rows.length, sort, filters,
    toggleSort: (key: string) => setSort((s) => (s?.key === key && s.dir === 'asc' ? { key, dir: 'desc' } : { key, dir: 'asc' })),
    setFilter: (key: string, v: string) => setFilters((f) => ({ ...f, [key]: v })),
  };
}
export type TableModel<T> = ReturnType<typeof useTable<T>>;

/** Lepide Design System table card driven by a `useTable` model. Pager only when `paging` is given (and rows exist). */
export function AdminTable<T>({ model, cols, rowKey, title, noun = ['record', 'records'], toolbar, selectable, selected = [], onSelectedChange,
  rowActions, actionsHeader = 'Action', empty, noResults = 'No results match your search or filters.', paging, label, flat }: {
  model: TableModel<T>; cols: Col<T>[]; rowKey: (r: T) => string; title?: ReactNode; noun?: [string, string]; toolbar?: ReactNode;
  selectable?: boolean; selected?: string[]; onSelectedChange?: (keys: string[]) => void;
  rowActions?: (r: T) => ReactNode; actionsHeader?: string; empty?: ReactNode; noResults?: string;
  paging?: { sizes: number[]; defaultSize: number; resetKey?: string }; label?: string; flat?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(paging?.defaultSize ?? Number.MAX_SAFE_INTEGER);
  const filterKey = JSON.stringify(model.filters);
  useEffect(() => { setPage(1); }, [filterKey, size, paging?.resetKey]);
  const list = model.list;
  const pages = paging ? Math.max(1, Math.ceil(list.length / size)) : 1;
  const cur = Math.min(page, pages);
  const slice = paging ? list.slice((cur - 1) * size, cur * size) : list;
  const hasFilterRow = cols.some((c) => c.filterable);
  const colCount = cols.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
  const keys = slice.map(rowKey);
  const allOn = keys.length > 0 && keys.every((k) => selected.includes(k));
  const someOn = keys.some((k) => selected.includes(k));

  return (
    <section className={'lf-card tablecard' + (flat ? ' tablecard--flat' : '')} aria-label={label}>
      {(title || toolbar) && (
        <div className="toolbar">
          <h3 className="lf-card__title" style={{ margin: 0 }}>
            {title}{title && <small className="count-chip">{`${list.length.toLocaleString()} ${list.length === 1 ? noun[0] : noun[1]}`}</small>}
          </h3>
          {toolbar && <div className="row row--wrap">{toolbar}</div>}
        </div>
      )}
      <div className="tbl-wrap" onScroll={(e) => e.currentTarget.classList.toggle('is-scrolled', e.currentTarget.scrollLeft > 0)}>
        <table className="lf-table">
          <thead>
            <tr>
              {selectable && (
                <th className="th-check"><label className="lf-check"><input type="checkbox" aria-label="Select all rows" checked={allOn}
                  disabled={keys.length === 0} ref={(el) => { if (el) el.indeterminate = someOn && !allOn; }}
                  onChange={() => onSelectedChange?.(allOn ? selected.filter((k) => !keys.includes(k)) : Array.from(new Set([...selected, ...keys])))} />
                  <span className="lf-check__box" /></label></th>
              )}
              {cols.map((c) => {
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
              {rowActions && <th style={{ width: 110 }}>{actionsHeader}</th>}
            </tr>
            {hasFilterRow && (
              <tr className="filter-row">
                {selectable && <th />}
                {cols.map((c) => (
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
                {rowActions && <th />}
              </tr>
            )}
          </thead>
          <tbody className="rows-in">
            {model.total === 0 && empty ? (
              <tr><td colSpan={colCount} style={{ padding: 0, height: 'auto', maxWidth: 'none', whiteSpace: 'normal', position: 'static' }}>{empty}</td></tr>
            ) : slice.length === 0 ? (
              <tr><td colSpan={colCount} className="empty-cell" style={{ maxWidth: 'none', position: 'static' }}>{noResults}</td></tr>
            ) : slice.map((r) => {
              const k = rowKey(r); const on = selected.includes(k);
              return (
                <tr key={k} className={'lf-row' + (on ? ' is-sel' : '')} style={{ cursor: 'default' }}>
                  {selectable && (
                    <td className="td-check"><label className="lf-check"><input type="checkbox" aria-label="Select row" checked={on}
                      onChange={() => onSelectedChange?.(on ? selected.filter((x) => x !== k) : [...selected, k])} /><span className="lf-check__box" /></label></td>
                  )}
                  {cols.map((c) => {
                    const t = textOf(c, r);
                    return (
                      <td key={c.key} className={c.mono ? 'lf-mono' : undefined} title={c.tip ? t : undefined}>
                        {c.render ? c.render(r) : t === '' ? <span className="lf-na">—</span> : t}
                      </td>
                    );
                  })}
                  {rowActions && <td className="lf-row__end" style={{ width: 110 }}><span className="lf-row__actions">{rowActions(r)}</span></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {paging && list.length > 0 && (
        <Pager total={list.length} noun={noun} page={cur} pages={pages} size={size} sizes={paging.sizes} onPage={setPage} onSize={setSize} />
      )}
    </section>
  );
}

/* ---------------- digits-only number field ---------------- */

/** NumberField (03 § 19) holding a digit string: typing strips non-digits and keeps at most
    `maxLength` characters; step buttons stay within min/max; blank allowed (placeholder shown). */
export function DigitsField({ label, value, onChange, error, help, min, max, maxLength = 5, suffix, placeholder, disabled, id, ariaLabel, className }: {
  label?: ReactNode; value: string; onChange: (v: string) => void; error?: string | null; help?: ReactNode; min?: number; max?: number;
  maxLength?: number; suffix?: ReactNode; placeholder?: string; disabled?: boolean; id?: string; ariaLabel?: string; className?: string;
}) {
  const auto = useId(); const fid = id ?? auto;
  const n = value === '' ? NaN : Number(value);
  const step = (d: number) => {
    const base = Number.isNaN(n) ? (min ?? 0) : n + d;
    const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, base));
    onChange(String(next).slice(0, maxLength));
  };
  return (
    <Field label={label} error={error} help={help} htmlFor={fid} className={className}>
      <div className="fld-num">
        <input id={fid} inputMode="numeric" value={value} disabled={disabled} placeholder={placeholder} aria-label={ariaLabel}
          aria-invalid={!!error || undefined} maxLength={maxLength}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, maxLength))} />
        <button type="button" aria-label="Decrease" disabled={disabled || (min !== undefined && n <= min)} onClick={() => step(-1)}><Icon name="minus" size={14} /></button>
        <button type="button" aria-label="Increase" disabled={disabled || (max !== undefined && n >= max)} onClick={() => step(1)}><Icon name="plus" size={14} /></button>
        {suffix && <span className="muted text-sm">{suffix}</span>}
      </div>
    </Field>
  );
}

/** Field-style read-only value (dialogs). */
export function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="fld">
      <span className="fld__lbl">{label}</span>
      <div className="kv" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}><div><dd>{value}</dd></div></div>
    </div>
  );
}
