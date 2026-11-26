---
title: Toast
exports: [ToastProvider, useToast]
category: feedback
status: stable
summary: Notifications from one call, toast({...}). They show as a card stack in the bottom-right corner, or as a nudge callout beside the control the user just clicked when an error or warning answers that click.
classes: [ntf-stack, ntf, ntf--info, ntf--success, ntf--warning, ntf--error, ntf__in, ntf__tile, ntf__main, ntf__title, ntf__msg, ntf__count, ntf__acts, ntf__x, ntf__bar, is-behind, is-bumped, nudge, nudge--info, nudge--success, nudge--warning, nudge--error, nudge__ctx, is-placed, is-below, is-nudged, lf-spin, lf-btn, lf-btn--sm, lf-btn--primary]
tokens: [--toast-w, --z-toast, --z-nudge, --r-md, --sh-lg, --surface, --border, --ink, --ink-2, --ink-4, --brand-400, --brand-50, --brand-ink, --success-dot, --success-bg, --success-text, --warning-dot, --warning-bg, --warning-text, --danger-dot, --danger-bg, --danger-text]
related: [button, modal, loading]
---

# Toast

## When to use
- Confirm that something finished: "Report saved", "3 users disabled".
- Report a background result the user should know about but needn't act on immediately.
- Show progress of a short async action with `loading: true`, then `update()` it with the result.
- Tell the user why the button they just pressed didn't work ("Add at least one column"): an `error` or `warning` raised right after a click automatically appears as a nudge beside that button.
- Offer one or two follow-ups ("Undo", "Open report") with `actions`.

## When not to use
- Field validation: show the error on the field (`Field` `error`), not in a toast.
- Information the user must read or decide on before continuing: use `ConfirmDialog` or a `Banner`.
- Persistent page state (a licence expires, a connector is down): use a `Banner`.
- Long text: a toast holds a title and one or two lines.

## Anatomy
Set-up: wrap the app once in `<ToastProvider>`; call `const toast = useToast()` in any component below it. Outside a provider `toast()` does nothing.

**Card stack** (`.ntf-stack`, rendered into `document.body`): fixed 20 px from the right and bottom edges (right 16, bottom 92 under 860 px), width `min(360px, 100vw − 32px)` (`--toast-w`), z-index 100 (`--z-toast`). Each card `.ntf`:
1. White, 1 px `--border`, radius 14 (`--r-md`), shadow `0 1px 2px rgba(18,20,23,.06), 0 16px 36px -14px rgba(18,20,23,.26)`; inner padding 12 42 14 12.
2. Tone tile `.ntf__tile`: 36 × 36, radius 11, tone background and tone ink, 17 px icon (`check` for success, `info` for info, `alert` for warning and error). While `loading`, a spinner replaces the icon. Error tiles pulse a red glow twice.
3. `.ntf__title`: 700 13.5/20 ink. It shows `title`, or `message` when there is no title. A repeated notification adds a count pill `.ntf__count` ("×3", 800 11 white on the tone dot colour).
4. `.ntf__msg`: 500 12.5/18 `--ink-2`, shown under the title only when both `title` and `message` are given.
5. `.ntf__acts`: up to two small (`sm`) buttons, 8 px gap, 10 px above; `primary: true` makes one the primary button.
6. Dismiss `.ntf__x`: 28 px round, 8 px from the top-right, `--ink-4` icon, `aria-label="Dismiss"`.
7. Timer bar `.ntf__bar`: 3 px along the bottom edge in the tone dot colour, shrinking left to right; the card closes when it ends. Not shown while `loading`.

