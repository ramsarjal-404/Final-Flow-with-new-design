import { useRef, useState } from 'react';
import { Button, TextField, rangeFor, useDismiss } from '../../../ui';

/* DLG-SAD-07 · Date range popover ("Select date"). Apply sets the page's *pending* range only. */

export const LOG_PRESETS = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom Range'] as const;
export type LogRange = { preset: string; from: Date; to: Date };

const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Preset ranges are computed when applied; ends are inclusive to 23:59:59.999. */
export function presetRange(preset: string): LogRange {
  const r = rangeFor(preset);
  return { preset, from: startOfDay(r.from), to: endOfDay(r.to) };
}
const p2 = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const parseDay = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const longDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export function DateRangePopover({ value, onApply }: { value: LogRange; onApply: (r: LogRange) => void }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState(value.preset);
  const [from, setFrom] = useState(isoDay(value.from));
  const [to, setTo] = useState(isoDay(value.to));
  const wrap = useRef<HTMLSpanElement>(null);
  const close = () => setOpen(false);
  useDismiss(open, close, [wrap]);

  const toggle = () => {
    if (!open) { setPreset(value.preset); setFrom(isoDay(value.from)); setTo(isoDay(value.to)); } // reopening restores the pending choice
    setOpen((o) => !o);
  };
  const custom = preset === 'Custom Range';
  const invalid = custom && (!from || !to || from > to);

  const apply = () => {
    if (invalid) return;
    onApply(custom ? { preset, from: parseDay(from), to: endOfDay(parseDay(to)) } : presetRange(preset));
    close();
  };

  return (
    <span className="rel" ref={wrap} style={{ display: 'inline-flex' }}>
      <Button variant="ghost" icon="calendar" iconEnd="chevron" className="logs-dr__chip" aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        <span>{longDate(value.from)}</span><span className="logs-dr__sep" aria-hidden="true">–</span><span>{longDate(value.to)}</span>
      </Button>
      {open && (
        <div className="pop logs-dr__pop" role="dialog" aria-label="Date range">
          <div role="listbox" aria-label="Date range presets">
            {LOG_PRESETS.map((p) => (
              <button key={p} type="button" role="option" className="pop__item" aria-selected={preset === p} onClick={() => setPreset(p)}>{p}</button>
            ))}
          </div>
          {custom && (
            <div className="logs-dr__custom page-form">
              <TextField type="date" label="From" value={from} max={to || undefined} onChange={setFrom} />
              <TextField type="date" label="To" value={to} min={from || undefined} onChange={setTo} />
              {invalid && <small className="fld__err logs-dr__err" role="alert">Pick a start date on or before the end date.</small>}
            </div>
          )}
          <div className="dp__foot">
            <Button size="sm" onClick={close}>Cancel</Button>
            <Button size="sm" variant="primary" disabled={invalid} onClick={apply}>Apply</Button>
          </div>
        </div>
      )}
    </span>
  );
}
