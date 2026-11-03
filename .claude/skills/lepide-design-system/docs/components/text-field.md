---
title: Text field
exports: [Field, TextField, PasswordField, NumberField, TextAreaField]
category: forms
status: stable
summary: Labelled form fields for dialogs and page forms — 46 px soft-filled controls with a label, optional note, help text and inline error.
classes: [fld, fld__lbl, fld__err, is-bad, help, fld-row, fld-pw, eye, fld-num, modal__form, page-form, muted, text-sm]
tokens: [--field-h, --field-radius, --field-px, --surface-2, --surface, --border, --border-2, --brand-300, --ring, --danger, --danger-text, --ink, --ink-3, --ink-4, --brand-ink, --surface-3]
related: [dropdown, search-select, pill-input, checkbox, radio-group, toggle, button]
---

# Text field

## When to use
- `TextField` for any single-line value in a dialog or page form: names, e-mail addresses, paths, descriptions.
- `PasswordField` for secrets the user types; it adds a show/hide eye button.
- `NumberField` for bounded integers or counts (retention days, thresholds) where stepping by `step` is useful.
- `TextAreaField` for multi-line free text (notes, descriptions, e-mail bodies).
- `Field` on its own to give any other control (a `Dropdown`, `MultiSelect`, `Checkbox` group, custom widget) the same label, note, help and error layout.

## When not to use
- Toolbar filters and searches above tables or lists: use `PillInput` / `SearchField` (40 px pill).
- Choosing from a fixed list: use `SelectField`, `SearchSelect` or `RadioGroup`, never a text field with instructions.
- Outside a `.modal__form` or `.page-form` container: the 46 px field styling of the `input`, `textarea` and `select` inside `.fld` is scoped to those two containers, so the control falls back to browser/global styles elsewhere. `<Modal>` and `WizardCard` already provide the container.

## Anatomy
1. Wrapper `.fld`: vertical flex, 7 px gap, `min-width: 0`.
2. Label `.fld__lbl` (`<label htmlFor>`): 600 13/18 `--ink`. Optional `note` renders as an `<em>` after it: 500 12/16 `--ink-4`, 8 px gap, not italic — use it for "Optional", units or limits.
3. Control: height 46 (`--field-h`), padding 0 14 (`--field-px`), radius 14 (`--field-radius`), 1 px `--border`, fill `--surface-2`, text 500 14/20 `--ink`, placeholder 400 `--ink-4`. Textarea: min-height 84, padding 12 14 (resizes vertically in `.page-form`, not in `.modal__form`).
4. Help text `.help` (only when there is no error): 500 12/16 `--ink-3`.
5. Error `.fld__err`: 600 12/16 `--danger-text` with a 14 px circled "!" icon, fades up. Replaces the help text.

`PasswordField`: the input sits in `.fld-pw` with 48 px right padding; a 34 px round `.eye` button (17 px eye icon, `--ink-3`) is inset 6 px from the right edge.

`NumberField`: `.fld-num` row with 6 px gaps — the input (tabular numerals, `inputMode="numeric"`), then a 28 px round − button and a 28 px round + button (1 px `--border`, white, 14 px icons), then an optional `suffix` in `.muted.text-sm`.

Two fields side by side: wrap them in `<div className="fld-row">` (grid 1fr 1fr, 14 px gap; one column under 620 px).

## Variants and sizes
None. One size: 46 px controls (`--field-h`); textarea min-height 84 px.

## States
| State | Change |
|---|---|
| Hover | Border `--border-2` (not when disabled) |
| Focus | Fill `--surface` (white), border `--brand-300`, `--ring` (3 px brand halo); no outline |
| Invalid (`error` set) | `.fld.is-bad`: danger border, white fill, `0 0 0 3px rgba(207,58,63,.12)` halo, one `shake`; `.fld__err` message below; control gets `aria-invalid="true"` |
| Disabled | Text `--ink-4`, opacity .8, `not-allowed` cursor (`.page-form`; in `.modal__form` the disabled rule covers `select` only) |
| Password visible | Eye button `aria-pressed="true"`, icon `--brand-ink`; hover `--surface-3` fill |
| Number at a bound | − is disabled when `value <= min`, + when `value >= max`; typed values are not clamped, step buttons are |

