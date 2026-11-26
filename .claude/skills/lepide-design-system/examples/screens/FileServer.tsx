import { useState } from 'react';
import {
  Button, Card, Checkbox, ConfirmDialog, DataTable, Drawer, EmptyState, Field, Icon, IconButton, KeyValues, Menu, Modal,
  MultiSelect, PageHeader, PasswordField, SearchField, SectionNav, Segmented, SelectField, SetCard, SettingRow,
  TextField, TilePicker, Toggle, ToneTag, useToast, focusFirstError, fmtDateTime, toneFor,
  type Column, type IconName, type SectionNavItem, type TileOption,
} from '@lepide/ds-react';

/* Settings › Add data source › File server, rebuilt from the prototype screens settings-add-data-source,
   settings-add-data-source-file-server (and -rules, -users, -users--dialog, -general).
   Pattern: settings layout (Categories section nav) → source tiles → one file server page with four tabs.
   Parts the prototype doesn't show (add/modify file server, add rule, policies list, domain controllers, the server
   drawer, the other General settings sections) are composed from the e-Discovery and Settings golden screens. */

/* ───────────────────────── Demo data ───────────────────────── */

type Section = SectionNavItem & { icon: IconName };
const CATEGORIES: Section[] = [
  { value: 'add-data-source', label: 'Add data source', icon: 'plug' },
  { value: 'trust', label: 'Trust settings', icon: 'shield' },
  { value: 'identify', label: 'Identify settings', icon: 'search' },
  { value: 'protect', label: 'Protect settings', icon: 'lock' },
  { value: 'general', label: 'General settings', icon: 'sliders' },
  { value: 'roles', label: 'Role management', icon: 'users' },
  { value: 'iq', label: 'Lepide IQ', icon: 'sparkles' },
  { value: 'logs', label: 'Logs', icon: 'list' },
  { value: 'backup', label: 'Backup and restore', icon: 'archive' },
  { value: 'exported', label: 'Exported files', icon: 'download', badge: 3 },
  { value: 'app-url', label: 'Application URL', icon: 'link' },
  { value: 'domains', label: 'Manage domains', icon: 'globe' },
  { value: 'subscription', label: 'Subscription', icon: 'send' },
  { value: 'notifications', label: 'Configure notifications', icon: 'bell' },
  { value: 'license', label: 'License management', icon: 'key' },
  { value: 'sql', label: 'SQL authentication', icon: 'database' },
  { value: 'user-service', label: 'User service settings', icon: 'user' },
];

type ServerType = 'Windows' | 'NetApp 7-Mode' | 'NetApp cluster mode' | 'Dell EMC' | 'Nasuni' | 'Nutanix';
const SERVER_TYPES: ServerType[] = ['Windows', 'NetApp 7-Mode', 'NetApp cluster mode', 'Dell EMC', 'Nasuni', 'Nutanix'];
type AgentStatus = 'Installed' | 'Not installed' | 'Installing' | 'Updating';
type AuditStatus = 'Running' | 'Stopped' | 'Not started';

type Server = {
  id: string; name: string; type: ServerType; domain: string; agent: AgentStatus; auditing: AuditStatus;
  updated: string; // 'YYYY-MM-DD HH:MM'
  user: string;
};

const SERVERS: Server[] = [
  { id: 's1', name: '192.168.30.150', type: 'Windows', domain: 'myDomain00151', agent: 'Installed', auditing: 'Running', updated: '2026-11-04 08:12', user: 'myDomain00151\\svc-lepide' },
  { id: 's2', name: '192.168.30.151', type: 'NetApp 7-Mode', domain: 'myDomain00152', agent: 'Installed', auditing: 'Running', updated: '2026-11-03 17:45', user: 'myDomain00152\\svc-lepide' },
  { id: 's3', name: '192.168.30.152', type: 'NetApp cluster mode', domain: 'myDomain00152', agent: 'Installed', auditing: 'Stopped', updated: '2026-11-03 11:20', user: 'myDomain00152\\svc-lepide' },
  { id: 's4', name: '192.168.30.153', type: 'Dell EMC', domain: 'myDomain00152', agent: 'Not installed', auditing: 'Not started', updated: '2026-11-02 09:05', user: 'myDomain00152\\svc-lepide' },
  { id: 's5', name: '192.168.30.154', type: 'Nasuni', domain: 'myDomain00152', agent: 'Installed', auditing: 'Running', updated: '2026-11-02 08:40', user: 'myDomain00152\\svc-lepide' },
  { id: 's6', name: '192.168.30.155', type: 'Nutanix', domain: 'myDomain00152', agent: 'Installed', auditing: 'Running', updated: '2026-11-01 16:18', user: 'myDomain00152\\svc-lepide' },
  { id: 's7', name: '192.168.30.156', type: 'Windows', domain: 'myDomain00152', agent: 'Installed', auditing: 'Running', updated: '2026-10-31 13:02', user: 'myDomain00152\\svc-lepide' },
  { id: 's8', name: '192.168.30.221', type: 'Windows', domain: 'myDomain00152', agent: 'Not installed', auditing: 'Not started', updated: '2026-10-30 10:47', user: 'myDomain00152\\svc-lepide' },
];

const DOMAIN_CONTROLLERS = [
  { id: 'dc1', name: 'DC01.myDomain00151.local', domain: 'myDomain00151', site: 'Default-First-Site' },
  { id: 'dc2', name: 'DC01.myDomain00152.local', domain: 'myDomain00152', site: 'Default-First-Site' },
  { id: 'dc3', name: 'DC02.myDomain00152.local', domain: 'myDomain00152', site: 'Branch-London' },
];

type RuleStatus = 'Enabled' | 'Disabled';
type Rule = { id: string; name: string; servers: string[]; policy: string; status: RuleStatus; users: string };
const RULES: Rule[] = [
  { id: 'r1', name: 'Myrule1', servers: ['192.168.30.150', '192.168.30.151', '192.168.30.152'], policy: 'Policy321', status: 'Disabled', users: 'All users' },
  { id: 'r2', name: 'Myrule2', servers: ['192.168.30.151'], policy: 'Policy321', status: 'Disabled', users: 'Ankits' },
  { id: 'r3', name: 'All users', servers: ['192.168.30.151'], policy: 'Policy321', status: 'Enabled', users: 'All users' },
  { id: 'r4', name: 'NetworkGroupA', servers: ['192.168.30.152', '192.168.30.154'], policy: 'Policy456', status: 'Enabled', users: 'Ishans' },
  { id: 'r5', name: 'NetworkGroupB', servers: ['192.168.30.155'], policy: 'Policy789', status: 'Enabled', users: 'Ishans' },
  { id: 'r6', name: 'CustomRule1', servers: ['192.168.30.156', '192.168.30.157'], policy: 'Policy123', status: 'Disabled', users: 'Ankits' },
  { id: 'r7', name: 'CustomRule2', servers: ['192.168.30.158'], policy: 'Policy123', status: 'Enabled', users: 'All users' },
  { id: 'r8', name: 'Rule no. 21', servers: ['192.168.30.150', '192.168.30.170'], policy: 'Audit All', status: 'Enabled', users: 'All users' },
];

type Policy = { id: string; name: string; description: string };
const POLICIES: Policy[] = [
  { id: 'p1', name: 'Policy123', description: 'Reads, writes and deletes on finance shares.' },
  { id: 'p2', name: 'Policy321', description: 'Permission and ownership changes.' },
  { id: 'p3', name: 'Policy456', description: 'Writes and deletes only.' },
  { id: 'p4', name: 'Policy789', description: 'Failed access attempts.' },
  { id: 'p5', name: 'Audit All', description: 'Every file and folder operation.' },
];

