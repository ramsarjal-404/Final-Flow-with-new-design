import type { IndexedDocument, SearchQuery } from './store';

/* Value conventions (data-model.md, top). */
export const HOST = /^(\d{1,3}(\.\d{1,3}){3}|[A-Za-z0-9][A-Za-z0-9.-]*)$/;
export const UNC = /^\\\\[^\\\s]+\\[^\\].*$/;
export const DOMAIN_USER = /^\\{0,2}[^\\\s]+\\[^\\\s]+$/;
export const NAME = /^[\w .()-]{1,60}$/;
export const WIZARD_DATE = /^\d{4}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01]) ([01]\d|2[0-3]):[0-5]\d$/;
export const EXT = /^[A-Za-z0-9]{1,8}$/;

/** Hint shared by the case wizard and the agent dialogs (GAP-IDN-08 intended: one hint). */
export const DOMAIN_USER_HINT = 'Use "\\\\Domain name\\User name" format';

/* ---------- matching (data-model.md › ENT-IDN-SearchQuery) ---------- */
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
type Rules = Pick<SearchQuery, 'keys' | 'operator' | 'exact'>;

/** Alternation of every key; whole word + case-sensitive when exact. Null with no keys. */
export function matcher(q: Pick<SearchQuery, 'keys' | 'exact'>): RegExp | null {
  if (!q.keys.length) return null;
  const alt = q.keys.map(esc).join('|');
  return q.exact ? new RegExp(`(?<![\\w])(${alt})(?![\\w])`, 'g') : new RegExp(`(${alt})`, 'gi');
}
const one = (k: string, exact: boolean) =>
  exact ? new RegExp(`(?<![\\w])${esc(k)}(?![\\w])`) : new RegExp(esc(k), 'i');

/** AND = every key matches; OR / none = any key matches; text = path + newline + content. */
export function searchDocs(docs: IndexedDocument[], q: Rules): IndexedDocument[] {
  if (!q.keys.length) return [];
  return docs.filter((d) => {
    const text = `${d.path}\n${d.content}`;
    const hits = q.keys.map((k) => one(k, q.exact).test(text));
    return q.operator === 'AND' ? hits.every(Boolean) : hits.some(Boolean);
  });
}

/** First paragraph with a match (or the first one), cut to 320 characters around the first match. */
export function snippet(content: string, q: Rules): string {
  const paras = content.split('\n').filter((p) => p.trim());
  const re = matcher(q);
  const test = (p: string) => { if (!re) return -1; re.lastIndex = 0; const m = re.exec(p); return m ? m.index : -1; };
  const hit = paras.find((p) => test(p) >= 0) ?? paras[0] ?? '';
  if (hit.length <= 320) return hit;
  const at = Math.max(0, test(hit));
  const start = Math.max(0, at - 120);
  return (start > 0 ? '…' : '') + hit.slice(start, start + 320) + (start + 320 < hit.length ? '…' : '');
}

/** Splits text into plain and matched parts (for highlighting). */
export function splitMatches(text: string, q: Pick<SearchQuery, 'keys' | 'exact'>): { t: string; hit: boolean }[] {
  const re = matcher(q);
  if (!re) return [{ t: text, hit: false }];
  const out: { t: string; hit: boolean }[] = [];
  let last = 0; let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(text))) {
    if (m[0] === '') { re.lastIndex++; continue; }
    if (m.index > last) out.push({ t: text.slice(last, m.index), hit: false });
    out.push({ t: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last), hit: false });
  return out;
}

/** "Searched String": keys quoted, joined with the operator (OR when none). */
export const searchedString = (q: Rules) => q.keys.map((k) => `"${k}"`).join(` ${q.operator || 'OR'} `);
