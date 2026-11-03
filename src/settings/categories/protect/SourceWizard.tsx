import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Banner, Button, Checkbox, Chip, Icon, Modal, PasswordField, SelectField, Steps, TextField, useToast,
} from '../../../ui';
import {
  AD_INTEGRATION, AD_MANAGER_SUGGESTIONS, HOURS, HRMS_EDIT_ROWS, HRMS_INTEGRATION, HRMS_PROVIDERS, MATCH_ATTRIBUTES, MONTH_DAYS, WEEK_DAYS,
  downloadText, scheduleText, toCsv, type IntegrationRow, type SyncSchedule, type WizardDetails, type WizardResult,
} from './store';

/* DLG-SDS-67 Source wizard (Configure HRMS Details / Configure Active Directory) and DLG-SDS-68
   "Ready to Sync N Users?". Full-page wizard drawn in place of the Protect views (04 § 10). */

export type WizardTarget =
  | { kind: 'hrms'; provider: 'zoho' | 'workable'; edit: boolean; existing?: WizardResult }
  | { kind: 'ad'; edit: boolean; existing?: WizardResult };

type Step = 'details' | 'review' | 'integration' | 'scan';
type FieldDef = { key: string; label: string; sample?: string; secret?: boolean; select?: boolean };

/* ---------- grouped table (review / integration) ---------- */
type GCol = { key: keyof IntegrationRow; header: string; group: string; editable?: boolean; render?: (r: IntegrationRow) => ReactNode };
function GroupedTable({ cols, rows, filterable, onEdit, footer }: {
  cols: GCol[]; rows: IntegrationRow[]; filterable?: boolean; onEdit?: (id: string, key: keyof IntegrationRow, v: string) => void; footer?: ReactNode;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const groups: { label: string; span: number }[] = [];
  cols.forEach((c) => { const g = groups[groups.length - 1]; if (g && g.label === c.group) g.span++; else groups.push({ label: c.group, span: 1 }); });
  const shown = rows.filter((r) => Object.entries(filters).every(([k, f]) => !f.trim() || String(r[k as keyof IntegrationRow] ?? '').toLowerCase().includes(f.trim().toLowerCase())));
  return (
    <section className="lf-card tablecard tablecard--flat tablecard--static protect-gt">
      <div className="tbl-wrap">
        <table className="lf-table">
          <thead>
            <tr>{groups.map((g, i) => <th key={i} colSpan={g.span} className="protect-gt__grp">{g.label}</th>)}</tr>
            <tr className="protect-gt__cols">{cols.map((c) => <th key={c.group + c.key} style={{ top: 36 }}>{c.header}</th>)}</tr>
            {filterable && (
              <tr className="filter-row">
                {cols.map((c) => (
                  <th key={c.group + c.key}>
                    <span className={'filter-input' + (filters[c.key] ? ' has-value' : '')}>
                      <Icon name="search" size={12} />
                      <input value={filters[c.key] ?? ''} placeholder="Filter" aria-label={`Filter ${c.group} ${c.header}`} maxLength={200}
                        onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))} />
                    </span>
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="rows-in">
            {shown.length === 0 ? (
              <tr><td colSpan={cols.length} className="empty-cell" style={{ position: 'static' }}>No results match your search or filters.</td></tr>
            ) : shown.map((r) => (
              <tr key={r.id} className="lf-row" style={{ cursor: 'default' }}>
                {cols.map((c) => {
                  const v = String(r[c.key] ?? '');
                  let cell: ReactNode;
                  if (c.render) cell = c.render(r);
                  else if (c.editable && onEdit) {
                    cell = <input className={'protect-cell' + (v ? '' : ' is-empty')} value={v} placeholder="Not set"
                      aria-label={`${c.group} ${c.header} for ${r.adUser || r.sam}`} onChange={(e) => onEdit(r.id, c.key, e.target.value)} />;
                  } else cell = v ? v : <span className="lf-na">—</span>;
                  return <td key={c.group + c.key}>{cell}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="protect-gt__foot">{footer}</div>}
    </section>
  );
}

const DEFAULT_SCHEDULE: SyncSchedule = { syncNow: true, scheduled: false, frequency: null, day: 'Sunday', time: '02:00' };

export function SourceWizard({ target, onClose, onDone }: { target: WizardTarget; onClose: () => void; onDone: (r: WizardResult) => void }) {
  const toast = useToast();
  const hrms = target.kind === 'hrms';
  const provider = hrms ? HRMS_PROVIDERS.find((p) => p.id === target.provider)! : null;
  const [step, setStep] = useState<Step>(target.edit ? 'review' : 'details');
  const [details, setDetails] = useState<WizardDetails>(() => ({ ...(target.existing?.details ?? {}) }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<IntegrationRow[]>(() => {
    if (!target.edit) return (hrms ? HRMS_INTEGRATION : AD_INTEGRATION).map((r) => ({ ...r }));
    if (hrms) return HRMS_EDIT_ROWS.map((r) => ({ ...r }));
    return (target.existing?.rows ?? AD_INTEGRATION).map((r, i) => ({ ...r, isNew: i < 2 }));
  });
  const [accepted, setAccepted] = useState<Set<string>>(() => new Set(rows.filter((r) => r.isNew).map((r) => r.id)));
  const [schedule, setSchedule] = useState<SyncSchedule>(() => ({ ...(target.existing?.schedule ?? DEFAULT_SCHEDULE) }));
  const [scanErr, setScanErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [upload, setUpload] = useState<string | null>(null);
  const [cont, setCont] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const suggestion = (id: string) => AD_MANAGER_SUGGESTIONS[Math.max(0, rows.findIndex((r) => r.id === id)) % AD_MANAGER_SUGGESTIONS.length];

  // Escape closes the wizard unless a dialog (DLG-SDS-68) is open above it.
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[data-overlay]')) onClose(); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  const providerFields: FieldDef[] = provider ? [...provider.fields.map((f) => ({ key: 'p.' + f.key, label: f.label, sample: f.sample, secret: f.secret })), { key: 'p.match', label: 'Match Attribute', select: true }] : [];
  const adFields: FieldDef[] = hrms
    ? [{ key: 'ad.domain', label: 'Domain Name/IP', sample: 'chily.com' }, { key: 'ad.user', label: 'User Name', sample: 'devl238@chily.com' },
      { key: 'ad.password', label: 'Password', secret: true }, { key: 'ad.match', label: 'Match Attribute', select: true }]
    : [{ key: 'ad.domain', label: 'Domain Name/IP', sample: 'cipherguard10.com' }, { key: 'ad.user', label: 'User Name', sample: 'William_m@cipherguard.com' },
      { key: 'ad.password', label: 'Password', secret: true }];

  const validateDetails = () => {
    const e: Record<string, string> = {};
    for (const f of [...providerFields, ...adFields]) {
      if (!(details[f.key] ?? '').trim()) e[f.key] = f.select ? 'Select a match attribute.' : `${f.label} is required.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const renderField = (f: FieldDef) => {
    const set = (v: string) => { setDetails((d) => ({ ...d, [f.key]: v })); if (errors[f.key]) setErrors(({ [f.key]: _, ...rest }) => rest); };
    const val = details[f.key] ?? '';
    if (f.select) return <SelectField key={f.key} label={f.label} value={val} placeholder="Select Any Preference" options={MATCH_ATTRIBUTES} error={errors[f.key]} onChange={set} />;
    if (f.secret) return <PasswordField key={f.key} label={f.label} value={val} placeholder={f.sample} error={errors[f.key]} onChange={set} autoComplete="new-password" />;
    return <TextField key={f.key} label={f.label} value={val} placeholder={f.sample} error={errors[f.key]} onChange={set} maxLength={255} />;
  };

  const edit = (id: string, key: keyof IntegrationRow, v: string) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: v } : r)));
  const missing = rows.filter((r) => !r.manager.trim()).length;

  /* columns */
  const reviewCols: GCol[] = useMemo(() => {
    const newMark = (r: IntegrationRow, text: string) => (
      <span className="row">{r.isNew && <Chip tone="brand">New</Chip>}{text || <span className="lf-na">—</span>}</span>
    );
    const managerCell = (r: IntegrationRow) => {
      const name = r.adUser || r.sam;
      return (
        <span className="row">
          <span>{r.manager || <span className="lf-na">—</span>}</span>
          {!hrms && r.isNew && <><Icon name="arrow" size={13} /><b>{suggestion(r.id)}</b></>}
          {r.isNew && <Checkbox checked={accepted.has(r.id)} ariaLabel={`Accept ${name}`}
            onChange={(on) => setAccepted((s) => { const n = new Set(s); if (on) n.add(r.id); else n.delete(r.id); return n; })} />}
        </span>
      );
    };
    const g = 'Active Directory';
    const base: GCol[] = [
      { key: 'adUser', header: hrms ? 'User Name' : 'Display Name', group: g, render: (r) => newMark(r, r.adUser) },
      { key: 'sam', header: 'sAMAccountName', group: g },
      { key: 'email', header: 'Email', group: g },
      { key: 'manager', header: 'Manager', group: g, render: managerCell },
    ];
    return hrms ? [...base, { key: 'hrUser', header: 'HRMS User Name', group: 'HRMS' }, { key: 'hrEmail', header: 'Email', group: 'HRMS' }] : base;
  }, [hrms, accepted, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const integrationCols: GCol[] = hrms
    ? [
      { key: 'adUser', header: 'User Name', group: 'Active Directory' }, { key: 'sam', header: 'sAMAccountName', group: 'Active Directory' },
      { key: 'email', header: 'Email', group: 'Active Directory' }, { key: 'manager', header: 'Manager', group: 'Active Directory', editable: true },
      { key: 'hrUser', header: 'User Name', group: 'HRMS', editable: true }, { key: 'hrEmail', header: 'Email', group: 'HRMS', editable: true },
    ]
    : [
      { key: 'adUser', header: 'Display Name', group: 'Active Directory' }, { key: 'sam', header: 'sAMAccount Name', group: 'Active Directory' },
      { key: 'email', header: 'Email', group: 'Active Directory', editable: true }, { key: 'manager', header: 'Manager', group: 'Active Directory', editable: true },
    ];

  /* actions */
  const applyUpdate = () => {
    const n = accepted.size;
    if (hrms) setRows((rs) => rs.filter((r) => !r.isNew || accepted.has(r.id)).map(({ isNew, ...r }) => r));
    else setRows((rs) => rs.map((r) => (r.isNew && accepted.has(r.id) ? { ...r, manager: suggestion(r.id), isNew: false } : { ...r, isNew: false })));
    toast({ variant: 'success', title: 'Active Directory update accepted', message: `${n} account change(s) applied.` });
    setStep('integration');
  };
  const done = () => {
    if (!schedule.syncNow && !schedule.scheduled) { setScanErr('Choose Sync Now, Schedule Sync, or both.'); return; }
    if (schedule.scheduled && !schedule.frequency) { setScanErr('Pick Weekly or Monthly for the schedule.'); return; }
    setScanErr(null);
    onDone({ domain: (details['ad.domain'] ?? '').trim() || target.existing?.domain || '', rows, schedule, details });
  };
  const next = () => {
    if (step === 'details') { if (validateDetails()) setStep('integration'); return; }
    if (step === 'review') { applyUpdate(); return; }
    if (step === 'integration') { setUpload(null); setCont(true); setReady(true); return; }
    done();
  };
  const back = () => {
    if (step === 'scan') setStep('integration');
    else if (step === 'integration') setStep(target.edit ? 'review' : 'details');
  };
  const downloadRows = () => {
    const csv = hrms
      ? toCsv(['User Name', 'sAMAccountName', 'Email', 'Manager', 'HRMS User Name', 'HRMS Email'], rows.map((r) => [r.adUser, r.sam, r.email, r.manager, r.hrUser, r.hrEmail]))
      : toCsv(['Display Name', 'sAMAccount Name', 'Email', 'Manager'], rows.map((r) => [r.adUser, r.sam, r.email, r.manager]));
    downloadText(hrms ? 'hrms-user-details.csv' : 'ad-user-details.csv', csv);
  };

  const title = hrms ? 'Configure HRMS Details' : 'Configure Active Directory';
  const heading = target.edit ? (hrms ? 'Configure HRMS Details (Edit)' : 'Edit Active Directory Configuration') : title;
  const stepIdx = step === 'details' ? 0 : step === 'scan' ? 2 : 1;
  const primary = step === 'review' ? 'Update' : step === 'scan' ? 'Done' : 'Next';
  const setSch = (p: Partial<SyncSchedule>) => { setSchedule((s) => ({ ...s, ...p })); setScanErr(null); };

  return (
    <>
      <div className="row row--between row--wrap">
        <button type="button" className="protect-back" onClick={onClose}><Icon name="chevron-left" size={15} />Back to Protect Settings</button>
        <nav className="protect-crumbs" aria-label="Wizard location">
          <button type="button" className="lf-link" onClick={onClose}>Protect Settings</button><span aria-hidden="true">/</span><b>{title}</b>
        </nav>
      </div>
      <Steps steps={[hrms ? 'HRMS Details' : 'Configure Active Directory', 'Integration', 'Scan Settings']} current={stepIdx} page />
      <section className="lf-card wiz-card page-form" aria-label={heading}>
        <div className="wiz-card__body">
          <div className="stack stack--sm">
            <h3 className="protect-heading">{heading}</h3>
            {step === 'integration' && hrms && <p className="protect-lead">Please integrate Active Directory and HRMS users.</p>}
            {step === 'scan' && <p className="protect-lead">Sync Configuration Setup for Team Management</p>}
          </div>

          {step === 'details' && hrms && provider && (
            <>
              <img className="protect-logo" src={provider.logo} alt={provider.label} />
              <div className="grid2">
                <div className="protect-group"><h4>{provider.label.split(' ')[0]} Details</h4>{providerFields.map(renderField)}</div>
                <div className="protect-group"><h4>Active Directory</h4>{adFields.map(renderField)}</div>
              </div>
            </>
          )}
          {step === 'details' && !hrms && (
            <>
              <Banner tone="warning"><b>Important:</b> When adding a manager attribute, use the following format: Manager should be sAMAccountName</Banner>
              <div className="protect-group form-col"><h4>Please enter the Domain credentials</h4>{adFields.map(renderField)}</div>
            </>
          )}

          {step === 'review' && (
            <>
              <Banner tone="info"><b>Important:</b> There is an update available for Active Directory. Do you want to accept it?</Banner>
              <GroupedTable cols={reviewCols} rows={rows} footer={`Total Records - ${rows.length}`} />
            </>
          )}

          {step === 'integration' && (
            <GroupedTable key="integration" cols={integrationCols} rows={rows} filterable onEdit={edit}
              footer={`Total Records - ${rows.length}${missing ? ` · ${missing} without a manager` : ''}`} />
          )}

          {step === 'scan' && (
            <div className="form-col">
              <Checkbox label="Sync Now" checked={schedule.syncNow} onChange={(v) => setSch({ syncNow: v })} />
              <div className="row row--wrap" style={{ gap: 14 }}>
                <Checkbox label="Schedule Sync" checked={schedule.scheduled} onChange={(v) => setSch({ scheduled: v })} />
                <div className="protect-pills" role="group" aria-label="Sync frequency">
                  {(['Weekly', 'Monthly'] as const).map((f) => (
                    <Button key={f} size="sm" className="protect-pill" aria-pressed={schedule.frequency === f} disabled={!schedule.scheduled}
                      onClick={() => setSch({ frequency: f, day: f === 'Weekly' ? 'Sunday' : '1' })}>{f}</Button>
                  ))}
                </div>
              </div>
              {schedule.scheduled && schedule.frequency && (
                <div className="fld-row">
                  <SelectField label={schedule.frequency === 'Weekly' ? 'Day' : 'Day of month'} value={schedule.day}
                    options={schedule.frequency === 'Weekly' ? WEEK_DAYS : MONTH_DAYS} onChange={(v) => setSch({ day: v })} />
                  <SelectField label="Time" value={schedule.time} options={HOURS} onChange={(v) => setSch({ time: v })} />
                </div>
              )}
              <div className="fld">
                <span className="fld__lbl">Scan Schedule Status</span>
                <div className="protect-statusbox" aria-live="polite">{scheduleText(schedule)}</div>
              </div>
              {scanErr && <p className="protect-err" role="alert">{scanErr}</p>}
            </div>
          )}
        </div>
        <footer className="wiz-card__foot">
          {step !== 'review' && <Button icon="chevron-left" disabled={step === 'details'} onClick={back}>Back</Button>}
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" iconEnd={step === 'scan' ? undefined : 'arrow'} onClick={next}>{primary}</Button>
        </footer>
      </section>

      <Modal open={ready} onClose={() => setReady(false)} size="sm" icon="users" title={`Ready to Sync ${rows.length} Users?`}
        footer={<>
          <Button onClick={() => setReady(false)}>Cancel</Button>
          <Button variant="primary" disabled={!cont && !upload} onClick={() => { setReady(false); setStep('scan'); }}>Done</Button>
        </>}>
        <p className="protect-lead">Sync Now or Download to modify and re-upload the list.</p>
        {missing > 0 && <Banner tone="warning">Including the missing manager allocation improves Protect's usability.</Banner>}
        <div className="row row--wrap">
          <Button icon="upload" onClick={() => fileRef.current?.click()}>Upload modified user list</Button>
          {upload && <Chip icon="file">{upload}</Chip>}
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => {
            const f = e.target.files?.[0]; e.target.value = '';
            if (!f) return;
            setUpload(f.name); setCont(false);
            toast({ variant: 'success', title: 'List uploaded', message: `${f.name} will be used for this sync.` });
          }} />
        </div>
        <button type="button" className="lf-link" style={{ alignSelf: 'flex-start', fontWeight: 600 }} onClick={downloadRows}>Download User details (CSV)</button>
        <Checkbox label="Continue without uploading CSV" checked={cont} onChange={setCont} />
      </Modal>
    </>
  );
}
