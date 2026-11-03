# Lepide Design System

This file is a complete, self-contained description of the **Lepide Design System**, the look and feel of the
Lepide console. A designer, a developer or an AI model should be able to rebuild any screen in the same style
from this file alone. Every value below is copied from the code; where the code and this file disagree, the
code wins and this file is out of date.

## 0. Using the Lepide Design System

Pick one route. All three give the same look because they share one stylesheet and one set of tokens.

| Route | When | Setup |
|---|---|---|
| **React** (preferred) | React 18 apps | `@lepide/ds-react` + `@lepide/ds-css`. Build every screen from the kit's components (§3, and one page per component in `docs/components/`) |
| **Plain HTML / CSS** | Prototypes, other frameworks, static pages | `@lepide/ds-css` only (`dist/lepide.css`). Use the CSS classes named in §3 and the markup in §4.1 and §7 |
| **Tokens only** | A product with its own components that must match | `@lepide/ds-css/tokens.css` or `tokens/build/json/tokens.json` |

Always load the fonts: `https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap`.

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
| `examples/` | **Golden screens** — dashboard, reports hub, alerts (list → drawer → confirm → toast), users admin, settings, wizard, sign-in. React: `examples/screens/*.tsx`; complete static HTML: `examples/html/*.html`. Start new screens from the closest one. `npm run examples` opens the gallery |
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
| `--ink-4` | `#a7abb3` | Placeholders, disabled text, group labels |

**Status tones** (background / text / dot)

| Tone | Base | `-bg` | `-text` (AA) | `-dot` |
|---|---|---|---|---|
| Success | `#12805c` | `#e8f6f0` | `#0f7353` | `#1fae7a` |
| Warning | `#b4610a` | `#fdf3e4` | `#985107` | `#f09a28` |
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

Set with `<html data-theme="dark">` or `data-theme="hc"` (stored in `localStorage['lepide.theme']`).
**Status: light is stable; dark and high contrast are beta (proposed).**

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
track `--chart-track` `#eff1f3`. Highcharts needs literal colours, so `packages/react/src/charts.tsx` repeats these values.

### 2.4 Typography

Fonts (Google Fonts): **Manrope** 400/500/600/700/800 and **Geist Mono** 400/500.

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
`<svg class="lf-i" viewBox="0 0 24 24" aria-hidden="true">…</svg>` — every name above is there.

Brand mark: the Lepide mark in a single sky blue, `#2996D3` (`packages/react/src/assets/lepide-mark.svg`), shown in a 36 px white tile with an
11 px radius (`--sh-xs` + inset `--border-soft` ring), beside **Lepide** (800 16/20, −0.02em) and
*Data Security Platform* (500 11.5/15 ink-3).

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

### 3.7 Cards

* **Card** `.lf-card`: white, 1 px `--border-soft`, **radius 20, padding 20, `--sh-sm`**. `--lift`: hover `--sh-md`
  and `--border`. Title `.lf-card__title` 700 15/22 −0.01em, margin-bottom 14, optional `small` subtitle
  500 12.5/18 ink-3 (in panels the subtitle sits under the title).
* **Panel** (chart card): flex column, min-height 330. Grid `.panels`: 3 columns, gap 16 (2 under 1280 px,
  1 under 860 px); `--wide` spans 2.
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

