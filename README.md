# Lepide console — new design (Lepide Design System)

A clickable React prototype of the whole Lepide (LDSP) console, built from the product architecture
(`product-blueprint/modules/**`) and drawn in the **Lepide Design System** (https://lepide-new-ds.vercel.app).

**Live demo:** https://lepide-new-ui-gray.vercel.app (any e-mail and password sign in; deep links work).

**Building with an AI tool?** Read [AGENTS.md](AGENTS.md) for the design rules and [flows/](flows/README.md) for documented flows such as
[Active Directory](flows/active-directory/FLOW.md).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5175 and sign in with **any email and any password** (prototype sign-in).
The password `locked` shows the locked-account message.

Other scripts: `npm run build` (type check + production build), `npm run typecheck`, `npm run preview`.

## What's in it

| Area | Routes |
|---|---|
| Sign-in, Home, console shell (sidebar, top bar, account menu with Light / Dark / High contrast themes) | `/login`, `/` |
| Lepide AI | `/lepide-ai` |
| Auditor (report hub, report view, Create Report builder, Data Accessed by Copilot) | `/auditor/*` |
| Trust (hub, report views, six deep permission reports, investigation dialogs) | `/trust/*` |
| Identify (reports, classified file view, e-Discovery) | `/identify/*` |
| Detect (Alert Configuration, Add/Edit Alert wizard, Alert Status) | `/detect/*` |
| Protect (overview, AD Cleaner, policy wizards, report viewer, Team Management) | `/protect/*` |
| My Lepide (favourites across report modules) | `/my-lepide` |
| Dashboards (list, six predefined dashboards incl. Detect, editor, Add Graph wizard) | `/dashboards/*` |
| Settings (17 categories + Manage Component) | `/settings/*` |

Report pages follow the architecture's rule: they can't be opened by direct link or reload and return to
their hub. All data is local seed data (`src/data`); nothing is sent to a server. State resets on reload
except the session, theme and a few stores the specs persist.

## Structure

| Path | What |
|---|---|
| `src/ui/` | Re-exports the Lepide Design System UI kit (`@lepide/ds-react` and its charts) — every screen uses only these components |
| `.claude/skills/lepide-design-system/` | A copy of the Lepide Design System spec, component docs, tokens and golden screens, for people and AI tools. The kit itself (`@lepide/ds-css`, `@lepide/ds-react`) installs from https://lepide-new-ds.vercel.app/ds/lepide-ds-react.tgz and `…/ds/lepide-ds-css.tgz` |
| `flows/` | Flows written for AI tools: each one's steps, fields, rules and screenshots ([flows/README.md](flows/README.md)) |
| `src/app/` | Session, theme, console shell, navigation |
| `src/reports/` | Shared Report Library used by Auditor, Trust, Identify and My Lepide (API: `src/reports/README.md`) |
| `src/modules/<module>/` | One folder per module, registered in `src/modules/registry.ts` |
| `src/settings/` | Settings frame and one folder per category |
| `src/stores/` | Cross-module stores (admin log, delivery accounts, export jobs, subscriptions) |
| `src/data/`, `public/blueprint/` | Seed data and product images from the published blueprint |
| `src/vendor/` | Sign-in particle illustration and Lepide AI orb, ported from the design reference |

To add or change a module, read `src/modules/BUILDING.md` (and `src/settings/BUILDING.md` for Settings).

## Design notes

- Selected and active states use the primary brand blue (`--brand`), not black (product decision D-06).
- One primary button per screen; destructive actions confirm first; empty states use the Lepide Design System empty field.
- Stack: React 18, TypeScript, react-router 6, Vite 5, Highcharts 13 (needs a commercial licence to ship). Fonts: Manrope and Geist Mono.

## Keeping it readable by AI tools

| Command | What |
|---|---|
| `npm run check:ai` | Fails on any broken link, missing screenshot or file, or a reference outside this repository (`--online`: `npm run check:ai:online` also checks every live design-system address) |
| `npm run catalog` | Regenerates [SCREENS.md](SCREENS.md) from the captured screens and the flows in [flows/](flows/README.md) |
| `npm run screens:ad` | Retakes the Active Directory flow screenshots (needs `npm run dev` and Chrome or Edge) |

The design-system copy in `.claude/skills/lepide-design-system/` comes from the design system's `ai/install.mjs --remote`.
Two edits keep it free of dead links: the catalog's per-screen "open live" links (deep links 404 on the live
prototype) and DESIGN.md's "Online" examples line (not deployed yet) are removed. After reinstalling, run
`npm run check:ai`; it names anything that needs the same edit.
