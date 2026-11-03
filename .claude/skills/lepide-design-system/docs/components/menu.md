---
title: Menu
exports: [Menu]
category: navigation
status: stable
summary: A trigger plus an anchored popover menu of actions (.pop), with icons, separators, selected and danger items, and disabled items that explain why.
classes: [rel, pop, pop--left, pop--up, pop__item, pop__item--danger, pop__sep, pop__head, lf-i]
tokens: [--menu-item-h, --surface, --surface-2, --border, --border-soft, --r-md, --r-xs, --sh-md, --ink, --ink-2, --ink-3, --ink-4, --brand, --danger-bg, --danger-text]
related: [button, tooltip, segmented, icon]
---

# Menu

## When to use
- A "more actions" button on a row, card or page header (`IconButton icon="more"`).
- A button that opens a short list of related actions ("Export ▾" → CSV, PDF, Schedule…).
- A small custom popover (a few checkboxes, a short form) anchored to a button: pass `children` instead of `items`.

## When not to use
- Choosing a value for a form field: use `Dropdown`, `SearchSelect` or `MultiSelect`.
- Switching views: use `Segmented`.
- A single action: use a `Button`.
- Navigation menus of the app shell (sidebar, account menu): those have their own components.

## Anatomy
1. Wrapper: `<span class="rel">`, inline-flex, `position: relative` — the anchor for the popover.
2. Trigger: whatever `trigger(props)` returns. Spread the props onto a button: `onClick` toggles the menu, plus `aria-expanded` and `aria-haspopup="menu"`.
3. Popover (`.pop`, `role="menu"`): absolute, 8 px below the trigger, right-aligned; `--surface` fill, 1 px `--border`, radius 14 (`--r-md`), padding 6, 2 px gap, `--sh-md`, z-index 40, min-width 200 (`width` raises the min-width). Opens with `pop-in` (fade and 4 px rise, `--t-fast`).
4. Item (`.pop__item`, `role="menuitem"`): full-width `<button>`, min-height 36 (`--menu-item-h`), padding 0 10, radius 8 (`--r-xs`), 10 px gap, 500 13/18 `--ink-2`; optional 15 px `--ink-3` icon, then the label.
5. Separator (`separator: true`): `.pop__sep`, 1 px `--border-soft` line with 4 6 margin.
6. Custom content (`children(close)`): replaces the item list; call `close()` when done. `.pop__head` (600 12/16 `--ink-3`, padding 6 10 4) is available for a small section heading.

## Variants and sizes
| `align` | Placement |
|---|---|
| `right` (default) | Below the trigger, right edges aligned; grows to the left |
| `left` | Below the trigger, left edges aligned (`.pop--left`) |
| `up` | Above the trigger, 6 px gap, right-aligned (`.pop--up`) — for triggers near the bottom of the viewport |

Item variants: `danger` (`.pop__item--danger`) for destructive actions; `selected` for the current choice in a menu of options.

## States
| State | Change |
|---|---|
| Item hover | `--surface-2` fill, `--ink` text |
| Item selected (`selected`) | `role="menuitemradio"` with `aria-checked="true"`: 600 `--ink` on `--surface-2`, with a 6 px `--brand` dot at the right |
| Danger item | `--danger-text`; hover `--danger-bg` |
| Disabled item | Native `disabled`: `--ink-4` text, no hover fill, `not-allowed` cursor; `reason` becomes its `data-tip` tooltip |
| Focus | 2 px brand focus outline on the focused item |

## Accessibility
- Opening the menu moves focus to the first enabled item (or the first `input` in custom content).
- Keyboard inside the menu: `ArrowDown` / `ArrowUp` move between enabled items and wrap; `Enter` / `Space` activate the focused item (the menu closes, then `onSelect` runs); `Home` / `End` jump to the first / last item; `Escape` closes. Type-ahead is not supported.
- Choosing an item, pressing Escape or calling `close()` from custom content returns focus to the trigger (the element with `aria-haspopup="menu"` — spread the trigger props onto it). Clicking outside closes the menu without moving focus.
- The trigger gets `aria-expanded` and `aria-haspopup="menu"` from the render props; always spread them. Give icon-only triggers a name (`IconButton label`).
- Pass `label` to name the menu (`aria-label` on `role="menu"`).
- Disabled items are skipped by arrow keys; their `reason` is shown by `TooltipHost` (mount it once) — say why the action is unavailable ("You need the Auditor role").
- Items with `selected` defined (true or false) render as `role="menuitemradio"` with `aria-checked`; the others are `role="menuitem"`. Use `Dropdown` when the choice is a form value.

## Do and don't
| Do | Don't |
|---|---|
| Verb labels in sentence case: "Export as CSV" | Nouns or Title Case |
| Put the destructive item last, after a separator, with `danger` | Mix delete between ordinary actions |
| Keep disabled items visible with a `reason` | Hide actions without explanation, or disable them silently |
| Seven items or fewer | Long scrolling menus — use a `Dropdown` with search |
| `align="up"` near the bottom of the screen | Menus that open off-screen |

## Example
```tsx
import { Menu, IconButton, Button } from '@lepide/ds-react';

<Menu
  label="Report actions"
  trigger={(p) => <IconButton {...p} icon="more" label="More actions" />}
  items={[
    { label: 'Edit report', icon: 'edit', onSelect: edit },
    { label: 'Duplicate', icon: 'copy', onSelect: duplicate },
    { label: 'Schedule', icon: 'clock', onSelect: schedule, disabled: !canSchedule, reason: 'Scheduling needs an SMTP server' },
    { separator: true, label: '' },
    { label: 'Delete report', icon: 'trash', danger: true, onSelect: confirmDelete },
  ]}
/>

<Menu align="left" trigger={(p) => <Button {...p} icon="download" iconEnd="chevron">Export</Button>}
  items={[{ label: 'CSV', onSelect: () => exportAs('csv') }, { label: 'PDF', onSelect: () => exportAs('pdf') }]} />
```

Plain HTML (with `@lepide/ds-css`):
```html
<span class="rel" style="display:inline-flex">
  <button class="lf-btn lf-btn--icon" aria-label="More actions" aria-haspopup="menu" aria-expanded="true">…</button>
  <div class="pop" role="menu">
    <button class="pop__item" role="menuitem"><span>Edit report</span></button>
    <div class="pop__sep"></div>
    <button class="pop__item pop__item--danger" role="menuitem"><span>Delete report</span></button>
  </div>
</span>
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `Menu`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `trigger` * | `(p: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': "menu"; }) => ReactNode` | — |  |
| `items` | `MenuItem[]` | — |  |
| `align` | `"up" \| "right" \| "left"` | `'right'` |  |
| `label` | `string` | — |  |
| `width` | `number` | — |  |
| `children` | `((close: () => void) => ReactNode)` | — |  |

### Types

```ts
// import type { IconName } from '@lepide/ds-react'
type IconName = keyof typeof icons.line;
// import type { MenuItem } from '@lepide/ds-react'
type MenuItem = { label: string; icon?: IconName; onSelect?: () => void; disabled?: boolean; /** Tooltip with the reason a disabled item can't be used. */ reason?: string; danger?: boolean; selected?: boolean; separator?: boolean; };
```

`*` required.
<!-- props:end -->
