import notify from '../../../data/settings/notify.json';
import iconData from '../../../data/components/settings/notify/LicenseDialogs.json';
import { createStore } from '../../../stores/createStore';
import { svgDataUrl } from '../configure-notifications/shared/util';

/* ENT-SAD-LicenseRow / ENT-SAD-LicenseState.
   GAP-SAD-02 intended: the licence state survives navigation for the session (module-level store);
   search stays page state. */

export type Product = 'Auditor' | 'Trust' | 'Identify' | 'Protect';
export type LicenseRow = {
  id: string; product: Product; platform: string; type: string; acquired: string; total: number; available: number;
  validUntil: string; supportUntil: string; licensed: boolean; expired: boolean;
};
export const LICENSE_ROWS = notify.exports.LICENSE_ROWS as LicenseRow[];
export const LICENSE_PRODUCTS = notify.exports.LICENSE_PRODUCTS as Product[];
export const SALES_EMAIL = notify.exports.LICENSE_SALES_EMAIL as string;

/** Product glyphs (our own SVG strings) as data URLs — drawn through a CSS mask so they take token colours. */
export const PRODUCT_GLYPHS = Object.fromEntries(
  Object.entries(iconData.exports.PRODUCT_ICONS as Record<string, string>).map(([k, svg]) => [k, svgDataUrl(svg)]),
) as Record<Product, string>;

export type LicenseState = 'none' | 'active' | 'expired';
export const licenseStore = createStore<{ state: LicenseState; licenseId: string }>({ state: 'none', licenseId: '' });
