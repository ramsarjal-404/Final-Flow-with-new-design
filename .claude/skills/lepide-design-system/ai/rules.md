## Lepide Design System — rules for AI coding tools

Every screen in this project uses the **Lepide Design System**. Match it exactly; don't invent styles.

### Read before building UI
If the `lepide-design-system` MCP server is connected, use it: call `get_started` once, `get_example` for the
closest golden screen, `get_component` for each component, `get_tokens` / `search_icons` for values and icons, and
`validate_code` on what you wrote before you finish. Otherwise read the files:
1. `{{DS}}/DESIGN.md` — the full spec: look, tokens, every component, shell markup, page patterns, checklist (§8).
2. `{{DS}}/docs/components/<name>.md` — the page for each component you use (when to use, states, props, example).
   Machine-readable: `{{DS}}/docs/components.json` (props, defaults, CSS classes, tokens per component).
3. `{{DS}}/tokens/build/json/tokens.json` — every token value per theme.
4. `{{DS}}/examples/screens/*.tsx` (React) and `{{DS}}/examples/html/*.html` (static) — golden screens: dashboard,
   report-hub, alerts, users, settings, wizard, sign-in. Start a new screen from the closest one.

### How to build
- **React:** import components from `@lepide/ds-react` (charts and KPI cards from `@lepide/ds-react/charts`) and
  the stylesheet once: `import '@lepide/ds-css'`. Use the component, never re-create it with divs and CSS.
- **Plain HTML:** link `@lepide/ds-css/dist/lepide.css` and use its classes (`lf-btn`, `lf-card`, `fld`, …) with the
  markup from DESIGN.md §4.1 (shell) and §7 (page). Don't write CSS that the stylesheet already has.
- Load the fonts: Manrope 400–800 and Geist Mono 400/500 from Google Fonts.
- Pages live inside the console shell (sidebar + 64 px top bar); page content starts with breadcrumbs, a title,
  an optional description and actions on the right, then white cards.

### Always
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
- Destructive actions confirm with `ConfirmDialog`.
- Errors from a click → `toast({ variant: 'error' })` (it appears beside the control); field errors on the field.
- Icons: only names from DESIGN.md §2.7, Lucide outlines at 1.6 stroke; each one's SVG paths are in
  `{{DS}}/packages/react/src/assets/icons.json`.
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
