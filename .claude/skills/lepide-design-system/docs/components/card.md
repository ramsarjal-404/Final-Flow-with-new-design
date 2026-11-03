---
title: Card
exports: [Card, SetCard, KeyValues]
category: display
status: stable
summary: White rounded containers. Card for content panels, SetCard for settings sections with head, body and footer, KeyValues for read-only field tiles.
classes: [lf-card, lf-card__title, lf-card--lift, set-card, set-card__head, set-card__body, set-card__foot, actions, kv, kv--3, kv--wide, lf-na, lf-muted]
tokens: [--card-radius, --card-pad, --card-gap, --r-lg, --r-md, --surface, --surface-2, --border-soft, --border, --sh-sm, --sh-md, --type-card-title, --ink, --ink-3, --ink-4]
related: [page-header, empty-state, button, chip]
---

# Card

## When to use
- `Card`: any content block on a page — a chart panel, a table, a list, a summary. Cards float on the washed canvas.
- `SetCard`: one section of a settings or configuration page, with a title, a description, optional header actions, a body of fields and an optional footer of buttons.
- `KeyValues`: read-only details of a record (detail panels, review steps of a wizard, "About this agent").

## When not to use
- Grouping a few fields inside a form: use spacing or a `.section-label`, not a nested card.
- Cards inside cards: use `KeyValues` tiles or plain sections instead.
- KPI numbers: use `KpiCard`.
- Editable values: `KeyValues` is read-only; use form fields.

## Anatomy
**Card** (`<section class="lf-card">`)
1. Container: `--surface` fill, 1 px `--border-soft` border, radius 20 (`--card-radius` / `--r-lg`), padding 20 (`--card-pad`), `--sh-sm` shadow.
2. Optional title (`title`): `<h3 class="lf-card__title">`, 700 15/22 −0.01em (`--type-card-title`), `--ink`, 14 px bottom margin; a flex row with the subtitle pushed to the right.
3. Optional subtitle (`sub`, needs `title`): a `<small>` inside the title, 500 12.5/18 `--ink-3`, baseline-aligned at the right.
4. Body: `children`, unstyled.

**SetCard** (`<section class="lf-card set-card">`, padding 0)
1. Head (`.set-card__head`, rendered when `title` or `actions` is set): padding 18 20 14, 1 px `--border-soft` bottom hairline; `<h3>` 700 15/22 `--ink`; description `<p>` 400 13/19 `--ink-3`, 3 px above; actions at the right in `.actions` (wrapping row, 8 px gap).
2. Body (`.set-card__body`, rendered when `children` is not `undefined`): padding 20, flex column, 16 px gap. `bodyStyle` is applied here.
3. Footer (`.set-card__foot`, when `footer` is set): padding 14 20, `--surface-2` fill, top hairline, items right-aligned with 8 px gap. A `.lf-muted` child is pushed to the left (use it for "Last saved …").

**KeyValues** (`<dl class="kv">`)
1. Grid of 2 equal columns (`cols={3}` → 3, `.kv--3`), 8 px gap; one column at 620 px and below.
2. Tile: `--surface-2` fill, radius 14 (`--r-md`), padding 12 14, 4 px gap.
3. `<dt>` label 600 12/16 `--ink-3`; `<dd>` value 600 13.5/20 `--ink`, long values wrap anywhere.
4. `wide: true` makes a tile span the full row (`.kv--wide`).
5. An empty string, `null` or `undefined` value shows an em dash in `--ink-4` (`.lf-na`).

## Variants and sizes
| Variant | How | Effect |
|---|---|---|
| `flush` | `<Card flush>` | Padding 0 (inline style) — for tables or charts that run to the card edge |
| `actions` | `<Card title="…" actions={<IconButton …/>}>` | Small tools at the right of the title (`.lf-card__head` + `.lf-card__actions`) — e.g. a dashboard panel's refresh and menu |
| Lift on hover | `className="lf-card--lift"` | Hover: `--sh-md` and `--border` — only for cards that are clickable |
| `cols` | `<KeyValues cols={3}>` | 3 columns instead of 2 |