**Nudge** (`.nudge`, one at a time): a 320 px callout (`min(320px, 100vw − 16px)`) placed 12 px above the control (below it when there is less than 8 px of room above), with a 12 px rotated-square arrow pointing at the control's centre. White, 1 px `--border`, radius 14, `--sh-lg`, z-index 140 (`--z-nudge`), padding 12 40 17 12. Contents: a 30 px tone tile (radius 10, 16 px icon), the `title` as an uppercase context line `.nudge__ctx` (700 11/16, +0.04em, tone ink), the `message` (700 13/19 ink), actions, a × and a 2 px timer bar inset 14 px from each side. The control itself gets `.is-nudged` for 1.4 s: a 0.45 s horizontal shake and a red ring pulse.

## Variants and sizes
| `variant` | Tile and bar | Use |
|---|---|---|
| `info` (default for cards) | `--brand-50` / `--brand-ink`, bar `--brand-400` | Neutral news, background jobs started |
| `success` | `--success-bg` / `--success-text`, bar `--success-dot` | Something finished |
| `warning` | `--warning-bg` / `--warning-text`, bar `--warning-dot` | Done with caveats, or a soft block |
| `error` | `--danger-bg` / `--danger-text`, bar `--danger-dot`; `role="alert"` | Failed actions |

A nudge with no `variant` uses the `error` tone.

Where it shows (`anchor`):
| `anchor` | Result |
|---|---|
| `'auto'` (default; `null` behaves the same) | `error` or `warning` raised within 1.2 s of a click on a `button`, `[role="button"]`, `a[href]` or `[role="menuitem"]` that is still visible → nudge beside it. Everything else → card |
| `'corner'` | Always a card |
| an `HTMLElement` or a CSS selector | Nudge beside that element if it is visible (any variant); otherwise a card |

Durations (provider `duration`, default 5000 ms):
| Form | Default | Override |
|---|---|---|
| Card, info / success / warning | `duration` (5 s) | `ToastInput.duration` |
| Card, error | `duration × 1.4` (7 s) | `ToastInput.duration` |
| Card, `loading: true` | No timer until `update()` sets `loading: false` | — |
| Nudge | `duration × 1.6` (8 s) | `ToastInput.duration` |

## States
| State | Behaviour |
|---|---|
| Enter | Card slides up from below the corner and fades in; nudge scales in from its arrow (`nudge-in`, 0.4 s) |
| Stacked | Newest in front; each older card sits 12 px higher and 5 % smaller with its content hidden; 3 visible, at most 5 kept (a 6th pushes the oldest out) |
| Hover or focus on the stack | Cards fan out into a column with 10 px gaps; all timers pause |
| Hover on a nudge | Its timer pauses |
| Repeat | Same `title`, `message` and `variant` while the card is still showing → no new card; the count goes up, the tile pops and the timer restarts. A repeat on the same nudge anchor bumps the nudge |
| Drag | Drag a card right more than 90 px to dismiss it; less springs back |
| Leave | Card slides out to the right and fades, removed after 360 ms |
| Nudge close | ×, Escape, a mouse press anywhere outside it, any typing (`input` event), an action button, or the timer. Escape is stopped there, so a dialog behind the nudge stays open |
| Nudge anchor gone | If the control disappears within 400 ms (a menu closed, a step changed) the message moves to the card stack; later it just closes. The nudge follows the control while it scrolls or moves |
| Reduced motion | No slide, shake, pop or nudge animation; cards still appear and disappear |

`ToastHandle` (returned by every `toast()` call):
- `update(patch)` merges `patch` into the notification, restarts its timer and pops its tile. If the card was already dismissed, it shows again as a new card with the merged content.
- `dismiss()` closes it now.

`ToastAction`: `{ label, onClick?, primary? }`. A click closes the notification first, then runs `onClick`. Only the first two actions render. Action labels are React keys, so keep them unique.

`loading` is only drawn in the card stack; a nudge always shows its tone icon and timer.

