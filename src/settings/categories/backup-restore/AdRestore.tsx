import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, Card, Checkbox, ConfirmDialog, Field, Icon, IconButton, PageLoader, PasswordField, RadioGroup, SelectField, SetCard, TextField, useToast,
} from '../../../ui';
import { SUB, subStore } from '../../../stores/subscription';
import type { RestoreBackup } from '../../../stores/subscription';
import { BackupListDialog, GpExtractorDialog, ObjectClassDialog, StatusDialog } from './restoreDialogs';
import { plural } from './util';

/* SCR-SAD-07 AD Restore — "Lepide Object Restore" in-page wizard (form → review → verify) with
   DLG-SAD-09 … 14. Three paths: AD from backup, Group Policy, Tombstone. */

type Mode = 'ad' | 'gp';
type Source = 'backup' | 'tombstone';
type Stage = 'form' | 'review' | 'verify';
type Kind = 'ad' | 'gp' | 'tomb';
type Dialog = null | 'backups' | 'classes' | 'extract' | 'confirm' | 'status';

const TITLE = 'Lepide Object Restore';
const BACKUPS = SUB.DOMAIN_BACKUPS as Record<string, RestoreBackup[]>;
const KIND_TONE: Record<string, string> = { deleted: 'bad', moved: 'info', added: 'good', renamed: 'warn', modified: 'none' };

const EMPTY = { domain: '', mode: 'ad' as Mode, source: 'backup' as Source, backup: '', predefined: true, user: '', password: '' };

