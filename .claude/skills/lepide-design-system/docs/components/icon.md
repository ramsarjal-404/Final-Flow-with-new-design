---
title: Icon
exports: [Icon, ModuleIcon, BrandMark, MARK_URL]
category: display
status: stable
summary: Thin Lucide-style line icons (1.6 stroke, currentColor), the product module glyphs, and the Lepide mark in its white tile.
classes: [lf-i, lf-dock__mark]
tokens: [--icon-xs, --icon-sm, --icon-md, --icon-nav, --icon-tile, --icon-lg, --icon-stroke, --surface, --sh-xs, --border-soft]
related: [button, chip, empty-state, menu]
---

# Icon

## When to use
- `Icon` for every line icon in the UI: inside buttons (via their `icon` prop), menus, chips, fields, banners, empty states and table cells.
- `ModuleIcon` for the Lepide product modules (Auditor, Detect, Protect, …) in the sidebar, home tiles and Lepide AI surfaces.
- `BrandMark` for the Lepide logo in the sidebar, top bar and sign-in page.
- `MARK_URL` (the mark as an SVG data URL) where you need the image itself: a favicon, an `<img>` outside the tile, a plain-HTML page.

## When not to use
- Filled, duotone or emoji icons, or icons from other sets mixed in: the system uses one outline style.
- An icon as the only content of a control without a name: use `IconButton` (it requires `label`).
- Status meaning carried by an icon alone: pair it with text, or use `ToneTag`.
- Most components take an `icon` prop (`Button`, `Chip`, `Menu` items, `EmptyState`); pass the name there rather than nesting an `<Icon>`.

## Anatomy
**Icon**: `<svg class="lf-i" viewBox="0 0 24 24" aria-hidden="true">`, sized by `size` (default 16 px) through `width`/`height` attributes and inline style. `svg.lf-i` supplies `fill: none`, `stroke: currentColor`, stroke-width 1.6 (`--icon-stroke`), round caps and joins, `flex: none`. The icon takes the text colour of its parent. An unknown `name` renders an empty svg.

Container CSS often overrides the size: chips 12 px (stroke 2), menu items 15 px, buttons and fields 16 px, banners 16 px, vertical tabs 16 px.

**ModuleIcon**: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">`, default 20 px (`size`). The glyphs draw with `currentColor`; there is no `lf-i` class.

**BrandMark**: `<span class="lf-dock__mark">` — a 36 × 36 white tile (`--surface`), radius 11, `--sh-xs` plus a 1 px inset `--border-soft` ring — holding the mark as a 24 × 24 `<img alt="">` (the mark is `brand/lepide-mark.svg`, sky blue `#2498D4`). `size` changes the tile only; the image stays 24 px.

## Variants and sizes
Size tokens (pass the number to `size`):

| Token | px | Typical use |
|---|---|---|
| `--icon-xs` | 12 | Chips, sort arrows, filter inputs |
| `--icon-sm` | 14 | Small buttons, tree children, dismiss `x` |
| `--icon-md` | 16 | Default: buttons, fields, banners |
| `--icon-nav` | 19 | Sidebar navigation |
| `--icon-tile` | 20 | Module tiles (`ModuleIcon` default) |
| `--icon-lg` | 24 | Empty states |

**Line icon names** (`IconName`) — every key of `line` in `packages/react/src/assets/icons.json`, the single source
of icon paths (in plain HTML, copy the value into `<svg class="lf-i" viewBox="0 0 24 24">…</svg>`): `settings` `chevron` `arrow` `plus` `search` `calendar` `refresh` `external` `share` `up` `down` `eye` `folder` `file` `filter` `download` `user` `logout` `collapse` `chevron-right` `chevrons-left` `chevrons-right` `check` `x` `minus` `sort` `trash` `chevron-left` `lock` `sparkles` `star` `bell` `users` `clipboard` `home` `mail` `file-search` `edit` `more` `info` `alert` `upload` `server` `database` `globe` `key` `shield` `clock` `play` `pause` `link` `copy` `layers` `archive` `list` `sliders` `plug` `card` `history` `restore` `send` `terminal` `cpu` `tag` `cloud` `building` `user_plus` `save` `grid`

Note the underscore in `user_plus`. `more` is three horizontal dots (row actions).

**Module icon names** (`ModuleIconName`): `ai` `auditor` `trust` `detect` `protect` `identify` `mylepide` `dashboards` `settings`

## States
None. Icons follow their container's colour, so hover, selected and disabled colours come from the parent (for example ink-3 at rest, ink on hover, white inside a selected item).

## Accessibility
- All three are decorative: `Icon` and `ModuleIcon` are `aria-hidden="true"`, and `BrandMark`'s image has `alt=""`. The accessible name must come from visible text or an `aria-label` on the control.
- Next to `BrandMark`, show the product name as text ("Lepide").
- Never use an icon as the only indicator of state; selected states also change fill and ARIA attributes.

## Do and don't
| Do | Don't |
|---|---|
| Use names from the lists above | Paste other SVGs or icon fonts |
| Let icons inherit colour from their container | Hard-code icon colours |
| 1.6 stroke outlines everywhere | Filled or mixed icon styles |
| `IconButton` with `label` for icon-only actions | A bare `<Icon>` inside a `<button>` with no name |
| `ModuleIcon` only for the product modules | Module glyphs as generic UI icons |

## Example
```tsx
import { Icon, ModuleIcon, BrandMark, MARK_URL } from '@lepide/ds-react';

<span className="row">
  <Icon name="server" />
  FS-01.corp.local
</span>

<span className="row"><ModuleIcon name="auditor" /> Auditor</span>

<span className="row"><BrandMark size={34} /> <b>Lepide</b></span>
```

Plain HTML (with `@lepide/ds-css`):
```html
<svg class="lf-i" viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
</svg>
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `Icon`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `name` * | `IconName` | — |  |
| `size` | `number` | `16` |  |
| `className` | `string` | — |  |

### `ModuleIcon`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `name` * | `ModuleIconName` | — |  |
| `size` | `number` | `20` |  |

### `BrandMark`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `size` | `number` | `36` |  |

### `MARK_URL` (constant)

```ts
const MARK_URL: string
```

URL of the Lepide mark SVG (a data URL), for <img>, favicons or a plain-HTML page.

### Types

```ts
// import type { IconName } from '@lepide/ds-react'
type IconName = keyof typeof icons.line;
// import type { ModuleIconName } from '@lepide/ds-react'
type ModuleIconName = keyof typeof icons.module;
```

`*` required.
<!-- props:end -->
