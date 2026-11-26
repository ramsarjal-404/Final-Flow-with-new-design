# Design

This console is built with the **Lepide Design System**. Nothing outside this repository is needed to read it:

- **Spec (in this repo):** [`.claude/skills/lepide-design-system/DESIGN.md`](.claude/skills/lepide-design-system/DESIGN.md), with one page per
  component in [`.claude/skills/lepide-design-system/docs/components/`](.claude/skills/lepide-design-system/docs/components/) and every token in
  [`tokens.json`](.claude/skills/lepide-design-system/tokens/build/json/tokens.json).
- **Live:** https://lepide-new-ds.vercel.app/DESIGN.md and the MCP server https://lepide-new-ds.vercel.app/mcp
  (already registered in `.mcp.json`, `.vscode/mcp.json`, `.cursor/mcp.json` and `.codex/config.toml`).
- **Kit:** `@lepide/ds-css` and `@lepide/ds-react`, installed from https://lepide-new-ds.vercel.app/ds/lepide-ds-css.tgz and https://lepide-new-ds.vercel.app/ds/lepide-ds-react.tgz (see `package.json`).

Flows documented for AI tools are in [`flows/`](flows/README.md).
