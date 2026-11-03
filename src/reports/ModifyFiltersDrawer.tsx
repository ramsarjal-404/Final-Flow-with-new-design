import { useEffect, useRef, useState } from 'react';
import { Button, Drawer, Dropdown, Icon, Menu, SearchField } from '../ui';
import { SidePanel } from './SidePanel';
import { FILTER_OPS, type AppliedFilter, type FilterOp, type FixedFilterCard } from './types';
import type { ParsedFilter } from './filters';

/* DLG-RLIB-07 · Modify Filters drawer (Lepide Design System 03 § 12.2). Edits a working copy of the applied filters;
   Apply keeps the cards with a non-blank value; Cancel / Close discard. */

/** Filter card (Lepide Design System 03 § 16.2). The value input is always visible; the operator pill is GAP-RLIB-13. */
export function FilterCard({ filter, onChange, onRemove, removable = true, autoFocus }: {
  filter: AppliedFilter; onChange: (f: AppliedFilter) => void; onRemove?: () => void; removable?: boolean; autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) requestAnimationFrame(() => ref.current?.focus()); }, [autoFocus]);
  const op = filter.op ?? 'Contains';
  return (
    <div className="frow">
      <span className="frow__ic"><Icon name="filter" size={14} /></span>
      <div className="frow__main">
        <div className="frow__head">
          <b>{filter.field}</b>
          <Menu label={`${filter.field} condition`} items={FILTER_OPS.map((o) => ({ label: o, selected: o === op, onSelect: () => onChange({ ...filter, op: o as FilterOp }) }))}
            trigger={(p) => <button type="button" className="frow__cond" aria-label={`Condition for ${filter.field}: ${op}`} {...p}>{op}</button>} />
          {removable && onRemove && (
            <button type="button" className="frow__x" aria-label={`Remove ${filter.field} filter`} onClick={onRemove}><Icon name="x" /></button>
          )}
        </div>
        <input ref={ref} value={filter.value} placeholder={`${op}…`} aria-label={`${filter.field} value`} maxLength={200}
          onChange={(e) => onChange({ ...filter, value: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }} />
      </div>
    </div>
  );
}

/** Field chips with optional search (> 8 fields) — the "Select Filters" control. */
export function FieldPicker({ fields, onPick, emptyText = 'All filters added' }: { fields: string[]; onPick: (f: string) => void; emptyText?: string }) {
  const [q, setQ] = useState('');
  const shown = fields.filter((f) => f.toLowerCase().includes(q.trim().toLowerCase()));
  if (!fields.length) return <p className="mf__hint">{emptyText}</p>;
  return (
    <>
      {fields.length > 8 && <SearchField value={q} onChange={setQ} placeholder="Search" ariaLabel="Search options" />}
      <div className="fieldgrid">
        {shown.length ? shown.map((f) => (
          <button key={f} type="button" className="fieldchip" onClick={() => { onPick(f); setQ(''); }}><Icon name="plus" size={12} /><span>{f}</span></button>
        )) : <span className="mf__hint">No matches</span>}
      </div>
    </>
  );
}

export function ModifyFiltersDrawer({ open, onClose, subtitle, fields, applied, onApply, locked = [], dateText, fixedCards, onFixedChange, modal = false }: {
  open: boolean; onClose: () => void; subtitle?: string;
  /** false (default): non-modal right-hand region (the page stays usable); true: modal drawer with scrim. */
  modal?: boolean;
  /** Selectable fields (view.filterFields, or every column when that list is empty). */
  fields: string[];
  applied: AppliedFilter[];
  onApply: (filters: AppliedFilter[]) => void;
  /** Default-filter parts shown locked. */
  locked?: ParsedFilter[];
  /** Current date range text, shown as a locked "When" row. */
  dateText?: string | null;
  /** Fixed select-valued cards (DLG-AUD-04). */
  fixedCards?: FixedFilterCard[];
  onFixedChange?: (cards: FixedFilterCard[]) => void;
}) {
  const [cards, setCards] = useState<AppliedFilter[]>([]);
  const [fixed, setFixed] = useState<FixedFilterCard[]>([]);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  useEffect(() => { if (open) { setCards(applied.map((f) => ({ ...f }))); setFixed((fixedCards ?? []).map((c) => ({ ...c }))); setFocusIdx(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const left = fields.filter((f) => !cards.some((c) => c.field === f));
  const hasLocked = locked.length > 0 || !!dateText || fixed.length > 0;
  const footer = (
      <div className="row row--between" style={{ width: '100%' }}>
        <button type="button" className="fbar__clear" onClick={() => setCards([])} disabled={!cards.length}>Reset</button>
        <div className="mf__btns">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onFixedChange?.(fixed); onApply(cards.filter((c) => c.value.trim()).map((c) => ({ ...c, value: c.value.trim() }))); }}>Apply</Button>
        </div>
      </div>
  );
  const body = (
      <div className="rlib-mf">
        <section className="mf__sec">
          <h4 className="mf__h">Report filter <span className="mf__tag">Fixed</span></h4>
          <div className="mf__locked">
            {locked.map((p, i) => (
              <div key={i} className="mf__lock"><Icon name="lock" size={13} /><div><b>{p.field}</b>{p.op && <span>{p.op} {p.value}</span>}</div></div>
            ))}
            {dateText && <div className="mf__lock"><Icon name="calendar" size={13} /><div><b>When</b><span>{dateText}</span></div><em>Change from the header</em></div>}
            {!hasLocked && <p className="mf__hint">This report has no fixed filter.</p>}
          </div>
          {fixed.map((c, i) => (
            <div key={c.field} className="frow frow--fixed">
              <span className="frow__ic"><Icon name="lock" size={14} /></span>
              <div className="frow__main">
                <div className="frow__head"><b>{c.field}</b><span className="frow__cond">Equals</span></div>
                <Dropdown size="sm" className="rlib-fixed-dd" value={c.value} ariaLabel={c.field} options={c.options}
                  onChange={(v) => setFixed((xs) => xs.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
              </div>
            </div>
          ))}
        </section>
        <section className="mf__sec">
          <h4 className="mf__h">Select Filters</h4>
          <FieldPicker fields={left} onPick={(f) => { setCards((cs) => [...cs, { field: f, value: '', op: 'Contains' }]); setFocusIdx(cards.length); }} />
        </section>
        <section className="mf__sec">
          <h4 className="mf__h">Your filters <span className="mf__count">{cards.length}</span></h4>
          {cards.length ? (
            <div className="fcards">
              {cards.map((c, i) => (
                <FilterCard key={c.field} filter={c} autoFocus={focusIdx === i}
                  onChange={(n) => setCards((cs) => cs.map((x, j) => (j === i ? n : x)))}
                  onRemove={() => setCards((cs) => cs.filter((_, j) => j !== i))} />
              ))}
            </div>
          ) : <p className="fcards__empty">No filters yet. Pick a field above to filter the report.</p>}
        </section>
      </div>
  );
  return modal
    ? <Drawer open={open} onClose={onClose} title="Modify filters" subtitle={subtitle} footer={footer}>{body}</Drawer>
    : <SidePanel open={open} onClose={onClose} label="Modify filters" footer={footer}
        head={<div><h3>Modify filters</h3>{subtitle && <small>{subtitle}</small>}</div>}>{body}</SidePanel>;
}
