import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, ConfirmDialog, DataTable, EmptyState, IconButton, ToneTag, useToast } from '../../../ui';
import type { Column } from '../../../ui';
import { ACTION_LABEL, MULTIPLE_TYPES, SERVER_TYPE_LABEL, SINGLE_TYPES, canRun, ds$, dsStore, stampNow } from './store';
import type { AgentAction, AuditRule, FileServer, ServerType } from './store';
import { ActionPane, ConsoleChrome, PortalMenu } from './parts';
import type { PaneItem } from './parts';
import AddServerWizard from './AddServerWizard';
import {
  AgentActionDialog, AgentPropertiesDialog, DomainControllersFrame, ModifyChooser, ModifyWizard, PropertiesDialog, RemoveWizard,
} from './ActionDialogs';
import type { ModifyReq } from './ActionDialogs';
import { RuleEditor } from './AuditRules';

/* SCR-SDS-02 All File Servers + DLG-SDS-02 menu, DLG-SDS-09 apply-rule confirm, DLG-SDS-14 row menu. */

type View = null | { k: 'add'; type: ServerType; multiple: boolean } | { k: 'modify'; req: ModifyReq } | { k: 'remove' } | { k: 'dc' }
  | { k: 'rule'; servers: string[] };

const PANE: PaneItem[] = [
  { id: 'install', label: 'Install agent', icon: 'download' },
  { id: 'uninstall', label: 'Uninstall agent', icon: 'x' },
  { id: 'start', label: 'Start Auditing', icon: 'play' },
  { id: 'stop', label: 'Stop Auditing', icon: 'pause' },
  { id: 'update', label: 'Update Agent', icon: 'refresh' },
  { id: 'upgrade', label: 'Upgrade Agent', icon: 'upload' },
  { id: 'modify', label: 'Modify File Server', icon: 'edit' },
  { id: 'remove', label: 'Remove File Servers', icon: 'trash' },
  { id: 'dc', label: 'Domain Controllers', icon: 'building' },
];

export const agentTone = (s: string) => (s === 'Installed' ? 'good' : s === 'Not Installed' ? 'bad' : 'none');

/** Saves servers from a finished add wizard and toasts (shared with the detail page). */
export function saveNewServers(list: FileServer[], multiple: boolean, toast: ReturnType<typeof useToast>) {
  ds$.addServers(list);
  if (multiple) toast({ variant: 'success', title: 'File servers added', message: list.map((s) => s.name).join(', ') });
  else toast({ variant: 'success', title: 'File server added', message: list[0].name });
}

