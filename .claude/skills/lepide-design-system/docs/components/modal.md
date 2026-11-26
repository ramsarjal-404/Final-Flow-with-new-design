---
title: Modal
exports: [Modal, ConfirmDialog, Steps]
category: overlays
status: stable
summary: Centred dialog with icon-tile head, scrolling form body and a footer of buttons; ConfirmDialog for yes/no questions; Steps for multi-step progress.
classes: [lf, modal, modal__card, modal__card--lg, modal__card--sm, modal__card--xs, mhead, mhead__ic, mhead__ic--danger, mhead__text, modal__form, fld, mfoot, mfoot__hint, mfoot__btns, steps, steps--page, steps__item, steps__item--done, steps__n, steps__line, steps__line--done, lf-btn, lf-btn--icon]
tokens: [--modal-w, --modal-w-lg, --modal-w-sm, --modal-w-xs, --modal-radius, --z-modal, --sh-lg, --surface, --surface-2, --surface-3, --border-soft, --brand-50, --brand-100, --danger, --danger-bg, --sel-fill, --sel-ring, --type-modal-title, --ink-3, --ink-4]
related: [button, drawer, wizard-card, toast]
---

# Modal

## When to use
- `Modal` for a short, focused task that must finish or be cancelled before the user goes back to the page: create or edit one object, pick options, a 2–4 step setup.
- `ConfirmDialog` to confirm a destructive or irreversible action ("Delete 3 reports?") or any yes/no question that needs a deliberate answer.
- `Steps` inside a `Modal` (via the `steps` and `step` props) for a short multi-step dialog, or on its own above page content. `WizardCard` already renders it for full-page wizards.

## When not to use
- Reading or editing a record while keeping the list in view: use `Drawer` or `DetailPanel`.
- Long multi-step flows (more than about 4 steps, or steps with large forms): use a full-page `WizardCard`.
- Success or progress messages: use `useToast`. Never open a modal just to say "Saved".
- Nesting a second modal on top of a modal. A `ConfirmDialog` over a modal works (only the top-most overlay reacts to keys), but use it sparingly.

## Anatomy
1. Scrim: fixed, full window, `rgba(18,20,23,.28)` with a 3 px backdrop blur, z-index 80 (`--z-modal`), fades in.
2. Card `.modal__card`: white, radius 26 (`--modal-radius`), `--sh-lg`, max height `100dvh − 32px`, enters with `rise-in` (10 px rise, 250 ms).
3. Head `.mhead`, padding 24 24 16:
   - Icon tile `.mhead__ic`: 44 × 44, radius 14, `--brand-50` fill, brand icon (18 px), `--brand-100` inset ring. `tone="danger"` makes it `--danger-bg` with a red icon. Default icon `plus`; `icon={null}` removes the tile.
   - Title `<h3>`: 700 19/26, −0.025em, ink (`--type-modal-title`). Optional subtitle `<small>`: 500 13.5/20 `--ink-3`.
   - Close: a 34 px `.lf-btn--icon` with the `x` icon and `aria-label="Close"`, always shown.
4. Optional `Steps` row (when `steps` is passed), margin 0 24 20.
5. Body `.modal__form` (only when `children` is not null): flex column, gap 16, padding 0 24 24, scrolls. Fields rendered with `Field`/`TextField` (`.fld`) here get 46 px inputs on `--surface-2`, radius 14, and turn white with the brand `--ring` on focus.
6. Footer `.mfoot` (only when `footer` is passed): padding 16 24, top hairline `--border-soft`, `--surface-2` fill. Left: `footerHint` (600 12.5/16 `--ink-3`); right: `.mfoot__btns`, 8 px gap, buttons 40 tall.

`Steps`: an `<ol class="steps">`. Each step is a 24 px circle `.steps__n` (`--surface-3`, 700 11.5 `--ink-3`) and a 600 13/16 label in `--ink-4`. The current step uses the selected finish (`--sel-fill` + `--sel-ring`, white number) and ink label; done steps also use the selected finish and show a 12 px check. Steps are joined by 2 px lines, brand when reached, `--border` otherwise.

## Variants and sizes
| `size` | Width | Use |
|---|---|---|
| `lg` | 960 (`--modal-w-lg`) | Side-by-side layouts, pickers with a preview |
| `md` (default) | 760 (`--modal-w`) | Most create/edit forms |
| `sm` | 580 (`--modal-w-sm`) | Short forms (2–4 fields) |
| `xs` | 460 (`--modal-w-xs`) | Confirmations; `ConfirmDialog` always uses it |

All widths are `min(width, 100%)` inside a 16 px window padding.

