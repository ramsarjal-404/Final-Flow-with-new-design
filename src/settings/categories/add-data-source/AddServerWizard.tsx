import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Button, Checkbox, Field, FileUpload, Icon, IconButton, Modal, PasswordField, RadioGroup, Segmented, SelectField, TextField, useToast,
} from '../../../ui';
import {
  ADD_TITLE, CURRENT_USER, WINRM_STEPS, dsStore, newId, stampNow, workgroupFrom,
} from './store';
import type { DomainObject, FileServer, ServerType } from './store';
import { CellInput, InfoTip, MiniTable, Note, StatusRunView, WizardFooter, WizardFrame, useInvalid } from './parts';
import DomainPicker from './DomainPicker';
import type { PickKind } from './DomainPicker';

/* DLG-SDS-03 (single) and DLG-SDS-04 (multiple) Add file server wizards + DLG-SDS-06/07/08. */

type StepId = 'server' | 'auditlog' | 'sql' | 'agent' | 'status';
const STEP_LABEL: Record<StepId, string> = { server: 'Add file server', auditlog: 'Audit log Configuration', sql: 'Add SQL Server', agent: 'Add agent', status: 'Status' };
const stepsFor = (t: ServerType): StepId[] =>
  t === 'netapp7' ? ['server', 'sql', 'agent', 'status'] : t === 'netappCluster' ? ['server', 'auditlog', 'sql', 'status'] : ['server', 'sql', 'status'];
const NAS_LABEL: Partial<Record<ServerType, string>> = { emc: 'EMC', nasuni: 'Nasuni', nutanix: 'Nutanix' };

type Row = { name: string; domain: string; user: string; password: string; sharePath: string; logicalPath: string };
const mkRow = (name: string, domain: string): Row => ({ name, domain, user: '', password: '', sharePath: `\\\\${name}\\ADMIN$`, logicalPath: '-' });

const INIT = {
  name: '', domain: '', clusterOn: false, cluster: '', communication: 'agent' as 'agent' | 'winrm', agentMode: 'admin', sharePath: '',
  auth: 'current', user: '', password: '', remoteOn: false, remoteServer: '192.168.116.150', mgmt: true,
  port: '5988', syslog: '514', shareUser: '', sharePassword: '',
  // GAP-SDS-10: the built default "vsaddmin" is a typo of the vsadmin role named in the hint.
  alUser: 'vsadmin', alPassword: '', alMode: 'automatic', alManual: '', alVolume: 'cisf_logs', alAggregate: 'aggr 1',
  sqlServer: '', insertDirect: 'Yes', sqlAuth: 'sql', sqlUser: '', sqlPassword: '', dbMode: 'create', dbName: '', dbSelect: 'LEPIDE200',
  agShare: '', agUser: '', agPassword: '', agConn: 'async', agAuto: true,
  mAuth: 'current', mUser: '', mPassword: '', common: false, shareName: '', commonLogical: '',
};
type Draft = typeof INIT;

