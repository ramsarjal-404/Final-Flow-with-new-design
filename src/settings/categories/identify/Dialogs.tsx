import { useEffect, useState } from 'react';
import {
  Button, Dropdown, Field, Modal, PasswordField, RadioGroup, TextField, useToast,
} from '../../../ui';
import { MONTHS, SQL_DATABASES, SQL_LOCAL, SQL_NETWORK, WEEKDAYS } from './store';
import type { Schedule, SqlValue } from './store';
import { TreeGroup, TreeLeaf } from './shared';

/* ---------- SQL block (DLG-SDS-52 SQL step, DLG-SDS-65) ---------- */
export type SqlErrors = Partial<Record<'server' | 'user' | 'password' | 'test' | 'db', string>>;

/** Validation of the SQL block; returns [field, message] pairs in order. */
export function sqlErrors(v: SqlValue, tested: boolean): [keyof SqlErrors, string][] {
  const out: [keyof SqlErrors, string][] = [];
  if (!v.server.trim()) out.push(['server', 'Enter the SQL Server name or IP, or Browse for one.']);
  if (v.auth === 'sql') {
    if (!v.user.trim()) out.push(['user', 'Enter the SQL user name and password.']);
    if (!v.password) out.push(['password', 'Enter the SQL user name and password.']);
  }
  if (out.length) return out;
  if (!tested) return [['test', 'Click Test Connection before continuing.']];
  if (!v.db.trim()) return [['db', v.dbMode === 'create' ? 'Enter a name for the new database.' : 'Select a database.']];
  if (v.dbMode === 'create' && !/^[A-Za-z0-9_]+$/.test(v.db.trim())) return [['db', 'Database names can only use letters, numbers and underscores.']];
  return [];
}

export function SqlFields({ value, onChange, tested, setTested, errors = {} }: {
  value: SqlValue; onChange: (v: SqlValue) => void; tested: boolean; setTested: (t: boolean) => void; errors?: SqlErrors;
}) {
  const toast = useToast();
  const [browse, setBrowse] = useState(false);
  const conn = (p: Partial<SqlValue>) => { onChange({ ...value, ...p }); setTested(false); };
  const test = () => {
    if (!value.server.trim()) { toast({ variant: 'error', title: 'SQL Server missing', message: 'Enter or browse for a SQL Server first.' }); return; }
    if (value.auth === 'sql' && (!value.user.trim() || !value.password)) { toast({ variant: 'error', title: 'Credentials missing', message: 'Enter the SQL user name and password.' }); return; }
    setTested(true);
    toast({ variant: 'success', title: 'Connection successful', message: `Connected to ${value.server.trim()}.` });
  };
  const sql = value.auth === 'sql';
  return (
    <>
      <div className="identify-inline">
        <TextField className="grow" label="SQL Server" value={value.server} error={errors.server} placeholder="Enter SQL Server name or IP"
          onChange={(v) => conn({ server: v })} />
        <Button onClick={() => setBrowse(true)}>Browse</Button>
      </div>
      <Field label="Authentication">
        <RadioGroup row ariaLabel="Authentication" value={value.auth} onChange={(v) => conn({ auth: v as SqlValue['auth'] })}
          options={[{ value: 'windows', label: 'Windows authentication' }, { value: 'sql', label: 'SQL Authentication (Recommended)' }]} />
      </Field>
      <div className="fld-row">
        <TextField label="User Name" value={value.user} disabled={!sql} error={errors.user} onChange={(v) => conn({ user: v })} />
        <PasswordField label="Password" value={value.password} disabled={!sql} error={errors.password} onChange={(v) => conn({ password: v })} />
      </div>
      <div className="stack stack--sm">
        <div className="row">
          <Button icon={tested ? 'check' : 'plug'} onClick={test} aria-pressed={tested}>{tested ? 'Connection Tested' : 'Test connection'}</Button>
        </div>
        {errors.test && <small className="fld__err" role="alert">{errors.test}</small>}
      </div>
      <Field label="Database" error={errors.db}>
        <RadioGroup row ariaLabel="Database" value={value.dbMode}
          onChange={(m) => onChange({ ...value, dbMode: m as SqlValue['dbMode'], db: m === 'select' ? SQL_DATABASES[0] : '' })}
          options={[{ value: 'select', label: 'Select database', disabled: !tested }, { value: 'create', label: 'Create database', disabled: !tested }]} />
        {value.dbMode === 'select' ? (
          <Dropdown ariaLabel="Select database" value={value.db} disabled={!tested} invalid={!!errors.db} placeholder="Select" clearable
            onChange={(v) => onChange({ ...value, db: v })} options={SQL_DATABASES} />
        ) : (
          <input aria-label="Create database" value={value.db} disabled={!tested} placeholder="Enter database name" aria-invalid={!!errors.db || undefined}
            onChange={(e) => onChange({ ...value, db: e.target.value })} />
        )}
      </Field>
      <EnumerateSqlDialog open={browse} onClose={() => setBrowse(false)} onPick={(s) => { conn({ server: s }); setBrowse(false); }} />
    </>
  );
}