const USER_POLICIES = ['Audit all', 'Audit all but shares', 'Audit shares only'];
type UserType = 'Domain user' | 'Local user';
type GUser = { id: string; name: string; domain: string; type: UserType; policy: string; description: string };
type Group = { id: string; name: string; description: string; policy: string; users: GUser[] };
const u = (id: string, name: string, policy = 'Audit all but shares'): GUser =>
  ({ id, name, domain: name.split('\\')[0], type: 'Domain user', policy, description: '123654789' });
const GROUPS: Group[] = [
  { id: 'g1', name: 'Ankits', description: 'Finance analysts', policy: 'Audit all', users: [
    u('u1', 'chilly\\abhineetk'), u('u2', 'chilly\\ankit.s'), u('u3', 'chilly\\priya.m'), u('u4', 'chilly\\rohan.d'),
  ] },
  { id: 'g2', name: 'Ishans', description: 'Engineering leads', policy: 'Audit all', users: [
    u('u5', 'chilly\\ishan.k'), u('u6', 'chilly\\meera.t'), u('u7', 'chilly\\vikram.p'),
  ] },
];

const nowStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const names = (list: { name: string }[]) => list.map((x) => x.name).join(', ');
const HOST = /^[A-Za-z0-9.-]+$/;
const DOMAIN_USER = /^[^\\\s]+\\[^\\\s]+$/;

/* ───────────────────────── Add data source (tiles) ───────────────────────── */

type Tile = TileOption & { description?: string };
const COMPONENTS: Tile[] = [
  { value: 'onedrive', label: 'OneDrive', icon: 'cloud', description: 'Select to add' },
  { value: 'azure', label: 'Azure', icon: 'cloud', description: 'Select to add' },
  { value: 'teams', label: 'Microsoft Teams', icon: 'users', description: 'Select to add' },
  { value: 'copilot', label: 'Copilot', icon: 'sparkles', description: 'Select to add' },
  { value: 'exo', label: 'Exchange Online', icon: 'mail', description: 'Select to add' },
  { value: 'gsuite', label: 'G Suite', icon: 'cloud', description: 'Select to add' },
  { value: 'spo', label: 'SharePoint Online', icon: 'cloud', description: 'devsoft001-a' },
  { value: 'dropbox', label: 'Dropbox', icon: 'archive', description: 'Dropbox' },
  { value: 'aws', label: 'Amazon Web Services', icon: 'cloud', description: 'AWS S3' },
];

