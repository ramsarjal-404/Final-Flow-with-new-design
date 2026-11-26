import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Banner, Button, Checkbox, EmptyState, Icon, IconButton, Modal, PasswordField, RadioGroup, SearchField, SelectField, TextField, TilePicker,
  Toggle, useToast,
} from '../../../ui';
import { DOMAINS, dsStore, newId, stampNow } from './store';
import type { AdDomain } from './store';
import {
  AD_COMPONENTS, AD_OBJECT_CLASSES, AUDIT_ENTRIES, AUDIT_POLICIES, CLASS_SCOPE, DATABASES, DEFAULT_COMPONENTS, DEFAULT_DATA_PATH,
  EXCHANGE_OBJECT_CLASSES, GPOS, OU_SCOPE, SERVER_GROUP_LABEL, SQL_SERVERS, componentLabel, defaultConfig, dnsOf, isValidIp, ouPaths, scanServers,
} from './adData';
import type { AdComponentId, AdConfig, AdMode, AdServer, AdServerGroup, ClassScope, OuScope } from './adData';
import { CellInput, MiniTable, Note, PortalMenu, StatusRunView, WizardFooter, WizardFrame, useInvalid } from './parts';

/* Figma "Active Directory config" › Final Flow: Data Source for Active Directory.
   Express (4 steps) or Advanced (6 steps) configuration, then the status run.
   Step 1 → "Configure Auditing" dialog → (automatic) "Group Policy Object Selection" dialog → step 2. */

type StepId = 'cred' | 'comp' | 'ip' | 'db' | 'ou' | 'cls' | 'status';
const LABEL: Record<StepId, string> = {
  cred: 'Domain credentials', comp: 'Domain configuration', ip: 'IP configuration', db: 'Database settings',
  ou: 'Organizational units', cls: 'Object classes', status: 'Status',
};
const stepsFor = (mode: AdMode, edit: boolean): StepId[] => [
  'cred', 'comp', 'ip', 'db', ...(mode === 'advanced' ? (['ou', 'cls'] as StepId[]) : []), ...(edit ? [] : (['status'] as StepId[])),
];

type Draft = AdConfig & { domain: string; user: string; password: string };

