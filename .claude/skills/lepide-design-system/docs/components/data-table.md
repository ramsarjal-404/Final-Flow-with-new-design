---
title: Data table
exports: [DataTable, Pager]
category: data
status: stable
summary: Table card with title and count, sortable headers, an optional column filter row, checkbox selection, row open and row actions, client-side paging, skeleton loading and empty states, and a sticky first column.
classes: [lf-card, lf-card__title, tablecard, tablecard--flat, toolbar, count-chip, tbl-wrap, is-scrolled, lf-table, th-check, td-check, th-sort, filter-row, filter-input, has-value, lf-check, lf-check__box, rows-in, lf-row, is-sel, lf-row__end, lf-row__actions, col-xs, col-s, col-m, col-l, col-min-l, col-min-xl, col-min-2xl, lf-row__open, lf-mono, td-wrap, lf-na, empty-cell, sk-rows, sr-only, pager, total, pg, lf-btn, lf-btn--icon]
tokens: [--col-xs, --col-s, --col-m, --col-l, --col-xl, --col-2xl, --table-head-h, --table-row-h, --table-filter-h, --card-radius, --surface, --surface-2, --surface-3, --border-soft, --border, --ink, --ink-2, --ink-3, --ink-4, --brand, --brand-50, --brand-200, --brand-300, --brand-ink, --sel-fill, --sel-ring, --ring, --type-table, --type-table-head, --mono]
related: [drawer, empty-state, loading, menu, button]
---

# Data table

## When to use
- Any list of records the user scans, compares, sorts, filters or acts on: users, reports, alerts, audit events, servers.
- Lists where rows open a detail view (`onRowOpen` + `Drawer` or `DetailPanel`) or carry per-row actions (`rowActions`).
- Bulk actions over many rows (`selectable="multi"`).
- `Pager` on its own under any custom list that pages the same way.

## When not to use
- A handful of label/value pairs: use `KeyValues`.
- Fewer than about 4 items with rich content: use cards (`Card`, `SetCard`).
- Server-side paging, sorting or filtering of very large sets: `DataTable` sorts, filters and pages the `rows` array in the browser. Pass it one page of data only if you also accept that its counts, sort and filters apply to that page.
- Layout grids: tables are for tabular data only.

## Anatomy
1. Card `<section class="lf-card tablecard">`: white, radius 20, no padding, overflow hidden. `flat` adds `.tablecard--flat` (no shadow, 1 px `--border-soft`).
2. Toolbar `.toolbar` (when `title` or `toolbar` is set), padding 16 20 12: title `<h3 class="lf-card__title">` (700 15/22) with a count chip `.count-chip` ("1,204 records", 600 11.5 `--ink-3` on `--surface-3`, pill) — the count is the number of rows after search and filters, worded with `noun` (singular, plural; default `['record', 'records']`). Right: your `toolbar` controls (e.g. `SearchField`, bordered 32 px icon buttons).
3. Scroll area `.tbl-wrap`: scrolls both ways; `maxHeight` caps its height so the body scrolls under a sticky header.
4. Header row: sticky, 42 tall (`--table-head-h`), `--surface-2`, 600 12/16 `--ink-3`, hairlines top and bottom, padding 0 16 (first cell 20). Sortable headers are a `.th-sort` button with a 12 px icon: `sort` when unsorted, `up` / `down` in `--brand-ink` with the header in ink when sorted.
5. Filter row `.filter-row` (when any column has `filterable`): 44 tall (`--table-filter-h`), sticky under the header. Each filterable column gets a `.filter-input` pill: 30 tall, white, 1 px `--border-soft`, 12 px search icon, placeholder "Filter", 500 12.5 text. `--brand-200` border when it has a value; `--brand-300` border plus `--ring` when focused.
6. Body rows `.lf-row`: 56 tall (`--table-row-h`), padding 0 16 (first cell 20), white, 1 px `--border-soft` between rows, 500 13/18 `--ink-2`. Cells don't wrap; long text truncates with an ellipsis and the full value is in the cell's `title`. Empty values (`''`, `null`, `undefined`) show a `--ink-4` "—". Rows fade up in a 20 ms stagger when they render.
7. First column: 600 ink, sticky on the left; a 12 px soft shadow appears on its right edge once the table is scrolled sideways (`.tbl-wrap.is-scrolled`). When the table is narrower than 760 px it stops being sticky. With `selectable="multi"` the first column is the checkbox column.
8. Checkbox column (`selectable="multi"`): 44 wide, 16 px `.lf-check` boxes; the header box selects the page.
9. Row actions column (`rowActions`): 96 wide, right-aligned `.lf-row__actions`. Put `IconButton`s in it; they are 30 px, hidden until the row is hovered or has focus inside (fade + 4 px slide), always visible on touch devices. An `IconButton` with `label="Remove"` hovers red.
10. Open column (`onRowOpen`): 52 wide, a 30 px round `arrow` (`.lf-row__open`, `--ink-4`) that takes the selected finish (`--sel-fill`, white) and slides 2 px right on row hover or when the row is selected.
11. Pager `.pager` (below the table, when not loading and `rows` is not empty): padding 12 20, top hairline. Left: total ("1,204 records"). Right: first / previous buttons, a 44 × 34 pill page input with "/ N", next / last buttons (all 34 px round, 15 px chevrons), and a "10 / page" pill that opens an upward `Menu` of `pageSizes`.

