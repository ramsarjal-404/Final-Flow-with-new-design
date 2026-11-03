import { PRODUCT_GLYPHS, type Product } from './store';

/** Product glyph: our own SVG drawn as a CSS mask (safe — no markup injection) in the brand colour. */
export function ProductGlyph({ product, size = 22, tile }: { product: Product; size?: number; tile?: boolean }) {
  const url = `url("${PRODUCT_GLYPHS[product]}")`;
  const glyph = (
    <span className="license-management-glyph" aria-hidden="true"
      style={{ width: size, height: size, WebkitMaskImage: url, maskImage: url }} />
  );
  return tile ? <span className="license-management-tile" role="img" aria-label={product} data-tip={product}>{glyph}</span> : glyph;
}