export default function AdWizard({ edit, onClose, onDone }: { edit?: AdDomain; onClose: () => void; onDone: (id: string) => void }) {
  const toast = useToast();
  const domains = dsStore.use((s) => s.adDomains);
  const v = useInvalid();
  const [d, setD] = useState<Draft>(() => edit
    ? { ...edit.config, domain: edit.domain, user: edit.logon, password: '********' }
    : { ...defaultConfig(''), domain: '', user: '', password: '' });
  const [step, setStep] = useState(0);
  const [tested, setTested] = useState(!!edit);
  const [dlg, setDlg] = useState<null | 'audit' | 'gpo' | 'script'>(null);
  const [runDone, setRunDone] = useState(false);
  const [savedId] = useState(() => edit?.id ?? newId('d'));

  const steps = stepsFor(d.mode, !!edit);
  const cur = steps[step];
  const busy = cur === 'status' && !runDone;
  const last = edit ? step === steps.length - 1 : steps[step + 1] === 'status';

  const set = <K extends keyof Draft>(k: K, val: Draft[K], ...clears: string[]) => {
    setD((x) => ({ ...x, [k]: val }));
    v.clear(k as string); clears.forEach(v.clear);
    if (['domain', 'user', 'password'].includes(k as string)) setTested(false);
  };
  const fail = (keys: string[], message: string) => { v.mark(keys); toast({ variant: 'error', title: 'Check the highlighted fields', message }); return false; };

  /* ---------- validation ---------- */
  const validate = (): boolean => {
    if (cur === 'cred') {
      const miss = (['domain', 'user', 'password'] as const).filter((k) => !d[k].trim());
      if (miss.length) return fail([...miss], 'Enter the domain name or IP address, user name and password.');
      if (!edit && domains.some((x) => x.domain.toLowerCase() === d.domain.trim().toLowerCase())) return fail(['domain'], `${d.domain.trim()} is already added.`);
      if (!/[\\@]/.test(d.user)) return fail(['user'], 'Enter the user name as "Domain\\UserName" or "user@domain".');
      if (d.agent === 'share' && !d.sharePath.trim()) return fail(['sharePath'], 'Enter the shared folder, or use the default location.');
      return true;
    }
    if (cur === 'comp') {
      if (!d.components.length) return fail([], 'Select at least one component to audit.');
      if (!d.servers.some((s) => s.change || s.health || s.mailbox)) return fail([], 'Turn on auditing for at least one server.');
      return true;
    }
    if (cur === 'ip') {
      const bad = d.servers.map((s, i) => (isValidIp(s.ip) ? null : `ip${i}`)).filter(Boolean) as string[];
      if (bad.length) return fail(bad, 'Enter a valid IPv4 address (for example 192.168.30.21) for each server.');
      return true;
    }
    if (cur === 'db') {
      if (!d.sqlServer.trim()) return fail(['sqlServer'], 'Enter the SQL Server name or click Browse.');
      if (d.sqlAuth === 'sql' && !d.sqlUser.trim()) return fail(['sqlUser'], 'Enter the SQL Server user name and password.');
      if (!d.database.trim()) return fail(['database'], 'Enter a name for the database.');
      if (!d.dataPath.trim()) return fail(['dataPath'], 'Enter the data path.');
      return true;
    }
    if (cur === 'ou') {
      if (d.ouScope !== 'all' && !d.ous.length) return fail([], 'Add at least one organizational unit, or audit all of them.');
      return true;
    }
    if (cur === 'cls') {
      if (d.classScope !== 'all' && !d.adClasses.length && !d.exClasses.length) return fail([], 'Select at least one object class, or audit all of them.');
      return true;
    }
    return true;
  };

  const save = () => {
    const { domain, user, password: _p, ...config } = d;
    const servers: AdServer[] = config.servers.map((s) => ({ ...s, agent: config.agent === 'none' ? 'Not Installed' : 'Installed' }));
    const entry: AdDomain = {
      id: savedId, domain: domain.trim(), controller: config.preferredDc, logon: user.trim(),
      config: { ...config, servers, added: edit?.config.added || stampNow() },
    };
    dsStore.set((s) => ({ ...s, adDomains: edit ? s.adDomains.map((x) => (x.id === edit.id ? entry : x)) : [...s.adDomains, entry] }));
  };

  const next = () => {
    if (cur === 'status') { onDone(savedId); return; }
    if (!validate()) return;
    v.mark([]);
    if (cur === 'cred' && !edit) {
      // Rescan the domain's servers for the typed domain before showing them on the next step.
      if (!d.servers.length || !d.servers[0].name.endsWith(dnsOf(d.domain))) {
        const servers = scanServers(d.domain);
        setD((x) => ({ ...x, servers, preferredDc: servers[0].name, ous: [] }));
      }
      setDlg('audit'); return;
    }
    if (edit && last) {
      save(); toast({ variant: 'success', title: 'Active Directory updated', message: `${d.domain} settings were saved.` }); onDone(savedId); return;
    }
    if (last) save();
    setStep((s) => s + 1);
  };
  const back = () => { v.mark([]); setStep((s) => Math.max(0, s - 1)); };

  /* ---------- bodies ---------- */
  const req = (l: string) => <>{l} <span className="add-data-source-req" aria-hidden="true">*</span></>;
  let body: ReactNode = null;
  let tools: ReactNode = null;

  if (cur === 'cred') {
    body = (
      <>
        <TilePicker ariaLabel="Configuration type" value={d.mode} onChange={(m) => !edit && set('mode', m as AdMode)}
          options={[
            { value: 'express', label: 'Express configuration', description: 'Configure the domain with default settings.', icon: 'sparkles', disabled: !!edit && d.mode !== 'express' },
            { value: 'advanced', label: 'Advanced configuration', description: 'Configure the domain with each setting individually.', icon: 'sliders', disabled: !!edit && d.mode !== 'advanced' },
          ]} />
        <h4 className="add-data-source-step-title">Enter the domain credentials</h4>
        <div className="add-data-source-two">
          <div className="add-data-source-inline">
            <TextField label={req('Domain name / IP address')} value={d.domain} placeholder="e.g. ldsp2.com" maxLength={256} readOnly={!!edit}
              aria-invalid={v.inv('domain')} onChange={(val) => set('domain', val)} />
            {!edit && (
              <PortalMenu label="Domains found on the network" align="left"
                items={DOMAINS.map((x) => ({ label: x, onSelect: () => set('domain', x) }))}
                trigger={(p) => <Button {...p} icon="globe">Browse</Button>} />
            )}
          </div>
          <TextField label={req('User name')} value={d.user} placeholder="Domain\UserName" maxLength={256} aria-invalid={v.inv('user')} onChange={(val) => set('user', val)} />
          <div className="stack stack--sm">
            <PasswordField label={req('Password')} value={d.password} maxLength={256} aria-invalid={v.inv('password')} onChange={(val) => set('password', val)} autoComplete="new-password" />
            <button type="button" className="add-data-source-linkbtn" data-ok={tested || undefined} onClick={() => {
              const miss = (['domain', 'user', 'password'] as const).filter((k) => !d[k].trim());
              if (miss.length) { v.mark([...miss]); toast({ variant: 'error', title: 'Test connection', message: 'Enter the domain, user name and password first.' }); return; }
              setTested(true); toast({ variant: 'success', title: 'Connection successful', message: `Connected to ${d.domain.trim()} as ${d.user.trim()}.` });
            }}>{tested ? <><Icon name="check" size={14} />Connection verified</> : 'Test connection'}</button>
          </div>
        </div>
        <h4 className="add-data-source-sub">Apply auditing method</h4>
        <RadioGroup ariaLabel="Auditing method" value={d.agent === 'none' ? 'none' : 'agent'}
          onChange={(val) => set('agent', val === 'none' ? 'none' : 'default', 'sharePath')}
          options={[{ value: 'none', label: 'Without agent' }, { value: 'agent', label: 'With agent' }]} />
        {d.agent === 'none'
          ? <Note lead="Note:" sep=" ">An agent for monitoring non-owner mailbox access will still be deployed.</Note>
          : (
            <div className="stack stack--sm add-data-source-indent">
              <div className="add-data-source-two">
                <div className="stack stack--sm">
                  <RadioGroup ariaLabel="Default location" value={d.agent} onChange={(val) => set('agent', val as Draft['agent'], 'sharePath')} options={[{ value: 'default', label: 'Default location' }]} />
                  <TextField aria-label="Default location" value="Admin$" readOnly disabled={d.agent !== 'default'} />
                </div>
                <div className="stack stack--sm">
                  <RadioGroup ariaLabel="Use this shared folder" value={d.agent} onChange={(val) => set('agent', val as Draft['agent'])} options={[{ value: 'share', label: 'Use this shared folder' }]} />
                  <TextField aria-label="Shared folder" value={d.sharePath} placeholder="\\server\share" disabled={d.agent !== 'share'} maxLength={256}
                    aria-invalid={v.inv('sharePath')} onChange={(val) => set('sharePath', val)} />
                </div>
              </div>
              <Note lead="Note:" sep=" ">This shared folder should be present on all audited domain controllers and Exchange servers.</Note>
            </div>
          )}
      </>
    );
  } else if (cur === 'comp') {
    tools = (
      <>
        <Button size="sm" icon="restore" onClick={() => { setD((x) => ({ ...x, components: [...DEFAULT_COMPONENTS], servers: scanServers(x.domain) })); toast({ variant: 'info', title: 'Restored to default', message: 'Components and servers are back to the default selection.' }); }}>Restore to default</Button>
        <Button size="sm" icon="refresh" onClick={() => { setD((x) => ({ ...x, servers: mergeScan(x.servers, scanServers(x.domain)) })); toast({ variant: 'success', title: 'Server list re-scanned', message: `${d.servers.length} servers found in ${dnsOf(d.domain)}.` }); }}>Re-scan server list</Button>
      </>
    );
    body = <ComponentsStep d={d} setD={setD} toast={toast} />;
  } else if (cur === 'ip') {
    tools = <Button size="sm" icon="restore" onClick={() => { const fresh = scanServers(d.domain); setD((x) => ({ ...x, servers: x.servers.map((s) => ({ ...s, ip: fresh.find((f) => f.name === s.name)?.ip ?? s.ip })) })); v.mark([]); }}>Restore to default</Button>;
    const dcs = [...new Set(d.servers.filter((s) => s.group === 'ad' && !s.name.startsWith('EXCH')).map((s) => s.name))];
    body = (
      <>
        <p className="add-data-source-lead" style={{ marginTop: 0 }}>Review the IP address each server is mapped to. Edit any that are wrong.</p>
        <MiniTable label="Server IP addresses" maxHeight={380} head={<><th>Server(s)</th><th style={{ width: '45%' }}>IP address</th></>}>
          {d.servers.map((s, i) => (
            <tr key={s.group + s.name} className="lf-row" style={{ cursor: 'default' }}>
              <td>{s.name} <span className="add-data-source-tree-meta">{s.group === 'gp' ? 'Group Policy' : ''}</span></td>
              <td><CellInput label={`IP address of ${s.name}`} value={s.ip} invalid={v.inv(`ip${i}`)}
                onChange={(val) => { v.clear(`ip${i}`); setD((x) => ({ ...x, servers: x.servers.map((y, j) => (j === i ? { ...y, ip: val } : y)) })); }} /></td>
            </tr>
          ))}
        </MiniTable>
        <div className="add-data-source-two">
          <SelectField label="Preferred DC for general calls and backup" value={d.preferredDc} options={dcs} onChange={(val) => set('preferredDc', val)} />
        </div>
        <Note lead="Note:" sep=" ">The IP address is editable. Lepide will not monitor a computer until it is mapped to its correct IP address.</Note>
        <button type="button" className="add-data-source-linkbtn" onClick={() => toast({ variant: 'info', title: 'Configure LDAPS', message: 'LDAPS is configured from the domain\'s settings after it is added.' })}>
          <Icon name="lock" size={14} />Configure LDAPS
        </button>
      </>
    );
  } else if (cur === 'db') {
    body = <DatabaseStep d={d} set={set} v={v} req={req} toast={toast} />;
  } else if (cur === 'ou') {
    body = <OuStep d={d} setD={setD} toast={toast} />;
  } else if (cur === 'cls') {
    body = <ClassStep d={d} setD={setD} onScript={() => setDlg('script')} />;
  } else if (cur === 'status') {
    const dns = dnsOf(d.domain);
    const tasks = [
      `Validating credentials for ${d.domain.trim()}`,
      d.autoAudit ? `Enabling audit policies through "${d.gpo}"` : 'Skipping audit policies (set up manually)',
      ...(d.agent === 'none' ? [] : [`Installing agent on ${d.preferredDc}`]),
      `Creating database ${d.database} on ${d.sqlServer}`,
      `Starting auditing for ${dns}`,
    ];
    body = (
      <>
        <h4 className="add-data-source-step-title">Adding {d.domain.trim()}</h4>
        <StatusRunView tasks={tasks} onDone={() => setRunDone(true)} />
        {runDone && !d.autoAudit && (
          <Banner tone="warning">Auditing isn't enabled on this domain yet. Apply the audit policies manually, then check the change auditing status.</Banner>
        )}
      </>
    );
  }

  const title = edit ? `Edit ${edit.domain}` : 'Data Source for Active Directory';
  return (
    <>
      <WizardFrame root="Active Directory" crumb={title} steps={steps.map((s) => LABEL[s])} step={step} onClose={onClose} busy={busy}
        footer={cur === 'status'
          ? <><span className="spacer" /><Button variant="primary" onClick={next} disabled={!runDone}>Done</Button></>
          : <WizardFooter onBack={step > 0 ? back : undefined} onCancel={onClose} onNext={next} nextLabel={edit && last ? 'Save' : last ? 'Finish' : 'Next'} />}>
        <div className="row row--wrap ad-step-head">
          <div className="grow">
            <h4 className="add-data-source-step-title">{LABEL[cur]}</h4>
          </div>
          {tools && <div className="row row--wrap" style={{ gap: 8 }}>{tools}</div>}
        </div>
        {body}
      </WizardFrame>

      <ConfigureAuditing open={dlg === 'audit'} auto={d.autoAudit} domain={d.domain.trim()} onAuto={(a) => set('autoAudit', a)}
        onClose={() => setDlg(null)} onNext={() => { if (d.autoAudit) setDlg('gpo'); else { setDlg(null); setStep(1); } }} />
      <SelectGpo open={dlg === 'gpo'} d={d} setD={setD} onBack={() => setDlg('audit')} onClose={() => setDlg(null)}
        onDone={() => { setDlg(null); setStep(1); }} />
      <LogonScript open={dlg === 'script'} onClose={() => setDlg(null)} />
    </>
  );
}