`Column<T>` fields:
| Field | Effect |
|---|---|
| `key` | Unique id; also the row property read when `value` is omitted |
| `header` | Header text, also used in the filter input's `aria-label` |
| `value(row)` | Plain value for sorting, search, column filters and the default cell |
| `render(row)` | Custom cell content (chips, links, avatars). Sorting and filtering still use `value` |
| `width`, `minWidth` | Column width in px (`minWidth` defaults to `width`) |
| `sortable` | Header becomes a sort button |
| `filterable` | Adds this column's input to the filter row |
| `mono` | Geist Mono 400 12.5/18 (`.lf-mono`) for ids, paths, hashes |
| `wrap` | Lets the cell wrap instead of truncating (`.td-wrap`) |
| `align` | `left` / `right` / `center` for header and cells (use `right` for numbers) |

## Variants and sizes
`flat`: no shadow, hairline border — for a table inside another card or a drawer. Otherwise none.

## States
| State | Behaviour |
|---|---|
| Sorting | Click a sortable header: ascending; click again: descending; again: ascending. Sorting never clears. Numbers compare numerically; everything else with a case-insensitive, numeric-aware string compare. `initialSort` sets the starting sort |
| Search | `search` (e.g. the value of a `SearchField`) keeps rows where any column's `value` contains the text, case-insensitive. Applied before column filters |
| Column filters | Each filter keeps rows whose column `value` contains the typed text (case-insensitive, max 200 characters). Filters combine with AND |
| Paging | `pageSizes` default `[10, 25, 50, 100]`; `defaultPageSize` default is the first size. Changing search, a filter or the page size goes back to page 1. The page input accepts a number on Enter or blur and reverts if out of range |
| Row hover | Cells turn `--surface-2`; row actions and the open arrow appear |
| Keyboard focus on a row | Cells turn `--brand-50` |
| Selected / active | Keys in `selected`, or the row matching `activeKey`, get `.is-sel`: `--brand-50` cells and a 3 px brand bar on the left of the first cell |
| Select all | The header checkbox selects every enabled row on the current page (keeping selections on other pages); it is indeterminate when some are selected; clicking it when all are on deselects that page only |
| Disabled row | `isRowDisabled(row)` sets `aria-disabled`, disables its checkbox, skips it in select-all and stops it opening or being selected. The row shows `--ink-4` text, a not-allowed cursor and no hover highlight; add a status in a cell saying why |
| Loading | `loading`: 7 skeleton rows (`.sk-rows`, 10 px shimmering pill bars), count chip reads "Loading…", pager hidden |
| Empty | `rows` is empty and `empty` is given: your `empty` content (usually an `EmptyState`) fills the body, centred on the visible width; pager hidden |
| No results | Search or filters exclude every row (or `rows` is empty with no `empty`): the `noResults` text, centred, 180 tall, `--ink-3`. Pass a specific line when you know what is listed (`noResults="No servers match your search."`) |

Selection is controlled: pass `selected` and update it from `onSelectedChange(keys)`. `selectable="single"` renders no checkboxes: clicking a row (or Enter / Space on a focused row) selects it, calling `onSelectedChange([key])`; the row gets `aria-selected="true"` and the selected style. If `onRowOpen` is also set, the same click opens it.

