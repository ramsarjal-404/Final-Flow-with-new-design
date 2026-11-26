# Flows

Each folder documents one flow of the console completely, so a person or an AI tool can rebuild, extend or review it
without guessing. Every flow is built with the Lepide Design System (see [AGENTS.md](../AGENTS.md)).

| Flow | Route | Docs |
|---|---|---|
| Add and manage an Active Directory data source | `/settings/add-data-source/active-directory` | [FLOW.md](active-directory/FLOW.md) · [flow.json](active-directory/flow.json) · [screens](active-directory/screens/) |
| AI Shield (Overview, Sessions, People, Protection policy, Admin activity, Server) | `/shield` | [FLOW.md](ai-shield/FLOW.md) · [flow.json](ai-shield/flow.json) · [screens](ai-shield/screens/) |

All other screens are in [SCREENS.md](../SCREENS.md) with their route, code and a screenshot.

## What a flow folder holds

| File | What |
|---|---|
| `FLOW.md` | The flow for people and AI: a diagram, every screen, step, dialog, field, rule and message, the components used (linked to their design-system pages) and the code files |
| `flow.json` | The same as data ([schema](flow.schema.json)): `routes`, `screens`, `wizard.steps[].fields`, `dialogs`, `errors`, `code`, `notBuilt` |
| `screens/*.webp` | A screenshot of each screen, step and dialog (1440 px, light theme) |

## Adding a flow

1. Build it in `src/` with components from `src/ui` (the Lepide Design System) and tokens only.
2. Copy `active-directory/` as a starting point: write `FLOW.md` and `flow.json`, take the screenshots.
3. Add it to the table above, then run `npm run catalog` (adds it to SCREENS.md) and `npm run check:ai`.
