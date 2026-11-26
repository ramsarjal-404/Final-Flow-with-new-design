---
title: Wizard card
exports: [WizardCard]
category: forms
status: stable
summary: Full-page multi-step form — a step indicator above a card holding one step's fields, with Back, Cancel and Next/Finish in the footer.
classes: [steps, steps--page, steps__item, steps__item--done, steps__n, steps__line, steps__line--done, lf-card, wiz-card, wiz-card__body, wiz-card__foot, spacer, page-form, fld, lf-btn, lf-btn--primary]
tokens: [--card-radius, --surface, --surface-2, --border-soft, --sel-fill, --sel-ring, --surface-3, --ink-3, --ink-4, --field-h, --ring]
related: [modal, button]
---

# Wizard card

## When to use
- Creating something that needs several screens of settings in a fixed order: a new report, an alert rule, a data-source connection, a scheduled export.
- When each step is a full form (several fields, a table, a picker) that would not fit comfortably in a `Modal`.

## When not to use
- One screen of fields: use a page form or a `Modal`.
- 2–3 short steps: a `Modal` with `steps` keeps the user on the current page.
- Steps that can be done in any order: use tabs (`VerticalTabs`, `Segmented`) or sections on one settings page.

## Anatomy
`WizardCard` renders two siblings, so place it in a page column (it has no outer wrapper):
1. Step indicator: `Steps` with `page` (`.steps.steps--page`: no margin, wraps onto lines). 24 px numbered circles (`--surface-3`, 700 11.5 `--ink-3`), 600 13/16 labels in `--ink-4`. The current step uses the selected finish (`--sel-fill`, `--sel-ring`, white number) and an ink label; done steps use the selected finish with a 12 px check and an `--ink-2` label. 2 px connector lines, brand once reached, `--border` otherwise. Leave a gap between it and the card in your layout (e.g. a 16 px flex/grid gap).
2. Card `<section class="lf-card wiz-card page-form">`: white, radius 20, no padding, overflow hidden. `.page-form` styles every `Field`/`TextField` inside: 46 px inputs on `--surface-2`, radius 14, white with the brand `--ring` on focus, red border and a shake when invalid.
3. Body `.wiz-card__body`: padding 24, flex column, gap 16 — the current step's `children`.
4. Footer `.wiz-card__foot`: padding 16 24, top hairline `--border-soft`, `--surface-2` fill, 8 px gap. Left: Back (secondary, `chevron-left` icon, hidden on the first step), then `extraFooter`. A `.spacer` pushes the rest right: Cancel (secondary), then the primary Next button with a trailing `arrow` icon. On the last step the primary reads `finishLabel` (default "Finish") and has no icon.

## Variants and sizes
None.

## States
| State | Behaviour |
|---|---|
| First step (`step === 0`) | No Back button |
| Middle step | Back, Cancel, Next (`nextLabel` or "Next") with a trailing arrow |
| Last step (`step === steps.length - 1`) | Primary reads `finishLabel` ("Finish" by default), no arrow |
| `busy` | The primary button shows a spinner, is disabled and has `aria-busy="true"` (Back and Cancel stay enabled — disable them yourself if needed) |
| `onStep` passed | Done steps in the indicator become clickable (pointer, `role="button"`, Enter or Space) and call `onStep(index)`; current and future steps are not clickable |

`WizardCard` holds no state: you own `step`, validate in `onNext` before advancing, and decide what Cancel does (usually confirm if anything was entered, then navigate away).

## Accessibility
- The indicator is an `<ol aria-label="Progress">`; the current step has `aria-current="step"`. Step labels are React keys, so they must be unique.
- All footer controls are real `<button>`s in reading order: Back, extra, Cancel, Next/Finish.
- When the step changes, the card moves focus to the new step's body (named "Step 2 of 4: Conditions"), so keyboard and screen-reader users start at the new content.
- Show validation errors on the fields (`Field` `error`, which renders `role="alert"`) rather than only disabling Next.

## Do and don't
| Do | Don't |
|---|---|
| Short noun step labels: "Source", "Columns", "Schedule", "Review" | Sentences or numbered labels ("Step 1: Choose…") |
| Finish with a verb that says what happens: `finishLabel="Create alert"` | Leave "Finish" when a clearer verb exists |
| Validate the step in `onNext`; keep Next enabled and explain what's missing | Disable Next with no explanation |
| Let users go back with `onStep` and Back without losing input | Reset later steps when going back |
| A final "Review" step for long wizards | Saving silently on each Next without telling the user |

## Example
```tsx
import { useState } from 'react';
import { WizardCard, PageHeader, TextField, SelectField, useToast } from '@lepide/ds-react';

const STEPS = ['Source', 'Conditions', 'Notify', 'Review'];

export function NewAlertPage() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = async () => {
    if (step === 0 && !name.trim()) { setError('Enter a name for the alert.'); return; }
    setError(null);
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    setBusy(true);
    await api.createAlert({ name });
    setBusy(false);
    toast({ variant: 'success', message: 'Alert created' });
    navigate('/alerts');
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PageHeader title="New alert" />
      <WizardCard steps={STEPS} step={step} onStep={setStep} busy={busy} finishLabel="Create alert"
        onBack={() => setStep(step - 1)} onNext={next} onCancel={() => navigate('/alerts')}>
        {step === 0 && <>
          <TextField label="Alert name" value={name} onChange={setName} error={error} />
          <SelectField label="Source" options={['Active Directory', 'File server', 'Microsoft 365']} />
        </>}
      </WizardCard>
    </div>
  );
}
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `WizardCard`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `steps` * | `string[]` | — |  |
| `step` * | `number` | — |  |
| `onNext` * | `() => void` | — |  |
| `onCancel` * | `() => void` | — |  |
| `children` * | `ReactNode` | — |  |
| `onStep` | `((i: number) => void)` | — |  |
| `onBack` | `(() => void)` | — |  |
| `nextLabel` | `string` | — |  |
| `finishLabel` | `string` | `'Finish'` |  |
| `busy` | `boolean` | — |  |
| `extraFooter` | `ReactNode` | — |  |

`*` required.
<!-- props:end -->