## Accessibility
- Real `<table>` markup with `<th>` headers. Sorted columns carry `aria-sort="ascending"` / `"descending"`; sort controls are buttons.
- With `onRowOpen`, each row is focusable (`tabIndex=0`); Enter or Space opens it. A click opens it unless it lands on a button, link, input, label, select or `.lf-toggle` inside the row, so cell controls keep working.
- Checkboxes are labelled "Select row" and "Select all rows on this page". Filter inputs are labelled "Filter {header}". The actions and open columns have visually hidden headers ("Actions", "Open").
- Pager buttons are labelled "First page", "Previous page", "Next page", "Last page"; the input is labelled "Page"; the size menu is "Rows per page".
- Selected rows add a left bar, not only a tint. Give every row-action `IconButton` a `label` (it becomes its name and tooltip).
- Skeleton rows are `aria-hidden`; the count chip says "Loading…".

## Do and don't
| Do | Don't |
|---|---|
| Make the first column the record's name or key | Lead with an id, date or checkbox-only column the user can't recognise |
| `value` returns plain text or a number; `render` handles the look | Return JSX from `value` (sorting and search break) |
| `align: 'right'` for numbers, `mono` for ids and paths | Centre-align text columns |
| 2–3 `IconButton` row actions; put the rest in a `Menu` | A row of five buttons in every row |
| `empty` with an `EmptyState` and a create action | A blank table body |
| Use `noun` so counts read naturally: `['user', 'users']` | "1 records" |

## Example
```tsx
import { useState } from 'react';
import { DataTable, SearchField, Button, IconButton, EmptyState, ToneTag, type Column } from '@lepide/ds-react';

type User = { id: string; name: string; department: string; lastLogon: string; failed: number; status: 'Enabled' | 'Disabled' };

const columns: Column<User>[] = [
  { key: 'name', header: 'Name', sortable: true, filterable: true, minWidth: 220 },
  { key: 'department', header: 'Department', sortable: true, filterable: true },
  { key: 'lastLogon', header: 'Last logon', sortable: true, width: 160 },
  { key: 'failed', header: 'Failed logons', sortable: true, align: 'right', width: 140 },
  { key: 'status', header: 'Status', value: (u) => u.status,
    render: (u) => <ToneTag tone={u.status === 'Enabled' ? 'good' : 'none'}>{u.status}</ToneTag> },
];

export function UsersTable({ users, loading, onOpen }: { users: User[]; loading: boolean; onOpen: (u: User) => void }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <DataTable
      title="Users" noun={['user', 'users']} rows={users} rowKey={(u) => u.id} columns={columns} loading={loading}
      search={q} initialSort={{ key: 'failed', dir: 'desc' }}
      toolbar={<>
        <SearchField value={q} onChange={setQ} placeholder="Search users" />
        <Button icon="download" disabled={!selected.length}>Export {selected.length || ''}</Button>
      </>}
      selectable="multi" selected={selected} onSelectedChange={setSelected}
      onRowOpen={onOpen}
      rowActions={(u) => <IconButton icon="edit" label="Edit" onClick={() => onOpen(u)} />}
      empty={<EmptyState icon="users" title="No users yet" message="Add a domain to start collecting users." />}
    />
  );
}
```

Columns are `Column<T>` objects: `{ key, header, value?, render?, width?, minWidth?, sortable?, filterable?, mono?, wrap?, align? }`
(full definition under Props). The column title field is `header`.

