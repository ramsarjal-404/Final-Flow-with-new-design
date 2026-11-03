import { useEffect, useMemo, useState } from 'react';
import {
  Button, Checkbox, ConfirmDialog, DataTable, EmptyState, Icon, IconButton, KeyValues, Modal, NumberField, SearchField,
  Segmented, SelectField, TextField, ToneTag, useToast, type Column,
} from '../../../ui';
import { uid } from '../../../stores/createStore';
import { addDeliveryAccount, deliveryStore } from '../../../stores/deliveryAccounts';
import { HeaderActions } from '../../SettingsFrame';
import { UntitledDialog } from './shared/UntitledDialog';
import { IPV4_RE, digitsGuard } from './shared/util';
import {
  SIEM_COMPONENT_CLASSES, SIEM_FILTER_COLUMNS, SIEM_INCLUDES, SIEM_REPORT_TREE, SIEM_TOP_REPORT, notifyStore, reportPath, siemQuery,
  type SiemFeed, type SiemFilter, type SiemInclude, type SiemProfile,
} from './store';

const allFilters = (saved?: Record<string, SiemFilter>) =>
  Object.fromEntries(SIEM_FILTER_COLUMNS.map((c) => [c, saved?.[c] ? { include: saved[c].include, values: [...saved[c].values] } : { include: 'All' as SiemInclude, values: [] }]));

