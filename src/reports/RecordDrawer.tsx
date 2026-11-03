import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { IconButton } from '../ui';
import { SidePanel } from './SidePanel';
import { formatCell, isWideCol } from './format';

/* Record drawer (D-10, Lepide Design System 03 § 12.3): every field of one row, previous / next, ← → keys. Non-modal so
   clicking another row moves the selection. */

export function RecordDrawer({ open, index, total, columns, cells, subtitle, onStep, onClose, renderValue }: {
  open: boolean; index: number; total: number; columns: string[]; cells: string[]; subtitle: string;
  onStep: (index: number) => void; onClose: () => void;
  renderValue?: (column: string, value: string, i: number) => ReactNode | undefined;
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input,textarea,select,[contenteditable]')) return;
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && index > 0) { e.preventDefault(); onStep(index - 1); }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && index < total - 1) { e.preventDefault(); onStep(index + 1); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open, index, total, onStep]);
  return (
    <SidePanel open={open} onClose={onClose} width="rec" label={`Record ${index + 1} of ${total}`}
      head={<div className="rd__head"><span className="rd__pos">Record {index + 1} of {total}</span><h3>{cells[0] || subtitle}</h3><small>{subtitle}</small></div>}
      footer={<div className="row row--between" style={{ width: '100%' }}>
        <div className="rd__nav">
          <IconButton icon="chevron-left" label="Previous record" disabled={index <= 0} onClick={() => onStep(index - 1)} />
          <IconButton icon="arrow" label="Next record" disabled={index >= total - 1} onClick={() => onStep(index + 1)} />
        </div>
        <span className="rd__hint">Use the arrows or ← → to step through records</span>
      </div>}>
      <dl className="rd__list">
        {columns.map((c, i) => (
          <div key={c + i} className={'rd__row' + (isWideCol(c) ? ' rd__row--wide' : '')}>
            <dt>{c}</dt><dd>{renderValue?.(c, cells[i], i) ?? formatCell(c, cells[i] ?? '', true)}</dd>
          </div>
        ))}
      </dl>
    </SidePanel>
  );
}