export default function AdRestore({ onDirty }: { onDirty: (dirty: boolean) => void }) {
  const toast = useToast();
  const extracted = subStore.use((s) => s.extractedGpBackups);
  const [form, setForm] = useState(EMPTY);
  const [stage, setStage] = useState<Stage>('form');
  const [kind, setKind] = useState<Kind>('ad');
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [focused, setFocused] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [statusRows, setStatusRows] = useState<string[]>([]);
  const [gpPath, setGpPath] = useState('F:\\Gwv19AD\\');
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const dirty = stage !== 'form' || JSON.stringify(form) !== JSON.stringify(EMPTY);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const err = (message: string) => toast({ variant: 'error', title: TITLE, message });
  const reset = () => {
    clearTimeout(timer.current);
    setForm(EMPTY); setStage('form'); setLoading(false); setChecked([]); setFocused(null); setCollapsed([]); setDialog(null);
  };
  const startReview = (k: Kind) => {
    setKind(k); setStage('review'); setLoading(true); setChecked([]); setFocused(null); setCollapsed([]);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLoading(false), 1500);
  };

  const backupList = useMemo(() => [...(BACKUPS[form.domain] ?? []), ...(form.mode === 'gp' ? extracted : [])], [form.domain, form.mode, extracted]);
  const openBackups = () => {
    if (form.source === 'tombstone') return;
    if (!form.domain) return err('Please select the domain name first.');
    setDialog('backups');
  };

  const nextFromForm = () => {
    if (!form.domain) return err('Please select the domain name.');
    if (form.source === 'backup' && !form.backup) return err('Please select a backup to restore from.');
    if (!form.predefined && (!form.user.trim() || !form.password)) return err('Please enter the user name and password, or use the predefined server credentials.');
    if (form.mode === 'gp') return startReview('gp');
    if (form.source === 'tombstone') return startReview('tomb');
    setDialog('classes');
  };

  /* ---------- review data ---------- */
  const toggle = (id: string) => setChecked((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  const verifyLines = useMemo(() => {
    if (kind === 'ad') return SUB.AD_MODIFICATIONS.filter((m) => checked.includes(m.id)).map((m) => m.action);
    if (kind === 'gp') {
      return SUB.GP_OBJECTS.filter((g) => checked.includes(g.id)).flatMap((g) => (g.name === 'gpobyleastuse'
        ? SUB.GP_VERIFY
        : g.settings.map((s) => `${s.op.replace('Setting ', '')} Setting at ${s.path} in ${g.name}`)));
    }
    return SUB.TOMBSTONE_OBJECTS.filter((t) => checked.includes(t.id)).flatMap((t) => [t.name, ...t.children.map((c) => `${t.name}\\${c}`)]);
  }, [kind, checked]);

  const lead = stage === 'form' ? 'This wizard lets you restore the objects of Active Directory and Group Policy to a previous backup'
    : stage === 'verify' ? 'Please verify the following modifications to be restored. Click "Next" to restore or click "Back" to select other modifications.'
    : loading ? (kind === 'tomb' ? 'Please wait while getting information from tombstone' : 'Please wait while comparing the current state with the backup....')
    : kind === 'tomb' ? 'Select the deleted objects to restore from tombstone.' : 'Please select the object modification from the tree to restore them.';

  const next = () => {
    if (stage === 'form') return nextFromForm();
    if (stage === 'review') { if (!loading && checked.length) setStage('verify'); return; }
    if (kind === 'tomb') {
      toast({ variant: 'success', title: 'Objects restored', message: `${plural(checked.length, 'object')} restored from tombstone on ${form.domain}.` });
      return reset();
    }
    setDialog('confirm');
  };
  const confirmYes = () => {
    if (kind === 'gp') {
      toast({ variant: 'success', title: 'Group Policy restored', message: `${plural(checked.length, 'GPO')} restored on ${form.domain}.` });
      return reset();
    }
    setStatusRows(SUB.AD_MODIFICATIONS.filter((m) => checked.includes(m.id)).map((m) => m.label));
    setDialog('status');
  };
  const statusDone = () => {
    toast({ variant: 'success', title: 'Restore complete', message: `${plural(statusRows.length, 'modification')} restored on ${form.domain}.` });
    reset();
  };

  const nextDisabled = stage === 'review' && (loading || checked.length === 0);
  const guard = stage === 'review' && !loading && checked.length === 0
    ? (kind === 'tomb' ? 'Select at least one deleted object to restore.' : 'Select at least one modification to restore.') : null;

  return (
    <>
      <SetCard title={TITLE} description={lead}
        footer={<>
          {stage === 'form'
            ? <Button icon="info" onClick={() => toast({ variant: 'info', title: 'Help', message: 'Lepide Object Restore help opens in the product documentation.' })}>Help</Button>
            : <Button onClick={reset}>Cancel</Button>}
          <span className="backup-restore-spacer">{guard && <span className="lf-muted">{guard}</span>}</span>
          <Button icon="chevron-left" disabled={stage === 'form'} onClick={() => setStage(stage === 'verify' ? 'review' : 'form')}>Back</Button>
          <Button variant="primary" iconEnd={stage === 'verify' && kind === 'tomb' ? undefined : 'arrow'} disabled={nextDisabled} onClick={next}>
            {stage === 'verify' && kind === 'tomb' ? 'Finish' : 'Next'}
          </Button>
        </>}>
        {stage === 'form' && (
          <div className="page-form backup-restore-form">
            <p className="section-label">Select Domain and Backup</p>
            <SelectField label="Domain Name:" placeholder="Select" options={SUB.RESTORE_DOMAINS} value={form.domain}
              onChange={(v) => setForm((f) => ({ ...f, domain: v, backup: '' }))} />

            <p className="section-label">Restoration Mode Selection</p>
            <div className="row row--between row--wrap">
              <RadioGroup row ariaLabel="Restoration mode selection" value={form.mode}
                onChange={(v) => setForm((f) => ({ ...f, mode: v as Mode, source: v === 'gp' ? 'backup' : f.source }))}
                options={[{ value: 'ad', label: 'Active Directory' }, { value: 'gp', label: 'Group Policy' }]} />
              <Button icon="archive" disabled={form.mode !== 'gp'} onClick={() => setDialog('extract')}>Extract backup</Button>
            </div>
            <div className="backup-restore-source">
              <RadioGroup ariaLabel="Restore source" value={form.source} onChange={(v) => set('source', v as Source)}
                options={[{ value: 'backup', label: 'Restore from backup' }, { value: 'tombstone', label: 'Restore from tombstone', disabled: form.mode === 'gp' }]} />
              <Field className="backup-restore-backup">
                <div className="backup-restore-inline">
                  <input readOnly aria-label="Backup" placeholder="Select backup" value={form.backup} disabled={form.source === 'tombstone'}
                    onClick={openBackups} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBackups(); } }} />
                  <IconButton icon="calendar" label="Choose backup" bordered disabled={form.source === 'tombstone'} onClick={openBackups} />
                </div>
              </Field>
            </div>

            <p className="section-label">Credentials</p>
            <Checkbox checked={form.predefined} onChange={(v) => set('predefined', v)}
              label="Use predefined Server Credentials. Please uncheck this option to use the explicit credentials." />
            <div className="grid2">
              <TextField label="User Name" placeholder="newserver16\administrator" value={form.user} disabled={form.predefined} onChange={(v) => set('user', v)} />
              <PasswordField label="Password" value={form.password} disabled={form.predefined} onChange={(v) => set('password', v)} />
            </div>
          </div>
        )}

        {stage === 'review' && loading && (
          <div className="backup-restore-loading"><PageLoader text="Working…" /></div>
        )}

        {stage === 'review' && !loading && kind === 'ad' && (
          <>
            <Legend items={SUB.AD_LEGEND} />
            <div className="backup-restore-review">
              <Card className="backup-restore-treecard">
                <ul className="tree" role="tree" aria-label="Modifications">
                  <li role="treeitem" aria-expanded="true" aria-selected={false}>
                    <div className="backup-restore-treeroot"><Icon name="folder" size={15} /><span>{SUB.AD_ROOT}</span></div>
                    <ul role="group">
                      {SUB.AD_MODIFICATIONS.map((m) => (
                        <li key={m.id} role="treeitem" aria-selected={focused === m.id} className="backup-restore-treerow">
                          <Checkbox ariaLabel={m.label} checked={checked.includes(m.id)} onChange={() => toggle(m.id)} />
                          <Dot kind={m.kind} />
                          <button type="button" aria-current={focused === m.id || undefined} onClick={() => setFocused(m.id)}><span>{m.label}</span></button>
                        </li>
                      ))}
                    </ul>
                  </li>
                </ul>
              </Card>
              <Card className="backup-restore-detail">
                {(() => {
                  const m = SUB.AD_MODIFICATIONS.find((x) => x.id === focused);
                  return m ? (
                    <div className="stack stack--sm">
                      <p>{m.detail}</p>
                      <p className="muted">Restoring this modification will perform the following action:</p>
                      <p><b>{m.action}</b></p>
                    </div>
                  ) : <p className="muted">Select a modification to see what restoring it does.</p>;
                })()}
              </Card>
            </div>
          </>
        )}

        {stage === 'review' && !loading && kind === 'gp' && (
          <>
            <Legend items={SUB.GP_LEGEND} />
            <div className="backup-restore-review">
              <Card className="backup-restore-treecard">
                <ul className="tree" role="tree" aria-label="Group Policy objects">
                  <li role="treeitem" aria-expanded="true" aria-selected={false}>
                    <div className="backup-restore-treeroot"><Icon name="folder" size={15} /><span>{form.domain}</span></div>
                    <ul role="group">
                      {SUB.GP_OBJECTS.map((g) => (
                        <li key={g.id} role="treeitem" aria-selected={focused === g.id} className="backup-restore-treerow">
                          <Checkbox ariaLabel={g.name} checked={checked.includes(g.id)} onChange={() => { toggle(g.id); setFocused(g.id); }} />
                          <Dot kind={g.kind} />
                          <button type="button" aria-current={focused === g.id || undefined} onClick={() => setFocused(g.id)}><span>{g.name}</span></button>
                        </li>
                      ))}
                    </ul>
                  </li>
                </ul>
              </Card>
              <Card className="backup-restore-detail">
                <p className="muted text-sm" style={{ marginTop: 0 }}>Drag a column header here to group by that column.</p>
                <section className="lf-card tablecard tablecard--flat">
                  <div className="tbl-wrap">
                    <table className="lf-table" aria-label="GPO settings">
                      <thead><tr><th>Operations</th><th>GPO Setting Path</th><th>GPO</th></tr></thead>
                      <tbody>
                        {(SUB.GP_OBJECTS.find((g) => g.id === focused)?.settings ?? []).map((s, i) => (
                          <tr key={i} className="lf-row" style={{ cursor: 'default' }}>
                            <td>{s.op}</td><td>{s.path}</td><td>{SUB.GP_OBJECTS.find((g) => g.id === focused)?.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </Card>
            </div>
          </>
        )}

        {stage === 'review' && !loading && kind === 'tomb' && (
          <section className="lf-card tablecard tablecard--flat">
            <div className="tbl-wrap">
              <table className="lf-table" role="treegrid" aria-label="Deleted objects">
                <thead><tr><th>Object Name</th><th style={{ width: 52 }}><span className="sr-only">Select</span></th><th>Object Class</th><th>When Deleted</th><th>When Created</th></tr></thead>
                <tbody>
                  {SUB.TOMBSTONE_OBJECTS.flatMap((t) => {
                    const open = !collapsed.includes(t.id);
                    const on = checked.includes(t.id);
                    const rows = [(
                      <tr key={t.id} className="lf-row" aria-level={1} aria-expanded={open} style={{ cursor: 'default' }}>
                        <td title={t.name}>
                          <span className="tree-cell">
                            <button type="button" className="tree-toggle" aria-expanded={open} aria-label={open ? 'Collapse' : 'Expand'}
                              onClick={() => setCollapsed((xs) => (open ? [...xs, t.id] : xs.filter((x) => x !== t.id)))}><Icon name="chevron-right" /></button>
                            <b>{t.name}</b>
                          </span>
                        </td>
                        <td><Checkbox ariaLabel={`Restore ${t.name}`} checked={on} onChange={() => toggle(t.id)} /></td>
                        <td>{t.objectClass}</td><td>{t.deleted}</td><td>{t.created}</td>
                      </tr>
                    )];
                    if (open) {
                      t.children.forEach((c) => rows.push(
                        <tr key={t.id + c} className="lf-row backup-restore-child" aria-level={2} style={{ cursor: 'default' }}>
                          <td><span className="tree-cell" style={{ paddingLeft: 20 }}><span className="tree-spacer" />{c}</span></td>
                          <td><Checkbox ariaLabel={`Restore ${t.name}\\${c}`} checked={on} onChange={() => toggle(t.id)} /></td>
                          <td>container</td><td>{t.deleted}</td><td>{t.created}</td>
                        </tr>,
                      ));
                    }
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {stage === 'verify' && (
          <ol className="backup-restore-verify" aria-label="Modifications to be restored">
            {verifyLines.map((l, i) => <li key={i}>{l}</li>)}
          </ol>
        )}
      </SetCard>

      {dialog === 'backups' && (
        <BackupListDialog backups={backupList} current={form.backup} onClose={() => setDialog(null)}
          onDone={(b) => { set('backup', b); setDialog(null); }} />
      )}
      {dialog === 'classes' && (
        <ObjectClassDialog backup={form.backup} onClose={() => setDialog(null)} onDone={() => { setDialog(null); startReview('ad'); }} />
      )}
      {dialog === 'extract' && <GpExtractorDialog path={gpPath} onPath={setGpPath} onClose={() => setDialog(null)} />}
      <ConfirmDialog open={dialog === 'confirm'} onClose={() => setDialog(null)} onConfirm={confirmYes} destructive={false} icon="restore"
        title="Restore" message="Are you sure you want to restore the selected modifications?" cancelLabel="No" confirmLabel="Yes" />
      {dialog === 'status' && <StatusDialog rows={statusRows} onDone={statusDone} />}
    </>
  );
}

function Dot({ kind }: { kind: string }) {
  return <span className={'backup-restore-dot backup-restore-dot--' + (KIND_TONE[kind] ?? 'none')} aria-hidden="true" />;
}
function Legend({ items }: { items: { kind: string; label: string }[] }) {
  return (
    <ul className="backup-restore-legend" aria-label="Legend">
      {items.map((it) => <li key={it.kind}><Dot kind={it.kind} />{it.label}</li>)}
    </ul>
  );
}
