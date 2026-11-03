import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Button, ConfirmDialog, EmptyState, Field, Icon, IconButton, Modal, PasswordField, Segmented, SetCard, TextField, ToneTag,
  useToast, type StatusTone,
} from '../../../ui';
import {
  WINRM_STEPS, cancelInstall, patchAgent, protectStore, startInstall, statusText, type AgentStatus, type ProtectAgent,
} from './store';
import { AddAgentDialog } from './AddAgentDialog';

/* SCR-SDS-21 sub-view Settings (FLW-SDS-26): retention limit, Agent | WinRm, DLG-SDS-70/71/72/73. */

const TONE: Record<AgentStatus, StatusTone> = { Installed: 'good', Installing: 'info', 'In Que': 'warn', 'Not installed': 'bad' };
const UNC_RE = /^\\\\[^\\/\s]+\\[^\\].*$/;
const TAB_TIP: Record<string, string> = {
  agent: 'Agents run on each file server to apply Protect policies.',
  winrm: 'WinRM lets the console execute policies on remote servers.',
};

function RetentionCard() {
  const toast = useToast();
  const stored = protectStore.use((s) => s.retention);
  const [val, setVal] = useState(stored);
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    const t = val.trim();
    if (!/^\d+$/.test(t) || Number(t) < 2 || Number(t) > 12) { setErr('Backup limit must be a whole number between 2 and 12.'); return; }
    const n = String(Number(t));
    setErr(null); setVal(n);
    protectStore.set((s) => ({ ...s, retention: n }));
    toast({ variant: 'success', title: 'Retention limit saved', message: `Policy backups are kept for ${n} versions.` });
  };
  return (
    <SetCard title="Settings">
      <div className="page-form">
        <div className="setrow">
          <div className="setrow__text"><b>License Status</b></div>
          <div className="row"><ToneTag tone="good">License Activated</ToneTag></div>
        </div>
        <div className="setrow" style={{ alignItems: 'flex-start' }}>
          <div className="setrow__text"><b>Policy Backup Retention Limit</b></div>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <TextField aria-label="Policy Backup Retention Limit" value={val} inputMode="numeric" maxLength={3} style={{ width: 120 }}
              error={err} help="Note: Backup limit can be set between 2 and 12."
              onChange={(v) => { setVal(v); if (err) setErr(null); }} onKeyDown={(e) => e.key === 'Enter' && submit()} />
            <Button variant="primary" onClick={submit} style={{ marginTop: 4 }}>Submit</Button>
          </div>
        </div>
      </div>
    </SetCard>
  );
}

function ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const share = protectStore.use((s) => s.share);
  const [path, setPath] = useState(share?.path ?? '');
  const [user, setUser] = useState(share?.user ?? '');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<{ path?: string; pw?: string }>({});
  const done = () => {
    const e: { path?: string; pw?: string } = {};
    if (!UNC_RE.test(path.trim())) e.path = 'Enter a UNC path, e.g. \\\\192.168.10.141\\HR Doc';
    if (!user.trim() || !pw) e.pw = 'Enter the user name and password that can write to the share.';
    setErr(e); if (e.path || e.pw) return;
    protectStore.set((s) => ({ ...s, share: { path: path.trim(), user: user.trim() } }));
    toast({ variant: 'success', title: 'Communication share path configured', message: path.trim() });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} size="sm" icon="folder" title="Configure Communication Share path"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <TextField label="Communication Path" placeholder="\\192.168.10.141\HR Doc" value={path} error={err.path} maxLength={260}
        onChange={(v) => { setPath(v); setErr((x) => ({ ...x, path: undefined })); }} />
      <TextField label="User Name" placeholder="Chily/Max" value={user} maxLength={255} onChange={(v) => { setUser(v); setErr((x) => ({ ...x, pw: undefined })); }} />
      <PasswordField label="Password" value={pw} error={err.pw} autoComplete="new-password" onChange={(v) => { setPw(v); setErr((x) => ({ ...x, pw: undefined })); }} />
    </Modal>
  );
}