function SourcePicker({ serverCount, onOpenFileServer }: { serverCount: number; onOpenFileServer: () => void }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [added, setAdded] = useState<string[]>(['spo', 'dropbox', 'aws']);
  const [removing, setRemoving] = useState<Tile | null>(null);

  const sources: Tile[] = [
    { value: 'salesforce', label: 'Salesforce', icon: 'cloud' },
    { value: 'ad', label: 'Active Directory', icon: 'users', description: '1 configured' },
    { value: 'file-server', label: 'File server', icon: 'server', description: `${serverCount} configured` },
    { value: 'exchange', label: 'Exchange Server', icon: 'mail' },
    { value: 'nasuni', label: 'Nasuni', icon: 'database' },
    { value: 'isilon', label: 'EMC Isilon', icon: 'database' },
    { value: 'nutanix', label: 'Nutanix', icon: 'database' },
    { value: 'netapp', label: 'NetApp filer', icon: 'database' },
  ];
  const match = (t: Tile) => t.label.toLowerCase().includes(q.trim().toLowerCase());
  const shownSources = sources.filter(match);
  const shownComponents = COMPONENTS.filter((c) => !added.includes(c.value) && match(c));
  const shownAdded = COMPONENTS.filter((c) => added.includes(c.value) && match(c));
  const nothing = !shownSources.length && !shownComponents.length && !shownAdded.length;

  const pickSource = (v: string) => {
    if (v === 'file-server') { onOpenFileServer(); return; }
    const s = sources.find((x) => x.value === v);
    toast({ variant: 'info', title: s?.label, message: 'This example opens only the file server settings.' });
  };
  const addComponent = (v: string) => {
    const c = COMPONENTS.find((x) => x.value === v);
    setAdded((list) => [...list, v]);
    toast({ variant: 'success', title: 'Component added', message: `${c?.label} is now listed under Added components.` });
  };
  const changeAdded = (next: string[]) => {
    const gone = added.find((v) => !next.includes(v));
    const c = COMPONENTS.find((x) => x.value === gone);
    if (c) setRemoving(c);
  };

  return (
    <>
      <div className="row row--end">
        <SearchField value={q} onChange={setQ} placeholder="Search" ariaLabel="Search data sources and components" />
      </div>
      {nothing && <Card><p className="lf-muted">No data sources or components match "{q.trim()}".</p></Card>}
      {shownSources.length > 0 && (
        <SetCard title="Data source">
          <TilePicker ariaLabel="Data source" value="" onChange={pickSource} options={shownSources} />
        </SetCard>
      )}
      {shownComponents.length > 0 && (
        <SetCard title="Components">
          <TilePicker ariaLabel="Components to add" value="" onChange={addComponent} options={shownComponents} />
        </SetCard>
      )}
      {shownAdded.length > 0 && (
        <SetCard title="Added components">
          <TilePicker multiple ariaLabel="Added components" value={shownAdded.map((c) => c.value)} onChange={changeAdded} options={shownAdded} />
        </SetCard>
      )}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.label ?? 'component'}?`}
        message="Lepide stops auditing this component. You can add it again later."
        confirmLabel="Remove component"
        onConfirm={() => {
          if (!removing) return;
          setAdded((list) => list.filter((v) => v !== removing.value));
          toast({ variant: 'success', title: 'Component removed', message: `${removing.label} was removed.` });
          setRemoving(null);
        }}
      />
    </>
  );
}

/* ───────────────────────── Add / modify file server ───────────────────────── */

type ServerDraft = { name: string; type: string; domain: string; user: string; password: string; start: boolean };
type ServerErrors = Partial<Record<'name' | 'domain' | 'user' | 'password', string>>;

function ServerDialog({ open, editing, type, servers, onClose, onSave }: {
  open: boolean; editing: Server | null; type: ServerType; servers: Server[]; onClose: () => void;
  onSave: (d: ServerDraft) => void;
}) {
  const blank = (): ServerDraft => editing
    ? { name: editing.name, type: editing.type, domain: editing.domain, user: editing.user, password: '', start: true }
    : { name: '', type, domain: '', user: '', password: '', start: true };
  const [d, setD] = useState<ServerDraft>(blank);
  const [key, setKey] = useState('');
  const [errors, setErrors] = useState<ServerErrors>({});
  // Reset the draft whenever the dialog opens for another server or type.
  const openKey = open ? `${editing?.id ?? 'new'}-${type}` : '';
  if (openKey !== key) { setKey(openKey); if (open) { setD(blank()); setErrors({}); } }

  const set = <K extends keyof ServerDraft>(k: K, v: ServerDraft[K]) => {
    setD((cur) => ({ ...cur, [k]: v }));
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const submit = () => {
    const e: ServerErrors = {};
    const name = d.name.trim();
    if (!name) e.name = 'Enter the file server name or IP address';
    else if (!HOST.test(name)) e.name = 'Use an IP address or a host name, without spaces';
    else if (servers.some((s) => s.name.toLowerCase() === name.toLowerCase() && s.id !== editing?.id)) e.name = `${name} is already in the list`;
    if (!d.domain.trim()) e.domain = 'Enter the domain or workgroup';
    if (!d.user.trim()) e.user = 'Enter a user name';
    else if (!DOMAIN_USER.test(d.user.trim())) e.user = 'Use the Domain name\\User name format';
    if (!editing && !d.password) e.password = 'Enter the password';
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(); return; }
    onSave({ ...d, name, domain: d.domain.trim(), user: d.user.trim() });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={editing ? 'edit' : 'server'}
      title={editing ? 'Modify file server' : 'Add file server'}
      subtitle={editing ? editing.name : `${d.type} file server`}
      onSubmit={submit}
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" icon={editing ? 'check' : 'plus'}>{editing ? 'Save changes' : 'Add file server'}</Button>
      </>}
    >
      <div className="fld-row">
        <TextField label="File server name or IP" autoComplete="off" placeholder="192.168.30.160" value={d.name} error={errors.name}
          disabled={!!editing} onChange={(v) => set('name', v)} />
        <SelectField label="Server type" value={d.type} options={SERVER_TYPES} onChange={(v) => set('type', v)} />
      </div>
      <TextField label="Domain or workgroup" autoComplete="off" placeholder="myDomain00152" value={d.domain} error={errors.domain}
        onChange={(v) => set('domain', v)} />
      <div className="fld-row">
        <TextField label="User name" autoComplete="off" placeholder="CORP\administrator" value={d.user} error={errors.user}
          help="Use the Domain name\User name format." onChange={(v) => set('user', v)} />
        <PasswordField label="Password" note={editing ? 'Leave empty to keep the current one' : undefined} autoComplete="new-password"
          value={d.password} error={errors.password} onChange={(v) => set('password', v)} />
      </div>
      {!editing && <Checkbox checked={d.start} onChange={(v) => set('start', v)} label="Install the agent and start auditing now" />}
    </Modal>
  );
}

/* ───────────────────────── File servers tab ───────────────────────── */

type BulkKind = 'uninstall' | 'stop' | 'remove';

function FileServersTab({ servers, setServers, loading, onAdd, onModify }: {
  servers: Server[]; setServers: (f: (s: Server[]) => Server[]) => void; loading: boolean;
  onAdd: () => void; onModify: (s: Server) => void;
}) {
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ kind: BulkKind; items: Server[] } | null>(null);
  const [showDcs, setShowDcs] = useState(false);

  const chosen = servers.filter((s) => selected.includes(s.id));
  const open = servers.find((s) => s.id === openId) ?? null;
  const patch = (ids: string[], p: Partial<Server>) => setServers((list) => list.map((s) => (ids.includes(s.id) ? { ...s, ...p } : s)));

  const installAgent = (items: Server[]) => {
    const targets = items.filter((s) => s.agent === 'Not installed');
    if (!targets.length) { toast({ variant: 'warning', title: 'Install agent', message: 'The agent is already installed on the selected file servers.' }); return; }
    const ids = targets.map((s) => s.id);
    patch(ids, { agent: 'Installing' });
    const t = toast({ loading: true, title: 'Installing agent', message: `Installing on ${names(targets)}…` });
    window.setTimeout(() => {
      patch(ids, { agent: 'Installed', updated: nowStamp() });
      t.update({ loading: false, variant: 'success', title: 'Agent installed', message: `The agent is running on ${names(targets)}. Start auditing when you're ready.` });
    }, 1500);
  };
  const startAuditing = (items: Server[]) => {
    const ready = items.filter((s) => s.agent === 'Installed' && s.auditing !== 'Running');
    const noAgent = items.filter((s) => s.agent !== 'Installed');
    if (!ready.length) {
      toast({ variant: 'warning', title: 'Start auditing', message: noAgent.length ? 'Install the agent on the selected file servers first.' : 'Auditing is already running on the selected file servers.' });
      return;
    }
    patch(ready.map((s) => s.id), { auditing: 'Running', updated: nowStamp() });
    toast({ variant: 'success', title: 'Auditing started', message: `Auditing ${names(ready)}.${noAgent.length ? ` Skipped ${names(noAgent)}: no agent.` : ''}` });
  };
  const refreshAgent = (items: Server[], upgrade: boolean) => {
    const targets = items.filter((s) => s.agent === 'Installed');
    if (!targets.length) { toast({ variant: 'warning', title: upgrade ? 'Upgrade agent' : 'Update agent', message: 'None of the selected file servers has the agent installed.' }); return; }
    const ids = targets.map((s) => s.id);
    patch(ids, { agent: 'Updating' });
    const t = toast({ loading: true, title: upgrade ? 'Upgrading agent' : 'Updating agent', message: `Working on ${names(targets)}…` });
    window.setTimeout(() => {
      patch(ids, { agent: 'Installed', updated: nowStamp() });
      t.update({ loading: false, variant: 'success', title: upgrade ? 'Agent upgraded' : 'Agent updated',
        message: upgrade ? `${names(targets)} run the latest agent version.` : `${names(targets)} have the latest audit settings.` });
    }, 1300);
  };

  const confirm = () => {
    if (!pending) return;
    const ids = pending.items.map((s) => s.id);
    if (pending.kind === 'uninstall') {
      patch(ids, { agent: 'Not installed', auditing: 'Not started', updated: nowStamp() });
      toast({ variant: 'success', title: 'Agent uninstalled', message: `Removed from ${names(pending.items)}. Auditing stopped there.` });
    } else if (pending.kind === 'stop') {
      patch(ids, { auditing: 'Stopped', updated: nowStamp() });
      toast({ variant: 'success', title: 'Auditing stopped', message: `Lepide no longer records changes on ${names(pending.items)}.` });
    } else {
      setServers((list) => list.filter((s) => !ids.includes(s.id)));
      if (openId && ids.includes(openId)) setOpenId(null);
      toast({ variant: 'success', title: pending.items.length === 1 ? 'File server removed' : 'File servers removed', message: `${names(pending.items)} removed from auditing.` });
    }
    setSelected((s) => s.filter((id) => !ids.includes(id)));
    setPending(null);
  };

  const n = pending?.items.length ?? 0;
  const pendingText = !pending ? null
    : pending.kind === 'uninstall'
      ? { title: n === 1 ? 'Uninstall the agent?' : `Uninstall the agent from ${n} file servers?`, message: `Auditing stops on ${names(pending.items)}. You can install the agent again later.`, confirmLabel: 'Uninstall agent' }
      : pending.kind === 'stop'
        ? { title: n === 1 ? 'Stop auditing?' : `Stop auditing ${n} file servers?`, message: `Changes on ${names(pending.items)} aren't recorded until you start auditing again.`, confirmLabel: 'Stop auditing' }
        : { title: n === 1 ? 'Remove this file server?' : `Remove ${n} file servers?`, message: `${names(pending.items)} and their audit settings are removed. Audit history stays in reports.`, confirmLabel: n === 1 ? 'Remove file server' : `Remove ${n} file servers` };

  const none = !chosen.length;
  const actions: { label: string; icon: IconName; disabled: boolean; run: () => void }[] = [
    { label: 'Install agent', icon: 'download', disabled: none, run: () => installAgent(chosen) },
    { label: 'Uninstall agent', icon: 'x', disabled: none, run: () => setPending({ kind: 'uninstall', items: chosen }) },
    { label: 'Start auditing', icon: 'play', disabled: none, run: () => startAuditing(chosen) },
    { label: 'Stop auditing', icon: 'pause', disabled: none, run: () => setPending({ kind: 'stop', items: chosen }) },
    { label: 'Update agent', icon: 'refresh', disabled: none, run: () => refreshAgent(chosen, false) },
    { label: 'Upgrade agent', icon: 'upload', disabled: none, run: () => refreshAgent(chosen, true) },
    { label: 'Modify file server', icon: 'edit', disabled: chosen.length !== 1, run: () => onModify(chosen[0]) },
    { label: 'Remove file servers', icon: 'trash', disabled: none, run: () => setPending({ kind: 'remove', items: chosen }) },
    { label: 'Domain controllers', icon: 'building', disabled: false, run: () => setShowDcs(true) },
  ];

  const columns: Column<Server>[] = [
    { key: 'name', header: 'File server name or IP', sortable: true, filterable: true, minWidth: 190 },
    { key: 'type', header: 'Server type', sortable: true, filterable: true, minWidth: 170 },
    { key: 'domain', header: 'Domain or workgroup', sortable: true, filterable: true, minWidth: 170 },
    { key: 'agent', header: 'Agent status', sortable: true, filterable: true, width: 150, render: (s) => <ToneTag tone={toneFor(s.agent)}>{s.agent}</ToneTag> },
    { key: 'auditing', header: 'Auditing status', sortable: true, filterable: true, width: 150, render: (s) => <ToneTag tone={toneFor(s.auditing)}>{s.auditing}</ToneTag> },
    { key: 'updated', header: 'Last update', sortable: true, width: 180, render: (s) => fmtDateTime(s.updated), title: (s) => fmtDateTime(s.updated) },
  ];

  return (
    <div className="settings">
      <Card title="Actions">
        <div className="action-list" role="group" aria-label="Actions on the selected file servers">
          {actions.map((a) => (
            <button key={a.label} type="button" className="action-list__item" disabled={a.disabled} onClick={a.run}><Icon name={a.icon} />{a.label}</button>
          ))}
        </div>
        <div>
          <span className="lf-muted">{none ? 'Select file servers in the list to act on them.' : `${plural(chosen.length, 'file server', 'file servers')} selected`}</span>
        </div>
      </Card>

      <DataTable
        noun={['file server', 'file servers']}
        rows={servers}
        rowKey={(s) => s.id}
        columns={columns}
        loading={loading}
        selectable="multi"
        selected={selected}
        onSelectedChange={setSelected}
        activeKey={openId}
        onRowOpen={(s) => setOpenId(s.id)}
        rowActions={(s) => (
          <Menu
            label={`Actions for ${s.name}`}
            trigger={(p) => <IconButton {...p} icon="more" label="More actions" />}
            items={[
              { label: 'Install agent', icon: 'download', disabled: s.agent !== 'Not installed', reason: 'The agent is already installed', onSelect: () => installAgent([s]) },
              { label: 'Start auditing', icon: 'play', disabled: s.agent !== 'Installed' || s.auditing === 'Running', reason: s.agent !== 'Installed' ? 'Install the agent first' : 'Auditing is running', onSelect: () => startAuditing([s]) },
              { label: 'Stop auditing', icon: 'pause', disabled: s.auditing !== 'Running', reason: 'Auditing isn’t running', onSelect: () => setPending({ kind: 'stop', items: [s] }) },
              { label: 'Modify file server', icon: 'edit', onSelect: () => onModify(s) },
              { separator: true },
              { label: 'Uninstall agent', icon: 'x', danger: true, disabled: s.agent === 'Not installed', reason: 'No agent installed', onSelect: () => setPending({ kind: 'uninstall', items: [s] }) },
              { label: 'Remove file server', icon: 'trash', danger: true, onSelect: () => setPending({ kind: 'remove', items: [s] }) },
            ]}
          />
        )}
        empty={<EmptyState icon="server" title="No file servers yet" message="Add a file server to start auditing its shares."
          action={<Button icon="plus" onClick={onAdd}>Add file server</Button>} />}
        noResults="No file servers match these filters."
      />

      <Drawer
        open={!!open}
        onClose={() => setOpenId(null)}
        title={open?.name ?? 'File server'}
        subtitle={open ? `${open.type} · ${open.domain}` : undefined}
        footer={open && <>
          <Button variant="danger" icon="trash" onClick={() => setPending({ kind: 'remove', items: [open] })}>Remove file server</Button>
          <Button variant="primary" icon="edit" onClick={() => onModify(open)}>Modify file server</Button>
        </>}
      >
        {open && (
          <KeyValues items={[
            { label: 'Agent status', value: <ToneTag tone={toneFor(open.agent)}>{open.agent}</ToneTag> },
            { label: 'Auditing status', value: <ToneTag tone={toneFor(open.auditing)}>{open.auditing}</ToneTag> },
            { label: 'Server type', value: open.type },
            { label: 'Domain or workgroup', value: open.domain },
            { label: 'Account', value: open.user, wide: true },
            { label: 'Last update', value: fmtDateTime(open.updated), wide: true },
          ]} />
        )}
      </Drawer>

      <Modal open={showDcs} onClose={() => setShowDcs(false)} icon="building" title="Domain controllers"
        subtitle="The domain controllers Lepide uses to resolve users for these file servers."
        footer={<Button onClick={() => setShowDcs(false)}>Close</Button>}>
        <DataTable flat pager={false} rows={DOMAIN_CONTROLLERS} rowKey={(r) => r.id} noun={['domain controller', 'domain controllers']}
          columns={[
            { key: 'name', header: 'Domain controller', minWidth: 220 },
            { key: 'domain', header: 'Domain', minWidth: 150 },
            { key: 'site', header: 'Site', minWidth: 150 },
          ]} />
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={pendingText?.title}
        message={pendingText?.message}
        confirmLabel={pendingText?.confirmLabel ?? 'Confirm'}
        onConfirm={confirm}
      />
    </div>
  );
}

