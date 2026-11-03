import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Button, Checkbox, Chip, DataTable, Dropdown, EmptyState, Icon, IconButton, Menu, PasswordField, SelectField, TextField, useToast,
} from '../../../ui';
import { CheckTable, SubHeader } from './shared';
import { AddServerDialog, DatabaseSettingsDialog } from './DbDialogs';
import { ImportCsvDialog, SelectFileServersDialog, SelectFoldersDialog, SiteUrlDialog } from './NasDialogs';
import type { NewFolder } from './NasDialogs';
import { ScheduleDialog } from './ScheduleDialog';
import {
  AD_SERVERS, APPLY_TO, EXCHANGE_DOMAINS, SPO_SITES, SPP_SITES, TENANTS, downloadText, plural, scheduleSummary, toCsv, useAgents,
} from './store';
import type { DataSet, DbMapping, FolderRow, ScanSchedule, TrustSource } from './store';
import { uid } from '../../../stores/createStore';

/* DLG-SDS-37 · Data Set wizard, drawn as the Lepide Design System full-page wizard (04 § 10) inside the source page. */

type Cred = { key: string; label: string; secret?: boolean; select?: boolean };
const CREDS: Partial<Record<TrustSource['kind'], Cred[]>> = {
  aws: [{ key: 'server', label: 'Server Name' }, { key: 'accessKey', label: 'AWS Access Key' }, { key: 'secretKey', label: 'AWS Secret Key', secret: true }],
  azure: [{ key: 'tenant', label: 'Tenant Name', select: true }, { key: 'clientId', label: 'Client ID' }, { key: 'secret', label: 'Secret Key', secret: true }, { key: 'thumbprint', label: 'Thumbprint' }],
  'exchange-online': [{ key: 'tenant', label: 'Tenant Name', select: true }, { key: 'clientId', label: 'Client ID' }, { key: 'thumbprint', label: 'Thumbprint', secret: true }],
  'sharepoint-online': [{ key: 'tenant', label: 'Tenant Name', select: true }, { key: 'clientId', label: 'Client ID' }, { key: 'secret', label: 'Secret Key', secret: true }, { key: 'thumbprint', label: 'Thumbprint', secret: true }],
};

type Draft = {
  name: string; description: string; config: Record<string, string>; objects: string[]; validated: boolean; sites: string[];
  folders: FolderRow[]; mappings: DbMapping[]; scanNow: boolean; scheduled: boolean; schedule: ScanSchedule | null;
  remote: boolean; agent: string; nested: { controller: string; user: string; password: string };
};
const VALIDATE_BTN = '[data-nudge="validate-creds"]';
type Err = { title: string; message: string; step: number; bad: string[]; anchor?: string };

function initialDraft(src: TrustSource, ds?: DataSet): Draft {
  const sites = src.kind === 'sharepoint-onprem' ? Array.from(new Set([...SPP_SITES, ...(ds?.objects ?? [])])) : [];
  if (!ds) {
    return {
      name: '', description: '', config: src.kind === 'ad' ? { scanAd: '1' } : {}, objects: [], validated: false, sites,
      folders: [], mappings: [], scanNow: false, scheduled: true, schedule: null, remote: false, agent: '',
      nested: { controller: '', user: '', password: '' },
    };
  }
  return {
    name: ds.name, description: ds.description, config: { ...ds.config }, objects: [...ds.objects], validated: !!CREDS[src.kind], sites,
    folders: ds.folders.map((f) => ({ ...f })), mappings: ds.mappings.map((m) => ({ ...m })), scanNow: ds.scanNow,
    scheduled: !!ds.schedule, schedule: ds.schedule, remote: ds.remoteAgent, agent: ds.remoteAgent ? ds.agent : '',
    nested: { controller: ds.nested?.controller ?? '', user: ds.nested?.user ?? '', password: '' },
  };
}