Built on Highcharts (`highcharts`, `highcharts-more` for bubbles, `solid-gauge` for gauges and rings).
Highcharts needs a commercial licence before it ships in a product.

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
  **Assistant** (Lepide AI), **Modules** (Auditor, Trust, Detect, Protect, Identify), **Workspace** (My
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
    <button type="button" class="lf-dock__subitem"><svg class="lf-i" viewBox="0 0 24 24" aria-hidden="true">…</svg><span>Alert Configuration</span></button>
    <button type="button" class="lf-dock__subitem"><svg class="lf-i" viewBox="0 0 24 24" aria-hidden="true">…</svg><span>Alert Status</span></button>
  </div>
</div>
```

The brand mark (`lepide-mark.svg`) is in `packages/react/src/assets/`; the MCP server returns it from
`search_icons("lepide")`, and every icon's SVG from `search_icons("<name>")`.

### 4.2 Page patterns

* **Page header** `.head`: breadcrumbs (500 12.5 ink-3, `›` separators in ink-4, links hover brand), then
  the title, an optional description and an actions row at the right.
* **Home**: max width 1180, centred. Hero title (500 38/46) and subtitle; the **Lepide AI card** (pastel
  mesh: blue at the orb, lavender, peach on the far right, drifting highlight; a 54 px frosted "ask" pill
  with a primary Ask button; suggestion chips); then module tiles in a 10-column grid (tiles span 2,
  min-height 196, padding 18, 40 px icon tile, title 700 15.5, 3-line description, arrow circle that turns
  into the selected finish on hover, plus a two-tone pastel wash per module).
* **Dashboard**: header + switcher dropdown + Refresh; an optional KPI row; chart panels in a 3-column grid; each
  panel: title, "Last Updated on …" caption, small icon tools at the right.
* **Reports hub**: 288 px folder tree card (`<Tree>` inside `<Card className="folders">`) + table card. Tree items
  38 tall, radius 10, 600 13 ink-2; current folder uses the selected finish with a white count; nested lists indent
  behind a hairline.
* **Settings**: `<div class="settings">` = 260 px sticky section nav (`<SectionNav>`, items 38 tall, current = selected
  finish; a dropdown replaces it under 860 px) + `<section class="settings__body">` with `SetCard`s.
* **Choosing a type** (first wizard step, "Add data source"): `<TilePicker>` — tiles with icon or logo, title and one line.
* **Wizard**: steps at the top of a card; body padding 24; footer `--surface-2` with Back · Cancel · Next
  (Finish on the last step).
* **Sign in**: a 1120 px glass card (radius 32) split into the form (logo tile 52, eyebrow, 30/38 title,
  48 px fields radius 14, a 50 px primary pill button with a ripple and arrow) and an illustration panel
  (radius 24, radial blue gradient, animated canvas, progress dots).

### 4.3 Responsive

| Width | Changes |
|---|---|
| ≤ 1280 | KPI grid and panels → 2 columns |
| ≤ 1100 | Builders and AI page stack; module grid → 6 columns; reports tree 240 |
| ≤ 860 | **Sidebar becomes a floating bottom tab bar** (fixed 10 px from the edges, 64 tall, radius 22, icons only 48 × 48); top bar shows the brand; main padding 4 16 100; title 26/32; panels 1 column; drawers become bottom sheets; settings nav becomes a dropdown; notifications sit 92 px up |
| ≤ 620 | KPIs 1 column; module tiles 2 columns; form rows 1 column; dialog tabs scroll sideways |

---

## 5. Accessibility

* Text tones meet 4.5:1 (that's why `--ink-3` is `#666b74` and tone text uses the `-text` values).
* Focus: `outline: 2px solid rgba(28,69,153,.6); outline-offset: 2px` on everything; fields use the 3 px
  `--ring` instead. High contrast: 3 px black.
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
| Sentence-case labels; no-results text that names the thing: `No reports match "finance".`, generic `No results match your search or filters.` | Title Case labels, apologies ("Sorry, …"), exclamation marks in system messages |

---

## 7. Starter snippet

The page content that goes inside `.main` of the shell (§4.1), using only `@lepide/ds-css` classes — no custom CSS.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="node_modules/@lepide/ds-css/dist/lepide.css">

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
    footer={<><Button>Cancel</Button><Button variant="primary">Save changes</Button></>}>
    <div className="page-form" style={{ display: 'grid', gap: 16 }}>
      <div className="fld-row"><TextField label="Server" defaultValue="smtp.corp.com" /><TextField label="Port" note="Usually 587" defaultValue="587" /></div>
      <TextField label="Sender address" placeholder="alerts@corp.com" />
    </div>
  </SetCard>
</div>
```

---

## 8. Checklist for generating a new screen

1. Load Manrope + Geist Mono and `@lepide/ds-css` (tokens, themes and every class). Use the React kit when you can.
2. Put the page inside the shell (§4.1 markup): floating glass sidebar (256, radius 26) and the 64 px top bar.
   Look up each component in `docs/components/<name>.md` (or `docs/components.json`) before using it.
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
| foundation | [Providers](docs/components/providers.md) | `LepideProvider`, `ThemeProvider` | App-root setup. LepideProvider plugs in your router's link; ThemeProvider stores the light, dark or hc theme and applies it as <html data-theme>. Mount ToastProvider and TooltipHost once beside them. |
| actions | [Button](docs/components/button.md) | `Button`, `IconButton` | Pill-shaped buttons for actions. One blue primary per view, rightmost; everything else secondary, ghost or danger. |
| forms | [Checkbox](docs/components/checkbox.md) | `Checkbox` | 16 px checkbox with a label for independent on/off choices in forms, lists and table selection; supports an indeterminate state. |
| forms | [Date range picker](docs/components/date-range-picker.md) | `DateRangePicker`, `Calendar` | Ghost-button popover with date presets (Today … Last Month) and a Custom Range month calendar; the change is applied only on Apply. |
| forms | [Dropdown](docs/components/dropdown.md) | `Dropdown`, `SelectField`, `FloatingPop` | Select-only combobox that replaces the native select — 46 px trigger, floating rounded panel, brand tint and check on the selected row, full keyboard support. |
| forms | [File upload](docs/components/file-upload.md) | `FileUpload` | Dashed drop zone for choosing or dropping one file; once a file is set it turns into a file card with name, size and a remove button. |
| forms | [Pill input](docs/components/pill-input.md) | `PillInput`, `SearchField` | 40 px pill-shaped text input for toolbars and searches, with an optional leading icon; SearchField is the soft-filled search variant. |
| forms | [Radio group](docs/components/radio-group.md) | `RadioGroup` | A set of 36 px radio option rows for choosing exactly one value; stacked by default or wrapped in a row. |
| forms | [Search select](docs/components/search-select.md) | `SearchSelect`, `MultiSelect` | Labelled select fields for long lists — SearchSelect picks one value with a search box past 8 options; MultiSelect picks several with checkboxes and an optional Select All. |
| forms | [Setting row](docs/components/setting-row.md) | `SettingRow` | A settings list row with a title and help text on the left and a control (usually a Toggle) on the right, separated by hairlines. |
| forms | [Text field](docs/components/text-field.md) | `Field`, `TextField`, `PasswordField`, `NumberField`, `TextAreaField` | Labelled form fields for dialogs and page forms — 46 px soft-filled controls with a label, optional note, help text and inline error. |
| forms | [Tile picker](docs/components/tile-picker.md) | `TilePicker` | A grid of selectable tiles (icon or logo, title, one-line description) for choosing a type or source — single choice by default, or several with multiple. |
| forms | [Toggle](docs/components/toggle.md) | `Toggle` | 38 × 22 on/off switch for settings that take effect immediately; always has an accessible label. |
| forms | [Wizard card](docs/components/wizard-card.md) | `WizardCard` | Full-page multi-step form — a step indicator above a card holding one step's fields, with Back, Cancel and Next/Finish in the footer. |
| navigation | [Menu](docs/components/menu.md) | `Menu` | A trigger plus an anchored popover menu of actions (.pop), with icons, separators, selected and danger items, and disabled items that explain why. |
| navigation | [PageHeader](docs/components/page-header.md) | `PageHeader` | The top of every page — optional breadcrumbs, eyebrow, the page title (h2), an optional chip and description, and the page actions at the right. |
| navigation | [Section nav](docs/components/section-nav.md) | `SectionNav` | Left-hand section navigation for settings-style pages, with a built-in dropdown that replaces it under 860 px. The current section gets the selected finish. |
| navigation | [Segmented](docs/components/segmented.md) | `Segmented` | Pill-shaped segmented control that switches between two to five sibling views (tabs mode) or data filters (pressed mode). |
| navigation | [Tree](docs/components/tree.md) | `Tree` | Folder / report tree for a hub page — top-level folders with counts, expandable groups and nested items. The current row gets the selected finish. |
| navigation | [VerticalTabs](docs/components/vertical-tabs.md) | `VerticalTabs` | A vertical list of section buttons for the left column of settings-style dialogs; the current section gets the selected finish. |
| display | [Avatar](docs/components/avatar.md) | `Avatar`, `Person` | Round initials avatar with a tint picked from the name, and Person, an avatar plus name and optional detail on one line. |
| display | [Card](docs/components/card.md) | `Card`, `SetCard`, `KeyValues` | White rounded containers. Card for content panels, SetCard for settings sections with head, body and footer, KeyValues for read-only field tiles. |
| display | [Chip](docs/components/chip.md) | `Chip`, `ToneTag`, `Counter` | Small read-only pills. Chip labels a thing, ToneTag shows a status with a dot and text, Counter shows a number. |
| display | [Icon](docs/components/icon.md) | `Icon`, `ModuleIcon`, `BrandMark` | Thin Lucide-style line icons (1.6 stroke, currentColor), the product module glyphs, and the Lepide mark in its white tile. |
| feedback | [Banner](docs/components/banner.md) | `Banner` | Inline tinted message strip with a tone icon, text, an optional action and an optional dismiss button — for persistent notices inside a page, card or dialog. |
| feedback | [EmptyState](docs/components/empty-state.md) | `EmptyState` | Centred block on a dotted field with an icon tile, a title, an optional message and an action — for empty lists, no results and load errors. |
| feedback | [Loading](docs/components/loading.md) | `SkeletonRows`, `PageLoader`, `ProgressBar` | Loading feedback — shimmering skeleton table rows, a centred page spinner, and a determinate or indeterminate progress bar. |
| feedback | [Toast](docs/components/toast.md) | `ToastProvider`, `useToast` | Notifications from one call, toast({...}). They show as a card stack in the bottom-right corner, or as a nudge callout beside the control the user just clicked when an error or warning answers that click. |
| overlays | [Drawer](docs/components/drawer.md) | `Drawer`, `DetailPanel` | Floating side panel that slides in from the right over a scrim (Drawer), and the non-modal sticky panel beside a list (DetailPanel). |
| overlays | [Modal](docs/components/modal.md) | `Modal`, `ConfirmDialog`, `Steps` | Centred dialog with icon-tile head, scrolling form body and a footer of buttons; ConfirmDialog for yes/no questions; Steps for multi-step progress. |
| overlays | [Tooltip](docs/components/tooltip.md) | `TooltipHost` | One floating tooltip for the whole app. Mount TooltipHost once; any element with data-tip, and every icon-only button with an aria-label, shows its label on hover or keyboard focus. |
| data | [Chart](docs/components/chart.md) | `Chart`, `Sparkline` | Highcharts-based charts in the Lepide Design System theme — one Chart component with a kind per product chart type (columns, stacked, bars, areas, lines, donuts, gauges, rings, bubbles), plus a borderless Sparkline. Imported from '@lepide/ds-react/charts'. |
| data | [Data table](docs/components/data-table.md) | `DataTable`, `Pager` | Table card with title and count, sortable headers, an optional column filter row, checkbox selection, row open and row actions, client-side paging, skeleton loading and empty states, and a sticky first column. |
| data | [KPI card](docs/components/kpi-card.md) | `KpiCard` | Stat card with a label, a large value that counts up once, an optional delta chip, a foot line and a full-bleed sparkline. Imported from '@lepide/ds-react/charts'. |
<!-- components:end -->