## Accessibility
- The stack is `role="region"` with `aria-label="Notifications"`. Error cards are `role="alert"` (announced immediately); other cards are `role="status"`. A nudge is always `role="alert"`.
- The timer pauses while keyboard focus is inside the stack, so users can Tab to actions and the × without the card closing.
- Every × has `aria-label="Dismiss"`. Dragging is optional; the × does the same.
- Don't put the only route to something important in a toast: it disappears. Repeat critical results on the page.

## Do and don't
| Do | Don't |
|---|---|
| Short past-tense messages: "Report saved" | "Success!", "Operation completed successfully." |
| `title` + `message` when the message needs context | Long paragraphs or lists |
| `loading: true`, then `update({ loading: false, variant: 'success', message })` | A "working…" toast followed by a second "done" toast |
| Let an error after a click become a nudge (default `anchor`) | Force `anchor: 'corner'` for errors that explain a button press |
| One primary action at most ("Undo", "Open") | Two primary actions, or more than two actions |
| Field errors on the field | Toasts for each invalid field |

## Example
```tsx
import { ToastProvider, TooltipHost, useToast, Button } from '@lepide/ds-react';

export function App() {
  return (
    <ToastProvider>
      <Routes />
      <TooltipHost />
    </ToastProvider>
  );
}

function ExportButton({ reportId, hasColumns }: { reportId: string; hasColumns: boolean }) {
  const toast = useToast();
  const run = async () => {
    // An error raised right after this click shows as a nudge beside the button.
    if (!hasColumns) return toast({ variant: 'error', title: 'Export', message: 'Add at least one column first.' });
    const t = toast({ loading: true, title: 'Exporting report', message: 'Preparing the CSV…' });
    try {
      const file = await api.export(reportId);
      t.update({ loading: false, variant: 'success', title: 'Export ready', message: file.name,
        actions: [{ label: 'Download', primary: true, onClick: () => download(file) }] });
    } catch {
      t.update({ loading: false, variant: 'error', title: 'Export failed', message: 'The server did not respond. Try again.' });
    }
  };
  return <Button icon="download" onClick={run}>Export</Button>;
}
```

Plain HTML (with `@lepide/ds-css` and its `lepide.js`): call `Lepide.toast({ variant, title, message })`. It builds the
same markup the React kit renders (`.ntf-stack` › `.ntf.ntf--success` › `.ntf__in` with `.ntf__tile` and `.ntf__main`,
a `.ntf__x` dismiss button and the `.ntf__bar` timer) and shows one toast at a time.
```html
<script src="lepide.js" defer></script>
<button class="lf-btn" onclick="Lepide.toast({ variant: 'success', title: 'Export ready', message: 'failed-logons.csv' })">Export</button>
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `ToastProvider`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` * | `ReactNode` | — |  |
| `duration` | `number` | `5000` |  |

### `useToast` (hook)

```ts
function useToast(): (input: ToastInput) => ToastHandle
```

Returns toast(input): shows a card or nudge and returns a handle to update or dismiss it.

### Types

```ts
// import type { ToastAction } from '@lepide/ds-react'
type ToastAction = { label: string; onClick?: () => void; primary?: boolean };
// import type { ToastHandle } from '@lepide/ds-react'
type ToastHandle = { update: (patch: Partial<ToastInput>) => void; dismiss: () => void };
// import type { ToastInput } from '@lepide/ds-react'
type ToastInput = { variant?: ToastVariant; title?: string; message: string; /** Up to two buttons. A click closes the notification, then runs `onClick`. */ actions?: ToastAction[]; /** Spinner and no timer until `update()` brings the result. */ loading?: boolean; duration?: number; /** Where it shows. 'auto' (default): an error or warning that answers a click becomes a nudge beside the clicked control; anything else goes to the card stack. 'corner': always the card stack. An element or selector: a nudge beside it. */ anchor?: 'auto' | 'corner' | HTMLElement | string | null; };
// import type { ToastVariant } from '@lepide/ds-react'
type ToastVariant = 'info' | 'success' | 'warning' | 'error';
```

`*` required.
<!-- props:end -->
