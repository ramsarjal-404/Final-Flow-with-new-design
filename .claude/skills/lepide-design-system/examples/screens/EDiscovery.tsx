import { useState } from 'react';
import {
  Banner, Button, ConfirmDialog, DataTable, Drawer, EmptyState, IconButton, KeyValues, Menu, Modal, MultiSelect,
  PageHeader, PasswordField, SearchField, Segmented, SelectField, TextField, ToneTag, useToast,
  focusFirstError, fmtDateTime, toneFor,
  type Column,
} from '@lepide/ds-react';

/* e-Discovery (Identify › e-Discovery), rebuilt from the prototype screens identify-e-discovery,
   identify-e-discovery-settings-agents and identify-e-discovery-settings-locations (and their dialogs).
   Pattern: tabbed page → cases table → create dialog with validation → toast; row → detail drawer → destructive confirm. */

type Tab = 'cases' | 'settings';
type SettingsTab = 'agents' | 'locations';

type AgentStatus = 'Success' | 'Update completed' | 'Firewall blocked' | 'Connection timed out' | 'User logged out'
  | 'Agent uninstalled' | 'Settings saved' | 'Permission denied' | 'Data synced';
type CaseStatus = 'Completed' | 'In progress' | 'Never started' | 'Failed';
type SearchType = 'Index' | 'Live';
type LocationStatus = 'Indexed' | 'Indexing' | 'Failed';

type Case = {
  id: string;
  name: string;
  description: string;
  component: string;
  agent: string;
  agentStatus: AgentStatus;
  status: CaseStatus;
  start: string; // 'YYYY-MM-DD HH:MM', sorts as text; '' = never ran
  end: string;
  type: SearchType;
  locations: string[]; // location ids
};
type Agent = { id: string; server: string; path: string; scanned: string };
type Location = { id: string; name: string; path: string; lastIndex: string; status: LocationStatus; agent: string; component: string };


const COMPONENTS = ['Windows file server', 'NetApp filer', 'Dell EMC Isilon'];
const SEARCH_TYPES: { value: SearchType; label: string }[] = [
  { value: 'Index', label: 'Index' },
  { value: 'Live', label: 'Live' },
];
const FILE_TYPES = ['Word documents', 'Excel workbooks', 'PowerPoint decks', 'PDF files', 'Text files', 'Email messages', 'Archives'];

const LOCATIONS: Location[] = [
  { id: 'l1', name: 'Profile 01', path: '\\\\192.168.30.206\\share206', lastIndex: '2026-11-03 13:05', status: 'Indexed', agent: '192.168.30.150', component: 'Windows file server' },
  { id: 'l2', name: 'Profile002', path: '\\\\192.168.30.150\\Large Data', lastIndex: '2026-11-02 09:40', status: 'Indexed', agent: '192.168.30.150', component: 'Windows file server' },
  { id: 'l3', name: 'User Data-01', path: '\\\\192.168.10.78\\data\\eDiscovery', lastIndex: '2026-11-01 18:12', status: 'Indexed', agent: 'localhost', component: 'Windows file server' },
];

const AGENTS: Agent[] = [
  { id: 'a1', server: '192.168.30.150', path: '\\\\192.168.30.150\\LepideAgent', scanned: 'Profile 01, Profile002' },
];

