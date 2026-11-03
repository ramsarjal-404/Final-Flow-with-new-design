import { useState } from 'react';
import {
  Button, Checkbox, Chip, DataTable, Dropdown, EmptyState, Field, Modal, NumberField, PasswordField, RadioGroup, SelectField, TextField, useToast,
} from '../../../ui';
import type { Column } from '../../../ui';
import {
  SUB, addRestoredDb, componentTypeOf, deleteRestoredDbs, newId, saveArchive, subStore,
} from '../../../stores/subscription';
import type { ArchiveJob, RestoredDatabase } from '../../../stores/subscription';
import { HOURS, QUARTERS, digits, plural } from './util';

/* DLG-SAD-15 Archive Database · DLG-SAD-16 Schedule Weekly · DLG-SAD-17 Schedule Monthly ·
   DLG-SAD-18 Restore Data · DLG-SAD-19 Restored Databases. Mounted only while open. */

const DBS = SUB.ARCHIVE_DATABASES as Record<string, string>;
const sr = (t: string) => <span className="sr-only">{t}</span>;

/* ---------------- DLG-SAD-15 Archive Database ---------------- */
export function ArchiveDialog({ initial, onClose }: { initial?: ArchiveJob; onClose: () => void }) {
  const toast = useToast();
  const [component, setComponent] = useState(initial?.componentName ?? SUB.ARCHIVE_COMPONENTS[0]);
  const [server, setServer] = useState(initial?.server ?? '192.168.30.180');
  const [path, setPath] = useState(initial?.path ?? '');
  const [deleteOld, setDeleteOld] = useState(!!initial?.deleteOlderDays);
  const [keepDays, setKeepDays] = useState<number | ''>(initial?.deleteOlderDays ? Number(initial.deleteOlderDays) : '');
  const [now, setNow] = useState(false);
  const [scheduleOn, setScheduleOn] = useState(!!initial?.schedule);
  const [schedule, setSchedule] = useState(initial?.schedule ?? '');
  const [olderThan, setOlderThan] = useState<number | ''>(initial?.olderThanDays ? Number(initial.olderThanDays) : '');
  const [deleteRecords, setDeleteRecords] = useState(initial?.deleteRecords ?? false);
  const [shrink, setShrink] = useState(initial?.shrink ?? false);
  const [sub, setSub] = useState<null | 'weekly' | 'monthly'>(null);
  const type = componentTypeOf(component);

  const browse = () => {
    if (!path.trim()) setPath(`D:\\Archives\\${type.replace(/\s+/g, '')}`);
    toast({ variant: 'info', title: 'Browse', message: 'Folder browsing runs on the Lepide server; a default archive folder was filled in.' });
  };
  const ok = () => {
    const err = (message: string) => toast({ variant: 'error', title: 'Archive database', message });
    if (!path.trim()) return err('Please enter the archive path.');
    if (deleteOld && keepDays === '') return err('Enter how many days to keep archived files.');
    if (!now && !scheduleOn) return err('Choose Archive Now or Schedule Archive.');
    if (scheduleOn && !schedule) return err('Click Weekly or Monthly to set the archive schedule.');
    if (olderThan === '') return err('Enter how old the data must be (in days) to be archived.');
    const rec: ArchiveJob = {
      id: initial?.id ?? newId('arc'), componentType: type, componentName: component, server, path: path.trim(),
      schedule: scheduleOn ? schedule : '', status: now ? 'Running' : 'Scheduled',
      deleteOlderDays: deleteOld ? String(keepDays) : '', olderThanDays: String(olderThan), deleteRecords, shrink,
    };
    saveArchive(rec);
    toast({ variant: 'success', title: initial ? 'Archive updated' : 'Archive created', message: `${type} on ${server}: ${scheduleOn ? schedule : 'archiving now'}.` });
    onClose();
  };

  return (
    <>
      <Modal open onClose={onClose} title="Archive database" icon="archive" size="md" escapeCloses={!sub}
        footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={ok}>OK</Button></>}>
        <div className="grid2">
          <SelectField label="Component Name" options={SUB.ARCHIVE_COMPONENTS} value={component} onChange={setComponent} />
          <SelectField label="Server Name :" options={SUB.ARCHIVE_SERVERS} value={server} onChange={setServer} />
          <TextField label="SQL Server :" value={SUB.ARCHIVE_SQL_SERVER} readOnly />
          <TextField label="Database Name" value={DBS[component] ?? ''} readOnly />
        </div>
        <div className="backup-restore-inline backup-restore-inline--end">
          <TextField label="Archive Path :" placeholder="D:\Archives" value={path} onChange={setPath} className="grow" />
          <Button icon="folder" onClick={browse}>Browse</Button>
        </div>
        <div className="backup-restore-checkrow">
          <Checkbox label="Delete archived file(s) older than" checked={deleteOld} onChange={setDeleteOld} />
          <NumberField label={sr('Days to keep archived files')} value={keepDays} min={0} max={9999} disabled={!deleteOld} suffix="Days"
            onChange={(v) => { if (digits(v)) setKeepDays(v); }} />
        </div>
        <Checkbox label="Archive now" checked={now} onChange={setNow} />
        <div className="backup-restore-checkrow">
          <Checkbox label="Schedule Archive" checked={scheduleOn} onChange={(v) => { setScheduleOn(v); if (!v) setSchedule(''); }} />
          <Button size="sm" icon="calendar" disabled={!scheduleOn} onClick={() => setSub('weekly')}>Weekly</Button>
          <Button size="sm" icon="calendar" disabled={!scheduleOn} onClick={() => setSub('monthly')}>Monthly</Button>
        </div>
        {schedule && <div><Chip tone="brand" icon="clock" title={schedule}>{schedule}</Chip></div>}
        <NumberField label="Archive data older than or equal to :" value={olderThan} min={0} max={9999} suffix="Days"
          onChange={(v) => { if (digits(v)) setOlderThan(v); }} />
        <div className="stack stack--sm">
          <Checkbox label="Delete records from current database after archiving" checked={deleteRecords} onChange={setDeleteRecords} />
          <Checkbox label="Shrink database after archive" checked={shrink} onChange={setShrink} />
        </div>
      </Modal>
      {sub === 'weekly' && <WeeklyDialog onClose={() => setSub(null)} onDone={(t) => { setSchedule(t); setSub(null); }} />}
      {sub === 'monthly' && <MonthlyDialog onClose={() => setSub(null)} onDone={(t) => { setSchedule(t); setSub(null); }} />}
    </>
  );
}