function mergeScan(cur: AdServer[], fresh: AdServer[]) {
  return fresh.map((f) => cur.find((c) => c.name === f.name && c.group === f.group) ?? f);
}

type SetD = React.Dispatch<React.SetStateAction<Draft>>;
type Toast = ReturnType<typeof useToast>;

/* ---------------- Step 2: components & servers ---------------- */
function ComponentsStep({ d, setD, toast }: { d: Draft; setD: SetD; toast: Toast }) {
  const on = (c: AdComponentId) => d.components.includes(c);
  const flip = (c: AdComponentId, val: boolean) => setD((x) => {
    const components = val ? [...x.components, c] : x.components.filter((y) => y !== c);
    // Turning a component off also turns its column off on every server.
    const servers = x.servers.map((s) => ({
      ...s,
      health: c === 'health' && !val ? false : c === 'health' && val ? s.group === 'ad' : s.health,
      mailbox: c === 'mailbox' && !val ? false : s.mailbox,
    }));
    return { ...x, components, servers };
  });
  const changeOn = (g: AdServerGroup) => (g === 'gp' ? on('auditGp') : on('auditAd') || on('auditExchange'));
  const patch = (i: number, p: Partial<AdServer>) => setD((x) => ({ ...x, servers: x.servers.map((s, j) => (j === i ? { ...s, ...p } : s)) }));
  const groups: AdServerGroup[] = ['ad', 'gp'];

  return (
    <>
      <p className="add-data-source-lead" style={{ marginTop: 0 }}>Select the component(s) and server(s) to be audited.</p>
      <div className="ad-components" role="group" aria-label="Components to audit">
        {AD_COMPONENTS.map((c) => (
          <div key={c.id} className="ad-component" data-on={on(c.id) || undefined}>
            <Checkbox checked={on(c.id)} onChange={(val) => flip(c.id, val)} label={c.label} />
            {c.settings && (
              <IconButton icon="settings" label={`${c.label} settings`} disabled={!on(c.id)}
                onClick={() => toast({ variant: 'info', title: `${c.label} settings`, message: 'Defaults are used. Change them from the domain\'s settings after it is added.' })} />
            )}
          </div>
        ))}
      </div>
      <MiniTable label="Servers to audit" maxHeight={400}
        head={<><th>Component</th><th style={{ width: 170 }}>Change auditing</th><th style={{ width: 170 }}>Health monitoring</th><th style={{ width: 170 }}>Non-owner mailboxes</th></>}>
        {groups.map((g) => (
          <ServerGroup key={g} g={g} d={d}>
            {d.servers.map((s, i) => s.group !== g ? null : (
              <tr key={g + s.name} className="lf-row" style={{ cursor: 'default' }}>
                <td className="ad-server-cell">{s.name}</td>
                <td><Toggle label={`Change auditing on ${s.name}`} checked={s.change && changeOn(g)} disabled={!changeOn(g)} onChange={(val) => patch(i, { change: val })} /></td>
                <td><Toggle label={`Health monitoring on ${s.name}`} checked={s.health} disabled={!on('health')} onChange={(val) => patch(i, { health: val })} /></td>
                <td><Toggle label={`Non-owner mailbox auditing on ${s.name}`} checked={s.mailbox} disabled={!on('mailbox') || g !== 'ad'} onChange={(val) => patch(i, { mailbox: val })} /></td>
              </tr>
            ))}
          </ServerGroup>
        ))}
      </MiniTable>
      <p className="add-data-source-foot-note">
        {d.components.length} of {AD_COMPONENTS.length} components selected: {d.components.map(componentLabel).join(', ') || 'none'}.
      </p>
    </>
  );
}

