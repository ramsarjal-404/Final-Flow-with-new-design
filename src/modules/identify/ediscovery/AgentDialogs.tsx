import { useEffect, useRef, useState } from 'react';
import { Banner, Button, Checkbox, IconButton, PasswordField, ProgressBar, TextField, useToast } from '../../../ui';
import { addAgents, edStore, newId, removeAgents, usersOfAgent } from './store';
import type { Agent } from './store';
import { DOMAIN_USER, HOST, UNC } from './rules';
import { EdModal, MiniTable, StatusTag } from './parts';

/* DLG-IDN-10 Install Agent, DLG-IDN-11 Add Server / Update Server / Update Agent, DLG-IDN-12 Uninstall Agent.
   Intended behaviour built for GAP-IDN-04 (initial values captured once when the dialog opens),
   GAP-IDN-20 (uninstall warns about the cases / locations that use the agent and marks those cases),
   GAP-IDN-21 (Cancel before Install discards; after completion only "Done"),
   GAP-IDN-22 (agents are removed when the uninstall pass completes; afterwards only "Done"). */

export type ServerForm = { ip: string; path: string; user: string; password: string };
const EMPTY: ServerForm = { ip: '', path: '', user: '', password: '' };
const AGENT_PATH_HINT = 'Use "\\\\server name\\share name" format';
const USER_HINT = 'Use "\\\\Domain name\\User name" format';

/** Simulated pass: 10 % then +15 % every 300 ms to 100 %, then `done` 350 ms later. */
function useProgress() {
  const [pct, setPct] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => { clearInterval(t); clearTimeout(t); }), []);
  const start = (done: () => void) => {
    setPct(10);
    let v = 10;
    const iv = window.setInterval(() => {
      v = Math.min(100, v + 15); setPct(v);
      if (v >= 100) { clearInterval(iv); timers.current.push(window.setTimeout(() => { setPct(null); done(); }, 350)); }
    }, 300);
    timers.current.push(iv);
  };
  return { pct, running: pct !== null, start };
}

/* ---------- DLG-IDN-11 ---------- */
export function ServerDialog({ open, title, initial, onClose, onApply }: {
  open: boolean; title: 'Add Server' | 'Update Server' | 'Update Agent'; initial?: Partial<ServerForm>;
  onClose: () => void; onApply: (f: ServerForm) => boolean;
}) {
  const toast = useToast();
  const [f, setF] = useState<ServerForm>(EMPTY);
  const [tried, setTried] = useState(false);
  // GAP-IDN-04: capture the initial values once, when the dialog opens.
  useEffect(() => { if (open) { setF({ ...EMPTY, ...initial, password: '' }); setTried(false); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const locked = title !== 'Add Server';
  const rules: [keyof ServerForm, boolean, string][] = [
    ['ip', HOST.test(f.ip.trim()), 'Enter the server IP address or name.'],
    ['path', UNC.test(f.path.trim()), 'Use the "\\\\server name\\share name" format for the agent path.'],
    ['user', DOMAIN_USER.test(f.user.trim()), 'Use the "\\\\Domain name\\User name" format.'],
    ['password', !!f.password, 'Enter the password.'],
  ];
  const err = (k: keyof ServerForm) => (tried ? rules.find((r) => r[0] === k && !r[1])?.[2] ?? null : null);
  const apply = () => {
    const bad = rules.find((r) => !r[1]);
    if (bad) { setTried(true); toast({ variant: 'error', title, message: bad[2] }); return; }
    if (onApply({ ip: f.ip.trim(), path: f.path.trim(), user: f.user.trim(), password: f.password })) onClose();
  };
  const set = (k: keyof ServerForm) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } };
  return (
    <EdModal open={open} onClose={onClose} title={title} icon={locked ? 'edit' : 'server'} size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={apply}>Apply</Button></>}>
      <TextField label="IP Address" value={f.ip} disabled={locked} onChange={set('ip')} onKeyDown={enter} error={err('ip')} placeholder="192.168.30.150" />
      <TextField label="Agent Path" value={f.path} onChange={set('path')} onKeyDown={enter} help={AGENT_PATH_HINT} error={err('path')} data-autofocus={locked || undefined} />
      <div className="fld-row">
        <TextField label="User Name" value={f.user} onChange={set('user')} onKeyDown={enter} help={USER_HINT} error={err('user')} autoComplete="off" />
        <PasswordField label="Password" value={f.password} onChange={set('password')} onKeyDown={enter} error={err('password')} autoComplete="new-password" />
      </div>
    </EdModal>
  );
}

