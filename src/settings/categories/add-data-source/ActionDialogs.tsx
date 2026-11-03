import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Button, Checkbox, ConfirmDialog, Icon, Modal, PasswordField, RadioGroup, SelectField, TextField, useToast,
} from '../../../ui';
import { ACTION_LABEL, CURRENT_USER, canRun, dsStore, ds$, isInstalled, stampNow } from './store';
import type { AgentAction, FileServer, ServerType } from './store';
import {
  CellInput, HeadCheck, InfoTip, MiniTable, Note, RowCheck, StatusRunView, WizardFooter, WizardFrame, useInvalid,
} from './parts';

/* DLG-SDS-10 agent actions · DLG-SDS-11 modify · DLG-SDS-12 remove · DLG-SDS-13 domain controllers ·
   DLG-SDS-15 properties · DLG-SDS-16 agent properties. */

const SELECT_COPY: Record<Exclude<AgentAction, 'upgrade'>, { title: string; lead: string }> = {
  install: { title: 'Select file server to install agent', lead: 'Select file server from the following group & enter login and password to install agent' },
  uninstall: { title: 'Click Next to uninstall agent', lead: 'Select file server(s) to uninstall agent' },
  start: { title: 'Click Next to start auditing', lead: 'Select file server(s) to start auditing' },
  stop: { title: 'Click Next to stop auditing', lead: 'Select file server(s) to stop auditing' },
  update: { title: 'Click Next to update agent', lead: 'Select file server(s) to update agent' },
};
const TASK: Record<AgentAction, (n: string) => string> = {
  install: (n) => `Installing Agent for ${n}`, uninstall: (n) => `Uninstalling Agent from ${n}`, start: (n) => `Starting auditing on ${n}`,
  stop: (n) => `Stopping auditing on ${n}`, update: (n) => `Updating Agent for ${n}`, upgrade: (n) => `Reinstalling Agent for ${n}`,
};
const DONE_TEXT: Record<AgentAction, string> = {
  install: 'Installation successful', uninstall: 'Uninstallation successful', start: 'Auditing started', stop: 'Auditing stopped', update: 'Update successful', upgrade: 'Upgrade successful',
};
const DONE_TOAST: Record<AgentAction, string> = {
  install: 'Agent installed', uninstall: 'Agent uninstalled', start: 'Auditing started', stop: 'Auditing stopped', update: 'Agent updated', upgrade: 'Agent upgraded',
};