function ServerGroup({ g, d, children }: { g: AdServerGroup; d: Draft; children: ReactNode }) {
  const n = d.servers.filter((s) => s.group === g).length;
  return (
    <>
      <tr className="add-data-source-tree-group"><td colSpan={4}><b>{SERVER_GROUP_LABEL[g]}</b><span className="add-data-source-tree-meta">{n} server{n === 1 ? '' : 's'}</span></td></tr>
      {children}
    </>
  );
}

/* ---------------- Step 4: database ---------------- */
function DatabaseStep({ d, set, v, req, toast }: {
  d: Draft; set: <K extends keyof Draft>(k: K, val: Draft[K], ...c: string[]) => void; v: ReturnType<typeof useInvalid>; req: (l: string) => ReactNode; toast: Toast;
}) {
  const [tested, setTested] = useState(false);
  const [pw, setPw] = useState('');
  const [dbMode, setDbMode] = useState<'create' | 'select'>(DATABASES.includes(d.database) ? 'select' : 'create');
  return (
    <>
      <p className="add-data-source-lead" style={{ marginTop: 0 }}>Enter the SQL Server details used to store the audit data.</p>
      <div className="add-data-source-two">
        <div className="add-data-source-inline">
          <TextField label={req('Server name')} value={d.sqlServer} maxLength={256} aria-invalid={v.inv('sqlServer')} onChange={(val) => { set('sqlServer', val); setTested(false); }} />
          <PortalMenu label="SQL Servers found on the network" items={SQL_SERVERS.map((x) => ({ label: x, onSelect: () => { set('sqlServer', x); setTested(false); } }))}
            trigger={(p) => <Button {...p} icon="search">Browse</Button>} />
        </div>
      </div>
      <RadioGroup row ariaLabel="Authentication" value={d.sqlAuth} onChange={(val) => { set('sqlAuth', val as Draft['sqlAuth'], 'sqlUser'); setTested(false); }}
        options={[{ value: 'windows', label: 'Windows authentication' }, { value: 'sql', label: 'SQL authentication' }]} />
      <div className="add-data-source-two">
        <TextField label="User name" value={d.sqlUser} disabled={d.sqlAuth !== 'sql'} maxLength={256} aria-invalid={v.inv('sqlUser')} onChange={(val) => set('sqlUser', val)} />
        <PasswordField label="Password" value={d.sqlAuth === 'sql' ? pw : ''} onChange={setPw} disabled={d.sqlAuth !== 'sql'} maxLength={256} autoComplete="new-password" />
      </div>
      <div className="row row--wrap">
        <Button icon="plug" onClick={() => {
          if (!d.sqlServer.trim()) { v.mark(['sqlServer']); toast({ variant: 'error', title: 'Test connection', message: 'Enter the SQL Server name first.' }); return; }
          setTested(true); toast({ variant: 'success', title: 'Test connection', message: `Connected to ${d.sqlServer.trim()}.` });
        }}>Test connection</Button>
        {tested && <span className="add-data-source-ok"><Icon name="check" size={14} />Connection verified</span>}
      </div>
      <h4 className="add-data-source-sub">Database</h4>
      <div className="add-data-source-two">
        <div className="stack stack--sm">
          <RadioGroup ariaLabel="Create database" value={dbMode} onChange={() => { setDbMode('create'); set('database', '', 'database'); }} options={[{ value: 'create', label: 'Create database' }]} />
          <TextField aria-label="New database name" value={dbMode === 'create' ? d.database : ''} disabled={dbMode !== 'create'} maxLength={128}
            aria-invalid={dbMode === 'create' ? v.inv('database') : undefined} onChange={(val) => set('database', val)} />
        </div>
        <div className="stack stack--sm">
          <RadioGroup ariaLabel="Select database" value={dbMode} onChange={() => { setDbMode('select'); set('database', DATABASES[0], 'database'); }} options={[{ value: 'select', label: 'Select database' }]} />
          <SelectField aria-label="Existing database" value={dbMode === 'select' ? d.database : ''} placeholder="Select" disabled={dbMode !== 'select'} options={DATABASES} onChange={(val) => set('database', val)} />
        </div>
      </div>
      <h4 className="add-data-source-sub">Backup settings</h4>
      <div className="add-data-source-two">
        <TextField label={req('Data path')} value={d.dataPath} maxLength={260} aria-invalid={v.inv('dataPath')} onChange={(val) => set('dataPath', val)} />
        <div className="add-data-source-inline">
          <TextField label="Backup path" value={d.backupPath} maxLength={260} onChange={(val) => set('backupPath', val)} />
          <Button onClick={() => set('backupPath', d.dataPath.trim() || DEFAULT_DATA_PATH)}>Same as data path</Button>
        </div>
      </div>
      {d.mode === 'express' && <Note lead="Express configuration:" sep=" ">all organizational units and object classes are audited. Change this later by editing the domain.</Note>}
    </>
  );
}