Plain HTML (with `@lepide/ds-css`) — the markup `DataTable` renders, for static pages. `<svg class="lf-i">` icons as in
the Icon page (`arrow` for the open circle and pager steps, `sort` in sortable headers, `more` for row actions).
Column widths are classes, not inline styles: `.col-xs` 52 (open) · `.col-s` 96 (actions) · `.col-m` 120 (status) ·
`.col-l` 160 (role, date) fix a width; `.col-min-l` / `.col-min-xl` 200 / `.col-min-2xl` 240 set the minimum of a column
that takes the remaining space. Put a fixed class on the `<th>` and on that column's `<td>`s.
```html
<section class="lf-card tablecard">
  <div class="toolbar">
    <h3 class="lf-card__title">All users<small class="count-chip">6 users</small></h3>
  </div>
  <div class="tbl-wrap">
    <table class="lf-table">
      <thead><tr>
        <th class="col-min-xl"><button type="button" class="th-sort">Name<svg class="lf-i" viewBox="0 0 24 24" aria-hidden="true">…</svg></button></th>
        <th class="col-m">Status</th>
        <th class="col-s"><span class="sr-only">Actions</span></th>
        <th class="col-xs"><span class="sr-only">Open</span></th>
      </tr></thead>
      <tbody class="rows-in">
        <tr class="lf-row" tabindex="0">
          <td title="Ann Lee">Ann Lee</td>
          <td><span class="fx-op fx-op--good">Active</span></td>
          <td class="lf-row__end col-s"><span class="lf-row__actions">
            <button type="button" class="lf-btn lf-btn--icon" aria-label="More actions"><svg class="lf-i" viewBox="0 0 24 24" aria-hidden="true">…</svg></button>
          </span></td>
          <td class="lf-row__end"><span class="lf-row__open" aria-hidden="true"><svg class="lf-i" viewBox="0 0 24 24">…</svg></span></td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="pager">
    <span class="total">6 users</span>
    <button type="button" class="lf-btn" aria-label="Previous page" disabled><svg class="lf-i" viewBox="0 0 24 24">…</svg></button>
    <span class="pg"><input aria-label="Page" value="1"><span>/ 1</span></span>
    <button type="button" class="lf-btn" aria-label="Next page" disabled><svg class="lf-i" viewBox="0 0 24 24">…</svg></button>
  </div>
</section>
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `DataTable`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `columns` * | `Column<T>[]` | — |  |
| `rows` * | `T[]` | — |  |
| `rowKey` * | `(row: T) => string` | — |  |
| `title` | `ReactNode` | — | Card toolbar: title (left), count noun, extra controls (right). Omit title to hide the toolbar. |
| `noun` | `[string, string]` | `['record', 'records']` |  |
| `toolbar` | `ReactNode` | — |  |
| `search` | `string` | `''` | Global text filter applied before column filters (pass the value of a SearchField). |
| `pageSizes` | `number[]` | `[10, 25, 50, 100]` |  |
| `defaultPageSize` | `number` | — |  |
| `selectable` | `"multi" \| "single"` | — | Selection: 'multi' shows checkboxes; selected keys are controlled. |
| `selected` | `string[]` | `[]` |  |
| `onSelectedChange` | `((keys: string[]) => void)` | — |  |
| `onRowOpen` | `((row: T) => void)` | — | Row activation (click / Enter) — e.g. open a detail panel. |
| `activeKey` | `string \| null` | — |  |
| `rowActions` | `((row: T) => ReactNode)` | — |  |
| `isRowDisabled` | `((row: T) => boolean)` | — |  |
| `loading` | `boolean` | — |  |
| `empty` | `ReactNode` | — | Shown when there are no rows at all. |
| `noResults` | `string` | `'No results match your search or filters.'` | Shown when filters/search exclude everything. |
| `flat` | `boolean` | — |  |
| `maxHeight` | `number` | — |  |
| `initialSort` | `{ key: string; dir: "asc" \| "desc"; }` | — |  |
| `className` | `string` | — |  |

### `Pager`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `total` * | `number` | — |  |
| `noun` * | `[string, string]` | — |  |
| `page` * | `number` | — |  |
| `pages` * | `number` | — |  |
| `size` * | `number` | — |  |
| `sizes` * | `number[]` | — |  |
| `onPage` * | `(p: number) => void` | — |  |
| `onSize` * | `(s: number) => void` | — |  |

### Types

```ts
// import type { Column } from '@lepide/ds-react'
type Column<T> = { key: string; header: string; /** Plain value used for sorting, filtering and the default cell. */ value?: (row: T) => string | number | boolean | null | undefined; /** Custom cell. Defaults to the value as text. */ render?: (row: T) => ReactNode; /** Hover text for the cell. Defaults to the value — set it when value() is a sort key (e.g. an ISO date). */ title?: (row: T) => string | undefined; width?: number; minWidth?: number; sortable?: boolean; filterable?: boolean; mono?: boolean; wrap?: boolean; align?: 'left' | 'right' | 'center'; };
```

`*` required.
<!-- props:end -->
