import { Fragment, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Checkbox, ConfirmDialog, EmptyState, Icon, IconButton, KeyValues, Modal, NumberField, PasswordField, RadioGroup, SearchSelect,
  SelectField, SetCard, TextField, ToneTag, useToast,
} from '../../../ui';
import { ACTION_LABEL, canRun, ds$, dsStore, stampNow } from './store';
import type { AgentAction, AuditRule, FileServer } from './store';
import { ActionPane, ConsoleChrome, InfoTip, MiniTable, Note, StatusRunView, WizardFooter, WizardFrame, useInvalid } from './parts';
import type { PaneItem } from './parts';
import AddServerWizard from './AddServerWizard';
import { AgentActionDialog, PropertiesDialog } from './ActionDialogs';
import { RuleEditor } from './AuditRules';
import { agentTone, saveNewServers } from './FileServers';

/* SCR-SDS-03 File Server - <name>, SCR-SDS-04 missing state, DLG-SDS-17/18/19. */

const PANE: PaneItem[] = [
  { id: 'install', label: 'Install agent', icon: 'download' },
  { id: 'uninstall', label: 'Uninstall agent', icon: 'x' },
  { id: 'start', label: 'Start Auditing', icon: 'play' },
  { id: 'stop', label: 'Stop Auditing', icon: 'pause' },
  { id: 'update', label: 'Update Agent', icon: 'refresh' },
  { id: 'dbwizard', label: 'Database Wizard', icon: 'database' },
  { id: 'advance', label: 'Advance Settings', icon: 'sliders' },
];
const LIST = '/settings/add-data-source/file-server';

type View = null | { k: 'add' } | { k: 'db' } | { k: 'rule'; editId?: string };