/* ---------------- Step 5: organizational units ---------------- */
function OuStep({ d, setD, toast }: { d: Draft; setD: SetD; toast: Toast }) {
  const all = useMemo(() => ouPaths(d.domain), [d.domain]);
  const [q, setQ] = useState('');
  const [typed, setTyped] = useState('');
  const disabled = d.ouScope === 'all';
  const shown = all.filter((p) => p.toLowerCase().includes(q.trim().toLowerCase()));
  const setOus = (ous: string[]) => setD((x) => ({ ...x, ous }));
  const toggle = (p: string, val: boolean) => setOus(val ? [...d.ous, p] : d.ous.filter((x) => x !== p));
  const allShown = shown.length > 0 && shown.every((p) => d.ous.includes(p));
  const addTyped = () => {
    const p = typed.trim();
    if (!p) { toast({ variant: 'error', title: 'Enter OU', message: `Type an OU path, for example ${dnsOf(d.domain)}/Finance.` }); return; }
    if (d.ous.some((x) => x.toLowerCase() === p.toLowerCase())) { toast({ variant: 'info', title: 'Already added', message: `${p} is already selected.` }); return; }
    setOus([...d.ous, p]); setTyped('');
  };

  return (
    <>
      <p className="add-data-source-lead" style={{ marginTop: 0 }}>Specify the organizational units to be audited.</p>
      <div className="add-data-source-two">
        <SelectField label="Audit" value={d.ouScope} options={OU_SCOPE} onChange={(val) => setD((x) => ({ ...x, ouScope: val as OuScope }))} />
        <div className="add-data-source-inline">
          <TextField label="Enter OU" value={typed} placeholder={`e.g. ${dnsOf(d.domain)}/Finance`} disabled={disabled} maxLength={512} onChange={setTyped} />
          <Button icon="plus" disabled={disabled} onClick={addTyped}>Add</Button>
        </div>
      </div>
      {disabled
        ? <Banner tone="info">Every organizational unit in {dnsOf(d.domain)} is audited. Choose another option to pick organizational units.</Banner>
        : (
          <div className="ad-dual">
            <section className="ad-dual__pane" aria-label="Organizational units in the domain">
              <header className="ad-dual__head">
                <Checkbox checked={allShown} indeterminate={!allShown && shown.some((p) => d.ous.includes(p))} label="OU path"
                  onChange={(val) => setOus(val ? [...new Set([...d.ous, ...shown])] : d.ous.filter((x) => !shown.includes(x)))} />
              </header>
              <div className="ad-dual__search"><SearchField value={q} onChange={setQ} placeholder="Search OU paths" ariaLabel="Search OU paths" maxLength={200} /></div>
              <ul className="ad-dual__list">
                {shown.map((p) => (
                  <li key={p}><Checkbox checked={d.ous.includes(p)} onChange={(val) => toggle(p, val)} label={p} /></li>
                ))}
                {!shown.length && <li className="ad-dual__empty">No OU paths match "{q.trim()}".</li>}
              </ul>
              <footer className="ad-dual__foot">{shown.length} of {all.length} record(s)</footer>
            </section>
            <section className="ad-dual__pane" aria-label="Selected OU paths">
              <header className="ad-dual__head">
                <b>Selected OU path ({d.ous.length})</b>
                <Button size="sm" disabled={!d.ous.length} onClick={() => setOus([])}>Clear all</Button>
              </header>
              {d.ous.length ? (
                <ul className="ad-dual__list">
                  {d.ous.map((p) => (
                    <li key={p} className="ad-dual__chosen">
                      <span className="grow">{p}</span>
                      <IconButton icon="x" label={`Remove ${p}`} onClick={() => toggle(p, false)} />
                    </li>
                  ))}
                </ul>
              ) : <EmptyState compact icon="folder" title="No OU paths selected yet." />}
            </section>
          </div>
        )}
    </>
  );
}