function StartTime({ h, m, onH, onM }: { h: string; m: string; onH: (v: string) => void; onM: (v: string) => void }) {
  return (
    <Field label="Start Time :">
      <div className="backup-restore-time">
        <Dropdown size="sm" ariaLabel="Hour" value={h} onChange={onH} options={HOURS} search={false} />
        <span aria-hidden="true">:</span>
        <Dropdown size="sm" ariaLabel="Minute" value={m} onChange={onM} options={QUARTERS} search={false} />
      </div>
    </Field>
  );
}

/* ---------------- DLG-SAD-16 Schedule Weekly ---------------- */
function WeeklyDialog({ onClose, onDone }: { onClose: () => void; onDone: (text: string) => void }) {
  const toast = useToast();
  const [h, setH] = useState('17');
  const [m, setM] = useState('00');
  const [days, setDays] = useState<string[]>(['Monday']);
  const ok = () => {
    if (!days.length) return toast({ variant: 'error', title: 'Schedule Weekly', message: 'Select at least one day.' });
    onDone(`Archive Data On Every ${SUB.WEEKDAYS.filter((d) => days.includes(d)).join(', ')} At - ${h}:${m}`);
  };
  return (
    <Modal open onClose={onClose} title="Schedule Weekly" icon="calendar" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={ok}>OK</Button></>}>
      <StartTime h={h} m={m} onH={setH} onM={setM} />
      <div className="backup-restore-checks" role="group" aria-label="Days">
        {SUB.WEEKDAYS.map((d) => (
          <Checkbox key={d} label={d} checked={days.includes(d)} onChange={(v) => setDays((xs) => (v ? [...xs, d] : xs.filter((x) => x !== d)))} />
        ))}
      </div>
    </Modal>
  );
}

/* ---------------- DLG-SAD-17 Schedule Monthly ---------------- */
function MonthlyDialog({ onClose, onDone }: { onClose: () => void; onDone: (text: string) => void }) {
  const toast = useToast();
  const [h, setH] = useState('12');
  const [m, setM] = useState('00');
  const [dates, setDates] = useState<number[]>([]);
  const all = dates.length === 31;
  const ok = () => {
    if (!dates.length) return toast({ variant: 'error', title: 'Schedule Monthly', message: 'Select at least one date.' });
    onDone(`Archive Data On Day ${all ? 'every day' : [...dates].sort((a, b) => a - b).join(', ')} Of Every Month At - ${h}:${m}`);
  };
  return (
    <Modal open onClose={onClose} title="Schedule Monthly" icon="calendar" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={ok}>OK</Button></>}>
      <p className="muted text-sm" style={{ margin: 0 }}>Please select time and date(s)</p>
      <StartTime h={h} m={m} onH={setH} onM={setM} />
      <Checkbox label="Select All" checked={all} indeterminate={dates.length > 0 && !all}
        onChange={() => setDates(all ? [] : Array.from({ length: 31 }, (_, i) => i + 1))} />
      <DateGrid value={dates} onChange={setDates} />
    </Modal>
  );
}

/** 1–31 toggle grid (aria-pressed), group "Dates". */
export function DateGrid({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="backup-restore-dates" role="group" aria-label="Dates">
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
        const on = value.includes(d);
        return (
          <button key={d} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d])}>{d}</button>
        );
      })}
    </div>
  );
}

