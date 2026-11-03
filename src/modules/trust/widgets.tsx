import type { ReactNode } from 'react';
import { Avatar, Icon, type IconName } from '../../ui';
import type { RCol } from '../../reports';
import { RIGHTS, type EffectiveRow, type ObjectKind, type Perms } from './data';
import type { DCol } from './DeepTable';

/* Trust cell building blocks (screens.md "Shared conventions"): flag columns, permission columns,
   object-name cell, principal cell and the tick legend. */

/* ---------------- flags ---------------- */
export type FlagKey = 'everyone' | 'broken' | 'notAccessed';
export const FLAG_TEXT: Record<FlagKey, string> = {
  everyone: "'Everyone' is added directly in ACL",
  broken: 'Object is not inheriting permission from parent',
  notAccessed: 'Object not accessed in last 30 days',
};
const FLAG_ICON: Record<FlagKey, IconName> = { everyone: 'globe', broken: 'link', notAccessed: 'clock' };

/** Header and cell of a flag column: the same icon with the flag text as tooltip and accessible name. */
export function Flag({ flag, head }: { flag: FlagKey; head?: boolean }) {
  return (
    <span className={'tru-flag' + (head ? ' tru-flag--head' : ' tru-flag--' + flag)} role="img" aria-label={FLAG_TEXT[flag]}
      data-tip={FLAG_TEXT[flag]} tabIndex={head ? 0 : undefined}>
      <Icon name={FLAG_ICON[flag]} size={head ? 14 : 15} />
    </span>
  );
}

/** A narrow, non-sortable, non-filterable flag column. */
export function flagCol<T extends Partial<Record<FlagKey, boolean>>>(flag: FlagKey): RCol<T> & { headNode: ReactNode; narrow: true } {
  return {
    key: 'flag-' + flag, header: FLAG_TEXT[flag], headNode: <Flag flag={flag} head />, narrow: true, width: 48,
    value: (r) => (r[flag] ? FLAG_TEXT[flag] : ''), render: (r) => (r[flag] ? <Flag flag={flag} /> : null), cls: 'tru-td-flag',
  };
}

/* ---------------- permission ticks ---------------- */
export const CODE_TEXT: Record<string, string> = { g: 'Granted and used', r: 'Granted but not used (excessive)', d: 'Denied' };

/** Short column labels for the 13 rights (full name in the header tooltip and accessible name). */
const RIGHT_ABBR = ['List', 'Write', 'Append', 'Read EA', 'Write EA', 'Traverse', 'Del sub', 'Read attr', 'Write attr', 'Delete', 'Read perm', 'Change perm', 'Owner'];

export function PermHead({ i }: { i: number }) {
  return (
    <span className="tru-perm-h" data-tip={RIGHTS[i]} tabIndex={0}>
      <span aria-hidden="true">{RIGHT_ABBR[i]}</span><span className="sr-only">{RIGHTS[i]}</span>
    </span>
  );
}

export function PermTick({ code, i }: { code: string; i: number }) {
  const meaning = CODE_TEXT[code];
  if (!meaning) return <span className="sr-only">{RIGHTS[i]}: not applicable</span>;
  const text = `${RIGHTS[i]}: ${meaning}`;
  return (
    <span className={'tru-tick tru-tick--' + code} role="img" aria-label={text} data-tip={text}>
      <Icon name={code === 'd' ? 'x' : 'check'} size={13} />
    </span>
  );
}

/** The 13 permission columns over a row's `perms` code string. */
export function permCols<T extends { perms: Perms }>(): (RCol<T> & { headNode: ReactNode; narrow: true })[] {
  return RIGHTS.map((right, i) => ({
    key: 'perm' + i, header: right, headNode: <PermHead i={i} />, narrow: true as const, width: 78,
    value: (r: T) => CODE_TEXT[r.perms[i]] ?? '', render: (r: T) => <PermTick code={r.perms[i] ?? '-'} i={i} />, cls: 'tru-td-perm',
  }));
}

/** "<right>: used; <right>: excessive; …" (`-` omitted) — EPU export (INT-TRU-064). */
export const permsText = (perms: Perms) => RIGHTS.map((r, i) => {
  const c = perms[i];
  return c === 'g' ? `${r}: used` : c === 'r' ? `${r}: excessive` : c === 'd' ? `${r}: denied` : null;
}).filter(Boolean).join('; ');

/* ---------------- object / principal cells ---------------- */
export function ObjectName({ name, kind = 'folder' }: { name: string; kind?: ObjectKind }) {
  return (
    <span className="tru-obj" title={name}>
      <span className={'tru-obj__ic' + (kind === 'folder' ? ' tru-obj__ic--folder' : '')} aria-hidden="true"><Icon name={kind === 'folder' ? 'folder' : 'file'} size={14} /></span>
      <span className="tru-obj__name">{name}</span>
      <span className="sr-only">{kind === 'folder' ? '(folder)' : '(file)'}</span>
    </span>
  );
}

export function Principal({ name, group, avatar }: { name: string; group?: boolean; avatar?: boolean }) {
  return (
    <span className="tru-obj" title={name}>
      {avatar ? <Avatar name={name} size={24} /> : (
        <span className="tru-obj__ic" aria-hidden="true"><Icon name={group ? 'users' : 'user'} size={14} /></span>
      )}
      <span className="tru-obj__name">{name}</span>
      {group && <span className="sr-only">(group)</span>}
    </span>
  );
}

/* ---------------- tick legend ---------------- */
export function TickLegend({ denied }: { denied?: boolean }) {
  const items: [string, string][] = [['g', 'Granted and used'], ['r', 'Granted but not used (excessive)']];
  if (denied) items.push(['d', 'Denied']);
  return (
    <ul className="tru-legend" aria-label="Legend">
      {items.map(([c, t]) => (
        <li key={c}><span className={'tru-tick tru-tick--' + c} aria-hidden="true"><Icon name={c === 'd' ? 'x' : 'check'} size={12} /></span>{t}</li>
      ))}
    </ul>
  );
}

/** Account (Principal) · Effective Permission · 13 permission columns (POBJ tab 2, DLG-TRU-06, EPO). */
export const effectiveCols = <T extends EffectiveRow>(searchable = true): DCol<T>[] => [
  { key: 'account', header: 'Account (Principal)', sortable: searchable, filterable: searchable, minWidth: 220, value: (r) => r.account, render: (r) => <Principal name={r.account} /> },
  { key: 'effective', header: 'Effective Permission', sortable: searchable, filterable: searchable, minWidth: 240, value: (r) => r.effective },
  ...permCols<T>(),
];