`tone="danger"`: red icon tile. `ConfirmDialog` `destructive` (default `true`): `trash` icon on a red tile and a `danger-solid` confirm button; `destructive={false}`: `info` icon on a brand tile and a `primary` confirm button.

`Steps` `page`: adds `.steps--page` (no margin, wraps onto lines) for use above page content.

## States
| State | Behaviour |
|---|---|
| Closed | `open={false}` renders nothing (no exit animation) |
| Opening | Portal into `document.body`; after 40 ms focus moves to the first `[data-autofocus]` element, else the first input/select/textarea in the body, else the first focusable element |
| Escape / scrim press | Calls `onClose` when `escapeCloses` (default `true`). `escapeCloses={false}` disables both; only the × (and your buttons) close it |
| Closing | Focus returns to the element that was focused when it opened |
| Busy confirm | `ConfirmDialog busy` shows a spinner in the confirm button and disables it |
| Step done | With `onStep`, done steps become clickable (`role="button"`, `tabIndex=0`, Enter or Space) and show a pointer; current and future steps are not clickable |

`ConfirmDialog` does not close itself: `onConfirm` must run the action and then call `onClose` (set `busy` while it runs).

## Accessibility
- The card is `role="dialog"` with `aria-modal="true"`. It is named by its title heading (`aria-labelledby`), so a string or a node `title` both work.
- Focus is trapped: Tab and Shift+Tab wrap between the first and last visible focusable elements. Escape only reaches the top-most overlay (`[data-overlay]`), so a dialog over a drawer closes on its own.
- Forms: pass `onSubmit` and give the primary footer button `type="submit"`. Body and footer become one `<form>` (`.modal__submit`, `display: contents`), so Enter in a field submits; validate inside `onSubmit`.
- Multi-step: one `onSubmit` that checks the current step, then either advances (`setStep(step + 1)`) or finishes on the last step. Every step's primary is `type="submit"` ("Next", then the verb), so Enter always moves forward. Back and Cancel are plain buttons; in a dialog Back sits left of Cancel (in `WizardCard`, Back is at the far left of the footer).
- Validation: on submit, not while typing. Put each message on its field (`error`), focus the first invalid field, and clear a field's error when it's edited. A step with no field to mark (no tile picked) shows an error `toast`, which appears beside the button.
- `ConfirmDialog` starts focus on Cancel when `destructive` (the default), so Enter can't confirm by accident; with `destructive={false}` focus starts on the confirm button. Word `confirmLabel` as the exact action ("Delete 3 reports").
- `Steps` is an ordered list with `aria-label="Progress"`; the current step has `aria-current="step"`. Step labels are used as React keys, so they must be unique.
- Never put the only explanation of a consequence in the icon colour: the `message` says what happens.

## Do and don't
| Do | Don't |
|---|---|
| Title as a verb phrase: "Create report", "Delete schedule?" | "Dialog", "Warning", Title Case |
| Primary action last in `footer`, after Cancel | Primary first, or two primaries |
| Put the consequence in `ConfirmDialog` `message` ("This can't be undone.") | A bare "Are you sure?" with no consequence |
| `size="sm"` or `xs` for short content | A 760 px dialog around two fields |
| `escapeCloses={false}` only while unsaved input would be lost | Disabling Escape on every dialog |
| Close the dialog from `onConfirm` once the action succeeds | Leave a confirm dialog open after it worked |

## Example
```tsx
import { useState } from 'react';
import { Modal, ConfirmDialog, Button, TextField, useToast } from '@lepide/ds-react';

function CreateReport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [step, setStep] = useState(0);
  const steps = ['Details', 'Columns', 'Schedule'];
  const last = step === steps.length - 1;
  const submit = () => {
    if (step === 0 && !name.trim()) { setNameError('Enter a report name'); return; }
    if (!last) { setStep(step + 1); return; }
    onClose();
    toast({ variant: 'success', title: 'Report created', message: `${name} is under My reports.` });
  };
  return (
    <Modal open={open} onClose={onClose} title="Create report" subtitle="Saved reports appear under My reports."
      icon="file" steps={steps} step={step} footerHint={`Step ${step + 1} of ${steps.length}`} onSubmit={submit}
      footer={<>
        {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit">{last ? 'Create report' : 'Next'}</Button>
      </>}>
      {step === 0 && <TextField label="Report name" value={name} error={nameError}
        onChange={(v) => { setName(v); setNameError(''); }} placeholder="e.g. Failed logons" />}
    </Modal>
  );
}

function DeleteReports({ ids, open, onClose }: { ids: string[]; open: boolean; onClose: () => void }) {
  const toast = useToast();
  return (
    <ConfirmDialog open={open} onClose={onClose}
      title={`Delete ${ids.length} reports?`} message="Their schedules stop as well. This can't be undone."
      confirmLabel={`Delete ${ids.length} reports`}
      // A promise keeps the button spinning until it settles; close the dialog yourself.
      onConfirm={async () => { await api.deleteReports(ids); onClose(); toast({ variant: 'success', message: 'Reports deleted' }); }} />
  );
}
```