function EditAgentDialog({ agent, onClose }: { agent: ProtectAgent; onClose: () => void }) {
  const toast = useToast();
  const [user, setUser] = useState(agent.logonUser);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const done = () => {
    if (!user.trim() || !pw) { setErr('Enter the user name and password.'); return; }
    patchAgent(agent.id, { logonUser: user.trim() });
    toast({ variant: 'success', title: 'Agent updated', message: `${agent.fileServer} now uses ${user.trim()}.` });
    onClose();
  };
  return (
    <Modal open onClose={onClose} size="sm" icon="server" title="Lepide Protect Agent Configuration"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <TextField label="File Server IP" value={agent.fileServer} readOnly disabled />
      <TextField label="User Name" value={user} maxLength={255} onChange={(v) => { setUser(v); setErr(null); }} />
      <PasswordField label="Password" value={pw} error={err} autoComplete="new-password" onChange={(v) => { setPw(v); setErr(null); }} />
    </Modal>
  );
}

/* Agent table with a page-owned filter row (Agent Status matches from the start of the status, so
   "Installed" doesn't also match "Not installed"; other columns match any substring). */
const AGENT_COLS: { key: 'fileServer' | 'status' | 'uncPath'; header: string }[] = [
  { key: 'fileServer', header: 'File Server' }, { key: 'status', header: 'Agent Status' }, { key: 'uncPath', header: 'Agent UNC Path' },
];
function AgentTable({ agents, actions }: { agents: ProtectAgent[]; actions: (a: ProtectAgent) => ReactNode }) {
  const [f, setF] = useState<Record<string, string>>({});
  const text = (a: ProtectAgent, k: string) => (k === 'status' ? statusText(a.status) : String(a[k as keyof ProtectAgent]));
  const rows = agents.filter((a) => AGENT_COLS.every((c) => {
    const q = (f[c.key] ?? '').trim().toLowerCase(); if (!q) return true;
    const v = text(a, c.key).toLowerCase();
    return c.key === 'status' ? v.startsWith(q) : v.includes(q);
  }));
  return (
    <section className="lf-card tablecard tablecard--static">
      <div className="toolbar">
        <h3 className="lf-card__title" style={{ margin: 0 }}>Agents<small className="count-chip">{rows.length} {rows.length === 1 ? 'agent' : 'agents'}</small></h3>
      </div>
      <div className="tbl-wrap">
        <table className="lf-table">
          <thead>
            <tr>{AGENT_COLS.map((c) => <th key={c.key}>{c.header}</th>)}<th style={{ width: 96 }}><span className="sr-only">Actions</span></th></tr>
            <tr className="filter-row">
              {AGENT_COLS.map((c) => (
                <th key={c.key}>
                  <span className={'filter-input' + (f[c.key] ? ' has-value' : '')}>
                    <Icon name="search" size={12} />
                    <input value={f[c.key] ?? ''} placeholder="Filter" aria-label={`Filter ${c.header}`} maxLength={200}
                      onChange={(e) => setF((x) => ({ ...x, [c.key]: e.target.value }))} />
                  </span>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody className="rows-in">
            {agents.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 0, height: 'auto', maxWidth: 'none', whiteSpace: 'normal', position: 'static' }}>
                <EmptyState icon="server" title="No agents yet. Click Add Agent to enrol a file server." /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="empty-cell" style={{ maxWidth: 'none', position: 'static' }}>No results match your search or filters.</td></tr>
            ) : rows.map((a) => (
              <tr key={a.id} className="lf-row" style={{ cursor: 'default' }}>
                <td className="lf-mono" title={a.fileServer}>{a.fileServer}</td>
                <td><ToneTag tone={TONE[a.status]}>{statusText(a.status)}</ToneTag></td>
                <td title={a.uncPath}>{a.uncPath}</td>
                <td className="lf-row__end" style={{ width: 96 }}><span className="lf-row__actions">{actions(a)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AgentPanel() {
  const toast = useToast();
  const agents = protectStore.use((s) => s.agents);
  const share = protectStore.use((s) => s.share);
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ProtectAgent | null>(null);
  const [uninstall, setUninstall] = useState<ProtectAgent | null>(null);

  return (
    <>
      <SetCard title="Agent" actions={<Button variant="primary" icon="plus" onClick={() => setAddOpen(true)}>Add agent</Button>}>
        <div className="page-form form-col">
          <Field label="Communication Share path">
            <div className="row">
              <input className="grow" readOnly value={share?.path ?? ''} placeholder="Not configured" aria-label="Communication Share path" />
              <Button icon="settings" onClick={() => setShareOpen(true)}>Configure</Button>
            </div>
          </Field>
        </div>
      </SetCard>
      <AgentTable agents={agents}
        actions={(a) => (
          <>
            <IconButton icon="edit" label={`Edit ${a.fileServer}`} onClick={() => setEditing(a)} />
            {a.status === 'Not installed'
              ? <IconButton icon="download" label={`Install agent on ${a.fileServer}`} onClick={() => {
                startInstall([a.id]);
                toast({ variant: 'info', title: 'Agent queued', message: `Installation on ${a.fileServer} is queued.` });
              }} />
              : <IconButton icon="trash" danger label={`Uninstall agent on ${a.fileServer}`} onClick={() => setUninstall(a)} />}
          </>
        )} />

      {shareOpen && <ShareDialog open onClose={() => setShareOpen(false)} />}
      {addOpen && <AddAgentDialog onClose={() => setAddOpen(false)} />}
      {editing && <EditAgentDialog agent={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!uninstall} onClose={() => setUninstall(null)} title="Uninstall agent" confirmLabel="Uninstall"
        message={uninstall ? `Uninstall the Protect agent from ${uninstall.fileServer}? Policies stop executing on this server until it is re-enrolled.` : ''}
        onConfirm={() => {
          if (!uninstall) return;
          cancelInstall(uninstall.id); patchAgent(uninstall.id, { status: 'Not installed' });
          toast({ variant: 'success', title: 'Agent uninstalled', message: uninstall.fileServer });
          setUninstall(null);
        }} />
    </>
  );
}

function WinrmPanel() {
  const [open, setOpen] = useState<string | null>('trusted-hosts');
  return (
    <SetCard title="WinRM Configuration Requirements"
      description="To enable remote policy execution and communication between components, complete the following configuration steps on both the client and target server machines.">
      <div className="protect-acc">
        {WINRM_STEPS.map((s) => {
          const on = open === s.id;
          return (
            <div key={s.id} className="protect-acc__item">
              <button type="button" className="protect-acc__btn" aria-expanded={on} aria-controls={`winrm-${s.id}`} onClick={() => setOpen(on ? null : s.id)}>
                <span>{s.title}</span><Icon name="chevron" />
              </button>
              {on && (
                <div className="protect-acc__body" id={`winrm-${s.id}`}>
                  {s.body.map((b) => <p key={b}>{b}</p>)}
                  {s.commands?.map((c) => <div key={c.label} className="protect-cmd"><b>{c.label}</b><code>{c.command}</code></div>)}
                  {s.steps && <ol>{s.steps.map((x) => <li key={x}>{x}</li>)}</ol>}
                  {s.footnote && <p className="protect-foot">{s.footnote}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SetCard>
  );
}

export function SettingsView() {
  const [tab, setTab] = useState('agent');
  return (
    <>
      <RetentionCard />
      <div className="row">
        <Segmented ariaLabel="Protect agent settings" value={tab} onChange={setTab} hug
          items={[{ value: 'agent', label: 'Agent' }, { value: 'winrm', label: 'WinRm' }]} />
        <span className="lf-btn lf-btn--icon" role="img" tabIndex={0} data-tip={TAB_TIP[tab]} aria-label={TAB_TIP[tab]}><Icon name="info" /></span>
      </div>
      {tab === 'agent' ? <AgentPanel /> : <WinrmPanel />}
    </>
  );
}