const DESC = 'Unprocessed data files.';
const CASES: Case[] = [
  { id: 'c01', name: '01_Raw_Datasets', description: DESC, component: 'Windows file server', agent: 'localhost', agentStatus: 'Success', status: 'Completed', start: '2026-11-03 10:02', end: '2026-11-03 10:19', type: 'Index', locations: ['l1'] },
  { id: 'c02', name: '02_Data_Ingestion', description: DESC, component: 'Windows file server', agent: 'localhost', agentStatus: 'Update completed', status: 'Completed', start: '2026-11-02 09:30', end: '2026-11-02 09:41', type: 'Index', locations: ['l1', 'l2'] },
  { id: 'c03', name: '03_Data_Cleaning', description: DESC, component: 'Windows file server', agent: 'localhost', agentStatus: 'Firewall blocked', status: 'Completed', start: '2026-11-01 16:12', end: '2026-11-01 16:30', type: 'Index', locations: ['l2'] },
  { id: 'c04', name: '04_Exploratory_Analysis', description: DESC, component: 'Windows file server', agent: 'localhost', agentStatus: 'Connection timed out', status: 'Completed', start: '2026-10-31 11:05', end: '2026-10-31 11:22', type: 'Live', locations: ['l3'] },
  { id: 'c05', name: '05_Feature_Engineering', description: DESC, component: 'Windows file server', agent: 'localhost', agentStatus: 'User logged out', status: 'Completed', start: '2026-10-30 14:48', end: '2026-10-30 15:02', type: 'Index', locations: ['l1'] },
  { id: 'c06', name: '06_Model_Training', description: DESC, component: 'Windows file server', agent: 'localhost', agentStatus: 'Agent uninstalled', status: 'Never started', start: '', end: '', type: 'Index', locations: ['l2'] },
  { id: 'c07', name: '07_Model_Evaluation', description: DESC, component: 'Windows file server', agent: 'localhost', agentStatus: 'Settings saved', status: 'Completed', start: '2026-10-28 08:15', end: '2026-10-28 08:31', type: 'Index', locations: ['l3'] },
  { id: 'c08', name: '08_Deployment', description: DESC, component: 'Windows file server', agent: 'localhost', agentStatus: 'Permission denied', status: 'Failed', start: '2026-10-27 17:40', end: '2026-10-27 17:41', type: 'Live', locations: ['l1', 'l3'] },
  { id: 'c09', name: '09_Monitoring', description: DESC, component: 'Windows file server', agent: 'localhost', agentStatus: 'Data synced', status: 'Completed', start: '2026-10-26 12:00', end: '2026-10-26 12:26', type: 'Index', locations: ['l2'] },
  { id: 'c10', name: '10_Legal_Hold_Finance', description: 'Finance mailboxes and shares under legal hold.', component: 'Windows file server', agent: '192.168.30.150', agentStatus: 'Success', status: 'In progress', start: '2026-11-04 08:55', end: '', type: 'Index', locations: ['l1', 'l2'] },
];

const when = (s: string) => (s ? fmtDateTime(s) : <span className="lf-na">—</span>);
const nowStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** Validation: after errors render, move focus to the first invalid field of the open dialog. */

const caseColumns: Column<Case>[] = [
  { key: 'name', header: 'Case name', sortable: true, filterable: true, minWidth: 220 },
  { key: 'description', header: 'Description', sortable: true, filterable: true, minWidth: 200 },
  { key: 'agent', header: 'Agent', sortable: true, filterable: true, width: 150 },
  { key: 'agentStatus', header: 'Agent status', sortable: true, filterable: true, width: 200,
    render: (c) => <ToneTag tone={toneFor(c.agentStatus)}>{c.agentStatus}</ToneTag> },
  { key: 'status', header: 'Status', sortable: true, filterable: true, width: 150,
    render: (c) => <ToneTag tone={toneFor(c.status)}>{c.status}</ToneTag> },
  { key: 'start', header: 'Last search start time', sortable: true, width: 200, render: (c) => when(c.start), title: (c) => (c.start ? fmtDateTime(c.start) : 'Never run') },
  { key: 'end', header: 'Last search end time', sortable: true, width: 200, render: (c) => when(c.end), title: (c) => (c.end ? fmtDateTime(c.end) : 'Not finished') },
  { key: 'type', header: 'Type', sortable: true, filterable: true, width: 110 },
];

const agentColumns: Column<Agent>[] = [
  { key: 'server', header: 'Agent server', sortable: true, filterable: true, minWidth: 200 },
  { key: 'path', header: 'Agent path', sortable: true, filterable: true, mono: true, minWidth: 260 },
  { key: 'scanned', header: 'Scanned cases and locations', sortable: true, filterable: true, minWidth: 240 },
];

const locationColumns: Column<Location>[] = [
  { key: 'name', header: 'Location name', sortable: true, filterable: true, minWidth: 180 },
  { key: 'path', header: 'Share path', sortable: true, filterable: true, mono: true, minWidth: 260 },
  { key: 'lastIndex', header: 'Last index', sortable: true, width: 190, render: (l) => when(l.lastIndex), title: (l) => (l.lastIndex ? fmtDateTime(l.lastIndex) : 'Not indexed yet') },
  { key: 'status', header: 'Status', sortable: true, filterable: true, width: 140, render: (l) => <ToneTag tone={toneFor(l.status)}>{l.status}</ToneTag> },
  { key: 'agent', header: 'Agent', sortable: true, filterable: true, width: 170 },
];

/* ───────────────────────── Create case ───────────────────────── */

type CaseDraft = { name: string; description: string; component: string; type: string; locations: string[] };
type CaseErrors = Partial<Record<keyof CaseDraft, string>>;
const EMPTY_CASE: CaseDraft = { name: '', description: '', component: COMPONENTS[0], type: 'Index', locations: [] };