/* ---------- DLG-SDS-59 · Enumerate SQL Server ---------- */
export function EnumerateSqlDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (server: string) => void }) {
  const toast = useToast();
  const [sel, setSel] = useState('');
  const [openG, setOpenG] = useState<Record<string, boolean>>({ local: true, network: false });
  useEffect(() => { if (open) { setSel(''); setOpenG({ local: true, network: false }); } }, [open]);
  const ok = (s = sel) => {
    if (!s) { toast({ variant: 'error', title: 'No server selected', message: 'Select a SQL Server from the list.' }); return; }
    onPick(s);
  };
  const groups = [{ id: 'local', label: 'Local server', items: SQL_LOCAL }, { id: 'network', label: 'Network server', items: SQL_NETWORK }];
  return (
    <Modal open={open} onClose={onClose} title="Enumerate SQL Server" icon="database" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => ok()}>OK</Button></>}>
      <p className="section-label">Select Location</p>
      <div className="identify-treebox">
        <ul className="tree" role="tree" aria-label="SQL servers">
          {groups.map((g) => (
            <TreeGroup key={g.id} label={g.label} icon="server" open={!!openG[g.id]} onToggle={() => setOpenG((o) => ({ ...o, [g.id]: !o[g.id] }))}>
              {g.items.map((s) => <TreeLeaf key={s} label={s} icon="database" selected={sel === s} onSelect={() => setSel(s)} onDouble={() => { setSel(s); ok(s); }} />)}
            </TreeGroup>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

/* ---------- DLG-SDS-53 · Add File Type ---------- */
export function AddFileTypeDialog({ open, onClose, existing, onAdd }: { open: boolean; onClose: () => void; existing: string[]; onAdd: (ext: string) => void }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setV(''); setErr(null); } }, [open]);
  const add = () => {
    const t = v.trim();
    if (!/^\.[A-Za-z0-9]{1,10}$/.test(t)) { setErr('Enter an extension such as .tv'); return; }
    if (existing.includes(t.toLowerCase())) { setErr(`${t} is already listed.`); return; }
    onAdd(t.toLowerCase());
  };
  return (
    <Modal open={open} onClose={onClose} title="Add file type" icon="file" size="xs"
      footer={<Button variant="primary" onClick={add}>Add</Button>}>
      <TextField label="File Type :" placeholder=".tv" value={v} error={err} maxLength={11} autoFocus
        onChange={(x) => { setV(x); setErr(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
    </Modal>
  );
}

/* ---------- DLG-SDS-54 · Weekly / Monthly Schedule ---------- */
const p2 = (n: number) => String(n).padStart(2, '0');
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export function ScheduleDialog({ open, kind, initial, onClose, onDone }: {
  open: boolean; kind: 'weekly' | 'monthly'; initial: Schedule | null; onClose: () => void; onDone: (s: Schedule) => void;
}) {
  const toast = useToast();
  const blank = (): Schedule => {
    const t = new Date();
    return { kind, month: t.getMonth(), year: t.getFullYear(), day: t.getDate(), hour: '', minute: '', second: '', days: [], months: [], dates: [] };
  };
  const [s, setS] = useState<Schedule>(blank);
  useEffect(() => { if (open) setS(initial && initial.kind === kind ? { ...initial } : blank()); }, [open, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const up = (p: Partial<Schedule>) => setS((x) => ({ ...x, ...p }));
  const now = new Date().getFullYear();
  const dim = new Date(s.year, s.month + 1, 0).getDate();
  const lead = new Date(s.year, s.month, 1).getDay();
  const setMonthYear = (month: number, year: number) => up({ month, year, day: Math.min(s.day, new Date(year, month + 1, 0).getDate()) });
  const tog = <T,>(xs: T[], v: T) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]);
  const title = kind === 'weekly' ? 'Weekly Schedule' : 'Monthly Schedule';

  const done = () => {
    if (!s.hour || !s.minute || !s.second) { toast({ variant: 'error', title: 'Start time missing', message: 'Choose the hour, minute and second to start at.' }); return; }
    if (kind === 'weekly' && s.days.length === 0) { toast({ variant: 'error', title: 'No days selected', message: 'Select at least one day of the week.' }); return; }
    if (kind === 'monthly' && (s.months.length === 0 || s.dates.length === 0)) { toast({ variant: 'error', title: 'Schedule incomplete', message: 'Select at least one month and one date.' }); return; }
    onDone({
      ...s, kind,
      days: kind === 'weekly' ? WEEKDAYS.filter((d) => s.days.includes(d)) : [],
      months: kind === 'monthly' ? MONTHS.filter((m) => s.months.includes(m)) : [],
      dates: kind === 'monthly' ? [...s.dates].sort((a, b) => a - b) : [],
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={title} icon="calendar" size="md"
      footer={<Button variant="primary" onClick={done}>Done</Button>}>
      <Field label="Start On">
        <div className="identify-sched">
          <div className="fld-row">
            <Dropdown ariaLabel="Month" value={String(s.month)} onChange={(v) => setMonthYear(Number(v), s.year)}
              options={MONTHS.map((m, i) => ({ value: String(i), label: m }))} search={false} />
            <Dropdown ariaLabel="Year" value={String(s.year)} onChange={(v) => setMonthYear(s.month, Number(v))}
              options={range(now - 1, now + 4).map(String)} />
          </div>
          <div className="cal__grid identify-cal" role="group" aria-label="Start date">
            {WEEKDAYS.map((d) => <span key={d} className="cal__dow">{d.slice(0, 2)}</span>)}
            {Array.from({ length: lead }, (_, i) => <span key={'b' + i} />)}
            {range(1, dim).map((d) => (
              <button key={d} type="button" className={'cal__day' + (d === s.day ? ' is-end' : '')} aria-pressed={d === s.day}
                aria-label={`${MONTHS[s.month]} ${d}, ${s.year}`} onClick={() => up({ day: d })}>{d}</button>
            ))}
          </div>
        </div>
      </Field>
      <Field label="Start At">
        <div className="identify-time">
          <Dropdown ariaLabel="Hour" placeholder="H" value={s.hour} onChange={(v) => up({ hour: v })} options={range(0, 23).map(p2)} search={false} />
          <Dropdown ariaLabel="Minute" placeholder="M" value={s.minute} onChange={(v) => up({ minute: v })} options={range(0, 59).map(p2)} search={false} />
          <Dropdown ariaLabel="Second" placeholder="S" value={s.second} onChange={(v) => up({ second: v })} options={range(0, 59).map(p2)} search={false} />
        </div>
      </Field>
      {kind === 'weekly' ? (
        <Field label="Select days">
          <div className="identify-chips" role="group" aria-label="Select days">
            {WEEKDAYS.map((d) => <button key={d} type="button" className="identify-chip" aria-pressed={s.days.includes(d)} onClick={() => up({ days: tog(s.days, d) })}>{d}</button>)}
          </div>
        </Field>
      ) : (
        <>
          <Field label="Select month">
            <div className="identify-chips" role="group" aria-label="Select month">
              {MONTHS.map((m) => <button key={m} type="button" className="identify-chip" aria-pressed={s.months.includes(m)} aria-label={m} onClick={() => up({ months: tog(s.months, m) })}>{m.slice(0, 3)}</button>)}
            </div>
          </Field>
          <Field label="Select date">
            <div className="identify-chips identify-chips--dates" role="group" aria-label="Select date">
              {range(1, 31).map((d) => <button key={d} type="button" className="identify-chip" aria-pressed={s.dates.includes(d)} onClick={() => up({ dates: tog(s.dates, d) })}>{d}</button>)}
            </div>
          </Field>
        </>
      )}
    </Modal>
  );
}

