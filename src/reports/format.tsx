import type { ReactNode } from 'react';
import { Avatar, ToneTag, type StatusTone } from '../ui';

/* Automatic cell formatting in result tables, by column header (Lepide Design System 03 § 7). */

export const isNA = (v: unknown) => v === null || v === undefined || /^(\s*|n\/a|na|-|—|null|never)$/i.test(String(v).trim());

function opTone(v: string): StatusTone {
  if (/(delete|remove|fail|disable|lock|denied|expired)/i.test(v)) return 'bad';
  if (/(add|create|enable|success|grant|restore)/i.test(v)) return 'good';
  if (/(modif|change|rename|move|reset|update|cop|check|read)/i.test(v)) return 'info';
  return 'none';
}
function riskTone(v: string): StatusTone {
  if (/(high|critical)/i.test(v)) return 'bad';
  if (/(medium|moderate)/i.test(v)) return 'warn';
  if (/low/i.test(v)) return 'good';
  return 'none';
}

const OP = /^(operation|.*status|state)$/i;
const WHO = /^(who|who modified|modified by|changed by|user name)$/i;
const WHEN = /^(when|date|time|last logon time|when created)$/i;
const RISK = /^(risk|risk level|criticality|severity)$/i;
const MONO = /(path|url|email|server|tenant)/i;
const WIDE = /(path|what|url|object name|email|site|description|query|message)/i;

/** td class for a column (mono for path/url/email/server/tenant, tabular for times). */
export const cellClass = (col: string, first = false) =>
  [first ? 'lf-key' : '', !first && MONO.test(col) ? 'lf-mono' : '', WHEN.test(col) ? 'lf-num' : ''].filter(Boolean).join(' ') || undefined;

/** Default min-width by header (03 § 9.1). */
export function colWidth(col: string) {
  if (OP.test(col)) return /status|state/i.test(col) && !/operation/i.test(col) ? 130 : 170;
  if (WHO.test(col)) return 190;
  if (WHEN.test(col)) return 200;
  if (WIDE.test(col)) return 260;
  return col.length > 14 ? 170 : 130;
}

/** Wide record-drawer tile for long values. */
export const isWideCol = (col: string) => WIDE.test(col);

function splitWhen(v: string) {
  const m = v.match(/^(\S+)\s+(.+)$/);
  return m ? <span className="fx-when">{m[1]} <i>{m[2]}</i></span> : <span className="fx-when">{v}</span>;
}

/** Formatted cell content. `withDomain` keeps a `DOMAIN\` prefix (dimmed) — used in the record drawer. */
export function formatCell(col: string, value: string, withDomain = false): ReactNode {
  if (isNA(value)) return <span className="lf-na">{value && value.trim() ? value : '—'}</span>;
  if (RISK.test(col)) return <ToneTag tone={riskTone(value)}>{value}</ToneTag>;
  if (OP.test(col)) return <ToneTag tone={opTone(value)}>{value}</ToneTag>;
  if (WHO.test(col)) {
    const i = value.lastIndexOf('\\');
    const dom = i > 0 ? value.slice(0, i + 1) : '';
    const name = i > 0 ? value.slice(i + 1) : value;
    return <span className="fx-who"><Avatar name={name.split('@')[0]} /><span className="fx-name">{withDomain && dom && <i>{dom}</i>}{name}</span></span>;
  }
  if (WHEN.test(col)) return splitWhen(value);
  return value;
}