function CreateCaseDialog({ open, onClose, cases, locations, onCreate }: {
  open: boolean; onClose: () => void; cases: Case[]; locations: Location[]; onCreate: (d: CaseDraft) => void;
}) {
  const [d, setD] = useState<CaseDraft>(EMPTY_CASE);
  const [errors, setErrors] = useState<CaseErrors>({});
  const set = <K extends keyof CaseDraft>(k: K, v: CaseDraft[K]) => {
    setD((cur) => ({ ...cur, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const close = () => { setD(EMPTY_CASE); setErrors({}); onClose(); };

  const available = locations.filter((l) => l.component === d.component && l.status === 'Indexed');
  const picked = locations.filter((l) => d.locations.includes(l.id));

  const submit = () => {
    const e: CaseErrors = {};
    const name = d.name.trim();
    if (!name) e.name = 'Enter a case name';
    else if (cases.some((c) => c.name.toLowerCase() === name.toLowerCase())) e.name = `A case called "${name}" already exists`;
    if (!d.locations.length) e.locations = 'Select at least one indexed location';
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(); return; }
    onCreate({ ...d, name, description: d.description.trim() });
    setD(EMPTY_CASE);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      icon="file-search"
      title="Create case"
      subtitle="A case searches the indexed locations you pick for matching files."
      onSubmit={submit}
      footer={<>
        <Button onClick={close}>Cancel</Button>
        <Button variant="primary" icon="check" type="submit">Create case</Button>
      </>}
    >
      <h3 className="section-label">New case and object selection</h3>
      <div className="fld-row">
        <TextField label="Case name" autoComplete="off" placeholder="e.g. Legal hold – Finance" value={d.name} error={errors.name}
          onChange={(v) => set('name', v)} maxLength={120} />
        <TextField label="Description" note="Optional" autoComplete="off" value={d.description} onChange={(v) => set('description', v)} maxLength={240} />
      </div>
      <div className="fld-row">
        <SelectField label="Component" value={d.component} options={COMPONENTS}
          onChange={(v) => setD((cur) => ({ ...cur, component: v, locations: [] }))} />
        <SelectField label="Search type" value={d.type} options={SEARCH_TYPES} onChange={(v) => set('type', v)}
          help={d.type === 'Index' ? 'Searches the index: fast, as fresh as the last index.' : 'Reads the files now: slower, always current.'} />
      </div>
      <MultiSelect label="Location" placeholder="Select" selectAll value={d.locations} error={errors.locations}
        onChange={(v) => set('locations', v)}
        options={available.map((l) => ({ value: l.id, label: l.name }))}
        help={available.length ? undefined : `No indexed locations for ${d.component} yet. Create one under Settings › Indexed locations.`} />
      <DataTable
        flat
        pager={false}
        rows={picked}
        rowKey={(l) => l.id}
        noun={['location', 'locations']}
        columns={[
          { key: 'name', header: 'Location names', minWidth: 160 },
          { key: 'path', header: 'Share path', mono: true, minWidth: 220 },
        ]}
        rowActions={(l) => <IconButton icon="x" label="Remove" onClick={() => set('locations', d.locations.filter((id) => id !== l.id))} />}
        empty={<EmptyState compact icon="folder" title="No locations selected" message="Select the indexed locations this case searches." />}
      />
    </Modal>
  );
}

/* ───────────────────────── Install agent ───────────────────────── */

type Target = { id: string; ip: string; path: string; user: string };
type TargetErrors = Partial<Record<'ip' | 'path' | 'user' | 'password', string>>;
const IP_OR_HOST = /^[A-Za-z0-9.-]+$/;

function InstallAgentDialog({ open, onClose, agents, onInstall }: {
  open: boolean; onClose: () => void; agents: Agent[]; onInstall: (t: Target[]) => void;
}) {
  const toast = useToast();
  const [targets, setTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [ip, setIp] = useState('');
  const [path, setPath] = useState('C:\\Program Files\\LepideAgent');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<TargetErrors>({});
  const clear = (k: keyof TargetErrors) => { if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); };
  const close = () => { setTargets([]); setSelected([]); setIp(''); setUser(''); setPassword(''); setErrors({}); onClose(); };

  const addServer = () => {
    const e: TargetErrors = {};
    const host = ip.trim();
    if (!host) e.ip = 'Enter the server’s IP address or name';
    else if (!IP_OR_HOST.test(host)) e.ip = 'Use an IP address or a host name, without spaces';
    else if (agents.some((a) => a.server === host) || targets.some((t) => t.ip === host)) e.ip = `${host} already has an agent or is in the list`;
    if (!path.trim()) e.path = 'Enter the folder to install the agent in';
    if (!user.trim()) e.user = 'Enter a user name';
    else if (!/^[^\\]+\\[^\\]+$/.test(user.trim())) e.user = 'Use the Domain name\\User name format';
    if (!password) e.password = 'Enter the password';
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(); return; }
    const t: Target = { id: `t-${Date.now()}`, ip: host, path: path.trim(), user: user.trim() };
    setTargets((list) => [...list, t]);
    setSelected((s) => [...s, t.id]);
    setIp(''); setUser(''); setPassword('');
  };

  const install = () => {
    const chosen = targets.filter((t) => selected.includes(t.id));
    if (!chosen.length) {
      toast({ variant: 'error', title: 'Install agent', message: targets.length ? 'Select the servers to install the agent on.' : 'Add a server to install the agent on.' });
      return;
    }
    onInstall(chosen);
    setTargets([]); setSelected([]); setErrors({});
  };

  return (
    <Modal
      open={open}
      onClose={close}
      icon="server"
      title="Install agent"
      subtitle="The agent indexes and searches the locations on each server you add."
      onSubmit={install}
      footer={<>
        <Button onClick={close}>Cancel</Button>
        <Button variant="primary" icon="download" type="submit">Install</Button>
      </>}
    >
      <div className="fld-row">
        <TextField label="Server" note="IP address or name" autoComplete="off" placeholder="192.168.30.151" value={ip} error={errors.ip}
          onChange={(v) => { setIp(v); clear('ip'); }} />
        <TextField label="Agent path" autoComplete="off" value={path} error={errors.path} onChange={(v) => { setPath(v); clear('path'); }} />
      </div>
      <div className="fld-row">
        <TextField label="User name" autoComplete="off" placeholder="CORP\administrator" value={user} error={errors.user}
          help="Use the Domain name\User name format." onChange={(v) => { setUser(v); clear('user'); }} />
        <PasswordField label="Password" autoComplete="new-password" value={password} error={errors.password}
          onChange={(v) => { setPassword(v); clear('password'); }} />
      </div>
      <div className="row row--end">
        <Button icon="plus" onClick={addServer}>Add server</Button>
      </div>
      <DataTable
        flat
        pager={false}
        rows={targets}
        rowKey={(t) => t.id}
        noun={['server', 'servers']}
        selectable="multi"
        selected={selected}
        onSelectedChange={setSelected}
        columns={[
          { key: 'ip', header: 'IP address', minWidth: 150 },
          { key: 'path', header: 'Agent path', mono: true, minWidth: 200 },
          { key: 'user', header: 'User name', minWidth: 150 },
          { key: 'status', header: 'Status', width: 140, value: () => 'Ready to install', render: () => <ToneTag tone="none">Ready to install</ToneTag> },
        ]}
        rowActions={(t) => <IconButton icon="x" label="Remove" onClick={() => {
          setTargets((list) => list.filter((x) => x.id !== t.id));
          setSelected((s) => s.filter((id) => id !== t.id));
        }} />}
        empty={<EmptyState compact icon="server" title="No servers added" message="Add the server to install the agent on." />}
      />
    </Modal>
  );
}

/* ───────────────────────── Create location (3 steps) ───────────────────────── */

const LOC_STEPS = ['Object selection', 'File type', 'Index server'];
type LocDraft = {
  name: string; description: string; component: string; type: string; user: string; password: string;
  folders: { path: string; server: string }[]; fileTypes: string[]; indexServer: string;
};
type LocErrors = Partial<Record<'name' | 'user' | 'password' | 'folders' | 'unc' | 'fileTypes' | 'indexServer', string>>;
const EMPTY_LOC: LocDraft = {
  name: '', description: '', component: COMPONENTS[0], type: 'Index', user: '', password: '',
  folders: [], fileTypes: [...FILE_TYPES], indexServer: '',
};
const UNC = /^\\\\[^\\]+\\.+/;

function CreateLocationDialog({ open, onClose, agents, locations, onCreate }: {
  open: boolean; onClose: () => void; agents: Agent[]; locations: Location[]; onCreate: (d: LocDraft) => void;
}) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<LocDraft>(EMPTY_LOC);
  const [unc, setUnc] = useState('');
  const [errors, setErrors] = useState<LocErrors>({});
  const last = step === LOC_STEPS.length - 1;
  const set = <K extends keyof LocDraft>(k: K, v: LocDraft[K]) => {
    setD((cur) => ({ ...cur, [k]: v }));
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const close = () => { setStep(0); setD(EMPTY_LOC); setUnc(''); setErrors({}); onClose(); };

  const addFolder = (path: string) => {
    const server = path.replace(/^\\\\/, '').split('\\')[0];
    if (d.folders.some((f) => f.path.toLowerCase() === path.toLowerCase())) return;
    set('folders', [...d.folders, { path, server }]);
    setErrors((e) => ({ ...e, folders: undefined, unc: undefined }));
  };
  const addUnc = () => {
    const p = unc.trim();
    if (!UNC.test(p)) { setErrors((e) => ({ ...e, unc: 'Enter a UNC path such as \\\\server\\share' })); focusFirstError(); return; }
    addFolder(p);
    setUnc('');
  };

  const validate = (): LocErrors => {
    const e: LocErrors = {};
    if (step === 0) {
      const name = d.name.trim();
      if (!name) e.name = 'Enter a location name';
      else if (locations.some((l) => l.name.toLowerCase() === name.toLowerCase())) e.name = `A location called "${name}" already exists`;
      if (!d.user.trim()) e.user = 'Enter a user name';
      else if (!/^[^\\]+\\[^\\]+$/.test(d.user.trim())) e.user = 'Use the Domain name\\User name format';
      if (!d.password) e.password = 'Enter the password';
      if (!d.folders.length) e.folders = 'Add at least one folder with Add file server or Add UNC path';
    }
    if (step === 1 && !d.fileTypes.length) e.fileTypes = 'Select at least one file type';
    if (step === 2 && !d.indexServer) e.indexServer = 'Select the server that keeps the index';
    return e;
  };

  const submit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(); return; }
    if (!last) { setStep(step + 1); return; }
    onCreate({ ...d, name: d.name.trim() });
    setStep(0); setD(EMPTY_LOC); setUnc('');
  };

  const servers = ['192.168.30.206', '192.168.30.150', '192.168.10.78'];

  return (
    <Modal
      open={open}
      onClose={close}
      icon="folder"
      title="Create location"
      subtitle="An indexed location is a set of folders the agent indexes so cases can search them."
      steps={LOC_STEPS}
      step={step}
      onSubmit={submit}
      footerHint={`Step ${step + 1} of ${LOC_STEPS.length}`}
      footer={<>
        {step > 0 && <Button icon="chevron-left" onClick={() => { setErrors({}); setStep(step - 1); }}>Back</Button>}
        <Button onClick={close}>Cancel</Button>
        <Button variant="primary" type="submit" iconEnd={last ? undefined : 'arrow'} icon={last ? 'check' : undefined}>
          {last ? 'Create location' : 'Next'}
        </Button>
      </>}
    >
      {step === 0 && <>
        <h3 className="section-label">New location and object selection</h3>
        <div className="fld-row">
          <TextField label="Location name" autoComplete="off" value={d.name} error={errors.name} onChange={(v) => set('name', v)} maxLength={120} />
          <TextField label="Description" note="Optional" autoComplete="off" value={d.description} onChange={(v) => set('description', v)} maxLength={240} />
        </div>
        <div className="fld-row">
          <SelectField label="Component" value={d.component} options={COMPONENTS} onChange={(v) => set('component', v)} />
          <SelectField label="Search type" value={d.type} options={SEARCH_TYPES} onChange={(v) => set('type', v)} />
        </div>
        <div className="fld-row">
          <TextField label="User name" autoComplete="off" placeholder="CORP\administrator" value={d.user} error={errors.user}
            help="Use the Domain name\User name format." onChange={(v) => set('user', v)} />
          <PasswordField label="Password" autoComplete="new-password" value={d.password} error={errors.password} onChange={(v) => set('password', v)} />
        </div>
        <div className="fld-row">
          <TextField label="UNC path" autoComplete="off" placeholder="\\server\share\folder" value={unc} error={errors.unc}
            onChange={(v) => { setUnc(v); if (errors.unc) setErrors((e) => ({ ...e, unc: undefined })); }} />
          <div className="row" style={{ alignSelf: 'end', minHeight: 'var(--field-h)' }}>
            <Menu
              label="File servers"
              align="left"
              trigger={(p) => <Button {...p} icon="server">Add file server</Button>}
              items={servers.map((s) => ({ label: s, icon: 'server' as const, onSelect: () => addFolder(`\\\\${s}\\`) }))}
            />
            <Button icon="link" onClick={addUnc}>Add UNC path</Button>
          </div>
        </div>
        {errors.folders && <Banner tone="error">{errors.folders}</Banner>}
        <DataTable
          flat
          pager={false}
          rows={d.folders}
          rowKey={(f) => f.path}
          noun={['folder', 'folders']}
          columns={[
            { key: 'path', header: 'Folder path', mono: true, minWidth: 240 },
            { key: 'server', header: 'Server', minWidth: 150 },
          ]}
          rowActions={(f) => <IconButton icon="x" label="Remove" onClick={() => set('folders', d.folders.filter((x) => x.path !== f.path))} />}
          empty={<EmptyState compact icon="folder" title="No folders added yet" message="Use Add file server or Add UNC path." />}
        />
      </>}

      {step === 1 && <>
        <MultiSelect label="File types to index" selectAll value={d.fileTypes} options={FILE_TYPES} error={errors.fileTypes}
          onChange={(v) => set('fileTypes', v)} help="Cases can only find the file types that are indexed." />
      </>}

      {step === 2 && <>
        <SelectField label="Index server" placeholder="Select" value={d.indexServer} error={errors.indexServer}
          options={agents.map((a) => a.server)} onChange={(v) => set('indexServer', v)}
          help="The server whose agent builds and stores the index for this location." />
        <KeyValues items={[
          { label: 'Location name', value: d.name.trim() || '—' },
          { label: 'Component', value: d.component },
          { label: 'Folders', value: plural(d.folders.length, 'folder', 'folders') },
          { label: 'File types', value: plural(d.fileTypes.length, 'type', 'types') },
        ]} />
      </>}
    </Modal>
  );
}

