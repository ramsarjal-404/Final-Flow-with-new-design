# Building a Settings category (read before writing code)

App: `C:\Users\RamS\Desktop\lepide-console` — Vite + React 18 + TypeScript + react-router v6.
Sign-in, Home, the console shell and the Settings frame already exist. Each Settings category is
built in its own folder and plugs into the frame.

## Sources of truth

| What | Where |
|---|---|
| Behaviour, routes, copy (exact), validation, data, states | `C:\Users\RamS\Desktop\saas\product-blueprint\modules\settings\README.md` and your module folder (`settings-data-sources\` or `settings-administration\`): `README.md`, `screens.md` + `screens\*.md`, `flows.md`, `interactions.md`, `data-model.md`, `acceptance-criteria.md` |
| Look (Lepide Design System design) | `C:\Users\RamS\Desktop\saas\product-blueprint\ui-design-system\` — read `README.md`, `03-components.md`, `04-screen-patterns.md` § 9–12, `05-states-and-feedback.md`, `07-component-mapping.md` (decision log), `08-module-recipes.md` § 11 |
| Seed data | `src/data/settings/*.json` (and `src/data/components/settings/**`). Shape: `{ "$source", "exports": { NAME: … } }` → `import d from '../../../data/settings/admin.json'; d.exports.ROLES`. Patterns are `{ "$regexp", "flags" }` → `toRegExp()` from `src/stores/createStore.ts`. |

Copy in quotes in the spec is exact (titles, labels, placeholders, messages, toasts). Where a GAP
states the intended behaviour, build the intended behaviour. Controls whose flow is outside the
prototype show an info toast titled with the control name and the message "<Name> isn't part of
this prototype yet." Simulated server work (timers, fixed results) is fine — it's a prototype.

## Where your code goes

- `src/settings/categories/<id>/index.tsx` — **default export** = the category page (replace the stub).
  Split into more files in the same folder as you like. You own only your category folders
  (plus any store file your brief says you own).
- The frame renders breadcrumbs, the title (category label) and the Categories navigation. Put the
  page-level actions into the title row with `<HeaderActions>…</HeaderActions>` and an optional
  one-line description with `<HeaderDescription><p>…</p></HeaderDescription>` (both from
  `../../SettingsFrame`).
- The route is `/settings/:category/*`: use nested `<Routes>` with relative paths for sub-pages
  (e.g. `<Route path="file-servers/:name" …>`), and `useNavigate()` with absolute `/settings/<id>/…` paths.
- Optional category CSS: `styles.css` in your folder, imported by your page; class prefix `<id>-`;
  **tokens only** (`var(--…)`), no raw colours, no new fonts. Prefer existing Lepide Design System classes.
- Do **not** edit `src/ui/**`, `src/styles/**`, `src/app/**`, `SettingsFrame.tsx`, `categories.ts`
  or other categories. If a generic component is missing, build it inside your folder from Lepide Design System
  classes and mention it in your report.

## UI kit (`src/ui`, import from `'../../../ui'`)

Read the source files for props; they are short. Summary:

- **Buttons**: `Button` (variant `secondary|primary|danger|danger-solid|ghost`, size `sm|md|lg`, `icon`, `iconEnd`, `loading`, `dot`, `block`), `IconButton` (`icon`, `label` required, `bordered`, `danger`).
- **Icons**: `Icon name=…` (line set: see `lepide-design-system/packages/react/src/assets/icons.json` "line" keys), `ModuleIcon`.
- **Fields** (dialog style; inside a `Modal` body or any element with class `page-form`): `TextField`, `PasswordField`, `NumberField`, `TextAreaField`, `SelectField`, `SearchSelect`, `MultiSelect`, `Field` (wrapper for custom controls). Each takes `label`, `note`, `error`, `help`.
  For an unlabelled inline choice (time pickers, table cells) use `Dropdown` (`size="sm"`). Never a native `<select>` (D-24).
- **Inline controls**: `PillInput`, `SearchField` (soft pill search), `Toggle` (`label` required), `Checkbox`, `RadioGroup`, `SettingRow` (title + help left, control right).
- **Layout/display**: `SetCard` (head with title/description/actions, body, footer), `Card`, `KeyValues` (read-only field tiles), `Segmented` (tabs; ink selected), `VerticalTabs`, `Chip`, `ToneTag` + `toneFor(status)`, `Avatar`, `Person`, `Counter`, `Banner`, `ProgressBar`, `FileUpload`, `EmptyState`, `PageLoader`.
- **Data**: `DataTable` — card with toolbar (`title`, `noun`, `toolbar`), sortable headers (`sortable`), column filter row (`filterable`), `search`, pager (`pageSizes`, `defaultPageSize`), `selectable="multi"` + `selected`/`onSelectedChange`, `onRowOpen`, `activeKey`, `rowActions` (hover row icons — use `IconButton`), `isRowDisabled`, `loading` (skeleton), `empty` (EmptyState node), `noResults`.
- **Overlays**: `Modal` (sizes `lg|md|sm|xs`, `icon`, `subtitle`, `steps`/`step`, `footerHint`, `footer`), `ConfirmDialog` (destructive by default), `Drawer` (floating side sheet), `DetailPanel` (non-modal, inside `<div className="with-detail">`), `Menu` (popover/action menu: `items` or render-prop children), `DateRangePicker`, `WizardCard` (full-page wizard with steps).
- **Feedback**: `useToast()({ variant: 'info'|'success'|'warning'|'error', title, message, actions?, loading?, anchor? })`
  returns `{ update, dismiss }` (D-25). Errors and warnings raised by a click show as a nudge beside the clicked
  button on their own; pass `anchor` (a selector such as `'[data-nudge="validate-creds"]'`) to point at the control
  that fixes it instead. Everything else is a card in the bottom-right. For slow work, push `loading: true` and
  `update()` it with the result. Validate / Test connection results go inline next to the button, not in a card.

Lepide Design System rules to keep: one primary button per screen/dialog, rightmost; destructive actions confirm
first (danger-solid verb); selected states are brand-filled with the primary-button finish (the kit does this); every empty table
uses `EmptyState` or the table's `noResults` ("No results match your search or filters.");
row actions are `IconButton`s with labels; dialogs use `Modal`/`ConfirmDialog`, side editing uses `Drawer`.

## State

Use `createStore` from `src/stores/createStore.ts` (module-level: survives navigation, resets on
reload) for stores the spec scopes that way; plain `useState` for page-local state.

Shared stores already present:
- `src/stores/admin.ts` — `formatDate`, `formatDateTime`, `useDateFormat`, `addLog(verbPhrase)`, `adminStore` (General Settings, date format, logs, `ext` slot). Owner: the General/Role/IQ/Logs/URL/Domains builder (may extend it). Others only call its functions.
- `src/stores/deliveryAccounts.ts` — Detect delivery accounts (`deliveryStore`, add/update/remove). Shared by Subscription and Configure Notifications.

## Checks before you finish

1. `npx tsc --noEmit -p .` from the project root. Fix every error in **your** files (ignore errors
   in other categories that are being built at the same time).
2. Do not start a dev server; the coordinator runs the app and checks it in the browser.
3. Report: which SCR/DLG ids you built, anything you skipped and why, design decisions you made
   that aren't in `07-component-mapping.md`, and any spec ambiguity you resolved.
