import type { ReactNode } from 'react';
import { Icon } from '../ui';
import type { ParsedFilter } from './filters';
import type { AppliedFilter } from './types';

/* Filter chip bar (D-08, Lepide Design System 03 § 16.1): it replaces the "Filters : <line>" text and carries the same
   field / condition / value text. The full line stays available to assistive tech. */

export function FilterBar({ line, locked, applied, onRemove, onAdd, addDisabled, onClear, dateChip, fieldCount }: {
  /** The architecture's "Filters :" line (announced; empty = none). */
  line: string;
  locked: ParsedFilter[];
  applied: AppliedFilter[];
  onRemove?: (index: number) => void;
  onAdd?: () => void;
  addDisabled?: boolean;
  onClear?: () => void;
  /** The date chip (a DateRangeMenu trigger) or a static chip. */
  dateChip?: ReactNode;
  fieldCount?: number;
}) {
  return (
    <div className="filters filters--bar" aria-label="Report filters">
      {line && <span className="sr-only">Filters : {line}</span>}
      <div className="fbar__chips">
        {locked.map((f, i) => (
          <span key={'l' + i} className="fchip fchip--lock" title="Default filter from the report definition">
            <Icon name="lock" size={12} /><b>{f.field}</b>{f.op && <i>{f.op.toLowerCase()}</i>}{f.value && <span>{f.value}</span>}
          </span>
        ))}
        {applied.map((f, i) => (
          <span key={'a' + i} className="fchip fchip--on">
            <b>{f.field}</b><i>{(f.op ?? 'Contains').toLowerCase()}</i><span>{f.value}</span>
            {onRemove && <button type="button" className="fchip__x" aria-label={`Remove filter on ${f.field}`} onClick={() => onRemove(i)}><Icon name="x" size={12} /></button>}
          </span>
        ))}
        {dateChip}
        {onAdd && (
          <button type="button" className="fchip fchip--add" onClick={onAdd} disabled={addDisabled} aria-label="Add filter (Modify filters)">
            <Icon name="plus" size={12} />Add filter
          </button>
        )}
      </div>
      {applied.length && onClear
        ? <button type="button" className="fbar__clear" onClick={onClear}>Clear {applied.length} filter{applied.length === 1 ? '' : 's'}</button>
        : fieldCount !== undefined ? <span className="fbar__hint">{fieldCount} filterable field{fieldCount === 1 ? '' : 's'}</span> : null}
    </div>
  );
}
