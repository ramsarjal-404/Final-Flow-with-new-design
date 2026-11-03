import { useEffect, useState } from 'react';
import {
  Button, Checkbox, ConfirmDialog, DataTable, EmptyState, IconButton, Modal, PasswordField, TextField, ToneTag, useToast,
} from '../../../ui';
import { addAgents, idfStore, isHost, isUnc, markRemoving, removeAgent, updateAgent } from './store';
import type { Agent, IdfSource } from './store';
import { CheckTable, Console } from './shared';

/* ---------- DLG-SDS-63 · Add Server / Update Agent ---------- */
type AgentForm = { server: string; path: string; user: string; password: string };
type AgentErrs = Partial<Record<keyof AgentForm, string>>;

function agentErrors(f: AgentForm): [keyof AgentForm, string][] {
  const out: [keyof AgentForm, string][] = [];
  if (!isHost(f.server.trim())) out.push(['server', 'Enter the agent server IP address or name.']);
  if (!isUnc(f.path.trim())) out.push(['path', 'Use the "\\\\server name\\share name" format for the agent path.']);
  if (!/^[^\\\s]+\\[^\\\s]+$/.test(f.user.trim())) out.push(['user', 'Use the "Domain name\\User Name" format.']);
  if (!f.password) out.push(['password', 'Enter the password.']);
  return out;
}

