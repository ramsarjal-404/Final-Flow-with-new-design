---
title: Drawer
exports: [Drawer, DetailPanel]
category: overlays
status: stable
summary: Floating side panel that slides in from the right over a scrim (Drawer), and the non-modal sticky panel beside a list (DetailPanel).
classes: [lf, drawer, drawer__scrim, drawer__panel, drawer__panel--chat, drawer__panel--rec, drawer__head, drawer__body, drawer__foot, lf-muted, lf-card, detail, with-detail, lf-btn, lf-btn--icon]
tokens: [--drawer-w, --drawer-inset, --z-drawer, --modal-radius, --r-xl, --sh-lg, --sh-xs, --surface, --surface-2, --border, --border-soft, --ink-3, --type-section-title]
related: [modal, data-table, button]
---

# Drawer

## When to use
- `Drawer` to show or edit the details of one item without leaving the page: a record's properties, a settings sub-form, an assistant chat, a recommendation.
- `DetailPanel` beside a table or list when the user moves between items and should keep the list visible and usable (master–detail). It does not block the page.

## When not to use
- A decision that must be answered before anything else (confirm, delete): use `ConfirmDialog`.
- A short create form that ends with a single save: a `Modal` is usually clearer.
- Navigation between sections: use a page.
- Stacking a drawer on a drawer.

## Anatomy
`Drawer` (portal into `document.body`, wrapper `.drawer lf`):
1. Container: fixed, full window, z-index 70 (`--z-drawer`, below modals at 80).
2. Scrim `.drawer__scrim`: `rgba(18,20,23,.24)` with a 2 px backdrop blur, fades in. Clicking it calls `onClose`.
3. Panel `.drawer__panel` (`<aside>`): floats 12 px (`--drawer-inset`) inside the top, right and bottom window edges; width `min(440px, 100% − 24px)` (`--drawer-w`); white; radius 26 (`--r-xl`); `--sh-lg`; enters with `slide-in` (24 px from the right, 250 ms).
4. Head `.drawer__head`, padding 22 22 14: title `<h3>` 700 18/26 −0.025em ink, optional subtitle `<small>` 500 13/18 `--ink-3`. `head` replaces the title block with your own content. Close: a bordered 34 px `.lf-btn--icon` (1 px `--border`, white, `--sh-xs`) with `aria-label="Close"`.
5. Body `.drawer__body`: fills the remaining height and scrolls; padding 6 22 20; flex column, gap 14.
6. Footer `.drawer__foot` (when `footer` or `footerNote` is passed): padding 14 22, top hairline `--border-soft`, `--surface-2`, buttons right-aligned with 8 px gap. `footerNote` sits at the left in `.lf-muted` (500 12.5/16 `--ink-3`).

`DetailPanel`: an `<aside class="lf-card detail">` with the same head, body and footer classes. It is sticky at the top of its column, max height `100dvh − 120px`, no padding of its own, enters with `slide-in`. Place it as the second child of a `.with-detail` grid: `minmax(0,1fr) 420px`, 16 px gap; under 1100 px the grid becomes one column. Its close button is also bordered.

## Variants and sizes
| `width` | Panel width | Use |
|---|---|---|
| `md` (default) | 440 | Record details, settings |
| `rec` | 480 | Recommendation / record views with more content |
| `chat` | 500 | Assistant or conversation panels |
| a number, e.g. `620` | `min(620px, 100% − 24px)` | Anything else that needs a fixed width |

Under 860 px window width the drawer becomes a bottom sheet: 8 px from the left, right and bottom, auto width, max height 86dvh, entering with `rise-in`.

## States
| State | Behaviour |
|---|---|
| Closed | `open={false}` renders nothing |
| Opening | After 40 ms focus moves to the first `[data-autofocus]` element, else the first input in `.drawer__body`, else the first focusable element |
| Escape / scrim click / × | Calls `onClose` |
| Closing | Focus returns to the element that was focused when it opened |
| DetailPanel Escape | Calls `onClose` only when no modal or drawer (`[data-overlay]`) is open |

## Accessibility
- `Drawer` is `role="dialog"`, `aria-modal="true"`, with focus trapped inside (Tab and Shift+Tab wrap). It is named by its title heading (`aria-labelledby`), so any `title` works; with a custom `head` it falls back to `aria-label` from a string `title`, so pass a string title then.
- Only the top-most overlay reacts to Escape and Tab, so a `ConfirmDialog` opened from a drawer closes first.
- `DetailPanel` is a labelled `<aside>` (not a dialog): no focus trap and the page stays interactive. Move focus into it yourself if the user opened it from the keyboard.
- Both close buttons have `aria-label="Close"` and show a tooltip when `TooltipHost` is mounted.

## Do and don't
| Do | Don't |
|---|---|
| Keep the list visible: open details in a drawer or `DetailPanel` | Navigate away to a detail page for a quick look |
| Primary action last in `footer`; extra context in `footerNote` | Several primaries, or actions in the head |
| Highlight the open row with `DataTable` `activeKey` | Leave the user guessing which row the panel shows |
| `width="chat"` / `"rec"` for those panel types | Hand-tuned pixel widths for standard panels |
| `DetailPanel` inside `.with-detail` | `DetailPanel` floating on its own without the grid |

## Example
```tsx
import { useState } from 'react';
import { Drawer, DetailPanel, DataTable, Button, KeyValues } from '@lepide/ds-react';

function UserDrawer({ user, onClose }: { user: User | null; onClose: () => void }) {
  return (
    <Drawer open={!!user} onClose={onClose} title={user?.name ?? 'User'} subtitle={user?.email}
      footerNote="Last synced 4 min ago"
      footer={<><Button onClick={onClose}>Close</Button><Button variant="primary" icon="edit">Edit user</Button></>}>
      <KeyValues items={[
        { label: 'Department', value: user?.department },
        { label: 'Last logon', value: user?.lastLogon },
      ]} />
    </Drawer>
  );
}

function UsersWithDetail({ users }: { users: User[] }) {
  const [open, setOpen] = useState<User | null>(null);
  return (
    <div className="with-detail">
      <DataTable title="Users" rows={users} rowKey={(u) => u.id} activeKey={open?.id}
        columns={[{ key: 'name', header: 'Name', sortable: true }, { key: 'department', header: 'Department' }]}
        onRowOpen={setOpen} />
      {open && (
        <DetailPanel title={open.name} subtitle={open.email} onClose={() => setOpen(null)}>
          <KeyValues items={[{ label: 'Department', value: open.department }]} />
        </DetailPanel>
      )}
    </div>
  );
}
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `Drawer`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` * | `boolean` | — |  |
| `onClose` * | `() => void` | — |  |
| `title` * | `ReactNode` | — |  |
| `subtitle` | `ReactNode` | — |  |
| `footer` | `ReactNode` | — |  |
| `footerNote` | `ReactNode` | — |  |
| `children` | `ReactNode` | — |  |
| `width` | `number \| "md" \| "chat" \| "rec"` | `'md'` |  |
| `head` | `ReactNode` | — |  |

### `DetailPanel`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` * | `ReactNode` | — |  |
| `onClose` * | `() => void` | — |  |
| `subtitle` | `ReactNode` | — |  |
| `footer` | `ReactNode` | — |  |
| `children` | `ReactNode` | — |  |

`*` required.
<!-- props:end -->
