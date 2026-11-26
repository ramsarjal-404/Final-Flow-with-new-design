# Lepide Design System

This file is a complete, self-contained description of the **Lepide Design System**, the look and feel of the
Lepide console. A designer, a developer or an AI model should be able to rebuild any screen in the same style
from this file alone: §1–§8 describe the look and how to compose screens, and §9 lists every React export with its
props, types and helper signatures. Every value below is copied from the code; where the code and this file
disagree, the code wins and this file is out of date.

## 0. Using the Lepide Design System

**Before you design a screen, check the prototype (§10).** If the Lepide console prototype already has it ("create the
file server section", "alert status page"), build it like the prototype: same layout, sections, table columns, actions
and flow. Sign-in is always the prototype's sign-in. Only screens the prototype doesn't have are composed from §4.

| Prototype | Address | Use it for |
|---|---|---|
| Console (no sign-in) | https://lepide-new-ui.vercel.app | Every screen: layout, sections, columns, actions, flow |
| Sign-in | https://lepide-with-new-design.vercel.app/login | The sign-in screen and flow |

Open the live screen when you can; the catalog in `prototype/` (screenshots and facts for all 55 screens) is the copy
to use when you can't. `npm run prototype:check` confirms both sites answer and still have every catalogued screen.

**Light is the primary theme.** Every screen starts in light: design it, build it, review it and take screenshots in
light first, then check dark and high contrast. A page opens in light unless the user has chosen another theme
(`ThemeProvider` reads the saved choice, and with none it uses light); don't follow the computer's dark-mode setting
(`prefers-color-scheme`) and don't make dark the default. Dark and high contrast are options the user switches to.

Pick one route. All three give the same look because they share one stylesheet and one set of tokens.

| Route | When | Setup |
|---|---|---|
| **React** (preferred) | React 18 apps, POCs | `@lepide/ds-react` + `@lepide/ds-css` (not on npm: install them from the website, below). Build every screen from the kit's components (§3, and one page per component in `docs/components/`) |
| **Plain HTML / CSS** | Prototypes, POCs, other frameworks, static pages | `@lepide/ds-css` (`dist/lepide.css`), plus its optional `dist/lepide.js` for dialogs, field errors and toasts and `dist/lepide-art.js` for the Lepide AI orb and the sign-in animation (no framework). **Nothing installed?** Link the hosted copies: `https://lepide-new-ds.vercel.app/ds/lepide.css`, `https://lepide-new-ds.vercel.app/ds/lepide.js`, `https://lepide-new-ds.vercel.app/ds/lepide-art.js` (and `https://lepide-new-ds.vercel.app/ds/lepide-mark.svg`). Never write your own stylesheet instead. Use the CSS classes named in §3 and the markup in §4.1 and §7; each component page has a Plain HTML example |
| **Tokens only** | A product with its own components that must match | `@lepide/ds-css/tokens.css` or `tokens/build/json/tokens.json` |

The fonts come with the stylesheet: `@lepide/ds-css` embeds Manrope and Geist Mono (Latin and Latin Extended, SIL Open
Font License), so a page loads nothing from another site. The tokens-only route adds `@lepide/ds-css/fonts.css`.

React install (the packages aren't on the npm registry; the website serves the latest build, no account needed):

```bash
npm install https://lepide-new-ds.vercel.app/ds/lepide-ds-css.tgz https://lepide-new-ds.vercel.app/ds/lepide-ds-react.tgz react@18 react-dom@18
npm install highcharts   # only for charts and KPI cards (@lepide/ds-react/charts; commercial licence)
```

React setup, once at the root:

```tsx
import '@lepide/ds-css';
import { LepideProvider, ThemeProvider, ToastProvider, TooltipHost } from '@lepide/ds-react';

<LepideProvider link={RouterLink /* optional: your router's link, used by breadcrumbs */}>
  <ThemeProvider>                 {/* light | dark | hc on <html data-theme>, key "lepide.theme" */}
    <ToastProvider>
      <App />
      <TooltipHost />             {/* once: tooltips for icon buttons and [data-tip] */}
    </ToastProvider>
  </ThemeProvider>
</LepideProvider>
```

### Files in this repository

| File | What it holds |
|---|---|
| `DESIGN.md` | This spec |
| `docs/components/*.md` | One page per component: when to use, anatomy, variants, states, accessibility, do/don't, example, props |
| `docs/components.json` | The same for tools and AI: every component's import path, props (type, default), CSS classes, tokens and guidance |
| `tokens/src/*.json` | **Token source** (W3C DTCG): primitives, semantic and component tokens, dark and high-contrast overrides |
| `tokens/build/json/tokens.json` | Every token with its CSS name, tier, type, description and value per theme |
| `packages/css` (`@lepide/ds-css`) | `dist/lepide.css` = tokens + theme rules + component CSS (`src/components.css`, `src/components-derived.css`) |
| `packages/react` (`@lepide/ds-react`) | The React kit; charts at `@lepide/ds-react/charts` |
| `packages/react/src/assets/icons.json` | The icon set (Lucide outlines) |
| `llms.txt`, `llms-full.txt` | Index and full text for AI tools |
| `ai/` | Rules files for AI coding tools and the Claude skill; `ai/install.mjs` puts them and the MCP server into an app |
| `packages/mcp` (`@lepide/ds-mcp`) | MCP server: components, tokens, icons, spec sections, golden screens, search and a code checker (`validate_code`) |
| `examples/` | **Golden screens** — home (Lepide AI card with the orb, module tiles), dashboard, reports hub, alerts (list → drawer → confirm → toast), users admin, settings, file server settings with tabs, e-Discovery (tabs and sub-tabs, create dialogs, confirm), wizard, sign-in. React: `examples/screens/*.tsx`; complete static HTML: `examples/html/*.html` (all but e-Discovery and file server). Start new screens from the closest one. |
| Figma | [Lepide Design System](https://www.figma.com/design/GdZc2Hux1DgdJXCVQxjflx) — variables (Light / Dark / High contrast), text and effect styles, 78 icons and the core components, generated from these tokens |

---

## 1. The look in one paragraph

A calm, airy enterprise console. A pale grey canvas (`#f2f3f5`) carries four very faint colour washes
in its corners (green top-left, blue top-right, rose bottom-right, blue bottom-left). On it float white
surfaces: a **frosted-glass sidebar** with a 26 px radius, and **white cards with a 20 px radius**, a
hairline border and a soft, low shadow. Type is **Manrope** throughout (Geist Mono for code and IDs),
with tight negative letter-spacing on headings. Controls are **pills** (fully rounded). There is **one
brand colour, Lepide blue `#1c4599`**. Primary buttons and every *selected* state (active tab, current
tree item, current step, selected date) share one finish: a top-down blue gradient, a darker blue edge,
a thin white highlight inside the top edge and a soft blue glow. Everything else is neutral greys.
Icons are thin Lucide outlines (1.6 stroke). Motion is quick (150–250 ms), eased out, and small:
things rise 6–10 px and fade in, hover lifts by 1–2 px, pressed things shrink to 97 %.

### Principles

1. **Neutral first, blue for meaning.** Blue marks the primary action, the selection, links and focus.
   Red, amber and green appear only as status tones.
2. **Float, don't box.** Surfaces are white cards on a washed canvas, separated by space and soft
   shadow rather than heavy borders or dividers.
3. **Pills for controls, rounded rectangles for containers.** Buttons, inputs in toolbars, chips and
   segmented controls are pills; cards, dialogs, menus and form fields are rounded rectangles.
4. **One primary per view**, placed rightmost. A view is a page header, a dialog, a drawer, a wizard step or a
   form card's footer — a separate settings card may have its own Save, but never two primaries in one row.
5. **Quiet motion.** Short, eased-out, and it never moves content the user is reading. All of it turns
   off under `prefers-reduced-motion`.
6. **Accessible by default.** Text tones pass 4.5:1, every control has a visible focus ring, every chart
   has a text alternative.

---

## 2. Foundations

### 2.1 Colour — light theme (default)

**Brand**

| Token | Value | Use |
|---|---|---|
| `--brand` | `#1c4599` | Primary buttons, selected states, links, toggles on, focus |
| `--brand-600` | `#173b85` | Primary button border, selected-state edge |
| `--brand-700` | `#122f6c` | Primary button pressed |
| `--brand-400` | `#4f72c4` | Info tone dot |
| `--brand-300` | `#8aa3dc` | Focused input border |
| `--brand-200` | `#c7d4ef` | Filter input with a value |
| `--brand-100` | `#e3eaf8` | Text selection, brand chip ring, avatar fill |
| `--brand-50` | `#f2f5fc` | Brand tint backgrounds (selected option, info banner) |
| `--ai-glow` | `#2f6bf0` | Lepide AI orb highlight, with `--brand` and `--brand-700`; illustration only, never text or UI fills |
| `--brand-ink` | `= --brand` | Brand-coloured text (lighter in dark theme) |
| `--on-brand` | `#ffffff` | Text and icons on brand fills and the selected finish |
| `--on-brand-2` | `rgba(255,255,255,.7)` | Icons and secondary text on brand fills and the selected finish |
| `--on-brand-tint` | `rgba(255,255,255,.18)` | Count pills and badges on brand fills and the selected finish |

**Neutrals**

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#f2f3f5` | Page background |
| `--surface` | `#ffffff` | Cards, dialogs, menus, inputs |
| `--surface-2` | `#f7f8f9` | Table header, field fill, hover rows, dialog footers |
| `--surface-3` | `#eff1f3` | Chip fill, segmented track, icon-button hover |
| `--glass` | `rgba(255,255,255,.7)` | Sidebar |
| `--glass-strong` | `rgba(255,255,255,.86)` | Search pill, avatar ring, login card |
| `--border` | `#e7e9ed` | Default hairline |
| `--border-2` | `#dcdfe5` | Hover border, dashed "add" borders |
| `--border-soft` | `#eff0f3` | Card border, table row lines, dividers |
| `--ink` | `#121417` | Primary text, avatars, tooltip fill |
| `--ink-2` | `#4a4f58` | Secondary text, labels, body in tables |
| `--ink-3` | `#666b74` | Muted text (AA-adjusted; the original was `#7c818b`) |
| `--ink-4` | `#898d93` | Placeholders, disabled items, decorative icons (3:1). Never text people need to read: use `--ink-3` |

**Status tones** (background / text / dot)

| Tone | Base | `-bg` | `-text` (AA) | `-dot` |
|---|---|---|---|---|
| Success | `#12805c` | `#e8f6f0` | `#0f7353` | `#1ea976` |
| Warning | `#b4610a` | `#fdf3e4` | `#985107` | `#ce8422` |
| Danger | `#cf3a3f` | `#fdeeee` | `#b3313a` | `#ec5a5f` |
| Info | `= --brand` | `= --brand-50` | `= --brand-ink` | `--brand-400` |

Use `-text` for words on a tinted background (chips, tone tags, banners, field errors), `-dot` for small
solid marks (status dots, timer bars), `-bg` for the tint.

**The selected-state finish** — used by primary buttons and every selected item:

```css
--sel-fill:   linear-gradient(180deg,#2550a8 0%,var(--brand) 100%);
--sel-shadow: inset 0 0 0 1px var(--brand-600), inset 0 1px 0 1px rgba(255,255,255,.18), var(--sh-brand);
--sel-ring:   inset 0 0 0 1px var(--brand-600), inset 0 1px 0 1px rgba(255,255,255,.18);  /* small items: no glow */
```

Selected text is white. Never use black/ink fills for selection.

**Canvas washes** (on `.app::before`, behind everything):

```css
background:
  radial-gradient(42% 46% at 0% 0%,     rgba(46,170,120,.10), transparent 70%),
  radial-gradient(40% 44% at 100% 0%,   rgba(28,69,153,.10),  transparent 70%),
  radial-gradient(46% 50% at 100% 100%, rgba(236,120,130,.08), transparent 70%),
  radial-gradient(40% 40% at 0% 100%,   rgba(28,69,153,.06),  transparent 70%);
```

### 2.2 Colour — dark and high-contrast themes

Light (§2.1) is the default and primary theme; these two are options the user picks. Set with `<html data-theme="dark">`
or `data-theme="hc"` (stored in `localStorage['lepide.theme']`); no attribute means light.
**Status: all three themes are stable.** Every text and icon colour pair meets WCAG 2.2 AA in each theme; `npm run contrast` (`tokens/contrast.mjs`) checks them and runs in `npm test`.

| Token | Dark | High contrast |
|---|---|---|
| `--canvas` | `#0f1216` | `#ffffff` |
| `--surface` | `#171b21` | (unchanged `#ffffff`) |
| `--surface-2` / `-3` | `#1d222a` / `#252b34` | `#ffffff` / `#eceef1` |
| `--border` / `-2` / `-soft` | `#2b313b` / `#363d49` / `#222831` | `#5b616b` / `#3d434c` / `#5b616b` |
| `--ink` / `-2` / `-3` / `-4` | `#eef0f3` / `#c5cad3` / `#9aa1ad` / `#6e7581` | `#000000` / `#1f2328` / `#3d434c` / `#5b616b` |
| `--brand` | `#3a5fb8` (`--brand-ink` `#8fabeb`) | `#0f3480` |
| `--brand-50…200` | `#1a2540`, `#22305a`, `#2e4378` | (unchanged) |
| `--ai-glow` | `#5d8df5` | (unchanged) |
| Success / warning / danger text | `#4cc79a` / `#f2b25c` / `#f07a7e` | (unchanged) |
| Shadows | Black-based, deeper | None |
| Selected finish | Gradient `#4a6fc8`→brand, `--brand-700` edge | Solid brand, 2 px black inset ring |

High contrast also adds a 1 px border to every card and the sidebar, hides the canvas washes, and uses a
3 px solid black focus outline.

### 2.3 Chart palette

Ordered series colours `--c1`…`--c6`: **`#1c4599`, `#ee8a5f`, `#b8c8f0`, `#4f72c4`, `#f5c39e`, `#8aa3dc`**
(blue, coral, pale blue, mid blue, peach, soft blue). Product colour names map to design-system values:

| Product name | Value | Product name | Value |
|---|---|---|---|
| `chart-green` | `#1c4599` | `dch-orange` | `#ee8a5f` |
| `chart-red` | `#ee8a5f` | `dch-amber` | `#f2a46f` |
| `chart-yellow` | `#b8c8f0` | `dch-salmon` | `#f5c39e` |
| `dch-indigo` | `#3d63bf` | `dch-crimson` | `#cf3a3f` |
| `dch-blue` | `#4f72c4` | `dch-green-dark` | `#122f6c` |
| `dch-blue-soft` | `#8aa3dc` | `dch-purple` | `#c7d4ef` |

Chart chrome: text `--chart-text` `#666b74` 11 px (AA), grid `--chart-grid` `#eceef1`, ink `#121417`, gauge
track `--chart-track` `#eff1f3` (light values; dark and high contrast have their own). `Chart` reads these tokens
from the page when it draws and redraws when `data-theme` changes, so charts follow the theme by themselves.

### 2.4 Typography

Fonts (embedded in `@lepide/ds-css`): **Manrope** 400/500/600/700/800 and **Geist Mono** 400/500.

```css
--font: "Manrope", ui-sans-serif, system-ui, "Segoe UI", sans-serif;
--mono: "Geist Mono", ui-monospace, "SFMono-Regular", Consolas, monospace;
body { font: 400 14px/1.5 var(--font); -webkit-font-smoothing: antialiased; }
```

Type scale (weight size/line-height, letter-spacing):

| Role | Spec | Colour |
|---|---|---|
| Home hero title | 500 38/46, −0.04em | ink |
| Page title (`.head h2`) | 600 30/38, −0.035em, `text-wrap: balance` | ink |
| Login title | 600 30/38, −0.035em | ink |
| AI hero title | 600 24/30, −0.03em | ink |
| Modal title | 700 19/26, −0.025em | ink |
| Section title | 700 18/26, −0.02em | ink |
| Drawer title / empty-state title | 700 18/26, −0.025em / −0.02em | ink |
| Card title (`.lf-card__title`) | 700 15/22, −0.01em | ink |
| Module tile title | 700 15.5/22, −0.015em | ink |
| KPI value | 600 34/40, −0.04em, tabular figures | ink |
| Body / page description | 400 14/21 | ink-3 |
| Nav item | 600 13.5/1 | ink-2 (current: ink) |
| Button | 600 13/1 (sm 12.5, lg 14) | — |
| Field input | 500 14/20 (dialog fields), 500 13.5/20 (pill inputs) | ink |
| Field label | 600 13/18 (dialog), 600 12.5/18 (pill fields) | ink / ink-2 |
| Table body | 500 13/18; first column 600 ink | ink-2 |
| Table header | 600 12/16 | ink-3 |
| Card subtitle (`small`) | 500 12.5/18 | ink-3 |
| Breadcrumbs | 500 12.5/18 (current item 600 ink-2) | ink-3 |
| Eyebrow | 600 12.5/16 | brand |
| Chip | 600 11.5/1 | by tone |
| Group label (sidebar) | 600 11.5/14 | ink-4 |
| Mono cell | 400 12.5/18 Geist Mono, −0.01em | ink-2 |

Rules: no all-caps text except the nudge context line (700 11/16, +0.04em); headings get negative
letter-spacing, body text none. Numbers in tables, KPIs and counters use `font-variant-numeric: tabular-nums`.

### 2.5 Spacing, radius, elevation

Spacing is a 4 pt scale: `--s1 4` · `--s2 8` · `--s3 12` · `--s4 16` · `--s5 20` · `--s6 24` · `--s7 28` ·
`--s8 32` · `--s10 40` (px). Common gaps: 8 between buttons, 16 between cards, 20 between page sections.

| Radius token | Value | Used for |
|---|---|---|
| `--r-xs` | 8 px | Menu items, tooltip, radio rows |
| `--r-sm` | 10 px | Tree items, sub-nav items, dropdown options |
| `--r-md` | 14 px | Dialog fields, dropdown panel, menus, notification cards, nav items |
| `--r-lg` | 20 px | **Cards**, account menu |
| `--r-xl` | 26 px | **Sidebar, modals, drawers** |
| `--r-pill` | 999 px | Buttons, pill inputs, chips, segmented controls, toggles |

Icon tiles use 11–14 px radii (36 px tile → 11 px, 44 px tile → 14 px); login card 32 px.

| Shadow | Value | Used for |
|---|---|---|
| `--sh-xs` | `0 1px 2px rgba(18,20,23,.05)` | Buttons, chips, small tiles |
| `--sh-sm` | `0 1px 2px rgba(18,20,23,.04), 0 4px 14px -6px rgba(18,20,23,.08)` | Cards at rest, sidebar |
| `--sh-md` | `0 1px 3px rgba(18,20,23,.05), 0 14px 34px -14px rgba(18,20,23,.16)` | Hovered cards, menus, tooltips |
| `--sh-lg` | `0 2px 6px rgba(18,20,23,.05), 0 28px 70px -20px rgba(18,20,23,.28)` | Modals, drawers, account menu |
| `--sh-brand` | `0 1px 2px rgba(28,69,153,.25), 0 8px 20px -8px rgba(28,69,153,.55)` | Primary button glow |
| `--ring` | `0 0 0 3px rgba(28,69,153,.18)` | Focus ring on fields |

Z-index order (`--z-*`): sidebar 30 · popover menus 40 · mobile dock 50 · collapsed-nav flyout 60 · drawers 70 ·
modals 80 · account menu 90 · notification cards 100 · tooltip 120 · dropdown panel 130 · nudge 140.

### 2.5.1 Other token groups

The token build also provides these, so values never need to be retyped from prose:

| Group | CSS names | Notes |
|---|---|---|
| Type styles | `--type-display`, `--type-page-title`, `--type-modal-title`, `--type-card-title`, `--type-body`, `--type-label`, `--type-table`, `--type-caption`, `--type-mono`, … | Font shorthand (`font: var(--type-card-title)`); letter-spacing in `--type-<name>-ls`. Same values as the §2.4 table |
| Component sizes | `--btn-h` 38, `--btn-h-sm` 32, `--btn-h-lg` 44, `--field-h` 46, `--input-h` 40, `--card-pad` 20, `--table-head-h` 42, `--table-row-h` 56, `--modal-w` 760, `--drawer-w` 440, `--toggle-w`/`-h` 38/22, `--chip-h` 22, … | Tier-3 tokens; see `tokens/src/component.json` |
| Breakpoints | `--bp-xl` 1280, `--bp-lg` 1100, `--bp-md` 860, `--bp-sm` 620 | For reference — `@media` can't read custom properties |
| Icons | `--icon-xs` 12 … `--icon-lg` 24, `--icon-stroke` 1.6 | See §2.7 |
| Effects | `--focus-outline`, `--canvas-wash`, `--opacity-disabled` (.45) | |

Tokens come in three tiers: **primitives** (raw palette, e.g. `primitive.blue.500`; never used in components and
not emitted as CSS), **semantic** (everything above) and **component**. Old alias names (`--line`, `--mint`,
`--violet`, `--radius-*`, `--dur-*` …) have been removed — use the names in this file.

### 2.6 Motion

| Token | Value |
|---|---|
| `--t-fast` / `--t-base` / `--t-slow` | 150 / 200 / 250 ms |
| `--ease` | `cubic-bezier(.2,.7,.2,1)` — general |
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` — entrances |
| `--ease-in` | `cubic-bezier(.4,0,1,1)` |

Keyframes (reuse these, don't invent new ones):

| Name | Movement | Used by |
|---|---|---|
| `fade-up` | from opacity 0, `translateY(6px)` | Page views, sub-pages, table rows, errors |
| `rise-in` | from opacity 0, `translateY(10px) scale(.985)` | Cards, KPI tiles, modals |
| `pop-in` | from opacity 0, `translateY(-4px) scale(.97)` | Menus, applied filter chips, badges |
| `slide-in` | from opacity 0, `translateX(24px)` | Drawers, detail panels |
| `fade-in` | opacity | Scrims |
| `shimmer` | gradient sweep, 1.1 s linear infinite | Skeletons |
| `shake` | ±4 px | Invalid fields, empty submit |
| `spin` | 360°, 0.7 s linear | Button spinners |
| `ring-out` | brand ring expanding 0→12 px | Empty-state icon |

Patterns: grids stagger children by 40 ms (`.panels`, `.kpis`); table rows stagger 20 ms up to 140 ms.
Hover: cards gain `--sh-md`; tiles lift `translateY(-2px)`; arrows nudge `translateX(1–3px)`. Press:
`scale(.97)` for buttons (80 ms), `.985` for nav items, `.99` for tiles.
Reduced motion: every animation and transition is cut to 1 ms.

### 2.7 Icons

Lucide outline icons drawn inline as SVG: `viewBox 0 0 24 24`, `fill none`, `stroke currentColor`,
**stroke-width 1.6**, round caps and joins, default **16 px** (`svg.lf-i`). Sizes: 12 in chips, 14–15 in
menus and small buttons, 16 in buttons and fields, 19 in the sidebar, 20 in module tiles, 24 in empty
states. Icons take the text colour of their container (usually ink-3, brand when active).

Available names: `settings chevron arrow plus search calendar refresh external share up down eye folder
file filter download user logout collapse chevron-right chevrons-left chevrons-right check x minus sort
trash chevron-left lock sparkles star bell users clipboard home mail file-search edit more info alert
upload server database globe key shield clock play pause link copy layers archive list sliders plug
card history restore send terminal cpu tag cloud building user_plus save grid`, plus module icons `ai auditor
trust detect protect identify mylepide dashboards settings`. Use only these names (note the underscore in
`user_plus`). In plain HTML copy the icon's value from `line` in `packages/react/src/assets/icons.json` into
`<svg class="lf-i" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">…</svg>` (set `width`/`height` to the
size you need from the list above). The module icons (`ai`, `auditor` … `settings`) are multi-colour drawings under
`module` in the same file, not `line`: copy them as `<svg viewBox="0 0 24 24" width="19" height="19" fill="none"
aria-hidden="true">…</svg>`. The golden HTML sidebar (`examples/html/*.html`) has every module icon in place.

**Brand files — always take the logo from `brand/`** (never redraw it, recolour it or rebuild it from text):

<img src="brand/lepide-mark.svg" alt="The Lepide mark" width="56" height="56"> &nbsp; <img src="brand/lepide-logo.png" alt="The Lepide logo" height="56">

| File | What it is | Use |
|---|---|---|
| [`brand/lepide-mark.svg`](brand/lepide-mark.svg) | The Lepide mark, vector, sky blue `#2498D4` on transparent | The sidebar brand tile, favicons, small spaces; any size |
| [`brand/lepide-logo.svg`](brand/lepide-logo.svg) | The full logo (mark + "Lepide" wordmark) as supplied — an SVG wrapping a 4096 × 1690 PNG | Sign-in, title slides, documents, anywhere the name should show |
| [`brand/lepide-logo.png`](brand/lepide-logo.png) | The same full logo as a plain PNG (4096 × 1690, transparent) | Where an SVG can't be used (email, Office) |

The kit's `BrandMark`, `MARK_URL` and the MCP server's `search_icons("lepide")` all use `brand/lepide-mark.svg` (the
build copies it into `packages/react/src/assets/`). In a static page, point `src` at the file or copy it next to the
page as the golden HTML does. Rules: keep the mark's proportions and its one colour; on dark surfaces it sits in its
white tile; give it clear space of at least a quarter of its height; don't add effects, outlines or other colours. See
[brand/README.md](brand/README.md).

In the console the mark is shown in a 36 px white tile with an 11 px radius (`--sh-xs` + inset `--border-soft` ring),
beside **Lepide** (800 16/20, −0.02em) and *Data Security Platform* (500 11.5/15 ink-3).

---

## 3. Components

All sizes in px. "Hover", "focus" etc. list only what changes.

### 3.1 Buttons (`.lf-btn`, `<Button>`)

| Variant | Spec |
|---|---|
| Base / secondary | Inline-flex, gap 8, **height 38, padding 0 16, pill**, 1 px `--border`, white, ink text, 600 13/1, `--sh-xs`. Hover: `--border-2`, `--surface-2`, `--sh-sm`. Active: `scale(.97)`. Disabled: opacity .45, no shadow |
| Primary `--primary` | Background `linear-gradient(180deg,#2550a8 0%,#1c4599 100%)`, border `--brand-600`, white text, shadow `inset 0 1px 0 rgba(255,255,255,.18), --sh-brand`. Hover: gradient `#21499a→--brand-600`, border `--brand-700`, bigger glow `0 12px 24px -10px rgba(28,69,153,.6)`, its icon nudges 1 px right. Active: `--brand-700` |
| Danger `--danger` | Secondary with danger text and `#f3d2d3` border; hover `--danger-bg`, border `#efb9bb` |
| Danger solid | `--danger` fill, `#b8303a` border, white text, red glow; hover `#b8303a` |
| Ghost (`.lf-pill`) | Secondary with 500 weight ink-2 text |
| Sizes | `--sm` 32 tall, padding 0 13, 12.5 px · md 38 · `--lg` 44 tall, padding 0 20, 14 px |
| Icon button `--icon` | 34 × 34 round, transparent, ink-3 icon 16; hover `--surface-3`, ink. `bordered`: 1 px border, white, `--sh-xs`. Always has an `aria-label`, shown as a tooltip |
| Loading | 15 px ring spinner replaces the leading icon (`2px solid rgba(18,20,23,.14)`, top brand; white on primary), button disabled, `aria-busy` |
| Dot | 8 px brand dot at top-right with a 2 px white ring (e.g. filters applied) |

Text link `.lf-link`: brand, 600, underline on hover with 3 px offset.

### 3.2 Inputs

**Pill input** (`.lf-input`, toolbars and search): height 40, padding 0 14, pill, 1 px border, white,
16 px ink-3 leading icon, text 500 13.5/20, placeholder ink-4 400. Hover `--border-2`. Focus-within:
`--brand-300` border + `--ring`. `--pill` variant: `--surface-2` fill, no border until hover.

**Dialog / page field** (`.fld`, used in every form): markup `<div class="fld"><label class="fld__lbl">…</label><input></div>`.
**The field styles apply only inside a `.modal__form` (every `<Modal>` body) or a `.page-form` container** —
wrap page forms in `<div class="page-form">`; a bare `.fld` input elsewhere gets no field styling (or add
`class="fld__plain"` to the input). Label 600 13/18 ink (optional hint `em` 500 12 ink-4),
gap 7. Control: **height 46, padding 0 14, radius 14, 1 px border, fill `--surface-2`**, 500 14/20.
Hover border `--border-2`. Focus: white fill, `--brand-300` border, `--ring`. Textarea min-height 84.
Invalid (`.fld.is-bad`): danger border, white fill, `0 0 0 3px rgba(207,58,63,.12)`, one `shake`; error
line below: 600 12/16 danger-text with a 14 px circled "!" icon, fades up. Two fields side by side:
`.fld-row` grid 1fr 1fr, gap 14 (one column under 620 px).

Password field: 34 px round eye button inside the right edge (`--brand-ink` when showing). Number field:
the input, then 28 px round − and + buttons to its right, then an optional unit suffix.

**Search pill** (top bar): height 44, padding 0 8 0 16, `--glass-strong` with 12 px backdrop blur,
border `rgba(18,20,23,.06)`, `--sh-xs`; a `Ctrl K` keycap (26 tall pill, `--surface-3`, 600 11 ink-3).

### 3.3 Dropdown / select (`<Dropdown>`, `.dd`)

Never use a native `<select>`.

| Part | Spec |
|---|---|
| Trigger | Same as a dialog field: 46 tall, radius 14, `--surface-2`, padding 0 8 0 14, value 500 14/20 (placeholder ink-4 400). Right: 28 px round chevron well (ink-3; hover `--surface-3`; open: `--brand-50` with brand chevron rotated 180°). Hover: white + `--border-2`. Open/focus: white, `--brand-300`, `--ring`. Invalid: danger border + red ring |
| Sizes | `--sm`: 36 tall, radius 10, 13 px (inline: tables, time pickers). `--pill`: 40 tall pill, white, `--sh-xs` (toolbars) |
| Panel | Portal, `position: fixed`, at least trigger width, z 130, 6 px gap below (flips above when there's no room). White, 1 px border, **radius 14, padding 6**, shadow `0 2px 6px rgba(18,20,23,.05), 0 18px 40px -12px rgba(18,20,23,.22)`, enters with `dd-in` 160 ms (−4 px, scale .98). Max height 320 |
| Search | Shown past 8 options: 38 tall, radius 10, `--surface-2`, 15 px search icon; focus white + ring |
| Option | Min-height 38, padding 8 10 8 12, radius 10, 500 13.5/20 ink-2, gap 2 between rows. Hover/keyboard: `--surface-2` ink. **Selected: `--brand-50`, brand-ink, 600, brand check icon at the right** (`--brand-100` when also active). "None" row in ink-3 with a hairline under it. Disabled ink-4 |
| Keyboard | ↓/↑/Enter/Space open; arrows, Home/End, PageUp/Down move; Enter picks; Esc closes; typing jumps to the matching option |

### 3.4 Checkbox, radio, toggle

* **Checkbox** `.lf-check`: 16 × 16 box, radius 5, 1.5 px `--border-2`, white; hover border ink-3; checked
  brand fill with a white tick (4 × 8, 2 px); indeterminate white 2 px bar; label 500 13/18 ink-2, gap 10.
* **Radio rows** `.lf-radio label`: min-height 36, padding 0 10, radius 8, 500 13/18 ink-2; hover
  `--surface-2`; checked row `--brand-50` with ink text; native radio with `accent-color: var(--brand)`, 15 px.
* **Toggle** `.lf-toggle`: track 38 × 22 pill `--toggle-off` `#d9dce2` (hover `--toggle-off-hover` `#ccd0d7`; darker in the dark theme), on = brand. Knob 16 px white
  with a soft shadow, 3 px inset, slides 16 px (250 ms `--ease-out`) and stretches to 20 px while pressed.

### 3.5 Chips, tone tags, counters

* **Chip** `.lf-chip`: 22 tall pill, padding 0 9, `--surface-3`, ink-2, 600 11.5. Tones: `--brand` (brand-50,
  brand text, 1 px brand-100 inset ring), `--good` / `--warn` / `--bad` (tone bg + tone text), `--flat` (ink-3).
* **Tone tag** `.lf-tone` (the `<ToneTag>` component renders the identical `.fx-op`): 24 tall pill, padding 0 10 0 8,
  a 6 px dot in `currentColor`, then text; tones `--good` / `--warn` / `--bad` (and `--info` on `.fx-op`).
* **Counter**: tree counts (`.tree .n`) are 20 tall pills, min-width 26, `--surface-3`, 700 11 ink-3 tabular;
  on a selected row they become `rgba(255,255,255,.16)` with white text. Toolbar counts (`.count-chip`) are
  pills with padding 5 9, `--surface-3`, 600 11.5 ink-3.
* **Avatar**: round, 28 (tables) / 26 (sidebar) / 34 (top bar) / 44 (menu). Account avatars are ink with white
  700 initials; people in tables cycle tints: brand-100/brand, `#e4efe9/#1d7a55`, `#f6e7df/#a4552c`,
  `#ece8f6/#5a4a9a`, `#e6edf1/#3e6276`.

### 3.6 Segmented control and tabs

* **Segmented** `.seg`: track pill `--surface-3`, 1 px `--border-soft`, padding 4, gap 2. Segments 32 tall,
  padding 0 14, pill, 600 12.5 ink-3 (hover ink). **Selected: `--sel-fill`, white, `--sel-shadow`.** Optional
  count badge: 18 tall pill, 700 10.5, `rgba(18,20,23,.07)` (white 18 % when selected).
* **Vertical tabs** `.tabs` (inside dialogs): items 40 tall, padding 0 12, radius 14, 600 13 ink-3; hover
  `--surface-2`; current: selected finish.
* **Page tabs** (a page with views, e.g. e-Discovery Cases | Settings): a `<Segmented hug>` passed as `PageHeader`'s
  children, so it sits under the title, left-aligned (on a settings page with a section nav, a full-width `Segmented`
  at the top of the settings body instead, §4.2); the header's primary action follows the tab on show.
  **Sub-tabs** (a tab with its own views, e.g. Settings › Agents | Indexed locations): a second `<Segmented hug>` on
  the same line, after the first, shown only while its parent tab is selected — wrap both in `<div className="row
  row--wrap">`. Sub-tab items may carry an icon (`{ value, label, icon: 'server' }`) and a `count`. Never nest
  more than two levels.

### 3.7 Cards

* **Card** `.lf-card`: white, 1 px `--border-soft`, **radius 20, padding 20, `--sh-sm`**. `--lift`: hover `--sh-md`
  and `--border`. Title `.lf-card__title` 700 15/22 −0.01em, margin-bottom 14, optional `small` subtitle
  500 12.5/18 ink-3 (in panels the subtitle sits under the title).
* **Panel** (chart card) `.panel` on a card (`<Card className="panel" title=… sub=…>`): flex column, min-height 330.
  Grid `.panels`: 3 columns, gap 16 (2 under 1280 px, 1 under 860 px); `.panel--wide` spans 2. Two equal panels
  side by side: `.panels.panels--2` (1 column under 860 px).
* **Settings card** `.set-card`: no padding; head 18 20 14 with a bottom hairline (title 700 15/22, text
  400 13/19 ink-3); body padding 20, gap 16; foot 14 20 on `--surface-2` with a top hairline, buttons right.
* **Key/value grid** `.kv`: 2 columns, gap 8; each cell `--surface-2`, radius 14, padding 12 14; `dt` 600 12
  ink-3, `dd` 600 13.5 ink.
* **Setting row** `.setrow`: text left (600 13.5 ink + 400 12.5 ink-3), control right, 14 px vertical padding,
  hairline between rows.

### 3.8 KPI card (`<KpiCard>`, `.lf-stat`)

Card with padding 20 20 0. Grid: label (600 13/18 ink-2) with a delta chip top-right (24 tall, tone by
meaning, up/down arrow 11 px); **value 600 34/40, −0.04em, tabular, counts up from 0 over 1.2 s** (quartic
ease-out); foot 500 12.5/18 ink-3; optional full-bleed 56 px sparkline at the bottom edge. Hover lifts
2 px. Row of four (`.kpis`, gap 16; 2 under 1280, 1 under 620), staggered `rise-in`.

### 3.9 Tables (`<DataTable>`, `.lf-table`)

* Container `.tablecard`: a card with no padding; toolbar 16 20 12 (title + count chip left, search
  field 280 wide and bordered 32 px icon buttons right).
* Header: sticky, **42 tall, `--surface-2`, 600 12/16 ink-3**, hairlines top and bottom. Sortable headers
  show a 12 px arrow (brand when sorted). Optional filter row under it: 44 tall, 30 tall pill inputs.
* Rows: **56 tall**, padding 0 16 (first cell 20), hairline `--border-soft` between rows, white. Text 500
  13/18 ink-2; **first column 600 ink and sticky** (a soft shadow appears on its right edge once scrolled;
  not sticky when the table is under 760 px wide). Cells truncate with an ellipsis.
* Row hover `--surface-2`; selected `--brand-50` with a 3 px brand bar on the left; keyboard focus `--brand-50`.
  Selection: `selectable="multi"` adds a checkbox column; `selectable="single"` selects a row on click/Enter.
  Disabled rows (`isRowDisabled`): `--ink-4` text, not-allowed cursor, no hover, can't open or select.
* Row actions: 30 px icon buttons, hidden until row hover/focus (fade + slide 4 px; always shown on touch).
  Trailing "open" circle 30 px turns into the selected finish on hover and slides 2 px right.
* Loading: skeleton rows (10 px pill bars with `shimmer`). Empty: centred ink-3 text, 180 tall.
* Pager `.pager`: total on the left; 34 px round step buttons; a 44 × 34 pill page input; page-size pill
  button at the right; top hairline, padding 12 20.

### 3.10 Filter chips (above report tables)

`.fchip` 32 tall pill, white, 1 px `--border-soft`, `--sh-xs`, 500 12.5 ink-2 with the field in 600 ink.
Locked filter: `--surface-2`, lock icon. Applied: `--brand-50`, `--brand-100` border, value 600 brand, a 22 px
round remove button (hover brand fill, white ×), pops in. Add: dashed `--border-2`, transparent, hover
solid brand. "Clear n filters": text pill, hover `--danger-bg` danger.

### 3.11 Menus and tooltip

* **Popover menu** `.pop`: white, 1 px border, radius 14, padding 6, `--sh-md`, z 40, `pop-in` from the
  top-right. Items 36 min-height, padding 0 10, radius 8, 500 13/18 ink-2, 15 px ink-3 icon; hover
  `--surface-2` ink; selected: 600 ink with a 6 px brand dot at the right; danger item: danger text,
  hover `--danger-bg`; separators 1 px `--border-soft` with 4 6 margin.
* **Account menu** `.umenu`: 288 wide, radius 20, `--sh-lg`; head with a 44 px ink avatar, name 700 14,
  email 500 12.5 ink-3, role chip; items 40 tall, 600 13.5 ink-2 with 17 px icons; sign-out hovers red;
  a theme dropdown (Light / Dark / High contrast).
* **Tooltip** `.tipfloat`: ink fill, white 600 12/16, padding 6 10, radius 8, z 120; fades in 150 ms with a
  2 px rise. Shown by `<TooltipHost>` (mount once) for any element with `data-tip="…"` and for every icon-only
  button (`.lf-btn--icon`, using its `aria-label`): after 350 ms on hover, immediately on keyboard focus.

### 3.12 Modal (`<Modal>`)

Scrim `rgba(18,20,23,.28)` with 3 px backdrop blur, z 80. Card: **radius 26, `--sh-lg`**, widths 760
(default) / 580 (`--sm`) / 460 (`--xs`) / 960 (`--lg`), max height `100dvh − 32`, enters with `rise-in`.
Head: padding 24 24 16, a 44 px icon tile (radius 14, `--brand-50`, brand icon, brand-100 inset ring;
danger variant red), title 700 19/26 −0.025em, subtitle 500 13.5/20 ink-3, × icon button at the right.
Body: padding 0 24 24, gap 16, scrolls. Footer: padding 16 24, top hairline, `--surface-2`, buttons 40
tall at the right (primary last). Escape and the × close it.

**Wizard steps** `.steps`: numbers in 24 px circles (`--surface-3`, 700 11.5 ink-3); current and done steps
use the selected finish (`--sel-ring`); labels 600 13 ink-4 (current ink); connector 2 px lines.

**Confirm dialog**: `--xs` modal, danger icon tile for destructive actions, danger-solid confirm button.
Focus starts on Cancel for destructive confirms (on the confirm button otherwise), so Enter never deletes by accident.

### 3.13 Drawer and detail panel

Drawer: z 70, scrim `rgba(18,20,23,.24)` with 2 px blur. Panel **floats 12 px inside the window edge**
(top, right, bottom), width 440 (chat 500, record 480), radius 26, `--sh-lg`, enters with `slide-in`.
Head padding 22 22 14, title 700 18/26; × is a bordered icon button. Body padding 6 22 20, gap 14. Foot
padding 14 22, `--surface-2`, top hairline. On phones it becomes a bottom sheet (8 px inset, max 86dvh).
Non-modal detail panel: a 420 px sticky column beside the content, same inner layout.

### 3.14 Notifications

Two forms, chosen automatically:

**Card stack** (everything except an error or warning that answers a click): fixed bottom-right, 20 px from the edges
(92 px from the bottom on phones), width `min(360px, 100vw − 32px)`, z 100. Card: white, 1 px border,
radius 14, shadow `0 1px 2px rgba(18,20,23,.06), 0 16px 36px -14px rgba(18,20,23,.26)`, padding
12 42 14 12. Left: a 36 px tone tile (radius 11; tone bg + tone ink icon; spinner while loading). Title
700 13.5/20 ink, message 500 12.5/18 ink-2, up to two small buttons (main one primary). × 28 px round at
top-right. A 3 px timer bar along the bottom in the tone dot colour shrinks over 5 s (errors 7 s) and
pauses while the stack is hovered or focused. Repeats add a ×N count. Older cards fold behind the newest
(12 px higher and 5 % smaller each; 3 visible, 5 kept) and fan out on hover. Drag right past 90 px to
dismiss. Cards enter from below and leave sliding right.

**Nudge** (an error or warning raised within 1.2 s of clicking a button): a 320 px callout above the
clicked control (below when there's no room) with a 12 px arrow pointing at it, radius 14, `--sh-lg`, z 140.
Contains a 30 px tone tile, an uppercase context line (700 11/16, +0.04em, tone ink), the message
(700 13/19) and actions such as "Validate now". The control shakes once and pulses a red ring. Closes on
×, Escape, a press elsewhere, typing, an action, or its 8 s timer. Tones: info (brand), success, warning,
error.

### 3.15 Feedback blocks

* **Banner** `.banner`: padding 10 14, radius 14, 500 13/19 ink-2, 16 px tone icon; info `--brand-50`,
  success / warning / error on their `-bg`.
* **Empty state** `.empty`: dotted field (1 px dots every 18 px on `--surface-2`, edges faded by a radial
  mask), radius 14, min-height 300, centred; a 56 px white icon tile (radius 18, brand icon, `--sh-md`,
  pulsing `ring-out`); title 700 18/26; text 14/21 ink-3 max 46ch; then an action.
* **Progress** `.progress`: 8 px pill track `--surface-3`, brand fill, value 600 12 tabular at the right;
  indeterminate sweeps a 30 % bar.
* **Upload** `.upload`: dashed `--border-2`, `--surface-2`, radius 14, padding 24; hover/drag `--brand-50`
  with a `--brand-300` border.
* **Page loader**: 32 px ring spinner (`--surface-3` with a brand top) and a 500 13 ink-3 caption.

### 3.16 Pickers and tiles

* **Date range picker** `.dp`: 320 wide popover; month grid of 34 px round days (500 13 ink-2), hover
  `--surface-3`, today a 1 px brand inset ring, range days `--surface-3` with radius 8, **start/end days
  use the selected finish**; footer with Cancel / Apply.
* **Tile picker** `.pick`: grid of ≥200 px tiles, padding 14, radius 14, 1 px border; 36 px brand-50 icon
  tile, title 700 13.5, text 500 12 ink-3; hover lifts 1 px; chosen: brand border and an 18 px round
  selected-finish check at the top-right.
* **Column / filter rows** (builders): 44 tall white rows, radius 14, `--sh-xs`, numbered 22 px badge, a
  dotted grip, × that hovers red; "add" rows are dashed and turn solid brand on hover.

### 3.17 Charts (`<Chart kind=…>`, Highcharts 13)

Built on Highcharts (`highcharts`, `highcharts-more` for bubbles, `solid-gauge` for gauges and rings), which
`@lepide/ds-react/charts` imports for you. Highcharts needs a commercial licence before it ships in a product:
the kit doesn't include one, so the product that ships it buys it.

`kind` decides the shape of `data`, and TypeScript checks it (`ChartData` in §9 has every shape):

| `kind` | Use it for | `data` |
|---|---|---|
| `columns` | A value per category, one colour per bar | `{ labels, values, name?, colors? }` |
| `dateColumns` | A count per day or week | `{ labels, values, name?, color? }` — labels like `28-10-2026`, `2026-10-28` or `28 Oct` |
| `stacked` | Several series per category | `{ labels, series: [{ name, values, color? }] }` |
| `pairedBars` | Horizontal bars, several series per row | `{ rows, series }` |
| `areaBars` | Bars with a trend line over them | `{ bars, line, labels, markers?, barName?, lineName? }`. One label per bar labels every bar. To label only some bars, `markers` lists their indexes and `labels` has one entry per marker: `labels[k]` labels bar `markers[k]` |
| `multiArea`, `line` | Series over time | `{ labels, series }` |
| `donut`, `calloutDonut`, `gaugeDonut`, `donut3d` | Parts of a whole (`calloutDonut` prints %; `donut3d` draws flat) | `{ segments: [{ label, value, color? }], value?, caption? }` |
| `rings` | Up to four percentages | `{ rings: [{ label, value, color? }] }` |
| `bubbles` | x / y / size points | `{ points: [{ label, x, y, size, color? }] }` |
| `speedometer` | One score against bands | `{ value, max?, name?, bands: [{ to, label, color? }] }` |

Colours: leave `color` out and series take the palette in order (`#1c4599`, `#ee8a5f`, `#b8c8f0`, `#4f72c4`,
`#f5c39e`, `#8aa3dc`). To pick one, use its name `var(--c1)` … `var(--c6)` (same order). The product colour
names older screens use are mapped into the same palette, so **`var(--chart-green)` is blue `#1c4599`,
`var(--chart-red)` is coral `#ee8a5f` and `var(--chart-yellow)` is light blue `#b8c8f0`**. Red, amber and green
mean status, so charts use them only where the value is a status (the worst band of a risk gauge,
`var(--dch-crimson)`). A hex in `color` is drawn as given: keep it to the palette.

| Setting | Value |
|---|---|
| Chrome | Transparent background, Manrope, axis labels 11 px `#666b74` (`--chart-text`), grid `#eceef1`, no axis lines or ticks, no credits, no title (the card header is the title) |
| Legend | Top-left, 12 px 600 `#4a4f58`, 8 px round symbols; shown with more than one series. Donuts and rings always show it, bottom centre |
| Tooltip | HTML card `.atl-tip`: white, 1 px `--border`, radius 12, `--sh-md`; head row `--surface-2` 700 with the category; rows of 8 px dot · name · value (700, tabular). Shared on multi-series charts |
| Axis labels | Wrap onto lines under their column (never tilted); `dd-mm-yyyy` dates show as `20 Nov` |
| Load | 800 ms quartic ease-out (columns grow, lines draw, slices sweep); data changes animate in place |
| Height | 270 in a panel, 300 in a wide panel |

Per kind: **columns** (radius 8 on top, 44 % width, one colour per column), **date columns** (one colour,
radius 4, 56 %), **stacked** (radius 7 on the top of the stack, 42 %), **paired bars** (horizontal,
radius 5, 2 px white separators), **bars + trend** (columns `#b8c8f0`→`rgba(227,234,248,.9)` gradient under a
3 px `#1c4599` spline with a soft blue shadow and an 18 %→0 % wash), **areas** (2.5 px splines, fill
28 %→2 %), **donut** (72 % hole, 3 px white borders, centre value 600 28 + caption 12 ink-3), **speedometer**
(solid gauge −120°…120°, 72 % hole, round caps, gradient to the next band colour, value 36 px), **rings**
(concentric solid gauges down to a 38 % hole), **bubbles** (opacity .78, 1.5 px white borders).

Hover motion (150–280 ms):

* Columns/bars: the hovered column widens 14 % (`scaleX(1.14)`) and lifts on
  `drop-shadow(0 6px 10px rgba(28,69,153,.22))`; all other columns fade to 32 %; a 5 % blue band marks
  the category.
* Lines/areas: dashed `#c9cfd8` crosshair; the point becomes a 6 px dot with a white ring and a halo.
* Donut: the slice slides out 9 px, others fade to 40 %, and the centre swaps (with a 5 px rise) to the
  slice's value and "name · %" in its colour.
* Rings/gauges: the hovered ring brightens, the others fade, and the centre shows that ring.
* Bubbles: grow 10 % on a shadow, others fade. Every chart has a visually hidden data table.

---

## 4. Layout and shell

### 4.1 Desktop shell

```
┌────────────┬───────────────────────────────────────────────────────┐
│  sidebar   │  top bar (64): [ search pill 460 ]          ( avatar )│
│  256 wide  ├───────────────────────────────────────────────────────┤
│  floating  │  main (scrolls), padding 4 28 32                       │
│  glass     │    breadcrumbs                                         │
│  card      │    Page title (30/38)              [actions]           │
│            │    description (14/21 ink-3)                           │
│            │    content: cards / tables / panels, gap 20            │
└────────────┴───────────────────────────────────────────────────────┘
```

* `.console`: grid `256px | 1fr`, padding 12 0 12 12 (the sidebar floats 12 px from the window).
* **Sidebar** `.lf-dock`: `--glass` with `blur(22px) saturate(160%)`, 1 px `rgba(255,255,255,.9)` border,
  radius 26, padding 14 12 12, `--sh-sm`. Top: brand block. Then **Home**, and groups with labels
  **Assistant** (Lepide AI), **Modules** (AI Shield, Auditor, Trust, Detect, Protect, Identify — AI Shield is a parent
  with sub-pages and uses the line icon `shield`), **Workspace** (My
  Lepide, Dashboards). Footer above a hairline: Settings and the account (avatar + name).
* Nav item: 40 tall, padding 0 12, radius 14, 600 13.5 ink-2, 19 px icon in ink-3. Hover
  `rgba(18,20,23,.045)`. **Current page: white card, `--border-soft` border, `--sh-sm`, ink text, brand
  icon.** Group labels 600 11.5 ink-4. Parents (Detect, Protect, Identify) open an accordion of 34 px
  sub-items (500 13 ink-3) indented behind a hairline; the chevron rotates 180°.
* Collapse: a 26 px round handle appears on the sidebar's right edge on hover; collapsed width 76 with
  icons only, tooltips on hover, and sub-pages as a 232 px flyout card.
* Top bar 64 tall, padding 0 28; no background. Account avatar: 34 px ink circle in a 3 px glass ring.

**Shell markup.** `body` is `overflow: hidden` and only `.main` scrolls, so every console page needs this
structure (the React app renders exactly this; `aria-current="page"` marks the current nav item):

```html
<div class="app lf">                                   <!-- canvas + corner washes -->
  <section class="view console">                       <!-- add console--collapsed for the 76 px rail -->
    <div class="console__dock">
      <nav class="lf-dock" aria-label="Modules">
        <button type="button" class="lf-dock__brand" aria-label="Lepide home">
          <span class="lf-dock__mark"><img src="lepide-mark.svg" alt=""></span>
          <span><b>Lepide</b><small>Data Security Platform</small></span>
        </button>
        <div class="lf-dock__items">
          <button type="button" class="lf-dock__item" aria-current="page">
            <span data-nav-icon><svg class="lf-i" viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><!-- icon paths --></svg></span>
            <span class="lf-dock__label">Home</span>
          </button>
          <p class="nav-label">Modules</p>
          <button type="button" class="lf-dock__item"><span data-nav-icon>…</span><span class="lf-dock__label">Auditor</span></button>
        </div>
        <div class="lf-dock__foot">
          <button type="button" class="lf-dock__item"><span data-nav-icon>…</span><span class="lf-dock__label">Settings</span></button>
          <button type="button" class="lf-dock__item lf-dock__account" aria-label="Account">
            <span class="lf-dock__avatar">AL</span><span class="lf-dock__label">Ann Lee</span>
          </button>
        </div>
      </nav>
    </div>
    <div class="shell">
      <header class="topbar">
        <div class="topbar__right">
          <label class="lf-field home-search"><span class="lf-input"><svg class="lf-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="search" placeholder="Search reports, folders, data sources" aria-label="Search the console"><kbd>Ctrl K</kbd></span></label>
          <button type="button" class="hometop__user" aria-label="Account menu"><span class="hometop__avatar">AL</span></button>
        </div>
      </header>
      <main class="main">
        <div class="sub"><!-- page: header, then cards (§4.2, §7) --></div>
      </main>
    </div>
  </section>
</div>
```

A parent nav item with sub-pages (Detect, Protect, Identify): the parent gets `lf-dock__item--parent`, a chevron
and `aria-expanded`; the sub-list follows it and is shown with `is-open`. While on any of its sub-pages, the parent
carries `aria-current="page"` (sub-items have no current style of their own). `.sub` lays out its children (page
header, filters, cards) in a column with a 20 px gap — don't add spacing between them.

```html
<button type="button" class="lf-dock__item lf-dock__item--parent" aria-current="page" aria-expanded="true">
  <span data-nav-icon>…</span><span class="lf-dock__label">Detect</span>
  <svg class="lf-i lf-dock__chev" viewBox="0 0 24 24" aria-hidden="true"><!-- chevron --></svg>
</button>
<div class="lf-dock__sub is-open" data-title="Detect">
  <div class="lf-dock__sub-in" role="group" aria-label="Detect pages">
    <button type="button" class="lf-dock__subitem"><svg class="lf-i" viewBox="0 0 24 24" aria-hidden="true">…</svg><span>Alert configuration</span></button>
    <button type="button" class="lf-dock__subitem"><svg class="lf-i" viewBox="0 0 24 24" aria-hidden="true">…</svg><span>Alert status</span></button>
  </div>
</div>
```

The brand mark (`lepide-mark.svg`) comes from `brand/` (§2.7; the build copies it into `packages/react/src/assets/`); the MCP server returns it from
`search_icons("lepide")`, and every icon's SVG from `search_icons("<name>")`.

### 4.2 Page patterns

* **Page header** `.head`: breadcrumbs (500 12.5 ink-3, `›` separators in ink-4, links hover brand), then
  the title, an optional description and an actions row at the right.
* **Home**: max width 1180, centred. Hero title (500 38/46) and subtitle; the **Lepide AI card** (pastel
  mesh: blue at the orb, lavender, peach on the far right, drifting highlight; a 54 px frosted "ask" pill
  with a primary Ask button; suggestion chips); then module tiles in a 10-column grid (tiles span 2,
  min-height 196, padding 18, 40 px icon tile, title 700 15.5, 3-line description, arrow circle that turns
  into the selected finish on hover, plus a two-tone pastel wash per module).
  Copy the golden screen `get_example("home")` (React) or `get_example("home", "html")`: classes `sub--home`,
  `home-head`, `hero__title`, `ai-hero*`, `mods__grid`, `mods__label`, `mod mod--<module>` (+ `mod--featured` for AI Shield,
  `mod--ws` for workspace tiles), `mod__ic`, `mod__text`, `mod__arrow`; module icons `ModuleIcon` / `shield` for AI Shield.
  The orb at the left of the Lepide AI card is the prototype's WebGL orb: `<AiOrb className="ai-hero__orb" />`
  ([docs](docs/components/ai-orb.md)), in plain HTML `<div class="ai-hero__orb" data-lepide-orb></div>` with
  `lepide-art.js`. Never draw it with CSS gradients or a spinning border; `validate_code` reports it (`ai-orb`).
* **Dashboard**: header with the dashboard name as a brand `Chip` under the title (`PageHeader` children; the `chip`
  prop is for a status beside the title), and actions: a visible label "Dashboards list" (`<span className="lf-muted"
  id=…>`) + a pill `Dropdown` linked to it with `ariaLabelledby` (width `calc(var(--s10) * 5)`) + Refresh. No primary.
  An optional KPI row; chart panels in a 3-column `.panels` grid (2 under 1280 px, 1 under 860 px). Each panel is a
  `Card className="panel"`: title, `sub="Last updated on " + fmtDateTime(…)`, and icon tools in `actions` —
  `IconButton`s labelled "Select date range" (`calendar`: a `Menu` of `DATE_PRESETS` for that panel), "Filter"
  (`filter`) and "View as list" (`list`: shows the chart's data as a table); panels that come from a report end with
  a "View report" link (`.lf-link`).
* **Reports hub**: 288 px folder tree card (`<Tree>` inside `<Card className="folders">`) + table card. Tree items
  38 tall, radius 10, 600 13 ink-2; current folder uses the selected finish with a white count; nested lists indent
  behind a hairline.
* **Settings page with tabs** (Add data source › File server): the page tabs are a full-width `<Segmented>` at the top of
  `settings__body` (not in the header, because the section nav is beside them); under it, each tab opens with a
  `<h3 className="section-title">` and a `.lf-muted` description, then its cards. A narrow card beside a table (the
  file servers "Actions") sits in a nested `<div class="settings">`, and a list of commands in a card is
  `<div className="action-list">` of `<button className="action-list__item"><Icon …/>Install agent</button>` rows
  (disabled until something is selected, with a `.lf-muted` line under them saying what to select). Going back from
  a sub-view to its parent (the file server page back to all data sources) is a ghost "All data sources" button
  (`icon="chevron-left"`) first in the header actions, and the parent's section nav item.
* **Settings**: `<div class="settings">` = 260 px sticky section nav (`<SectionNav>`, items 38 tall, current = selected
  finish; a dropdown replaces it under 860 px) + `<section class="settings__body">` with `SetCard`s.
* **Choosing a type** ("Add data source"): `<TilePicker>` — tiles with icon or logo, title and one line. Where the
  prototype makes the tiles a page of their own (choosing one opens that source's settings), keep that: no Next.
  Inside a wizard it is the first step. The kit has no vendor logos: use a line icon, or `image` when you have the
  product's logo file.
* **Wizard**: steps at the top of a card; body padding 24; footer `--surface-2` with Back on the left, then
  Cancel · Next at the right (Finish on the last step); Next/Finish is the step's one primary, so on a page that holds
  a wizard every other action (in the header or inside a step) is secondary. `WizardCard` moves focus to the new
  step's body itself. Steps that can be done in any order are tabs, not a wizard (as on a data source's settings).
* **Investigation page** (e.g. File activity): header with a `DateRangePicker` and secondary actions (no primary is
  needed), a KPI row, chart panels, then the events table; a row opens a `Drawer` with the details.
* **Sign in** (`<SignIn>`, [docs](docs/components/sign-in.md)): a 1120 px glass card (radius 32) split into the form (logo tile 52, eyebrow
  "Lepide · Data Security Platform", title "Sign in to the console" 30/38, 48 px fields radius 14, a 50 px primary pill
  button with a ripple and arrow, footer "Need access? Ask an administrator.") and an illustration panel (radius 24,
  radial blue gradient) with the prototype's **particle animation**: data particles form the Lepide mark, then each
  module's icon, one captioned slide each, with progress dots; the pointer scatters them. It is code, not a picture:
  use `<SignIn>` as it is, or in plain HTML `examples/html/sign-in.html` with `lepide-art.js`. Never draw your own
  panel (a dotted logo, rings, a static SVG); `validate_code` reports it (`sign-in-art`).

### 4.3 Responsive

| Width | Changes |
|---|---|
| ≤ 1280 | KPI grid and panels → 2 columns |
| ≤ 1100 | Builders and AI page stack; module grid → 6 columns; reports tree 240 |
| ≤ 860 | **Sidebar becomes a floating bottom tab bar** (fixed 10 px from the edges, 64 tall, radius 22, icons only 48 × 48); top bar shows the brand; main padding 4 16 100; title 26/32; panels 1 column; drawers become bottom sheets; settings nav becomes a dropdown; notifications sit 92 px up |
| ≤ 620 | KPIs 1 column; module tiles 2 columns; form rows 1 column; dialog tabs scroll sideways |

### 4.4 Composing page content (React)

The shell (sidebar, top bar, `LepideProvider`, `ThemeProvider`, `ToastProvider`, `TooltipHost` and the
stylesheet import) is set up once by the app (§0); a screen renders only its page content.

| Need | Use |
|---|---|
| Page content wrapper | `<div className="sub">` (column, gap 20, fades up on entry); everything below goes inside it |
| Header | `<PageHeader crumbs title description actions>` — actions right, at most one primary, rightmost |
| KPI row | `<div className="kpis">` (4 across; `kpis kpis--3` for three) of `<KpiCard>` |
| Chart panels | `<div className="panels">` (or `panels panels--2`) of `<Card className="panel" title=… sub=…>` with a `<Chart>` inside |
| A list | `<DataTable>` — it is the table card; put a `SearchField` and filters in its `toolbar` |
| List + detail side by side | `<div className="with-detail">` = content + a `<DetailPanel>` (420 px; stacks under 1100 px). For details that open over the page from a row, use `<Drawer>` |
| Forms on a page | `<SetCard form>` (its body becomes `.page-form`), or your own `<div className="page-form">`; fields in pairs: `<div className="fld-row">` |
| Monospace text (paths, IDs) | `mono: true` on a table column; elsewhere `<code>` |

**Lists and their empty states.** Give `DataTable` all rows and the search text (`search={query}`): it filters,
sorts and pages itself. `empty` shows only on first use, when there are no rows at all (an `EmptyState` saying how
to add the first one). When search or filters leave nothing, the table shows `noResults`, a line that names what
is missing (`No events match "finance".`). If you filter rows yourself (a `Segmented` above the table), pass
`filtered` so the table shows `noResults`, not `empty`. Don't put an `EmptyState` inside the table for
no-results.

**Dialogs with forms.** A `Modal` body is already `.modal__form`, so fields inside it are styled. Pass `onSubmit`
and make the primary footer button `type="submit"`: Enter in a field then submits. For a two-step dialog, use the
Modal's own `steps={['Type', 'Details']} step={i}` (not a separate `Steps`); the primary is "Next" on the first step
and the verb ("Add data source") on the last, Back sits left of Cancel, and `onSubmit` advances or finishes. An
option that is applied when the dialog's verb is pressed ("Start auditing now") is a `Checkbox`; `Toggle` is only for
settings that apply the moment they flip.

**Validation.** Validate on submit, not while the user types. Show each problem on its field (`error="Enter the
server name"`), call `focusFirstError()` (it moves focus to the first field marked invalid, inside the open dialog
or the page), and clear a field's error as soon as it is edited. Field errors never also raise a toast. A choice
that has no field (no tile picked) gets an error `toast` from the button, which appears as a nudge beside it. A bulk
action that needs a selection (Uninstall agent, Export 3) is `disabled` until something is selected.

**A second action inside a dialog** (Install agent: type a server, *Add server*, then *Install* the list): the inner
action is a secondary `Button` beside its field, inside `<div className="fld-inline">` (the button lines up with the
input). It validates only its own field and adds to a list in the body; it never submits the dialog. The footer's
primary submits the whole dialog, and if the list it needs is empty, that shows as the list's field error.

```tsx
<div className="fld-inline">
  <TextField label="Server name" value={server} onChange={setServer} error={serverError} />
  <Button icon="plus" onClick={addServer}>Add server</Button>
</div>
```

When a list is what's missing (no users added to a group), wrap the list in `<Field label=… error=…>`:
the error shows under it and `focusFirstError()` moves focus there. If a step's Next needs rows chosen in a table,
the error is a toast from Next (a table is not a field).

**A primary that opens a menu** ("Add file server ▾" with one entry per server type): `<Menu trigger={(p) => <Button
{...p} variant="primary" icon="plus" iconEnd="chevron">Add file server</Button>} items={…} />`.

**Grouped rows** (users under their group): `DataTable` has no grouping. Give it flat rows where a group row comes
first, with an `IconButton` ("Collapse Ankits" / "Expand Ankits", icon `chevron`) and the group's summary, then its
members; turn sorting and column filters off on that table so the groups stay together.

**Short lists inside a dialog or card** (the locations a new case searches, servers to install on): a flat
`DataTable` with `pager={false}` — every row shows and there is no pager — and an `empty` line saying what to add.

**Dates and times.** Show a date as `fmtDate(d)` → "3 Nov 2026" and a date with time as `fmtDateTime(v)` → "3 Nov
2026, 09:42" (it takes a `Date`, "yyyy-mm-dd hh:mm" or "dd-mm-yyyy hh:mm"; seconds are dropped), in tables,
details and captions alike. Date inputs take `dd-mm-yyyy`. Don't write your own formatter.

**Letter case.** Sentence case for everything the interface writes: titles, labels, column headers, buttons,
tabs, menu items, options in a dropdown, status words ("Update completed", "Connection timed out") and messages.
Proper names keep their capitals: products and platforms (Lepide Auditor, Windows, SharePoint Online, Exchange
Online, Active Directory, NetApp), so "Windows file server", not "Windows File Server". Data shows as it is
stored: case and file names, paths, server and user names. Options and settings the product defines (scopes, rule
types, account kinds) are interface words: sentence case. Write "and", not "&" ("Backup and restore"), except
inside a name, and "or" for a slash between alternatives ("File server name or IP", not "Name/IP"). Labels don't end with a colon. Fix stray punctuation in prototype titles ("Dashboard- Auditor" →
"Dashboard - Auditor"). Where the prototype uses Title Case, this rule wins (§10).

**Layout helpers** (in `@lepide/ds-css`; use them instead of inline flex styles):

| Class | Does |
|---|---|
| `.row` | Inline flex row, items centred, 8 px gap; add `.row--wrap`, `.row--between` (space between) or `.row--end` (right-aligned) |
| `.grow` | Takes the remaining width in a row |
| `.stack` | A column of blocks with a 16 px gap |
| `.grid2`, `.grid3` | Two or three equal columns with a 16 px gap (one column under 860 px) — e.g. three short fields in a row |
| `.fld-inline` | A field with a button beside it, the button level with the input |
| `.section-label` | A small bold heading inside a dialog or card body ("New case and object selection") |
| `.lf-muted` | Secondary text in `--ink-3` (a footer note, "Last saved 2 hours ago") |
| `.lf-na` | The "—" shown for a missing value (KeyValues and DataTable add it themselves) |
| `.section-title` | The heading that opens a tab's or section's content (18 px), with an optional `<small>` |
| `.action-list`, `.action-list__item` | A card's list of commands as plain rows with an icon (§4.2 Settings page with tabs) |

A search field in the page header (where the prototype has one, beside the primary) is a `SearchField` in
`PageHeader` `actions`; it is 240 px wide there. In a table card's toolbar it is 280 px.

**Feedback after an action.** `const toast = useToast()` then `toast({ variant: 'success', title: 'Data
source added', message: 'Auditing starts in a few minutes.' })`; `message` is required plain text. Destructive
actions go through `ConfirmDialog` first (`confirmLabel` is the verb; `onConfirm` may return a promise and the
button spins until it settles; close the dialog yourself), then a success toast. Offer "Undo" (`actions`) only
when the action really can be undone.

**Tone words per component.** Each component takes the words that fit it:

| Component | Prop | Values |
|---|---|---|
| `ToneTag` (status dot + text) | `tone` | `good` · `warn` · `bad` · `info` · `none` (grey, for off states) — `toneFor(label)` picks it |
| `Chip` | `tone` | `neutral` · `brand` · `good` · `warn` · `bad` · `flat` |
| `KpiCard` delta | `deltaTone` | `good` · `warn` · `bad` · `flat` · `brand` — by meaning (more deletions is `bad` even though it went up) |
| `useToast` | `variant` | `info` · `success` · `warning` · `error` |
| `Banner` | `tone` | `info` · `success` · `warning` · `error` |
| `Modal` | `tone` | `danger` (`ConfirmDialog` sets it when `destructive`) |
| `EmptyState` | `tone` | `error` (when loading failed) |

Actions in an activity log (Created, Modified, Deleted …) are shown with `ToneTag` like a status: Deleted `bad`,
Permission changed `warn`, Created `good`, Modified `info`, Renamed and anything else `none`.

**Accessible names.** Icon-only buttons take `label` (`<IconButton icon="more" label="Row actions" />`). Groups and
inputs without a visible label take `ariaLabel` (camelCase: `SearchField`, `Segmented`, `Dropdown`, `TilePicker`).
Don't write a hyphenated `aria-label` on these components: TypeScript doesn't check it, and `validate_code` flags it.

---

## 5. Accessibility

* Text tones meet 4.5:1 (that's why `--ink-3` is `#666b74` and tone text uses the `-text` values).
* Focus: `outline: var(--focus-outline); outline-offset: 2px` on everything (light `2px solid rgba(28,69,153,.6)`,
  dark a lighter `rgba(143,171,235,.7)`, high contrast 3 px black); text fields use the 3 px `--ring` instead.
  Radios keep the outline; custom checkboxes and toggles draw it on their box.
* Icon-only buttons need `aria-label`; dialogs trap focus and close on Escape; menus and dropdowns follow
  the WAI-ARIA patterns; tables use real `<table>` markup; charts carry a hidden data table.
* Selected state is never colour alone: selected rows add a left bar, selected options a check.
* `prefers-reduced-motion` removes movement but keeps state changes.

---

## 6. Do and don't

| Do | Don't |
|---|---|
| Use the tokens; add a token before adding a hex value | Hard-code colours in components (charts are the one exception) |
| One primary button per view, rightmost | Two primaries side by side, or a black button |
| Use the selected finish for anything selected | Use ink/black fills or plain blue text for selection |
| White cards (radius 20) on the washed canvas | Full-width bordered boxes, heavy dividers, drop shadows darker than `--sh-lg` |
| Pills for buttons, chips, toolbar inputs, segmented controls | Square buttons |
| `<Dropdown>` for every select (static HTML: a `<select>` in `.page-form` is the fallback) | Native `<select>` menus in React UI |
| Lucide outlines at 1.6 stroke | Filled or mixed icon styles |
| 150–250 ms eased motion, small distances | Bounces, long animations, motion without a reduced-motion fallback |
| Status colours only for status | Red/green/amber as decoration |
| Sentence case everywhere the interface writes (labels, options, status words); proper names keep capitals (§4.4); no-results text that names the thing: `No reports match "finance".`, generic `No results match your search or filters.` | Title Case labels, apologies ("Sorry, …"), exclamation marks in system messages |

---

## 7. Starter snippet

The page content that goes inside `.main` of the shell (§4.1), using only `@lepide/ds-css` classes — no custom CSS.

```html
<!-- With the package installed: node_modules/@lepide/ds-css/dist/…; without it, the hosted copies below. -->
<link rel="stylesheet" href="https://lepide-new-ds.vercel.app/ds/lepide.css">
<script src="https://lepide-new-ds.vercel.app/ds/lepide.js" defer></script>      <!-- only if the page opens dialogs or shows toasts -->
<script src="https://lepide-new-ds.vercel.app/ds/lepide-art.js" defer></script>  <!-- only for the Lepide AI orb or the sign-in page -->

<div class="sub">
  <nav class="crumbs" aria-label="Breadcrumb">
    <a href="/">Home</a><span aria-hidden="true">›</span><a href="/settings">Settings</a><span aria-hidden="true">›</span><b aria-current="page">Mail server</b>
  </nav>
  <div class="head">
    <div><h2>Mail server</h2><p>Where Lepide sends alerts and scheduled reports.</p></div>
    <div class="actions">
      <button type="button" class="lf-btn"><svg class="lf-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>Export</button>
    </div>
  </div>

  <section class="lf-card set-card">
    <header class="set-card__head">
      <div><h3>SMTP settings</h3><p>Used for every email the console sends.</p></div>
      <div class="actions"><span class="lf-chip lf-chip--good">Connected</span></div>
    </header>
    <div class="set-card__body page-form">
      <div class="fld-row">
        <div class="fld"><label class="fld__lbl" for="host">Server</label><input id="host" value="smtp.corp.com"></div>
        <div class="fld"><label class="fld__lbl" for="port">Port <em>Usually 587</em></label><input id="port" value="587"></div>
      </div>
      <div class="fld"><label class="fld__lbl" for="from">Sender address</label><input id="from" placeholder="alerts@corp.com"></div>
    </div>
    <footer class="set-card__foot">
      <button type="button" class="lf-btn">Cancel</button>
      <button type="button" class="lf-btn lf-btn--primary">Save changes</button>
    </footer>
  </section>
</div>
```

The same page in React:

```tsx
import { Button, PageHeader, SetCard, TextField, Chip } from '@lepide/ds-react';

<div className="sub">
  <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Settings', to: '/settings' }, { label: 'Mail server' }]}
    title="Mail server" description="Where Lepide sends alerts and scheduled reports."
    actions={<Button icon="download">Export</Button>} />
  <SetCard title="SMTP settings" description="Used for every email the console sends."
    actions={<Chip tone="good">Connected</Chip>}
    footer={<><Button>Cancel</Button><Button variant="primary">Save changes</Button></>} form>
    <div className="fld-row"><TextField label="Server" defaultValue="smtp.corp.com" /><TextField label="Port" note="Usually 587" defaultValue="587" /></div>
    <TextField label="Sender address" placeholder="alerts@corp.com" />
  </SetCard>
</div>
```

---

## 8. Checklist for generating a new screen

1. Load `@lepide/ds-css` (fonts, tokens, themes and every class). Use the React kit when you can.
2. Put the page inside the shell (§4.1 markup): floating glass sidebar (256, radius 26) and the 64 px top bar.
   Look up each component's props in §9 (more detail per component: `docs/components/<name>.md`, or
   `get_component` on the MCP server).
3. Start the content with breadcrumbs, a 30/38 title, an optional 14/21 ink-3 description, actions right.
4. Group content in white cards (radius 20, padding 20, `--sh-sm`), gap 16–20.
5. Controls: pill buttons (38 tall), one primary with the blue gradient; 46 px rounded fields on
   `--surface-2` inside a `.page-form` or `.modal__form`; `<Dropdown>` for selects; toggles 38 × 22.
6. Selected anything → `--sel-fill` + `--sel-shadow`, white text.
7. Tables: 42 px grey header, 56 px rows, bold sticky first column, hover `--surface-2`.
8. Status → chip or tone tag in the tone's `-bg`/`-text`; never colour alone.
9. Feedback: errors from a click → nudge beside the control; everything else → bottom-right card.
10. Motion: `fade-up`/`rise-in` on entry, 150–250 ms, stagger grids by 40 ms, honour reduced motion.
11. Check contrast, focus rings, `aria-label`s, and the 860 px and 620 px layouts.

---

## 9. Component index

Every component in `@lepide/ds-react`, with its page in `docs/components/`. Charts and KPI cards import from
`@lepide/ds-react/charts`.

<!-- components:start -->
<!-- Generated by docs/build.mjs — do not edit by hand. -->
| Category | Page | Exports | Use it for |
|---|---|---|---|
| foundation | [Providers](docs/components/providers.md) | `LepideProvider`, `ThemeProvider`, `useTheme`, `useLepideLink` | App-root setup. LepideProvider plugs in your router's link; ThemeProvider stores the light, dark or hc theme and applies it as <html data-theme>. Mount ToastProvider and TooltipHost once beside them. |
| actions | [Button](docs/components/button.md) | `Button`, `IconButton` | Pill-shaped buttons for actions. One blue primary per view, rightmost; everything else secondary, ghost or danger. |
| forms | [Checkbox](docs/components/checkbox.md) | `Checkbox` | 16 px checkbox with a label for independent on/off choices in forms, lists and table selection; supports an indeterminate state. |
| forms | [Date range picker](docs/components/date-range-picker.md) | `DateRangePicker`, `Calendar`, `rangeFor`, `DATE_PRESETS`, `fmtDate`, `fmtDateTime`, `fmtRange` | Ghost-button popover with date presets (Today … Last month) and a Custom range month calendar; the change is applied only on Apply. |
| forms | [Dropdown](docs/components/dropdown.md) | `Dropdown`, `SelectField`, `FloatingPop` | Select-only combobox that replaces the native select — 46 px trigger, floating rounded panel, brand tint and check on the selected row, full keyboard support. |
| forms | [File upload](docs/components/file-upload.md) | `FileUpload` | Dashed drop zone for choosing or dropping one file; once a file is set it turns into a file card with name, size and a remove button. |
| forms | [Pill input](docs/components/pill-input.md) | `PillInput`, `SearchField` | 40 px pill-shaped text input for toolbars and searches, with an optional leading icon; SearchField is the soft-filled search variant. |
| forms | [Radio group](docs/components/radio-group.md) | `RadioGroup` | A set of 36 px radio option rows for choosing exactly one value; stacked by default or wrapped in a row. |
| forms | [Search select](docs/components/search-select.md) | `SearchSelect`, `MultiSelect` | Labelled select fields for long lists — SearchSelect picks one value with a search box past 8 options; MultiSelect picks several with checkboxes and an optional Select all row. |
| forms | [Setting row](docs/components/setting-row.md) | `SettingRow` | A settings list row with a title and help text on the left and a control (usually a Toggle) on the right, separated by hairlines. |
| forms | [Text field](docs/components/text-field.md) | `Field`, `TextField`, `PasswordField`, `NumberField`, `TextAreaField`, `focusFirstError` | Labelled form fields for dialogs and page forms — 46 px soft-filled controls with a label, optional note, help text and inline error. |
| forms | [Tile picker](docs/components/tile-picker.md) | `TilePicker` | A grid of selectable tiles (icon or logo, title, one-line description) for choosing a type or source — single choice by default, or several with multiple. |
| forms | [Toggle](docs/components/toggle.md) | `Toggle` | 38 × 22 on/off switch for settings that take effect immediately; always has an accessible label. |
| forms | [Wizard card](docs/components/wizard-card.md) | `WizardCard` | Full-page multi-step form — a step indicator above a card holding one step's fields, with Back, Cancel and Next/Finish in the footer. |
| navigation | [Menu](docs/components/menu.md) | `Menu` | A trigger plus an anchored popover menu of actions (.pop), with icons, separators, selected and danger items, and disabled items that explain why. |
| navigation | [Page header](docs/components/page-header.md) | `PageHeader` | The top of every page — optional breadcrumbs, eyebrow, the page title (h2), an optional chip and description, and the page actions at the right. |
| navigation | [Section nav](docs/components/section-nav.md) | `SectionNav` | Left-hand section navigation for settings-style pages, with a built-in dropdown that replaces it under 860 px. The current section gets the selected finish. |
| navigation | [Segmented](docs/components/segmented.md) | `Segmented` | Pill-shaped segmented control that switches between two to five sibling views (tabs mode) or data filters (pressed mode). |
| navigation | [Tree](docs/components/tree.md) | `Tree` | Folder / report tree for a hub page — top-level folders with counts, expandable groups and nested items. The current row gets the selected finish. |
| navigation | [Vertical tabs](docs/components/vertical-tabs.md) | `VerticalTabs` | A vertical list of section buttons for the left column of settings-style dialogs; the current section gets the selected finish. |
| display | [AI orb](docs/components/ai-orb.md) | `AiOrb` | The Lepide AI orb — the prototype's WebGL ring that glows, drifts and follows the pointer, in the theme's brand colours. The only way to show Lepide AI's mark; never redraw it with CSS. |
| display | [Avatar](docs/components/avatar.md) | `Avatar`, `Person`, `initialsOf` | Round initials avatar with a tint picked from the name, and Person, an avatar plus name and optional detail on one line. |
| display | [Card](docs/components/card.md) | `Card`, `SetCard`, `KeyValues` | White rounded containers. Card for content panels, SetCard for settings sections with head, body and footer, KeyValues for read-only field tiles. |
| display | [Chip](docs/components/chip.md) | `Chip`, `ToneTag`, `Counter`, `toneFor`, `STATUS_TONES` | Small read-only pills. Chip labels a thing, ToneTag shows a status with a dot and text, Counter shows a number. |
| display | [Icon](docs/components/icon.md) | `Icon`, `ModuleIcon`, `BrandMark`, `MARK_URL` | Thin Lucide-style line icons (1.6 stroke, currentColor), the product module glyphs, and the Lepide mark in its white tile. |
| feedback | [Banner](docs/components/banner.md) | `Banner` | Inline tinted message strip with a tone icon, text, an optional action and an optional dismiss button — for persistent notices inside a page, card or dialog. |
| feedback | [Empty state](docs/components/empty-state.md) | `EmptyState` | Centred block on a dotted field with an icon tile, a title, an optional message and an action — for empty lists, no results and load errors. |
| feedback | [Loading](docs/components/loading.md) | `SkeletonRows`, `PageLoader`, `ProgressBar` | Loading feedback — shimmering skeleton table rows, a centred page spinner, and a determinate or indeterminate progress bar. |
| feedback | [Toast](docs/components/toast.md) | `ToastProvider`, `useToast` | Notifications from one call, toast({...}). They show as a card stack in the bottom-right corner, or as a nudge callout beside the control the user just clicked when an error or warning answers that click. |
| overlays | [Drawer](docs/components/drawer.md) | `Drawer`, `DetailPanel` | Floating side panel that slides in from the right over a scrim (Drawer), and the non-modal sticky panel beside a list (DetailPanel). |
| overlays | [Modal](docs/components/modal.md) | `Modal`, `ConfirmDialog`, `Steps` | Centred dialog with icon-tile head, scrolling form body and a footer of buttons; ConfirmDialog for yes/no questions; Steps for multi-step progress. |
| overlays | [Tooltip](docs/components/tooltip.md) | `TooltipHost` | One floating tooltip for the whole app. Mount TooltipHost once; any element with data-tip, and every icon-only button with an aria-label, shows its label on hover or keyboard focus. |
| data | [Chart](docs/components/chart.md) | `Chart`, `Sparkline`, `chartColor`, `PALETTE` | Highcharts-based charts in the Lepide Design System theme — one Chart component with a kind per product chart type (columns, stacked, bars, areas, lines, donuts, gauges, rings, bubbles), plus a borderless Sparkline. Imported from '@lepide/ds-react/charts'. |
| data | [Data table](docs/components/data-table.md) | `DataTable`, `Pager` | Table card with title and count, sortable headers, an optional column filter row, checkbox selection, row open and row actions, client-side paging, skeleton loading and empty states, and a sticky first column. |
| data | [KPI card](docs/components/kpi-card.md) | `KpiCard` | Stat card with a label, a large value that counts up once, an optional delta chip, a foot line and a full-bleed sparkline. Imported from '@lepide/ds-react/charts'. |
| patterns | [Sign in](docs/components/sign-in.md) | `SignIn` | The whole sign-in page, exactly the prototype's — glass card with the form (email, password) and the illustration panel, where data particles form the Lepide mark and each module's icon, one slide each. Validation, loading and error states are built in. |

### API reference

Every export of `@lepide/ds-react` (charts: `@lepide/ds-react/charts`), generated from the TypeScript source.
`?` = optional, `= x` = default. "+ native" means the component also takes the native attributes of that
element (`placeholder`, `autoComplete`, `required` …). The component pages add when-to-use, states and examples.

```ts
// Providers — App-root setup. LepideProvider plugs in your router's link; ThemeProvider stores the light, dark or hc theme and applies it as <html data-theme>. Mount ToastProvider and TooltipHost once beside them.
<LepideProvider>
  children: ReactNode
  link?: LinkComponent
<ThemeProvider>
  children: ReactNode
  storageKey?: string = 'lepide.theme'
function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; }
function useLepideLink(): LinkComponent  // The link component internal navigation uses (breadcrumbs).

// Button — Pill-shaped buttons for actions. One blue primary per view, rightmost; everything else secondary, ghost or danger.
<Button>  + native Button
  variant?: ButtonVariant = 'secondary'
  size?: "sm" | "md" | "lg" = 'md'
  icon?: IconName
  iconEnd?: IconName
  loading?: boolean
  dot?: boolean  // Brand dot at the top right (e.g. "Modify filters" while filters are applied).
  block?: boolean
<IconButton>  + native Button
  icon: IconName
  label: string  // Required accessible name; the floating tooltip shows it.
  bordered?: boolean
  danger?: boolean
  size?: number = 16

// Checkbox — 16 px checkbox with a label for independent on/off choices in forms, lists and table selection; supports an indeterminate state.
<Checkbox>
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
  disabled?: boolean
  indeterminate?: boolean
  ariaLabel?: string

// Date range picker — Ghost-button popover with date presets (Today … Last month) and a Custom range month calendar; the change is applied only on Apply.
<DateRangePicker>
  value: DateRange
  onApply: (r: DateRange) => void
  presets?: string[] = DATE_PRESETS
  label?: string = 'Date range'
  align?: "right" | "left" = 'right'
<Calendar>
  from: Date | null
  to: Date | null
  onPick: (from: Date, to: Date | null) => void
function rangeFor(preset: string, now?: Date): { from: Date; to: Date; }  // The span a preset covers, ending today (`now`).
const DATE_PRESETS: readonly ["Today", "Yesterday", "Last 7 days", "Last 30 days", "This month", "Last month", "Custom range"]  // The preset labels (sentence case). `rangeFor` also accepts them in any letter case.
function fmtDate(d: Date): string  // "3 Nov 2026" — how a date reads anywhere in the console (inputs take dd-mm-yyyy).
function fmtDateTime(v: string | Date): string  // "3 Nov 2026, 09:42" — date and time in tables, details and captions.
function fmtRange(r: { from: Date; to: Date; }): string

// Dropdown — Select-only combobox that replaces the native select — 46 px trigger, floating rounded panel, brand tint and check on the selected row, full keyboard support.
<Dropdown>
  value: string
  onChange: (v: string) => void
  options: readonly (string | Option)[]
  placeholder?: string  // Shown when nothing is chosen.
  clearable?: boolean
  disabled?: boolean
  invalid?: boolean
  id?: string
  ariaLabel?: string
  ariaLabelledby?: string
  search?: boolean  // Search box at the top of the list: on, off, or (default) automatically past `searchFrom` options.
  searchFrom?: number = 8
  size?: "sm" | "md" = 'md'  // sm = 36 px compact trigger for inline use (time pickers, table cells). pill = rounded toolbar trigger.
  pill?: boolean
  className?: string
  style?: CSSProperties
<SelectField>
  options: readonly (string | Option)[]
  label?: ReactNode
  note?: ReactNode
  error?: string | null
  help?: ReactNode
  placeholder?: string
  onChange?: ((v: string) => void)
  id?: string
  className?: string
  value?: string | number
  disabled?: boolean
  style?: CSSProperties
  search?: boolean
  size?: "sm" | "md"
  aria-label?: string
  aria-labelledby?: string
  aria-invalid?: boolean | "true" | "false"
<FloatingPop>
  anchor: RefObject<HTMLElement>
  popRef: RefObject<HTMLDivElement>
  children: ReactNode
  className?: string = ''
  role?: string
  multi?: boolean
  id?: string
  onKeyDown?: ((e: KeyboardEvent<HTMLElement>) => void)
  maxHeight?: number = 320

// File upload — Dashed drop zone for choosing or dropping one file; once a file is set it turns into a file card with name, size and a remove button.
<FileUpload>
  onFile: (f: File) => void
  accept?: string
  file?: { name: string; size?: number | undefined; } | null
  rules?: ReactNode
  label?: string = 'Choose a file or drop it here'
  onClear?: (() => void)

// Pill input — 40 px pill-shaped text input for toolbars and searches, with an optional leading icon; SearchField is the soft-filled search variant.
<PillInput>
  value: string
  onChange: (v: string) => void
  icon?: IconName
  soft?: boolean
  placeholder?: string
  label?: string
  ariaLabel?: string
  type?: string = 'text'
  maxLength?: number
  className?: string
  style?: CSSProperties
  autoFocus?: boolean
<SearchField>
  value: string
  onChange: (v: string) => void
  placeholder?: string
  ariaLabel?: string
  className?: string
  style?: CSSProperties
  maxLength?: number
  soft?: boolean

// Radio group — A set of 36 px radio option rows for choosing exactly one value; stacked by default or wrapped in a row.
<RadioGroup>
  value: string
  onChange: (v: string) => void
  options: readonly (string | Option)[]
  name?: string
  row?: boolean
  ariaLabel?: string

// Search select — Labelled select fields for long lists — SearchSelect picks one value with a search box past 8 options; MultiSelect picks several with checkboxes and an optional Select all row.
<SearchSelect>
  value: string
  onChange: (v: string) => void
  options: readonly (string | Option)[]
  label?: ReactNode
  note?: ReactNode
  error?: string | null
  help?: ReactNode
  placeholder?: string = 'Select'
  disabled?: boolean
  pill?: boolean
  searchFrom?: number = 8
  ariaLabel?: string
  className?: string
<MultiSelect>
  value: string[]
  onChange: (v: string[]) => void
  options: readonly (string | Option)[]
  label?: ReactNode
  note?: ReactNode
  error?: string | null
  help?: ReactNode
  placeholder?: string = 'Select'
  disabled?: boolean
  selectAll?: boolean
  ariaLabel?: string
  className?: string

// Setting row — A settings list row with a title and help text on the left and a control (usually a Toggle) on the right, separated by hairlines.
<SettingRow>
  title: ReactNode
  children: ReactNode
  help?: ReactNode

// Text field — Labelled form fields for dialogs and page forms — 46 px soft-filled controls with a label, optional note, help text and inline error.
<Field>
  children: ReactNode
  label?: ReactNode
  note?: ReactNode
  error?: string | null
  help?: ReactNode
  htmlFor?: string
  className?: string
<TextField>  + native Input
  label?: ReactNode
  note?: ReactNode  // Small grey text after the label ("Optional", "Usually 587").
  error?: string | null  // The message under the field; also marks it invalid.
  help?: ReactNode
  onChange?: ((v: string) => void)  // Called with the new text, not the event (it replaces the native onChange). `value`, `placeholder`, `type`, `required`, `autoComplete` and the other input attributes pass straight through.
<PasswordField>  + native Input
  label?: ReactNode
  note?: ReactNode  // Small grey text after the label ("Optional", "Usually 587").
  error?: string | null  // The message under the field; also marks it invalid.
  help?: ReactNode
  onChange?: ((v: string) => void)  // Called with the new text, not the event (it replaces the native onChange). `value`, `placeholder`, `type`, `required`, `autoComplete` and the other input attributes pass straight through.
<NumberField>
  value: number | ""
  onChange: (v: number | "") => void
  label?: ReactNode
  note?: ReactNode
  error?: string | null
  help?: ReactNode
  min?: number
  max?: number
  step?: number = 1
  id?: string
  disabled?: boolean
  className?: string
  suffix?: ReactNode
<TextAreaField>  + native Textarea
  label?: ReactNode
  note?: ReactNode
  error?: string | null
  help?: ReactNode
  onChange?: ((v: string) => void)
function focusFirstError(root?: ParentNode | null | undefined): void  // After a failed submit, move focus to the first field that shows an error (DESIGN.md §4.4 Validation).

// Tile picker — A grid of selectable tiles (icon or logo, title, one-line description) for choosing a type or source — single choice by default, or several with multiple.
<TilePicker>
  options: TileOption[]
  ariaLabel: string  // Accessible name of the group, e.g. "Data source type".
  value: string | string[]
  onChange: ((value: string) => void) | ((value: string[]) => void)
  multiple?: boolean  // Leave out for a single choice: `value` is a string ('' until one is chosen) and `onChange` gets a string. `true` for several: `value` and `onChange` use `string[]`.

// Toggle — 38 × 22 on/off switch for settings that take effect immediately; always has an accessible label.
<Toggle>
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  disabled?: boolean
  id?: string

// Wizard card — Full-page multi-step form — a step indicator above a card holding one step's fields, with Back, Cancel and Next/Finish in the footer.
<WizardCard>
  steps: string[]
  step: number
  onNext: () => void
  onCancel: () => void
  children: ReactNode
  onStep?: ((i: number) => void)
  onBack?: (() => void)
  nextLabel?: string
  finishLabel?: string = 'Finish'
  busy?: boolean
  extraFooter?: ReactNode

// Menu — A trigger plus an anchored popover menu of actions (.pop), with icons, separators, selected and danger items, and disabled items that explain why.
<Menu>
  trigger: (p: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': "menu"; }) => ReactNode  // Render the button that opens the menu and spread `p` onto it: `trigger={(p) => <IconButton icon="more" label="Actions" {...p} />}`.
  items?: MenuItem[]  // The entries; `{ separator: true }` draws a divider.
  align?: "up" | "right" | "left" = 'right'
  label?: string
  width?: number
  children?: ((close: () => void) => ReactNode)

// Page header — The top of every page — optional breadcrumbs, eyebrow, the page title (h2), an optional chip and description, and the page actions at the right.
<PageHeader>
  title: ReactNode
  crumbs?: Crumb[]
  eyebrow?: ReactNode
  chip?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode

// Section nav — Left-hand section navigation for settings-style pages, with a built-in dropdown that replaces it under 860 px. The current section gets the selected finish.
<SectionNav>
  items: SectionNavItem[]
  value: string
  onChange?: ((value: string) => void)
  title?: string
  ariaLabel?: string
  selectLabel?: string = 'Section'

// Segmented — Pill-shaped segmented control that switches between two to five sibling views (tabs mode) or data filters (pressed mode).
<Segmented>
  items: SegItem[]
  value: string
  onChange: (v: string) => void
  mode?: "tabs" | "pressed" = 'tabs'
  ariaLabel?: string
  hug?: boolean
  className?: string

// Tree — Folder / report tree for a hub page — top-level folders with counts, expandable groups and nested items. The current row gets the selected finish.
<Tree>
  items: TreeItem[]
  value?: string
  onSelect?: ((item: TreeItem) => void)
  ariaLabel?: string = 'Folders'
  defaultExpanded?: string[] = []

// Vertical tabs — A vertical list of section buttons for the left column of settings-style dialogs; the current section gets the selected finish.
<VerticalTabs>
  items: { value: string; label: string; icon?: IconName | undefined; }[]
  value: string
  onChange: (v: string) => void
  ariaLabel?: string

// AI orb — The Lepide AI orb — the prototype's WebGL ring that glows, drifts and follows the pointer, in the theme's brand colours. The only way to show Lepide AI's mark; never redraw it with CSS.
<AiOrb>
  size?: number  // Width and height in px.
  className?: string
  options?: OrbOptions  // Shader settings; the defaults are the home card's (glow 2, thickness 1.2, highlight 1.6).
  style?: CSSProperties

// Avatar — Round initials avatar with a tint picked from the name, and Person, an avatar plus name and optional detail on one line.
<Avatar>
  name: string
  size?: number = 28
<Person>
  name: string
  sub?: string
function initialsOf(name: string): string

// Card — White rounded containers. Card for content panels, SetCard for settings sections with head, body and footer, KeyValues for read-only field tiles.
<Card>
  title?: ReactNode
  sub?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
  style?: CSSProperties
  flush?: boolean
<SetCard>
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  form?: boolean  // The body holds form fields: makes it a `.page-form`, so TextField, SelectField … get their field styles.
  bodyStyle?: CSSProperties
<KeyValues>
  items: { label: string; value: ReactNode; wide?: boolean | undefined; }[]
  cols?: 2 | 3 = 2

// Chip — Small read-only pills. Chip labels a thing, ToneTag shows a status with a dot and text, Counter shows a number.
<Chip>
  children: ReactNode
  tone?: Tone = 'neutral'
  icon?: IconName
  title?: string
<ToneTag>
  children: ReactNode
  tone?: StatusTone = 'none'
<Counter>
  children: ReactNode
function toneFor(status: string): StatusTone  // Tone for a status label: STATUS_TONES first, then whole words in the order bad → warn → info → none → good, so "Completed with errors" is bad and "Unhealthy" never matches "healthy".
const STATUS_TONES: Record<string, StatusTone>  // Lepide status words and their tone.

// Icon — Thin Lucide-style line icons (1.6 stroke, currentColor), the product module glyphs, and the Lepide mark in its white tile.
<Icon>
  name: IconName
  size?: number = 16
  className?: string
<ModuleIcon>
  name: ModuleIconName
  size?: number = 20
<BrandMark>
  size?: number = 36
const MARK_URL: string  // URL of the Lepide mark SVG (a data URL), for <img>, favicons or a plain-HTML page.

// Banner — Inline tinted message strip with a tone icon, text, an optional action and an optional dismiss button — for persistent notices inside a page, card or dialog.
<Banner>
  children: ReactNode
  tone?: "info" | "error" | "success" | "warning" = 'info'
  onClose?: (() => void)
  action?: ReactNode

// Empty state — Centred block on a dotted field with an icon tile, a title, an optional message and an action — for empty lists, no results and load errors.
<EmptyState>
  title: ReactNode
  icon?: IconName
  message?: ReactNode
  action?: ReactNode
  compact?: boolean
  tone?: "error"

// Loading — Loading feedback — shimmering skeleton table rows, a centred page spinner, and a determinate or indeterminate progress bar.
<SkeletonRows>
  rows?: number = 7
  cols?: number = 5
<PageLoader>
  text?: string
<ProgressBar>
  value?: number
  label?: string
  indeterminate?: boolean

// Toast — Notifications from one call, toast({...}). They show as a card stack in the bottom-right corner, or as a nudge callout beside the control the user just clicked when an error or warning answers that click.
<ToastProvider>
  children: ReactNode
  duration?: number = 5000
function useToast(): (input: ToastInput) => ToastHandle  // Returns toast(input): shows a card or nudge and returns a handle to update or dismiss it.

// Drawer — Floating side panel that slides in from the right over a scrim (Drawer), and the non-modal sticky panel beside a list (DetailPanel).
<Drawer>
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  footer?: ReactNode
  footerNote?: ReactNode
  children?: ReactNode
  width?: number | "md" | "chat" | "rec" = 'md'
  head?: ReactNode
<DetailPanel>
  title: ReactNode
  onClose: () => void
  subtitle?: ReactNode
  footer?: ReactNode
  children?: ReactNode

// Modal — Centred dialog with icon-tile head, scrolling form body and a footer of buttons; ConfirmDialog for yes/no questions; Steps for multi-step progress.
<Modal>
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  icon?: IconName | null = 'plus'
  tone?: "danger"
  size?: "sm" | "md" | "lg" | "xs" = 'md'
  steps?: string[]
  step?: number
  footerHint?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  escapeCloses?: boolean = true
  bodyClassName?: string
  onSubmit?: (() => void)  // Makes body + footer a <form>: Enter in a field and a footer <Button type="submit"> call it (default submit is prevented).
<ConfirmDialog>
  open: boolean
  onClose: () => void  // Cancel, Escape and the close button.
  onConfirm: () => unknown  // May return a promise: the confirm button shows a spinner until it settles.
  confirmLabel: string  // The verb, e.g. "Remove data source".
  title?: ReactNode = 'Are you sure?'
  message?: ReactNode  // The consequence, shown under the title ("Auditing stops and its history is deleted.").
  cancelLabel?: string = 'Cancel'
  destructive?: boolean = true  // Default true: danger icon tile and a red confirm button, focus starts on Cancel. false: primary confirm.
  icon?: IconName
  busy?: boolean  // Show the spinner yourself (not needed when `onConfirm` returns a promise).
  children?: ReactNode
<Steps>
  steps: string[]
  current: number
  onStep?: ((i: number) => void)
  page?: boolean

// Tooltip — One floating tooltip for the whole app. Mount TooltipHost once; any element with data-tip, and every icon-only button with an aria-label, shows its label on hover or keyboard focus.
<TooltipHost />

// Chart — Highcharts-based charts in the Lepide Design System theme — one Chart component with a kind per product chart type (columns, stacked, bars, areas, lines, donuts, gauges, rings, bubbles), plus a borderless Sparkline. Imported from '@lepide/ds-react/charts'.
<Chart>  // from '@lepide/ds-react/charts'
  kind: keyof ChartData  // Which chart to draw; it decides the shape of `data` (see ChartData).
  data: keyof ChartData extends K ? Record<string, unknown> : ChartData[kind]  // The shape for this `kind` (ChartData), checked when `kind` is a literal.
  height?: number = 270
  title?: string  // Accessible name and the caption of the text alternative (the card header stays the visible title).
  onSelect?: ((label: string, index: number) => void)  // Click-through from a category or segment.
  options?: ChartOptions
<Sparkline>  // from '@lepide/ds-react/charts'
  data: number[]
  color?: string = '#1c4599'
  height?: number = 56
function chartColor(c: string | undefined, i?: number): string  // Resolve a product colour (`var(--chart-red)`, a hex, or nothing) to an Lepide Design System colour.
const PALETTE: string[]

// Data table — Table card with title and count, sortable headers, an optional column filter row, checkbox selection, row open and row actions, client-side paging, skeleton loading and empty states, and a sticky first column.
<DataTable>
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  title?: ReactNode  // Card toolbar: title (left), count noun, extra controls (right).
  noun?: [string, string] = ['record', 'records']
  toolbar?: ReactNode
  search?: string = ''  // Search text: the table filters `rows` by it across all columns (pass a SearchField's value; don't pre-filter for search).
  pageSizes?: number[] = [10, 25, 50, 100]
  pager?: boolean = true  // false = no pager and every row shown: for short lists inside a dialog or card (a few chosen items).
  defaultPageSize?: number
  selectable?: "multi" | "single"  // Selection: 'multi' shows checkboxes; selected keys are controlled.
  selected?: string[] = []
  onSelectedChange?: ((keys: string[]) => void)
  onRowOpen?: ((row: T) => void)  // Row activation (click / Enter) — e.g. open a detail panel.
  activeKey?: string | null
  rowActions?: ((row: T) => ReactNode)
  isRowDisabled?: ((row: T) => boolean)
  loading?: boolean
  empty?: ReactNode  // First use: shown when `rows` is empty and nothing filters them (an `EmptyState` that says how to add the first one).
  noResults?: string = 'No results match your search or filters.'  // Shown when `search`, a column filter or `filtered` leaves no rows.
  filtered?: boolean  // Set when you filter `rows` yourself (e.g. a Segmented above the table), so an empty list shows `noResults`, not `empty`.
  flat?: boolean
  maxHeight?: number
  initialSort?: { key: string; dir: "asc" | "desc"; }
  className?: string
<Pager>
  total: number
  noun: [string, string]
  page: number
  pages: number
  size: number
  sizes: number[]
  onPage: (p: number) => void
  onSize: (s: number) => void

// KPI card — Stat card with a label, a large value that counts up once, an optional delta chip, a foot line and a full-bleed sparkline. Imported from '@lepide/ds-react/charts'.
<KpiCard>  // from '@lepide/ds-react/charts'
  label: string
  value: string | number
  delta?: string
  deltaTone?: "brand" | "good" | "warn" | "bad" | "flat" = 'flat'
  deltaDir?: "up" | "down"
  foot?: string
  spark?: number[]
  sparkColor?: string
  onClick?: (() => void)

// Sign in — The whole sign-in page, exactly the prototype's — glass card with the form (email, password) and the illustration panel, where data particles form the Lepide mark and each module's icon, one slide each. Validation, loading and error states are built in.
<SignIn>
  onSubmit: (values: SignInValues) => void | Promise<void>  // Called with valid input.
  eyebrow?: string = 'Lepide · Data Security Platform'
  title?: string = 'Sign in to the console'
  subtitle?: ReactNode
  forgotPasswordTo?: string  // Link for "Forgot password?" (rendered through LepideProvider's link).
  requestAccessTo?: string  // Link for "Request access" in the footer.
  slides?: SignInSlide[]  // Slides on the illustration panel.
  art?: ReactNode  // Replaces the particle animation with your own (static) illustration; `slides` then switch with the dots only.
  showKeepSignedIn?: boolean = false  // Show a "Keep me signed in" checkbox (the prototype has none).
  defaultKeepSignedIn?: boolean = true  // Initial state of "Keep me signed in".

// Types used above
type LinkComponent = ComponentType<LinkProps>;
type LinkProps = { to: string; className?: string; children?: ReactNode; 'aria-current'?: 'page' | 'step' | 'location' | 'true'; onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void; };
type Theme = 'light' | 'dark' | 'hc';
type IconName = keyof typeof icons.line;  // a line icon name from §2.7
type ModuleIconName = keyof typeof icons.module;  // a module icon name from §2.7
type ButtonVariant = 'secondary' | 'primary' | 'danger' | 'danger-solid' | 'ghost';
type MenuItem = { label?: string; icon?: IconName; onSelect?: () => void; disabled?: boolean; reason?: string; danger?: boolean; selected?: boolean; separator?: boolean; };
type Option = { value: string; label: string; disabled?: boolean };
type SegItem = { value: string; label: ReactNode; icon?: IconName; count?: number; disabled?: boolean };
type Tone = 'neutral' | 'brand' | 'good' | 'warn' | 'bad' | 'flat';
type StatusTone = 'good' | 'warn' | 'bad' | 'info' | 'none';
type Crumb = { label: string; to?: string };
type ToastAction = { label: string; onClick?: () => void; primary?: boolean };
type ToastHandle = { update: (patch: Partial<ToastInput>) => void; dismiss: () => void };
type ToastInput = { variant?: ToastVariant; title?: string; message: string; actions?: ToastAction[]; loading?: boolean; duration?: number; anchor?: 'auto' | 'corner' | HTMLElement | string | null; };
type ToastVariant = 'info' | 'success' | 'warning' | 'error';
type Column<T> = { key: string; header: string; value?: (row: T) => string | number | boolean | null | undefined; render?: (row: T) => ReactNode; title?: (row: T) => string | undefined; width?: number; minWidth?: number; sortable?: boolean; filterable?: boolean; mono?: boolean; wrap?: boolean; align?: 'left' | 'right' | 'center'; };
type DateRange = { preset: string; from: Date; to: Date };
type TileOption = { value: string; label: string; description?: ReactNode; icon?: IconName; image?: string; disabled?: boolean };
type SignInSlide = { kicker: string; title: string; text: string; shape?: LoginArtShape };
type SignInValues = { email: string; password: string; keepSignedIn: boolean };
type SectionNavItem = { value: string; label: string; icon?: IconName; badge?: ReactNode; to?: string; group?: string; };
type TreeItem = { id: string; label: string; icon?: IconName; count?: number; children?: TreeItem[]; disabled?: boolean; };
type ChartColor = string;  // from '@lepide/ds-react/charts'
type ChartSeries = { name: string; values: number[]; color?: ChartColor };  // from '@lepide/ds-react/charts'
type ChartData = { columns: { labels: string[]; values: number[]; name?: string; colors?: (ChartColor | undefined)[] }; dateColumns: { labels: string[]; values: number[]; name?: string; color?: ChartColor }; stacked: { labels?: string[]; cats?: string[]; series: ChartSeries[] }; pairedBars: { rows: string[]; series: ChartSeries[] }; areaBars: { bars: number[]; line: number[]; labels: string[]; markers?: number[]; barName?: string; lineName?: string }; multiArea: { labels: string[]; series: (ChartSeries & { legendColor?: ChartColor })[] }; line: { labels: string[]; series: ChartSeries[] }; donut: DonutData; calloutDonut: DonutData; gaugeDonut: DonutData; donut3d: DonutData; rings: { rings: { label: string; value: number; color?: ChartColor }[] }; bubbles: { points: { label: string; x: number; y: number; size: number; color?: ChartColor }[] }; speedometer: { value: number; max?: number; name?: string; bands: { to: number; label: string; color?: ChartColor }[] }; };  // from '@lepide/ds-react/charts'
type ChartOptions = { y?: { min?: number; max?: number; ticks?: number; format?: (v: number) => string }; legend?: boolean; markers?: boolean; stacked?: boolean; onPoint?: (series: number, point: number) => void; raw?: Highcharts.Options; };  // from '@lepide/ds-react/charts'
```
<!-- components:end -->

## 10. The prototype: screens to follow

The Lepide console prototype is the reference for *what is on each screen and how its flow goes*. This design system
says *how it looks and which components build it*. Use them together.

| | Where |
|---|---|
| Live prototype, no sign-in | https://lepide-new-ui.vercel.app — every screen |
| Live prototype with sign-in | https://lepide-with-new-design.vercel.app/login — the sign-in screen and flow |
| Screen catalog (in this repository) | [prototype/README.md](prototype/README.md) — every screen with its path, patterns, header actions, tabs, table columns, cards, what its primary action opens, the prototype source folder and a screenshot; machine-readable: [prototype/screens.json](prototype/screens.json); MCP: `find_screen("file server")` |

**The rule.**
1. Look the request up in the catalog first (or `find_screen`). "Create the file server section for me" →
   Settings › Add data source › File server.
2. **The screen exists:** rebuild it as it is there. Keep its layout and section order, its header actions (and which one
   is primary), tabs, table columns, cards, and the flow its primary action starts (the dialog, its steps and fields).
   Don't add, drop or reorder sections, and don't invent another flow.
3. **Sign-in:** always the prototype's sign-in (`SignIn` from `@lepide/ds-react`, [screenshot](prototype/screens/login.webp)). Never design a new
   login page.
4. **The screen doesn't exist:** start from the closest screen in the same module (same header, table and dialog
   patterns), then §4.2 / §4.4 and the golden examples.
5. **Details follow this file.** The screenshots show layout and flow; copy rules (sentence case, no-results wording),
   tokens and kit components come from this spec where the prototype is older. In particular:
   * **Dialog titles** are the action in sentence case ("Create case"), with what it acts on in the subtitle if
     needed. Not the prototype's breadcrumb titles ("e-Discovery / Create New Case") and no back chevron in the title
     (Back goes in the footer of a multi-step dialog).
   * **The primary button names the action** ("Create case", "Install", "Save changes"), not "Done", "OK" or "Submit".
     "Next" is right on every step but the last of a multi-step dialog or wizard.
   * **Page description:** keep it where the prototype has one; don't add one where it hasn't.
   * **Dialog size** comes from the Modal page (`sm` for 2–4 fields, `md` for more or for a list, `lg` for side tabs),
     not from the prototype's width.
6. **Parts the prototype doesn't show** (a details drawer, later steps of a dialog, an error state): build them from
   the closest golden screen's pattern (`examples/screens`, e.g. the alerts drawer, the wizard steps), using only the
   data the screen already has. Keep them minimal and don't invent new features; say in your summary which parts
   you composed this way, so a designer can check them.

The screenshots and facts are copies in this repository, so §10 keeps working if the live sites change or go away.
To refresh them after the prototype changes: `npm run prototype:capture` (it crawls the live prototype in headless
Chrome), then `npm run build`.
