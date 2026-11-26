---
title: Page header
exports: [PageHeader]
category: navigation
status: stable
summary: The top of every page — optional breadcrumbs, eyebrow, the page title (h2), an optional chip and description, and the page actions at the right.
classes: [crumbs, head, eyebrow, actions]
tokens: [--type-page-title, --type-eyebrow, --brand, --ink, --ink-2, --ink-3, --ink-4]
related: [providers, button, chip, card]
---

# Page header

## When to use
- Once at the top of every console page (dashboards, reports, settings, detail pages), directly above the page content.
- `crumbs` when the page sits below another page ("Reports › File server › Permission changes").
- `actions` for the page-level buttons (Refresh, Export, the single primary action).

## When not to use
- Titles of cards, dialogs or drawers: use `Card` / `SetCard` titles, `Modal` or `Drawer`.
- The home page hero, which has its own larger title.
- More than one per page.

## Anatomy
1. Breadcrumbs (`crumbs`, rendered when non-empty): `<nav class="crumbs" aria-label="Breadcrumb">`, a wrapping flex row, 8 px gap, 500 12.5/18 `--ink-3`, −12 px bottom margin so it tucks under the title. Items before the last are links (when `to` is set) or plain text; links turn `--brand` on hover. Separators are `<span aria-hidden="true">›</span>` in `--ink-4`, 14 px (the CSS styles separators by `aria-hidden="true"`, so always mark them that way). The last crumb is `<b aria-current="page">` in 600 `--ink-2` and is never a link.
2. Header row (`.head`): wrapping flex row, items aligned to the bottom, title block left and actions right, gap 16 vertical × 24 horizontal. The title block is at least `min(100%, 500px)` wide.
3. Eyebrow (`eyebrow`): `<p class="eyebrow">`, 600 12.5/16 `--brand` (`--type-eyebrow`), 4 px above the title.
4. Title (`title`): `<h2>`, 600 30/38, −0.035em, `--ink` (`--type-page-title`), balanced wrapping.
5. Chip (`chip`): rendered inside the `<h2>` after the title; the heading then becomes a flex row with a 10 px gap. Use a `Chip` or `ToneTag`.
6. Description (`description`): `<p>`, 400 14/21 `--ink-3`, max 72ch, 6 px below the title.
7. Extra content (`children`): rendered under the description inside the title block (for example a meta line or a `Segmented`).
8. Actions (`actions`): `.actions`, a right-aligned wrapping row with 8 px gaps.

Breadcrumb links use the link component from `LepideProvider` (a plain `<a href>` by default), so they go through your router.

## Variants and sizes
None.

Responsive: at 860 px and below the title is 26/32; at 620 px and below the actions row aligns left when it wraps under the title.

## States
| State | Change |
|---|---|
| Breadcrumb link hover | Text turns `--brand` (`--t-fast` colour transition) |
| Breadcrumb link focus | 2 px brand focus outline, offset 2 px |

## Accessibility
- The title is an `<h2>`; the app shell owns the `<h1>`. Card titles below are `<h3>`.
- Breadcrumbs are a `nav` landmark named "Breadcrumb"; the current page is marked `aria-current="page"`; separators are `aria-hidden`.
- Put page actions in `actions` so they come after the title in reading and tab order.
- When `chip` carries a status, use a `ToneTag` so the status is text, not only colour.

## Do and don't
| Do | Don't |
|---|---|
| Sentence-case titles that name the page ("Permission changes") | Title Case, or a title that repeats the breadcrumb trail |
| One primary button, last in `actions` | Several primaries or a primary on the left |
| A one-sentence `description` of what the page shows | Long help text; link to docs instead |
| Set `LepideProvider link` so crumbs use your router | Full page reloads from breadcrumb clicks in a single-page app |

`chip` sits inside the title, for a status of the page ("Live"). Anything that sits under the title — a meta chip such
as the dashboard name, page tabs, a filter row — goes in `children`.

## Example
```tsx
import { PageHeader, Button, IconButton, ToneTag } from '@lepide/ds-react';

<PageHeader
  crumbs={[
    { label: 'Reports', to: '/reports' },
    { label: 'File server', to: '/reports/file-server' },
    { label: 'Permission changes' },
  ]}
  eyebrow="File server"
  title="Permission changes"
  chip={<ToneTag tone="good">Live</ToneTag>}
  description="Every change to NTFS and share permissions on monitored file servers."
  actions={<>
    <IconButton icon="refresh" label="Refresh" bordered onClick={reload} />
    <Button icon="download" onClick={exportCsv}>Export</Button>
    <Button variant="primary" icon="plus" onClick={schedule}>Schedule report</Button>
  </>}
/>
```

Plain HTML (with `@lepide/ds-css`):
```html
<nav class="crumbs" aria-label="Breadcrumb">
  <a href="/reports">Reports</a><span aria-hidden="true">&rsaquo;</span><b aria-current="page">Permission changes</b>
</nav>
<div class="head">
  <div><h2>Permission changes</h2><p>Every change to NTFS and share permissions.</p></div>
  <div class="actions"><button class="lf-btn lf-btn--primary">Schedule report</button></div>
</div>
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `PageHeader`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` * | `ReactNode` | — |  |
| `crumbs` | `Crumb[]` | — |  |
| `eyebrow` | `ReactNode` | — |  |
| `chip` | `ReactNode` | — |  |
| `description` | `ReactNode` | — |  |
| `actions` | `ReactNode` | — |  |
| `children` | `ReactNode` | — |  |

### Types

```ts
// import type { Crumb } from '@lepide/ds-react'
type Crumb = { label: string; to?: string };
```

`*` required.
<!-- props:end -->
