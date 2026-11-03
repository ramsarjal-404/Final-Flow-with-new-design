---
title: KPI card
exports: [KpiCard]
category: data
status: stable
summary: Stat card with a label, a large value that counts up once, an optional delta chip, a foot line and a full-bleed sparkline. Imported from '@lepide/ds-react/charts'.
classes: [lf-card, lf-card--lift, lf-stat, lf-stat__label, lf-stat__value, lf-stat__row, lf-stat__foot, lf-stat__apx, lf-chip, lf-chip--good, lf-chip--warn, lf-chip--bad, lf-chip--flat, lf-chip--brand, atl-chart, kpis--3]
tokens: [--type-kpi, --type-kpi-ls, --card-radius, --card-pad, --card-gap, --sh-md, --surface, --surface-3, --border, --border-soft, --ink, --ink-2, --ink-3, --success-bg, --success-text, --warning-bg, --warning-text, --danger-bg, --danger-text, --brand, --brand-50, --brand-100, --chip-h]
related: [chart, data-table]
---

# KPI card

## When to use
- The headline numbers at the top of a dashboard or report: total events, failed logons, open alerts, risk score.
- A number whose change over a period matters: add `delta` (and `spark` for the trend).
- A number that leads to detail: `onClick` makes the whole card a button (open the filtered report).

## When not to use
- Several values that need comparing against each other: use a `Chart` or a `DataTable`.
- Status of one object (enabled, healthy): use a `ToneTag` or `Chip`.
- Long labels or explanations: the card holds a short label and one foot line.

## Anatomy
`KpiCard` renders `<div class="lf-card lf-card--lift lf-stat">`: white, radius 20, 1 px `--border-soft`, padding 20 20 0 (20 all round when there is no sparkline), a two-column grid.
1. Label `.lf-stat__label` (top-left): 600 13/18 `--ink-2`.
2. Delta chip `.lf-stat__row` (top-right, when `delta` is set): an `.lf-chip--{deltaTone}` pill 24 tall, padding 0 9, with an optional 11 px up or down arrow (`deltaDir`) before the text.
3. Value `.lf-stat__value`: 600 34/40, −0.04em (`--type-kpi`, `--type-kpi-ls`), ink, tabular figures, 14 px above.
4. Foot `.lf-stat__foot` (when `foot` is set): 500 12.5/18 `--ink-3` — the comparison period or context ("vs last 7 days").
5. Sparkline `.lf-stat__apx` (when `spark` is set): a full-bleed 56 px `Sparkline` along the bottom edge (it extends 20 px past both sides of the padding), 10 px below the foot. `sparkColor` sets its colour (default `#1c4599`).

Lay KPI cards out in a `.kpis` grid: 4 columns with a 16 px gap (2 columns under 1280 px, 1 under 620 px); its children rise in with a 40 ms stagger. For three cards use `.kpis kpis--3` (3 columns, same breakpoints).

## Variants and sizes
`deltaTone` (default `flat`) — choose by meaning, not by direction:
| Tone | Chip | Use |
|---|---|---|
| `good` | `--success-bg`, `--success-text` | The change is good (fewer failed logons, more coverage) |
| `warn` | `--warning-bg`, `--warning-text` | Worth watching |
| `bad` | `--danger-bg`, `--danger-text` | The change is bad (more alerts) |
| `flat` | `--surface-3`, `--ink-3` | No meaningful change, or neutral |
| `brand` | `--brand-50`, brand, `--brand-100` ring | Neutral highlight (a new or informational figure) |

`deltaDir`: `up` or `down` arrow, independent of tone (a `down` arrow can be `good`).

## States
| State | Behaviour |
|---|---|
| First render | A numeric value counts up from 0 to the target over 1.2 s (quartic ease-out), then shows with thousands separators ("12,480"). Counting runs again when the value changes |
| Non-numeric value | Strings that aren't only digits, commas, dots and spaces ("98%", "4 h 12 m", "—") show as given, with no count-up |
| Hover | The card lifts 2 px and gets `--sh-md` and a `--border` border |
| Clickable (`onClick`) | Pointer cursor, `role="button"`, focusable; Enter or Space calls `onClick` |
| Not clickable | Default cursor (it still lifts on hover) |
| Reduced motion | No count-up: the final value shows immediately |

The count-up keeps the value's own decimal places: `12.5` counts to "12.5", `"1,234.50"` to "1,234.50". Strings with a unit or symbol ("12.5%", "12.5 GB") don't animate and are shown unchanged.

## Accessibility
- The label and the value are separate paragraphs, read in order: "Failed logons, 1,204".
- With `onClick` the card is a `role="button"` with `tabIndex=0` and keyboard activation; its accessible name is all its text, so keep the label short and meaningful.
- The delta arrow is `aria-hidden`; put the direction in the `delta` text when it matters ("+12%", "−3 alerts").
- Tone is never the only signal: the delta text says what changed.
- The sparkline has no text alternative; don't put information only there.

## Do and don't
| Do | Don't |
|---|---|
| Short label, sentence case: "Failed logons" | "TOTAL NUMBER OF FAILED LOGON EVENTS" |
| Tone by meaning: fewer failures is `good` even with a `down` arrow | Red for every decrease, green for every increase |
| Raw numbers as `value` (`1204`) so they count up and get separators | Pre-formatted numeric strings with units when a plain number works |
| Four cards in a `.kpis` row | Mixed-height cards (some with sparklines, some without) in one row |
| `foot` for the comparison period | Repeat the label in the foot |

## Example
```tsx
import { KpiCard } from '@lepide/ds-react/charts';

<div className="kpis">
  <KpiCard label="Failed logons" value={1204} delta="−18%" deltaDir="down" deltaTone="good"
    foot="vs previous 7 days" spark={[220, 198, 240, 176, 150, 162, 140]} onClick={() => openReport('failed-logons')} />
  <KpiCard label="Open alerts" value={37} delta="+9" deltaDir="up" deltaTone="bad" foot="vs yesterday"
    spark={[22, 25, 24, 30, 28, 33, 37]} sparkColor="var(--chart-red)" />
  <KpiCard label="Monitored users" value={18450} delta="No change" foot="Across 3 domains" />
  <KpiCard label="Coverage" value="98.2%" delta="+0.4 pts" deltaDir="up" deltaTone="good" foot="Servers reporting" />
</div>
```

Plain HTML (with `@lepide/ds-css`, no count-up or sparkline):
```html
<div class="kpis">
  <div class="lf-card lf-card--lift lf-stat">
    <p class="lf-stat__label">Failed logons</p>
    <p class="lf-stat__value">1,204</p>
    <div class="lf-stat__row"><span class="lf-chip lf-chip--good">−18%</span></div>
    <p class="lf-stat__foot">vs previous 7 days</p>
  </div>
</div>
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `KpiCard`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` * | `string` | — |  |
| `value` * | `string \| number` | — |  |
| `delta` | `string` | — |  |
| `deltaTone` | `"brand" \| "good" \| "warn" \| "bad" \| "flat"` | `'flat'` |  |
| `deltaDir` | `"up" \| "down"` | — |  |
| `foot` | `string` | — |  |
| `spark` | `number[]` | — |  |
| `sparkColor` | `string` | — |  |
| `onClick` | `(() => void)` | — |  |

`*` required.
<!-- props:end -->