## States
| State | Change |
|---|---|
| Rest | `--sh-sm`, `--border-soft` |
| Hover (`.lf-card--lift` only) | `--sh-md`, `--border`; shadow and border transition over `--t-base` |
| High contrast theme | Cards get a 1 px `--border` border |

## Accessibility
- `Card` and `SetCard` render `<section>`; their titles are `<h3>`. Keep the heading order of the page: the page title is the `<h2>` from `PageHeader`.
- A `<section>` without a title has no accessible name; for an untitled card that should be a landmark, pass `aria-label` through a wrapper (the component does not forward extra props).
- `KeyValues` renders a real `<dl>` with `<dt>` / `<dd>` pairs, so label and value are announced together.
- The em dash for empty values is read as "dash"; if that matters, pass explicit text such as "Not set".

## Do and don't
| Do | Don't |
|---|---|
| White cards with 16 px gaps (`--card-gap`) on the canvas | Full-width bordered boxes or heavy dividers |
| `flush` for a table that fills the card | Add padding around a table inside a padded card |
| `SetCard` footer with the save button rightmost | Save buttons scattered in the body |
| `KeyValues` for read-only record details | Disabled inputs to show read-only values |
| `lf-card--lift` only when the whole card is a link | Hover lift on static cards |

## Example
```tsx
import { Card, SetCard, KeyValues, Button, TextField, ToneTag } from '@lepide/ds-react';

<Card title="Top changed servers" sub="Last 30 days">
  <ol style={{ margin: 0, paddingLeft: 'var(--s5)', display: 'grid', gap: 'var(--s2)' }}>
    {servers.map((s) => <li key={s.name}>{s.name} · {s.changes} changes</li>)}
  </ol>
</Card>

<SetCard
  title="Email notifications"
  description="Where alert emails are sent from."
  actions={<Button size="sm" icon="send" onClick={sendTest}>Send test</Button>}
  footer={<><span className="lf-muted">Last saved 2 hours ago</span><Button>Cancel</Button><Button variant="primary">Save</Button></>}
>
  <TextField label="SMTP server" value={smtp} onChange={setSmtp} />
</SetCard>

<KeyValues
  items={[
    { label: 'Server', value: 'FS-01.corp.local' },
    { label: 'Status', value: <ToneTag tone="good">Running</ToneTag> },
    { label: 'Last event', value: lastEvent },
    { label: 'Description', value: agent.description, wide: true },
  ]}
/>
```

Plain HTML (with `@lepide/ds-css`):
```html
<section class="lf-card">
  <h3 class="lf-card__title">Top changed servers<small>Last 30 days</small></h3>
  …
</section>
<dl class="kv">
  <div><dt>Server</dt><dd>FS-01.corp.local</dd></div>
  <div class="kv--wide"><dt>Description</dt><dd><span class="lf-na">—</span></dd></div>
</dl>
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `Card`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `ReactNode` | — |  |
| `sub` | `ReactNode` | — |  |
| `actions` | `ReactNode` | — |  |
| `children` | `ReactNode` | — |  |
| `className` | `string` | — |  |
| `style` | `CSSProperties` | — |  |
| `flush` | `boolean` | — |  |

### `SetCard`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `ReactNode` | — |  |
| `description` | `ReactNode` | — |  |
| `actions` | `ReactNode` | — |  |
| `children` | `ReactNode` | — |  |
| `footer` | `ReactNode` | — |  |
| `bodyStyle` | `CSSProperties` | — |  |

### `KeyValues`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` * | `{ label: string; value: ReactNode; wide?: boolean \| undefined; }[]` | — |  |
| `cols` | `2 \| 3` | `2` |  |

`*` required.
<!-- props:end -->
