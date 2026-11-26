import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, ConfirmDialog, Icon, KeyValues, Segmented, SetCard, ToneTag, useToast } from '../../../ui';
import { HeaderActions } from '../../SettingsFrame';
import { dsStore, stampNow } from './store';
import type { AdDomain } from './store';
import { CLASS_SCOPE, OU_SCOPE, SERVER_GROUP_LABEL, componentLabel, dnsOf } from './adData';
import type { AdServer, AdServerGroup } from './adData';
import { ActionPane, MiniTable } from './parts';
import type { PaneItem } from './parts';
import AdWizard from './AdWizard';

/* Figma "Added Data Source for Active Directory" (Server overview): every added domain, its servers and their
   auditing status, with the domain actions on the left. The AD tile on the picker lands here; with no domain
   added yet it opens the wizard straight away. */

const PANE: PaneItem[] = [
  { id: 'edit', label: 'Edit', icon: 'edit' },
  { id: 'delete', label: 'Delete', icon: 'trash' },
  { id: 'uninstall', label: 'Uninstall agent', icon: 'x' },
  { id: 'upgrade', label: 'Upgrade agent', icon: 'upload' },
  { id: 'remote', label: 'Audit changes from remote system', icon: 'download' },
  { id: 'removeRemote', label: 'Remove remote domain auditing', icon: 'minus' },
  { id: 'adBackup', label: 'Create Active Directory backup', icon: 'archive' },
  { id: 'gpBackup', label: 'Create Group Policy backup', icon: 'file' },
  { id: 'disk', label: 'Manage disk', icon: 'database' },
];

type View = null | { k: 'add' } | { k: 'edit'; id: string };

