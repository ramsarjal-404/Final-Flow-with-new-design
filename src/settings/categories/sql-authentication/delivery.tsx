import { useEffect, useState } from 'react';
import {
  Button, ConfirmDialog, DataTable, EmptyState, Icon, IconButton, KeyValues, Modal, TextField, useToast, type Column, type IconName,
} from '../../../ui';
import { uid } from '../../../stores/createStore';
import { deliveryStore, removeDeliveryAccount, updateDeliveryAccount, type DeliveryAccount } from '../../../stores/deliveryAccounts';
import { HeaderActions } from '../../SettingsFrame';
import { AppAccountDialog, EmailAccountDialog, ScriptAccountDialog } from '../configure-notifications/shared/DetectAccountDialogs';
import { detailPairs, isIpOrHost } from '../configure-notifications/shared/util';
import { sqlStore, type DeliveryKind, type DeliveryRow } from './store';

const addRow = (r: Omit<DeliveryRow, 'id'>) => sqlStore.set((s) => ({ ...s, rows: [...s.rows, { ...r, id: uid('dlv') }] }));
const DETAIL_TITLE: Record<DeliveryKind, string> = { Email: 'Email Account Details', 'Mobile App': 'App Account Details', 'Execute Script': 'Alert Profile Account Details' };

/* ---------------- SCR-SAD-20 · Manage Delivery Settings ---------------- */
export function DeliverySettings({ title }: { title: string }) {
  const toast = useToast();
  const rows = sqlStore.use((s) => s.rows);
  const [adding, setAdding] = useState(false);
  const [detect, setDetect] = useState<'email' | 'app' | 'script' | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [appServer, setAppServer] = useState(false);
  const byId = (id: string | null) => rows.find((r) => r.id === id) ?? null;

  const pick = (k: 'email' | 'app' | 'script') => { setAdding(false); setDetect(k); };
  const fromAccount = (a: DeliveryAccount, kind: DeliveryKind) => addRow({ name: a.name, kind, details: detailPairs(a.details), accountId: a.id });

  const columns: Column<DeliveryRow>[] = [
    { key: 'name', header: 'Account Name', sortable: true, minWidth: 200 },
    { key: 'kind', header: 'Delivery Type', sortable: true },
    {
      key: 'action', header: 'Action', value: () => '', width: 150,
      render: (r) => (
        <span className="row">
          <IconButton icon="edit" label={`Edit ${r.name}`} data-tip="Edit" onClick={() => setEditing(r.id)} />
          <IconButton icon="trash" danger label={`Delete ${r.name}`} data-tip="Delete" onClick={() => setDeleting(r.id)} />
          <IconButton icon="eye" label={`View ${r.name}`} data-tip="View details" onClick={() => setViewing(r.id)} />
        </span>
      ),
    },
  ];

  const view = byId(viewing);
  const del = byId(deleting);
  const edit = byId(editing);

  return (
    <>
      <HeaderActions>
        <Button icon="refresh" onClick={() => toast({ variant: 'info', title: 'Delivery settings refreshed', message: 'The account list is up to date.' })}>Refresh</Button>
        <Button icon="server" onClick={() => setAppServer(true)}>App server settings</Button>
        <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Add</Button>
      </HeaderActions>

      <DataTable title={title} noun={['account', 'accounts']} columns={columns} rows={rows} rowKey={(r) => r.id}
        empty={<EmptyState icon="send" title="No delivery accounts yet. Click Add to configure one." compact />} />

      {/* DLG-SAD-43 · Add Delivery Type */}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add Delivery Type" icon="plus" size="md"
        footer={<Button onClick={() => setAdding(false)}>Cancel</Button>}>
        <div className="pick-grid">
          {([['email', 'mail', 'Add Email Account'], ['app', 'user', 'Add app account'], ['script', 'terminal', 'Add Alert Profile']] as [typeof detect, IconName, string][])
            .map(([k, icon, label]) => (
              <button key={label} type="button" className="pick" onClick={() => pick(k!)}>
                <span className="pick__ic" aria-hidden="true"><Icon name={icon} /></span>
                <span className="pick__text"><b>{label}</b></span>
              </button>
            ))}
        </div>
      </Modal>

      <EmailAccountDialog open={detect === 'email'} onClose={() => setDetect(null)} onCreated={(a) => fromAccount(a, 'Email')} />
      <AppAccountDialog open={detect === 'app'} onClose={() => setDetect(null)} onCreated={(a) => fromAccount(a, 'Mobile App')} />
      <ScriptAccountDialog open={detect === 'script'} onClose={() => setDetect(null)} onCreated={(name) => {
        addRow({ name, kind: 'Execute Script', details: [['Account Name', name], ['Used for', 'Running alert scripts']], scriptName: name });
        toast({ variant: 'success', title: 'Alert profile added', message: `${name} can now run alert scripts.` });
      }} />

      {/* DLG-SAD-44 · Account Details */}
      <Modal open={!!view} onClose={() => setViewing(null)} title={view ? DETAIL_TITLE[view.kind] : ''} icon="eye" size="md"
        footer={<Button variant="primary" onClick={() => setViewing(null)}>Close</Button>}>
        {view && <KeyValues items={view.details.map(([label, value]) => ({ label, value: value === '—' ? '' : value }))} />}
      </Modal>

      <EditDeliveryDialog row={edit} rows={rows} onClose={() => setEditing(null)} />

      {/* DLG-SAD-46 · Delete delivery account */}
      <ConfirmDialog open={!!del} onClose={() => setDeleting(null)} title="Delete delivery account" confirmLabel="Delete"
        message={del ? `Delete "${del.name}"? Alerts and reports stop using it.` : undefined}
        onConfirm={() => {
          if (!del) return;
          sqlStore.set((s) => ({ ...s, rows: s.rows.filter((r) => r.id !== del.id) }));
          // GAP-SAD-03 intended (AC-SAD-168): the matching Detect account goes too.
          if (del.accountId) removeDeliveryAccount(del.accountId);
          if (del.scriptName) deliveryStore.set((s) => ({ ...s, scriptAccounts: s.scriptAccounts.filter((x) => x !== del.scriptName) }));
          setDeleting(null);
          toast({ variant: 'success', title: 'Account deleted', message: `${del.name} was removed.` });
        }} />

      <AppServerDialog open={appServer} onClose={() => setAppServer(false)} />
    </>
  );
}