const updateProfile = (id: string, patch: Partial<SiemProfile>) =>
  notifyStore.set((s) => ({ ...s, siem: s.siem.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

/* ---------------- SCR-SAD-15 · Configure Notifications — SIEM ---------------- */
export function SiemTab() {
  const toast = useToast();
  const profiles = notifyStore.use((s) => s.siem);
  const [adding, setAdding] = useState(false);
  const [askFeedFor, setAskFeedFor] = useState<string | null>(null);
  const [wizardFor, setWizardFor] = useState<string | null>(null);
  const [successFor, setSuccessFor] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const byId = (id: string | null) => profiles.find((p) => p.id === id) ?? null;

  const columns: Column<SiemProfile>[] = [
    { key: 'name', header: 'Name', sortable: true, minWidth: 160 },
    { key: 'ip', header: 'IP Address', sortable: true, mono: true },
    { key: 'port', header: 'Port Number', sortable: true, value: (r) => r.port },
    { key: 'status', header: 'Status', sortable: true, value: (r) => (r.enabled ? 'Enabled' : 'Disabled'), render: (r) => <ToneTag tone={r.enabled ? 'good' : 'bad'}>{r.enabled ? 'Enabled' : 'Disabled'}</ToneTag> },
    { key: 'lastSent', header: 'Alert Sent to SIEM', sortable: true },
    {
      key: 'feed', header: 'Associated Alert Feed', minWidth: 300, value: (r) => (r.feed ? 'Alert feed is configured for siem' : 'Click on add icon to add alert feed'),
      render: (r) => r.feed ? (
        <span className="row">
          <span>Alert feed is configured for siem</span>
          <IconButton icon="edit" label={`Edit alert feed of ${r.name}`} data-tip="Edit alert feed" onClick={() => setWizardFor(r.id)} />
          <IconButton icon="trash" danger label={`Remove alert feed of ${r.name}`} data-tip="Remove alert feed" onClick={() => setRemoving(r.id)} />
        </span>
      ) : (
        <span className="row">
          <span className="muted">Click on add icon to add alert feed</span>
          <IconButton icon="plus" label={`Add alert feed to ${r.name}`} data-tip="Add alert feed" onClick={() => setWizardFor(r.id)} />
        </span>
      ),
    },
    { key: 'cef', header: 'Using CEF Format', sortable: true, value: (r) => (r.cef ? 'Yes' : 'No') },
    { key: 'view', header: 'View', value: () => '', render: (r) => <Button size="sm" icon="eye" onClick={() => setViewing(r.id)}>View</Button> },
  ];

  const removeTarget = byId(removing);
  const viewTarget = byId(viewing);
  const successTarget = byId(successFor);

  return (
    <>
      <HeaderActions>
        <Button icon="refresh" onClick={() => toast({ variant: 'info', title: 'SIEM list refreshed', message: 'Profiles and alert feed status are up to date.' })}>Refresh</Button>
        <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Add SIEM Account</Button>
      </HeaderActions>

      <DataTable columns={columns} rows={profiles} rowKey={(r) => r.id} title="SIEM" noun={['profile', 'profiles']}
        empty={<EmptyState icon="file-search" title="No Data Found!" compact />} />

      <AddSiemProfileDialog open={adding} onClose={() => setAdding(false)} existing={profiles}
        onAdded={(p) => { setAdding(false); setAskFeedFor(p.id); }} />

      {/* DLG-SAD-32 · Alert-feed question */}
      <UntitledDialog open={!!askFeedFor} onClose={() => setAskFeedFor(null)} label="Configure alert feed" icon="alert" tone="warn"
        footer={<>
          <Button onClick={() => setAskFeedFor(null)}>No</Button>
          <Button variant="primary" data-autofocus onClick={() => { const id = askFeedFor; setAskFeedFor(null); setWizardFor(id); }}>Yes</Button>
        </>}>
        <p>Do you want to configure the Alert Feed</p>
      </UntitledDialog>

      {byId(wizardFor) && (
        <AlertFeedWizard profile={byId(wizardFor)!} onClose={() => setWizardFor(null)}
          onDone={(feed) => { const id = wizardFor!; updateProfile(id, { feed }); setWizardFor(null); setSuccessFor(id); }} />
      )}

      {/* DLG-SAD-36 · Success · Query Configuration */}
      <Modal open={!!successTarget} onClose={() => setSuccessFor(null)} title="Success" icon="check" size="lg"
        footer={<Button variant="primary" onClick={() => setSuccessFor(null)}>Close</Button>}>
        {successTarget?.feed && (
          <>
            <h4 className="section-label">Query Configuration</h4>
            <pre className="configure-notifications-query">{siemQuery(successTarget.feed.reports, allFilters(successTarget.feed.filters))}</pre>
          </>
        )}
      </Modal>

      {/* DLG-SAD-37 · SIEM Account Details */}
      <Modal open={!!viewTarget} onClose={() => setViewing(null)} title="SIEM Account Details" icon="server" size="lg"
        footer={<Button variant="primary" onClick={() => setViewing(null)}>Close</Button>}>
        {viewTarget && (
          <>
            <KeyValues cols={3} items={[
              { label: 'Name', value: viewTarget.name },
              { label: 'IP Address', value: viewTarget.ip },
              { label: 'Port Number', value: String(viewTarget.port) },
              { label: 'CEF Format', value: viewTarget.cef ? 'Yes' : 'No' },
              { label: 'Alert Name', value: viewTarget.feed?.alertName ?? '' },
              { label: 'Processed', value: viewTarget.feed ? (viewTarget.feed.remote ? `Remotely on ${viewTarget.feed.agent}` : 'On this server') : '' },
            ]} />
            <h4 className="section-label">Query Configuration</h4>
            {viewTarget.feed
              ? <pre className="configure-notifications-query">{siemQuery(viewTarget.feed.reports, allFilters(viewTarget.feed.filters))}</pre>
              : <p className="configure-notifications-lead">No alert feed yet. Use the add icon in the list to configure one.</p>}
          </>
        )}
      </Modal>

      {/* DLG-SAD-38 · Remove alert feed */}
      <ConfirmDialog open={!!removeTarget} onClose={() => setRemoving(null)} title="Remove alert feed" confirmLabel="Remove"
        message={removeTarget ? `Stop sending the "${removeTarget.feed?.alertName ?? ''}" alert feed to ${removeTarget.name}?` : undefined}
        onConfirm={() => {
          if (!removeTarget) return;
          updateProfile(removeTarget.id, { feed: null });
          setRemoving(null);
          toast({ variant: 'success', title: 'Alert feed removed', message: `${removeTarget.name} no longer receives the feed.` });
        }} />
    </>
  );
}

/* ---------------- DLG-SAD-31 · Add SIEM Profile ---------------- */
function AddSiemProfileDialog({ open, onClose, existing, onAdded }: {
  open: boolean; onClose: () => void; existing: SiemProfile[]; onAdded: (p: SiemProfile) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState<number | ''>('');
  const [cef, setCef] = useState(false);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (open) { setName(''); setIp(''); setPort(''); setCef(false); setTried(false); } }, [open]);

  const n = name.trim();
  const errName = !n ? 'Enter a profile name.' : existing.some((p) => p.name.toLowerCase() === n.toLowerCase()) ? 'A profile with this name already exists.' : null;
  const errIp = !ip.trim() ? 'Enter the SIEM server IP address.' : !IPV4_RE.test(ip.trim()) ? 'Use an IPv4 address, e.g. 192.168.30.150.' : null;
  const errPort = port === '' ? 'Enter the port number.' : port < 1 || port > 65535 ? 'Port is 1–65535.' : null;

  const done = () => {
    setTried(true);
    if (errName || errIp || errPort) {
      toast({ variant: 'error', title: 'Check the highlighted fields', message: 'Name, IP Address and Port Number are required.' });
      return;
    }
    const acc = addDeliveryAccount({ name: n, type: 'SIEM', details: `IP Address: ${ip.trim()} · Port: ${port} · CEF Format: ${cef ? 'Yes' : 'No'}` });
    const p: SiemProfile = { id: uid('siem'), name: n, ip: ip.trim(), port: port as number, cef, enabled: true, lastSent: 'Never', feed: null, accountId: acc.id };
    notifyStore.set((s) => ({ ...s, siem: [...s.siem, p] }));
    toast({ variant: 'success', title: 'Success', message: `SIEM profile ${n} was added.` });
    onAdded(p);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add SIEM Profile" icon="server" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <TextField label="Name" value={name} onChange={setName} error={tried ? errName : null} />
      <div className="fld-row">
        <TextField label="IP Address" value={ip} onChange={setIp} placeholder="192.168.30.150" error={tried ? errIp : null} />
        <NumberField label="Port Number" value={port} min={0} max={99999} onChange={digitsGuard(5, setPort)} error={tried ? errPort : null} />
      </div>
      <Checkbox label="CEF Format" checked={cef} onChange={setCef} />
    </Modal>
  );
}

/* ---------------- DLG-SAD-33 · Alert feed wizard ---------------- */
const STEPS = ['Please select the report(s)', 'Set Filter(s)', 'Confirmation'];

function AlertFeedWizard({ profile, onClose, onDone }: { profile: SiemProfile; onClose: () => void; onDone: (f: SiemFeed) => void }) {
  const toast = useToast();
  const agents = deliveryStore.use((s) => s.agents);
  const [step, setStep] = useState(0);
  const [reports, setReports] = useState<string[]>(() => [...(profile.feed?.reports ?? [])]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, SiemFilter>>(() => allFilters(profile.feed?.filters));
  const [column, setColumn] = useState(SIEM_FILTER_COLUMNS[0]);
  const [remote, setRemote] = useState(profile.feed?.remote ?? false);
  const [agent, setAgent] = useState(profile.feed?.agent ?? '');
  const [alertName, setAlertName] = useState(profile.feed?.alertName ?? profile.name);
  const [picker, setPicker] = useState<'class' | 'value' | null>(null);

  const toggleReport = (r: string, on: boolean) => setReports((xs) => (on ? (xs.includes(r) ? xs : [...xs, r]) : xs.filter((x) => x !== r)));
  const cur = filters[column];
  const setCur = (f: SiemFilter) => setFilters((fs) => ({ ...fs, [column]: f }));
  const counted = (c: string) => (filters[c].include !== 'All' && filters[c].values.length ? ` (${filters[c].values.length})` : '');

  const next = () => {
    if (step === 0) {
      if (!reports.length) { toast({ variant: 'error', title: 'Select a report', message: 'Choose at least one report to send to the SIEM.' }); return; }
      setStep(1); return;
    }
    if (step === 1) {
      const bad = SIEM_FILTER_COLUMNS.find((c) => filters[c].include !== 'All' && filters[c].values.length === 0);
      if (bad) {
        setColumn(bad);
        toast({ variant: 'error', title: `Add ${bad} values`, message: `"${filters[bad].include}" needs at least one value — or set Include to All.` });
        return;
      }
      setStep(2); return;
    }
    if (!alertName.trim()) { toast({ variant: 'error', title: 'Alert name required', message: 'Provide a name for the new alert.' }); return; }
    if (remote && !agent) { toast({ variant: 'error', title: 'Select an agent machine', message: 'Remote processing needs an agent machine.' }); return; }
    const kept = Object.fromEntries(Object.entries(filters).filter(([, f]) => f.include !== 'All' && f.values.length > 0));
    onDone({ reports, filters: kept, remote, agent: remote ? agent : '', alertName: alertName.trim() });
  };

  const query = useMemo(() => siemQuery(reports, filters), [reports, filters]);

  return (
    <>
      <Modal open onClose={onClose} title={STEPS[step]} subtitle={profile.name} icon="send" size="lg" steps={STEPS} step={step}
        footer={<>
          <Button onClick={onClose}>Cancel</Button>
          <Button icon="chevron-left" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
          <Button variant="primary" iconEnd={step < 2 ? 'arrow' : undefined} onClick={next}>{step < 2 ? 'Next' : 'Done'}</Button>
        </>}>
        {step === 0 && (
          <>
            <p className="configure-notifications-lead">Please select the report(s) for setting alert.</p>
            <div className="configure-notifications-reports">
              <Checkbox label={SIEM_TOP_REPORT} checked={reports.includes(SIEM_TOP_REPORT)} onChange={(v) => toggleReport(SIEM_TOP_REPORT, v)} />
              {SIEM_REPORT_TREE.map((g) => {
                const open = expanded.includes(g.name);
                const n = g.reports.filter((r) => reports.includes(reportPath(g.name, r))).length;
                return (
                  <div key={g.name} className="configure-notifications-group">
                    <button type="button" className="configure-notifications-group__btn" aria-expanded={open}
                      onClick={() => setExpanded((xs) => (open ? xs.filter((x) => x !== g.name) : [...xs, g.name]))}>
                      <Icon name="chevron-right" size={14} /><Icon name="folder" size={15} />
                      <span>{g.name}</span>{n > 0 && <span className="count-chip">{n}</span>}
                    </button>
                    {open && (
                      <div className="configure-notifications-group__items">
                        {g.reports.map((r) => {
                          const path = reportPath(g.name, r);
                          return <Checkbox key={r} label={r} checked={reports.includes(path)} onChange={(v) => toggleReport(path, v)} />;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="configure-notifications-lead">Please select operations to set the filter(s). (Optional)</p>
            <div className="configure-notifications-filters">
              <div className="configure-notifications-box">
                <header>Selected reports<span className="count-chip">{reports.length}</span></header>
                <ul className="configure-notifications-box__body configure-notifications-list" aria-label="Selected reports">
                  {reports.map((r) => <li key={r} className="configure-notifications-val"><Icon name="file" size={14} /><span title={r}>{r}</span></li>)}
                </ul>
              </div>
              <div className="stack">
                <div className="configure-notifications-coltabs">
                  <Segmented ariaLabel="Filter column" value={column} onChange={setColumn}
                    items={SIEM_FILTER_COLUMNS.map((c) => ({ value: c, label: c + counted(c) }))} />
                </div>
                <div className="configure-notifications-include">
                  <SelectField label="Include" value={cur.include} options={SIEM_INCLUDES}
                    onChange={(v) => setCur({ ...cur, include: v as SiemInclude })} />
                  <IconButton icon="plus" bordered label={`Add ${column} values`}
                    className={cur.include === 'All' ? 'configure-notifications-dis' : undefined}
                    aria-disabled={cur.include === 'All' || undefined}
                    data-tip={cur.include === 'All' ? 'Choose Selected Only or All but excluding selected first' : undefined}
                    onClick={() => { if (cur.include !== 'All') setPicker(column === 'Component Name' ? 'class' : 'value'); }} />
                </div>
                <div className="configure-notifications-box">
                  <header>{column}</header>
                  <div className="configure-notifications-box__body">
                    {cur.include === 'All' ? <p className="configure-notifications-box__empty">All values are included.</p>
                      : cur.values.length === 0 ? <p className="configure-notifications-box__empty">Click the add icon to choose values.</p>
                        : cur.values.map((v) => (
                          <div key={v} className="configure-notifications-val"><span title={v}>{v}</span>
                            <IconButton icon="x" label={`Remove ${v}`} onClick={() => setCur({ ...cur, values: cur.values.filter((x) => x !== v) })} />
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="configure-notifications-lead">Please verify the details and provide a name for the new alert.</p>
            <pre className="configure-notifications-query" aria-label="Query">{query}</pre>
            <Checkbox label="Process alert remotely" checked={remote} onChange={setRemote} />
            <div className="fld-row">
              <SelectField label="Select Agent Machine :" placeholder="Select" value={agent} options={agents} disabled={!remote} onChange={setAgent} />
              <TextField label="Alert Name :" value={alertName} onChange={setAlertName} />
            </div>
          </>
        )}
      </Modal>

      <ClassPicker open={picker === 'class'} initial={cur.values} onClose={() => setPicker(null)}
        onDone={(vals) => { setCur({ ...cur, values: vals }); setPicker(null); }} />
      <AddValueDialog open={picker === 'value'} column={column} initial={cur.values} onClose={() => setPicker(null)}
        onDone={(vals) => { setCur({ ...cur, values: vals }); setPicker(null); }} />
    </>
  );
}

/* ---------------- DLG-SAD-34 · Component Name (class picker) ---------------- */
function ClassPicker({ open, initial, onClose, onDone }: { open: boolean; initial: string[]; onClose: () => void; onDone: (v: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => { if (open) { setPicked(initial.filter((v) => SIEM_COMPONENT_CLASSES.includes(v))); setQ(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = SIEM_COMPONENT_CLASSES.filter((c) => c.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Modal open={open} onClose={onClose} title="Component Name" icon="layers" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={picked.length === 0} onClick={() => onDone(SIEM_COMPONENT_CLASSES.filter((c) => picked.includes(c)))}>Done</Button></>}>
      <p className="configure-notifications-lead">Select class(es) from the list and click "Done" button.</p>
      <div className="configure-notifications-box">
        <header>Component Name</header>
        <div className="configure-notifications-box__body">
          <SearchField value={q} onChange={setQ} placeholder="Search" ariaLabel="Search classes" />
          <div role="group" aria-label="Classes" className="stack stack--sm" style={{ padding: '6px 6px 2px' }}>
            {shown.length ? shown.map((c) => (
              <Checkbox key={c} label={c} checked={picked.includes(c)} onChange={(v) => setPicked((xs) => (v ? [...xs, c] : xs.filter((x) => x !== c)))} />
            )) : <p className="configure-notifications-box__empty">No class matches “{q}”.</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- DLG-SAD-35 · Add Value ---------------- */
function AddValueDialog({ open, column, initial, onClose, onDone }: {
  open: boolean; column: string; initial: string[]; onClose: () => void; onDone: (v: string[]) => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const [vals, setVals] = useState<string[]>([]);
  useEffect(() => { if (open) { setVals([...initial]); setDraft(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (vals.some((x) => x.toLowerCase() === v.toLowerCase())) { toast({ variant: 'warning', title: 'Already added', message: `"${v}" is in the list.` }); return; }
    setVals((xs) => [...xs, v]);
    setDraft('');
  };
  return (
    <Modal open={open} onClose={onClose} title="Add Value" icon="plus" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={vals.length === 0} onClick={() => onDone(vals)}>Done</Button></>}>
      <p className="configure-notifications-lead">Please add the values manually or import from CSV or Backup.</p>
      <div className="configure-notifications-addrow">
        <TextField value={draft} placeholder={`Add ${column} manually`} aria-label={`Add ${column} manually`} onChange={setDraft}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <Button icon="plus" disabled={!draft.trim()} onClick={add}>Add</Button>
        <Button icon="upload" onClick={() => toast({ variant: 'info', title: 'Import from CSV', message: 'Choose a CSV file with one value per line (not available in the prototype).' })}>Import from CSV</Button>
      </div>
      <div className="configure-notifications-box">
        <header>{column}<span className="count-chip">{vals.length}</span></header>
        <div className="configure-notifications-box__body">
          {vals.length === 0 ? <p className="configure-notifications-box__empty">No values yet.</p> : vals.map((v) => (
            <div key={v} className="configure-notifications-val"><span title={v}>{v}</span>
              <IconButton icon="x" label={`Remove ${v}`} onClick={() => setVals((xs) => xs.filter((x) => x !== v))} />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
