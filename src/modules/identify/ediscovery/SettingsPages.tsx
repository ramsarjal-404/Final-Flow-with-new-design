import { useMemo, useState } from 'react';
import { Button, ConfirmDialog, DataTable, EmptyState, IconButton, SearchField, useToast } from '../../../ui';
import type { Column } from '../../../ui';
import { addLocation, edStore, indexLocation, removeLocation, updateAgent } from './store';
import type { Agent, Location } from './store';
import { EdHeader, LocationStatus, RowMenu } from './parts';
import { InstallAgentDialog, ServerDialog, UninstallAgentDialog } from './AgentDialogs';
import { CaseWizard } from './Wizard';

const contains = (q: string, ...vals: string[]) => { const t = q.trim().toLowerCase(); return !t || vals.some((v) => v.toLowerCase().includes(t)); };

/* ---------- SCR-IDN-06 e-Discovery › Settings › Agents ---------- */
type AgentRow = Agent & { scannedText: string };

export function AgentsPage() {
  const state = edStore.use();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [install, setInstall] = useState(false);
  const [uninstall, setUninstall] = useState(false);
  const [edit, setEdit] = useState<Agent | null>(null);

  // Scanned = cases whose agent is the server, then locations whose agent is the server; else the stored text.
  const all: AgentRow[] = useMemo(() => state.agents.map((a) => {
    const names = [
      ...state.cases.filter((c) => c.agent.toLowerCase() === a.server.toLowerCase()).map((c) => c.name),
      ...state.locations.filter((l) => l.agent.toLowerCase() === a.server.toLowerCase()).map((l) => l.name),
    ];
    return { ...a, scannedText: names.length ? names.join(', ') : a.scanned };
  }), [state.agents, state.cases, state.locations]);
  // The table's own search covers exactly server, path and scanned (its three columns).
  const rows = all;

  const columns: Column<AgentRow>[] = [
    { key: 'server', header: 'Agent server', sortable: true, filterable: true, minWidth: 160 },
    { key: 'path', header: 'Agent Path', sortable: true, filterable: true, minWidth: 220, mono: true },
    { key: 'scannedText', header: 'Scanned Case(s)/Location(s)', sortable: true, filterable: true, minWidth: 260 },
  ];

  return (
    <div className="sub">
      <EdHeader tab="settings" section="agents" actions={<>
        <Button icon="trash" disabled={!state.agents.length} onClick={() => setUninstall(true)}>Uninstall agent</Button>
        <Button variant="primary" icon="plus" onClick={() => setInstall(true)}>Install agent</Button>
      </>} />
      <DataTable title="Agents" noun={['agent', 'agents']} columns={columns} rows={rows} rowKey={(a) => a.id} search={search}
        pageSizes={[10, 20, 50, 100]} defaultPageSize={50}
        toolbar={<SearchField value={search} onChange={setSearch} placeholder="Search" ariaLabel="Search" />}
        rowActions={(a) => <IconButton icon="edit" label={`Edit agent on ${a.server}`} data-tip="Edit agent" onClick={() => setEdit(a)} />}
        empty={state.agents.length === 0 ? <EmptyState compact icon="server" title="You don't have any agent here please click on Install Agent button to install an agent!" /> : undefined} />

      <InstallAgentDialog open={install} onClose={() => setInstall(false)} />
      <UninstallAgentDialog open={uninstall} onClose={() => setUninstall(false)} />
      <ServerDialog open={!!edit} title="Update agent" initial={edit ? { ip: edit.server, path: edit.path, user: edit.user } : undefined}
        onClose={() => setEdit(null)}
        onApply={(f) => {
          updateAgent(edit!.server, { path: f.path, user: f.user });
          toast({ variant: 'success', title: 'Agent updated', message: `The agent on ${edit!.server} was updated.` });
          return true;
        }} />
    </div>
  );
}

/* ---------- SCR-IDN-07 e-Discovery › Settings › Indexed Locations ---------- */
export function LocationsPage() {
  const { locations, cases } = edStore.use();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [wizard, setWizard] = useState(false);
  const [toDelete, setToDelete] = useState<Location | null>(null);
  const rows = locations.filter((l) => contains(search, l.name, l.sharePath, l.status, l.agent));
  const referenced = (l: Location) => cases.some((c) => c.locations.includes(l.name));

  const columns: Column<Location>[] = [
    { key: 'name', header: 'Location name', sortable: true, filterable: true, minWidth: 170 },
    { key: 'sharePath', header: 'Share path', sortable: true, filterable: true, minWidth: 240, mono: true },
    { key: 'lastIndex', header: 'Last index', sortable: true, filterable: true, minWidth: 170 },
    { key: 'status', header: 'Status', sortable: true, filterable: true, minWidth: 140, render: (l) => <LocationStatus value={l.status} /> },
    { key: 'agent', header: 'Agent', sortable: true, filterable: true, minWidth: 140 },
  ];

  return (
    <div className="sub">
      <EdHeader tab="settings" section="locations" actions={<Button variant="primary" icon="plus" onClick={() => setWizard(true)}>Create location</Button>} />
      <DataTable title="Indexed Locations" noun={['location', 'locations']} columns={columns} rows={rows} rowKey={(l) => l.id} search={search}
        pageSizes={[10, 20, 50, 100]} defaultPageSize={50}
        toolbar={<SearchField value={search} onChange={setSearch} placeholder="Search" ariaLabel="Search" />}
        rowActions={(l) => {
          const busy = l.status === 'Starting' || l.status === 'Indexing';
          return (
            <RowMenu label={`Actions for ${l.name}`} items={[
              { label: 'Re Index', icon: 'refresh', disabled: busy, reason: 'Indexing is already running.', onSelect: () => indexLocation(l.id) },
              { label: 'Delete location', icon: 'trash', danger: true, onSelect: () => setToDelete(l) },
            ]} />
          );
        }}
        empty={locations.length === 0 ? (
          <EmptyState icon="folder" title={<>You don't have any Location here please click on Create Location button<br />to Create Location!</>} />
        ) : undefined} />

      <CaseWizard mode="location" open={wizard} onClose={() => setWizard(false)} onDone={(r) => {
        if (r.kind !== 'location') return;
        addLocation(r.value);
        if (r.value.status === 'Starting') indexLocation(r.value.id);
        setWizard(false); setSearch('');
        toast({ variant: 'success', title: 'Success!', message: 'Location created successfully' });
      }} />

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} title="Delete location" confirmLabel="Delete"
        message={toDelete ? `Delete "${toDelete.name}"?${referenced(toDelete) ? ' Index cases that search it will no longer find its files.' : ''} This can't be undone.` : undefined}
        onConfirm={() => {
          const l = toDelete!;
          removeLocation(l.id); setToDelete(null);
          toast({ variant: 'success', title: 'Location deleted', message: `${l.name} was removed.` });
        }} />
    </div>
  );
}
