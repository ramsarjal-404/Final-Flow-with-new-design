import { useState } from 'react';
import { Button, Calendar, Dropdown, Field, Modal, useToast } from '../../../ui';
import { WEEKDAY_NAMES, fmtDay } from './store';
import type { ScanSchedule } from './store';

/* DLG-SDS-38 · Daily / Weekly / Monthly Schedule. Escape or the dimmed backdrop cancels. */
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const p2 = (n: number) => String(n).padStart(2, '0');
const parseDay = (s?: string) => {
  const m = s?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
};

export function ScheduleDialog({ type, initial, onClose, onDone }: {
  type: ScanSchedule['type']; initial: ScanSchedule | null; onClose: () => void; onDone: (s: ScanSchedule) => void;
}) {
  const toast = useToast();
  const same = initial?.type === type ? initial : null;
  const [day, setDay] = useState<Date | null>(parseDay(same?.startOn));
  const [h, m, s] = (same?.time ?? '::').split(':');
  const [time, setTime] = useState({ h: h ?? '', m: m ?? '', s: s ?? '' });
  const [weekdays, setWeekdays] = useState<string[]>(same?.weekdays ?? []);
  const [dates, setDates] = useState<number[]>(same?.dates ?? []);
  const title = `${type} Schedule`;
  const year = new Date().getFullYear();

  const done = () => {
    const fail = (message: string) => toast({ variant: 'error', title, message });
    if (!day) return fail('Please select the start date.');
    if (time.h === '' || time.m === '' || time.s === '') return fail('Please select the start time.');
    if (type === 'Weekly' && !weekdays.length) return fail('Please select at least one weekday.');
    if (type === 'Monthly' && !dates.length) return fail('Please select at least one date.');
    onDone({
      type, time: `${p2(Number(time.h))}:${p2(Number(time.m))}:${p2(Number(time.s))}`, startOn: fmtDay(day),
      weekdays: type === 'Weekly' ? WEEKDAY_NAMES.filter((w) => weekdays.includes(w)) : [],
      dates: type === 'Monthly' ? [...dates].sort((a, b) => a - b) : [],
    });
    onClose();
  };
  const sel = (label: string, key: 'h' | 'm' | 's', n: number) => (
    <Dropdown size="sm" ariaLabel={label} placeholder={label} value={time[key]} onChange={(v) => setTime({ ...time, [key]: v })}
      options={range(n).map((i) => ({ value: String(i), label: p2(i) }))} search={false} />
  );
  return (
    <Modal open onClose={onClose} title={title} icon="calendar" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <Field label="Start On">
        <div className="trust-cal">
          <Calendar from={day} to={day} onPick={(d) => { if (d.getFullYear() >= year && d.getFullYear() <= year + 3) setDay(d); }} />
        </div>
      </Field>
      <Field label="Start At">
        <div className="trust-time">{sel('Hour', 'h', 24)}{sel('Minute', 'm', 60)}{sel('Second', 's', 60)}</div>
      </Field>
      {type === 'Weekly' && (
        <Field label="Select Days">
          <div className="trust-chipset">
            {WEEKDAY_NAMES.map((w) => (
              <button key={w} type="button" className="trust-pickchip" aria-pressed={weekdays.includes(w)}
                onClick={() => setWeekdays(weekdays.includes(w) ? weekdays.filter((x) => x !== w) : [...weekdays, w])}>{w}</button>
            ))}
          </div>
        </Field>
      )}
      {type === 'Monthly' && (
        <Field label="Select date">
          <div className="trust-chipset trust-chipset--dates">
            {range(31).map((i) => i + 1).map((d) => (
              <button key={d} type="button" className="trust-pickchip" aria-pressed={dates.includes(d)}
                onClick={() => setDates(dates.includes(d) ? dates.filter((x) => x !== d) : [...dates, d])}>{d}</button>
            ))}
          </div>
        </Field>
      )}
    </Modal>
  );
}