/* ───────────────────────── Audit rules and policies tab ───────────────────────── */

type RuleDraft = { name: string; servers: string[]; policy: string; users: string; enable: boolean };
type RuleErrors = Partial<Record<'name' | 'servers' | 'policy', string>>;

function RuleDialog({ open, editing, rules, servers, policies, groups, onClose, onSave }: {
  open: boolean; editing: Rule | null; rules: Rule[]; servers: Server[]; policies: Policy[]; groups: Group[];
  onClose: () => void; onSave: (d: RuleDraft) => void;
}) {
  const blank = (): RuleDraft => editing
    ? { name: editing.name, servers: editing.servers, policy: editing.policy, users: editing.users, enable: editing.status === 'Enabled' }
    : { name: '', servers: [], policy: '', users: 'All users', enable: true };
  const [d, setD] = useState<RuleDraft>(blank);
  const [key, setKey] = useState('');
  const [errors, setErrors] = useState<RuleErrors>({});
  const openKey = open ? editing?.id ?? 'new' : '';
  if (openKey !== key) { setKey(openKey); if (open) { setD(blank()); setErrors({}); } }

  const set = <K extends keyof RuleDraft>(k: K, v: RuleDraft[K]) => {
    setD((cur) => ({ ...cur, [k]: v }));
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const submit = () => {
    const e: RuleErrors = {};
    const name = d.name.trim();
    if (!name) e.name = 'Enter a rule name';
    else if (rules.some((r) => r.name.toLowerCase() === name.toLowerCase() && r.id !== editing?.id)) e.name = `A rule called "${name}" already exists`;
    if (!d.servers.length) e.servers = 'Select at least one file server';
    if (!d.policy) e.policy = 'Select the policy this rule applies';
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(); return; }
    onSave({ ...d, name });
  };
  const serverOptions = [...new Set([...servers.map((s) => s.name), ...d.servers])];

  return (
    <Modal open={open} onClose={onClose} icon="shield" title={editing ? 'Edit rule' : 'Add rule'}
      subtitle="A rule applies an audit policy to users on the file servers you pick."
      onSubmit={submit}
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" icon="check">{editing ? 'Save changes' : 'Add rule'}</Button>
      </>}>
      <TextField label="Rule name" autoComplete="off" value={d.name} error={errors.name} onChange={(v) => set('name', v)} maxLength={120} />
      <MultiSelect label="File servers" selectAll value={d.servers} options={serverOptions} error={errors.servers} onChange={(v) => set('servers', v)} />
      <div className="fld-row">
        <SelectField label="Policy" placeholder="Select" value={d.policy} options={policies.map((p) => p.name)} error={errors.policy} onChange={(v) => set('policy', v)} />
        <SelectField label="Rule users" value={d.users} options={['All users', ...groups.map((g) => g.name)]} onChange={(v) => set('users', v)} />
      </div>
      {!editing && <Checkbox checked={d.enable} onChange={(v) => set('enable', v)} label="Enable the rule now" />}
    </Modal>
  );
}