/* ---------------- DLG-SAD-45 · Edit Delivery Account ---------------- */
function EditDeliveryDialog({ row, rows, onClose }: { row: DeliveryRow | null; rows: DeliveryRow[]; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  useEffect(() => { if (row) setName(row.name); }, [row?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = name.trim();
  const err = !n ? 'Enter a name.' : rows.some((r) => r.id !== row?.id && r.name.toLowerCase() === n.toLowerCase()) ? 'Another account already uses this name.' : null;
  const save = () => {
    if (!row || err) return;
    const old = row.name;
    sqlStore.set((s) => ({
      ...s,
      rows: s.rows.map((r) => (r.id === row.id ? {
        ...r, name: n, scriptName: r.scriptName !== undefined ? n : undefined,
        details: r.details.map(([k, v]) => [k, (k === 'Account Name' || k === 'User ID') && v === old ? n : v] as [string, string]),
      } : r)),
    }));
    // keep the shared Detect record in step (GAP-SAD-03 intended: one shared store)
    if (row.accountId) updateDeliveryAccount(row.accountId, { name: n });
    if (row.scriptName) deliveryStore.set((s) => ({ ...s, scriptAccounts: s.scriptAccounts.map((x) => (x === row.scriptName ? n : x)) }));
    onClose();
    toast({ variant: 'success', title: 'Account updated', message: `${old} is now ${n}.` });
  };
  return (
    <Modal open={!!row} onClose={onClose} title="Edit Delivery Account" icon="edit" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!!err} onClick={save}>Save</Button></>}>
      <TextField label="Account Name" value={name} onChange={setName} error={err}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} />
      <TextField label="Delivery Type" value={row?.kind ?? ''} readOnly disabled />
    </Modal>
  );
}

/* ---------------- DLG-SAD-47 · Lepide App Server Settings ---------------- */
function AppServerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [v, setV] = useState('');
  useEffect(() => { if (open) setV(sqlStore.get().appServer); }, [open]);
  const t = v.trim();
  const err = t !== '' && !isIpOrHost(t) ? 'Enter an IP address or host name.' : null;
  const done = () => {
    if (!t || err) return;
    sqlStore.set((s) => ({ ...s, appServer: t }));
    onClose();
    toast({ variant: 'success', title: 'App server saved', message: `App data is saved on ${t}.` });
  };
  return (
    <Modal open={open} onClose={onClose} title="Lepide App Server Settings" icon="server" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!t || !!err} onClick={done}>Done</Button></>}>
      <p className="sql-authentication-lead">Select the location where the App data will be saved.</p>
      <TextField value={v} onChange={setV} error={err}
        label={<span className="sql-authentication-lbl">My Own Server
          <IconButton icon="info" size={14} label="About the app server" className="sql-authentication-info" aria-describedby="sql-auth-app-server-tip"
            data-tip="The Lepide mobile and Windows apps connect to this server to receive alerts." />
          <span id="sql-auth-app-server-tip" className="sr-only">The Lepide mobile and Windows apps connect to this server to receive alerts.</span>
        </span>}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); done(); } }} />
    </Modal>
  );
}
