import { useEffect, useRef, useState } from 'react';
import {
  Button, Checkbox, EmptyState, Field, IconButton, Modal, ProgressBar, RadioGroup, TextField, useToast,
} from '../../../ui';
import { SUB, addExtractedGpBackup } from '../../../stores/subscription';
import type { RestoreBackup } from '../../../stores/subscription';
import { SoftSearch } from './util';

/* DLG-SAD-09 Backup List · DLG-SAD-10 Select object class(es) and object path · DLG-SAD-11 Explore
   Backup · DLG-SAD-12 Group Policy Backup Extractor (+ "Extraction Done Successfully.") ·
   DLG-SAD-14 Status. Each dialog is mounted only while open, so opening always resets it. */

export const backupLabel = (b: RestoreBackup) => `${b.date}  ${b.time}`;

/* ---------------- DLG-SAD-09 Backup List ---------------- */
export function BackupListDialog({ backups, current, onClose, onDone }: {
  backups: RestoreBackup[]; current: string; onClose: () => void; onDone: (label: string) => void;
}) {
  const keys = backups.map(backupLabel);
  const [pick, setPick] = useState(keys.includes(current) ? current : '');
  return (
    <Modal open onClose={onClose} title="Backup list" icon="calendar" size="sm"
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!pick} onClick={() => onDone(pick)}>Done</Button>
      </>}>
      {backups.length === 0 ? (
        <EmptyState compact icon="archive" title="Sorry, No Backup Found!" />
      ) : (
        <RadioGroup ariaLabel="Backups" value={pick} onChange={setPick}
          options={backups.map((b) => ({ value: backupLabel(b), label: `${b.date} · ${b.time}${b.extracted ? ` · Extracted ${b.extracted}` : ''}` }))} />
      )}
    </Modal>
  );
}

/* ---------------- DLG-SAD-10 + DLG-SAD-11 ---------------- */
type Ou = { name: string; ticked: boolean };