## Accessibility
- The label is a real `<label for>`; each field generates an id with `useId()` unless you pass `id`.
- The error renders with `role="alert"`, so it is announced when it appears, and the control gets `aria-invalid`.
- `Field` only links the label to a control when you pass `htmlFor` and give the control that `id`.
- The eye button is `type="button"` with `aria-label` "Show password" / "Hide password" and `aria-pressed`.
- Number step buttons are labelled "Decrease" / "Increase". Typing a non-number is ignored (the previous value is kept); clearing the input calls `onChange('')`.
- Help text is not wired to the control with `aria-describedby`; keep critical instructions in the label or note.
- Focus uses the 3 px `--ring` instead of the global outline; in high contrast the ring is the theme's.

## Do and don't
| Do | Don't |
|---|---|
| Put fields inside `<Modal>`'s form or a `.page-form` container | Render `TextField` in a bare `div` and expect the 46 px style |
| Short label in sentence case; "Optional" or units in `note` | Long instructions in the label or placeholder |
| Show one specific error under the field ("Enter a valid e-mail address") | Only colour the border red, or show errors in a toast |
| `.fld-row` for two short related fields (first and last name) | Three or more fields in one row |
| `NumberField` with `min`/`max` for bounded counts | A free text field for numbers |

## Example
```tsx
import { Modal, TextField, PasswordField, NumberField, TextAreaField, Button } from '@lepide/ds-react';

<div className="page-form">
  <div className="fld-row">
    <TextField label="Display name" value={name} onChange={setName} error={nameError} />
    <TextField label="E-mail" type="email" value={email} onChange={setEmail} help="Alerts are sent here." />
  </div>
  <PasswordField label="Service account password" value={pw} onChange={setPw} autoComplete="new-password" />
  <NumberField label="Keep audit data for" note="30–365" value={days} onChange={setDays} min={30} max={365} step={30} suffix="days" />
  <TextAreaField label="Description" note="Optional" value={desc} onChange={setDesc} rows={3} />
</div>
```

Plain HTML (with `@lepide/ds-css`):
```html
<form class="page-form">
  <div class="fld is-bad">
    <label class="fld__lbl" for="host">Server name <em>FQDN</em></label>
    <input id="host" aria-invalid="true" value="dc01">
    <small class="fld__err" role="alert">Enter a fully qualified domain name.</small>
  </div>
  <!-- NumberField -->
  <div class="fld">
    <label class="fld__lbl" for="exp">Expiry</label>
    <div class="fld-num">
      <input id="exp" inputmode="numeric" value="14">
      <button type="button" aria-label="Decrease"><svg class="lf-i" viewBox="0 0 24 24">…minus…</svg></button>
      <button type="button" aria-label="Increase"><svg class="lf-i" viewBox="0 0 24 24">…plus…</svg></button>
      <span class="muted text-sm">days</span>
    </div>
  </div>
</form>
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `Field`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` * | `ReactNode` | — |  |
| `label` | `ReactNode` | — |  |
| `note` | `ReactNode` | — |  |
| `error` | `string \| null` | — |  |
| `help` | `ReactNode` | — |  |
| `htmlFor` | `string` | — |  |
| `className` | `string` | — |  |

### `TextField`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `ReactNode` | — |  |
| `note` | `ReactNode` | — |  |
| `error` | `string \| null` | — |  |
| `help` | `ReactNode` | — |  |
| `onChange` | `((v: string) => void)` | — |  |

Also accepts the native attributes of `InputHTMLAttributes`.

### `PasswordField`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `ReactNode` | — |  |
| `note` | `ReactNode` | — |  |
| `error` | `string \| null` | — |  |
| `help` | `ReactNode` | — |  |
| `onChange` | `((v: string) => void)` | — |  |

Also accepts the native attributes of `InputHTMLAttributes`.

### `NumberField`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` * | `number \| ""` | — |  |
| `onChange` * | `(v: number \| "") => void` | — |  |
| `label` | `ReactNode` | — |  |
| `note` | `ReactNode` | — |  |
| `error` | `string \| null` | — |  |
| `help` | `ReactNode` | — |  |
| `min` | `number` | — |  |
| `max` | `number` | — |  |
| `step` | `number` | `1` |  |
| `id` | `string` | — |  |
| `disabled` | `boolean` | — |  |
| `className` | `string` | — |  |
| `suffix` | `ReactNode` | — |  |

### `TextAreaField`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `ReactNode` | — |  |
| `note` | `ReactNode` | — |  |
| `error` | `string \| null` | — |  |
| `help` | `ReactNode` | — |  |
| `onChange` | `((v: string) => void)` | — |  |

Also accepts the native attributes of `TextareaHTMLAttributes`.

`*` required.
<!-- props:end -->