/* ---------------- Step 6: object classes ---------------- */
function ClassStep({ d, setD, onScript }: { d: Draft; setD: SetD; onScript: () => void }) {
  const disabled = d.classScope === 'all';
  return (
    <>
      <p className="add-data-source-lead" style={{ marginTop: 0 }}>Select the object classes and other settings to be audited.</p>
      <div className="add-data-source-two">
        <SelectField label="Audit" value={d.classScope} options={CLASS_SCOPE} onChange={(val) => setD((x) => ({ ...x, classScope: val as ClassScope }))} />
      </div>
      {disabled
        ? <Banner tone="info">Every Active Directory and Exchange Server object class is audited.</Banner>
        : (
          <div className="ad-dual">
            <ClassList title="Active Directory object classes" all={AD_OBJECT_CLASSES} chosen={d.adClasses} onChange={(adClasses) => setD((x) => ({ ...x, adClasses }))} />
            <ClassList title="Exchange Server object classes" all={EXCHANGE_OBJECT_CLASSES} chosen={d.exClasses} onChange={(exClasses) => setD((x) => ({ ...x, exClasses }))} />
          </div>
        )}
      {!disabled && (
        <p className="add-data-source-foot-note">
          {d.classScope === 'only' ? 'Only the selected' : 'All except the selected'} {d.adClasses.length + d.exClasses.length} class(es) will be audited.
        </p>
      )}
      <h4 className="add-data-source-sub">More audit settings</h4>
      <div className="add-data-source-checks">
        <Checkbox checked={d.failedLogon} onChange={(val) => setD((x) => ({ ...x, failedLogon: val }))} label="Audit failed logon" />
        <div className="row" style={{ gap: 4 }}>
          <Checkbox checked={d.logonLogoff} onChange={(val) => setD((x) => ({ ...x, logonLogoff: val }))} label="Audit successful user logon/logoff" />
          <IconButton icon="settings" label="Create logon/logoff script" disabled={!d.logonLogoff} onClick={onScript} />
        </div>
      </div>
    </>
  );
}