export function DataSetWizard({ source, editing, onClose, onSave }: {
  source: TrustSource; editing?: DataSet; onClose: () => void; onSave: (ds: DataSet, opts: { created: boolean }) => void;
}) {
  const toast = useToast();
  const agents = useAgents();
  const nas = source.kind === 'nas';
  const steps = nas ? ['Data Set & Object Selection', 'Database Mapping', 'Permission Scanning Options'] : ['Component and Server Information', 'Scan Options'];
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(() => initialDraft(source, editing));
  const [bad, setBad] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [dlg, setDlg] = useState<'' | 'sched' | 'agent' | 'shares' | 'csv' | 'folders' | 'site' | 'db'>('');
  const [schedType, setSchedType] = useState<ScanSchedule['type']>('Daily');
  const [mapSel, setMapSel] = useState<string[]>([]);
  const [filter, setFilter] = useState<Record<string, string>>({});
  const set = (p: Partial<Draft>) => { setD((x) => ({ ...x, ...p })); setBad([]); };
  const setCfg = (k: string, v: string) => setD((x) => ({ ...x, config: { ...x.config, [k]: v }, validated: CREDS[source.kind]?.some((c) => c.key === k) ? false : x.validated }));
  const isBad = (k: string) => bad.includes(k);
  const crumb = editing ? 'Modify Data Set & Object Selection' : 'Create New Data Set & Object Selection';

  // Escape closes, unless a nested dialog or menu is open.
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[data-overlay], .pop')) onClose(); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  const fileServers = useMemo(() => Array.from(new Set(d.folders.map((f) => f.server))), [d.folders]);

  /* ---------- validation per step ---------- */
  const validate = (i: number): Err | null => {
    const e = (title: string, message: string, b: string[] = []): Err => ({ title, message, step: i, bad: b });
    const last = steps.length - 1;
    if (i === 0) {
      if (!d.name.trim()) return e('Data Set', 'Please enter the data set name.', ['name']);
      if (nas) return d.folders.length ? null : e('Data Set', 'Please add at least one folder with Add From.');
      const creds = CREDS[source.kind];
      if (creds) {
        const empty = creds.filter((c) => !(d.config[c.key] ?? '').trim()).map((c) => c.key);
        if (empty.length) return e('Data Set', 'Please fill in all the credentials.', empty);
        if (!d.validated) return { ...e('Data Set', 'Validate the credentials before you continue.'), anchor: VALIDATE_BTN };
        if (source.kind === 'sharepoint-online' && !d.objects.length) return e('Data Set', 'Please select at least one site collection URL.');
        return null;
      }
      if (source.kind === 'ad') {
        if (!d.config.scanAd && !d.config.scanGpo) return e('Data Set', 'Please choose Scan Active Directory and/or Scan Group Policy.');
        if (!d.objects.length) return e('Data Set', 'Please select at least one server.');
      }
      if (source.kind === 'exchange-onprem' && d.objects.length !== 1) return e('Data Set', 'Please select a domain.');
      if (source.kind === 'sharepoint-onprem') {
        if (!d.config.tenant) return e('Data Set', 'Please select the tenant name.', ['tenant']);
        if (!d.objects.length) return e('Data Set', 'Please select at least one site collection URL.');
      }
      return null;
    }
    if (nas && i === 1) {
      const missing = fileServers.filter((s) => !d.mappings.some((m) => m.server === s));
      return missing.length ? e('Database Mapping', `Please add a database for ${missing.join(', ')}.`) : null;
    }
    if (i === last) {
      if (!d.scanNow && !d.scheduled) return e('Scan Options', 'Please choose Scan Now and/or Schedule Scan.');
      if (d.scheduled && !d.schedule) return e('Scan Options', 'Please set a Daily, Weekly or Monthly schedule.', ['schedule']);
      if (d.remote && !d.agent) return e('Scan Options', 'Please select the agent location/IP or add an agent.', ['agent']);
    }
    return null;
  };
  const fail = (err: Err) => {
    setStep(err.step); setBad(err.bad);
    if (!err.anchor) { toast({ variant: 'error', title: err.title, message: err.message }); return; }
    // Point at the control that fixes it, once the step that holds it has rendered.
    setTimeout(() => toast({ variant: 'error', title: err.title, message: err.message, anchor: err.anchor,
      actions: [{ label: 'Validate now', primary: true, onClick: validateCreds }] }), 0);
  };
  const goTo = (target: number) => {
    if (target <= step) { setStep(target); setBad([]); return; }
    for (let i = step; i < target; i++) { const err = validate(i); if (err) { fail(err); return; } }
    setStep(target); setBad([]);
  };
  const finish = () => {
    for (let i = 0; i < steps.length; i++) { const err = validate(i); if (err) { fail(err); return; } }
    const sched = d.scheduled ? d.schedule : null;
    const config = { ...d.config };
    const ds: DataSet = {
      id: editing?.id ?? uid('ds'), name: d.name.trim(), description: d.description.trim(), config,
      objects: nas ? [] : d.objects, folders: nas ? d.folders : [], mappings: nas ? d.mappings.filter((m) => fileServers.includes(m.server)) : [],
      scanNow: d.scanNow, schedule: sched, remoteAgent: d.remote, agent: d.remote ? d.agent : 'Local',
      nested: nas && d.nested.controller.trim() ? { controller: d.nested.controller.trim(), user: d.nested.user.trim() } : undefined,
      lastScan: editing?.lastScan ?? '—', nextScan: sched ? `${sched.startOn} ${sched.time}` : 'Never',
      status: sched ? 'Scheduled' : editing?.status && editing.status !== 'Running' ? editing.status : 'Not Scanned',
    };
    onSave(ds, { created: !editing });
  };

  /* ---------- objects helpers ---------- */
  const addFolders = (rows: NewFolder[]) => {
    const fresh = rows.filter((r, i) => !d.folders.some((f) => f.folder === r.folder && f.server === r.server)
      && rows.findIndex((x) => x.folder === r.folder && x.server === r.server) === i);
    if (!fresh.length) { toast({ variant: 'info', title: 'Folders added', message: 'Those folders are already in the data set.' }); return; }
    set({ folders: [...d.folders, ...fresh.map((r) => ({ ...r, id: uid('fd') }))] });
    toast({ variant: 'success', title: 'Folders added', message: `${plural(fresh.length, 'folder')} added to the data set.` });
  };
  const exportCsv = () => {
    if (!d.folders.length) { toast({ variant: 'info', title: 'Export to CSV', message: 'There are no folders to export yet.' }); return; }
    downloadText(`${d.name.trim() || 'data-set'}-folders.csv`, toCsv([['Folder Name', 'Server Name', 'Apply To'], ...d.folders.map((f) => [f.folder, f.server, f.applyTo])]));
  };
  const validateCreds = () => {
    const creds = CREDS[source.kind]!;
    const empty = creds.filter((c) => !(d.config[c.key] ?? '').trim()).map((c) => c.key);
    if (empty.length) { setBad(empty); toast({ variant: 'error', title: 'Data Set', message: 'Please fill in all the credentials before validating.' }); return; }
    // The result shows beside the button (the Validated chip), not as a notification.
    setChecking(true); setBad([]);
    setTimeout(() => { setChecking(false); setD((x) => ({ ...x, validated: true })); }, 1200);
  };

  /* ---------- step bodies ---------- */
  const nameRows = (
    <div className="fld-row">
      <TextField label="Data set name" placeholder="Enter data set name" value={d.name} error={isBad('name') ? 'Please enter the data set name.' : null}
        onChange={(v) => set({ name: v })} maxLength={200} />
      <TextField label="Description" placeholder="Enter description" value={d.description} onChange={(v) => set({ description: v })} maxLength={500} />
    </div>
  );

  const kindStep = (): ReactNode => {
    const creds = CREDS[source.kind];
    if (creds) {
      return (
        <>
          <div className="fld-row trust-creds">
            {creds.map((c) => c.select ? (
              <SelectField key={c.key} label={c.label} placeholder="Select" options={TENANTS} value={d.config[c.key] ?? ''} error={isBad(c.key) ? ' ' : null}
                onChange={(v) => { setCfg(c.key, v); setBad([]); }} />
            ) : c.secret ? (
              <PasswordField key={c.key} label={c.label} value={d.config[c.key] ?? ''} error={isBad(c.key) ? ' ' : null} onChange={(v) => { setCfg(c.key, v); setBad([]); }} />
            ) : (
              <TextField key={c.key} label={c.label} value={d.config[c.key] ?? ''} error={isBad(c.key) ? ' ' : null} onChange={(v) => { setCfg(c.key, v); setBad([]); }} />
            ))}
          </div>
          <div className="row">
            <Button icon="shield" onClick={validateCreds} loading={checking} data-nudge="validate-creds">{checking ? 'Validating…' : 'Validate'}</Button>
            {d.validated && <Chip tone="good" icon="check">Validated</Chip>}
          </div>
          {source.kind === 'sharepoint-online' && d.validated && (
            <CheckTable label="Site collection URL" rows={SPO_SITES} rowKey={(r) => r} checked={d.objects} onChecked={(o) => set({ objects: o })}
              filter={filter} onFilter={setFilter} empty="No site collections." maxHeight={300}
              cols={[{ key: 'url', header: 'Site collection URL', cell: (r) => r, text: (r) => r }]} />
          )}
        </>
      );
    }
    if (source.kind === 'ad') {
      return (
        <>
          <div className="row row--wrap" style={{ gap: 20 }}>
            <Checkbox label="Scan Active Directory" checked={!!d.config.scanAd} onChange={(v) => { setCfg('scanAd', v ? '1' : ''); setBad([]); }} />
            <Checkbox label="Scan Group Policy" checked={!!d.config.scanGpo} onChange={(v) => { setCfg('scanGpo', v ? '1' : ''); setBad([]); }} />
          </div>
          <CheckTable label="Server Name" rows={AD_SERVERS} rowKey={(r) => r} checked={d.objects} onChecked={(o) => set({ objects: o })}
            filter={filter} onFilter={setFilter} empty="No servers." cols={[{ key: 's', header: 'Server Name', cell: (r) => r, text: (r) => r }]} />
        </>
      );
    }
    if (source.kind === 'exchange-onprem') {
      return (
        <CheckTable radio label="Domain" rows={EXCHANGE_DOMAINS} rowKey={(r) => r} checked={d.objects} onChecked={(o) => set({ objects: o })}
          empty="No domains." cols={[{ key: 'd', header: 'Domain', cell: (r) => r }]} />
      );
    }
    if (source.kind === 'sharepoint-onprem') {
      return (
        <>
          <div className="trust-inline">
            <SelectField className="grow" label="Tenant Name" placeholder="Select" options={TENANTS} value={d.config.tenant ?? ''} error={isBad('tenant') ? 'Please select the tenant name.' : null}
              onChange={(v) => { setCfg('tenant', v); setBad([]); }} />
            <Button icon="plus" onClick={() => setDlg('site')}>Add</Button>
            <Button icon="refresh" onClick={() => toast({ variant: 'success', title: 'Refreshed', message: 'Site collection list is up to date.' })}>Refresh</Button>
          </div>
          <CheckTable label="Site collection URL" rows={d.sites} rowKey={(r) => r} checked={d.objects} onChecked={(o) => set({ objects: o })}
            filter={filter} onFilter={setFilter} empty="No site collections." maxHeight={300}
            cols={[{ key: 'url', header: 'Site collection URL', cell: (r) => r, text: (r) => r }]} />
        </>
      );
    }
    return null;
  };

  const folderStep = (
    <DataTable<FolderRow> flat className="tablecard--static" title="Folders" noun={['folder', 'folders']} rows={d.folders} rowKey={(r) => r.id}
      pageSizes={[10, 25, 50]}
      toolbar={
        <Menu align="right" label="Add from" items={[
          { label: 'All Shares', icon: 'server', onSelect: () => setDlg('shares') },
          { label: 'Import from CSV', icon: 'upload', onSelect: () => setDlg('csv') },
          { label: 'Scan shares from audited file servers', icon: 'folder', onSelect: () => setDlg('folders') },
          { label: 'Export to CSV', icon: 'download', onSelect: exportCsv },
        ]} trigger={(p) => <Button icon="plus" iconEnd="chevron" {...p}>Add from</Button>} />
      }
      empty={<EmptyState compact icon="folder" title="No folders yet. Use Add From to add shares." />}
      columns={[
        { key: 'folder', header: 'Folder Name', sortable: true, filterable: true },
        { key: 'server', header: 'Server Name', sortable: true, filterable: true },
        { key: 'applyTo', header: 'Apply To', sortable: true, filterable: true, minWidth: 220,
          render: (r) => (
            <Dropdown size="sm" className="trust-celldd" ariaLabel={`Apply To for ${r.folder}`} value={r.applyTo} options={APPLY_TO}
              onChange={(v) => set({ folders: d.folders.map((f) => (f.id === r.id ? { ...f, applyTo: v } : f)) })} />
          ) },
      ]}
      rowActions={(r) => <IconButton icon="trash" danger label={`Remove ${r.folder}`} onClick={() => set({ folders: d.folders.filter((f) => f.id !== r.id) })} />} />
  );

  const mappingRows = fileServers.map((s) => ({ server: s, m: d.mappings.find((x) => x.server === s) }));
  const mappingStep = (
    <>
      <div className="row row--between">
        <p className="muted text-sm" style={{ margin: 0 }}>Map every file server to the SQL database that stores its permission scan.</p>
        <Button icon="database" onClick={() => setDlg('db')}>Add database</Button>
      </div>
      <CheckTable label="Database mapping" rows={mappingRows} rowKey={(r) => r.server} checked={mapSel} onChecked={setMapSel} empty="No file servers."
        cols={[{ key: 'fs', header: 'File Server', cell: (r) => r.server },
          { key: 'sql', header: 'SQL Server', cell: (r) => r.m?.sqlServer ?? <span className="lf-na">—</span> },
          { key: 'db', header: 'Database name', cell: (r) => r.m?.database ?? <span className="lf-na">—</span> }]} />
    </>
  );

  const scanStep = (
    <>
      <div className="stack stack--sm">
        <Checkbox label={nas ? 'Scan Permission Now' : 'Scan Now'} checked={d.scanNow} onChange={(v) => set({ scanNow: v })} />
        <Checkbox label={nas ? 'Schedule Permission Scan' : 'Schedule Scan'} checked={d.scheduled} onChange={(v) => set({ scheduled: v })} />
      </div>
      <div className="trust-chipset" role="group" aria-label="Schedule type">
        {(['Daily', 'Weekly', 'Monthly'] as const).map((t) => (
          <button key={t} type="button" className="trust-pickchip" disabled={!d.scheduled} aria-pressed={d.schedule?.type === t}
            onClick={() => { setSchedType(t); setDlg('sched'); }}>{t}</button>
        ))}
      </div>
      <div className={'trust-summary' + (isBad('schedule') ? ' is-bad' : '') + (d.scheduled ? '' : ' is-off')} aria-live="polite" aria-label="Schedule summary">
        {d.schedule ? scheduleSummary(d.schedule) : d.scheduled ? <span className="muted">Pick Daily, Weekly or Monthly to set the schedule.</span> : <span className="lf-na">—</span>}
      </div>
      <Checkbox label="Scan on remote agent" checked={d.remote} onChange={(v) => set({ remote: v })} />
      <div className="trust-inline">
        <SelectField className="grow" label="Agent Location/IP" placeholder="Select" options={agents} value={d.agent} disabled={!d.remote}
          error={isBad('agent') ? 'Please select the agent location/IP or add an agent.' : null} onChange={(v) => set({ agent: v })} />
        <Button icon="plus" disabled={!d.remote} onClick={() => setDlg('agent')}>Add agent</Button>
      </div>
      {nas && (
        <fieldset className="trust-fieldset">
          <legend>Scan Nested Group Membership and Permission</legend>
          <div className="grid3">
            <TextField label="Domain Controller" placeholder="192.168.30.34" value={d.nested.controller} onChange={(v) => set({ nested: { ...d.nested, controller: v } })} />
            <TextField label="User Name" placeholder="ldsp\tushar" value={d.nested.user} onChange={(v) => set({ nested: { ...d.nested, user: v } })} />
            <PasswordField label="Password" value={d.nested.password} onChange={(v) => set({ nested: { ...d.nested, password: v } })} />
          </div>
          <p className="help" style={{ margin: 0 }}><b>Note:</b> Use "NetBIOS\UserName" format for user name.</p>
        </fieldset>
      )}
    </>
  );

  const body = step === 0 ? <>{nameRows}{nas ? folderStep : kindStep()}</> : nas && step === 1 ? mappingStep : scanStep;
  const last = step === steps.length - 1;

  return (
    <div className="stack">
      <SubHeader back={{ label: 'Back to data set', onClick: onClose }} logo={source.logo}
        crumbs={[{ label: 'Trust Settings', to: '/settings/trust' }, { label: source.label, onClick: onClose }, { label: 'Data Set', onClick: onClose }, { label: crumb }]}
        title={crumb} subtitle={`Step ${step + 1} of ${steps.length} · ${steps[step]}`} />
      <ol className="steps steps--page" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s} style={{ display: 'contents' }}>
            {i > 0 && <span className={'steps__line' + (i <= step ? ' steps__line--done' : '')} style={{ background: i <= step ? 'var(--ink)' : 'var(--border)' }} aria-hidden="true" />}
            <button type="button" className={'steps__item trust-step' + (i < step ? ' steps__item--done' : '')} aria-current={i === step ? 'step' : undefined} onClick={() => goTo(i)}>
              <span className="steps__n">{i < step ? <Icon name="check" size={12} /> : i + 1}</span><span>{s}</span>
            </button>
          </li>
        ))}
      </ol>
      <section className="lf-card wiz-card page-form trust-form">
        <div className="wiz-card__body">
          <h4 className="trust-step-h">{steps[step]}</h4>
          {body}
        </div>
        <footer className="wiz-card__foot">
          {step > 0 && <Button icon="chevron-left" onClick={() => goTo(step - 1)}>Back</Button>}
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" iconEnd={last ? undefined : 'arrow'} onClick={() => (last ? finish() : goTo(step + 1))}>{last ? 'Finish' : 'Next'}</Button>
        </footer>
      </section>

      {dlg === 'sched' && <ScheduleDialog type={schedType} initial={d.schedule} onClose={() => setDlg('')} onDone={(s) => set({ schedule: s })} />}
      {dlg === 'agent' && <AddServerDialog open onClose={() => setDlg('')} onAdded={(ip) => set({ agent: ip })} />}
      {dlg === 'shares' && <SelectFileServersDialog open onClose={() => setDlg('')} onDone={addFolders} />}
      {dlg === 'csv' && <ImportCsvDialog open onClose={() => setDlg('')} onDone={addFolders} />}
      {dlg === 'folders' && <SelectFoldersDialog open addFileServer={source.addFileServer} onClose={() => setDlg('')} onDone={addFolders} />}
      {dlg === 'site' && <SiteUrlDialog open onClose={() => setDlg('')} onDone={(u) => set({ sites: d.sites.includes(u) ? d.sites : [...d.sites, u], objects: d.objects.includes(u) ? d.objects : [...d.objects, u] })} />}
      {dlg === 'db' && (
        <DatabaseSettingsDialog open mappedServers={mapSel.length ? fileServers.filter((s) => mapSel.includes(s)) : fileServers} onClose={() => setDlg('')}
          onDone={(r) => {
            const fresh = r.fileServers.map((s) => ({ server: s, sqlServer: r.db.server.trim(), database: r.db.database.trim() }));
            set({ mappings: [...d.mappings.filter((m) => !r.fileServers.includes(m.server)), ...fresh] });
            setMapSel([]);
            toast({ variant: 'success', title: 'Database mapped', message: `${r.db.database.trim()} on ${r.db.server.trim()} mapped to ${plural(r.fileServers.length, 'file server')}.` });
          }} />
      )}
    </div>
  );
}

