---
title: Segmented
exports: [Segmented]
category: navigation
status: stable
summary: Pill-shaped segmented control that switches between two to five sibling views (tabs mode) or data filters (pressed mode).
classes: [seg, dash-switch]
tokens: [--seg-h, --sel-fill, --sel-shadow, --surface-3, --border-soft, --ink-3, --ink, --r-pill, --focus-outline]
related: [vertical-tabs, menu, button]
---

# Segmented

## When to use
- Switching between two to five sibling views of the same page ("Overview · Activity · Permissions"): `mode="tabs"` (default).
- Switching the data a view shows without changing the view ("Last 7 days · 30 days · 90 days", "All · Failed"): `mode="pressed"`.
- Showing a count per option (`count`), for example the number of items in each status.

## When not to use
- More than five options, or option labels that are long: use `Dropdown`.
- Section navigation inside a settings dialog: use `VerticalTabs`.
- Navigating to a different page: use links or the sidebar.
- A single on/off setting: use `Toggle`.
- Triggering an action: use `Button`.

## Anatomy
1. Track: pill (`--r-pill`), `--surface-3` fill, 1 px `--border-soft` border, padding 4, gap 2 between segments.
2. Segment: a `<button>`, 32 px tall (`--seg-h`), padding 0 14, pill, 600 12.5/1 text in `--ink-3`, 7 px gap to the count. Segments share the width equally (`flex: 1`).
3. Optional count badge (`count`): `<b>` pill, 18 px tall, min-width 20, padding 0 6, 700 10.5/1, `rgba(18,20,23,.07)` fill, `--ink-3` text.
4. Selected segment: the selected finish — `--sel-fill` blue gradient, white text, `--sel-shadow`; its count badge turns white text on 18 % white.

## Variants and sizes
| Variant | Class | Behaviour |
|---|---|---|
| Default | `.seg` | Fills its container; segments share the width equally |
| `hug` | `.dash-switch` | Track and segments size to their labels (`flex: none`) |

| Mode | Container role | Segment state |
|---|---|---|
| `tabs` (default) | `role="tablist"` | `role="tab"`, `aria-selected`, roving `tabIndex` (only the selected segment is in the tab order) |
| `pressed` | `role="group"` | `aria-pressed`, every segment is in the tab order |

Any combination works: both layouts (`.seg` full width, `.dash-switch` with `hug`) style the selected segment from
`aria-selected="true"` (tabs) or `aria-pressed="true"` (filter), and both style count badges. A data filter with
counts — "All 6 · Open 4 · Resolved 2" above a table — is `mode="pressed"` (usually with `hug`), placed under the
page header (`PageHeader` children) or in the table card's toolbar.

One size: 32 px segments in a 42 px track.

## States
| State | Change |
|---|---|
| Rest | `--ink-3` text on the `--surface-3` track |
| Hover | Text turns `--ink` |
| Selected | `--sel-fill`, white text, `--sel-shadow` |
| Focus | 2 px brand outline (`--focus-outline`), offset 2 px |
| Disabled (`item.disabled`) | Native `disabled`; skipped by arrow-key navigation |

Background, colour and shadow transition over `--t-base` / `--t-fast`; reduced motion shortens them to 1 ms.

## Accessibility
- Pass `ariaLabel` to name the group ("Report period"); it becomes `aria-label` on the track.
- Keyboard (on the track): `ArrowLeft` / `ArrowRight` move the selection to the previous / next enabled segment and wrap; `Home` / `End` select the first / last enabled segment. Selection follows focus: the arrow keys call `onChange` immediately and focus moves to the new selected segment.
- `mode="tabs"` exposes the tablist pattern but does not set `aria-controls`; give the panel `role="tabpanel"` and an `aria-labelledby` yourself if needed.
- Selection is not colour alone: the selected segment has a filled, raised finish and the ARIA state.

## Do and don't
| Do | Don't |
|---|---|
| Two to five short, sentence-case labels | Long labels that wrap or truncate |
| `mode="pressed"` when the control filters the data on screen | `role="tab"` semantics for a data filter |
| `hug` when the control sits beside other content | A full-width `.seg` squeezed into a toolbar |
| Always keep one segment selected | Use a segmented control as a multi-select |
| Name the group with `ariaLabel` | Rely on surrounding text to explain what it switches |

## Example
```tsx
import { Segmented } from '@lepide/ds-react';

const [view, setView] = useState('overview');
const [period, setPeriod] = useState('7d');

<Segmented
  ariaLabel="Report sections"
  value={view}
  onChange={setView}
  items={[
    { value: 'overview', label: 'Overview' },
    { value: 'changes', label: 'Changes', count: 128 },
    { value: 'permissions', label: 'Permissions', count: 12 },
  ]}
/>

<Segmented
  mode="pressed"
  hug
  ariaLabel="Period"
  value={period}
  onChange={setPeriod}
  items={[
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days', disabled: !hasHistory },
  ]}
/>
```

Plain HTML (with `@lepide/ds-css`):
```html
<div class="seg" role="tablist" aria-label="Report sections">
  <button type="button" role="tab" aria-selected="true">Overview</button>
  <button type="button" role="tab" aria-selected="false" tabindex="-1">Changes <b>128</b></button>
</div>
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `Segmented`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` * | `SegItem[]` | — |  |
| `value` * | `string` | — |  |
| `onChange` * | `(v: string) => void` | — |  |
| `mode` | `"tabs" \| "pressed"` | `'tabs'` |  |
| `ariaLabel` | `string` | — |  |
| `hug` | `boolean` | — |  |
| `className` | `string` | — |  |

### Types

```ts
// import type { SegItem } from '@lepide/ds-react'
type SegItem = { value: string; label: ReactNode; count?: number; disabled?: boolean };
```

`*` required.
<!-- props:end -->