function ClassList({ title, all, chosen, onChange }: { title: string; all: string[]; chosen: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState('');
  const shown = all.filter((c) => c.toLowerCase().includes(q.trim().toLowerCase()));
  const every = shown.length > 0 && shown.every((c) => chosen.includes(c));
  return (
    <section className="ad-dual__pane" aria-label={title}>
      <header className="ad-dual__head">
        <Checkbox checked={every} indeterminate={!every && shown.some((c) => chosen.includes(c))} label={title}
          onChange={(val) => onChange(val ? [...new Set([...chosen, ...shown])] : chosen.filter((x) => !shown.includes(x)))} />
      </header>
      <div className="ad-dual__search"><SearchField value={q} onChange={setQ} placeholder="Search classes" ariaLabel={`Search ${title}`} maxLength={200} /></div>
      <ul className="ad-dual__list">
        {shown.map((c) => (
          <li key={c}><Checkbox checked={chosen.includes(c)} onChange={(val) => onChange(val ? [...chosen, c] : chosen.filter((x) => x !== c))} label={c} /></li>
        ))}
        {!shown.length && <li className="ad-dual__empty">No classes match "{q.trim()}".</li>}
      </ul>
      <footer className="ad-dual__foot">{chosen.length} selected</footer>
    </section>
  );
}

/* ---------------- Dialogs ---------------- */
function ConfigureAuditing({ open, auto, domain, onAuto, onClose, onNext }: {
  open: boolean; auto: boolean; domain: string; onAuto: (a: boolean) => void; onClose: () => void; onNext: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Configure auditing" icon="shield" size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" iconEnd="arrow" onClick={onNext}>Next</Button></>}>
      <p className="add-data-source-note" style={{ fontWeight: 400 }}>
        To enable auditing automatically, the software deploys an agent on the primary domain controller of {domain || 'the domain'}. The agent is
        removed once the changes for auditing are made. You can also make these changes manually.
      </p>
      <div className="add-data-source-block">
        <h4>Auditing isn't enabled for this domain. Lepide Auditor for Active Directory will:</h4>
        <ul className="add-data-source-bullets">
          <li>Enable these system audit policies: {AUDIT_POLICIES}.</li>
          <li>Set up the audit entries of the Active Directory environment as follows:</li>
        </ul>
        <MiniTable label="Audit entries" head={<><th>Auditing entries for</th><th>Naming context</th><th>Principal</th><th>Access</th></>}>
          {AUDIT_ENTRIES.map((e) => (
            <tr key={e.target} className="lf-row" style={{ cursor: 'default' }}>
              <td className="td-wrap">{e.target}</td><td>{e.context}</td><td>{e.principal}</td><td className="td-wrap">{e.access}</td>
            </tr>
          ))}
        </MiniTable>
      </div>
      <RadioGroup ariaLabel="Who makes the changes" value={auto ? 'auto' : 'manual'} onChange={(val) => onAuto(val === 'auto')}
        options={[{ value: 'auto', label: 'Yes, the software can make the required changes.' }, { value: 'manual', label: 'No, I will adjust these settings manually later.' }]} />
    </Modal>
  );
}