/* ---------------- DLG-SAD-18 Restore Data ---------------- */
const localInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function RestoreDataDialog({ row, onClose }: { row: ArchiveJob; onClose: () => void }) {
  const toast = useToast();
  const today = new Date();
  const [sql, setSql] = useState('');
  const [auth, setAuth] = useState<'windows' | 'sql'>('windows');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [db, setDb] = useState('');
  const [path, setPath] = useState(row.path);
  const [delAfter, setDelAfter] = useState(false);
  const [delDays, setDelDays] = useState<number | ''>('');
  const [range, setRange] = useState(true);
  const [from, setFrom] = useState(localInput(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0)));
  const [to, setTo] = useState(localInput(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59)));
  const err = (message: string) => toast({ variant: 'error', title: 'Restore Data', message });
  const sqlAuth = auth === 'sql';

  const ok = () => {
    if (!sql.trim()) return err('Please enter the destination SQL Server.');
    if (sqlAuth && (!user.trim() || !pass)) return err('Please enter the SQL user name and password.');
    if (!db.trim()) return err('Please enter the database name.');
    if (!path.trim()) return err('Please set the archive path.');
    if (delAfter && delDays === '') return err('Enter after how many days the restored database is deleted.');
    if (range && from && to && from > to) return err('Start Date must be before End Date.');
    addRestoredDb({ name: db.trim(), sqlServer: sql.trim(), component: row.server });
    toast({ variant: 'success', title: 'Restore started', message: `Archived data is being restored into ${db.trim()} on ${sql.trim()}.` });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Restore Data" icon="restore" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={ok}>OK</Button></>}>
      <p className="section-label">Select Destination Source</p>
      <div className="backup-restore-inline backup-restore-inline--end">
        <TextField label="SQL Server :" placeholder="SQL-PROD-01" value={sql} onChange={setSql} className="grow" />
        <Button aria-label="Find SQL Servers" onClick={() => { setSql('SQL-PROD-01'); toast({ variant: 'info', title: 'SQL Servers', message: 'SQL-PROD-01 was found on the network.' }); }}>…</Button>
      </div>
      <RadioGroup row ariaLabel="Authentication" value={auth} onChange={(v) => setAuth(v as 'windows' | 'sql')}
        options={[{ value: 'windows', label: 'Windows Authentication' }, { value: 'sql', label: 'SQL Authentication' }]} />
      <div className="grid2">
        <TextField label="User Name :" value={user} disabled={!sqlAuth} onChange={setUser} />
        <PasswordField label="Password" value={pass} disabled={!sqlAuth} onChange={setPass} />
      </div>
      <div>
        <Button icon="plug" onClick={() => (sql.trim()
          ? toast({ variant: 'success', title: 'Test connection', message: `Connected to ${sql.trim()}.` })
          : err('Please enter the destination SQL Server.'))}>Test connection</Button>
      </div>
      <TextField label="Database Name" placeholder="ArchiveDB_2025" value={db} onChange={setDb} />
      <div className="backup-restore-inline backup-restore-inline--end">
        <TextField label="Set Archive Path" value={path} onChange={setPath} className="grow" />
        <Button icon="folder" onClick={() => toast({ variant: 'info', title: 'Browse', message: 'Folder browsing runs on the Lepide server.' })}>Browse</Button>
      </div>
      <div className="backup-restore-checkrow">
        <Checkbox label="Delete Restored Database After" checked={delAfter} onChange={setDelAfter} />
        <NumberField label={sr('Days')} value={delDays} min={0} max={9999} disabled={!delAfter} suffix="Days"
          onChange={(v) => { if (digits(v)) setDelDays(v); }} />
      </div>
      <Checkbox label="Select Date Range" checked={range} onChange={setRange} />
      <div className="grid2">
        <TextField label="Start Date :" type="datetime-local" value={from} disabled={!range} onChange={setFrom} />
        <TextField label="End Date :" type="datetime-local" value={to} disabled={!range} onChange={setTo} />
      </div>
    </Modal>
  );
}

/* ---------------- DLG-SAD-19 Restored Databases ---------------- */
export function RestoredDatabasesDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const rows = subStore.use((s) => s.restoredDbs);
  const [sel, setSel] = useState<string[]>([]);
  const cols: Column<RestoredDatabase>[] = [
    { key: 'name', header: 'Database Name', sortable: true },
    { key: 'sqlServer', header: 'SQL Server', sortable: true },
    { key: 'component', header: 'Component Name', sortable: true },
  ];
  const ok = () => {
    deleteRestoredDbs(sel);
    toast({ variant: 'success', title: 'Restored databases deleted', message: `${plural(sel.length, 'database')} removed.` });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Restored Databases" icon="database" size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={sel.length === 0} onClick={ok}>OK</Button></>}>
      <p className="muted text-sm" style={{ margin: 0 }}>Select the Restored database(s) that you want to delete.</p>
      <DataTable flat className="tablecard--static" columns={cols} rows={rows} rowKey={(r) => r.id} selectable="multi" selected={sel} onSelectedChange={setSel}
        noun={['database', 'databases']} empty={<EmptyState compact icon="database" title="No restored databases." />} />
    </Modal>
  );
}
