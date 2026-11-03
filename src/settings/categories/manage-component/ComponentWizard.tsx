import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Button, EmptyState, Field, Icon, IconButton, Modal, PasswordField, RadioGroup, SelectField, TextField, Toggle, useToast,
} from '../../../ui';
import {
  AUDIT_MODES, CLOUD_FAMILIES, CLOUD_FIELDS, COPILOT_EMAIL_FIELD, DATABASES, EXCHANGE_OPERATIONS, FAMILY_LABEL, FAMILY_LOGO, FIELD_TIPS,
  HELP_STEPS, KIND_LABEL, KIND_LOGO, M365_APPS, MAILBOXES, SHAREPOINT_OBJECTS, SHAREPOINT_OPERATIONS, SUBSCRIPTION_TYPES, TENANT_FIELDS,
  connectedStamp, isCloud, mcStore, newConnId,
} from './store';
import type { AuditScope, Connection, CredentialField, DatabaseSettings, Family, ListRow, M365App, ScopeMode, WizardReq } from './store';

/* DLG-SDS-35 Component wizard (full page) + DLG-SDS-36 help steps. */

type StepId = 'type' | 'apps' | 'creds' | 'objects' | 'operations' | 'db';
const STEP_LABEL: Record<StepId, string> = {
  type: 'Select Data Source', apps: 'Select Components', creds: 'Component Credential', objects: 'Object Configuration', operations: 'Operations', db: 'Database Settings',
};
const stepsFor = (f: Family): StepId[] =>
  isCloud(f) ? ['type', 'creds', 'db'] : f === 'm365' ? ['apps', 'creds', 'db'] : ['creds', 'objects', 'operations', 'db'];
const stepLabel = (f: Family, s: StepId) => (s === 'creds' && (f === 'exchange' || f === 'sharepoint') ? 'Component Credentials' : STEP_LABEL[s]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const Img = ({ src, size = 26 }: { src: string; size?: number }) => <img src={src} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: 'contain' }} />;

function emptyFields(f: Family, copilot = false): Record<string, string> {
  if (isCloud(f)) return Object.fromEntries(CLOUD_FIELDS[f].map((x) => [x.key, '']));
  const o: Record<string, string> = { tenant: '', subscription: SUBSCRIPTION_TYPES[0], clientId: '', secretKey: '' };
  if (copilot) o.email = '';
  return o;
}
const emptyDb = (f: Family): DatabaseSettings => ({
  server: '', auth: isCloud(f) ? 'windows' : 'sql', user: '', password: '', mode: 'create', name: '', chatRetention: false, retentionDays: '90',
});