function SelectGpo({ open, d, setD, onBack, onClose, onDone }: { open: boolean; d: Draft; setD: SetD; onBack: () => void; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<'new' | 'existing'>(d.gpo && GPOS.includes(d.gpo) ? 'existing' : 'new');
  const [name, setName] = useState(d.gpo && !GPOS.includes(d.gpo) ? d.gpo : 'Audit AD');
  const [existing, setExisting] = useState(d.gpo && GPOS.includes(d.gpo) ? d.gpo : GPOS[0]);
  const [server, setServer] = useState('');
  const done = () => {
    if (mode === 'new' && !name.trim()) { toast({ variant: 'error', title: 'GPO name', message: 'Enter a name for the new GPO.' }); return; }
    setD((x) => ({ ...x, gpo: mode === 'new' ? name.trim() : existing }));
    onDone();
  };
  return (
    <Modal open={open} onClose={onClose} title="Group Policy Object selection" icon="file" size="md"
      footer={<><Button icon="chevron-left" onClick={onBack}>Back</Button><span className="spacer" /><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <p className="add-data-source-note" style={{ fontWeight: 400 }}>Choose the Group Policy Object the audit policies are applied through.</p>
      <TextField label="Server name or IP" value={server || d.preferredDc || d.domain} maxLength={256} onChange={setServer} />
      <div className="stack stack--sm">
        <RadioGroup ariaLabel="New GPO" value={mode} onChange={() => setMode('new')} options={[{ value: 'new', label: 'Create new GPO (recommended)' }]} />
        <TextField aria-label="New GPO name" value={name} disabled={mode !== 'new'} maxLength={128} onChange={setName} />
      </div>
      <div className="stack stack--sm">
        <RadioGroup ariaLabel="Existing GPO" value={mode} onChange={() => setMode('existing')} options={[{ value: 'existing', label: 'Select an existing GPO' }]} />
        <SelectField aria-label="Existing GPO" value={existing} disabled={mode !== 'existing'} options={GPOS} onChange={setExisting} />
      </div>
      <Checkbox checked={d.gpoBackup} disabled={mode !== 'existing'} onChange={(val) => setD((x) => ({ ...x, gpoBackup: val }))}
        label="Create a backup of the selected GPO before enabling auditing" />
    </Modal>
  );
}

function LogonScript({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [ip, setIp] = useState('');
  const [path, setPath] = useState('\\\\DC01\\NETLOGON\\');
  const [tried, setTried] = useState(false);
  const close = () => { setTried(false); onClose(); };
  const create = () => {
    setTried(true);
    if (!isValidIp(ip) || !path.trim()) { toast({ variant: 'error', title: 'Check the highlighted fields', message: 'Enter a valid IP address and the path to save the script.' }); return; }
    toast({ variant: 'success', title: 'Logon/logoff script created', message: `Logon.exe saved to ${path.trim()} and linked to ${ip.trim()}.` });
    close();
  };
  return (
    <Modal open={open} onClose={close} title="Create logon/logoff script" icon="terminal" size="md"
      footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={create}>Create script</Button></>}>
      <TextField label="IP address of the machine running the Logon/Logoff service" value={ip} placeholder="e.g. 192.168.30.40" maxLength={15}
        aria-invalid={tried && !isValidIp(ip) ? true : undefined} onChange={setIp} />
      <Note lead="Note:" sep=" ">Logon.exe is linked to this IP address and runs only on it.</Note>
      <TextField label="Path to save the file" value={path} maxLength={260} aria-invalid={tried && !path.trim() ? true : undefined} onChange={setPath} />
    </Modal>
  );
}