function PolicyDialog({ open, policies, onClose, onSave }: {
  open: boolean; policies: Policy[]; onClose: () => void; onSave: (p: { name: string; description: string }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | undefined>();
  const close = () => { setName(''); setDescription(''); setError(undefined); onClose(); };
  const submit = () => {
    const n = name.trim();
    const e = !n ? 'Enter a policy name' : policies.some((p) => p.name.toLowerCase() === n.toLowerCase()) ? `A policy called "${n}" already exists` : undefined;
    setError(e);
    if (e) { focusFirstError(); return; }
    onSave({ name: n, description: description.trim() });
    setName(''); setDescription('');
  };
  return (
    <Modal open={open} onClose={close} size="sm" icon="shield" title="Add policy" subtitle="Rules use a policy to decide which operations are audited."
      onSubmit={submit}
      footer={<>
        <Button onClick={close}>Cancel</Button>
        <Button variant="primary" type="submit" icon="check">Add policy</Button>
      </>}>
      <TextField label="Policy name" autoComplete="off" value={name} error={error} onChange={(v) => { setName(v); setError(undefined); }} maxLength={120} />
      <TextField label="Description" note="Optional" autoComplete="off" value={description} onChange={setDescription} maxLength={240} />
    </Modal>
  );
}

function RulesTab({ servers, groups }: { servers: Server[]; groups: Group[] }) {
  const toast = useToast();
  const [sub, setSub] = useState<'rules' | 'policies'>('rules');
  const [rules, setRules] = useState(RULES);
  const [policies, setPolicies] = useState(POLICIES);
  const [dialog, setDialog] = useState<'rule' | 'policy' | null>(null);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [pending, setPending] = useState<{ kind: 'rule'; item: Rule } | { kind: 'policy'; item: Policy } | null>(null);

  const usedBy = (p: Policy) => rules.filter((r) => r.policy === p.name).length;
  const setStatus = (r: Rule, status: RuleStatus) => {
    setRules((list) => list.map((x) => (x.id === r.id ? { ...x, status } : x)));
    toast({ variant: 'success', title: status === 'Enabled' ? 'Rule enabled' : 'Rule disabled', message: `${r.name} is ${status.toLowerCase()}.` });
  };
  const saveRule = (d: RuleDraft) => {
    if (editing) {
      setRules((list) => list.map((x) => (x.id === editing.id ? { ...x, name: d.name, servers: d.servers, policy: d.policy, users: d.users } : x)));
      toast({ variant: 'success', title: 'Rule saved', message: `${d.name} was updated.` });
    } else {
      setRules((list) => [...list, { id: `r-${Date.now()}`, name: d.name, servers: d.servers, policy: d.policy, users: d.users, status: d.enable ? 'Enabled' : 'Disabled' }]);
      toast({ variant: 'success', title: 'Rule added', message: `${d.name} applies ${d.policy} on ${plural(d.servers.length, 'file server', 'file servers')}.` });
    }
    setDialog(null); setEditing(null);
  };
  const confirm = () => {
    if (!pending) return;
    if (pending.kind === 'rule') {
      setRules((list) => list.filter((x) => x.id !== pending.item.id));
      toast({ variant: 'success', title: 'Rule deleted', message: `${pending.item.name} no longer applies.` });
    } else {
      setPolicies((list) => list.filter((x) => x.id !== pending.item.id));
      toast({ variant: 'success', title: 'Policy deleted', message: `${pending.item.name} was deleted.` });
    }
    setPending(null);
  };

  const ruleColumns: Column<Rule>[] = [
    { key: 'name', header: 'Rule name', sortable: true, filterable: true, minWidth: 170 },
    { key: 'summary', header: 'Rule summary', sortable: true, filterable: true, minWidth: 220, value: (r) => r.servers.join(', ') },
    { key: 'policy', header: 'Policy name', sortable: true, filterable: true, minWidth: 150 },
    { key: 'status', header: 'Rule status', sortable: true, filterable: true, width: 140, render: (r) => <ToneTag tone={toneFor(r.status)}>{r.status}</ToneTag> },
    { key: 'users', header: 'Rule users', sortable: true, filterable: true, minWidth: 140 },
  ];
  const policyColumns: Column<Policy>[] = [
    { key: 'name', header: 'Policy name', sortable: true, filterable: true, minWidth: 170 },
    { key: 'description', header: 'Description', sortable: true, filterable: true, minWidth: 260 },
    { key: 'rules', header: 'Rules using it', sortable: true, align: 'right', width: 140, value: (p) => usedBy(p) },
  ];

  return (
    <>
      <div className="row row--between row--wrap">
        <Segmented hug ariaLabel="Audit rules and policies" value={sub} onChange={(v) => setSub(v as 'rules' | 'policies')}
          items={[{ value: 'rules', label: 'Rules', count: rules.length }, { value: 'policies', label: 'Policies', count: policies.length }]} />
        <Button variant="primary" icon="plus" onClick={() => { setEditing(null); setDialog(sub === 'rules' ? 'rule' : 'policy'); }}>
          {sub === 'rules' ? 'Add rule' : 'Add policy'}
        </Button>
      </div>

      {sub === 'rules' ? (
        <DataTable
          noun={['rule', 'rules']}
          rows={rules}
          rowKey={(r) => r.id}
          columns={ruleColumns}
          rowActions={(r) => (
            <Menu
              label={`Actions for ${r.name}`}
              trigger={(p) => <IconButton {...p} icon="more" label="More actions" />}
              items={[
                { label: 'Edit rule', icon: 'edit', onSelect: () => { setEditing(r); setDialog('rule'); } },
                r.status === 'Enabled'
                  ? { label: 'Disable rule', icon: 'pause', onSelect: () => setStatus(r, 'Disabled') }
                  : { label: 'Enable rule', icon: 'play', onSelect: () => setStatus(r, 'Enabled') },
                { separator: true },
                { label: 'Delete rule', icon: 'trash', danger: true, onSelect: () => setPending({ kind: 'rule', item: r }) },
              ]}
            />
          )}
          empty={<EmptyState icon="shield" title="No rules yet" message="Add a rule to apply an audit policy to your file servers."
            action={<Button icon="plus" onClick={() => setDialog('rule')}>Add rule</Button>} />}
          noResults="No rules match these filters."
        />
      ) : (
        <DataTable
          noun={['policy', 'policies']}
          rows={policies}
          rowKey={(p) => p.id}
          columns={policyColumns}
          rowActions={(p) => (
            <Menu
              label={`Actions for ${p.name}`}
              trigger={(t) => <IconButton {...t} icon="more" label="More actions" />}
              items={[{ label: 'Delete policy', icon: 'trash', danger: true, disabled: usedBy(p) > 0,
                reason: `Used by ${plural(usedBy(p), 'rule', 'rules')}`, onSelect: () => setPending({ kind: 'policy', item: p }) }]}
            />
          )}
          empty={<EmptyState icon="shield" title="No policies yet" message="Add a policy so rules know which operations to audit."
            action={<Button icon="plus" onClick={() => setDialog('policy')}>Add policy</Button>} />}
          noResults="No policies match these filters."
        />
      )}

      <RuleDialog open={dialog === 'rule'} editing={editing} rules={rules} servers={servers} policies={policies} groups={groups}
        onClose={() => { setDialog(null); setEditing(null); }} onSave={saveRule} />
      <PolicyDialog open={dialog === 'policy'} policies={policies} onClose={() => setDialog(null)}
        onSave={(p) => {
          setPolicies((list) => [...list, { id: `p-${Date.now()}`, ...p }]);
          setDialog(null);
          toast({ variant: 'success', title: 'Policy added', message: `${p.name} can now be used in rules.` });
        }} />
      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending?.kind === 'policy' ? 'Delete this policy?' : 'Delete this rule?'}
        message={pending ? `${pending.item.name} is deleted. This can’t be undone.` : undefined}
        confirmLabel={pending?.kind === 'policy' ? 'Delete policy' : 'Delete rule'}
        onConfirm={confirm}
      />
    </>
  );
}

/* ───────────────────────── User group tab ───────────────────────── */

type GroupDraft = { name: string; description: string; policy: string; users: GUser[] };
type GroupErrors = Partial<Record<'name' | 'users' | 'user', string>>;

function GroupDialog({ open, editing, groups, onClose, onSave }: {
  open: boolean; editing: Group | null; groups: Group[]; onClose: () => void; onSave: (d: GroupDraft) => void;
}) {
  const blank = (): GroupDraft => editing
    ? { name: editing.name, description: editing.description, policy: editing.policy, users: editing.users }
    : { name: '', description: '', policy: USER_POLICIES[0], users: [] };
  const [d, setD] = useState<GroupDraft>(blank);
  const [key, setKey] = useState('');
  const [userName, setUserName] = useState('');
  const [userType, setUserType] = useState<UserType>('Domain user');
  const [errors, setErrors] = useState<GroupErrors>({});
  const openKey = open ? editing?.id ?? 'new' : '';
  if (openKey !== key) { setKey(openKey); if (open) { setD(blank()); setErrors({}); setUserName(''); } }

  const addUser = () => {
    const n = userName.trim();
    let e: string | undefined;
    if (!n) e = 'Enter a user name';
    else if (!DOMAIN_USER.test(n)) e = userType === 'Domain user' ? 'Use the Domain name\\User name format' : 'Use the File server name\\User name format';
    else if (d.users.some((x) => x.name.toLowerCase() === n.toLowerCase())) e = `${n} is already in this group`;
    if (e) { setErrors((cur) => ({ ...cur, user: e })); focusFirstError(); return; }
    setD((cur) => ({ ...cur, users: [...cur.users, { id: `u-${Date.now()}`, name: n, domain: n.split('\\')[0], type: userType, policy: cur.policy, description: '' }] }));
    setErrors((cur) => ({ ...cur, user: undefined, users: undefined }));
    setUserName('');
  };
  const submit = () => {
    const e: GroupErrors = {};
    const name = d.name.trim();
    if (!name) e.name = 'Enter a group name';
    else if (groups.some((g) => g.name.toLowerCase() === name.toLowerCase() && g.id !== editing?.id)) e.name = `A group called "${name}" already exists`;
    if (!d.users.length) e.users = 'Add at least one user to the group';
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(); return; }
    onSave({ ...d, name, description: d.description.trim() });
  };

  return (
    <Modal open={open} onClose={onClose} icon="users" title={editing ? 'Edit user group' : 'Add user group'}
      subtitle="Enter a group name and add users to the group."
      onSubmit={submit}
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" icon="check">{editing ? 'Save changes' : 'Add user group'}</Button>
      </>}>
      <div className="grid3">
        <TextField label="Group name" autoComplete="off" value={d.name} error={errors.name}
          onChange={(v) => { setD((cur) => ({ ...cur, name: v })); setErrors((cur) => ({ ...cur, name: undefined })); }} maxLength={120} />
        <TextField label="Description" note="Optional" autoComplete="off" value={d.description}
          onChange={(v) => setD((cur) => ({ ...cur, description: v }))} maxLength={240} />
        <SelectField label="Apply policy" value={d.policy} options={USER_POLICIES} onChange={(v) => setD((cur) => ({ ...cur, policy: v }))} />
      </div>
      <h3 className="section-label">Select users to add to the user group</h3>
      <div className="fld-row">
        <SelectField label="User type" value={userType} options={['Domain user', 'Local user']} onChange={(v) => setUserType(v as UserType)} />
        <div className="fld-inline">
          <TextField label="User name" autoComplete="off" placeholder={userType === 'Domain user' ? 'chilly\\ann.lee' : '192.168.30.150\\backup'}
            value={userName} error={errors.user} onChange={(v) => { setUserName(v); setErrors((cur) => ({ ...cur, user: undefined })); }} />
          <Button icon="plus" onClick={addUser}>Add user</Button>
        </div>
      </div>
      <Field label="Users in this group" error={errors.users}>
        <DataTable
          flat
          pager={false}
          rows={d.users}
          rowKey={(x) => x.id}
          noun={['user', 'users']}
          columns={[
            { key: 'name', header: 'User name', minWidth: 180 },
            { key: 'domain', header: 'Domain or file server', minWidth: 160 },
            { key: 'type', header: 'User type', minWidth: 120 },
          ]}
          rowActions={(x) => <IconButton icon="x" label="Remove" onClick={() => setD((cur) => ({ ...cur, users: cur.users.filter((y) => y.id !== x.id) }))} />}
          empty={<EmptyState compact icon="users" title="No users yet" message="Add the users this group audits." />}
        />
      </Field>
    </Modal>
  );
}