/* ---------- DLG-IDN-10 Install Agent ---------- */
type Candidate = ServerForm & { id: string; status: 'Ready to Install' | 'Successful' };

export function InstallAgentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const agents = edStore.use((s) => s.agents);
  const [rows, setRows] = useState<Candidate[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [server, setServer] = useState<null | { mode: 'Add Server' | 'Update Server'; row?: Candidate }>(null);
  const prog = useProgress();
  useEffect(() => { if (open) { setRows([]); setChecked([]); setBusyIds([]); setServer(null); } }, [open]);

  const ready = rows.filter((r) => r.status === 'Ready to Install');
  const allDone = rows.length > 0 && rows.every((r) => r.status === 'Successful');
  const checkedReady = ready.filter((r) => checked.includes(r.id));
  const close = () => { if (!prog.running) onClose(); };

  const install = () => {
    const chosen = checkedReady;
    setBusyIds(chosen.map((r) => r.id));
    prog.start(() => {
      setRows((rs) => rs.map((r) => (chosen.some((c) => c.id === r.id) ? { ...r, status: 'Successful' } : r)));
      setChecked([]); setBusyIds([]);
      addAgents(chosen.map((c) => ({ id: newId('agent'), server: c.ip, path: c.path, user: c.user, scanned: '—' })));
      toast({ variant: 'success', title: 'Success!', message: `Agent installed successfully on ${chosen.map((c) => c.ip).join(', ')}.` });
    });
  };

  const statusOf = (r: Candidate) => (busyIds.includes(r.id) ? 'Installing…' : r.status);
  return (
    <>
      <EdModal open={open} onClose={close} title="Install agent" icon="server" size="lg"
        footer={allDone ? <Button variant="primary" onClick={onClose}>Done</Button> : <>
          <Button disabled={prog.running} onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!checkedReady.length || prog.running} loading={prog.running} onClick={install}>Install</Button>
        </>}>
        <div className="row row--between identify-bar">
          <Checkbox label="Select All" disabled={!ready.length || prog.running}
            checked={ready.length > 0 && ready.every((r) => checked.includes(r.id))}
            indeterminate={checkedReady.length > 0 && checkedReady.length < ready.length}
            onChange={(on) => setChecked(on ? ready.map((r) => r.id) : [])} />
          <div className="row">
            <IconButton icon="info" label="About installing agents" bordered
              onClick={() => toast({ variant: 'info', title: 'Install agent', message: 'The agent is installed on the server from the Agent Path share using the given account. The account needs local administrator rights.' })} />
            <IconButton icon="plus" label="Add server" bordered disabled={prog.running} onClick={() => setServer({ mode: 'Add Server' })} />
            <IconButton icon="edit" label="Edit checked server" data-tip="Edit the checked server" bordered disabled={checkedReady.length !== 1 || prog.running}
              onClick={() => setServer({ mode: 'Update Server', row: checkedReady[0] })} />
          </div>
        </div>
        <MiniTable label="Servers to install" head={[<span key="c" className="sr-only">Select</span>, 'IP Address', 'Agent Path', 'User Name', 'Status']}
          rows={rows.map((r) => [
            <Checkbox key="c" ariaLabel={r.ip} checked={r.status === 'Successful' || checked.includes(r.id)} disabled={r.status !== 'Ready to Install' || prog.running}
              onChange={(on) => setChecked((c) => (on ? [...c, r.id] : c.filter((x) => x !== r.id)))} />,
            r.ip, <span key="p" className="mono" title={r.path}>{r.path}</span>, r.user,
            <StatusTag key="s" value={statusOf(r)} tone={r.status === 'Successful' ? 'good' : busyIds.includes(r.id) ? 'info' : 'none'} live={busyIds.includes(r.id)} />,
          ])}
          empty="No server added. Click + to add the server to install the agent on." />
        {prog.pct !== null && <ProgressBar value={prog.pct} label="Installing agents" />}
      </EdModal>

      <ServerDialog open={!!server} title={server?.mode ?? 'Add Server'} initial={server?.row} onClose={() => setServer(null)}
        onApply={(f) => {
          if (server?.mode === 'Update Server' && server.row) {
            const id = server.row.id;
            setRows((rs) => rs.map((r) => (r.id === id ? { ...r, path: f.path, user: f.user, password: f.password } : r)));
            return true;
          }
          const ip = f.ip.toLowerCase();
          if (rows.some((r) => r.ip.toLowerCase() === ip) || agents.some((a) => a.server.toLowerCase() === ip)) {
            toast({ variant: 'error', title: 'Already added', message: `An agent for ${f.ip} already exists.` });
            return false;
          }
          const row: Candidate = { ...f, id: newId('cand'), status: 'Ready to Install' };
          setRows((rs) => [...rs, row]); setChecked((c) => [...c, row.id]);
          return true;
        }} />
    </>
  );
}