export function ObjectClassDialog({ backup, onClose, onDone }: { backup: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [classMode, setClassMode] = useState<'all' | 'selected'>('all');
  const [classes, setClasses] = useState<string[]>([]);
  const [ops, setOps] = useState<string[]>([...SUB.OBJECT_OPERATIONS]);
  const [ouMode, setOuMode] = useState<'all' | 'selected'>('all');
  const [ous, setOus] = useState<Ou[]>([]);
  const [q, setQ] = useState('');
  const [exploring, setExploring] = useState(false);
  const allOus = ouMode === 'all';
  const shown = ous.filter((o) => !q.trim() || o.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

  const done = () => {
    const t = 'Select object class(es)';
    if (classMode === 'selected' && classes.length === 0) return toast({ variant: 'error', title: t, message: 'Select at least one class, or choose All Classes.' });
    if (ops.length === 0) return toast({ variant: 'error', title: t, message: 'Select at least one operation.' });
    if (ouMode === 'selected' && ous.length === 0) return toast({ variant: 'error', title: t, message: 'Add at least one OU, or choose All OUs.' });
    onDone();
  };

  return (
    <>
      <Modal open={!exploring} onClose={onClose} title="Select object class(es) and object path" icon="filter" size="lg"
        footer={<Button variant="primary" onClick={done}>Done</Button>}>
        <div className="grid2">
          <div className="stack stack--sm">
            <p className="section-label">Select Class</p>
            <RadioGroup row ariaLabel="Select class" value={classMode} onChange={(v) => setClassMode(v as 'all' | 'selected')}
              options={[{ value: 'all', label: 'All classes' }, { value: 'selected', label: 'Selected classes' }]} />
            <div className="backup-restore-checks" role="group" aria-label="Classes">
              {SUB.OBJECT_CLASSES.map((c) => (
                <Checkbox key={c} label={c} disabled={classMode === 'all'} checked={classMode === 'all' || classes.includes(c)}
                  onChange={() => setClasses((xs) => toggle(xs, c))} />
              ))}
            </div>
          </div>
          <div className="stack stack--sm">
            <p className="section-label">Select Operation</p>
            <div className="backup-restore-checks" role="group" aria-label="Select operation">
              {SUB.OBJECT_OPERATIONS.map((o) => <Checkbox key={o} label={o} checked={ops.includes(o)} onChange={() => setOps((xs) => toggle(xs, o))} />)}
            </div>
          </div>
        </div>
        <div className="stack stack--sm">
          <div className="row row--between row--wrap">
            <p className="section-label" style={{ margin: 0 }}>Select OU</p>
            <div className="row">
              <Button size="sm" icon="minus" disabled={allOus || !ous.some((o) => o.ticked)} onClick={() => setOus((xs) => xs.filter((o) => !o.ticked))}>Remove</Button>
              <Button size="sm" icon="plus" disabled={allOus} onClick={() => setExploring(true)}>Add</Button>
            </div>
          </div>
          <RadioGroup row ariaLabel="Select OU" value={ouMode} onChange={(v) => setOuMode(v as 'all' | 'selected')}
            options={[{ value: 'all', label: 'All OUs' }, { value: 'selected', label: 'Selected OU(s)' }]} />
          <div className={'backup-restore-box' + (allOus ? ' is-inactive' : '')} aria-disabled={allOus || undefined}>
            <p className="backup-restore-box__title">Select OU(s)</p>
            <SoftSearch value={q} onChange={setQ} ariaLabel="Search OUs" disabled={allOus} />
            <div className="backup-restore-list">
              {!allOus && ous.length === 0 ? <p className="muted text-sm">Click Add to pick OUs from the backup.</p>
                : shown.map((o) => (
                  <Checkbox key={o.name} label={o.name} disabled={allOus} checked={o.ticked}
                    onChange={(v) => setOus((xs) => xs.map((x) => (x.name === o.name ? { ...x, ticked: v } : x)))} />
                ))}
            </div>
          </div>
        </div>
      </Modal>
      {exploring && (
        <ExploreBackupDialog backup={backup} onClose={() => setExploring(false)}
          onDone={(picked) => {
            setOus((xs) => [...xs, ...picked.filter((p) => !xs.some((x) => x.name === p)).map((name) => ({ name, ticked: true }))]);
            setOuMode('selected');
            setExploring(false);
          }} />
      )}
    </>
  );
}

function ExploreBackupDialog({ backup, onClose, onDone }: { backup: string; onClose: () => void; onDone: (picked: string[]) => void }) {
  const [generated, setGenerated] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const shown = SUB.BACKUP_OUS.filter((o) => !q.trim() || o.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Modal open onClose={onClose} title="Explore backup" icon="search" size="lg"
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={picked.length === 0} onClick={() => onDone(picked)}>Done</Button>
      </>}>
      {/* GAP-SAD-05 intended: the inert calendar control is absent; the field is read-only. */}
      <div className="backup-restore-inline">
        <TextField label="Select backup" value={backup} readOnly className="grow" />
        <Button icon="refresh" onClick={() => setGenerated(true)}>Generate</Button>
      </div>
      <div className="backup-restore-box">
        <p className="backup-restore-box__title">Organizational Unit</p>
        <SoftSearch value={q} onChange={setQ} ariaLabel="Search organizational units" />
        <div className="backup-restore-list">
          {!generated ? <p className="muted text-sm">Click Generate to read the OUs stored in this backup.</p>
            : shown.length === 0 ? <p className="muted text-sm">No results match your search or filters.</p>
            : shown.map((o) => (
              <Checkbox key={o} label={o} checked={picked.includes(o)}
                onChange={(v) => setPicked((xs) => (v ? [...xs, o] : xs.filter((x) => x !== o)))} />
            ))}
        </div>
      </div>
      <p className="muted text-sm">Note: Converted backup will be saved on the root of the drive where LepideAuditor is installed.</p>
    </Modal>
  );
}

/* ---------------- DLG-SAD-12 Group Policy Backup Extractor ---------------- */
export function GpExtractorDialog({ path, onPath, onClose }: { path: string; onPath: (p: string) => void; onClose: () => void }) {
  const toast = useToast();
  const [sel, setSel] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => clearInterval(timer.current), []);
  const extracting = progress !== null && !done;
  const row = SUB.GP_BACKUPS.find((b) => b.id === sel);

  const extract = () => {
    if (!sel) return;
    let p = 0;
    setProgress(0);
    timer.current = window.setInterval(() => {
      p = Math.min(100, p + 10);
      setProgress(p);
      if (p >= 100) { clearInterval(timer.current); setDone(true); }
    }, 300);
  };
  const stop = () => {
    clearInterval(timer.current);
    setProgress(null);
    toast({ variant: 'info', title: 'Extraction stopped', message: 'No GPO backup was extracted.' });
  };
  const finish = () => {
    if (row) {
      // GAP-SAD-06 intended: the extracted backup becomes selectable in Backup List (Group Policy mode).
      const m = /^(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+):\d+\s*(AM|PM)$/i.exec(row.dateTime);
      const date = m ? `${m[2].padStart(2, '0')}/${m[1].padStart(2, '0')}/${m[3]}` : row.dateTime;
      const time = m ? `${m[4].padStart(2, '0')}:${m[5]} ${m[6].toUpperCase()}` : '';
      addExtractedGpBackup({ date, time, extracted: row.backup });
    }
    onClose();
  };
  const select = (id: string) => { if (!extracting) setSel(id); };
  const base = path.replace(/\\+$/, '');

  return (
    <>
      <Modal open={!done} onClose={onClose} title="Group Policy backup extractor" icon="archive" size="lg"
        footer={extracting
          ? <Button variant="primary" icon="pause" onClick={stop}>Stop</Button>
          : <Button variant="primary" disabled={!sel} onClick={extract}>Extract</Button>}>
        <Field label="Group Policy backup">
          <div className="backup-restore-inline">
            <input aria-label="Group Policy backup path" value={path} disabled={extracting} onChange={(e) => onPath(e.target.value)} />
            <IconButton icon="refresh" label="Refresh backups" bordered disabled={extracting}
              onClick={() => toast({ variant: 'info', title: 'Backups refreshed', message: `${SUB.GP_BACKUPS.length} backups found in ${path}` })} />
          </div>
        </Field>
        <section className="lf-card tablecard tablecard--flat">
          <div className="tbl-wrap">
            <table className="lf-table" aria-label="Group Policy backups">
              <thead><tr><th>IP Address</th><th>Backups</th><th>Date Time</th><th>File Size</th></tr></thead>
              <tbody>
                {SUB.GP_BACKUPS.map((b) => (
                  <tr key={b.id} className={'lf-row' + (sel === b.id ? ' is-sel' : '')} tabIndex={0} aria-selected={sel === b.id}
                    aria-disabled={extracting || undefined} onClick={() => select(b.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(b.id); } }}>
                    <td>{b.ip}</td><td>{b.backup}</td><td>{b.dateTime}</td><td>{b.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {progress !== null && <ProgressBar value={progress} label="Extraction progress" />}
        <p className="muted text-sm">Note: Converted backup will be saved on the root of the drive where LepideAuditor is installed.</p>
      </Modal>
      <Modal open={done} onClose={finish} title="Extraction Done Successfully." icon="check" size="md"
        footer={<Button variant="primary" onClick={finish}>Done</Button>}>
        <p className="text-sm" style={{ margin: 0 }}>Follow the steps given below to restore GPO objects:</p>
        <ol className="backup-restore-steps">
          <li>Copy the path '{base}\GP_{row?.backup}\BKP\GP_BACKUP'</li>
          <li>Open "Manage Backup" window from GPMC.msc.</li>
          <li>Paste the path in Backup Location and press enter key.</li>
          <li>Select the GPO that you want to restore and click Restore button</li>
        </ol>
      </Modal>
    </>
  );
}

/* ---------------- DLG-SAD-14 Status ---------------- */
export function StatusDialog({ rows, onDone }: { rows: string[]; onDone: () => void }) {
  return (
    <Modal open onClose={onDone} title="Status" icon="check" size="lg" footer={<Button variant="primary" onClick={onDone}>Done</Button>}>
      <section className="lf-card tablecard tablecard--flat">
        <div className="tbl-wrap">
          <table className="lf-table" aria-label="Restore results">
            <thead><tr><th>Object Name</th><th>Object Class</th><th>Operation</th><th>Result</th></tr></thead>
            <tbody>
              {rows.map((label, i) => (
                <tr key={i} className="lf-row" style={{ cursor: 'default' }}>
                  <td>CN= Shared, OU= Customers</td><td>Object Attribute</td><td title={label}>{label}</td>
                  <td><span className="fx-op fx-op--good">Success</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Modal>
  );
}
