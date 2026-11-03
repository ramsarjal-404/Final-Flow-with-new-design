import { useState } from 'react';
import { Button, Calendar, Checkbox, Dropdown, Field, Modal, RadioGroup, useToast } from '../../../ui';
import { SUB, newId } from '../../../stores/subscription';
import type { ScheduleType, SubSchedule } from '../../../stores/subscription';

/* DLG-SAD-27 "{Type} Schedule" picker (INT-SAD-325 … 330): start date, start time (H/M/S),
   weekdays (Weekly) or dates (Monthly), report duration. Overlay above the wizard; backdrop,
   Escape or Cancel close it. */

const WEEKDAYS_SUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DURATIONS = SUB.DURATIONS as Record<ScheduleType, string[]>;
const p2 = (n: number) => String(n).padStart(2, '0');
const range = (n: number) => Array.from({ length: n }, (_, i) => p2(i));
export const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${s}`;
};

export default function SchedulePicker({ type, onClose, onAdd }: { type: ScheduleType; onClose: () => void; onAdd: (s: SubSchedule) => void }) {
  const toast = useToast();
  const title = `${type} Schedule`;
  const [date, setDate] = useState<Date | null>(null);
  const [h, setH] = useState('');
  const [m, setM] = useState('');
  const [s, setS] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [dates, setDates] = useState<number[]>([]);
  const [duration, setDuration] = useState(DURATIONS[type][0]);

  const done = () => {
    const err = (message: string) => toast({ variant: 'error', title, message });
    if (!date) return err('Please select the start date.');
    if (!h && !m && !s) return err('Please select the start time.');
    if (type === 'Weekly' && !days.length) return err('Please select at least one weekday.');
    if (type === 'Monthly' && !dates.length) return err('Please select at least one date.');
    const time = `${h || '00'}:${m || '00'}:${s || '00'}`;
    const selection = type === 'Daily' ? 'Daily'
      : type === 'Weekly' ? WEEKDAYS_SUN.filter((d) => days.includes(d)).join(', ')
      : [...dates].sort((a, b) => a - b).map(ordinal).join(', ');
    onAdd({ id: newId('sch'), type, selection, time, duration, startOn: `${p2(date.getDate())}/${p2(date.getMonth() + 1)}/${date.getFullYear()}` });
    toast({ variant: 'success', title: `${type} schedule added`, message: type === 'Daily' ? `Runs every day at ${time}.` : `Runs on ${selection} at ${time}.` });
  };

  const timeSel = (label: string, value: string, set: (v: string) => void, n: number, ph: string) => (
    <Dropdown size="sm" ariaLabel={label} placeholder={ph} value={value} onChange={set} options={range(n).map(String)} search={false} />
  );

  return (
    <Modal open onClose={onClose} title={title} icon="calendar" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <Field label="Start On">
        <div className="subscription-cal">
          <Calendar from={date} to={date} onPick={(f) => setDate(f)} />
        </div>
      </Field>
      <Field label="Start At">
        <div className="subscription-time">
          {timeSel('Hour', h, setH, 24, 'HH')}<span aria-hidden="true">:</span>
          {timeSel('Minute', m, setM, 60, 'MM')}<span aria-hidden="true">:</span>
          {timeSel('Second', s, setS, 60, 'SS')}
        </div>
      </Field>
      {type === 'Weekly' && (
        <Field label="Weekdays">
          <div className="subscription-checks" role="group" aria-label="Weekdays">
            {WEEKDAYS_SUN.map((d) => (
              <Checkbox key={d} label={d} checked={days.includes(d)} onChange={(v) => setDays((xs) => (v ? [...xs, d] : xs.filter((x) => x !== d)))} />
            ))}
          </div>
        </Field>
      )}
      {type === 'Monthly' && (
        <Field label="Dates">
          <div className="subscription-dates" role="group" aria-label="Dates">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
              const on = dates.includes(d);
              return <button key={d} type="button" aria-pressed={on} onClick={() => setDates((xs) => (on ? xs.filter((x) => x !== d) : [...xs, d]))}>{d}</button>;
            })}
          </div>
        </Field>
      )}
      <Field label="Report Duration">
        <RadioGroup row ariaLabel="Report Duration" value={duration} onChange={setDuration} options={DURATIONS[type]} />
      </Field>
    </Modal>
  );
}