/* ---------- DLG-IDN-12 Uninstall Agent ---------- */
export function UninstallAgentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const state = edStore.use();
  const [rows, setRows] = useState<Agent[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [phase, setPhase] = useState<'pick' | 'running' | 'done'>('pick');
  const prog = useProgress();
  useEffect(() => { if (open) { setRows(edStore.get().agents); setChecked([]); setPhase('pick'); } }, [open]);
  const close = () => { if (phase !== 'running') onClose(); };

  const uninstall = () => {
    const servers = rows.filter((r) => checked.includes(r.server)).map((r) => r.server);
    setPhase('running');
    prog.start(() => {
      setPhase('done');
      removeAgents(servers);
      toast({ variant: 'success', title: 'Success!', message: `Agent uninstalled from ${servers.join(', ')}.` });
    });
  };
  const status = (a: Agent) => (!checked.includes(a.server) || phase === 'pick' ? 'Installed' : phase === 'running' ? 'Uninstalling…' : 'Uninstalled');
  const users = phase === 'pick' ? checked.flatMap((s) => { const u = usersOfAgent(state, s); return [...u.cases, ...u.locations]; }) : [];

  return (
    <EdModal open={open} onClose={close} title="Uninstall agent" icon="trash" tone="danger" size="lg"
      footer={phase === 'done' ? <Button variant="primary" onClick={onClose}>Done</Button> : <>
        <Button disabled={phase === 'running'} onClick={onClose}>Cancel</Button>
        <Button variant="danger-solid" disabled={!checked.length || phase === 'running'} loading={phase === 'running'} onClick={uninstall}>Uninstall</Button>
      </>}>
      <MiniTable label="Installed agents" head={[<span key="c" className="sr-only">Select</span>, 'IP Address', 'Agent Path', 'User Name', 'Status']}
        rows={rows.map((a) => [
          <Checkbox key="c" ariaLabel={a.server} checked={checked.includes(a.server)} disabled={phase !== 'pick'}
            onChange={(on) => setChecked((c) => (on ? [...c, a.server] : c.filter((x) => x !== a.server)))} />,
          a.server, <span key="p" className="mono" title={a.path}>{a.path}</span>, a.user,
          <StatusTag key="s" value={status(a)} tone={status(a) === 'Uninstalled' ? 'none' : status(a) === 'Installed' ? 'good' : 'info'} live={status(a) === 'Uninstalling…'} />,
        ])}
        empty="No agent is installed." />
      {users.length > 0 && (
        <Banner tone="warning">
          <b>{users.join(', ')}</b> use{users.length === 1 ? 's' : ''} the checked agent{checked.length === 1 ? '' : 's'}. After uninstalling, the cases among them show the Agent Status "Agent Uninstalled".
        </Banner>
      )}
      {prog.pct !== null && <ProgressBar value={prog.pct} label="Uninstalling agents" />}
    </EdModal>
  );
}