export default function ServerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const servers = dsStore.use((s) => s.servers);
  const rules = dsStore.use((s) => s.rules);
  const s = servers.find((x) => x.id === id);
  const [view, setView] = useState<View>(null);
  const [pane, setPane] = useState<string | null>(null);
  const [action, setAction] = useState<AgentAction | null>(null);
  const [edit, setEdit] = useState(false);
  const [advance, setAdvance] = useState(false);
  const [del, setDel] = useState(false);
  const [open, setOpen] = useState<string[]>([]);

  if (!s) {
    // SCR-SDS-04 (GAP-SDS-06 intended: keep the console chrome so the rail stays reachable).
    return (
      <ConsoleChrome current="list" title="File Server" crumbs={[{ label: 'All File Server', to: LIST }]}>
        <section className="lf-card tablecard" style={{ minHeight: 360 }}>
          <EmptyState icon="server" title="This file server isn't in the list any more."
            action={<Button variant="primary" onClick={() => nav(LIST)}>All file servers</Button>} />
        </section>
      </ConsoleChrome>
    );
  }

  const mine = rules.filter((r) => r.servers.includes(s.name));

  if (view?.k === 'add') {
    return (
      <AddServerWizard type="windows" onClose={() => setView(null)}
        onFinish={(list) => { saveNewServers(list, false, toast); setView(null); nav(`${LIST}/${list[0].id}`); }} />
    );
  }
  if (view?.k === 'db') return <DatabaseWizard server={s} onClose={() => setView(null)} />;
  if (view?.k === 'rule') {
    return (
      <RuleEditor editId={view.editId} presetServers={view.editId ? undefined : [s.name]} onClose={() => setView(null)}
        onSaved={(r: AuditRule) => {
          const cur = dsStore.get().servers.find((x) => x.id === s.id);
          if (cur && r.servers.includes(cur.name) && cur.auditStatus === 'Auditing Stopped' && cur.agentStatus === 'Installed') {
            ds$.patchServers([cur.id], () => ({ auditStatus: 'Auditing Started', lastUpdate: stampNow() }));
          }
          setView(null);
        }} />
    );
  }

  const onPane = (pid: string) => {
    if (pid === 'dbwizard') { setView({ k: 'db' }); return; }
    if (pid === 'advance') { setPane(pid); setAdvance(true); return; }
    const a = pid as AgentAction;
    if (!canRun(a, s)) {
      toast({ variant: 'info', title: 'Not available', message: `${ACTION_LABEL[a]} isn't available while the agent is ${s.agentStatus.toLowerCase()} and ${s.auditStatus.toLowerCase()}.` });
      return;
    }
    setPane(pid); setAction(a);
  };
  const dash = (x: string) => (x ? x : '-');

  return (
    <ConsoleChrome current="list" title={`File Server - ${s.name}`} crumbs={[{ label: 'All File Server', to: LIST }, { label: s.name }]}
      actions={<>
        <Button variant="danger" icon="trash" onClick={() => setDel(true)}>Delete</Button>
        <Button icon="edit" onClick={() => setEdit(true)}>Edit</Button>
        <Button variant="primary" icon="plus" onClick={() => setView({ k: 'add' })}>Add file server</Button>
      </>}>
      <div className="add-data-source-switch">
        <SearchSelect label="File Server" value={s.id} options={servers.map((x) => ({ value: x.id, label: x.name }))} ariaLabel="Switch file server"
          onChange={(v) => { if (v !== s.id) nav(`${LIST}/${v}`); }} />
      </div>
      <div className="add-data-source-body">
        <ActionPane items={PANE} current={pane} onPick={onPane} />
        <div className="stack">
          <div className="add-data-source-panels">
            <SetCard title="Agent Management">
              <KeyValues items={[
                { label: 'File Server Name', value: s.name },
                { label: 'Domain Name', value: s.domain },
                { label: 'Agent Status', value: <ToneTag tone={agentTone(s.agentStatus)}>{s.agentStatus}</ToneTag> },
                { label: 'Audit Status', value: s.auditStatus + (mine.length ? '' : ' (No Rule Applied)') },
                { label: 'Last Agent Update', value: s.lastUpdate, wide: true },
              ]} />
            </SetCard>
            <SetCard title="Database Management">
              <KeyValues items={[
                { label: 'SQL Server', value: dash(s.sqlServer) },
                { label: 'Database Name', value: dash(s.database) },
                { label: 'Authentication Mode', value: s.authMode },
                { label: 'Time Gap', value: String(s.timeGap) },
                { label: 'Pattern Mode', value: s.patternMode ? 'ON' : 'OFF' },
                { label: 'Data Insertion', value: s.dataInsertion },
              ]} />
            </SetCard>
          </div>
          <SetCard title="Rule Management" actions={<Button size="sm" icon="plus" onClick={() => setView({ k: 'rule' })}>Add rule</Button>}>
            <MiniTable label="Rules applied to this file server"
              head={<><th>Rule Name</th><th>Users</th><th>Assigned Policies</th><th>Rule Status</th><th>Priority</th><th style={{ width: 80 }}>Actions</th></>}>
              {mine.length === 0 ? <tr className="add-data-source-empty-row"><td colSpan={6}>No rule applied. Click Add Rule to apply one.</td></tr>
                : mine.map((r) => {
                  const ex = open.includes(r.id);
                  return (
                    <Fragment key={r.id}>
                      <tr className="lf-row" style={{ cursor: 'default' }}>
                        <td><button type="button" className="add-data-source-expand" aria-expanded={ex} onClick={() => setOpen((o) => (ex ? o.filter((x) => x !== r.id) : [...o, r.id]))}>
                          <Icon name="chevron-right" size={14} />{r.name}</button></td>
                        <td>{r.users}</td><td>{r.policy}</td>
                        <td><ToneTag tone={r.enabled ? 'good' : 'bad'}>{r.enabled ? 'Enabled' : 'Disabled'}</ToneTag></td>
                        <td>{r.priority}</td>
                        <td><IconButton icon="edit" label={`Edit ${r.name}`} onClick={() => setView({ k: 'rule', editId: r.id })} /></td>
                      </tr>
                      {ex && (
                        <tr className="add-data-source-detail-line"><td colSpan={6}>
                          Applies to {r.servers.join(', ')}{r.targets.length ? ` · ${r.users}: ${r.targets.map((t) => t.name).join(', ')}` : ''}
                        </td></tr>
                      )}
                    </Fragment>
                  );
                })}
            </MiniTable>
          </SetCard>
        </div>
      </div>

      {action && <AgentActionDialog key={action} action={action} fixedId={s.id} onClose={() => { setAction(null); setPane(null); }} />}
      {edit && <PropertiesDialog serverId={s.id} onClose={() => setEdit(false)} />}
      {advance && <AdvanceSettings server={s} onClose={() => { setAdvance(false); setPane(null); }} />}
      <ConfirmDialog open={del} onClose={() => setDel(false)} confirmLabel="Delete" title="Delete file server"
        message={`Remove ${s.name} from auditing? Its agent settings are discarded.`}
        onConfirm={() => {
          setDel(false);
          ds$.removeServers([s.id]);
          toast({ variant: 'success', title: 'File server removed', message: s.name });
          nav(LIST);
        }} />
    </ConsoleChrome>
  );
}