export function AgentServerDialog({ open, mode, initial, onClose, onSubmit }: {
  open: boolean; mode: 'add' | 'update'; initial?: AgentForm; onClose: () => void; onSubmit: (f: AgentForm) => boolean;
}) {
  const toast = useToast();
  const blank = { server: '', path: '', user: '', password: '' };
  const [f, setF] = useState<AgentForm>(blank);
  const [errs, setErrs] = useState<AgentErrs>({});
  useEffect(() => { if (open) { setF(initial ?? blank); setErrs({}); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const up = (p: Partial<AgentForm>) => { setF((x) => ({ ...x, ...p })); setErrs((e) => ({ ...e, ...Object.fromEntries(Object.keys(p).map((k) => [k, undefined])) })); };
  const submit = () => {
    const list = agentErrors(f);
    if (list.length) {
      setErrs(Object.fromEntries(list));
      toast({ variant: 'error', title: 'Check the highlighted fields', message: list[0][1] });
      return;
    }
    onSubmit({ server: f.server.trim(), path: f.path.trim(), user: f.user.trim(), password: f.password });
  };
  return (
    <Modal open={open} onClose={onClose} title={mode === 'add' ? 'Add Server' : 'Update Agent'} icon={mode === 'add' ? 'server' : 'edit'} size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>{mode === 'add' ? 'Apply' : 'Done'}</Button></>}>
      <TextField label="IP Address" value={f.server} disabled={mode === 'update'} error={errs.server} placeholder="Enter IP address" onChange={(v) => up({ server: v })} />
      <TextField label="Agent Path" value={f.path} error={errs.path} help={'Use "\\\\server name\\share name" format'} placeholder="Enter agent path" onChange={(v) => up({ path: v })} />
      <TextField label="User Name" value={f.user} error={errs.user} help={'Use "Domain name\\User Name" format'} placeholder="Enter user name" onChange={(v) => up({ user: v })} />
      <PasswordField label="Password" value={f.password} error={errs.password} placeholder="Enter password" autoComplete="new-password" onChange={(v) => up({ password: v })} />
    </Modal>
  );
}

/* ---------- DLG-SDS-62 · Install Agent ---------- */
type Cand = AgentForm & { status: 'Ready To Install' | 'Installing' | 'Installed' };

export function InstallAgentDialog({ open, onClose, onInstalled }: { open: boolean; onClose: () => void; onInstalled?: (ips: string[]) => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<Cand[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [sub, setSub] = useState<null | { mode: 'add' | 'update'; server?: string }>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setRows([]); setChecked([]); setSub(null); setBusy(false); } }, [open]);
  const ready = rows.filter((r) => r.status === 'Ready To Install');
  const readyChecked = ready.filter((r) => checked.includes(r.server));
  const allDone = rows.length > 0 && rows.every((r) => r.status === 'Installed');
  const close = () => { if (!busy) onClose(); };

  const submit = (f: AgentForm) => {
    if (sub?.mode === 'update') {
      setRows((rs) => rs.map((r) => (r.server === sub.server ? { ...r, path: f.path, user: f.user, password: f.password } : r)));
      setSub(null); return true;
    }
    const dup = rows.some((r) => r.server.toLowerCase() === f.server.toLowerCase()) || idfStore.get().agents.some((a) => a.server.toLowerCase() === f.server.toLowerCase());
    if (dup) { toast({ variant: 'error', title: 'Already added', message: `An agent for ${f.server} already exists.` }); return false; }
    setRows((rs) => [...rs, { ...f, status: 'Ready To Install' }]);
    setChecked((c) => [...c, f.server]);
    setSub(null); return true;
  };
  const install = () => {
    const ips = readyChecked.map((r) => r.server);
    setBusy(true);
    setRows((rs) => rs.map((r) => (ips.includes(r.server) ? { ...r, status: 'Installing' } : r)));
    setTimeout(() => {
      setRows((rs) => rs.map((r) => (ips.includes(r.server) ? { ...r, status: 'Installed' } : r)));
      const done = rows.filter((r) => ips.includes(r.server));
      addAgents(done.map((r) => ({ server: r.server, path: r.path, user: r.user, password: r.password, profile: '—' })));
      setChecked((c) => c.filter((x) => !ips.includes(x)));
      setBusy(false);
      toast({ variant: 'success', title: 'Agent installed', message: `Agent installed on ${ips.join(', ')}.` });
      onInstalled?.(ips);
    }, 1600);
  };
  const editRow = rows.find((r) => r.server === sub?.server);
  const allReady = ready.length > 0 && ready.every((r) => checked.includes(r.server));

  return (
    <>
      <Modal open={open} onClose={close} escapeCloses={!sub && !busy} title="Install agent" icon="download" size="lg"
        footer={allDone ? <Button variant="primary" onClick={onClose}>Done</Button> : <>
          <Button onClick={close} disabled={busy}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={readyChecked.length === 0} onClick={install}>Install</Button>
        </>}>
        <div className="row row--between">
          <Checkbox label="Select all" checked={allReady} indeterminate={readyChecked.length > 0 && !allReady} disabled={ready.length === 0 || busy}
            onChange={() => setChecked(allReady ? [] : ready.map((r) => r.server))} />
          <div className="row">
            <IconButton icon="plus" label="Add server" bordered disabled={busy} onClick={() => setSub({ mode: 'add' })} />
            <IconButton icon="edit" label="Edit checked server" bordered disabled={busy || readyChecked.length !== 1}
              onClick={() => setSub({ mode: 'update', server: readyChecked[0].server })} />
          </div>
        </div>
        <CheckTable label="Servers to install the agent on" rows={rows} rowKey={(r) => r.server}
          checked={checked} onChecked={(k) => setChecked(k.filter((x) => ready.some((r) => r.server === x)))}
          cols={[
            { key: 'ip', header: 'IP Address', cell: (r) => r.server },
            { key: 'path', header: 'Agent Path', cell: (r) => r.path },
            { key: 'user', header: 'User Name', cell: (r) => r.user },
            { key: 'st', header: 'Status', cell: (r) => <ToneTag tone={r.status === 'Installed' ? 'good' : r.status === 'Installing' ? 'info' : 'none'}>{r.status}</ToneTag> },
          ]}
          empty="No server added. Click + to add the server to install the agent on." />
      </Modal>
      <AgentServerDialog open={!!sub} mode={sub?.mode ?? 'add'} onClose={() => setSub(null)} onSubmit={submit}
        initial={sub?.mode === 'update' && editRow ? { server: editRow.server, path: editRow.path, user: editRow.user, password: editRow.password } : undefined} />
    </>
  );
}

/* ---------- SCR-SDS-19 · Add Agent (Agent List) ---------- */
export function AgentsPage({ source }: { source: IdfSource }) {
  const toast = useToast();
  const agents = idfStore.use((s) => s.agents);
  const removing = idfStore.use((s) => s.removing);
  const [install, setInstall] = useState(false);
  const [edit, setEdit] = useState<Agent | null>(null);
  const [del, setDel] = useState<Agent | null>(null);

  const remove = (a: Agent) => {
    setDel(null);
    markRemoving(a.id);
    toast({ variant: 'info', title: 'Info !', message: 'please wait while removing agent' });
    setTimeout(() => { removeAgent(a.id); toast({ variant: 'success', title: 'Agent removed', message: `The agent on ${a.server} was removed.` }); }, 1400);
  };

  return (
    <Console source={source} title="Add agent" crumbs={[{ label: 'Agent list' }]}
      actions={<Button variant="primary" icon="plus" onClick={() => setInstall(true)}>Install agent</Button>}>
      <DataTable title="Agents" noun={['agent', 'agents']} rows={agents} rowKey={(a) => a.id}
        columns={[
          { key: 'server', header: 'Agent server', sortable: true, filterable: true },
          { key: 'path', header: 'Agent Path', sortable: true, filterable: true, mono: true },
          { key: 'profile', header: 'Scanned profile', sortable: true, filterable: true },
        ]}
        rowActions={(a) => {
          const busy = removing.includes(a.id);
          return <>
            <IconButton icon="edit" label={`Update agent on ${a.server}`} disabled={busy} onClick={() => setEdit(a)} />
            <IconButton icon="trash" label={`Remove agent on ${a.server}`} className="identify-danger-ic" disabled={busy} onClick={() => setDel(a)} />
          </>;
        }}
        empty={<EmptyState icon="server" title="No agent installed. Click Install Agent to add an agent server." />} />
      <InstallAgentDialog open={install} onClose={() => setInstall(false)} />
      <AgentServerDialog open={!!edit} mode="update" onClose={() => setEdit(null)}
        initial={edit ? { server: edit.server, path: edit.path, user: edit.user, password: edit.password } : undefined}
        onSubmit={(f) => {
          updateAgent(edit!.id, { path: f.path, user: f.user, password: f.password });
          toast({ variant: 'success', title: 'Agent updated', message: `The agent on ${edit!.server} was updated.` });
          setEdit(null); return true;
        }} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Remove agent?" message={del ? `The agent on ${del.server} will be uninstalled.` : undefined}
        confirmLabel="Remove" onConfirm={() => del && remove(del)} />
    </Console>
  );
}