type URow = { kind: 'group'; id: string; group: Group } | { kind: 'user'; id: string; group: Group; user: GUser };

function UsersTab({ groups, setGroups, dialogOpen, setDialogOpen }: {
  groups: Group[]; setGroups: (f: (g: Group[]) => Group[]) => void; dialogOpen: boolean; setDialogOpen: (v: boolean) => void;
}) {
  const toast = useToast();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [editing, setEditing] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState<Group | null>(null);

  const rows: URow[] = groups.flatMap((g) => [
    { kind: 'group' as const, id: g.id, group: g },
    ...(collapsed.includes(g.id) ? [] : g.users.map((x) => ({ kind: 'user' as const, id: `${g.id}-${x.id}`, group: g, user: x }))),
  ]);
  const toggle = (id: string) => setCollapsed((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const userCell = (pick: (x: GUser) => string) => (r: URow) => (r.kind === 'user' ? pick(r.user) || <span className="lf-na">—</span> : null);

  const columns: Column<URow>[] = [
    { key: 'name', header: 'User name', minWidth: 300, value: (r) => (r.kind === 'group' ? r.group.name : r.user.name),
      render: (r) => r.kind === 'group' ? (
        <span className="row">
          <IconButton icon={collapsed.includes(r.id) ? 'chevron-right' : 'chevron'} size={14}
            label={`${collapsed.includes(r.id) ? 'Expand' : 'Collapse'} ${r.group.name}`} aria-expanded={!collapsed.includes(r.id)}
            onClick={() => toggle(r.id)} />
          <span>{r.group.name}</span>
          <span className="lf-muted">(Users: {r.group.users.length}, policy: {r.group.policy.toLowerCase()})</span>
        </span>
      ) : <span style={{ paddingInlineStart: 'var(--s10)' }}>{r.user.name}</span> },
    { key: 'domain', header: 'Domain or file server', minWidth: 150, render: userCell((x) => x.domain) },
    { key: 'type', header: 'User type', minWidth: 120, render: userCell((x) => x.type) },
    { key: 'policy', header: 'User policy', minWidth: 170, render: userCell((x) => x.policy) },
    { key: 'description', header: 'Description', minWidth: 130, render: userCell((x) => x.description) },
  ];

  const save = (d: GroupDraft) => {
    if (editing) {
      setGroups((list) => list.map((g) => (g.id === editing.id ? { ...g, ...d } : g)));
      toast({ variant: 'success', title: 'User group saved', message: `${d.name} has ${plural(d.users.length, 'user', 'users')}.` });
    } else {
      setGroups((list) => [...list, { id: `g-${Date.now()}`, ...d }]);
      toast({ variant: 'success', title: 'User group added', message: `${d.name} audits ${plural(d.users.length, 'user', 'users')} with ${d.policy.toLowerCase()}.` });
    }
    setEditing(null);
    setDialogOpen(false);
  };

  return (
    <>
      <DataTable
        noun={['row', 'rows']}
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        pager={false}
        rowActions={(r) => r.kind === 'group' ? <>
          <IconButton icon="edit" label={`Edit ${r.group.name}`} onClick={() => { setEditing(r.group); setDialogOpen(true); }} />
          <IconButton icon="trash" label="Remove" onClick={() => setDeleting(r.group)} />
        </> : <IconButton icon="edit" label={`Edit ${r.group.name}`} onClick={() => { setEditing(r.group); setDialogOpen(true); }} />}
        empty={<EmptyState icon="users" title="No user groups yet" message="Add a user group to apply an audit policy to a set of users."
          action={<Button icon="plus" onClick={() => setDialogOpen(true)}>Add user group</Button>} />}
      />
      <GroupDialog open={dialogOpen} editing={editing} groups={groups} onClose={() => { setEditing(null); setDialogOpen(false); }} onSave={save} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this user group?"
        message={deleting ? `${deleting.name} and its ${plural(deleting.users.length, 'user', 'users')} are removed from auditing rules.` : undefined}
        confirmLabel="Delete user group"
        onConfirm={() => {
          if (!deleting) return;
          setGroups((list) => list.filter((g) => g.id !== deleting.id));
          toast({ variant: 'success', title: 'User group deleted', message: `${deleting.name} was deleted.` });
          setDeleting(null);
        }}
      />
    </>
  );
}

/* ───────────────────────── General settings tab ───────────────────────── */

function GeneralTab() {
  const toast = useToast();
  const [notify, setNotify] = useState(false);
  const [section, setSection] = useState('port');
  const items: Section[] = [
    { value: 'port', label: 'Port settings', icon: 'plug' },
    { value: 'rights', label: 'Service rights', icon: 'key' },
    { value: 'notifications', label: 'Audit notifications', icon: 'bell', badge: notify ? 'On' : 'Off' },
    { value: 'backup', label: 'Backup and restore', icon: 'archive' },
  ];

  // Port settings
  const [savedPort, setSavedPort] = useState('3000');
  const [port, setPort] = useState('3000');
  const [portError, setPortError] = useState<string | undefined>();
  const savePort = () => {
    const n = Number(port);
    const e = !port.trim() ? 'Enter a port number' : !Number.isInteger(n) || n < 1 || n > 65535 ? 'Use a port between 1 and 65535' : undefined;
    setPortError(e);
    if (e) { focusFirstError(); return; }
    setSavedPort(port.trim());
    toast({ variant: 'success', title: 'Port settings saved', message: `Agents talk to the Lepide server on port ${port.trim()}.` });
  };

  // Service rights
  const SAVED_ACCOUNT = 'chilly\\svc-lepide';
  const [savedUser, setSavedUser] = useState(SAVED_ACCOUNT);
  const [user, setUser] = useState(SAVED_ACCOUNT);
  const [password, setPassword] = useState('');
  const [rightsErrors, setRightsErrors] = useState<{ user?: string; password?: string }>({});
  const rightsDirty = user !== savedUser || !!password;
  const saveRights = () => {
    const e: { user?: string; password?: string } = {};
    if (!user.trim()) e.user = 'Enter a user name';
    else if (!DOMAIN_USER.test(user.trim())) e.user = 'Use the Domain name\\User name format';
    if (user.trim() !== savedUser && !password) e.password = 'Enter the password for this account';
    setRightsErrors(e);
    if (Object.keys(e).length) { focusFirstError(); return; }
    setSavedUser(user.trim()); setPassword('');
    toast({ variant: 'success', title: 'Service rights saved', message: `The Lepide service runs as ${user.trim()}.` });
  };

  // Backup and restore
  const [lastBackup, setLastBackup] = useState('2026-11-01 02:00');
  const [backingUp, setBackingUp] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  return (
    <div className="settings">
      <SectionNav title="Actions" ariaLabel="General settings sections" selectLabel="General settings section"
        value={section} onChange={setSection} items={items} />

      <section className="settings__body" aria-label={items.find((i) => i.value === section)?.label}>
        {section === 'port' && (
          <SetCard title="Port settings" form
            footer={<>
              <Button disabled={port === savedPort} onClick={() => { setPort(savedPort); setPortError(undefined); }}>Cancel</Button>
              <Button variant="primary" disabled={port === savedPort} onClick={savePort}>Save changes</Button>
            </>}>
            <TextField label="Port number" inputMode="numeric" value={port} error={portError}
              onChange={(v) => { setPort(v); setPortError(undefined); }} help="The port agents use to send events to the Lepide server." />
          </SetCard>
        )}

        {section === 'rights' && (
          <SetCard title="Service rights" description="The account the Lepide service uses on your file servers." form
            footer={<>
              <Button disabled={!rightsDirty} onClick={() => { setUser(savedUser); setPassword(''); setRightsErrors({}); }}>Cancel</Button>
              <Button variant="primary" disabled={!rightsDirty} onClick={saveRights}>Save changes</Button>
            </>}>
            <div className="fld-row">
              <TextField label="User name" autoComplete="off" value={user} error={rightsErrors.user} help="Use the Domain name\User name format."
                onChange={(v) => { setUser(v); setRightsErrors((e) => ({ ...e, user: undefined })); }} />
              <PasswordField label="Password" autoComplete="new-password" value={password} error={rightsErrors.password}
                onChange={(v) => { setPassword(v); setRightsErrors((e) => ({ ...e, password: undefined })); }} />
            </div>
          </SetCard>
        )}

        {section === 'notifications' && (
          <SetCard title="Audit notifications" description="Emails about the auditing of your file servers.">
            <SettingRow title="Send audit notifications" help="Email administrators when an agent stops or auditing fails on a file server.">
              <Toggle label="Send audit notifications" checked={notify} onChange={(v) => {
                setNotify(v);
                toast({ variant: 'success', message: `Audit notifications turned ${v ? 'on' : 'off'}` });
              }} />
            </SettingRow>
          </SetCard>
        )}

        {section === 'backup' && (
          <SetCard title="Backup and restore" description={`Last backup ${fmtDateTime(lastBackup)}.`}>
            <SettingRow title="Back up file server settings" help="Saves the file servers, rules, policies and user groups.">
              <Button icon="archive" loading={backingUp} onClick={() => {
                setBackingUp(true);
                window.setTimeout(() => {
                  setBackingUp(false);
                  const stamp = nowStamp();
                  setLastBackup(stamp);
                  toast({ variant: 'success', title: 'Backup created', message: `File server settings backed up on ${fmtDateTime(stamp)}.` });
                }, 1000);
              }}>Back up now</Button>
            </SettingRow>
            <SettingRow title="Restore from the last backup" help="Replaces the current file server settings with the last backup.">
              <Button variant="danger" icon="restore" onClick={() => setConfirmRestore(true)}>Restore</Button>
            </SettingRow>
          </SetCard>
        )}
      </section>

      <ConfirmDialog
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        title="Restore file server settings?"
        message={`Settings changed since ${fmtDateTime(lastBackup)} are lost.`}
        confirmLabel="Restore settings"
        onConfirm={() => new Promise<void>((done) => window.setTimeout(() => {
          setConfirmRestore(false);
          toast({ variant: 'success', title: 'Settings restored', message: `File server settings restored from ${fmtDateTime(lastBackup)}.` });
          done();
        }, 900))}
      />
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

type Tab = 'servers' | 'rules' | 'users' | 'general';
const TABS: { value: Tab; label: string; heading: string; description?: string }[] = [
  { value: 'servers', label: 'File servers list', heading: 'All file servers',
    description: 'Overview of file server configuration. Add and modify file servers here, and use the Actions pane for other settings.' },
  { value: 'rules', label: 'Audit rules and policies', heading: 'Audit rules and policies' },
  { value: 'users', label: 'User group', heading: 'Users configuration',
    description: 'An overview of all users. Add, modify and remove users, and the audit policies applied to users and groups.' },
  { value: 'general', label: 'General settings', heading: 'General settings' },
];

export default function FileServer() {
  const toast = useToast();
  const [category, setCategory] = useState('add-data-source');
  const [view, setView] = useState<'sources' | 'file-server'>('sources');
  const [tab, setTab] = useState<Tab>('servers');

  const [servers, setServers] = useState(SERVERS);
  const [groups, setGroups] = useState(GROUPS);
  const [refreshing, setRefreshing] = useState(false);
  const [serverDialog, setServerDialog] = useState<{ type: ServerType; editing: Server | null } | null>(null);
  const [groupDialog, setGroupDialog] = useState(false);

  const current = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
  const t = TABS.find((x) => x.value === tab) ?? TABS[0];
  const onFileServer = category === 'add-data-source' && view === 'file-server';

  const pickCategory = (v: string) => { setCategory(v); setView('sources'); };
  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      toast({ variant: 'success', title: 'File servers refreshed', message: `Status of ${plural(servers.length, 'file server', 'file servers')} is up to date.` });
    }, 900);
  };
  const saveServer = (d: ServerDraft) => {
    const editing = serverDialog?.editing;
    if (editing) {
      setServers((list) => list.map((s) => (s.id === editing.id ? { ...s, type: d.type as ServerType, domain: d.domain, user: d.user, updated: nowStamp() } : s)));
      toast({ variant: 'success', title: 'File server saved', message: `${editing.name} was updated.` });
    } else {
      const s: Server = { id: `s-${Date.now()}`, name: d.name, type: d.type as ServerType, domain: d.domain, user: d.user,
        agent: d.start ? 'Installing' : 'Not installed', auditing: 'Not started', updated: nowStamp() };
      setServers((list) => [...list, s]);
      if (d.start) {
        const h = toast({ loading: true, title: 'File server added', message: `Installing the agent on ${s.name}…` });
        window.setTimeout(() => {
          setServers((list) => list.map((x) => (x.id === s.id ? { ...x, agent: 'Installed', auditing: 'Running', updated: nowStamp() } : x)));
          h.update({ loading: false, variant: 'success', title: 'Auditing started', message: `${s.name} is being audited.` });
        }, 1600);
      } else {
        toast({ variant: 'success', title: 'File server added', message: `${s.name} was added. Install the agent to start auditing.` });
      }
    }
    setServerDialog(null);
  };

  const back = <Button variant="ghost" icon="chevron-left" onClick={() => setView('sources')}>All data sources</Button>;
  const actions = !onFileServer ? undefined
    : tab === 'servers' ? <>
      {back}
      <Button icon="refresh" loading={refreshing} onClick={refresh}>Refresh</Button>
      <Menu
        label="File server types"
        trigger={(p) => <Button {...p} variant="primary" icon="plus" iconEnd="chevron">Add file server</Button>}
        items={SERVER_TYPES.map((type) => ({ label: `${type} file server`, icon: 'server' as const, onSelect: () => setServerDialog({ type, editing: null }) }))}
      />
    </>
      : tab === 'users' ? <>
        {back}
        <Button variant="primary" icon="plus" onClick={() => setGroupDialog(true)}>Add user group</Button>
      </>
        : back;

  return (
    <div className="sub">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Settings', to: '/settings' },
          ...(onFileServer ? [{ label: 'Add data source' }, { label: t.heading }] : [{ label: current.label }])]}
        title={current.label}
        actions={actions}
      />

      <div className="settings">
        <SectionNav title="Categories" ariaLabel="Settings categories" selectLabel="Settings category"
          value={category} onChange={pickCategory} items={CATEGORIES} />

        <section className="settings__body" aria-label={onFileServer ? 'File server' : current.label}>
          {category !== 'add-data-source' ? (
            <Card>
              <EmptyState icon={current.icon} title={current.label}
                message="This example fills in only the Add data source category."
                action={<Button onClick={() => pickCategory('add-data-source')}>Open Add data source</Button>} />
            </Card>
          ) : view === 'sources' ? (
            <SourcePicker serverCount={servers.length} onOpenFileServer={() => { setView('file-server'); setTab('servers'); }} />
          ) : (
            <>
              <Segmented ariaLabel="File server settings" value={tab} onChange={(v) => setTab(v as Tab)}
                items={TABS.map((x) => ({ value: x.value, label: x.label }))} />
              <div>
                <h3 className="section-title">{t.heading}</h3>
                {t.description && <p className="lf-muted">{t.description}</p>}
              </div>
              {tab === 'servers' && (
                <FileServersTab servers={servers} setServers={setServers} loading={refreshing}
                  onAdd={() => setServerDialog({ type: 'Windows', editing: null })}
                  onModify={(s) => setServerDialog({ type: s.type, editing: s })} />
              )}
              {tab === 'rules' && <RulesTab servers={servers} groups={groups} />}
              {tab === 'users' && <UsersTab groups={groups} setGroups={setGroups} dialogOpen={groupDialog} setDialogOpen={setGroupDialog} />}
              {tab === 'general' && <GeneralTab />}
            </>
          )}
        </section>
      </div>

      <ServerDialog open={!!serverDialog} editing={serverDialog?.editing ?? null} type={serverDialog?.type ?? 'Windows'}
        servers={servers} onClose={() => setServerDialog(null)} onSave={saveServer} />
    </div>
  );
}
