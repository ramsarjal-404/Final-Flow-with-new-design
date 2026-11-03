import type { AppliedFilter, FilterOp } from './types';

/* Filter semantics (ENT-RLIB-AppliedFilter). Contains is the default operator; the other five are
   GAP-RLIB-13 intended. A field that is not a column of the data is ignored. */

export type ParsedFilter = { field: string; op: string; value: string; raw: string };

/** "Server Name : [Equals [All]]" → { field, op, value }. Unparseable parts keep `raw` as the field. */
export function parseFilterPart(part: string): ParsedFilter {
  const m = part.match(/^\s*(.+?)\s*:\s*\[\s*([A-Za-z ]+?)\s*\[\s*(.*?)\s*\]\s*\]\s*$/);
  return m ? { field: m[1], op: m[2], value: m[3], raw: part.trim() } : { field: part.trim(), op: '', value: '', raw: part.trim() };
}
export const splitFilterLine = (line: string) => (line.trim() ? line.split(/\s+AND\s+/).map(parseFilterPart) : []);

export const filterPart = (f: AppliedFilter) => `${f.field} : [${f.op ?? 'Contains'} [${f.value}]]`;

/** "Filters :" line = default filter, fixed parts, then one part per applied filter, joined with " AND ". */
export const filterLine = (defaultFilter: string, applied: AppliedFilter[], fixed: string[] = []) =>
  [defaultFilter.trim(), ...fixed, ...applied.map(filterPart)].filter(Boolean).join(' AND ');

export function matches(op: FilterOp | undefined, cell: string, value: string) {
  const c = String(cell ?? '').toLowerCase(), v = value.trim().toLowerCase();
  switch (op ?? 'Contains') {
    case 'Equals': return c === v;
    case 'Not Equals': return c !== v;
    case 'Not Contains': return !c.includes(v);
    case 'Starts With': return c.startsWith(v);
    case 'Ends With': return c.endsWith(v);
    default: return c.includes(v);
  }
}

/** Rows (string cells) that pass every applied filter. */
export function applyFilters(rows: string[][], columns: string[], applied: AppliedFilter[]) {
  const active = applied.map((f) => ({ f, i: columns.indexOf(f.field) })).filter((x) => x.i >= 0 && x.f.value.trim());
  if (!active.length) return rows;
  return rows.filter((r) => active.every(({ f, i }) => matches(f.op, r[i], f.value)));
}

/** Object-row variant: `get(row, field)` returns the cell for a field, or undefined when not a column. */
export function applyFiltersBy<T>(rows: T[], applied: AppliedFilter[], get: (row: T, field: string) => string | undefined) {
  const active = applied.filter((f) => f.value.trim());
  if (!active.length) return rows;
  return rows.filter((r) => active.every((f) => { const c = get(r, f.field); return c === undefined || matches(f.op, c, f.value); }));
}