export default function FileServers() {
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const servers = dsStore.use((s) => s.servers);
  const [view, setView] = useState<View>(null);
  const [pane, setPane] = useState<string | null>(null);
  const [action, setAction] = useState<{ a: AgentAction; fixedId?: string } | null>(null);
  const [choose, setChoose] = useState(false);
  const [applyRule, setApplyRule] = useState<string[] | null>(null);
  const [props, setProps] = useState<string | null>(null);
  const [agentProps, setAgentProps] = useState<string | null>(null);

  // NAS tiles on SCR-SDS-01 arrive with navigation state { add: <type> } → wizard pre-opened.
  useEffect(() => {
    const add = (loc.state as { add?: ServerType } | null)?.add;
    if (add) {
      setView({ k: 'add', type: add, multiple: false });
      nav(loc.pathname, { replace: true, state: null });
    }
  }, [loc.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeView = () => setView(null);

  /* ---------- full-page wizards ---------- */
  if (view?.k === 'add') {
    return (
      <AddServerWizard key={`${view.type}-${view.multiple}`} type={view.type} multiple={view.multiple} onClose={closeView}
        onFinish={(list) => { saveNewServers(list, view.multiple, toast); setView(null); setApplyRule(list.map((s) => s.name)); }} />
    );
  }
  if (view?.k === 'modify') return <ModifyWizard req={view.req} onClose={closeView} />;
  if (view?.k === 'remove') return <RemoveWizard onClose={closeView} />;
  if (view?.k === 'dc') return <DomainControllersFrame onClose={closeView} />;
  if (view?.k === 'rule') {
    return (
      <RuleEditor presetServers={view.servers} allowExisting onClose={closeView}
        onSaved={(rule: AuditRule) => {
          const names = view.servers.filter((n) => rule.servers.includes(n));
          const ids = dsStore.get().servers.filter((s) => names.includes(s.name)).map((s) => s.id);
          ds$.patchServers(ids, () => ({ auditStatus: 'Auditing Started', lastUpdate: stampNow() }));
          setView(null);
          nav('/settings/add-data-source/file-server/rules');
        }} />
    );
  }

  const onPane = (id: string) => {
    setPane(id);
    if (id === 'modify') setChoose(true);
    else if (id === 'remove') { setPane(null); setView({ k: 'remove' }); }
    else if (id === 'dc') { setPane(null); setView({ k: 'dc' }); }
    else setAction({ a: id as AgentAction });
  };

  const columns: Column<FileServer>[] = [
    { key: 'name', header: 'File Server Name/IP', sortable: true, filterable: true, minWidth: 170 },
    { key: 'type', header: 'Server Type', sortable: true, filterable: true, value: (s) => SERVER_TYPE_LABEL[s.type], minWidth: 150 },
    { key: 'domain', header: 'Domain/Workgroup', sortable: true, filterable: true, minWidth: 150 },
    {
      key: 'agentStatus', header: 'Agent Status', sortable: true, filterable: true, minWidth: 170,
      render: (s) => <span data-tip={s.agentStatus} tabIndex={0} className="add-data-source-tipwrap"><ToneTag tone={agentTone(s.agentStatus)}>{s.agentStatus}</ToneTag></span>,
    },
    { key: 'auditStatus', header: 'Auditing Status', sortable: true, filterable: true, minWidth: 150 },
    { key: 'lastUpdate', header: 'Last Update', sortable: true, filterable: true, minWidth: 170 },
    {
      key: 'actions', header: 'Actions', width: 90,
      render: (s) => (
        <PortalMenu label={`Actions for ${s.name}`}
          items={[
            ...(['install', 'uninstall', 'start', 'stop', 'update'] as AgentAction[]).map((a) => ({
              label: ACTION_LABEL[a], disabled: !canRun(a, s), onSelect: () => setAction({ a, fixedId: s.id }),
            })),
            {
              label: 'Refresh', onSelect: () => {
                ds$.patchServers([s.id], () => ({ lastUpdate: stampNow() }));
                toast({ variant: 'success', title: 'Refreshed', message: `${s.name} status is up to date.` });
              },
            },
            { label: 'Properties', onSelect: () => setProps(s.id) },
            ...(s.type === 'netapp7' ? [{ label: 'Agent Properties', onSelect: () => setAgentProps(s.id) }] : []),
          ]}
          trigger={(p) => <IconButton ref={p.ref} icon="more" label={`Actions for ${s.name}`} bordered onClick={p.onClick} aria-expanded={p['aria-expanded']} aria-haspopup="menu" />} />
      ),
    },
  ];

  const addMenu = (
    <PortalMenu label="Add file server"
      items={[
        { label: 'Single ›', onSelect: () => undefined, submenu: SINGLE_TYPES.map((t) => ({ label: t.label, onSelect: () => setView({ k: 'add', type: t.type, multiple: false }) })) },
        { label: 'Multiple ›', onSelect: () => undefined, submenu: MULTIPLE_TYPES.map((t) => ({ label: t.label, onSelect: () => setView({ k: 'add', type: t.type, multiple: true }) })) },
      ]}
      trigger={(p) => <Button ref={p.ref} variant="primary" icon="plus" iconEnd="chevron" onClick={p.onClick} aria-expanded={p['aria-expanded']} aria-haspopup="menu">Add new file server</Button>} />
  );

  return (
    <ConsoleChrome current="list" title="All file servers" crumbs={[{ label: 'All file servers' }]}
      subtitle="Overview of file server configuration. Use option to add, modify file servers and options in tasks pane for other settings."
      actions={<>
        <Button icon="refresh" onClick={() => {
          const now = stampNow();
          ds$.patchServers(servers.map((s) => s.id), () => ({ lastUpdate: now }));
          toast({ variant: 'success', title: 'Refreshed', message: 'File server statuses are up to date.' });
        }}>Refresh</Button>
        {addMenu}
      </>}>
      <div className="add-data-source-body">
        <ActionPane items={PANE} current={pane} onPick={onPane} />
        <DataTable columns={columns} rows={servers} rowKey={(s) => s.id} noun={['file server', 'file servers']}
          pageSizes={[10, 25, 50, 100]} defaultPageSize={10} onRowOpen={(s) => nav(`/settings/add-data-source/file-server/${s.id}`)}
          empty={<EmptyState compact icon="server" title="No file servers yet. Click Add New File Server to add one." />} />
      </div>

      {action && <AgentActionDialog key={`${action.a}-${action.fixedId ?? 'all'}`} action={action.a} fixedId={action.fixedId} onClose={() => { setAction(null); setPane(null); }} />}
      {choose && <ModifyChooser onClose={() => { setChoose(false); setPane(null); }} onNext={(req) => { setChoose(false); setPane(null); setView({ k: 'modify', req }); }} />}
      {props && <PropertiesDialog serverId={props} onClose={() => setProps(null)} />}
      {agentProps && <AgentPropertiesDialog serverId={agentProps} onClose={() => setAgentProps(null)} />}
      <ConfirmDialog open={!!applyRule} destructive={false} icon="shield" title="Apply a rule" message="Do you want to apply a rule to newly added file server"
        confirmLabel="Yes" onClose={() => setApplyRule(null)}
        onConfirm={() => { const names = applyRule!; setApplyRule(null); setView({ k: 'rule', servers: names }); }} />
    </ConsoleChrome>
  );
}
