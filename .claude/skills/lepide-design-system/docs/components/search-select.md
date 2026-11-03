---
title: Search select
exports: [SearchSelect, MultiSelect]
category: forms
status: stable
summary: Labelled select fields for long lists — SearchSelect picks one value with a search box past 8 options; MultiSelect picks several with checkboxes and an optional Select All.
classes: [dd, dd--pill, dd__trigger, dd__value, is-ph, dd__chev, dd__pop, dd__pop--multi, dd__search, dd__list, dd__opt, dd__empty, lf-check, lf-check__box, fld, fld__lbl, fld__err, is-bad, help]
tokens: [--field-h, --field-radius, --option-h, --check-size, --surface, --surface-2, --border, --border-2, --brand, --brand-50, --brand-300, --brand-ink, --ring, --danger, --ink-2, --ink-3, --ink-4]
related: [dropdown, checkbox, text-field, pill-input]
---

# Search select

## When to use
- `SearchSelect` for one value from a long list (users, servers, OUs, time zones) inside a form. It is a labelled `Dropdown` whose search box appears once there are more than `searchFrom` (default 8) options.
- `MultiSelect` for several values from a list (event types, recipients, servers to include). Add `selectAll` when picking everything is common.

## When not to use
- Short lists without a search need: use `SelectField` (same trigger, also auto-adds search past 8 options) — `SearchSelect` differs mainly in its default `placeholder="Select"` and the `pill` option.
- Two to five independent on/off choices that should all be visible: use a group of `Checkbox`es.
- Free-text entry or tags that are not in a list: `MultiSelect` cannot create new values.

## Anatomy
Both render inside `Field` (label, note, help, error) and use the `Dropdown` trigger and panel (see dropdown):

1. Trigger `.dd__trigger`: 46 px (`--field-h`), radius 14, `--surface-2`, chevron well at the right.
2. Panel `.dd__pop` in a portal: radius 14, padding 6, max height 320, flips above when needed.
3. Search `.dd__search` (38 px, placeholder "Search") — `SearchSelect`: past `searchFrom` options; `MultiSelect`: past 8 options (fixed).

`MultiSelect` specifics:
- Trigger text: the placeholder when empty; the labels joined with ", " for one or two values; "N selected" for three or more.
- Panel `.dd__pop--multi`; each row is a `.lf-check` checkbox (16 px box, `--check-size`) with min-height 38 (`--option-h`), padding 0 10, radius 10.
- Optional first row "Select All" (hidden while a search query is typed): checked when every option is selected, indeterminate when some are; it selects all non-disabled options or clears all.
- The panel stays open while you tick rows; it closes on an outside click or Esc.

## Variants and sizes
None. One size, 46 px trigger. `SearchSelect` accepts `pill` for a 40 px white pill trigger (`.dd--pill`) in toolbars.

## States
| State | Change |
|---|---|
| Hover / open | Trigger turns white with `--border-2`; open adds `--brand-300` border and `--ring`, chevron rotates |
| Selected row | `SearchSelect`: `--brand-50`, `--brand-ink`, 600, check icon. `MultiSelect`: brand-filled checkbox, row `--brand-50` with `--brand-ink` text |
| Row hover | `--surface-2` |
| No search matches | "No matches for “…”" in `--ink-3` |
| Invalid (`error`) | Danger border and halo on the trigger, `.fld__err` message below |
| Disabled | Trigger `--ink-4`, opacity .75, does not open. Disabled options: `--ink-4`, not pickable (MultiSelect: disabled checkbox) |

## Accessibility
- `SearchSelect` inherits the full `Dropdown` keyboard model: ↓/↑/Enter/Space open; arrows, Home/End, PageUp/PageDown move; Enter picks; Esc closes; letters jump.
- `MultiSelect`: the trigger is a `button` with `aria-haspopup="dialog"` and `aria-expanded`; ↓ opens it. The panel is a `group` of native checkboxes: opening focuses the search box (past 8 options) or the first checkbox, ↑/↓ and Home/End move between them, Space toggles. Esc closes and returns focus to the trigger; a click outside closes without moving focus.
- The visible label is linked to the trigger with `htmlFor`; pass `ariaLabel` when there is no label.
- Selected rows always carry a check (icon or ticked box), never colour alone.

## Do and don't
| Do | Don't |
|---|---|
| `selectAll` on long lists where "everything" is a common choice | Add your own "All" value to `options` |
| Keep option labels short and unique; the trigger shows at most two | Long labels that make "a, b" unreadable |
| Show the count of selected items elsewhere if the user needs the full list | Rely on the trigger to list every selection |
| `SearchSelect` for 9+ options a user will search by name | A plain list of 200 servers with no search |

## Example
```tsx
import { SearchSelect, MultiSelect } from '@lepide/ds-react';

<SearchSelect label="Server" value={server} onChange={setServer} options={servers} error={serverError} />

<MultiSelect label="Notify" note="Optional" placeholder="Choose recipients" selectAll
  value={recipients} onChange={setRecipients}
  options={[{ value: 'it', label: 'IT admins' }, { value: 'sec', label: 'Security team' }, { value: 'hr', label: 'HR' }]} />
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `SearchSelect`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` * | `string` | — |  |
| `onChange` * | `(v: string) => void` | — |  |
| `options` * | `readonly (string \| Option)[]` | — |  |
| `label` | `ReactNode` | — |  |
| `note` | `ReactNode` | — |  |
| `error` | `string \| null` | — |  |
| `help` | `ReactNode` | — |  |
| `placeholder` | `string` | `'Select'` |  |
| `disabled` | `boolean` | — |  |
| `pill` | `boolean` | — |  |
| `searchFrom` | `number` | `8` |  |
| `ariaLabel` | `string` | — |  |
| `className` | `string` | — |  |

### `MultiSelect`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` * | `string[]` | — |  |
| `onChange` * | `(v: string[]) => void` | — |  |
| `options` * | `readonly (string \| Option)[]` | — |  |
| `label` | `ReactNode` | — |  |
| `note` | `ReactNode` | — |  |
| `error` | `string \| null` | — |  |
| `help` | `ReactNode` | — |  |
| `placeholder` | `string` | `'Select'` |  |
| `disabled` | `boolean` | — |  |
| `selectAll` | `boolean` | — |  |
| `ariaLabel` | `string` | — |  |
| `className` | `string` | — |  |

### Types

```ts
// import type { Option } from '@lepide/ds-react'
type Option = { value: string; label: string; disabled?: boolean };
```

`*` required.
<!-- props:end -->
