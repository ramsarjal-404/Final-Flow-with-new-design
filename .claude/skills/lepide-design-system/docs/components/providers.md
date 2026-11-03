---
title: Providers
exports: [LepideProvider, ThemeProvider]
category: foundation
status: stable
summary: App-root setup. LepideProvider plugs in your router's link; ThemeProvider stores the light, dark or hc theme and applies it as <html data-theme>. Mount ToastProvider and TooltipHost once beside them.
classes: []
tokens: []
related: [page-header, toast, tooltip, button]
---

# Providers

## When to use
Once, at the root of every app built with the Lepide Design System:

- `ThemeProvider`: always. It reads the saved theme, sets `data-theme` on `<html>` and gives you `useTheme()` for a theme switcher.
- `LepideProvider`: when the app has a client-side router, so kit links (breadcrumbs in `PageHeader`) navigate without a full page load. Optional: without it, links are plain `<a href>`.
- `ToastProvider` (from the toast docs): always, so `useToast()` works anywhere below it.
- `TooltipHost` (from the tooltip docs): always, once, so `data-tip` attributes, `IconButton` labels and disabled `Menu` item reasons show as tooltips.

## When not to use
- Do not nest a second `ThemeProvider` to theme part of a page: the theme is global (it is set on `<html>`). Sections cannot have their own theme.
- Do not mount `TooltipHost` or `ToastProvider` more than once.
- Do not set `data-theme` on `<html>` yourself after start-up; call `setTheme` so the stored value and the context stay in sync.

## Anatomy
**ThemeProvider**
1. On first render it reads `localStorage[storageKey]` (default key `"lepide.theme"`). `"dark"` and `"hc"` are kept; anything else, a missing value, or a storage error gives `"light"`.
2. After render, and on every change, it sets `document.documentElement.dataset.theme` (`<html data-theme="light|dark|hc">`). The token file switches every colour token on `:root[data-theme="dark"]` and `:root[data-theme="hc"]`.
3. `useTheme()` returns `{ theme, setTheme }`. `setTheme(t)` updates the context and writes `t` to `localStorage` (storage errors are ignored).

Themes: `light`, `dark` and `hc` (high contrast) are all stable; every text and icon colour pair meets WCAG AA in each (`npm run contrast`). High contrast uses a 3 px black focus outline and adds a 1 px border to cards.

**LepideProvider**
1. Holds the link component used by kit internals (today: `PageHeader` breadcrumbs, via `useLepideLink()`).
2. `link` receives `{ to, className, children }` and must render a link. Default: `<a href={to} className={className}>`.

**ToastProvider and TooltipHost** — not covered by this page's props; see the toast and tooltip docs. Put `TooltipHost` anywhere inside the tree (it renders the single floating tooltip), and wrap the app in `ToastProvider` (it renders the toast stack).

### Avoiding a theme flash
`ThemeProvider` applies the theme in an effect, after React has painted, so a dark-theme user would briefly see the light theme. Set the attribute before the CSS loads with an inline script in `<head>` that reads the same key:

```html
<head>
  <script>
    try {
      var t = localStorage.getItem('lepide.theme');
      document.documentElement.dataset.theme = t === 'dark' || t === 'hc' ? t : 'light';
    } catch (e) { document.documentElement.dataset.theme = 'light'; }
  </script>
  <link rel="stylesheet" href="/lepide.css"> <!-- @lepide/ds-css dist/lepide.css -->
</head>
```

If you pass a custom `storageKey`, use the same key in this script.

## Variants and sizes
None.

## States
| Theme | `data-theme` | Status |
|---|---|---|
| Light | `light` | Stable (default) |
| Dark | `dark` | Stable |
| High contrast | `hc` | Stable |

## Accessibility
- Offer the theme choice in the UI (for example a Light / Dark / High contrast dropdown in the account menu). `ThemeProvider` does not follow the OS colour-scheme setting; the default is light.
- High contrast strengthens focus to a 3 px black outline; test keyboard focus in it.
- `TooltipHost` is what gives icon-only buttons their visible label; without it they still have an `aria-label` but sighted users get no tooltip.
- `LepideProvider` links must render a real `<a href>` (most router links do) so they work with the keyboard, middle-click and screen readers.

## Do and don't
| Do | Don't |
|---|---|
| Mount `ThemeProvider`, `LepideProvider`, `ToastProvider` and `TooltipHost` once at the root | Mount providers per page or per component |
| Add the inline `<head>` script so the saved theme applies before first paint | Accept a light flash on every load in dark mode |
| Switch themes with `useTheme().setTheme` | Write `data-theme` or `localStorage` directly |
| Offer all three themes in the theme picker | Hard-code colours that skip the theme tokens (they will fail in dark or high contrast) |

## Example
```tsx
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link } from 'react-router-dom';
import { LepideProvider, ThemeProvider, ToastProvider, TooltipHost, Dropdown, useTheme } from '@lepide/ds-react';
import '@lepide/ds-css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ThemeProvider>
      <LepideProvider link={({ to, ...p }) => <Link to={to} {...p} />}>
        <ToastProvider>
          <App />
          <TooltipHost />
        </ToastProvider>
      </LepideProvider>
    </ThemeProvider>
  </BrowserRouter>,
);

function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return (
    <Dropdown
      ariaLabel="Theme"
      value={theme}
      onChange={(v) => setTheme(v as 'light' | 'dark' | 'hc')}
      options={[
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'hc', label: 'High contrast' },
      ]}
    />
  );
}
```

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `LepideProvider`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` * | `ReactNode` | — |  |
| `link` | `LinkComponent` | — |  |

### `ThemeProvider`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` * | `ReactNode` | — |  |
| `storageKey` | `string` | `'lepide.theme'` |  |

### Types

```ts
// import type { LinkComponent } from '@lepide/ds-react'
type LinkComponent = ComponentType<LinkProps>;
// import type { LinkProps } from '@lepide/ds-react'
type LinkProps = { to: string; className?: string; children?: ReactNode; /** Set on the link to the page being viewed (section navigation). Pass it through to the <a>. */ 'aria-current'?: 'page' | 'step' | 'location' | 'true'; onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void; };
```

`*` required.
<!-- props:end -->
