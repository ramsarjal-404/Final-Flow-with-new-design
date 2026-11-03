/* SCR-PRO-03 / SCR-PRO-04 Policy Management with DLG-PRO-05 … DLG-PRO-12. */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button, Checkbox, Chip, ConfirmDialog, DataTable, EmptyState, Icon, Modal, PageHeader, Segmented, Toggle, onMenuKeys, useDismiss, useToast,
  type Column, type StatusTone,
} from '../../ui';
import { DELETE_NOUN, PERM_STATUS, RESTORE_POINTS, STATUS, type PermPolicy, type Policy } from './data';
import { protectStore, removePerm, removePolicy, setActive, setDefaultPerm, stampPerm } from './store';
import { RowMenu, StatusCell, type RowMenuItem } from './kit';

const AD_TONE: Record<string, StatusTone> = { completed: 'good', progress: 'info', scheduled: 'good', draft: 'none' };
const PERM_TONE: Record<string, StatusTone> = { completed: 'good', restoreProgress: 'info', scanProgress: 'info', restoreQueue: 'warn', automationQueue: 'warn' };
let handledKey = '';

/* DLG-PRO-05: hover / focus / click menu on "Create policy". */
function CreatePolicyMenu() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const timer = useRef(0);
  useDismiss(open, () => setOpen(false), [wrap]);
  const later = (v: boolean, ms: number) => { clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(v), ms); };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <span ref={wrap} className="rel" style={{ display: 'inline-flex' }} onMouseEnter={() => later(true, 0)} onMouseLeave={() => later(false, 180)}>
      <Button variant="primary" icon="plus" iconEnd="chevron" aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen((o) => !o)} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); requestAnimationFrame(() => wrap.current?.querySelector<HTMLElement>('.pop__item')?.focus()); } }}>Create policy</Button>
      {open && (
        <div className="pop" role="menu" aria-label="Choose policy type" style={{ minWidth: 220 }} onKeyDown={onMenuKeys}>
          <div className="pop__head">Choose policy type</div>
          <button type="button" role="menuitem" className="pop__item" onClick={() => nav('/protect/policies/new-permission')}><Icon name="key" size={15} /><span>Permission</span></button>
          <button type="button" role="menuitem" className="pop__item" onClick={() => nav('/protect/policies/new')}><Icon name="users" size={15} /><span>AD Cleaner</span></button>
        </div>
      )}
    </span>
  );
}

/* DLG-PRO-07 */
function activationCopy(p: Policy): { body: string; noun: string } {
  const d = p.deletes ?? [];
  if (d.includes('accounts') && d.includes('groups')) return { noun: 'accounts and groups', body: 'This policy includes permanent account and group deletion. Nothing is deleted before its threshold is reached, but deletion cannot be undone, and a deleted group also loses its SID and every permission that referenced it.' };
  if (d.includes('groups')) return { noun: 'groups', body: 'This policy includes permanent group deletion. Groups are deleted only after their time in quarantine, but a deleted group loses its SID and every permission that referenced it.' };
  const [one, many] = DELETE_NOUN[d[0] ?? p.task ?? 'accounts'] ?? DELETE_NOUN.accounts;
  return { noun: many, body: `This policy includes permanent ${one} deletion. ${many[0].toUpperCase() + many.slice(1)} are deleted only after the configured threshold is reached, but the action cannot be undone.` };
}
function ActivateDialog({ policy, onClose, onConfirm }: { policy: Policy | null; onClose: () => void; onConfirm: () => void }) {
  const [ack, setAck] = useState(false);
  useEffect(() => setAck(false), [policy]);
  if (!policy) return null;
  const c = activationCopy(policy);
  return (
    <Modal open onClose={onClose} size="xs" icon="alert" tone="danger" title={`Activate “${policy.name}”?`} subtitle={c.body}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!ack} onClick={onConfirm}>Activate policy</Button></>}>
      <Checkbox checked={ack} onChange={setAck} label={`I understand that this policy can permanently delete ${c.noun}.`} />
    </Modal>
  );
}

