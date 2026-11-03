import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Calendar, Menu } from '../ui';

/* DLG-RLIB-06 · Date range presets popover (ENT-RLIB-DatePreset). "Custom Range" reveals a calendar
   (GAP-RLIB-07 intended); Apply rewrites the range text, Cancel / outside / Escape keep it. */

export const DATE_PRESETS = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom Range'] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];
export type DateState = { preset: DatePreset; text: string };

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Jun 01, 2024" (US short month, two-digit day). */
export const fmtDay = (d: Date) => `${MON[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
export const fmtSpan = (a: Date, b: Date) => `${fmtDay(a)} - ${fmtDay(b)}`;

/** `presetRange(preset, current)`: the preset's span from today, or `current` for Custom Range. */
export function presetRange(preset: DatePreset, current: string, now = new Date()) {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const add = (n: number) => new Date(t.getFullYear(), t.getMonth(), t.getDate() + n);
  switch (preset) {
    case 'Today': return fmtSpan(t, t);
    case 'Yesterday': return fmtSpan(add(-1), add(-1));
    case 'Last 7 Days': return fmtSpan(add(-6), t);
    case 'Last 30 Days': return fmtSpan(add(-29), t);
    case 'This Month': return fmtSpan(new Date(t.getFullYear(), t.getMonth(), 1), t);
    case 'Last Month': return fmtSpan(new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0));
    default: return current;
  }
}

/** Best-effort parse of "Mon D, YYYY - Mon D, YYYY" for the calendar's starting view. */
function parseSpan(text: string): { from: Date | null; to: Date | null } {
  const [a, b] = text.split(/\s+-\s+/);
  const d = (s?: string) => { if (!s) return null; const x = new Date(s.replace(/,/g, '')); return Number.isNaN(x.getTime()) ? null : x; };
  return { from: d(a), to: d(b) ?? d(a) };
}

export function DateRangeMenu({ value, onApply, trigger, align = 'right' }: {
  value: DateState; onApply: (v: DateState) => void; align?: 'left' | 'right';
  trigger: (p: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode;
}) {
  const [choice, setChoice] = useState<DatePreset>(value.preset);
  const [span, setSpan] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [picked, setPicked] = useState(false);
  return (
    <Menu align={align} label="Date range" width={320}
      trigger={(p) => trigger({ ...p, onClick: () => { setChoice(value.preset); setSpan(parseSpan(value.text)); setPicked(false); p.onClick(); } })}>
      {(close) => (
        <div className="dp" style={{ padding: 0 }} role="dialog" aria-label="Date range">
          <div role="listbox" aria-label="Date range presets">
            {DATE_PRESETS.map((p) => (
              <button key={p} type="button" role="option" className="pop__item" aria-selected={choice === p} onClick={() => setChoice(p)}>{p}</button>
            ))}
          </div>
          {choice === 'Custom Range' && <Calendar from={span.from} to={span.to} onPick={(f, t) => { setSpan({ from: f, to: t ?? f }); setPicked(true); }} />}
          <div className="dp__foot">
            <Button size="sm" onClick={close}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={() => {
              const text = choice === 'Custom Range'
                ? (picked && span.from && span.to ? fmtSpan(span.from, span.to) : value.text)
                : presetRange(choice, value.text);
              onApply({ preset: choice, text }); close();
            }}>Apply</Button>
          </div>
        </div>
      )}
    </Menu>
  );
}
