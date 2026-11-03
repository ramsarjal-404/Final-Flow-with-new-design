---
title: Dropdown
exports: [Dropdown, SelectField, FloatingPop]
category: forms
status: stable
summary: Select-only combobox that replaces the native select — 46 px trigger, floating rounded panel, brand tint and check on the selected row, full keyboard support.
classes: [dd, dd--sm, dd--pill, dd__trigger, dd__value, is-ph, dd__chev, dd__pop, dd__search, dd__list, dd__opt, is-active, is-none, dd__label, dd__empty, fld, fld__lbl, fld__err, is-bad, help]
tokens: [--field-h, --field-radius, --select-h-sm, --input-h, --option-h, --r-md, --r-sm, --r-pill, --surface, --surface-2, --surface-3, --border, --border-2, --border-soft, --brand-50, --brand-100, --brand-300, --brand-ink, --ring, --danger, --ink, --ink-2, --ink-3, --ink-4, --sh-xs]
related: [search-select, text-field, radio-group, pill-input]
---

# Dropdown

## When to use
- `SelectField` for picking one value from a list inside a dialog or page form: it is a `Dropdown` wrapped in `Field` (label, note, help, error).
- `Dropdown` on its own when the label lives elsewhere (table cells, toolbars, inline time pickers) — give it `ariaLabel` or `ariaLabelledby`.
- `size="sm"` for compact inline use (tables, time pickers); `pill` for toolbar triggers.
- `FloatingPop` only when building a custom popup that must escape clipping containers (it is what `Dropdown` and `MultiSelect` render their panel into).

## When not to use
- Never use a native `<select>` — every select in the Lepide Design System is this component.
- Choosing several values: use `MultiSelect`.
- 2–4 options that should all be visible: use `RadioGroup` or `Segmented`.
- Actions ("Export", "Delete"): use `Menu` with a `Button` trigger, not a dropdown.

## Anatomy
1. Wrapper `.dd`: `position: relative`, full width.
2. Trigger `<button class="dd__trigger" role="combobox">`: height 46 (`--field-h`), radius 14 (`--field-radius`), padding 0 8 0 14, 1 px `--border`, fill `--surface-2`, 500 14/20 `--ink`.
3. Value `.dd__value`: ellipsised; placeholder state `.is-ph` in 400 `--ink-4`. With no `placeholder` the trigger shows "Select".
4. Chevron well `.dd__chev`: 28 px round, `--ink-3`, 16 px chevron.
5. Panel `.dd__pop` (via `FloatingPop`, portalled to `body`, `position: fixed`, z-index 130): at least the trigger's width (grows to fit content up to 360 px), 6 px below the trigger, flips above it when there is less room below; white, 1 px `--border`, radius 14, padding 6, two-layer soft shadow, max height 320; enters with `dd-in` (160 ms, −4 px, scale .98).
6. Optional search `.dd__search`: 38 px, radius 10 (`--r-sm`), `--surface-2`, 15 px search icon, placeholder "Search". Shown automatically when there are more than `searchFrom` (default 8) options; `search` forces it on or off.
7. List `.dd__list` (`role="listbox"`), 2 px gap between rows.
8. Option `.dd__opt` (`role="option"`): min-height 38 (`--option-h`), padding 8 10 8 12, radius 10, 500 13.5/20 `--ink-2`. Selected: `--brand-50`, `--brand-ink`, 600, 16 px check at the right.
9. "None" row `.is-none`: with `clearable` and a `placeholder`, once a value is set, the placeholder is offered as a first row in `--ink-3` with a hairline under it; picking it calls `onChange('')`.
10. Empty search result `.dd__empty`: "No matches for “…”", centred `--ink-3`.

`SelectField` sets `clearable` automatically whenever you pass a `placeholder`.

## Variants and sizes
| Variant | Look | Use |
|---|---|---|
| default | 46 px soft-filled field trigger | Forms (`SelectField`) |
| `pill` (`.dd--pill`) | 40 px pill (`--input-h`), white, `--sh-xs` | Toolbars next to pill inputs |

Sizes: `md` (default) 46 px, full width · `sm` (`.dd--sm`) 36 px (`--select-h-sm`), radius 10, 13 px text, auto width, min 72 px, 24 px chevron well.

## States
| State | Change |
|---|---|
| Hover | White fill, `--border-2` border; chevron well `--surface-3` |
| Focus (keyboard) | White, `--brand-300` border, `--ring` |
| Open | Same as focus; chevron well `--brand-50` with the chevron in `--brand-ink`, rotated 180° |
| Option active (hover or arrow keys) | `--surface-2`, `--ink`; selected and active: `--brand-100` |
| Option disabled | `--ink-4`, no hover, cannot be picked or reached with arrows |
| Invalid (`invalid`, or `error` on `SelectField`) | Danger border, white fill, `0 0 0 3px rgba(207,58,63,.12)` halo; `aria-invalid="true"` |
| Disabled | `--ink-4` text, opacity .75, not-allowed cursor, does not open |
| Reduced motion | Panel appears without the `dd-in` animation |

## Accessibility
Follows the WAI-ARIA APG select-only combobox: trigger `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` the listbox while open, `aria-activedescendant` for the active option (on the search input instead when the search box is shown).