Plain HTML (with `@lepide/ds-css` and its optional `lepide.js`). `.modal` is the fixed scrim and holds the card;
`hidden` hides it. `lepide.js` opens it from any `[data-open="<id>"]`, moves focus to the first field, keeps Tab inside,
and closes it on Escape, a scrim click or any `[data-close]`, giving focus back to the opener. The body and footer sit in
a `<form class="modal__submit">` (`display: contents`), so Enter in a field submits:
```html
<button type="button" class="lf-btn lf-btn--primary" data-open="rename">Rename</button>

<div class="modal lf" id="rename" hidden>
  <div class="modal__card modal__card--sm" role="dialog" aria-modal="true" aria-labelledby="rename-title">
    <div class="mhead">
      <span class="mhead__ic"><!-- 18 px icon --></span>
      <div class="mhead__text"><h3 id="rename-title">Rename dashboard</h3><small>Everyone with access sees the new name.</small></div>
      <button type="button" class="lf-btn lf-btn--icon" aria-label="Close" data-close><!-- x icon --></button>
    </div>
    <form class="modal__submit" id="rename-form" novalidate>
      <div class="modal__form">
        <div class="fld"><label class="fld__lbl" for="n">Name</label><input id="n"></div>
      </div>
      <div class="mfoot">
        <span class="mfoot__hint"></span>
        <div class="mfoot__btns"><button type="button" class="lf-btn" data-close>Cancel</button><button type="submit" class="lf-btn lf-btn--primary">Save</button></div>
      </div>
    </form>
  </div>
</div>

<script src="lepide.js" defer></script>
<script>
  document.getElementById('rename-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('n');
    Lepide.setError(name, name.value.trim() ? null : 'Enter a name.');
    if (!name.value.trim()) return Lepide.focusFirstError();
    Lepide.closeDialog('rename');
    Lepide.toast({ variant: 'success', message: 'Dashboard renamed' });
  });
</script>
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `Modal`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` * | `boolean` | — |  |
| `onClose` * | `() => void` | — |  |
| `title` * | `ReactNode` | — |  |
| `subtitle` | `ReactNode` | — |  |
| `icon` | `IconName \| null` | `'plus'` |  |
| `tone` | `"danger"` | — |  |
| `size` | `"sm" \| "md" \| "lg" \| "xs"` | `'md'` |  |
| `steps` | `string[]` | — |  |
| `step` | `number` | — |  |
| `footerHint` | `ReactNode` | — |  |
| `footer` | `ReactNode` | — |  |
| `children` | `ReactNode` | — |  |
| `escapeCloses` | `boolean` | `true` |  |
| `bodyClassName` | `string` | — |  |
| `onSubmit` | `(() => void)` | — | Makes body + footer a <form>: Enter in a field and a footer <Button type="submit"> call it (default submit is prevented). |

### `ConfirmDialog`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` * | `boolean` | — |  |
| `onClose` * | `() => void` | — | Cancel, Escape and the close button. The dialog doesn't close itself after confirming: close it in `onConfirm`. |
| `onConfirm` * | `() => unknown` | — | May return a promise: the confirm button shows a spinner until it settles. |
| `confirmLabel` * | `string` | — | The verb, e.g. "Remove data source". |
| `title` | `ReactNode` | `'Are you sure?'` |  |
| `message` | `ReactNode` | — | The consequence, shown under the title ("Auditing stops and its history is deleted."). |
| `cancelLabel` | `string` | `'Cancel'` |  |
| `destructive` | `boolean` | `true` | Default true: danger icon tile and a red confirm button, focus starts on Cancel. false: primary confirm. |
| `icon` | `IconName` | — |  |
| `busy` | `boolean` | — | Show the spinner yourself (not needed when `onConfirm` returns a promise). |
| `children` | `ReactNode` | — |  |

### `Steps`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `steps` * | `string[]` | — |  |
| `current` * | `number` | — |  |
| `onStep` | `((i: number) => void)` | — |  |
| `page` | `boolean` | — |  |

### Types

```ts
// import type { IconName } from '@lepide/ds-react'
type IconName = keyof typeof icons.line;
```

`*` required.
<!-- props:end -->
