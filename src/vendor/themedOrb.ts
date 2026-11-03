import { mountOrb } from './orb.js';

/** The Lepide AI orb's colours are tokens (--brand, --ai-glow, --brand-700), read from the page so they follow the theme. */
const orbColors = () => {
  const css = getComputedStyle(document.documentElement);
  return ['--brand', '--ai-glow', '--brand-700'].map((name) => css.getPropertyValue(name).trim());
};

/** mountOrb with token colours, recoloured in place whenever <html data-theme> changes. Throws like mountOrb. */
export function mountThemedOrb(host: HTMLElement, options: Record<string, unknown>) {
  // backgroundColor white + clear is the shader's transparency key, not a UI colour: the card shows through.
  const orb = mountOrb(host, { ...options, colors: orbColors(), backgroundColor: '#ffffff', clear: true });
  if (!orb) throw new Error('WebGL2 unavailable');
  new MutationObserver(() => orb.setColors(orbColors()))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return orb;
}
