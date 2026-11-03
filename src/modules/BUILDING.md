# Building a console module (read before writing code)

App: `C:\Users\RamS\Desktop\lepide-console` — Vite + React 18 + TypeScript + react-router v6.
Sign-in, Home, the console shell and all of Settings already exist and work. Each module is built in its
own folder and plugs into the router. **Read `src/settings/BUILDING.md` too**: its sections "UI kit",
"State" and the Lepide Design System rules apply here unchanged. This file adds what is different for modules.

## Sources of truth

| What | Where |
|---|---|
| Behaviour, routes, copy (exact), validation, data, states | `C:\Users\RamS\Desktop\saas\product-blueprint\modules\<module>\` — `README.md`, `screens.md` (+ `screens\*.md`), `flows.md`, `interactions.md`, `data-model.md`, `acceptance-criteria.md`; cross-module rules in `..\shared\*.md`, `..\shared-workflows.md`, `..\shared-data-model.md`, `..\information-architecture.md`, `..\module-dependency-map.md` |
| Look (Lepide Design System design) | `C:\Users\RamS\Desktop\saas\product-blueprint\ui-design-system\` — `README.md`, `03-components.md`, `04-screen-patterns.md`, `05-states-and-feedback.md`, `07-component-mapping.md` (decision log), and **your module's section of `08-module-recipes.md`**. The reference HTML `reference/lepide-console-redesign.html` draws the report hub, report view, builder, Copilot page, a dashboard and Lepide AI: open it in a browser (`reference/screens/*.png` are screenshots). |
| Seed data | `src/data/**/*.json` (all published seed files are local). Shape `{ "$source", "exports": { NAME: … } }`. Patterns `{ "$regexp", "flags" }` → `toRegExp()` in `src/stores/createStore.ts`. |
| Product images and icon art | `public/blueprint/assets/**` and `public/blueprint/icons/**` (mirrors of the published blueprint assets). Reference them as URLs: `/blueprint/assets/<path>`. Use them only for product content (data-source logos, file-type art, product illustrations). Interface icons come from the Lepide Design System set (`Icon`). |

Copy in quotes in the spec is exact. Where a GAP states the intended behaviour, build the intended
behaviour. Controls whose flow is outside the prototype show an info toast titled with the control
name and the message "<Name> isn't part of this prototype yet." Simulated server work is fine.
Do **not** copy demo text, demo toasts or demo data from the reference HTML (decision D-23).

## Where your code goes

- `src/modules/<module>/index.tsx` — **default export** = a component that owns every route under the
  module's base path (the app registers `/<module>/*`). Use nested `<Routes>` with relative paths, a
  catch-all redirect where the spec gives one, and absolute paths in `navigate()`.
- Pages: a full page is `<div className="sub">…</div>`; pages whose table/thread must fill the window use
  `<div className="sub sub--fill">`. Start every page with `PageHeader` (crumbs, eyebrow, title, chip,
  description, actions). The shell (sidebar current item, top bar) is automatic.
- Optional CSS: `styles.css` in your folder, class prefix `<module>-`, **tokens only**.
- Do **not** edit `src/ui/**`, `src/styles/**`, `src/app/**`, `src/settings/**`, `src/App.tsx`,
  `src/modules/registry.ts` or another module's folder. Build missing generic pieces inside your folder
  from Lepide Design System classes and mention them in your report. Files outside your folder that your brief says you
  own are the only exception.

## Extra kit pieces for modules

- **Charts**: `Chart` (`kind` = speedometer | stacked | columns | dateColumns | pairedBars | areaBars |
  multiArea | line | gaugeDonut | calloutDonut | donut | donut3d | rings | bubbles; `data` in the
  product's widget shape — see `src/data/dashboards/predefined.json`; `height` 270 / 300 wide;
  `onSelect(label, i)` for click-through; text alternative and hover motion built in; adjust with
  `options={{ y: { min, max, ticks, format }, legend, markers, stacked, onPoint }}`, never raw library options). `Sparkline`, `KpiCard`
  (label, value counts up, delta chip, foot, sparkline). `chartColor()` maps product colour names.
  Put charts in `Card`s with class `panel` (`<section className="lf-card panel">` + `lf-card__title` with `<small>`).
- Everything in `src/ui` (`DataTable`, `Modal`, `Drawer`, `DetailPanel`, `WizardCard`, `DateRangePicker`,
  `Menu`, `Segmented`, `SearchSelect`, `MultiSelect`, `FileUpload`, `ProgressBar`, `EmptyState`, …).

## Shared stores and cross-module contracts

| Store | File | Owner | Others |
|---|---|---|---|
| Report modules (Auditor, Trust, Identify folders/rows) + **My Lepide favourites** | `src/reports/**` | Report Library builder | Trust, Identify, My Lepide import its API |
| Export jobs (`lepide.exports`) | `src/stores/exports.ts` | Settings (done) | Report exports call `queueExport(…)` (read the file) |
| Detect delivery accounts, script accounts, agents | `src/stores/deliveryAccounts.ts` | Detect builder may extend (keep existing exports) | Settings already uses it |
| Admin log, date format | `src/stores/admin.ts` | Settings (done) | read-only helpers |

Cross-module links in the spec (e.g. Detect / Lepide AI / Dashboards "View Report" →
`/auditor/reports/<slug>`, My Lepide → report pages, Home ask box → `/lepide-ai` with
`location.state.prompt`) are plain `navigate()` calls to the routes in `information-architecture.md`.
Link to the route even if that module is built by someone else at the same time.

## Checks before you finish

1. `npx tsc --noEmit -p .` from the project root — fix every error in **your** files (ignore errors in
   folders other builders are editing at the same time).
2. A dev server is already running at http://localhost:5175 (don't start another). You may open it in a
   background browser tab to click through your flows; sign in with any email and password through the
   sign-in form (don't write `lepide.session` by hand). Close your tab when done.
3. Report: SCR/DLG ids built, anything skipped and why, design decisions not in the decision log, spec
   ambiguities you resolved, and what you verified in the browser.