| Key | Closed | Open |
|---|---|---|
| ↓ / ↑ / Enter / Space | Open the list on the selected (or first enabled) option | ↓ / ↑ move to the next / previous enabled option |
| Home / End | — | First / last enabled option (not while typing in search) |
| PageDown / PageUp | — | Move 8 enabled options |
| Enter (or Space outside search) | — | Pick the active option and close |
| Esc | — | Close and return focus to the trigger |
| Tab | — | Close, focus moves on |
| Letters | Select the next option starting with the typed text | Move to it (typed characters within 700 ms combine) |

- A click outside closes the list. Mouse-downs inside the portalled panel do not count as outside clicks for a `Menu` or `Modal` the dropdown is in.
- The listbox is named by `ariaLabelledby`, else `ariaLabel`, else the placeholder. Inside `SelectField` the visible label is linked by `htmlFor`.
- Selection is never colour alone: the selected option shows a check and `aria-selected="true"`.

## Do and don't
| Do | Don't |
|---|---|
| `SelectField` with a visible label in forms | A native `<select>` |
| `placeholder="All"` (with clearable) when "no value" is a valid choice | A fake "— None —" option in `options` |
| Let search turn on by itself past 8 options | Force search on a 3-option list |
| `size="sm"` in table cells and time pickers | Shrink the default trigger with custom CSS |
| `ariaLabel` on a bare `Dropdown` with no visible label | An unlabelled trigger |

## Example
```tsx
import { SelectField, Dropdown } from '@lepide/ds-react';

<SelectField label="Domain" value={domain} onChange={setDomain} error={domainError}
  options={['corp.lepide.local', 'eu.lepide.local', 'us.lepide.local']} />

<SelectField label="Severity" note="Optional" placeholder="All" value={severity} onChange={setSeverity}
  options={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low', disabled: true }]} />

<Dropdown size="sm" ariaLabel="Hour" value={hour} onChange={setHour} options={['00', '06', '12', '18']} />
```

Plain HTML (with `@lepide/ds-css`) — the closed trigger `SelectField` renders (the open panel needs the React
component's script). For a static page with no script, a native `<select>` inside `.page-form .fld` is styled to
look the same and is the accepted fallback:
```html
<div class="page-form">
  <div class="fld">
    <label class="fld__lbl">Default role</label>
    <div class="dd"><button type="button" class="dd__trigger" role="combobox" aria-haspopup="listbox" aria-expanded="false">
      <span class="dd__value">Viewer</span><span class="dd__chev" aria-hidden="true"><svg class="lf-i" viewBox="0 0 24 24">…chevron…</svg></span>
    </button></div>
  </div>
</div>
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `Dropdown`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` * | `string` | — |  |
| `onChange` * | `(v: string) => void` | — |  |
| `options` * | `readonly (string \| Option)[]` | — |  |
| `placeholder` | `string` | — | Shown when nothing is chosen. With `clearable`, also offered as a muted first row once a value is set. |
| `clearable` | `boolean` | — |  |
| `disabled` | `boolean` | — |  |
| `invalid` | `boolean` | — |  |
| `id` | `string` | — |  |
| `ariaLabel` | `string` | — |  |
| `ariaLabelledby` | `string` | — |  |
| `search` | `boolean` | — | Search box at the top of the list: on, off, or (default) automatically past `searchFrom` options. |
| `searchFrom` | `number` | `8` |  |
| `size` | `"sm" \| "md"` | `'md'` | sm = 36 px compact trigger for inline use (time pickers, table cells). pill = rounded toolbar trigger. |
| `pill` | `boolean` | — |  |
| `className` | `string` | — |  |
| `style` | `CSSProperties` | — |  |

### `SelectField`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `options` * | `readonly (string \| Option)[]` | — |  |
| `label` | `ReactNode` | — |  |
| `note` | `ReactNode` | — |  |
| `error` | `string \| null` | — |  |
| `help` | `ReactNode` | — |  |
| `placeholder` | `string` | — |  |
| `onChange` | `((v: string) => void)` | — |  |
| `id` | `string` | — |  |
| `className` | `string` | — |  |
| `value` | `string \| number` | — |  |
| `disabled` | `boolean` | — |  |
| `style` | `CSSProperties` | — |  |
| `search` | `boolean` | — |  |
| `size` | `"sm" \| "md"` | — |  |
| `aria-label` | `string` | — |  |
| `aria-labelledby` | `string` | — |  |
| `aria-invalid` | `boolean \| "true" \| "false"` | — |  |

### `FloatingPop`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `anchor` * | `RefObject<HTMLElement>` | — |  |
| `popRef` * | `RefObject<HTMLDivElement>` | — |  |
| `children` * | `ReactNode` | — |  |
| `className` | `string` | `''` |  |
| `role` | `string` | — |  |
| `multi` | `boolean` | — |  |
| `id` | `string` | — |  |
| `onKeyDown` | `((e: KeyboardEvent<HTMLElement>) => void)` | — |  |
| `maxHeight` | `number` | `320` |  |

### Types

```ts
// import type { Option } from '@lepide/ds-react'
type Option = { value: string; label: string; disabled?: boolean };
```

`*` required.
<!-- props:end -->
