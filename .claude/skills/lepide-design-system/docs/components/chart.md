---
title: Chart
exports: [Chart, Sparkline, chartColor, PALETTE]
category: data
status: stable
summary: Highcharts-based charts in the Lepide Design System theme — one Chart component with a kind per product chart type (columns, stacked, bars, areas, lines, donuts, gauges, rings, bubbles), plus a borderless Sparkline. Imported from '@lepide/ds-react/charts'.
classes: [atl-chart, atl-chart__center, is-big, is-small, atl-tip, atl-tip__head, atl-tip__body, atl-tip__row, sr-only, lf-card, lf-card__title]
tokens: [--c1, --c2, --c3, --c4, --c5, --c6, --chart-text, --chart-grid, --chart-track, --font, --sh-md, --border, --border-soft, --surface, --surface-2, --ink, --ink-3]
related: [kpi-card, data-table, empty-state, loading]
---

# Chart

## When to use
- Any chart on a dashboard, report summary or record page. Pick the `kind` from the table below by the question the chart answers.
- `Sparkline` for a tiny trend with no axes — normally inside `KpiCard` (`spark` prop), occasionally in a table cell or list row.

Set-up:
- Import from the separate entry: `import { Chart, Sparkline } from '@lepide/ds-react/charts'`. The main `@lepide/ds-react` entry does not include charts, so apps without charts don't load Highcharts.
- Install the peer dependency `highcharts` `^13.1.1` (optional peer of `@lepide/ds-react`). The component loads `highcharts-more` and `solid-gauge` itself. **Highcharts is commercial software: a Highcharts licence is required before it ships in a product.**

## When not to use
- Exact values the user will read or copy: use a `DataTable` (or show both).
- One number: use `KpiCard`.
- More than 6 series or about 8 donut slices: the palette repeats after 6 colours; group the tail into "Other" or use a table.
- No data: show an `EmptyState` in the panel instead of an empty chart.

## Anatomy
`Chart` renders `<figure class="atl-chart">` containing:
1. The Highcharts plot, `height` px tall (default 270; use 300 in a wide panel). No chart title — the card header (`.lf-card__title`) is the title. Transparent background, Manrope, no credits.
2. Axes: labels 11 px `--chart-text` (`#666b74`), no axis lines or ticks, horizontal grid `--chart-grid` (`#eceef1`). Category labels wrap under their column instead of tilting; `dd-mm-yyyy` (or `/`) and `yyyy-mm-dd` labels are shortened to `20 Nov`; other labels (`28 Oct`, `Mon`) show as written.
3. Legend: top-left, 600 12 px `#4a4f58`, 8 px round symbols, 22 px between items. Shown when there is more than one series, and always for donuts and rings (bottom centre there). `options.legend` forces it on or off.
4. Tooltip `.atl-tip`: white card, 1 px `--border`, radius 12, `--sh-md`; head row on `--surface-2` with the category in 700 ink; rows of an 8 px colour dot, series name and value (700, tabular). Multi-series kinds share one tooltip per category. Donut, gauge and ring kinds have no tooltip — the centre label shows the hovered part.
5. Centre label `.atl-chart__center` (donuts, speedometer, rings): value 600 28 px ink over a 500 12 px `--ink-3` caption. `.is-big` (speedometer): 36 px value, caption in the band colour. `.is-small` (rings): 19 px value, 80 px max width.
6. A visually hidden data table (`.sr-only`) with `title` as its caption.

Series colours follow `--c1`…`--c6`: `#1c4599`, `#ee8a5f`, `#b8c8f0`, `#4f72c4`, `#f5c39e`, `#8aa3dc`. Leave `color` out to take them in order, or name one as `var(--c1)` … `var(--c6)`. Older screens use product colour names; they map into the same palette, so the names don't mean the hue:

| Name | Colour |
|---|---|
| `var(--chart-green)`, `var(--dch-emerald)` | `#1c4599` blue |
| `var(--chart-red)`, `var(--dch-orange)` | `#ee8a5f` coral |
| `var(--chart-yellow)`, `var(--dch-violet)`, `var(--dch-lime)` | `#b8c8f0` light blue |
| `var(--dch-blue)`, `var(--dch-bubble-blue)` | `#4f72c4` |
| `var(--dch-salmon)` | `#f5c39e` peach |
| `var(--dch-blue-soft)`, `var(--dch-lime-side)` | `#8aa3dc` |
| `var(--dch-crimson)` | `#cf3a3f` red — only for the worst band of a risk gauge |

Red, amber and green mean status, so a chart uses them only where the value is a status (a risk gauge's bands). A hex written in `color` is drawn as given: keep it to the palette. Unknown names fall back to the palette by position.

`Sparkline`: `<div class="atl-chart">`, an area spline with a 2 px line and a 22 % → 0 % fill gradient, no axes, legend or grid; default 56 px tall, colour `#1c4599`; hover shows a "Value" tooltip.

## Variants and sizes
Every `ChartKind`, its `data` shape and when to use it:

| `kind` | `data` | Use for | Look |
|---|---|---|---|
| `columns` | `{ labels: string[], values: number[], colors?: string[], name? }` | Comparing a few categories (counts by type, by server) | Vertical columns, one palette colour per column, radius 8 on top, max 64 px wide |
| `dateColumns` | `{ labels: string[] (dates), values: number[], color?, name? }` | A count per day or week | One colour, radius 4, narrower gaps |
| `stacked` | `{ cats \| labels: string[], series: { name, values: number[], color? }[] }` | Totals per category split into parts (events by outcome per day) | Stacked columns, radius 7 on the top of each stack. `options.stacked: false` draws them side by side |
| `pairedBars` | `{ rows: string[], series: { name, values: number[], color? }[] }` | Ranking long category names, comparing 2–3 measures per row (top users: reads vs writes) | Horizontal bars, radius 5, 2 px white separators, labels truncated at 90 px |
| `areaBars` | `{ bars: number[], line: number[], labels: string[], markers?: number[], barName?, lineName? }` | Volume per period with a trend over it | Pale blue gradient columns under a 3 px `#1c4599` spline with a soft shadow and an 18 % → 0 % wash. Only bars whose index is in `markers` get an axis label: `markers[k]` is labelled `labels[k]`. Value axis 0 to the next multiple of 25, 4 dashed intervals |
| `multiArea` | `{ labels: string[], series: { name, values: number[], color?, legendColor? }[] }` | Trends of 1–4 measures over time where volume matters | 2.5 px splines with a 28 % → 2 % fill; dashed `#c9cfd8` crosshair. Values beyond `labels.length` are dropped |
| `line` | same as `multiArea` | Trends over time where only the shape matters, or many overlapping series | 2.5 px splines, no fill |
| `donut` | `{ segments: { label, value, color? }[], value?, caption?, startAngle?, showValues? }` | Share of a whole, 2–6 parts | 72 % hole, 3 px white borders; centre shows `value` (or the sum) and `caption` (default "Total") |
| `calloutDonut` | same as `donut` | Share of a whole where percentages must be visible | Donut with white percentage labels on the slices (`showValues` defaults to `true`) |
| `gaugeDonut` | same as `donut` | Product "gauge donut" screens | Drawn exactly like `donut` |
| `donut3d` | same as `donut` | Product "3D donut" screens | Drawn flat, like `calloutDonut` with percentages always on |
| `speedometer` | `{ value: number, max?: number (100), name?, bands: { to: number, label, color? }[] }` | One score against thresholds (risk score, health) | Solid gauge from −120° to 120°, 72 % hole, round caps, `--chart-track` background. The band is the first with `value <= to`; the arc is a gradient from the band colour; centre shows the rounded value and the band label in its colour |
| `rings` | `{ rings: { label, value: number (0–100), color? }[] }` | 2–4 percentages side by side (coverage, completion) | Concentric 360° solid gauges down to a 38 % hole on `--chart-track`; centre shows the first ring, or the hovered one |
| `bubbles` | `{ points: { label, x, y, size, color? }[] }` | Three measures per item (count, duration, impact) | Bubbles 12–52 px, opacity .78, 1.5 px white borders; points with the same `label` form one series; tooltip lists x, y and size |

`ChartOptions` (`options` prop):
| Field | Effect |
|---|---|
| `y: { min, max, ticks, format }` | Fixed value axis; `ticks` is the number of intervals between `min` and `max`; `format(v)` formats the labels |
| `legend` | Force the legend on (`true`) or off (`false`) |
| `markers` | Always show point markers on lines and areas (default: only on hover) |
| `stacked` | `stacked` kind only: `false` draws the series side by side |
| `onPoint(series, point)` | Click on any point, with series and point index |
| `raw` | Highcharts options merged last — a last resort |

## States
| State | Behaviour |
|---|---|
| Load | 800 ms quartic ease-out: columns grow, lines draw, slices sweep |
| Data change | The chart updates in place and animates. It only rebuilds when `kind`, `data`, `height` or `options` change in content (new object literals with the same values don't re-render) |
| Hover, columns and bars | Hovered column widens 14 % and lifts on a blue drop shadow; others fade to 32 %; a 5 % blue band marks the category |
| Hover, lines and areas | Dashed crosshair; the point becomes a 6 px dot with a white ring and a halo |
| Hover, donut | The slice slides out 9 px, others fade to 40 %, the centre swaps to the slice's value and "name · N%" in its colour |
| Hover, rings and gauges | The ring brightens, others fade, the centre shows that ring |
| Hover, bubbles | The bubble grows 10 % on a shadow, others fade |
| Clickable | `onSelect(label, index)` or `options.onPoint` give every point a pointer cursor. `label` is the slice name (donuts), the ring or series name (rings, speedometer — `index` is then the series index), else the category or series name |
| Reduced motion | No load or hover animation, no slice pop-out; state changes still show |

## Accessibility
- Highcharts' own accessibility module is turned off. Instead every `Chart` renders a visually hidden `<table>` captioned with `title`: one row per category, slice, ring or point with its values (e.g. "Mon — Success 120, Failed 8"). For `areaBars` the rows are "Point 1…n" with "bar / line" values.
- `title` also becomes the figure's `aria-label`. Always pass it, matching the visible card heading.
- The centre label is `aria-hidden` (its content is in the table).
- Never encode meaning in colour alone: legends name every series, and the tooltip and table give the numbers.
- `Sparkline` has no text alternative; it is decoration next to a number (in `KpiCard` the value and delta carry the meaning).

## Do and don't
| Do | Don't |
|---|---|
| Put the chart in a card whose header is the title; pass the same text as `title` | Add a title inside the chart |
| Choose the kind by the question: share → `donut`, trend → `multiArea`/`line`, ranking → `pairedBars` | Donuts for trends, or lines for unordered categories |
| Use the palette order, `var(--c1)` … `var(--c6)` or the product colour names | Hard-code hex colours outside the palette, or pick colours by their names' hue (`--chart-red` is coral, not red) |
| `height={300}` in wide panels, default 270 elsewhere | Very short charts that squash the axis |
| An `EmptyState` when there is no data | An empty plot with only axes |
| Get a Highcharts licence before shipping | Ship Highcharts in a product unlicensed |

## Example
```tsx
import { Card } from '@lepide/ds-react';
import { Chart } from '@lepide/ds-react/charts';

<Card title="Logon outcomes">
  <Chart kind="stacked" title="Logon outcomes"
    data={{
      cats: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      series: [
        { name: 'Successful', values: [1200, 1340, 1280, 1410, 990] },
        { name: 'Failed', values: [42, 38, 61, 25, 30], color: 'var(--chart-red)' },
      ],
    }}
    onSelect={(day) => openEvents({ day })} />
</Card>

<Card title="Permissions by type">
  <Chart kind="donut" title="Permissions by type"
    data={{ caption: 'Permissions', segments: [
      { label: 'Explicit', value: 412 }, { label: 'Inherited', value: 1890 }, { label: 'Open access', value: 64 },
    ] }} />
</Card>

<Chart kind="speedometer" title="Risk score" height={220}
  data={{ value: 68, name: 'Risk', bands: [
    { to: 40, label: 'Low', color: 'var(--c1)' }, { to: 70, label: 'Medium', color: 'var(--c2)' }, { to: 100, label: 'High', color: 'var(--dch-crimson)' },
  ] }} />
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `Chart`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `kind` * | `keyof ChartData` | — | Which chart to draw; it decides the shape of `data` (see ChartData). |
| `data` * | `keyof ChartData extends K ? Record<string, unknown> : ChartData[kind]` | — | The shape for this `kind` (ChartData), checked when `kind` is a literal. A `kind` only known as ChartKind accepts any object. |
| `height` | `number` | `270` |  |
| `title` | `string` | — | Accessible name and the caption of the text alternative (the card header stays the visible title). |
| `onSelect` | `((label: string, index: number) => void)` | — | Click-through from a category or segment. |
| `options` | `ChartOptions` | — |  |

### `Sparkline`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `data` * | `number[]` | — |  |
| `color` | `string` | `'#1c4599'` |  |
| `height` | `number` | `56` |  |

### `chartColor` (function)

```ts
function chartColor(c: string | undefined, i?: number): string
```

Resolve a product colour (`var(--chart-red)`, a hex, or nothing) to an Lepide Design System colour.

### `PALETTE` (constant)

```ts
const PALETTE: string[]
```

### Types

```ts
// import type { ChartColor } from '@lepide/ds-react/charts'
type ChartColor = string;
// import type { ChartSeries } from '@lepide/ds-react/charts'
type ChartSeries = { name: string; values: number[]; color?: ChartColor };
// import type { ChartData } from '@lepide/ds-react/charts'
type ChartData = { /** One series, one colour per bar (categories). */ columns: { labels: string[]; values: number[]; name?: string; colors?: (ChartColor | undefined)[] }; /** One series over time (a count per day or week), one colour. */ dateColumns: { labels: string[]; values: number[]; name?: string; color?: ChartColor }; /** Several series per category, stacked (or side by side with `options.stacked = false`). `cats` is the older name of `labels`. */ stacked: { labels?: string[]; cats?: string[]; series: ChartSeries[] }; /** Horizontal bars, several series per row. */ pairedBars: { rows: string[]; series: ChartSeries[] }; /** Soft bars with a trend line over them. One label per bar (`labels.length === bars.length`) labels every bar; * to label only some bars, give `markers` (bar indexes) and one label per marker: `labels[k]` labels bar `markers[k]`. */ areaBars: { bars: number[]; line: number[]; labels: string[]; markers?: number[]; barName?: string; lineName?: string }; /** Filled areas, several series over time. */ multiArea: { labels: string[]; series: (ChartSeries & { legendColor?: ChartColor })[] }; /** Lines, several series over time. */ line: { labels: string[]; series: ChartSeries[] }; donut: DonutData; /** Donut with percentages on the slices. */ calloutDonut: DonutData; /** Donut that reads as a gauge (e.g. a score out of a total). */ gaugeDonut: DonutData; /** Drawn as a flat donut with percentages. */ donut3d: DonutData; /** Concentric percentage rings, 0–100 each. */ rings: { rings: { label: string; value: number; color?: ChartColor }[] }; /** Scatter of sized points, grouped by `label`. */ bubbles: { points: { label: string; x: number; y: number; size: number; color?: ChartColor }[] }; /** A score on a 240° gauge; the band the value falls in names and colours it. */ speedometer: { value: number; max?: number; name?: string; bands: { to: number; label: string; color?: ChartColor }[] }; };
// import type { ChartOptions } from '@lepide/ds-react/charts'
type ChartOptions = { /** Fixed value axis: `ticks` is the number of intervals between min and max. */ y?: { min?: number; max?: number; ticks?: number; format?: (v: number) => string }; /** Force the legend on or off (default: on when there's more than one series). */ legend?: boolean; /** Always show point markers on line and area series (default: only on hover). */ markers?: boolean; /** `stacked` kind only: false draws the series side by side. */ stacked?: boolean; /** Click on any point: series and point index. */ onPoint?: (series: number, point: number) => void; /** Last-resort Highcharts options, merged last. */ raw?: Highcharts.Options; };
```

`*` required.
<!-- props:end -->