export default function ActiveDirectory() {
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const domains = dsStore.use((s) => s.adDomains);
  const [view, setView] = useState<View>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'delete' | 'uninstall'>(null);

  // The picker sends { add: true } (or there is nothing to show yet) → open the wizard.
  useEffect(() => {
    if ((loc.state as { add?: boolean } | null)?.add || !domains.length) {
      setView({ k: 'add' });
      if (loc.state) nav(loc.pathname, { replace: true, state: null });
    }
  }, [loc.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = domains.find((x) => x.id === sel) ?? domains[0];

  if (view) {
    const editing = view.k === 'edit' ? domains.find((x) => x.id === view.id) : undefined;
    const close = () => { setView(null); if (!domains.length) nav('/settings/add-data-source'); };
    return (
      <AdWizard key={view.k === 'edit' ? view.id : 'add'} edit={editing} onClose={close}
        onDone={(id) => {
          setView(null); setSel(id);
          if (view.k === 'add') { const d = dsStore.get().adDomains.find((x) => x.id === id); toast({ variant: 'success', title: 'Active Directory added', message: `${d?.domain ?? 'The domain'} is now audited.` }); }
        }} />
    );
  }
  if (!current) return null;

  const patchServers = (fn: (s: AdServer) => AdServer) => dsStore.set((s) => ({
    ...s, adDomains: s.adDomains.map((x) => (x.id === current.id ? { ...x, config: { ...x.config, servers: x.config.servers.map(fn) } } : x)),
  }));
  const anyAgent = current.config.servers.some((s) => s.agent === 'Installed');
  const items = PANE.map((p) => ({ ...p, disabled: (p.id === 'uninstall' || p.id === 'upgrade') && !anyAgent }));

  const act = (id: string) => {
    switch (id) {
      case 'edit': setView({ k: 'edit', id: current.id }); break;
      case 'delete': setConfirm('delete'); break;
      case 'uninstall': setConfirm('uninstall'); break;
      case 'upgrade': toast({ variant: 'success', title: 'Agent upgraded', message: `The agent on ${current.config.servers.filter((s) => s.agent === 'Installed').length} server(s) is up to date.` }); break;
      case 'adBackup': toast({ variant: 'success', title: 'Active Directory backup started', message: `Backing up ${current.domain} to ${current.config.backupPath} (${stampNow()}).` }); break;
      case 'gpBackup': toast({ variant: 'success', title: 'Group Policy backup started', message: `Backing up the Group Policy Objects of ${current.domain}.` }); break;
      default: toast({ variant: 'info', title: PANE.find((p) => p.id === id)!.label, message: 'This action isn\'t part of this prototype yet.' });
    }
  };

  const c = current.config;
  const groups: AdServerGroup[] = ['ad', 'gp'];
  return (
    <>
      <HeaderActions>
        <Button variant="primary" icon="plus" onClick={() => setView({ k: 'add' })}>Add domain</Button>
      </HeaderActions>
      <header className="add-data-source-head">
        <nav className="crumbs add-data-source-crumbs" aria-label="Active Directory location">
          <Link to="/settings/add-data-source">Add Data Source</Link><span aria-hidden="true">/</span><b aria-current="page">Active Directory</b>
        </nav>
        <div className="add-data-source-head__row">
          <span className="add-data-source-head__ic"><Icon name="building" size={18} /></span>
          <div className="grow">
            <h3>Added data source for Active Directory</h3>
            <p>{domains.length} domain{domains.length === 1 ? '' : 's'} audited. Pick a domain to see its servers and auditing status.</p>
          </div>
        </div>
      </header>
      <div className="add-data-source-rail">
        <Segmented hug ariaLabel="Domains" value={current.id} onChange={setSel} items={domains.map((x) => ({ value: x.id, label: x.domain }))} />
      </div>
      <div className="add-data-source-body">
        <ActionPane title="Domain actions" items={items} onPick={act} />
        <div className="stack">
          <SetCard title={`Credentials for ${current.domain}`} description={`${c.mode === 'express' ? 'Express' : 'Advanced'} configuration · added ${c.added}`}>
            <MiniTable label={`Servers in ${current.domain}`}
              head={<><th>Server</th><th>Change auditing status</th><th>Health monitoring status</th><th>Non-owner mailbox agent status</th><th>Details</th></>}>
              {groups.map((g) => {
                const list = c.servers.filter((s) => s.group === g);
                if (!list.length) return null;
                return (
                  <ServerRows key={g} g={g} list={list} components={c.components} />
                );
              })}
            </MiniTable>
          </SetCard>
          <SetCard title="Profile information">
            <KeyValues cols={3} items={[
              { label: 'Domain', value: `${current.domain} (${dnsOf(current.domain)})` },
              { label: 'User name', value: current.logon },
              { label: 'Preferred DC', value: c.preferredDc },
              { label: 'Auditing method', value: c.agent === 'none' ? 'Without agent' : c.agent === 'share' ? `With agent · ${c.sharePath}` : 'With agent · Admin$' },
              { label: 'Audit policies', value: c.autoAudit ? `Applied through "${c.gpo}"` : 'Set up manually' },
              { label: 'SQL Server', value: `${c.sqlServer} · ${c.database}` },
              { label: 'Components', value: c.components.map(componentLabel).join(', '), wide: true },
              { label: 'Organizational units', value: c.ouScope === 'all' ? OU_SCOPE[0].label : `${OU_SCOPE.find((o) => o.value === c.ouScope)!.label}: ${c.ous.length}` },
              { label: 'Object classes', value: c.classScope === 'all' ? CLASS_SCOPE[0].label : `${CLASS_SCOPE.find((o) => o.value === c.classScope)!.label}: ${c.adClasses.length + c.exClasses.length}` },
              { label: 'More audit settings', value: [c.failedLogon && 'Failed logon', c.logonLogoff && 'Successful logon/logoff'].filter(Boolean).join(', ') || 'None' },
            ]} />
          </SetCard>
        </div>
      </div>

      <ConfirmDialog open={confirm === 'delete'} onClose={() => setConfirm(null)} confirmLabel="Delete" title="Delete domain"
        message={`Delete ${current.domain}? It will no longer be audited, and its servers are removed from Lepide.`}
        onConfirm={() => {
          const d = current; setConfirm(null); setSel(null);
          dsStore.set((s) => ({ ...s, adDomains: s.adDomains.filter((x) => x.id !== d.id) }));
          toast({ variant: 'success', title: 'Domain deleted', message: `${d.domain} is no longer audited.` });
          if (domains.length === 1) nav('/settings/add-data-source');
        }} />
      <ConfirmDialog open={confirm === 'uninstall'} onClose={() => setConfirm(null)} confirmLabel="Uninstall" title="Uninstall agent"
        message={`Uninstall the agent from every server in ${current.domain}? Change auditing stops until it is installed again.`}
        onConfirm={() => {
          setConfirm(null); patchServers((s) => ({ ...s, agent: 'Not Installed' }));
          toast({ variant: 'success', title: 'Agent uninstalled', message: `The agent was removed from the servers in ${current.domain}.` });
        }} />
    </>
  );
}

function ServerRows({ g, list, components }: { g: AdServerGroup; list: AdServer[]; components: AdDomain['config']['components'] }) {
  const change = (s: AdServer) => (!s.change ? <ToneTag>Not audited</ToneTag> : s.agent === 'Installed' ? <ToneTag tone="good">Auditing started</ToneTag> : <ToneTag tone="bad">Agent not installed</ToneTag>);
  const health = (s: AdServer) => (!components.includes('health') || !s.health ? <span className="lf-na">N/A</span> : <ToneTag tone="good">Healthy</ToneTag>);
  const mailbox = (s: AdServer) => (!components.includes('mailbox') || !s.mailbox ? <span className="lf-na">N/A</span> : s.agent === 'Installed' ? <ToneTag tone="good">Installed</ToneTag> : <ToneTag tone="bad">Not installed</ToneTag>);
  return (
    <>
      <tr className="add-data-source-tree-group"><td colSpan={5}><b>{SERVER_GROUP_LABEL[g]}</b><span className="add-data-source-tree-meta">{list.length} server{list.length === 1 ? '' : 's'}</span></td></tr>
      {list.map((s) => (
        <tr key={g + s.name} className="lf-row" style={{ cursor: 'default' }}>
          <td className="ad-server-cell">{s.name}</td><td>{change(s)}</td><td>{health(s)}</td><td>{mailbox(s)}</td><td className="mono">{s.ip}</td>
        </tr>
      ))}
    </>
  );
}

