---
name: lepide-design-system
description: Build or change UI in the Lepide Design System, the look of the Lepide console (pale canvas, glass sidebar, white 20px cards, Manrope, pill buttons, one Lepide-blue #1c4599 primary). Use it for any Lepide screen, page, form, table, dialog, drawer, dashboard, chart or component, in React (@lepide/ds-react) or plain HTML (@lepide/ds-css), and whenever the user asks for "Lepide-styled", "on-brand" or "Lepide Design System" UI. It covers tokens, every component's props and states, shell markup, page patterns and a checklist.
---

# Lepide Design System

Everything needed to produce Lepide Design System UI is in this skill's folder, laid out exactly like the design
system repository, so every path in DESIGN.md and the component pages resolves here. Paths are relative to this folder.

| File | Use |
|---|---|
| `DESIGN.md` | The spec. Read §0 (setup), §1 (look and principles), §4.1 (shell markup), §7 (starter page), §8 (checklist) every time; the other sections when you use that part |
| `docs/components/<id>.md` | One page per component — read the page of every component you use. Index: DESIGN.md §9 |
| `docs/components.json` | Machine-readable: props, defaults, CSS classes, tokens, guidance per component |
| `tokens/build/json/tokens.json` | Every token and its value in light, dark and high-contrast (`tokens/src/` holds the DTCG source) |
| `packages/css/dist/lepide.css` | The complete stylesheet (`@lepide/ds-css`), for standalone HTML when the package isn't installed |
| `packages/react/src/assets/icons.json`, `…/lepide-mark.svg` | Every icon's SVG paths, and the brand mark |
| `examples/screens/*.tsx`, `examples/html/*.html` | Golden screens (React page content; complete static pages). Start from the closest one |

## Workflow
1. Decide the route (DESIGN.md §0): React with `@lepide/ds-react` if the project has it; otherwise plain HTML with
   `@lepide/ds-css` — or, for a one-off file, copy `packages/css/dist/lepide.css` next to it (or inline it).
2. Open the closest golden screen in `examples/` and start from it (patterns: DESIGN.md §4.2; shell: §4.1).
3. For each component, open its page in `docs/components/` and follow its example, variants and states.
4. Write only token-based values; look names up in `tokens.json`.
5. Check the result against DESIGN.md §8 before you finish.

## Lepide Design System — rules for AI coding tools

Every screen in this project uses the **Lepide Design System**. Match it exactly; don't invent styles.

### Read before building UI
**First, check the prototype.** If the screen asked for already exists in the Lepide console prototype (the catalog
`./prototype/README.md`, or `find_screen("<request>")` on the MCP server), build it like the prototype: same layout,
sections, table columns, actions and flow. Sign-in is always the prototype's sign-in (`SignIn`). Only new screens are
composed from the patterns. See DESIGN.md §10.

If the `lepide-design-system` MCP server is connected, use it: call `get_started` once, `find_screen` with the request, `get_example` for the
closest golden screen, `get_component` for each component, `get_tokens` / `search_icons` for values and icons, and
`validate_code` on what you wrote before you finish. Otherwise read the files:
1. `./DESIGN.md` — the full spec: look, tokens, every component, shell markup, page patterns, checklist (§8).
2. `./docs/components/<name>.md` — the page for each component you use (when to use, states, props, example).
   Machine-readable: `./docs/components.json` (props, defaults, CSS classes, tokens per component).
3. `./tokens/build/json/tokens.json` — every token value per theme.
4. `./examples/screens/*.tsx` (React) and `./examples/html/*.html` (static) — golden screens: home, dashboard,
   report-hub, alerts, users, settings, file-server, e-discovery, wizard, sign-in. Start a new screen from the closest one.

### How to build
- **React:** install the kit from the website (it isn't on npm; don't ask for the repository):
  `npm install https://lepide-new-ds.vercel.app/ds/lepide-ds-css.tgz https://lepide-new-ds.vercel.app/ds/lepide-ds-react.tgz react@18 react-dom@18`.
  Import components from `@lepide/ds-react` (charts and KPI cards from `@lepide/ds-react/charts`) and
  the stylesheet once: `import '@lepide/ds-css'`. Use the component, never re-create it with divs and CSS.
- **Plain HTML:** link `@lepide/ds-css/dist/lepide.css` (nothing installed: the hosted copy `https://lepide-new-ds.vercel.app/ds/lepide.css`) and use
  its classes (`lf-btn`, `lf-card`, `fld`, …) with the markup from DESIGN.md §4.1 (shell) and §7 (page). Never write
  your own stylesheet or copy of the tokens. Scripts the same way: `https://lepide-new-ds.vercel.app/ds/lepide.js` (dialogs, toasts, password
  reveal) and `https://lepide-new-ds.vercel.app/ds/lepide-art.js` (the AI orb, the sign-in animation); never comment them out.
- The fonts (Manrope, Geist Mono) are embedded in `@lepide/ds-css`: don't add a font link or other fonts.
- Pages live inside the console shell (sidebar + 64 px top bar); page content starts with breadcrumbs, a title,
  an optional description and actions on the right, then white cards.

### Always
- Start in the light theme: it is the primary theme. Build and review every screen in light first, then check dark and
  high contrast. Don't default to dark or follow the OS dark-mode setting.
- Use tokens (`var(--brand)`, `var(--ink-3)`, `var(--r-lg)`, `var(--s4)` …) for any value you write; check the
  name exists in `tokens.json`.
- One primary button per view, rightmost. A view is a page header, a dialog, a drawer, a wizard step or a form
  card's footer: a page may have a primary in its header *and* one in a separate form card's footer, never two in
  the same row. Button labels are sentence-case verbs ("Create report").
- No-results text names what is missing: `No reports match "finance".`; when that isn't known, use
  `No results match your search or filters.` (DataTable's default). No "Sorry", no exclamation marks.
- Selected states use the selected finish (`--sel-fill` + `--sel-shadow`, white text).
- Brand-coloured text and icons use `--brand-ink`; `--brand` is for fills (buttons, selected states). `--ink-4` is only
  for placeholders, disabled items and decorative icons — text people need to read is `--ink-3` or darker. This keeps
  every theme (light, dark, high contrast) at WCAG AA.
- Form fields go inside `.page-form` (pages) or a `Modal` body, which is where field styles apply.
- `Dropdown` / `SelectField` for every select in React; `IconButton` (with `label`) for icon-only buttons.
  In static HTML with no script, a native `<select>` inside `.page-form .fld` is the accepted fallback (it is styled to match).
- Status shows as a `Chip` or `ToneTag` in the tone's `-bg` / `-text` colours, with words, never colour alone.
- The Lepide AI orb and the sign-in illustration are code from the prototype, not pictures: `<AiOrb />` and
  `<SignIn>` in React, `data-lepide-orb` and the sign-in `.auth__art` markup with `lepide-art.js` in plain HTML.
  Never redraw them with CSS or SVG.
- Destructive actions confirm with `ConfirmDialog`.
- Errors from a click → `toast({ variant: 'error' })` (it appears beside the control); field errors on the field.
- Icons: only names from DESIGN.md §2.7, Lucide outlines at 1.6 stroke; each one's SVG paths are in
  `./packages/react/src/assets/icons.json`.
- Respect `prefers-reduced-motion`; keep focus rings; give every control an accessible name.

### Never
- Hard-coded hex colours, font sizes or shadows in components (charts are the only exception).
- Native `<select>` in React UI, square buttons, black or ink-filled buttons, two primary buttons side by side.
- Other fonts, filled or mixed icon sets, new keyframe animations, bounces.
- Red, amber or green as decoration.
- The old names "Atlas", `--line`, `--mint`, `--violet`, `--radius-*`, `--dur-*` (removed).

### Before you finish
Run through DESIGN.md §8 (checklist): shell, header, cards, one primary, tokens only, states, focus, contrast,
and the 860 px and 620 px layouts.

