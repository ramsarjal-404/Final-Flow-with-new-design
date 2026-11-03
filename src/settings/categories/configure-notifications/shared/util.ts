/* Shared helpers for the MOD-SAD categories built in this folder set
   (Configure Notifications, License Management, SQL Authentication, User Service Settings). */

/** Email pattern used by Detect and the notification panel. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OCTET = '(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])';
/** Dotted IPv4 address, e.g. 192.168.30.150. */
export const IPV4_RE = new RegExp(`^${OCTET}([.]${OCTET}){3}$`);

const LABEL = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?';
const HOST_RE = new RegExp(`^(?=.{1,253}$)${LABEL}(?:[.]${LABEL})*$`);
/** A host name (at least one letter, so malformed IPs such as 999.1.1.1 do not pass as hosts). */
export const isHostName = (v: string) => HOST_RE.test(v) && /[A-Za-z]/.test(v);
export const isIpOrHost = (v: string) => IPV4_RE.test(v) || isHostName(v);

/** `domain\user` (both parts non-blank, no spaces around the backslash). */
export const DOMAIN_USER_RE = /^[^\\\s]+\\[^\\\s][^\\]*$/;

/**
 * NumberField onChange guard: accepts '' or a non-negative integer of at most `maxDigits` digits
 * (the architecture's "digits only, max N characters").
 */
export const digitsGuard = (maxDigits: number, set: (v: number | '') => void) => (v: number | '') => {
  if (v === '') { set(''); return; }
  if (Number.isInteger(v) && v >= 0 && String(v).length <= maxDigits) set(v);
};

/** Split "Key: value · Key: value" account details into label/value pairs. */
export const detailPairs = (details: string): [string, string][] =>
  details.split(' · ').map((part) => {
    const i = part.indexOf(': ');
    return i < 0 ? [part, ''] : [part.slice(0, i), part.slice(i + 2)];
  });

/** Turn our own SVG markup into a data URL (rendered as an image or a mask, never injected as HTML). */
export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
