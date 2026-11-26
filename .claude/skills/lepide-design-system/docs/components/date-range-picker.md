---
title: Date range picker
exports: [DateRangePicker, Calendar, rangeFor, DATE_PRESETS, fmtDate, fmtDateTime, fmtRange]
category: forms
status: stable
summary: Ghost-button popover with date presets (Today … Last month) and a Custom range month calendar; the change is applied only on Apply.
classes: [dp, dp__foot, cal, cal__head, cal__grid, cal__dow, cal__day, is-out, is-today, is-in, is-end, pop, pop__item, lf-btn, lf-btn--icon, lf-pill]
tokens: [--sel-fill, --sel-ring, --surface, --surface-2, --surface-3, --border, --border-soft, --brand, --ink, --ink-2, --ink-3, --ink-4, --r-xs]
related: [button, dropdown, menu]
---

# Date range picker

## When to use
- `DateRangePicker` for the time range of a report, dashboard, audit log or chart — usually at the right of a page or card toolbar.
- `Calendar` on its own when you build a custom picker that needs a month grid selecting a start and end date.

## When not to use
- A single date (an expiry date, a scheduled run): `Calendar` always selects a range; use a text field with a date input instead.
- Choosing a time of day: use a `Dropdown` with `size="sm"`.
- Relative periods that are not dates ("Every Monday"): use `SelectField`.

## Anatomy
1. Trigger: `Button variant="ghost"` (pill, 38 px) with a calendar icon, the current preset name ("Last 7 days"), or for a custom range the formatted range ("Jan 5, 2026 - Jan 12, 2026"), and a trailing chevron.
2. Popover `.pop` (`Menu`, `role="menu"`, `aria-label` from `label`, default "Date range"), at least 320 px wide, aligned to the trigger's right edge by default (`align="left"` for the left edge).
3. Body `.dp` (320 px wide, no padding).
4. Preset rows `.pop__item`: min-height 36, padding 0 10, radius 8. Rows are `role="menuitemradio"`; the selected preset has `aria-checked="true"`: `--surface-2` fill, 600 `--ink`, and a 6 px `--brand` dot at the right. Defaults: Today, Yesterday, Last 7 days, Last 30 days, This month, Last month, Custom range.
5. Calendar `.cal` (only when "Custom range" is selected):
   - Header `.cal__head`: previous / next month icon buttons ("Previous month", "Next month") around "January 2026" in 700 13/18 `--ink`.
   - Grid `.cal__grid`: 7 columns of 34 px, 2 px gap, weeks start on Monday (Mo … Su headers `.cal__dow`, 600 11 `--ink-3`), always 6 weeks (42 days).
   - Day `.cal__day`: 34 px round, 500 13 `--ink-2`.
6. Footer `.dp__foot`: hairline `--border-soft` above, right-aligned small `Cancel` and primary `Apply` buttons (32 px).

## Variants and sizes
None. One size, 320 px panel.

## States
| State | Change |
|---|---|
| Day hover | `--surface-3` |
| Outside month (`.is-out`) | `--ink-4` |
| Today (`.is-today`) | 1 px inset `--brand` ring |
| In range (`.is-in`) | `--surface-3`, radius 8 |
| Start / end (`.is-end`) | Selected finish: `--sel-fill` blue gradient, white text, `--sel-ring`; `aria-pressed="true"` |
| Selecting (`Calendar`) | With no start, or with both ends set, a click calls `onPick(day, null)` (new start). With a start and no end, a click calls `onPick(start, day)`, or `onPick(day, start)` if the day is earlier |
| Selecting (inside `DateRangePicker`) | First click sets the start (a one-day range is shown), second click sets the end — earlier dates swap so start ≤ end. A third click starts a new range. Apply commits it |
| Draft | Preset and calendar changes are held as a draft; the trigger and `onApply` update only on Apply. Cancel, Esc or an outside click discards the draft |

## Accessibility
- The trigger gets `aria-expanded` and `aria-haspopup="menu"` from `Menu`. On open, focus moves to the first preset.
- ↓ / ↑ move between preset rows (wrapping), Home / End jump to the first / last. Tab reaches the calendar buttons and the footer. Esc or Cancel closes without applying and returns focus to the trigger; Apply also returns focus; a click outside closes without moving focus.
- Each day is a `<button>` labelled with its full date ("Jan 5, 2026") and `aria-pressed` on the start and end days. There is no arrow-key navigation inside the day grid.
- Start/end days use the selected finish plus `aria-pressed`, not colour alone.

**Showing dates.** `fmtDate(d)` → "3 Nov 2026"; `fmtDateTime(v)` → "3 Nov 2026, 09:42" (a `Date`, "yyyy-mm-dd hh:mm[:ss]"
or "dd-mm-yyyy hh:mm[:ss]"; seconds dropped); `fmtRange({ from, to })` → "27 Oct 2026 - 3 Nov 2026". Use them for
every date in tables, details and captions, so the whole console reads dates one way.

## Do and don't
| Do | Don't |
|---|---|
| Put the picker at the right of the toolbar it filters | Hide the active range — the trigger always shows it |
| Keep the default presets; pass `presets` only to remove ones that don't apply | Invent presets that `rangeFor` doesn't compute (they fall back to today) |
| Re-query only in `onApply` | Re-query on every preset click |
| Keep "Custom range" in `presets` when users need arbitrary dates | Remove it and leave no way to pick exact dates |

## Example
```tsx
import { useState } from 'react';
import { DateRangePicker, rangeFor, type DateRange } from '@lepide/ds-react';

const [range, setRange] = useState<DateRange>({ preset: 'Last 7 days', ...rangeFor('Last 7 days') });

<div className="toolbar">
  <h2 className="lf-card__title">Logon activity</h2>
  <DateRangePicker value={range} onApply={(r) => { setRange(r); reload(r.from, r.to); }} />
</div>
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `DateRangePicker`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` * | `DateRange` | — |  |
| `onApply` * | `(r: DateRange) => void` | — |  |
| `presets` | `string[]` | `DATE_PRESETS` |  |
| `label` | `string` | `'Date range'` |  |
| `align` | `"right" \| "left"` | `'right'` |  |

### `Calendar`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `from` * | `Date \| null` | — |  |
| `to` * | `Date \| null` | — |  |
| `onPick` * | `(from: Date, to: Date \| null) => void` | — |  |

### `rangeFor` (function)

```ts
function rangeFor(preset: string, now?: Date): { from: Date; to: Date; }
```

The span a preset covers, ending today (`now`). Unknown presets and 'Custom range' give today.

### `DATE_PRESETS` (constant)

```ts
const DATE_PRESETS: readonly ["Today", "Yesterday", "Last 7 days", "Last 30 days", "This month", "Last month", "Custom range"]
```

The preset labels (sentence case). `rangeFor` also accepts them in any letter case.

### `fmtDate` (function)

```ts
function fmtDate(d: Date): string
```

"3 Nov 2026" — how a date reads anywhere in the console (inputs take dd-mm-yyyy).

### `fmtDateTime` (function)

```ts
function fmtDateTime(v: string | Date): string
```

"3 Nov 2026, 09:42" — date and time in tables, details and captions. Takes a Date, "yyyy-mm-dd hh:mm[:ss]" or
"dd-mm-yyyy hh:mm[:ss]". Seconds are dropped.

### `fmtRange` (function)

```ts
function fmtRange(r: { from: Date; to: Date; }): string
```

### Types

```ts
// import type { DateRange } from '@lepide/ds-react'
type DateRange = { preset: string; from: Date; to: Date };
```

`*` required.
<!-- props:end -->