/* ───────────────────────── Page ───────────────────────── */

type Pending =
  | { kind: 'case'; item: Case }
  | { kind: 'location'; item: Location }
  | { kind: 'agents'; items: Agent[] };

export default function EDiscovery() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('cases');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('agents');

  const [cases, setCases] = useState(CASES);
  const [agents, setAgents] = useState(AGENTS);
  const [locations, setLocations] = useState(LOCATIONS);

  const [caseQ, setCaseQ] = useState('');
  const [agentQ, setAgentQ] = useState('');
  const [locationQ, setLocationQ] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'case' | 'agent' | 'location' | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const open = cases.find((c) => c.id === openId) ?? null;
  const locName = (id: string) => locations.find((l) => l.id === id)?.name ?? id;

  const updateCase = (id: string, patch: Partial<Case>) => setCases((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const runSearch = (c: Case) => {
    updateCase(c.id, { status: 'In progress', start: nowStamp(), end: '' });
    const t = toast({ loading: true, title: 'Search started', message: `${c.name} is searching ${plural(c.locations.length, 'location', 'locations')}.` });
    window.setTimeout(() => {
      updateCase(c.id, { status: 'Completed', end: nowStamp() });
      t.update({ loading: false, variant: 'success', title: 'Search completed', message: `${c.name} finished searching.` });
    }, 1500);
  };

  const createCase = (d: CaseDraft) => {
    const first = locations.find((l) => l.id === d.locations[0]);
    const c: Case = {
      id: `c-${Date.now()}`, name: d.name, description: d.description, component: d.component,
      agent: first?.agent ?? 'localhost', agentStatus: 'Success', status: 'Never started', start: '', end: '',
      type: d.type as SearchType, locations: d.locations,
    };
    setCases((list) => [c, ...list]);
    setDialog(null);
    setCaseQ('');
    toast({ variant: 'success', title: 'Case created', message: `${c.name} searches ${plural(c.locations.length, 'location', 'locations')}. Run a search to collect results.` });
  };

  const installAgents = (targets: Target[]) => {
    setAgents((list) => [...list, ...targets.map((t) => ({ id: `a-${t.id}`, server: t.ip, path: `\\\\${t.ip}\\LepideAgent`, scanned: '' }))]);
    setDialog(null);
    toast({ variant: 'success', title: targets.length === 1 ? 'Agent installed' : 'Agents installed',
      message: `The agent is running on ${targets.map((t) => t.ip).join(', ')}.` });
  };

  const createLocation = (d: LocDraft) => {
    const l: Location = {
      id: `l-${Date.now()}`, name: d.name, path: d.folders[0].path, lastIndex: '', status: 'Indexing', agent: d.indexServer, component: d.component,
    };
    setLocations((list) => [...list, l]);
    setDialog(null);
    toast({ variant: 'success', title: 'Location created', message: `${l.name} is being indexed on ${l.agent}. Cases can search it once indexing finishes.` });
    window.setTimeout(() => setLocations((list) => list.map((x) => (x.id === l.id ? { ...x, status: 'Indexed', lastIndex: nowStamp() } : x))), 2500);
  };

  const uninstall = () => {
    const items = agents.filter((a) => selectedAgents.includes(a.id));
    setPending({ kind: 'agents', items });
  };

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === 'case') {
      const c = pending.item;
      setCases((list) => list.filter((x) => x.id !== c.id));
      if (openId === c.id) setOpenId(null);
      toast({ variant: 'success', title: 'Case deleted', message: `${c.name} and its search results were deleted.` });
    } else if (pending.kind === 'location') {
      const l = pending.item;
      setLocations((list) => list.filter((x) => x.id !== l.id));
      setCases((list) => list.map((c) => ({ ...c, locations: c.locations.filter((id) => id !== l.id) })));
      toast({ variant: 'success', title: 'Location deleted', message: `${l.name} and its index were deleted.` });
    } else {
      const ids = pending.items.map((a) => a.id);
      setAgents((list) => list.filter((a) => !ids.includes(a.id)));
      setSelectedAgents([]);
      toast({ variant: 'success', title: ids.length === 1 ? 'Agent uninstalled' : 'Agents uninstalled',
        message: `Removed from ${pending.items.map((a) => a.server).join(', ')}.` });
    }
    setPending(null);
  };

  const pendingText = !pending ? null
    : pending.kind === 'case'
      ? { title: 'Delete this case?', message: `${pending.item.name} and all of its search results are deleted. This can’t be undone.`, confirmLabel: 'Delete case' }
      : pending.kind === 'location'
        ? { title: 'Delete this location?', message: `The index for ${pending.item.name} is deleted and cases stop searching it. This can’t be undone.`, confirmLabel: 'Delete location' }
        : { title: pending.items.length === 1 ? 'Uninstall this agent?' : `Uninstall ${pending.items.length} agents?`,
            message: `Lepide stops indexing and searching on ${pending.items.map((a) => a.server).join(', ')}. You can install the agent again later.`,
            confirmLabel: pending.items.length === 1 ? 'Uninstall agent' : `Uninstall ${pending.items.length} agents` };

  // The header's one primary depends on the tab (prototype): Create case · Install agent · Create location.
  const primary = tab === 'cases' ? { label: 'Create case', dialog: 'case' as const }
    : settingsTab === 'agents' ? { label: 'Install agent', dialog: 'agent' as const }
      : { label: 'Create location', dialog: 'location' as const };
  const actions = <>
    {tab === 'settings' && settingsTab === 'agents' && <Button icon="trash" disabled={!selectedAgents.length} onClick={uninstall}>{selectedAgents.length > 1 ? `Uninstall ${selectedAgents.length} agents` : 'Uninstall agent'}</Button>}
    <Button variant="primary" icon="plus" onClick={() => setDialog(primary.dialog)}>{primary.label}</Button>
  </>;

  return (
    <div className="sub">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Identify', to: '/identify' }, { label: 'e-Discovery' }]}
        title="e-Discovery"
        actions={actions}
      >
        <div className="row row--wrap">
          <Segmented hug ariaLabel="e-Discovery sections" value={tab} onChange={(v) => setTab(v as Tab)}
            items={[{ value: 'cases', label: 'Cases' }, { value: 'settings', label: 'Settings' }]} />
          {tab === 'settings' && (
            <Segmented hug ariaLabel="Settings sections" value={settingsTab} onChange={(v) => setSettingsTab(v as SettingsTab)}
              items={[
                { value: 'agents', label: 'Agents', icon: 'server', count: agents.length },
                { value: 'locations', label: 'Indexed locations', icon: 'folder', count: locations.length },
              ]} />
          )}
        </div>
      </PageHeader>

      {tab === 'cases' && (
        <DataTable
          title="Cases"
          noun={['case', 'cases']}
          rows={cases}
          rowKey={(c) => c.id}
          columns={caseColumns}
          search={caseQ}
          initialSort={{ key: 'name', dir: 'asc' }}
          toolbar={<SearchField value={caseQ} onChange={setCaseQ} placeholder="Search cases" ariaLabel="Search cases" />}
          activeKey={openId}
          onRowOpen={(c) => setOpenId(c.id)}
          rowActions={(c) => <>
            <IconButton icon="play" label="Run search" disabled={c.status === 'In progress'} onClick={() => runSearch(c)} />
            <Menu
              label={`Actions for ${c.name}`}
              trigger={(p) => <IconButton {...p} icon="more" label="More actions" />}
              items={[
                { label: 'View details', icon: 'eye', onSelect: () => setOpenId(c.id) },
                { label: 'Run search', icon: 'play', onSelect: () => runSearch(c), disabled: c.status === 'In progress', reason: 'A search is already running' },
                { separator: true },
                { label: 'Delete case', icon: 'trash', danger: true, onSelect: () => setPending({ kind: 'case', item: c }) },
              ]}
            />
          </>}
          empty={<EmptyState icon="file-search" title="No cases yet" message="Create a case to search your indexed locations for the files a request needs."
            action={<Button icon="plus" onClick={() => setDialog('case')}>Create case</Button>} />}
          noResults={caseQ ? `No cases match "${caseQ}".` : 'No cases match these filters.'}
        />
      )}

      {tab === 'settings' && settingsTab === 'agents' && (
        <DataTable
          title="Agents"
          noun={['agent', 'agents']}
          rows={agents}
          rowKey={(a) => a.id}
          columns={agentColumns}
          search={agentQ}
          defaultPageSize={50}
          selectable="multi"
          selected={selectedAgents}
          onSelectedChange={setSelectedAgents}
          toolbar={<SearchField value={agentQ} onChange={setAgentQ} placeholder="Search agents" ariaLabel="Search agents" />}
          rowActions={(a) => <IconButton icon="trash" label="Remove" onClick={() => setPending({ kind: 'agents', items: [a] })} />}
          empty={<EmptyState icon="server" title="No agents installed" message="Install the agent on a server so e-Discovery can index and search its shares."
            action={<Button icon="plus" onClick={() => setDialog('agent')}>Install agent</Button>} />}
          noResults={agentQ ? `No agents match "${agentQ}".` : 'No agents match these filters.'}
        />
      )}

      {tab === 'settings' && settingsTab === 'locations' && (
        <DataTable
          title="Indexed locations"
          noun={['location', 'locations']}
          rows={locations}
          rowKey={(l) => l.id}
          columns={locationColumns}
          search={locationQ}
          defaultPageSize={50}
          toolbar={<SearchField value={locationQ} onChange={setLocationQ} placeholder="Search locations" ariaLabel="Search locations" />}
          rowActions={(l) => (
            <Menu
              label={`Actions for ${l.name}`}
              trigger={(p) => <IconButton {...p} icon="more" label="More actions" />}
              items={[
                { label: 'Index now', icon: 'refresh', disabled: l.status === 'Indexing', reason: 'Indexing is already running',
                  onSelect: () => {
                    setLocations((list) => list.map((x) => (x.id === l.id ? { ...x, status: 'Indexing' } : x)));
                    toast({ title: 'Indexing started', message: `${l.name} is being indexed again.` });
                    window.setTimeout(() => setLocations((list) => list.map((x) => (x.id === l.id ? { ...x, status: 'Indexed', lastIndex: nowStamp() } : x))), 2500);
                  } },
                { separator: true },
                { label: 'Delete location', icon: 'trash', danger: true, onSelect: () => setPending({ kind: 'location', item: l }) },
              ]}
            />
          )}
          empty={<EmptyState icon="folder" title="No indexed locations yet" message="Create a location so cases have folders to search."
            action={<Button icon="plus" onClick={() => setDialog('location')}>Create location</Button>} />}
          noResults={locationQ ? `No locations match "${locationQ}".` : 'No locations match these filters.'}
        />
      )}

      <Drawer
        open={!!open}
        onClose={() => setOpenId(null)}
        title={open?.name ?? 'Case'}
        subtitle={open ? `${open.type} search · ${open.component}` : undefined}
        footer={open && <>
          <Button variant="danger" icon="trash" onClick={() => setPending({ kind: 'case', item: open })}>Delete case</Button>
          <Button variant="primary" icon="play" disabled={open.status === 'In progress'} onClick={() => runSearch(open)}>Run search</Button>
        </>}
      >
        {open && <>
          {open.status === 'Failed' && <Banner tone="error">The last search stopped: the agent reported “{open.agentStatus}”.</Banner>}
          {open.status === 'Never started' && <Banner tone="info">This case hasn’t searched yet. Run a search to collect results.</Banner>}
          <KeyValues items={[
            { label: 'Status', value: <ToneTag tone={toneFor(open.status)}>{open.status}</ToneTag> },
            { label: 'Agent status', value: <ToneTag tone={toneFor(open.agentStatus)}>{open.agentStatus}</ToneTag> },
            { label: 'Agent', value: open.agent },
            { label: 'Search type', value: open.type },
            { label: 'Last search start time', value: open.start ? fmtDateTime(open.start) : '—' },
            { label: 'Last search end time', value: open.end ? fmtDateTime(open.end) : '—' },
            { label: 'Description', value: open.description || '—', wide: true },
            { label: 'Locations', value: open.locations.length ? open.locations.map(locName).join(', ') : 'None', wide: true },
          ]} />
        </>}
      </Drawer>

      <CreateCaseDialog open={dialog === 'case'} onClose={() => setDialog(null)} cases={cases} locations={locations} onCreate={createCase} />
      <InstallAgentDialog open={dialog === 'agent'} onClose={() => setDialog(null)} agents={agents} onInstall={installAgents} />
      <CreateLocationDialog open={dialog === 'location'} onClose={() => setDialog(null)} agents={agents} locations={locations} onCreate={createLocation} />

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={pendingText?.title}
        message={pendingText?.message}
        confirmLabel={pendingText?.confirmLabel ?? 'Delete'}
        onConfirm={confirm}
      />
    </div>
  );
}