export default function AddServerWizard({ type, multiple, onClose, onFinish }: {
  type: ServerType; multiple?: boolean; onClose: () => void; onFinish: (list: FileServer[]) => void;
}) {
  const toast = useToast();
  const servers = dsStore.use((s) => s.servers);
  const steps = stepsFor(type);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(INIT);
  const [rows, setRows] = useState<Row[]>([]);
  const [tested, setTested] = useState(false);
  const [acc, setAcc] = useState<string | null>(WINRM_STEPS[0]?.id ?? null);
  const [picker, setPicker] = useState<{ kind: PickKind; multi: boolean; key: number } | null>(null);
  const [sub, setSub] = useState<'manual' | 'range' | 'csv' | null>(null);
  const [runDone, setRunDone] = useState(false);
  const v = useInvalid();
  const cur = steps[step];
  const onStatus = cur === 'status';
  const busy = onStatus && !runDone;
  const label = NAS_LABEL[type];

  const set = <K extends keyof Draft>(k: K, val: Draft[K], ...clears: string[]) => {
    setD((x) => ({ ...x, [k]: val }));
    v.clear(k as string); clears.forEach(v.clear);
    if (['sqlServer', 'sqlAuth', 'sqlUser', 'sqlPassword'].includes(k as string)) setTested(false);
  };
  const fail = (keys: string[], message: string) => { v.mark(keys); toast({ variant: 'error', title: 'Check the highlighted fields', message }); return false; };
  const listed = (n: string) => servers.some((s) => s.name.toLowerCase() === n.trim().toLowerCase());

  /* ---------- validation ---------- */
  const validate = (): boolean => {
    if (cur === 'server') {
      if (multiple) {
        if (!rows.length) return fail([], 'Add at least one file server with the buttons on the right.');
        if (d.mAuth === 'user' && (!d.mUser.trim() || !d.mPassword)) return fail(['mUser', 'mPassword'].filter((k) => !d[k as 'mUser'].trim()), 'Enter the user name and password, or use the current user.');
        return true;
      }
      if (!d.name.trim()) return fail(['name'], type === 'netappCluster' ? 'Enter the NetApp filer name or IP.' : 'Enter the file server name or IP.');
      if (listed(d.name)) return fail(['name'], `${d.name.trim()} is already in the file server list.`);
      if (type === 'windows') {
        if (!d.domain.trim()) return fail(['domain'], 'Enter the domain or workgroup.');
        if (d.clusterOn && !d.cluster.trim()) return fail(['cluster'], 'Enter the cluster name(s) or clear the Cluster Name/IP box.');
        if (d.communication === 'agent' && d.agentMode === 'share' && !d.sharePath.trim()) return fail(['sharePath'], 'Enter the share path for the agent.');
        if (d.auth === 'user' && (!d.user.trim() || !d.password)) return fail(['user', 'password'].filter((k) => !d[k as 'user'].trim()), 'Enter the user name and password, or use the current user.');
        return true;
      }
      if (label && (!d.port.trim() || !d.syslog.trim())) return fail(['port', 'syslog'].filter((k) => !d[k as 'port'].trim()), 'Enter the default and syslog listening ports.');
      if (!d.user.trim() || !d.password) return fail(['user', 'password'].filter((k) => !d[k as 'user'].trim()), 'Enter the user name and password.');
      return true;
    }
    if (cur === 'auditlog') {
      if (!d.alUser.trim() || !d.alPassword) return fail(['alUser', 'alPassword'].filter((k) => !d[k as 'alUser'].trim()), 'Enter the vsadmin user name and password.');
      if (d.alMode === 'manual' && !d.alManual.trim()) return fail(['alManual'], 'Enter the volume name (case sensitive).');
      if (d.alMode === 'automatic' && (!d.alVolume.trim() || !d.alAggregate.trim())) return fail(['alVolume', 'alAggregate'].filter((k) => !d[k as 'alVolume'].trim()), 'Enter the volume and aggregate names.');
      return true;
    }
    if (cur === 'sql') {
      if (!d.sqlServer.trim()) return fail(['sqlServer'], 'Enter the SQL Server name or click Browse.');
      if (d.sqlAuth === 'sql' && (!d.sqlUser.trim() || !d.sqlPassword)) return fail(['sqlUser', 'sqlPassword'].filter((k) => !d[k as 'sqlUser'].trim()), 'Enter the SQL Server user name and password.');
      if (d.dbMode === 'create' && !d.dbName.trim()) return fail(['dbName'], 'Enter a name for the new database.');
      return true;
    }
    if (cur === 'agent') {
      if (!d.agShare.trim() || !d.agUser.trim() || !d.agPassword) return fail(['agShare', 'agUser', 'agPassword'].filter((k) => !d[k as 'agShare'].trim()), 'Enter the agent share, user name and password.');
      return true;
    }
    return true;
  };

  const next = () => { if (!validate()) return; v.mark([]); setStep((s) => s + 1); };

  /* ---------- build ---------- */
  const targets = multiple ? rows.map((r) => r.name) : [d.name.trim()];
  const taskFor = (n: string) =>
    type === 'windows' ? (!multiple && d.communication === 'winrm' ? `Configuring WinRM for ${n}` : `Installing Agent for ${n}`)
      : type === 'netapp7' ? `Installing Agent for ${n}` : `Configuring audit for ${n}`;
  const finish = () => {
    const base = {
      type, auditStatus: 'Auditing Stopped' as const, lastUpdate: stampNow(), sqlServer: d.sqlServer.trim(),
      database: d.dbMode === 'create' ? d.dbName.trim() : d.dbSelect,
      authMode: d.sqlAuth === 'sql' ? 'Sql Server Authentication' : 'Windows Authentication', timeGap: 24, patternMode: true,
      dataInsertion: d.insertDirect === 'Yes' ? 'File Server' : 'Lepide Console',
    };
    let list: FileServer[];
    if (multiple) {
      const shared = d.mAuth === 'user' ? d.mUser.trim() : '';
      list = rows.map((r) => ({
        ...base, id: newId('fs'), name: r.name, domain: r.domain.trim() || 'WORKGROUP', agentStatus: 'Installed', communication: 'agent',
        logonUser: r.user.trim() || shared || 'Current user', logonPassword: r.password || undefined, sharePath: r.sharePath,
      }));
    } else {
      const name = d.name.trim();
      const win = type === 'windows';
      list = [{
        ...base, id: newId('fs'), name, domain: (win ? d.domain.trim() : '') || 'WORKGROUP',
        agentStatus: win && d.communication === 'winrm' ? 'Not Installed' : 'Installed', communication: win ? d.communication : 'agent',
        logonUser: win ? (d.auth === 'user' ? d.user.trim() : 'Current user') : d.user.trim(),
        sharePath: win && d.communication === 'agent' && d.agentMode === 'share' && d.sharePath.trim() ? d.sharePath.trim() : `\\\\${name}\\ADMIN$`,
      }];
    }
    onFinish(list);
  };

  /* ---------- rows (multiple) ---------- */
  const addRows = (incoming: { name: string; domain: string }[]) => {
    const seen = new Set([...rows.map((r) => r.name.toLowerCase()), ...servers.map((s) => s.name.toLowerCase())]);
    const fresh: Row[] = []; let skipped = 0;
    for (const x of incoming) {
      const k = x.name.trim().toLowerCase();
      if (!k) continue;
      if (seen.has(k)) { skipped++; continue; }
      seen.add(k); fresh.push(mkRow(x.name.trim(), x.domain));
    }
    if (fresh.length) setRows((r) => [...r, ...fresh]);
    if (skipped) toast({ variant: 'info', title: 'Skipped duplicates', message: `${skipped} server(s) were already listed.` });
  };
  const patchRow = (i: number, p: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const onPicked = (objs: DomainObject[], domain: string) => {
    const kind = picker!.kind; setPicker(null);
    if (multiple) {
      if (kind === 'ou') addRows(objs.flatMap((o) => [{ name: `${o.name}-FS01`, domain: 'CHILY' }, { name: `${o.name}-FS02`, domain: 'CHILY' }]));
      else addRows(objs.map((o) => ({ name: o.name, domain: workgroupFrom(domain).toUpperCase() })));
      return;
    }
    const o = objs[0];
    setD((x) => ({ ...x, name: o.name, domain: type === 'windows' && !x.domain.trim() ? workgroupFrom(domain) : x.domain }));
    v.clear('name'); v.clear('domain');
  };

  /* ---------- bodies ---------- */
  const req = (l: string) => <>{l} <span className="add-data-source-req" aria-hidden="true">*</span></>;
  const windowsServers = servers.filter((s) => s.type === 'windows').map((s) => s.name);
  let body: ReactNode = null;

  if (cur === 'server' && multiple) {
    const userPh = d.mAuth === 'user' ? (d.mUser.trim() || 'user') : 'Current User';
    body = (
      <>
        <h4 className="add-data-source-step-title">Add File Server(s) you want to audit and click Next.</h4>
        <div className="add-data-source-multi">
          <MiniTable label="File servers to add"
            head={<><th>File Server Name/IP</th><th>Domain/Workgroup</th><th>User name</th><th>Password</th><th>Installation Share Path</th><th>Share Logical Path</th><th style={{ width: 80 }}>Actions</th></>}>
            {rows.length === 0 ? <tr className="add-data-source-empty-row"><td colSpan={7}>No file servers yet. Use Add from AD, OU, Manually, IP Range or CSV.</td></tr>
              : rows.map((r, i) => (
                <tr key={r.name} className="lf-row" style={{ cursor: 'default' }}>
                  <td>{r.name}</td><td>{r.domain}</td>
                  <td><CellInput label={`User for ${r.name}`} value={r.user} placeholder={userPh} onChange={(val) => patchRow(i, { user: val })} /></td>
                  <td><CellInput label={`Password for ${r.name}`} type="password" value={r.password} placeholder="*****" onChange={(val) => patchRow(i, { password: val })} /></td>
                  <td className="lf-mono">{r.sharePath}</td><td className="lf-mono">{r.logicalPath}</td>
                  <td><IconButton icon="trash" danger label={`Remove ${r.name}`} onClick={() => setRows((x) => x.filter((_, j) => j !== i))} /></td>
                </tr>
              ))}
          </MiniTable>
          <div className="add-data-source-side">
            <Button icon="globe" onClick={() => setPicker({ kind: 'computers', multi: true, key: Date.now() })}>Add from AD</Button>
            <Button icon="layers" onClick={() => setPicker({ kind: 'ou', multi: true, key: Date.now() })}>Add from OU</Button>
            <Button icon="edit" onClick={() => setSub('manual')}>Add manually</Button>
            <Button icon="list" onClick={() => setSub('range')}>Add IP Range</Button>
            <Button icon="upload" onClick={() => setSub('csv')}>Add from CSV</Button>
            <Button icon="folder" disabled={!rows.length} onClick={() => {
              setRows((r) => r.map((x) => ({ ...x, logicalPath: `\\\\${x.name}\\Shares` })));
              toast({ variant: 'success', title: 'Logical paths found', message: `Share logical paths read for ${rows.length} server(s).` });
            }}>Get Logical Path</Button>
          </div>
        </div>
        <RadioGroup ariaLabel="Credentials" value={d.mAuth} onChange={(val) => set('mAuth', val, 'mUser', 'mPassword')}
          options={[{ value: 'current', label: `Current user (${CURRENT_USER})` }, { value: 'user', label: 'The following user:' }]} />
        <div className="add-data-source-two">
          <TextField label="User Name" value={d.mUser} disabled={d.mAuth !== 'user'} maxLength={256} aria-invalid={v.inv('mUser')} onChange={(val) => set('mUser', val)} />
          <PasswordField label="Password" value={d.mPassword} disabled={d.mAuth !== 'user'} maxLength={256} aria-invalid={v.inv('mPassword')} onChange={(val) => set('mPassword', val)} />
        </div>
        <Note lead="Note:" sep=" ">Use the "Domain/User Name" format for User Name.</Note>
        <Checkbox label="Common Share and Logical Path" checked={d.common} onChange={(val) => set('common', val)} />
        <div className="add-data-source-inline">
          <TextField label="Share Name" value={d.shareName} disabled={!d.common} maxLength={256} onChange={(val) => set('shareName', val)} />
          <TextField label="Share Logical Path" value={d.commonLogical} disabled={!d.common} maxLength={256} onChange={(val) => set('commonLogical', val)} />
          <Button disabled={!d.common} onClick={() => {
            if (!d.shareName.trim() && !d.commonLogical.trim()) { toast({ variant: 'error', title: 'Apply to all', message: 'Enter a share name or logical path first.' }); return; }
            setRows((r) => r.map((x) => ({
              ...x, sharePath: d.shareName.trim() ? `\\\\${x.name}\\${d.shareName.trim()}` : x.sharePath,
              logicalPath: d.commonLogical.trim() ? d.commonLogical.trim() : x.logicalPath,
            })));
            toast({ variant: 'success', title: 'Applied to all', message: `Updated ${rows.length} server(s).` });
          }}>Apply to all</Button>
        </div>
      </>
    );
  } else if (cur === 'server' && type === 'windows') {
    body = (
      <>
        <h4 className="add-data-source-step-title">Add File Server(s) you want to audit and click Next.</h4>
        <div className="add-data-source-two">
          <div className="add-data-source-inline">
            <TextField label={req('File Server Name/IP')} value={d.name} maxLength={256} aria-invalid={v.inv('name')} onChange={(val) => set('name', val)} />
            <Button icon={d.name.trim() ? 'plus' : 'search'} onClick={() => setPicker({ kind: 'computers', multi: false, key: Date.now() })}>{d.name.trim() ? 'Add' : 'Browse'}</Button>
          </div>
          <TextField label={req('Domain/Workgroup')} value={d.domain} maxLength={256} aria-invalid={v.inv('domain')} onChange={(val) => set('domain', val)} />
        </div>
        <div className="stack stack--sm">
          <Checkbox label="Cluster Name/IP" checked={d.clusterOn} onChange={(val) => set('clusterOn', val, 'cluster')} />
          <TextField value={d.cluster} disabled={!d.clusterOn} maxLength={256} aria-label="Cluster Name/IP" placeholder="Please enter cluster name(s) separated by comma"
            aria-invalid={v.inv('cluster')} onChange={(val) => set('cluster', val)} />
        </div>
        <Field label={<span className="row" style={{ gap: 6 }}>Communication<InfoTip text="Policies support both Agent-based and WinRM-based communication. Each file server needs at least one valid communication method." /></span>}>
          <Segmented mode="pressed" hug ariaLabel="Communication" value={d.communication}
            items={[{ value: 'agent', label: 'Agent' }, { value: 'winrm', label: 'WinRm' }]} onChange={(val) => set('communication', val as 'agent' | 'winrm', 'sharePath')} />
        </Field>
        {d.communication === 'agent' ? (
          <div className="stack stack--sm">
            <RadioGroup ariaLabel="Agent share" row value={d.agentMode} onChange={(val) => set('agentMode', val, 'sharePath')}
              options={[{ value: 'admin', label: 'Use Admin$ for Agent' }, { value: 'share', label: 'Share path' }]} />
            <div className="add-data-source-inline">
              <TextField value={d.sharePath} disabled={d.agentMode !== 'share'} maxLength={256} aria-label="Share path" placeholder="\\server name\share name"
                aria-invalid={v.inv('sharePath')} onChange={(val) => set('sharePath', val)} />
              <InfoTip text="Agent UNC path: use the \\server name\share name format." />
            </div>
          </div>
        ) : (
          <div className="add-data-source-block">
            <h4>WinRM Configuration Requirements</h4>
            <p>To enable remote policy execution and communication between components, complete the following configuration steps on both the client and target server machines.</p>
            <div className="add-data-source-acc">
              {WINRM_STEPS.map((s, i) => (
                <div key={s.id} className="add-data-source-acc__item">
                  <button type="button" className="add-data-source-acc__btn" aria-expanded={acc === s.id} aria-controls={`winrm-${s.id}`} onClick={() => setAcc(acc === s.id ? null : s.id)}>
                    {i + 1}. {s.title}<Icon name="chevron" size={14} />
                  </button>
                  {acc === s.id && (
                    <div className="add-data-source-acc__body" id={`winrm-${s.id}`}>
                      {s.body.map((line, j) => (/^`.*`$/.test(line) ? <code key={j}>{line.slice(1, -1)}</code> : <span key={j}>{line}</span>))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <h4 className="add-data-source-sub">Authentication</h4>
        <RadioGroup ariaLabel="Authentication" value={d.auth} onChange={(val) => set('auth', val, 'user', 'password')}
          options={[{ value: 'current', label: `Current user (${CURRENT_USER})` }, { value: 'user', label: 'The Following User' }]} />
        <div className="add-data-source-two">
          <TextField label="User Name" value={d.user} disabled={d.auth !== 'user'} maxLength={256} aria-invalid={v.inv('user')} onChange={(val) => set('user', val)} />
          <PasswordField label="Password" value={d.password} disabled={d.auth !== 'user'} maxLength={256} aria-invalid={v.inv('password')} onChange={(val) => set('password', val)} autoComplete="new-password" />
        </div>
        <Note>Enter user name in "Domain\UserName" Format.</Note>
      </>
    );
  } else if (cur === 'server' && type === 'netapp7') {
    body = (
      <>
        <h4 className="add-data-source-step-title">Add File Servers you want to Audit</h4>
        <div className="add-data-source-inline">
          <TextField label={req('File Server Name/IP')} value={d.name} maxLength={256} aria-invalid={v.inv('name')} onChange={(val) => set('name', val)} />
          <Button icon="plus" onClick={() => setPicker({ kind: 'computers', multi: false, key: Date.now() })}>Add</Button>
        </div>
        <div className="add-data-source-two">
          <TextField label={req('User Name')} value={d.user} maxLength={256} aria-invalid={v.inv('user')} onChange={(val) => set('user', val)} />
          <PasswordField label={req('Password')} value={d.password} maxLength={256} aria-invalid={v.inv('password')} onChange={(val) => set('password', val)} autoComplete="new-password" />
        </div>
        <Note lead="Note:" sep=" ">Enter User Name in "NetAppFiler/User Name" format.</Note>
      </>
    );
  } else if (cur === 'server' && type === 'netappCluster') {
    body = (
      <>
        <h4 className="add-data-source-step-title">Provide NetApp filer information</h4>
        <TextField label={req('NetApp Filer Name/IP')} value={d.name} maxLength={256} aria-invalid={v.inv('name')} onChange={(val) => set('name', val)} />
        <div className="add-data-source-two">
          <TextField label={req('User Name')} value={d.user} maxLength={256} aria-invalid={v.inv('user')} onChange={(val) => set('user', val)} />
          <PasswordField label={req('Password')} value={d.password} maxLength={256} aria-invalid={v.inv('password')} onChange={(val) => set('password', val)} autoComplete="new-password" />
        </div>
        <Checkbox label="Enable Remote Agent Auditing" checked={d.remoteOn} onChange={(val) => set('remoteOn', val)} />
        <div className="add-data-source-inline">
          <SelectField aria-label="Remote agent server" value={d.remoteServer} disabled={!d.remoteOn}
            options={Array.from(new Set([...windowsServers, '192.168.116.150']))} onChange={(val) => set('remoteServer', val)} />
          <Button icon="plus" disabled={!d.remoteOn} onClick={() => toast({ variant: 'success', title: 'Remote agent', message: `${d.remoteServer} will collect this filer's events.` })}>Add</Button>
        </div>
        <Checkbox label="I have Management Access" checked={d.mgmt} onChange={(val) => set('mgmt', val)} />
        <Note lead="Note:" sep=" ">Enter User Name in "NetAppFiler/User Name" format.</Note>
      </>
    );
  } else if (cur === 'server' && label) {
    body = (
      <>
        <h4 className="add-data-source-step-title">Enter {label} Agent Server Details</h4>
        <TextField label={req(`${label} Server Name/IP`)} value={d.name} maxLength={256} aria-invalid={v.inv('name')} onChange={(val) => set('name', val)} />
        <div className="add-data-source-two">
          <TextField label={req('Default Port')} value={d.port} inputMode="numeric" maxLength={5} aria-invalid={v.inv('port')} onChange={(val) => set('port', val)} />
          <TextField label={<span className="row" style={{ gap: 6 }}>{req('Syslog Listening Port')}<InfoTip text="The port Lepide listens on for syslog events from the storage." /></span>}
            value={d.syslog} inputMode="numeric" maxLength={5} aria-invalid={v.inv('syslog')} onChange={(val) => set('syslog', val)} />
          <TextField label={req('User Name')} value={d.user} maxLength={256} aria-invalid={v.inv('user')} onChange={(val) => set('user', val)} />
          <PasswordField label={req('Password')} value={d.password} maxLength={256} aria-invalid={v.inv('password')} onChange={(val) => set('password', val)} autoComplete="new-password" />
        </div>
        <Note sep=": ">Enter {label} Local user</Note>
        <h4 className="add-data-source-sub">Share Access Credentials</h4>
        <div className="add-data-source-two">
          <TextField label="User Name" value={d.shareUser} maxLength={256} onChange={(val) => set('shareUser', val)} />
          <PasswordField label="Password" value={d.sharePassword} maxLength={256} onChange={(val) => set('sharePassword', val)} autoComplete="new-password" />
        </div>
        <Note lead="Note:" sep=" ">Enter User Name in "Domain/User Name" format.</Note>
      </>
    );
  } else if (cur === 'auditlog') {
    body = (
      <>
        <h4 className="add-data-source-step-title">Audit log Configuration settings.</h4>
        <div className="add-data-source-two">
          <TextField label={req('User Name :')} value={d.alUser} maxLength={256} help="Enter user name assigned with vsadmin role" aria-invalid={v.inv('alUser')} onChange={(val) => set('alUser', val)} />
          <PasswordField label={req('Password :')} value={d.alPassword} maxLength={256} aria-invalid={v.inv('alPassword')} onChange={(val) => set('alPassword', val)} autoComplete="new-password" />
        </div>
        <h4 className="add-data-source-sub">Audit Configuration</h4>
        <div className="add-data-source-two">
          <div className="stack stack--sm">
            <span className="row" style={{ gap: 4 }}>
              <RadioGroup ariaLabel="Manual" value={d.alMode} onChange={(val) => set('alMode', val, 'alManual', 'alVolume', 'alAggregate')} options={[{ value: 'manual', label: 'Manual' }]} />
              <InfoTip text="Use a volume you have already created for audit logs." />
            </span>
            <TextField label="Volume Name :" value={d.alManual} disabled={d.alMode !== 'manual'} maxLength={256} placeholder="Enter volume name (case sensitive)"
              aria-invalid={v.inv('alManual')} onChange={(val) => set('alManual', val)} />
          </div>
          <div className="stack stack--sm">
            <RadioGroup ariaLabel="Automatic" value={d.alMode} onChange={(val) => set('alMode', val, 'alManual', 'alVolume', 'alAggregate')} options={[{ value: 'automatic', label: 'Automatic' }]} />
            <TextField label="Volume Name :" value={d.alVolume} disabled={d.alMode !== 'automatic'} maxLength={256} aria-invalid={v.inv('alVolume')} onChange={(val) => set('alVolume', val)} />
            <TextField label="Aggregate Name :" value={d.alAggregate} disabled={d.alMode !== 'automatic'} maxLength={256} aria-invalid={v.inv('alAggregate')} onChange={(val) => set('alAggregate', val)} />
          </div>
        </div>
      </>
    );
  } else if (cur === 'sql') {
    body = (
      <>
        <h4 className="add-data-source-step-title">Provide SQL Server Information</h4>
        <div className="add-data-source-two">
          <div className="add-data-source-inline">
            <TextField label={req('SQL Server Name/IP')} value={d.sqlServer} maxLength={256} aria-invalid={v.inv('sqlServer')} onChange={(val) => set('sqlServer', val)} />
            <Button icon="search" onClick={() => set('sqlServer', 'NDR27\\SQL19')}>Browse</Button>
          </div>
          <SelectField label={<span className="row" style={{ gap: 6 }}>Insert audit data directly to the database from the file server<InfoTip text="Minimum version 4.0 .Net Framework required on agent machine." /></span>}
            value={d.insertDirect} options={['Yes', 'No']} onChange={(val) => set('insertDirect', val)} />
        </div>
        <RadioGroup row ariaLabel="SQL authentication" value={d.sqlAuth} onChange={(val) => set('sqlAuth', val, 'sqlUser', 'sqlPassword')}
          options={[{ value: 'windows', label: 'Windows Authentication' }, { value: 'sql', label: 'SQL Server Authentication (Recommended)' }]} />
        <div className="add-data-source-two">
          <TextField label="User Name :" value={d.sqlUser} disabled={d.sqlAuth !== 'sql'} maxLength={256} aria-invalid={v.inv('sqlUser')} onChange={(val) => set('sqlUser', val)} />
          <PasswordField label="Password :" value={d.sqlPassword} disabled={d.sqlAuth !== 'sql'} maxLength={256} aria-invalid={v.inv('sqlPassword')} onChange={(val) => set('sqlPassword', val)} autoComplete="new-password" />
        </div>
        <div className="row row--wrap">
          <Button icon="plug" onClick={() => {
            const miss = [!d.sqlServer.trim() && 'sqlServer', d.sqlAuth === 'sql' && !d.sqlUser.trim() && 'sqlUser', d.sqlAuth === 'sql' && !d.sqlPassword && 'sqlPassword'].filter(Boolean) as string[];
            if (miss.length) { v.mark(miss); toast({ variant: 'error', title: 'Test connection', message: 'Enter the SQL Server and credentials first.' }); return; }
            setTested(true); toast({ variant: 'success', title: 'Test connection', message: `Connected to ${d.sqlServer.trim()}.` });
          }}>Test connection</Button>
          {tested && <span className="add-data-source-ok"><Icon name="check" size={14} />Connection verified</span>}
        </div>
        <Note lead="Note:" sep=" ">Windows authentication credentials are only applicable for data insertion from the file server directly.</Note>
        <h4 className="add-data-source-sub">Database Option :</h4>
        <div className="add-data-source-two">
          <div className="stack stack--sm">
            <RadioGroup ariaLabel="Create Database" value={d.dbMode} onChange={(val) => set('dbMode', val, 'dbName')} options={[{ value: 'create', label: 'Create Database :' }]} />
            <TextField aria-label="Create Database" value={d.dbName} disabled={d.dbMode !== 'create'} maxLength={128} aria-invalid={v.inv('dbName')} onChange={(val) => set('dbName', val)} />
          </div>
          <div className="stack stack--sm">
            <RadioGroup ariaLabel="Select Database" value={d.dbMode} onChange={(val) => set('dbMode', val, 'dbName')} options={[{ value: 'select', label: 'Select Database :' }]} />
            <SelectField aria-label="Select Database" value={d.dbSelect} disabled={d.dbMode !== 'select'} options={['LEPIDE200', 'FSA_DB', 'LepideF1']} onChange={(val) => set('dbSelect', val)} />
          </div>
        </div>
        <Note lead="Note:" sep=" ">If you don't have SQL Server installed, then click the link to download the SQL Express edition.</Note>
        <button type="button" className="add-data-source-linkbtn" onClick={() => toast({ variant: 'info', title: 'SQL Express', message: 'The Microsoft download page opens outside this prototype.' })}>
          <Icon name="external" size={14} />http://www.microsoft.com/en-in/download/details.aspx?id=56840
        </button>
      </>
    );
  } else if (cur === 'agent') {
    body = (
      <>
        <h4 className="add-data-source-step-title">Enter Agent Server Details</h4>
        <p className="add-data-source-lead">This agent server will collect changes from the NetApp filer.</p>
        <TextField label={req('Agent Share :')} value={d.agShare} maxLength={256} placeholder="\\server name\share name" aria-invalid={v.inv('agShare')} onChange={(val) => set('agShare', val)} />
        <div className="add-data-source-two">
          <TextField label={req('User Name :')} value={d.agUser} maxLength={256} placeholder="Domain\UserName" aria-invalid={v.inv('agUser')} onChange={(val) => set('agUser', val)} />
          <PasswordField label={req('Password :')} value={d.agPassword} maxLength={256} aria-invalid={v.inv('agPassword')} onChange={(val) => set('agPassword', val)} autoComplete="new-password" />
        </div>
        <Field label={<span className="row" style={{ gap: 6 }}>Connection Type<InfoTip text="Asynchronous collects changes in batches; Synchronous waits for each change to be written." /></span>}>
          <RadioGroup row ariaLabel="Connection Type" value={d.agConn} onChange={(val) => set('agConn', val)}
            options={[{ value: 'async', label: 'Asynchronous' }, { value: 'sync', label: 'Synchronous' }]} />
        </Field>
        <Note lead="Note:" sep=" ">Use the "Domain\UserName" format for User Name. Agent server system is used to install the file server agent.</Note>
        <span className="row" style={{ gap: 4 }}>
          <Checkbox label="Automatically change required agent server settings." checked={d.agAuto} onChange={(val) => set('agAuto', val)} />
          <InfoTip text="Lepide updates the agent server's audit and firewall settings for you." />
        </span>
      </>
    );
  } else if (cur === 'status') {
    body = (
      <>
        <h4 className="add-data-source-step-title">Status...</h4>
        <StatusRunView tasks={targets.map(taskFor)} onDone={() => setRunDone(true)} />
      </>
    );
  }

  return (
    <>
      <WizardFrame root="File Server" crumb={ADD_TITLE[type] + (multiple ? ' (Multiple)' : '')} steps={steps.map((s) => STEP_LABEL[s])} step={step}
        onClose={() => { if (!busy && !onStatus) onClose(); else if (onStatus && runDone) onClose(); }} busy={onStatus}
        footer={<WizardFooter onBack={() => { v.mark([]); setStep((s) => s - 1); }} backDisabled={step === 0 || onStatus}
          onCancel={onClose} cancelDisabled={onStatus} onNext={onStatus ? finish : next} nextLabel={onStatus ? 'Finish' : 'Next'} nextDisabled={onStatus && !runDone} />}>
        {body}
      </WizardFrame>
      {picker && <DomainPicker key={picker.key} kind={picker.kind} multi={picker.multi} onClose={() => setPicker(null)} onDone={onPicked} />}
      {sub === 'manual' && <ManualDialog onClose={() => setSub(null)} onDone={(list) => { setSub(null); addRows(list); }} />}
      {sub === 'range' && <RangeDialog onClose={() => setSub(null)} onDone={(list) => { setSub(null); addRows(list); }} />}
      {sub === 'csv' && <CsvDialog onClose={() => setSub(null)} onDone={(list) => { setSub(null); addRows(list); }} />}
    </>
  );
}

/* ---------------- DLG-SDS-06 ---------------- */
type NameDomain = { name: string; domain: string };
function ManualDialog({ onClose, onDone }: { onClose: () => void; onDone: (l: NameDomain[]) => void }) {
  const toast = useToast();
  const [name, setName] = useState(''); const [domain, setDomain] = useState('');
  const [list, setList] = useState<NameDomain[]>([]);
  const add = () => {
    if (!name.trim() || !domain.trim()) { toast({ variant: 'error', title: 'Required fields', message: 'Enter the file server name or IP and the domain NetBIOS name.' }); return; }
    if (list.some((x) => x.name.toLowerCase() === name.trim().toLowerCase())) { toast({ variant: 'error', title: 'Already added', message: `${name.trim()} is in the list.` }); return; }
    setList((l) => [...l, { name: name.trim(), domain: domain.trim() }]); setName('');
  };
  return (
    <Modal open onClose={onClose} title="Enter the file server name and click add" icon="edit" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => {
        if (!list.length) { toast({ variant: 'error', title: 'Nothing added', message: 'Add at least one file server.' }); return; }
        onDone(list);
      }}>Done</Button></>}>
      <div className="add-data-source-two">
        <TextField label="File Server Name or IP :" value={name} maxLength={256} onChange={setName} />
        <TextField label="Domain/Workgroup :" value={domain} maxLength={256} help="*Domain Netbios Name" onChange={setDomain} />
      </div>
      <div className="row row--between"><b className="text-sm">Select File Server :</b><Button icon="plus" onClick={add}>Add</Button></div>
      {list.length > 0 && (
        <ul className="add-data-source-list" aria-label="Added file servers">
          {list.map((x) => (
            <li key={x.name}><span>{x.name} ({x.domain})</span>
              <IconButton icon="trash" danger label={`Remove ${x.name}`} onClick={() => setList((l) => l.filter((y) => y.name !== x.name))} /></li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/* ---------------- DLG-SDS-07 ---------------- */
const IP = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const parseIp = (s: string) => { const m = IP.exec(s.trim()); if (!m) return null; const p = m.slice(1).map(Number); return p.every((n) => n >= 0 && n <= 255) ? p : null; };
function RangeDialog({ onClose, onDone }: { onClose: () => void; onDone: (l: NameDomain[]) => void }) {
  const toast = useToast();
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [domain, setDomain] = useState('CHILY');
  const done = () => {
    const a = parseIp(from), b = parseIp(to);
    if (!a || !b || a.slice(0, 3).join('.') !== b.slice(0, 3).join('.') || b[3] < a[3]) {
      toast({ variant: 'error', title: 'Check the range', message: 'Enter a start and end IP in the same /24 range (e.g. 192.168.30.170 – 192.168.30.175).' }); return;
    }
    if (b[3] - a[3] + 1 > 25) { toast({ variant: 'error', title: 'Range too large', message: 'Add up to 25 addresses at a time.' }); return; }
    const pre = a.slice(0, 3).join('.');
    onDone(Array.from({ length: b[3] - a[3] + 1 }, (_, i) => ({ name: `${pre}.${a[3] + i}`, domain: domain.trim() || 'WORKGROUP' })));
  };
  return (
    <Modal open onClose={onClose} title="Enter IP range to add file servers" icon="list" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <TextField label="From IP :" value={from} placeholder="192.168.30.170" maxLength={15} onChange={setFrom} />
      <TextField label="To IP :" value={to} placeholder="192.168.30.175" maxLength={15} onChange={setTo} />
      <TextField label="Domain/Workgroup :" value={domain} maxLength={256} onChange={setDomain} />
    </Modal>
  );
}

/* ---------------- DLG-SDS-08 ---------------- */
function CsvDialog({ onClose, onDone }: { onClose: () => void; onDone: (l: NameDomain[]) => void }) {
  const toast = useToast();
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [rows, setRows] = useState<NameDomain[]>([]);
  const read = (f: File) => {
    if (!/\.csv$/i.test(f.name)) { toast({ variant: 'error', title: 'CSV only', message: 'Choose a .csv file.' }); return; }
    f.text().then((txt) => {
      const out: NameDomain[] = [];
      for (const line of txt.split(/\r?\n/)) {
        const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        if (!cells[0]) continue;
        if (cells[0].toLowerCase().includes('name')) continue;
        out.push({ name: cells[0], domain: cells[1] || 'WORKGROUP' });
      }
      setFile({ name: f.name, size: f.size }); setRows(out);
      if (!out.length) toast({ variant: 'error', title: 'Empty file', message: 'No server names were found in the file.' });
    });
  };
  return (
    <Modal open onClose={onClose} title="Import file servers from CSV" icon="upload" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => {
        if (!rows.length) { toast({ variant: 'error', title: 'No file', message: 'Choose a CSV file with one "server,domain" per line.' }); return; }
        onDone(rows);
      }}>Done</Button></>}>
      <FileUpload accept=".csv" label="Click to choose a CSV file" rules="One file server per line: server,domain" file={file}
        onFile={read} onClear={() => { setFile(null); setRows([]); }} />
      {rows.length > 0 && <p className="add-data-source-note">{rows.length} file server(s) found: {rows.slice(0, 4).map((r) => r.name).join(', ')}…</p>}
    </Modal>
  );
}