/* DLG-PRO-11 */
function RestoreDialog({ policy, onClose, onInstall }: { policy: PermPolicy | null; onClose: () => void; onInstall: (point: string) => void }) {
  const [desc, setDesc] = useState(false);
  const [point, setPoint] = useState('');
  useEffect(() => { setDesc(false); setPoint(''); }, [policy?.id]);
  if (!policy) return null;
  const pts = desc ? [...RESTORE_POINTS].reverse() : RESTORE_POINTS;
  return (
    <Modal open onClose={onClose} size="sm" icon="restore" title={`You are Restoring ${policy.name}`} subtitle="Choose the restore point to return this policy's permissions to."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!point} onClick={() => onInstall(point)}>Install</Button></>}>
      <div className="protect-restore" role="group" aria-label={`Restore ${policy.name}`}>
        <button type="button" className="th-sort protect-restore__head" data-dir={desc ? 'desc' : 'asc'} aria-label={`Group Policy Object, sorted ${desc ? 'descending' : 'ascending'}`} onClick={() => setDesc((d) => !d)}>
          Group Policy Object<Icon name={desc ? 'down' : 'up'} size={12} />
        </button>
        <div role="radiogroup" aria-label="Restore point" className="protect-restore__list">
          {pts.map((p) => (
            <label key={p} className={'protect-restore__row' + (point === p ? ' is-sel' : '')}>
              <input type="radio" name="restore-point" value={p} checked={point === p} onChange={() => setPoint(p)} />
              <span className="protect-radio" aria-hidden="true" /><span className="lf-mono">{p}</span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default function PolicyManagement() {
  const nav = useNavigate(); const toast = useToast(); const loc = useLocation();
  const [sp, setSp] = useSearchParams();
  const policies = protectStore.use((s) => s.policies);
  const perm = protectStore.use((s) => s.perm);
  const [tab, setTab] = useState(() => (sp.get('tab') === 'permission' ? 'permission' : 'cleaner'));
  const [sel, setSel] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ id: string; fading: boolean } | null>(null);
  const [activate, setActivateDlg] = useState<Policy | null>(null);
  const [del, setDel] = useState<Policy | null>(null);
  const [remove, setRemove] = useState<PermPolicy | null>(null);
  const [restore, setRestore] = useState<PermPolicy | null>(null);
  const [irrev, setIrrev] = useState<string | null>(null);

  useEffect(() => {
    const applied = sp.get('applied'); const updated = sp.get('updated'); const permId = sp.get('perm');
    if (!applied && !updated && !permId && !sp.get('tab')) return;
    if (handledKey === loc.key) return; handledKey = loc.key;
    const st = protectStore.get();
    if (sp.get('tab') === 'permission' || permId) setTab('permission');
    if (applied) {
      const p = st.policies.find((x) => x.id === applied);
      if (p) {
        setTab('cleaner'); setSel(p.id); setFresh({ id: p.id, fading: false });
        setTimeout(() => setFresh((f) => (f && f.id === p.id ? { ...f, fading: true } : f)), 3000);
        setTimeout(() => setFresh((f) => (f && f.id === p.id ? null : f)), 3450);
        setTimeout(() => toast({ variant: 'success', title: 'Policy created', message: `Policy “${p.name}” saved as inactive` }), 200);
      }
    }
    if (updated) {
      const p = st.policies.find((x) => x.id === updated);
      if (p) { setTab('cleaner'); setSel(p.id); toast({ variant: 'success', title: 'Policy updated', message: `Policy “${p.name}” updated` }); }
    }
    if (permId) setSel(permId);
    setSp({}, { replace: true });
  }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  const doActivate = (p: Policy, on: boolean) => {
    setActive(p.id, on);
    toast(on ? { variant: 'success', title: 'Policy activated', message: `${p.name}: active` } : { variant: 'info', title: 'Policy deactivated', message: `${p.name}: inactive` });
  };

  const adCols: Column<Policy>[] = [
    { key: 'name', header: 'Policy name', sortable: true, filterable: true, minWidth: 190, value: (r) => r.name,
      render: (r) => <span className="protect-name"><b>{r.name}</b>{fresh?.id === r.id && <span className={'lf-chip lf-chip--brand protect-new' + (fresh.fading ? ' is-fading' : '')}>New</span>}</span> },
    { key: 'desc', header: 'Description', sortable: true, filterable: true, minWidth: 170, value: (r) => r.desc || 'No description',
      render: (r) => (r.desc ? r.desc : <span className="lf-muted">No description</span>) },
    { key: 'status', header: 'Status', sortable: true, filterable: true, minWidth: 180, value: (r) => STATUS[r.status].label,
      render: (r) => <StatusCell label={STATUS[r.status].label} pct={STATUS[r.status].pct} clock={STATUS[r.status].clock} tone={AD_TONE[r.status]} /> },
    { key: 'updated', header: 'Last update', sortable: true, filterable: true, minWidth: 140, value: (r) => r.updated },
    { key: 'ptype', header: 'Type', sortable: true, filterable: true, minWidth: 190, value: (r) => r.ptype,
      render: (r) => <span className="protect-type"><span className="protect-type__ic" aria-hidden="true"><Icon name="users" size={13} /></span>{r.ptype}</span> },
    { key: 'scheduled', header: 'Scheduled date', sortable: true, filterable: true, minWidth: 140, value: (r) => r.scheduled },
    { key: 'active', header: 'Active/Inactive', minWidth: 110, value: () => '',
      render: (r) => <Toggle label={`Toggle policy ${r.name}`} checked={r.active} onChange={(on) => (on && r.destructive ? setActivateDlg(r) : doActivate(r, on))} /> },
    { key: 'action', header: 'Action', minWidth: 64, value: () => '',
      render: (r) => {
        const items: RowMenuItem[] = [{ label: 'Edit policy', icon: 'edit', onSelect: () => nav(`/protect/policies/new?edit=${r.id}`) }];
        if (r.task === 'groups') items.push({ label: 'View empty groups', icon: 'users', onSelect: () => nav(`/protect/ad-cleaner?tab=groups&domain=${encodeURIComponent(r.domain ?? 'LPDE4.local')}`) });
        if (r.task === 'accounts') items.push({ label: 'View configuration', icon: 'sliders', onSelect: () => nav('/protect/ad-cleaner') });
        items.push({ label: 'Delete policy', icon: 'trash', danger: true, onSelect: () => setDel(r) });
        return <RowMenu name={r.name} items={items} />;
      } },
  ];

  const report = (kind: string, p: PermPolicy) => toast({ variant: 'info', title: kind, message: `${kind} for “${p.name}” is being prepared.` });
  const permCols: Column<PermPolicy>[] = [
    { key: 'name', header: 'Policy name', sortable: true, filterable: true, minWidth: 220, value: (r) => r.name,
      render: (r) => <span className="protect-name"><b>{r.name}</b>{r.isDefault && <Chip tone="brand">Default Policy</Chip>}</span> },
    { key: 'desc', header: 'Description', sortable: true, filterable: true, minWidth: 110, value: (r) => r.desc || 'N/A' },
    { key: 'status', header: 'Status', sortable: true, filterable: true, minWidth: 200, value: (r) => PERM_STATUS[r.status].label,
      render: (r) => <StatusCell label={PERM_STATUS[r.status].label} pct={PERM_STATUS[r.status].pct} clock={PERM_STATUS[r.status].clock} tone={PERM_TONE[r.status]} /> },
    { key: 'updated', header: 'Last update', sortable: true, filterable: true, minWidth: 150, value: (r) => r.updated },
    { key: 'ptype', header: 'Policy type', sortable: true, filterable: true, minWidth: 160, value: (r) => r.ptype },
    { key: 'scheduled', header: 'Scheduled date', sortable: true, filterable: true, minWidth: 150, value: (r) => r.scheduled },
    { key: 'active', header: 'Active/Inactive', minWidth: 110, value: () => '',
      render: (r) => <Toggle label={`${r.active ? 'Deactivate' : 'Activate'} ${r.name}`} checked={r.active} onChange={(on) => {
        stampPerm(r.id, { active: on });
        toast(on ? { variant: 'success', title: 'Policy activated', message: `${r.name}: active` } : { variant: 'info', title: 'Policy deactivated', message: `${r.name}: inactive` });
      }} /> },
    { key: 'action', header: 'Action', minWidth: 64, value: () => '',
      render: (r) => {
        const stale = r.ptype === 'Remove Stale Users';
        const items: RowMenuItem[] = [
          { label: 'Default policy', icon: 'star', onSelect: () => { setDefaultPerm(r.id); toast({ variant: 'success', title: 'Default policy', message: `“${r.name}” is now the default policy.` }); } },
          stale
            ? { label: 'Execute policy', icon: 'play', onSelect: () => { stampPerm(r.id, { status: 'automationQueue' }); toast({ variant: 'success', title: 'Execute policy', message: `“${r.name}” is queued for execution.` }); } }
            : { label: 'Start scan now', icon: 'play', onSelect: () => { stampPerm(r.id, { status: 'scanProgress' }); toast({ variant: 'success', title: 'Start scan now', message: `Scan started for “${r.name}”.` }); } },
          { label: 'Remove', icon: 'trash', danger: true, onSelect: () => setRemove(r) },
          { label: 'Edit', icon: 'edit', onSelect: () => nav(`/protect/policies/new-permission?edit=${r.id}`) },
          stale
            ? { label: 'Report', icon: 'file', submenu: [{ label: 'Execution Report', onSelect: () => report('Execution Report', r) }, { label: 'Failed Report', onSelect: () => report('Failed Report', r) }] }
            : { label: 'Failed Report', icon: 'file', onSelect: () => report('Failed Report', r) },
          { label: 'Restore', icon: 'restore', onSelect: () => setRestore(r) },
        ];
        return <RowMenu name={r.name} items={items} />;
      } },
  ];

  return (
    <div className="sub sub--fill">
      <PageHeader crumbs={[{ label: 'Dashboard', to: '/protect' }, { label: 'Policy Management' }]} title="Policy Management"
        description="AD Cleaner identity-hygiene policies and Permission policies: activate, edit and run them from one list."
        actions={<CreatePolicyMenu />}>
        <div className="protect-tabs">
          <Segmented ariaLabel="Filter by policy type" value={tab} onChange={(t) => setTab(t)}
            items={[{ value: 'cleaner', label: 'AD Cleaner', count: policies.length }, { value: 'permission', label: 'Permission', count: perm.length }]} />
        </div>
      </PageHeader>
      {tab === 'cleaner' ? (
        <DataTable key="cleaner" title="AD Cleaner policies" noun={['record', 'records']} columns={adCols} rows={policies} rowKey={(r) => r.id}
          pageSizes={[10, 20, 50, 100]} defaultPageSize={50} activeKey={sel}
          empty={<EmptyState icon="clipboard" title="No policies yet. Use Create Policy to add one." />} />
      ) : (
        <DataTable key="permission" title="Permission policies" noun={['record', 'records']} columns={permCols} rows={perm} rowKey={(r) => r.id}
          pageSizes={[10, 20, 50, 100]} defaultPageSize={50} activeKey={sel}
          empty={<EmptyState icon="clipboard" title="No permission policies yet. Use Create Policy to add one." />} />
      )}

      <ActivateDialog policy={activate} onClose={() => setActivateDlg(null)} onConfirm={() => { if (activate) doActivate(activate, true); setActivateDlg(null); }} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title={del ? `Delete “${del.name}”?` : ''} icon="alert"
        message="This removes the policy configuration. It does not change any Active Directory accounts." confirmLabel="Delete policy"
        onConfirm={() => { if (del) { removePolicy(del.id); if (fresh?.id === del.id) setFresh(null); toast({ variant: 'success', title: 'Policy deleted', message: `Policy “${del.name}” deleted` }); } setDel(null); }} />
      <ConfirmDialog open={!!remove} onClose={() => setRemove(null)} title={remove ? `Do you really want to remove “${remove.name}”?` : ''} icon="alert"
        message="The policy and its schedule are removed from Policy Management." confirmLabel="Remove"
        onConfirm={() => { if (remove) { removePerm(remove.id); toast({ variant: 'success', title: 'Policy removed', message: `“${remove.name}” was removed.` }); } setRemove(null); }} />
      <RestoreDialog policy={restore} onClose={() => setRestore(null)} onInstall={(p) => setIrrev(p)} />
      <ConfirmDialog open={!!irrev && !!restore} onClose={() => setIrrev(null)} title="You cannot revert the changes once you proceed further." icon="alert"
        message="Irreversible action" confirmLabel="I understand"
        onConfirm={() => { if (restore && irrev) { stampPerm(restore.id, { status: 'restoreQueue' }); toast({ variant: 'success', title: 'Restore', message: `“${restore.name}” will be restored to ${irrev}.` }); } setIrrev(null); setRestore(null); }} />
    </div>
  );
}