/* ---------------- DLG-SDS-10 ---------------- */
export function AgentActionDialog({ action, fixedId, onClose }: { action: AgentAction; fixedId?: string; onClose: () => void }) {
  const toast = useToast();
  const servers = dsStore.use((s) => s.servers);
  const eligible = useMemo(() => (fixedId ? servers.filter((s) => s.id === fixedId) : servers.filter((s) => canRun(action, s))), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [phase, setPhase] = useState<'select' | 'confirm' | 'status'>(action === 'upgrade' ? 'confirm' : 'select');
  const [picked, setPicked] = useState<string[]>(() => (action === 'install' || action === 'upgrade' ? (fixedId ? [fixedId] : []) : eligible.map((s) => s.id)));
  const [creds, setCreds] = useState<Record<string, { user: string; password: string }>>({});
  const [bad, setBad] = useState<string[]>([]);
  const [chosen, setChosen] = useState<FileServer[]>([]);
  const [done, setDone] = useState(false);

  const finish = () => {
    const ids = chosen.map((s) => s.id);
    const now = stampNow();
    ds$.patchServers(ids, () => {
      switch (action) {
        case 'install': case 'upgrade': return { agentStatus: 'Installed', lastUpdate: now };
        case 'uninstall': return { agentStatus: 'Not Installed', auditStatus: 'Auditing Stopped', lastUpdate: now };
        case 'start': return { auditStatus: 'Auditing Started', lastUpdate: now };
        case 'stop': return { auditStatus: 'Auditing Stopped', lastUpdate: now };
        default: return { lastUpdate: now };
      }
    });
    toast({ variant: 'success', title: DONE_TOAST[action], message: chosen.length === 1 ? chosen[0].name : `${chosen.length} file servers` });
    onClose();
  };

  if (phase === 'confirm') {
    return (
      <ConfirmDialog open destructive={false} icon="upload" title="Upgrade agent" message="Do you want to reinstall the agent for all file server"
        cancelLabel="No" confirmLabel="Yes" onClose={onClose}
        onConfirm={() => {
          const inst = servers.filter(isInstalled);
          if (!inst.length) { toast({ variant: 'info', title: 'Nothing to upgrade', message: 'No file server has an agent installed.' }); onClose(); return; }
          setChosen(inst); setPhase('status');
        }} />
    );
  }

  if (phase === 'status') {
    return (
      <Modal open onClose={() => { if (done) finish(); }} title="Status" icon="refresh" size="md" escapeCloses={false}
        footer={<><Button disabled>Cancel</Button><Button variant="primary" disabled={!done} onClick={finish}>Finish</Button></>}>
        <StatusRunView compact tasks={chosen.map((s) => TASK[action](s.name))} doneTasks={chosen.map((s) => `Saving Settings for ${s.name}`)}
          doneText={DONE_TEXT[action]} onDone={() => setDone(true)} />
      </Modal>
    );
  }

  const a = action as Exclude<AgentAction, 'upgrade'>;
  const install = a === 'install';
  const copy = install && fixedId
    ? { title: 'Click next to install agent on selected file server', lead: 'Enter login name and password for file server(s) to install agent' }
    : SELECT_COPY[a];
  const allOn = eligible.length > 0 && eligible.every((s) => picked.includes(s.id));
  const next = () => {
    if (!eligible.length) { toast({ variant: 'error', title: 'Select file servers', message: 'No file server is in a state for this action.' }); return; }
    if (!picked.length) { toast({ variant: 'error', title: 'Select file servers', message: 'Tick at least one file server.' }); return; }
    if (install) {
      const miss = picked.flatMap((id) => [!creds[id]?.user?.trim() && `${id}:user`, !creds[id]?.password && `${id}:password`].filter(Boolean) as string[]);
      if (miss.length) { setBad(miss); toast({ variant: 'error', title: 'Login required', message: 'Enter the user name and password for each selected file server.' }); return; }
    }
    setChosen(eligible.filter((s) => picked.includes(s.id))); setPhase('status');
  };
  const setCred = (id: string, k: 'user' | 'password', v: string) => {
    setCreds((c) => ({ ...c, [id]: { user: c[id]?.user ?? '', password: c[id]?.password ?? '', [k]: v } }));
    setBad((b) => b.filter((x) => x !== `${id}:${k}`));
  };

  return (
    <Modal open onClose={onClose} title={copy.title} subtitle={copy.lead} icon={install ? 'download' : 'server'} size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" iconEnd="arrow" onClick={next}>Next</Button></>}>
      <MiniTable label={ACTION_LABEL[a]}
        head={<>
          <HeadCheck label={install ? 'File Server Name' : 'File Server(s)'} checked={allOn} indeterminate={picked.length > 0} disabled={!eligible.length}
            onChange={() => setPicked(allOn ? [] : eligible.map((s) => s.id))} />
          <th>Domain/Workgroup</th>
          {install && <><th>User Name</th><th>Password</th></>}
        </>}>
        {eligible.length === 0 ? <tr className="add-data-source-empty-row"><td colSpan={install ? 4 : 2}>No file server is in a state for this action.</td></tr>
          : eligible.map((s) => (
            <tr key={s.id} className="lf-row" style={{ cursor: 'default' }}>
              <td><RowCheck label={s.name} checked={picked.includes(s.id)} onChange={(v) => setPicked((p) => (v ? [...p, s.id] : p.filter((x) => x !== s.id)))}>{s.name}</RowCheck></td>
              <td>{s.domain}</td>
              {install && <>
                <td><CellInput label={`User name for ${s.name}`} placeholder="user" value={creds[s.id]?.user ?? ''} invalid={bad.includes(`${s.id}:user`)} onChange={(v) => setCred(s.id, 'user', v)} /></td>
                <td><CellInput label={`Password for ${s.name}`} type="password" placeholder="*****" value={creds[s.id]?.password ?? ''} invalid={bad.includes(`${s.id}:password`)} onChange={(v) => setCred(s.id, 'password', v)} /></td>
              </>}
            </tr>
          ))}
      </MiniTable>
      {install && (
        <div className="add-data-source-note">
          <b>Note:</b> For WINDOWS:- Enter user name in "Domain\UserName" format.<br />
          For NETAPP CLUSTER MODE: Enter user name in "Domain\UserName" format.<br />
          For NETAPP :- Enter user name in "NetAppFiler\UserName" format.
        </div>
      )}
    </Modal>
  );
}

/* ---------------- DLG-SDS-11 Modify ---------------- */
export type ModFamily = 'windows' | 'netapp7' | 'netappCluster';
export const MOD_FAMILY_LABEL: Record<ModFamily, string> = { windows: 'Windows', netapp7: 'NetApp 7-Mode', netappCluster: 'NetApp Cluster-Mode' };
type ModOpts = { props: boolean; share: boolean; agent: boolean; db: boolean };
export type ModifyReq = { family: ModFamily; opts: ModOpts };

export function ModifyChooser({ onClose, onNext }: { onClose: () => void; onNext: (r: ModifyReq) => void }) {
  const toast = useToast();
  const servers = dsStore.use((s) => s.servers);
  const [family, setFamily] = useState<ModFamily>('windows');
  const [o, setO] = useState<ModOpts>({ props: false, share: false, agent: false, db: false });
  const pick = (f: ModFamily) => { setFamily(f); setO({ props: false, share: false, agent: false, db: false }); };
  const box = (f: ModFamily, k: keyof ModOpts, label: string, extraDisabled = false) => (
    <Checkbox label={label} checked={family === f && o[k]} disabled={family !== f || extraDisabled}
      onChange={(v) => setO((x) => ({ ...x, [k]: v, ...(k === 'props' && !v ? { share: false } : {}) }))} />
  );
  const next = () => {
    if (!o.props && !o.share && !o.agent && !o.db) { toast({ variant: 'error', title: 'Choose settings', message: 'Tick at least one setting to modify.' }); return; }
    if (!servers.some((s) => s.type === family)) { toast({ variant: 'info', title: 'No file servers', message: `There are no ${MOD_FAMILY_LABEL[family]} file servers to modify.` }); return; }
    onNext({ family, opts: o });
  };
  const fam = (f: ModFamily, children: ReactNode) => (
    <div className="add-data-source-family">
      <RadioGroup ariaLabel={MOD_FAMILY_LABEL[f]} value={family} onChange={() => pick(f)} options={[{ value: f, label: MOD_FAMILY_LABEL[f] }]} />
      <div className="add-data-source-checks add-data-source-indent">{children}</div>
    </div>
  );
  return (
    <Modal open onClose={onClose} title="Modify file server(s) settings" icon="edit" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" iconEnd="arrow" onClick={next}>Next</Button></>}>
      <div role="radiogroup" aria-label="Server family" className="stack stack--sm">
        {fam('windows', <>
          {box('windows', 'props', 'File Server Properties')}
          <div className="add-data-source-indent">{box('windows', 'share', 'Agent Share Path', !o.props)}</div>
          {box('windows', 'db', 'Database')}
        </>)}
        {fam('netapp7', <>
          {box('netapp7', 'props', 'NetApp Server Properties')}
          {box('netapp7', 'agent', 'Agent Machine Properties')}
          {box('netapp7', 'db', 'Database')}
        </>)}
        {fam('netappCluster', <>
          {box('netappCluster', 'props', 'NetApp Server Properties')}
          {box('netappCluster', 'db', 'Database')}
        </>)}
      </div>
    </Modal>
  );
}

type ModRow = { id: string; name: string; domain: string; user: string; password: string; sharePath: string; logicalPath: string };

export function ModifyWizard({ req, onClose }: { req: ModifyReq; onClose: () => void }) {
  const toast = useToast();
  const servers = dsStore.use((s) => s.servers);
  const famServers = useMemo(() => servers.filter((s) => s.type === (req.family as ServerType)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const settingsStep = req.opts.props || req.opts.share || req.opts.agent;
  const steps = [...(settingsStep ? ['Modify file-server setting'] : []), ...(req.opts.db ? ['Database Settings'] : []), 'Status'];
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>(famServers.map((s) => s.id));
  const [rows, setRows] = useState<ModRow[]>(() => famServers.map((s) => ({
    id: s.id, name: s.name, domain: s.domain, user: s.logonUser === 'Current user' ? '' : s.logonUser, password: s.logonPassword ?? '',
    sharePath: s.sharePath || `\\\\${s.name}\\ADMIN$`, logicalPath: '-',
  })));
  const [auth, setAuth] = useState('user');
  const [user, setUser] = useState(''); const [password, setPassword] = useState('');
  const [common, setCommon] = useState(false); const [shareName, setShareName] = useState(''); const [logical, setLogical] = useState('');
  const [sqlServer, setSqlServer] = useState('NDR27\\SQL16'); const [database, setDatabase] = useState('LEPIDE200');
  const [runDone, setRunDone] = useState(false);
  const v = useInvalid();
  const cur = steps[step];
  const onStatus = cur === 'Status';
  const fl = MOD_FAMILY_LABEL[req.family];
  const allOn = rows.length > 0 && rows.every((r) => picked.includes(r.id));
  const patch = (id: string, p: Partial<ModRow>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const check = (
    <HeadCheck label="File Server Name/IP" checked={allOn} indeterminate={picked.length > 0} onChange={() => setPicked(allOn ? [] : rows.map((r) => r.id))} />
  );
  const rowCheck = (r: ModRow) => <RowCheck label={r.name} checked={picked.includes(r.id)} onChange={(on) => setPicked((p) => (on ? [...p, r.id] : p.filter((x) => x !== r.id)))}>{r.name}</RowCheck>;

  const next = () => {
    if (!onStatus && !picked.length) { toast({ variant: 'error', title: 'Select file servers', message: 'Tick at least one file server.' }); return; }
    if (cur === 'Database Settings' && (!sqlServer.trim() || !database)) { v.mark(['sql']); toast({ variant: 'error', title: 'Database Settings', message: 'Enter the SQL Server and database.' }); return; }
    setStep((s) => s + 1);
  };
  const finish = () => {
    const chosen = rows.filter((r) => picked.includes(r.id));
    const now = stampNow();
    dsStore.set((st) => ({
      ...st, servers: st.servers.map((s) => {
        const r = chosen.find((x) => x.id === s.id); if (!r) return s;
        return {
          ...s, logonUser: r.user.trim() || 'Current user', logonPassword: r.password || undefined, sharePath: r.sharePath, lastUpdate: now,
          ...(req.opts.db ? { sqlServer: sqlServer.trim(), database } : {}),
        };
      }),
    }));
    toast({ variant: 'success', title: 'File servers modified', message: `${chosen.length} ${fl} file server(s) updated.` });
    onClose();
  };

  let body: ReactNode = null;
  if (cur === 'Modify file-server setting') {
    body = (
      <>
        <div className="row row--between row--wrap">
          <h4 className="add-data-source-step-title">Modify file server(s) settings</h4>
          {req.opts.share && <Button icon="folder" onClick={() => {
            setRows((r) => r.map((x) => ({ ...x, logicalPath: `\\\\${x.name}\\Shares` })));
            toast({ variant: 'success', title: 'Logical paths found', message: 'Share logical paths read from the file servers.' });
          }}>Get Logical Path</Button>}
        </div>
        <MiniTable label="File servers to modify"
          head={<>{check}<th>Domain/Workgroup</th><th>User name</th><th>Password</th>{req.opts.share && <><th>Installation Share Path</th><th>Share Logical Path</th></>}</>}>
          {rows.map((r) => (
            <tr key={r.id} className="lf-row" style={{ cursor: 'default' }}>
              <td>{rowCheck(r)}</td><td>{r.domain}</td>
              <td><CellInput label={`User for ${r.name}`} value={r.user} placeholder="user" onChange={(val) => patch(r.id, { user: val })} /></td>
              <td><CellInput label={`Password for ${r.name}`} type="password" value={r.password} placeholder="**********" onChange={(val) => patch(r.id, { password: val })} /></td>
              {req.opts.share && <>
                <td className="lf-mono">{r.sharePath}</td>
                <td className="lf-mono">{r.logicalPath}</td>
              </>}
            </tr>
          ))}
        </MiniTable>
        <RadioGroup ariaLabel="Credentials" value={auth} onChange={(val) => { setAuth(val); v.clear('user'); v.clear('password'); }}
          options={[{ value: 'current', label: `Current User (${CURRENT_USER})` }, { value: 'user', label: 'The following user' }]} />
        <div className="add-data-source-inline">
          <TextField label="User Name" value={user} disabled={auth !== 'user'} maxLength={256} aria-invalid={v.inv('user')} onChange={(val) => { setUser(val); v.clear('user'); }} />
          <PasswordField label="Password" value={password} disabled={auth !== 'user'} maxLength={256} aria-invalid={v.inv('password')} onChange={(val) => { setPassword(val); v.clear('password'); }} autoComplete="new-password" />
          <Button onClick={() => {
            if (auth === 'user' && (!user.trim() || !password)) {
              v.mark(['user', 'password'].filter((k) => !(k === 'user' ? user.trim() : password)));
              toast({ variant: 'error', title: 'Apply to all', message: 'Enter the user name and password first.' }); return;
            }
            setRows((r) => r.map((x) => (!picked.includes(x.id) ? x : {
              ...x, user: auth === 'user' ? user.trim() : '', password: auth === 'user' ? password : '',
              ...(req.opts.share && common && shareName.trim() ? { sharePath: `\\\\${x.name}\\${shareName.trim()}` } : {}),
              ...(req.opts.share && common && logical.trim() ? { logicalPath: logical.trim() } : {}),
            })));
          }}>Apply to all</Button>
        </div>
        <Note lead="Note:" sep=" ">Use "Domain\UserName" format for User Name</Note>
        {req.opts.share && <>
          <Checkbox label="Common share and logical path" checked={common} onChange={setCommon} />
          <div className="add-data-source-two">
            <TextField label="Share name" value={shareName} disabled={!common} maxLength={256} onChange={setShareName} />
            <TextField label="Share logical path" value={logical} disabled={!common} maxLength={256} onChange={setLogical} />
          </div>
        </>}
      </>
    );
  } else if (cur === 'Database Settings') {
    body = (
      <>
        <h4 className="add-data-source-step-title">Database Settings</h4>
        <MiniTable label="File servers" head={<>{check}<th>Domain/Workgroup</th></>}>
          {rows.map((r) => <tr key={r.id} className="lf-row" style={{ cursor: 'default' }}><td>{rowCheck(r)}</td><td>{r.domain}</td></tr>)}
        </MiniTable>
        <div className="add-data-source-two">
          <TextField label="SQL Server Name/IP" value={sqlServer} maxLength={256} aria-invalid={v.inv('sql') && !sqlServer.trim() ? true : undefined} onChange={setSqlServer} />
          <SelectField label="Database" value={database} options={['LEPIDE200', 'FSA_DB', 'LepideF1']} onChange={setDatabase} />
        </div>
      </>
    );
  } else {
    body = (
      <>
        <h4 className="add-data-source-step-title">Status</h4>
        <StatusRunView tasks={rows.filter((r) => picked.includes(r.id)).map((r) => `Saving Settings for ${r.name}`)} onDone={() => setRunDone(true)} />
      </>
    );
  }

  return (
    <WizardFrame root="File Server" crumb={`Modify File Server / ${fl}`} steps={steps} step={step} onClose={onClose} busy={onStatus}
      footer={<WizardFooter onBack={() => setStep((s) => s - 1)} backDisabled={step === 0 || onStatus} onCancel={onClose} cancelDisabled={onStatus}
        onNext={onStatus ? finish : next} nextLabel={onStatus ? 'Finish' : 'Next'} nextDisabled={onStatus && !runDone} />}>
      {body}
    </WizardFrame>
  );
}

/* ---------------- DLG-SDS-12 Remove ---------------- */
export function RemoveWizard({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const servers = dsStore.use((s) => s.servers);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [fName, setFName] = useState(''); const [fDomain, setFDomain] = useState('');
  const [user, setUser] = useState(''); const [password, setPassword] = useState('');
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [chosen, setChosen] = useState<FileServer[]>([]);
  const [runDone, setRunDone] = useState(false);
  const v = useInvalid();
  // GAP-SDS-04 intended: both filters are case-insensitive.
  const shown = servers.filter((s) => s.name.toLowerCase().includes(fName.trim().toLowerCase()) && s.domain.toLowerCase().includes(fDomain.trim().toLowerCase()));
  const allOn = shown.length > 0 && shown.every((s) => picked.includes(s.id));
  const onStatus = step === 1;

  const next = () => {
    if (!picked.length) { toast({ variant: 'error', title: 'Select file servers', message: "Tick the file server(s) you want to remove." }); return; }
    setChosen(servers.filter((s) => picked.includes(s.id))); setStep(1);
  };
  const finish = () => {
    ds$.removeServers(chosen.map((s) => s.id));
    toast({ variant: 'success', title: 'File servers removed', message: `${chosen.length} file server(s) removed from auditing.` });
    onClose();
  };

  return (
    <WizardFrame root="File Server" crumb="Remove File Server" steps={['Remove File Server', 'Status']} step={step} onClose={onClose} busy={onStatus}
      footer={<WizardFooter onBack={() => setStep(0)} backDisabled onCancel={onClose} cancelDisabled={onStatus}
        onNext={onStatus ? finish : next} nextLabel={onStatus ? 'Finish' : 'Next'} nextDisabled={onStatus && !runDone} />}>
      {!onStatus ? (
        <>
          <h4 className="add-data-source-step-title">Select file server(s) you want to remove and click Next</h4>
          <section className="lf-card tablecard tablecard--flat tablecard--static add-data-source-mini">
            <div className="tbl-wrap">
              <table className="lf-table lf-table--auto" aria-label="File servers to remove">
                <thead>
                  <tr>
                    <HeadCheck label="File Server Name/IP" checked={allOn} indeterminate={shown.some((s) => picked.includes(s.id))}
                      onChange={() => setPicked(allOn ? picked.filter((id) => !shown.some((s) => s.id === id)) : Array.from(new Set([...picked, ...shown.map((s) => s.id)])))} />
                    <th>Domain/Workgroup</th><th>User Name</th><th>Password</th>
                  </tr>
                  <tr className="filter-row">
                    <th><span className={'filter-input' + (fName ? ' has-value' : '')}><Icon name="search" size={12} /><input value={fName} placeholder="Filter" aria-label="Filter name" maxLength={200} onChange={(e) => setFName(e.target.value)} /></span></th>
                    <th><span className={'filter-input' + (fDomain ? ' has-value' : '')}><Icon name="search" size={12} /><input value={fDomain} placeholder="Filter" aria-label="Filter domain" maxLength={200} onChange={(e) => setFDomain(e.target.value)} /></span></th>
                    <th /><th />
                  </tr>
                </thead>
                <tbody>
                  {shown.length === 0 ? <tr className="add-data-source-empty-row"><td colSpan={4}>No results match your search or filters.</td></tr>
                    : shown.map((s) => (
                      <tr key={s.id} className="lf-row" style={{ cursor: 'default' }}>
                        <td><RowCheck label={s.name} checked={picked.includes(s.id)} onChange={(on) => setPicked((p) => (on ? [...p, s.id] : p.filter((x) => x !== s.id)))}>{s.name}</RowCheck></td>
                        <td>{s.domain}</td>
                        <td>{applied[s.id] ?? <span className="lf-na">—</span>}</td>
                        <td>{applied[s.id] ? '••••••••' : <span className="lf-na">—</span>}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="add-data-source-inline">
            <TextField label="User Name" value={user} maxLength={256} aria-invalid={v.inv('user')} onChange={(val) => { setUser(val); v.clear('user'); }} />
            <PasswordField label="Password" value={password} maxLength={256} aria-invalid={v.inv('password')} onChange={(val) => { setPassword(val); v.clear('password'); }} autoComplete="new-password" />
            <Button onClick={() => {
              if (!user.trim() || !password) { v.mark(['user', 'password'].filter((k) => !(k === 'user' ? user.trim() : password))); toast({ variant: 'error', title: 'Apply to all', message: 'Enter the user name and password first.' }); return; }
              setApplied((a) => ({ ...a, ...Object.fromEntries(picked.map((id) => [id, user.trim()])) }));
              toast({ variant: 'success', title: 'Applied to all', message: 'Credentials set for the selected file servers.' });
            }}>Apply to all</Button>
          </div>
        </>
      ) : (
        <>
          <h4 className="add-data-source-step-title">Status</h4>
          {/* GAP-SDS-10: the built task text had a double space after "Removing". */}
          <StatusRunView tasks={chosen.map((s) => `Removing ${s.name}`)} onDone={() => setRunDone(true)} />
        </>
      )}
    </WizardFrame>
  );
}

/* ---------------- DLG-SDS-13 Domain controllers ---------------- */
export function DomainControllersFrame({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const servers = dsStore.use((s) => s.servers);
  const win = useMemo(() => servers.filter((s) => s.type === 'windows'), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [picked, setPicked] = useState<string[]>(win[0] ? [win[0].id] : []);
  const [dc, setDc] = useState(''); const [user, setUser] = useState(''); const [password, setPassword] = useState('');
  const [filled, setFilled] = useState<Record<string, { dc: string; user: string }>>({});
  const v = useInvalid();
  const allOn = win.length > 0 && win.every((s) => picked.includes(s.id));

  const apply = () => {
    if (!dc.trim() || !user.trim() || !password) {
      v.mark(['dc', 'user', 'password'].filter((k) => !(k === 'dc' ? dc.trim() : k === 'user' ? user.trim() : password)));
      toast({ variant: 'error', title: 'Apply to all', message: 'Enter the domain controller, user name and password.' }); return;
    }
    if (!picked.length) { toast({ variant: 'error', title: 'Apply to all', message: 'Tick at least one file server.' }); return; }
    setFilled((f) => ({ ...f, ...Object.fromEntries(picked.map((id) => [id, { dc: dc.trim(), user: user.trim() }])) }));
  };
  const done = () => {
    const ids = Object.keys(filled);
    if (!ids.length) { toast({ variant: 'error', title: 'Nothing to save', message: 'Fill the fields and click Apply to All first.' }); return; }
    dsStore.set((st) => ({ ...st, servers: st.servers.map((s) => (filled[s.id] ? { ...s, domainController: filled[s.id].dc, lastUpdate: stampNow() } : s)) }));
    toast({ variant: 'success', title: 'Domain controllers saved', message: `${ids.length} file server(s) updated.` });
    onClose();
  };

  return (
    <WizardFrame root="File Server" crumb="Domain Controllers" onClose={onClose}
      footer={<><span className="spacer" /><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <h4 className="add-data-source-step-title">Domain Controller(s) information for file server(s)</h4>
      <div className="add-data-source-three">
        <TextField label="Domain controller name/IP" value={dc} maxLength={256} aria-invalid={v.inv('dc')} onChange={(val) => { setDc(val); v.clear('dc'); }} />
        <TextField label="User Name" value={user} placeholder="Domain name\User Name" maxLength={256} aria-invalid={v.inv('user')} onChange={(val) => { setUser(val); v.clear('user'); }} />
        <div className="add-data-source-inline">
          <PasswordField label="Password" value={password} maxLength={256} aria-invalid={v.inv('password')} onChange={(val) => { setPassword(val); v.clear('password'); }} autoComplete="new-password" />
          <Button onClick={apply}>Apply to all</Button>
        </div>
      </div>
      <MiniTable label="Windows file servers"
        head={<><HeadCheck label="File Server Name/IP" checked={allOn} indeterminate={picked.length > 0} disabled={!win.length} onChange={() => setPicked(allOn ? [] : win.map((s) => s.id))} />
          <th>Domain/Workgroup</th><th>Domain Controller Name/IP</th><th>User Name</th><th>Password</th></>}>
        {win.length === 0 ? <tr className="add-data-source-empty-row"><td colSpan={5}>No file servers yet. Click Add New File Server to add one.</td></tr>
          : win.map((s) => (
            <tr key={s.id} className="lf-row" style={{ cursor: 'default' }}>
              <td><RowCheck label={s.name} checked={picked.includes(s.id)} onChange={(on) => setPicked((p) => (on ? [...p, s.id] : p.filter((x) => x !== s.id)))}>{s.name}</RowCheck></td>
              <td>{s.domain}</td>
              <td>{filled[s.id]?.dc ?? s.domainController ?? <span className="lf-na">—</span>}</td>
              <td>{filled[s.id]?.user ?? <span className="lf-na">—</span>}</td>
              <td>{filled[s.id] ? '••••••••' : <span className="lf-na">—</span>}</td>
            </tr>
          ))}
      </MiniTable>
    </WizardFrame>
  );
}

/* ---------------- DLG-SDS-15 Properties ---------------- */
export function PropertiesDialog({ serverId, onClose }: { serverId: string; onClose: () => void }) {
  const toast = useToast();
  const s = dsStore.use((st) => st.servers.find((x) => x.id === serverId));
  const hasRule = dsStore.use((st) => !!s && st.rules.some((r) => r.servers.includes(s.name)));
  const isAdmin = !s || !s.sharePath || /\\ADMIN\$$/i.test(s.sharePath);
  const [domain, setDomain] = useState(s?.domain ?? '');
  const [clusterOn, setClusterOn] = useState(false); const [cluster, setCluster] = useState('');
  const [cred, setCred] = useState(s && s.logonUser !== 'Current user' ? 'specified' : 'current');
  const [user, setUser] = useState(s && s.logonUser !== 'Current user' ? s.logonUser : '');
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [agent, setAgent] = useState(isAdmin ? 'admin' : 'share');
  const [share, setShare] = useState(isAdmin ? '' : s!.sharePath);
  const v = useInvalid();
  if (!s) return null;
  const shares = [`\\\\${s.name}\\Shares`, `\\\\${s.name}\\IT$`, `\\\\${s.name}\\Public`];
  const mismatch = cred === 'specified' && confirm !== '' && confirm !== password;

  const done = () => {
    if (!domain.trim()) { v.mark(['domain']); toast({ variant: 'error', title: 'Domain required', message: 'Enter the domain or workgroup.' }); return; }
    if (cred === 'specified' && (!user.trim() || !password)) { v.mark(['user', 'password'].filter((k) => !(k === 'user' ? user.trim() : password))); toast({ variant: 'error', title: 'Credentials required', message: 'Enter the user name and password.' }); return; }
    if (cred === 'specified' && password !== confirm) { v.mark(['confirm']); toast({ variant: 'error', title: 'Passwords differ', message: 'Password and Confirm Password must match.' }); return; }
    if (agent === 'share' && !share) { v.mark(['share']); toast({ variant: 'error', title: 'Share path required', message: 'Choose the share path for the agent.' }); return; }
    ds$.patchServers([s.id], () => ({
      domain: domain.trim(), logonUser: cred === 'specified' ? user.trim() : 'Current user',
      sharePath: agent === 'share' ? share : `\\\\${s.name}\\ADMIN$`, lastUpdate: stampNow(),
    }));
    toast({ variant: 'success', title: 'Properties saved', message: s.name });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Specify the credentials which will be used to logon to the following file server" icon="key" size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <div className="add-data-source-two">
        <TextField label="File Server" value={s.name} readOnly disabled />
        <TextField label="Domain/Workgroup" value={domain} maxLength={256} aria-invalid={v.inv('domain')} onChange={(val) => { setDomain(val); v.clear('domain'); }} />
        <TextField label="Agent status" value={s.agentStatus} readOnly disabled />
        {/* GAP-SDS-11 intended: the suffix only shows when no rule names this server. */}
        <TextField label="Audit status" value={s.auditStatus + (hasRule ? '' : ' (No rule applied)')} readOnly disabled />
      </div>
      <div className="stack stack--sm">
        <Checkbox label="Cluster Name/IP" checked={clusterOn} onChange={setClusterOn} />
        <TextField aria-label="Cluster Name/IP" value={cluster} disabled={!clusterOn} maxLength={256} onChange={setCluster} />
      </div>
      <RadioGroup ariaLabel="Logon credentials" value={cred} onChange={setCred}
        options={[{ value: 'current', label: 'Use the current logon credentials' }, { value: 'specified', label: 'Use the logon credentials specified below' }]} />
      <div className="add-data-source-three">
        <TextField label="User Name" value={user} disabled={cred !== 'specified'} maxLength={256} aria-invalid={v.inv('user')} onChange={(val) => { setUser(val); v.clear('user'); }} />
        <PasswordField label="Password" value={password} disabled={cred !== 'specified'} maxLength={256} aria-invalid={v.inv('password')} onChange={(val) => { setPassword(val); v.clear('password'); }} autoComplete="new-password" />
        <PasswordField label="Confirm password" value={confirm} disabled={cred !== 'specified'} maxLength={256} aria-invalid={v.inv('confirm') || mismatch || undefined}
          onChange={(val) => { setConfirm(val); v.clear('confirm'); }} autoComplete="new-password" />
      </div>
      <span className="row" style={{ gap: 4 }}>
        <RadioGroup row ariaLabel="Agent share" value={agent} onChange={(val) => { setAgent(val); v.clear('share'); }}
          options={[{ value: 'admin', label: 'Use Admin$ for Agent' }, { value: 'share', label: 'Share path' }]} />
        <InfoTip text="Pick a share on the file server to copy the agent through." />
      </span>
      <SelectField aria-label="Share path" value={share} disabled={agent !== 'share'} placeholder="Select a share" options={Array.from(new Set([...shares, ...(share && !shares.includes(share) ? [share] : [])]))}
        aria-invalid={v.inv('share')} onChange={(val) => { setShare(val); v.clear('share'); }} />
    </Modal>
  );
}

/* ---------------- DLG-SDS-16 Agent Properties ---------------- */
export function AgentPropertiesDialog({ serverId, onClose }: { serverId: string; onClose: () => void }) {
  const toast = useToast();
  const s = dsStore.use((st) => st.servers.find((x) => x.id === serverId));
  const [ip, setIp] = useState(s?.name ?? '');
  const [path, setPath] = useState(s ? (s.sharePath || `\\\\${s.name}\\share`) : '');
  const [user, setUser] = useState(''); const [password, setPassword] = useState('');
  const v = useInvalid();
  if (!s) return null;
  const done = () => {
    const miss = [!ip.trim() && 'ip', !path.trim() && 'path', !user.trim() && 'user', !password && 'password'].filter(Boolean) as string[];
    if (miss.length) { v.mark(miss); toast({ variant: 'error', title: 'Required fields', message: 'Enter the IP address, agent path, user name and password.' }); return; }
    if (!path.trim().startsWith('\\\\')) { v.mark(['path']); toast({ variant: 'error', title: 'Agent Path', message: 'Use "\\\\server name\\share name" format.' }); return; }
    ds$.patchServers([s.id], () => ({ sharePath: path.trim(), logonUser: user.trim(), lastUpdate: stampNow() }));
    toast({ variant: 'success', title: 'Agent properties saved', message: s.name });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Agent properties" icon="cpu" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <TextField label="IP Address" value={ip} maxLength={256} aria-invalid={v.inv('ip')} onChange={(val) => { setIp(val); v.clear('ip'); }} />
      <TextField label="Agent Path" value={path} maxLength={256} help={'Use "\\\\server name\\share name" format'} aria-invalid={v.inv('path')} onChange={(val) => { setPath(val); v.clear('path'); }} />
      <TextField label="User Name" value={user} maxLength={256} help={'Use "\\\\Domain name\\User name" format'} aria-invalid={v.inv('user')} onChange={(val) => { setUser(val); v.clear('user'); }} />
      <PasswordField label="Password" value={password} maxLength={256} aria-invalid={v.inv('password')} onChange={(val) => { setPassword(val); v.clear('password'); }} autoComplete="new-password" />
    </Modal>
  );
}
