# Lepide brand files

The official Lepide logo files. Everything in the Lepide Design System takes the logo from here: the React kit's
`BrandMark` and `MARK_URL`, the MCP server (`search_icons("lepide")`), the static golden pages and the website. Don't
redraw the logo, rebuild it from text or keep other copies — link or copy these files.

| File | What it is | Size | Use |
|---|---|---|---|
| `lepide-mark.svg` | The Lepide mark (six slanted bars), vector | 830 × 830 viewBox, 3 KB | Sidebar brand tile, favicons, small spaces; scales to any size |
| `lepide-logo.svg` | The full logo: mark + "Lepide" wordmark, as supplied (an SVG wrapping a PNG) | 4096 × 1690, 385 KB | Sign-in, title slides, documents |
| `lepide-logo.png` | The same full logo as a plain PNG, transparent background | 4096 × 1690, 288 KB | Email, Office and anywhere an SVG can't be used |

Colour: one sky blue, `#2498D4`, on a transparent background.

## Rules
Sensible defaults until Lepide's own brand guidelines say otherwise.
- Keep the proportions and the one colour. Don't stretch, rotate, recolour, outline or add shadows or other effects.
- On a dark or busy background, place the mark in its white tile (as the console sidebar does) rather than changing
  its colour.
- Leave clear space around the logo of at least a quarter of its height.
- The full logo's wordmark is a picture: it isn't a font in the design system, so never retype "Lepide" to imitate it.

## Changing the logo
Replace the file here with the new official one (same name), then run `npm run build`: the kit copies
`lepide-mark.svg` into `packages/react/src/assets/`, and the website and MCP server pick it up. Update the Figma
library's mark by hand.