/* ---------------- DLG-SDS-17 Advance Settings ---------------- */
function AdvanceSettings({ server, onClose }: { server: FileServer; onClose: () => void }) {
  const toast = useToast();
  const [gap, setGap] = useState<number | ''>(server.timeGap);
  const [pattern, setPattern] = useState(server.patternMode);
  const [bad, setBad] = useState(false);
  const done = () => {
    if (gap === '' || !Number.isInteger(gap) || gap < 1 || gap > 3600) { setBad(true); toast({ variant: 'error', title: 'Time gap', message: 'Enter whole seconds between 1 and 3600.' }); return; }
    ds$.patchServers([server.id], () => ({ timeGap: gap, patternMode: pattern, lastUpdate: stampNow() }));
    toast({ variant: 'success', title: 'Advance settings saved', message: server.name });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Advance Settings" icon="sliders" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <NumberField label="Define time gap to prevent duplicate entries" value={gap} min={1} max={3600} suffix="Seconds"
        error={bad ? ' ' : undefined} onChange={(v) => { setGap(v); setBad(false); }} />
      <Checkbox label="Delete and rename pattern mode" checked={pattern} onChange={setPattern} />
    </Modal>
  );
}

/* ---------------- DLG-SDS-18 Database Wizard ---------------- */
type Task = 'create' | 'modify' | 'shrink' | 'checkpoint';
const TASKS: { value: Task; label: string; desc: string }[] = [
  { value: 'create', label: 'Create Database', desc: 'Creates a new database for Lepide DSP for File Server.' },
  { value: 'modify', label: 'Modify Database', desc: 'Points the file server at another existing database.' },
  { value: 'shrink', label: 'Shrink Database', desc: 'Releases unused space in the database and log files.' },
  { value: 'checkpoint', label: 'Check Point and Truncate Log', desc: 'Writes a checkpoint and truncates the transaction log.' },
];