export default function ComponentWizard({ req, onCancel, onSaved }: { req: WizardReq; onCancel: () => void; onSaved: (c: Connection, edit: boolean) => void }) {
  const toast = useToast();
  const all = mcStore.use((s) => s.connections);
  const editing = req.mode === 'edit' ? all.find((c) => c.id === req.editId) ?? null : null;
  const edit = !!editing;

  const [family, setFamily] = useState<Family>(editing?.family ?? req.family);
  const [apps, setApps] = useState<M365App[]>(() => editing ? [...editing.apps]
    : req.kind === 'copilot' ? [...M365_APPS] : req.kind && (M365_APPS as string[]).includes(req.kind) ? [req.kind as M365App] : []);
  const [fields, setFields] = useState<Record<string, string>>(() => editing ? { ...editing.fields } : emptyFields(req.family, req.kind === 'copilot'));
  const [validated, setValidated] = useState(edit);
  const [validating, setValidating] = useState(false);
  const [objects, setObjects] = useState<AuditScope>(() => editing ? { ...editing.objects, items: [...editing.objects.items] } : { mode: 'all', items: [] });
  const [operations, setOperations] = useState<AuditScope>(() => editing ? { ...editing.operations, items: [...editing.operations.items] } : { mode: 'all', items: [] });
  const [db, setDb] = useState<DatabaseSettings>(() => editing ? { ...editing.database } : emptyDb(req.family));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [help, setHelp] = useState<Family | null>(null);

  const steps = stepsFor(family);
  const cloud = isCloud(family);
  const firstReachable = cloud && edit ? 1 : 0;
  const [step, setStep] = useState(() => (isCloud(req.family) ? 1 : 0));
  const [furthest, setFurthest] = useState(() => (edit ? stepsFor(req.family).length - 1 : isCloud(req.family) ? 1 : 0));
  const cur = steps[step];
  const fl = FAMILY_LABEL[family];
  const copilot = family === 'm365' && apps.includes('copilot');
  const last = step === steps.length - 1;

  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => { window.scrollTo?.({ top: 0 }); }, []);
  // Escape closes unless the help dialog is open
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[data-overlay]') && !document.querySelector('.pop')) onCancel(); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, [onCancel]);

  const title = edit
    ? (family === 'm365' ? 'Edit Data Source for Microsoft 365 Directory' : `Edit Credentials for ${fl}`)
    : family === 'm365' ? 'Data Source for Microsoft 365 Directory'
      : cloud ? (cur === 'type' ? 'Cloud Components' : fl) : `Add Credentials for ${fl}`;

  /* ---------- field lists ---------- */
  const credFields: CredentialField[] = cloud ? CLOUD_FIELDS[family] : copilot ? [...TENANT_FIELDS, COPILOT_EMAIL_FIELD] : TENANT_FIELDS;
  const nameKey = cloud ? 'server' : 'tenant';

  const setField = (k: string, v: string) => {
    setFields((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
    if (cloud) setValidated(false);
  };

  /* ---------- validation ---------- */
  const credErrors = () => {
    const e: Record<string, string> = {};
    for (const f of credFields) {
      if (f.key === 'subscription') continue;
      const v = (fields[f.key] ?? '').trim();
      if (!v) { e[f.key] = `${f.label} is required.`; continue; }
      if (f.key === 'email' && !EMAIL.test(v)) e[f.key] = 'Enter a valid email address.';
    }
    const name = (fields[nameKey] ?? '').trim();
    if (name && !e[nameKey] && all.some((c) => c.family === family && c.id !== editing?.id && c.name.toLowerCase() === name.toLowerCase())) {
      e[nameKey] = `A ${fl} component named "${name}" is already added.`;
    }
    return e;
  };
  const dbErrors = (onlyConnection = false) => {
    const e: Record<string, string> = {};
    if (!db.server.trim()) e.dbServer = 'Server name is required.';
    if (db.auth === 'sql' && !db.user.trim()) e.dbUser = 'User name is required for SQL Authentication.';
    if (db.auth === 'sql' && !db.password) e.dbPassword = 'Password is required for SQL Authentication.';
    if (onlyConnection) return e;
    if (db.mode === 'create' && !db.name.trim()) e.dbName = 'Enter a name for the new database.';
    if (db.mode === 'select' && !db.name) e.dbName = 'Select a database.';
    if (copilot && db.chatRetention && !(Number(db.retentionDays) >= 1)) e.dbDays = 'Enter the number of days.';
    return e;
  };
  const scopeError = (s: StepId) => {
    const scope = s === 'objects' ? objects : operations;
    if (scope.mode === 'all' || scope.items.length) return null;
    if (s === 'operations') return 'Select at least one operation.';
    return family === 'exchange' ? 'Select at least one mailbox.' : 'Select at least one object.';
  };
  /** Validates the current step; returns true when the user may move on. */
  const validateStep = (s: StepId): boolean => {
    let e: Record<string, string> = {};
    if (s === 'apps' && apps.length === 0) e.apps = 'Select at least one component to audit.';
    if (s === 'creds') e = credErrors();
    if (s === 'objects' || s === 'operations') { const m = scopeError(s); if (m) e[s] = m; }
    if (s === 'db') e = dbErrors();
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], .fld.is-bad input, .fld.is-bad select, .fld.is-bad button')?.focus());
      return false;
    }
    if (s === 'creds' && cloud && !validated) {
      toast({ variant: 'warning', title: 'Validate the information', message: 'Click Validate Information to verify the credentials before continuing.' });
      return false;
    }
    return true;
  };

  const go = (i: number) => {
    if (i === step) return;
    if (i < step) { setErrors({}); setStep(i); return; }
    if (!validateStep(cur)) return;
    setStep(i); setFurthest((f) => Math.max(f, i)); setErrors({});
  };

  const finish = () => {
    if (!validateStep('db')) return;
    const name = (fields[nameKey] ?? '').trim();
    const keys = credFields.map((f) => f.key);
    const conn: Connection = {
      id: editing?.id ?? newConnId(), family, name,
      apps: family === 'm365' ? M365_APPS.filter((a) => apps.includes(a)) : [],
      fields: Object.fromEntries(keys.map((k) => [k, (fields[k] ?? '').trim()])),
      objects: family === 'exchange' || family === 'sharepoint' ? objects : { mode: 'all', items: [] },
      operations: family === 'exchange' || family === 'sharepoint' ? operations : { mode: 'all', items: [] },
      database: { ...db, server: db.server.trim(), user: db.user.trim(), name: db.name.trim(), retentionDays: db.retentionDays.trim() || '90' },
      connectedOn: connectedStamp(),
    };
    onSaved(conn, edit);
  };

  const validateInfo = () => {
    const e = credErrors(); setErrors(e);
    if (Object.keys(e).length) return;
    setValidating(true);
    window.setTimeout(() => {
      setValidating(false); setValidated(true);
      toast({ variant: 'success', title: 'Information validated', message: `Lepide can connect to ${fl} as ${(fields[nameKey] ?? '').trim()}.` });
    }, 700);
  };

  const testConnection = () => {
    const e = dbErrors(true);
    setErrors((prev) => { const n = { ...prev }; delete n.dbServer; delete n.dbUser; delete n.dbPassword; return { ...n, ...e }; });
    if (Object.keys(e).length) return;
    toast({ variant: 'success', title: 'Connection successful', message: `Connected to SQL Server ${db.server.trim()}.` });
  };

  const setDbField = (patch: Partial<DatabaseSettings>, clear: string[]) => {
    setDb((d) => ({ ...d, ...patch }));
    setErrors((e) => { const n = { ...e }; clear.forEach((k) => delete n[k]); return n; });
  };

  /* ---------- step bodies ---------- */
  let body: ReactNode = null;
  if (cur === 'type') {
    body = (
      <>
        <h4 className="manage-component-step-title">Please Select Any component to configure</h4>
        <div className="pick-grid manage-component-tiles" role="group" aria-label="Cloud components">
          {CLOUD_FAMILIES.map((f) => (
            <button key={f} type="button" className="pick manage-component-tile" aria-pressed={family === f} disabled={edit}
              onClick={() => { if (f === family) return; setFamily(f); setFields(emptyFields(f)); setValidated(false); setErrors({}); }}>
              <span className="pick__ic"><Img src={FAMILY_LOGO[f]} /></span>
              <span className="pick__text"><b>{FAMILY_LABEL[f]}</b></span>
              {family === f && <span className="pick__check" aria-hidden="true"><Icon name="check" /></span>}
            </button>
          ))}
        </div>
      </>
    );
  } else if (cur === 'apps') {
    const toggleApp = (a: M365App) => {
      setErrors({});
      setApps((xs) => xs.includes(a) ? xs.filter((x) => x !== a && x !== 'copilot') : [...xs, a]);
    };
    body = (
      <>
        <div className="manage-component-copilot">
          <span className="pick__ic"><Img src={KIND_LOGO.copilot} /></span>
          <div className="grow">
            <b>{KIND_LABEL.copilot}</b>
            <span className="row manage-component-copilot__apps" aria-label="Uses OneDrive, Azure and Microsoft Teams">
              {(['onedrive', 'azure', 'teams'] as const).map((a) => <Img key={a} src={KIND_LOGO[a]} size={18} />)}
            </span>
          </div>
          <span className="row"><span className="text-sm muted">Audit Copilot</span>
            <Toggle label="Audit Copilot" checked={apps.includes('copilot')}
              onChange={(v) => { setErrors({}); setApps(v ? [...M365_APPS] : apps.filter((x) => x !== 'copilot')); if (v) setFields((f) => ({ ...f, email: f.email ?? '' })); }} />
          </span>
        </div>
        <Field error={errors.apps}>
          <div className="pick-grid manage-component-tiles" role="group" aria-label="Microsoft 365 components" aria-invalid={!!errors.apps || undefined}>
            {(['onedrive', 'azure', 'teams'] as const).map((a) => (
              <button key={a} type="button" className="pick manage-component-tile" aria-pressed={apps.includes(a)} onClick={() => toggleApp(a)}>
                <span className="pick__ic"><Img src={KIND_LOGO[a]} /></span>
                <span className="pick__text"><b>{KIND_LABEL[a]}</b></span>
                {apps.includes(a) && <span className="pick__check" aria-hidden="true"><Icon name="check" /></span>}
              </button>
            ))}
          </div>
        </Field>
      </>
    );
  } else if (cur === 'creds') {
    body = (
      <>
        {cloud && <h4 className="manage-component-step-title">{edit ? 'Edit' : 'Add'} credential for {fl}</h4>}
        <div className="manage-component-fields">
          {credFields.map((f) => {
            if (f.key === 'subscription') {
              return <SelectField key={f.key} label={f.label} value={fields.subscription ?? SUBSCRIPTION_TYPES[0]} options={SUBSCRIPTION_TYPES}
                onChange={(v) => setField('subscription', v)} />;
            }
            const tip = FIELD_TIPS[f.key] && !(cloud && f.key === 'clientId') ? FIELD_TIPS[f.key] : null;
            const helpBtn = cloud && f.info && (family === 'dropbox' || family === 'gsuite') && !tip;
            const label = (
              <span className="row" style={{ gap: 6 }}>{f.label}
                {tip && <span className="manage-component-info" tabIndex={0} role="img" aria-label={`About ${f.label}: ${tip}`} data-tip={tip}><Icon name="info" size={14} /></span>}
                {helpBtn && <button type="button" className="manage-component-info" aria-label={`How to get the ${f.label}`} onClick={() => setHelp(family)}><Icon name="info" size={14} /></button>}
              </span>
            );
            const common = {
              label, value: fields[f.key] ?? '', maxLength: 256, placeholder: f.placeholder, error: errors[f.key],
              help: f.note, onChange: (v: string) => setField(f.key, v), autoComplete: 'off',
            };
            return f.secret ? <PasswordField key={f.key} {...common} /> : <TextField key={f.key} {...common} />;
          })}
        </div>
        {cloud && (
          <div className="row row--wrap">
            <Button variant="primary" loading={validating} onClick={validateInfo}>Validate information</Button>
            {validated && !validating && <span className="manage-component-ok"><Icon name="check" size={14} />Information validated</span>}
          </div>
        )}
      </>
    );
  } else if (cur === 'objects' || cur === 'operations') {
    const isObj = cur === 'objects';
    const rows: ListRow[] = family === 'exchange' ? (isObj ? MAILBOXES : EXCHANGE_OPERATIONS) : (isObj ? SHAREPOINT_OBJECTS : SHAREPOINT_OPERATIONS);
    const cols = family === 'exchange'
      ? (isObj ? ['Mailbox(es)', 'Email ID'] : ['Object List', 'Description'])
      : [isObj ? 'Object List' : 'Operation List'];
    body = (
      <>
        <h4 className="manage-component-step-title">{isObj ? (family === 'exchange' ? 'Select Mailbox(es) to audit' : 'Select Object to audit') : 'Select Operation to audit'}</h4>
        <AuditList key={cur} rows={rows} cols={cols} search={family === 'exchange' && !isObj} scope={isObj ? objects : operations}
          error={errors[cur]} onChange={(s) => { (isObj ? setObjects : setOperations)(s); setErrors({}); }} />
      </>
    );
  } else if (cur === 'db') {
    body = (
      <>
        <h4 className="manage-component-step-title">Database Settings</h4>
        <div className="manage-component-fields">
          <TextField label={family === 'm365' ? 'SQL Server' : 'Server Name'} value={db.server} maxLength={128} placeholder="e.g. 192.168.30.92"
            error={errors.dbServer} onChange={(v) => setDbField({ server: v }, ['dbServer'])} />
          <Field label="Authentication type">
            <RadioGroup row ariaLabel="Authentication type" value={db.auth}
              options={[{ value: 'windows', label: 'Windows authentication' }, { value: 'sql', label: 'SQL Authentication (Recommended)' }]}
              onChange={(v) => setDbField(v === 'windows' ? { auth: 'windows', user: '', password: '' } : { auth: 'sql' }, ['dbUser', 'dbPassword'])} />
          </Field>
          <div className="manage-component-two">
            <TextField label="User Name" value={db.user} maxLength={256} disabled={db.auth === 'windows'} error={errors.dbUser}
              placeholder={db.auth === 'windows' ? 'Uses the signed-in Windows account' : 'e.g. DevSoft001\\David'} onChange={(v) => setDbField({ user: v }, ['dbUser'])} />
            <PasswordField label="Password" value={db.password} maxLength={256} disabled={db.auth === 'windows'} error={errors.dbPassword}
              onChange={(v) => setDbField({ password: v }, ['dbPassword'])} />
          </div>
          <div><Button variant="primary" icon="plug" onClick={testConnection}>Test connection</Button></div>
          <Field label="Database">
            <RadioGroup row ariaLabel="Database" value={db.mode}
              options={[{ value: 'create', label: 'Create database' }, { value: 'select', label: 'Select database' }]}
              onChange={(v) => setDbField({ mode: v as 'create' | 'select', name: '' }, ['dbName'])} />
          </Field>
          {db.mode === 'create'
            ? <TextField label="Create database" value={db.name} maxLength={128} placeholder="e.g. Richard_Data1" error={errors.dbName} onChange={(v) => setDbField({ name: v }, ['dbName'])} />
            : <SelectField label="Select database" value={db.name} placeholder="Select" options={DATABASES} error={errors.dbName} onChange={(v) => setDbField({ name: v }, ['dbName'])} />}
          {copilot && (
            <div className="manage-component-retention">
              <span className="row"><Toggle label="Chat retention" checked={db.chatRetention} onChange={(v) => setDbField({ chatRetention: v }, ['dbDays'])} /><b className="text-sm">Chat Retention</b></span>
              <TextField label="days" value={db.retentionDays} disabled={!db.chatRetention} inputMode="numeric" maxLength={4} error={errors.dbDays}
                onChange={(v) => setDbField({ retentionDays: v.replace(/\D/g, '').slice(0, 4) }, ['dbDays'])} />
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="stack manage-component-wiz">
      <div className="row row--between">
        <div>
          <p className="manage-component-eyebrow">Step {step + 1} of {steps.length} · {stepLabel(family, cur)}</p>
          <h3 className="manage-component-title">{title}</h3>
        </div>
        <IconButton icon="x" label="Close" bordered onClick={onCancel} />
      </div>
      <section className="lf-card wiz-card page-form">
        <div className="manage-component-wiz__grid">
          <nav className="tabs manage-component-rail" aria-label="Wizard steps">
            {steps.map((s, i) => (
              <button key={s} type="button" aria-current={i === step ? 'step' : undefined}
                disabled={i > furthest + 1 || (cloud && edit && s === 'type')} onClick={() => go(i)}>
                <span className="manage-component-rail__n">{i < step || (i <= furthest && i !== step) ? <Icon name="check" size={12} /> : i + 1}</span>{stepLabel(family, s)}
              </button>
            ))}
          </nav>
          <div className="wiz-card__body" ref={bodyRef}>{body}</div>
        </div>
        <footer className="wiz-card__foot">
          {step > firstReachable && <Button icon="chevron-left" onClick={() => go(step - 1)}>Back</Button>}
          <span className="spacer" />
          <Button onClick={onCancel}>Cancel</Button>
          {last
            ? <Button variant="primary" onClick={finish}>{edit ? 'Save' : 'Done'}</Button>
            : <Button variant="primary" iconEnd="arrow" onClick={() => go(step + 1)}>Next</Button>}
        </footer>
      </section>
      {help && <HelpDialog family={help} onClose={() => setHelp(null)} />}
    </div>
  );
}

/* ---------------- AuditListStep ---------------- */
function AuditList({ rows, cols, search, scope, onChange, error }: {
  rows: ListRow[]; cols: string[]; search: boolean; scope: AuditScope; onChange: (s: AuditScope) => void; error?: string;
}) {
  const [q, setQ] = useState<[string, string]>(['', '']);
  const allMode = scope.mode === 'all';
  const shown = useMemo(() => rows.filter((r) =>
    (!q[0] || r.name.toLowerCase().includes(q[0].toLowerCase())) && (!q[1] || r.desc.toLowerCase().includes(q[1].toLowerCase()))), [rows, q]);
  const ticked = (n: string) => allMode || scope.items.includes(n);
  const allVisible = shown.length > 0 && shown.every((r) => ticked(r.name));
  const someVisible = shown.some((r) => ticked(r.name));
  const setItems = (items: string[]) => onChange({ ...scope, items });
  return (
    <div className="stack stack--sm">
      <div className="row row--wrap" style={{ alignItems: 'flex-end', gap: 12 }}>
        <SelectField label="Audit" value={scope.mode} options={AUDIT_MODES} className="manage-component-mode"
          onChange={(v) => onChange({ mode: v as ScopeMode, items: v === 'all' ? [] : scope.items })} />
        {!allMode && <span className="count-chip manage-component-count">{scope.items.length} selected</span>}
      </div>
      <Field error={error}>
        <section className="lf-card tablecard tablecard--flat tablecard--static manage-component-list">
          <div className="tbl-wrap">
            <table className="lf-table lf-table--auto" aria-label={cols[0]} aria-invalid={!!error || undefined}>
              <thead>
                <tr>
                  <th className="th-check">
                    <label className="lf-check">
                      <input type="checkbox" aria-label="Select all rows" disabled={allMode} checked={allVisible}
                        ref={(el) => { if (el) el.indeterminate = someVisible && !allVisible; }}
                        onChange={() => {
                          const names = shown.map((r) => r.name);
                          setItems(allVisible ? scope.items.filter((x) => !names.includes(x)) : Array.from(new Set([...scope.items, ...names])));
                        }} />
                      <span className="lf-check__box" aria-hidden="true" />
                    </label>
                  </th>
                  {cols.map((c) => <th key={c}>{c}</th>)}
                </tr>
                {search && (
                  <tr className="filter-row">
                    <th />
                    {cols.map((c, i) => (
                      <th key={c}>
                        <span className={'filter-input' + (q[i] ? ' has-value' : '')}><Icon name="search" size={12} />
                          <input value={q[i]} maxLength={100} placeholder="Search" aria-label={`Search ${c}`}
                            onChange={(e) => setQ((x) => (i === 0 ? [e.target.value, x[1]] : [x[0], e.target.value]))} /></span>
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.name} className="lf-row" style={{ cursor: allMode ? 'default' : 'pointer' }}>
                    <td className="td-check">
                      <label className="lf-check">
                        <input type="checkbox" aria-label={r.name} disabled={allMode} checked={ticked(r.name)}
                          onChange={() => setItems(scope.items.includes(r.name) ? scope.items.filter((x) => x !== r.name) : [...scope.items, r.name])} />
                        <span className="lf-check__box" aria-hidden="true" />
                      </label>
                    </td>
                    <td>{r.name}</td>
                    {cols.length > 1 && <td>{r.desc || <span className="lf-na">—</span>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && <EmptyState compact icon="search" title="No results match your search or filters." />}
          </div>
        </section>
      </Field>
    </div>
  );
}

/* ---------------- DLG-SDS-36 ---------------- */
function HelpDialog({ family, onClose }: { family: Family; onClose: () => void }) {
  const steps = HELP_STEPS[family] ?? [];
  return (
    <Modal open onClose={onClose} icon="info" size="md"
      title={family === 'dropbox' ? 'Steps to create a token:' : 'Steps to create a Client ID and Secret Key:'}
      footer={<Button variant="primary" onClick={onClose}>Close</Button>}>
      <div className="row"><Img src={FAMILY_LOGO[family]} size={32} /><b>{FAMILY_LABEL[family]}</b></div>
      <ol className="manage-component-help">
        {steps.map((s, i) => {
          const sub = /^[a-d]\.\s/.test(s);
          const strong = s.startsWith('**');
          return (
            <li key={i} className={sub ? 'manage-component-help__sub' : undefined}>
              {strong ? <b>{s.replace(/^\*\*/, '')}</b> : s}
            </li>
          );
        })}
      </ol>
    </Modal>
  );
}