function DatabaseWizard({ server, onClose }: { server: FileServer; onClose: () => void }) {
  const toast = useToast();
  const [task, setTask] = useState<Task>('create');
  const [step, setStep] = useState(0);
  const [sql, setSql] = useState(server.sqlServer);
  const [insert, setInsert] = useState('Yes');
  const [auth, setAuth] = useState('windows');
  const [user, setUser] = useState(server.sqlServer);
  const [password, setPassword] = useState('');
  const [db, setDb] = useState('');
  const [connT, setConnT] = useState<number | ''>(120); const [queryT, setQueryT] = useState<number | ''>(120);
  const [dbSize, setDbSize] = useState<number | ''>(50); const [logSize, setLogSize] = useState<number | ''>(50);
  const [custom, setCustom] = useState(false); const [dataPath, setDataPath] = useState(''); const [logPath, setLogPath] = useState('');
  const [runDone, setRunDone] = useState(false);
  const v = useInvalid();
  const t = TASKS.find((x) => x.value === task)!;
  const needsDb = task === 'create' || task === 'modify';
  const steps = ['Database Wizard', 'Connect to Server', ...(task === 'create' ? ['Database Settings'] : []), 'Database creation task'];
  const cur = steps[step];
  const onStatus = cur === 'Database creation task';
  const fail = (keys: string[], message: string) => { v.mark(keys); toast({ variant: 'error', title: 'Check the fields', message }); return false; };
  const sqlExpress = () => toast({ variant: 'info', title: 'SQL Express', message: 'The Microsoft download page opens outside this prototype.' });

  const validate = () => {
    if (cur === 'Connect to Server') {
      if (!sql.trim()) return fail(['sql'], 'Enter the SQL Server instance.');
      if (!password) return fail(['password'], 'Enter the password.');
      if (needsDb && !db.trim()) return fail(['db'], 'Enter the database name.');
      if (!(Number(connT) > 0) || !(Number(queryT) > 0)) return fail([!(Number(connT) > 0) && 'connT', !(Number(queryT) > 0) && 'queryT'].filter(Boolean) as string[], 'Time-outs must be positive seconds.');
    }
    if (cur === 'Database Settings') {
      if (!(Number(dbSize) > 0) || !(Number(logSize) > 0)) return fail([], 'Sizes must be positive MB values.');
      if (custom && (!dataPath.trim() || !logPath.trim())) return fail(['dataPath', 'logPath'].filter((k) => !(k === 'dataPath' ? dataPath.trim() : logPath.trim())), 'Enter the data and log file paths, or clear the checkbox.');
    }
    return true;
  };
  const finish = () => {
    if (needsDb) {
      ds$.patchServers([server.id], () => ({
        sqlServer: sql.trim(), database: db.trim(), authMode: auth === 'sql' ? 'Sql Server Authentication' : 'Windows Authentication',
        dataInsertion: insert === 'Yes' ? 'File Server' : 'Lepide Console', lastUpdate: stampNow(),
      }));
    } else ds$.patchServers([server.id], () => ({ lastUpdate: stampNow() }));
    toast({ variant: 'success', title: t.label, message: `Completed for ${server.name}.` });
    onClose();
  };

  let body: ReactNode;
  if (cur === 'Database Wizard') {
    body = (
      <>
        <h4 className="add-data-source-step-title">Welcome to the Database Wizard</h4>
        <p className="add-data-source-lead">Select desired database task and click "Next"</p>
        <RadioGroup ariaLabel="Database task" value={task} onChange={(x) => setTask(x as Task)} options={TASKS.map((x) => ({ value: x.value, label: x.label }))} />
        <div className="add-data-source-block"><h4>Description</h4><p>{t.desc}</p></div>
        <Note lead="Note:" sep=" ">If you do not have SQL Server installed then click this link to download SQL Express edition</Note>
        <button type="button" className="add-data-source-linkbtn" onClick={sqlExpress}><Icon name="external" size={14} />https://www.microsoft.com/en-in/download/details.aspx?id=56840</button>
      </>
    );
  } else if (cur === 'Connect to Server') {
    body = (
      <>
        <h4 className="add-data-source-step-title">Connect to Server</h4>
        <p className="add-data-source-lead">Enter server instance, authentication and database name, then click "Next"</p>
        <div className="add-data-source-two">
          <TextField label="Server" value={sql} maxLength={256} aria-invalid={v.inv('sql')} onChange={(x) => { setSql(x); v.clear('sql'); }} />
          <SelectField label={<span className="row" style={{ gap: 6 }}>Insert data from file server directly<InfoTip text="Minimum version 4.0 .Net Framework required on agent machine." /></span>}
            value={insert} options={['Yes', 'No']} onChange={setInsert} />
        </div>
        <RadioGroup row ariaLabel="Authentication" value={auth} onChange={setAuth}
          options={[{ value: 'windows', label: 'Windows Authentication' }, { value: 'sql', label: 'SQL Server Authentication' }]} />
        <div className="add-data-source-two">
          <TextField label="User Name" value={user} maxLength={256} onChange={setUser} />
          <div className="add-data-source-inline">
            <PasswordField label="Password" value={password} maxLength={256} aria-invalid={v.inv('password')} onChange={(x) => { setPassword(x); v.clear('password'); }} autoComplete="new-password" />
            <Button onClick={() => { setSql('NDR27\\SQL16'); v.clear('sql'); toast({ variant: 'success', title: 'Default SQL server', message: 'NDR27\\SQL16 selected.' }); }}>Use default SQL server</Button>
          </div>
        </div>
        {needsDb && <TextField label="Database" value={db} placeholder="<Enter text here>" maxLength={128} aria-invalid={v.inv('db')} onChange={(x) => { setDb(x); v.clear('db'); }} />}
        <h4 className="add-data-source-sub">Change Connection properties</h4>
        <div className="add-data-source-inline">
          <NumberField label="Connection time-out" value={connT} min={0} suffix="seconds" error={v.inv('connT') ? ' ' : undefined} onChange={(x) => { setConnT(x); v.clear('connT'); }} />
          <NumberField label="Query time-out" value={queryT} min={0} suffix="seconds" error={v.inv('queryT') ? ' ' : undefined} onChange={(x) => { setQueryT(x); v.clear('queryT'); }} />
          <Button onClick={() => { setConnT(120); setQueryT(120); }}>Reset all</Button>
        </div>
      </>
    );
  } else if (cur === 'Database Settings') {
    body = (
      <>
        <h4 className="add-data-source-step-title">Database Settings</h4>
        <p className="add-data-source-lead">Define new database size and path and click "Next"</p>
        <h4 className="add-data-source-sub">Database size settings</h4>
        <div className="add-data-source-two">
          <NumberField label={<span className="row" style={{ gap: 6 }}>Initial Database Size<InfoTip text="Starting size of the data file; it grows automatically." /></span>} value={dbSize} min={0} suffix="MB" onChange={setDbSize} />
          <NumberField label={<span className="row" style={{ gap: 6 }}>Initial Log File Size<InfoTip text="Starting size of the transaction log file." /></span>} value={logSize} min={0} suffix="MB" onChange={setLogSize} />
        </div>
        <h4 className="add-data-source-sub">Database and log file paths</h4>
        <Checkbox label="Check if you want to change default database location" checked={custom} onChange={setCustom} />
        <div className="add-data-source-two">
          <TextField label="Data File Path" value={dataPath} disabled={!custom} placeholder="<Enter text here>" maxLength={260} aria-invalid={v.inv('dataPath')} onChange={(x) => { setDataPath(x); v.clear('dataPath'); }} />
          <TextField label="Log File Path" value={logPath} disabled={!custom} placeholder="<Enter text here>" maxLength={260} aria-invalid={v.inv('logPath')} onChange={(x) => { setLogPath(x); v.clear('logPath'); }} />
        </div>
      </>
    );
  } else {
    body = (
      <>
        <h4 className="add-data-source-step-title">Database creation task</h4>
        <StatusRunView tasks={[`${t.label}${needsDb ? ` ${db.trim()}` : ''} on ${sql.trim()}`]} onDone={() => setRunDone(true)} />
      </>
    );
  }

  return (
    <WizardFrame root="File Server" crumb={`${server.name} / Database Wizard`} steps={steps} step={step} onClose={onClose} busy={onStatus}
      footer={<WizardFooter onBack={() => { v.mark([]); setStep((x) => x - 1); }} backDisabled={step === 0 || onStatus} onCancel={onClose} cancelDisabled={onStatus}
        onNext={onStatus ? finish : () => { if (validate()) { v.mark([]); setStep((x) => x + 1); } }} nextLabel={onStatus ? 'Finish' : 'Next'} nextDisabled={onStatus && !runDone} />}>
      {body}
    </WizardFrame>
  );
}
