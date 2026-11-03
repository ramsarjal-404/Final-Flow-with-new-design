import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Button, ConfirmDialog, DataTable, EmptyState, IconButton, Menu, PageHeader, Segmented, ToneTag, useToast, type Column,
} from '../../ui';
import { deliveryStore, removeDeliveryAccount, type DeliveryAccount } from '../../stores/deliveryAccounts';
import { alertsUsingAccount, detectStore, removeAlert, saveAlert, type ThreatAlert } from './model';
import { AlertDetailsPanel } from './AlertDetails';
import { AppAccountDialog, EmailAccountDialog, SiemAccountDialog } from './AccountDialogs';
import { AlertWizard } from './wizard/AlertWizard';
import { ClearableSearch, DetailsText, RowMenu } from './parts';

/* SCR-DET-01 / SCR-DET-02 · Alert Configuration (list with detail, 04 § 9). The tab lives in router
   state { tab: 'threat' | 'email' }, written with replace on every switch (survives reload/back). */

type Tab = 'threat' | 'email';
type Wiz = null | { mode: 'add' } | { mode: 'edit'; id: string };
type AccDialog = null | { kind: 'Email' | 'App' | 'SIEM'; editing?: DeliveryAccount };

export default function AlertConfiguration() {
  const toast = useToast();
  const navigate = useNavigate();
  const loc = useLocation();
  const st = (loc.state ?? {}) as { tab?: Tab; search?: string };
  const tab: Tab = st.tab === 'email' ? 'email' : 'threat';
  const alerts = detectStore.use((s) => s.alerts);
  const accounts = deliveryStore.use((s) => s.accounts);
  const [search, setSearch] = useState(st.search ?? '');
  const [openId, setOpenId] = useState<string | null>(null);
  const [wiz, setWiz] = useState<Wiz>(null);
  const [deleting, setDeleting] = useState<ThreatAlert | null>(null);
  const [accDialog, setAccDialog] = useState<AccDialog>(null);
  const [accDeleting, setAccDeleting] = useState<DeliveryAccount | null>(null);
  const [tableKey, setTableKey] = useState(0);

  const switchTab = (t: string) => {
    // INT-DET-001/002: search, sort and the detail panel reset; tab written to router state with replace.
    setSearch(''); setOpenId(null); setTableKey((k) => k + 1);
    navigate('/detect', { replace: true, state: { tab: t } });
  };
  const closePanel = useCallback(() => setOpenId(null), []);
  const statusToast = (title: string, a: ThreatAlert) =>
    toast({ variant: 'success', title, message: `${a.name} is ${a.status === 'Enabled' ? 'enabled' : 'disabled'}.` });

  /* ---------------- Threat Models ---------------- */
  const q = search.trim().toLowerCase();
  const alertRows = useMemo(() => alerts.filter((a) => !q || `${a.name} ${a.description} ${a.status}`.toLowerCase().includes(q)), [alerts, q]);
  const open = alerts.find((a) => a.id === openId) ?? null;
  const alertCols: Column<ThreatAlert>[] = [
    { key: 'name', header: 'Alert Name', sortable: true, minWidth: 220 },
    { key: 'description', header: 'Description', sortable: true, minWidth: 220 },
    { key: 'agentStatus', header: 'Agent Status', sortable: true, width: 150 },
    { key: 'status', header: 'Status', sortable: true, width: 130, render: (a) => <ToneTag tone={a.status === 'Enabled' ? 'good' : 'bad'}>{a.status}</ToneTag> },
  ];
  const alertActions = (a: ThreatAlert) => (
    <>
      {/* GAP-DET-10 intended: a view glyph for the details action. */}
      <IconButton icon="eye" label={`Details of ${a.name}`} data-tip="Alert details" onClick={() => setOpenId(a.id)} />
      <IconButton icon="edit" label={`Edit ${a.name}`} data-tip="Edit alert" onClick={() => { setOpenId(null); setWiz({ mode: 'edit', id: a.id }); }} />
      <IconButton icon="trash" danger label={`Delete ${a.name}`} data-tip="Delete alert" onClick={() => setDeleting(a)} />
    </>
  );

  /* ---------------- Email Settings ---------------- */
  const accRows = useMemo(() => accounts.filter((a) => !q || `${a.name} ${a.type} ${a.details}`.toLowerCase().includes(q)), [accounts, q]);
  const accCols: Column<DeliveryAccount>[] = [
    { key: 'name', header: 'Account Name', sortable: true, minWidth: 180 },
    { key: 'type', header: 'Type', sortable: true, width: 110 },
    { key: 'details', header: 'Details', sortable: true, wrap: true, minWidth: 360, value: (a) => a.details.replace(/ · /g, '  '), render: (a) => <DetailsText details={a.details} /> },
  ];
  // GAP-DET-07 intended: a row action menu with Edit and Delete.
  const accActions = (a: DeliveryAccount) => (
    <RowMenu label={`Actions for ${a.name}`} items={[
      { label: 'Edit', icon: 'edit', onSelect: () => setAccDialog({ kind: a.type, editing: a }) },
      { label: 'Delete', icon: 'trash', danger: true, onSelect: () => {
        const users = alertsUsingAccount(detectStore.get().alerts, a.name, a.type);
        if (users.length) {
          toast({ variant: 'error', title: 'Account in use', message: `${a.name} is used by ${users.length} alert(s). Remove it from those alerts first.` });
          return;
        }
        setAccDeleting(a);
      } },
    ]} />
  );

  /* ---------------- wizard ---------------- */
  if (wiz) {
    const editing = wiz.mode === 'edit' ? alerts.find((a) => a.id === wiz.id) : undefined;
    return (
      <AlertWizard key={wiz.mode === 'edit' ? wiz.id : 'add'} alert={editing} onClose={() => setWiz(null)}
        onSaved={(a, mode) => { saveAlert(a); setWiz(null); setSearch(''); statusToast(mode === 'add' ? 'Alert added' : 'Alert updated', a); }} />
    );
  }

  const searchBox = tab === 'threat'
    ? <ClearableSearch value={search} onChange={setSearch} ariaLabel="Search alerts" />
    : <ClearableSearch value={search} onChange={setSearch} ariaLabel="Search accounts" />;

  return (
    <div className="sub">
      <PageHeader title="Alert Configuration"
        actions={tab === 'threat'
          ? <Button variant="primary" icon="plus" onClick={() => { setOpenId(null); setWiz({ mode: 'add' }); }}>Add alert</Button>
          : <Menu label="Add account" items={[
              { label: 'Add Email Account', icon: 'mail', onSelect: () => setAccDialog({ kind: 'Email' }) },
              { label: 'Add app account', icon: 'user', onSelect: () => setAccDialog({ kind: 'App' }) },
              { label: 'Add SIEM Account', icon: 'server', onSelect: () => setAccDialog({ kind: 'SIEM' }) },
            ]} trigger={(p) => <Button variant="primary" icon="plus" iconEnd="chevron" {...p}>Add</Button>} />}>
        <div className="detect-tabs">
          <Segmented ariaLabel="Alert Configuration" value={tab} onChange={switchTab}
            items={[{ value: 'threat', label: 'Threat Models' }, { value: 'email', label: 'Email Settings' }]} />
        </div>
      </PageHeader>

      {tab === 'threat' ? (
        <div className={open ? 'with-detail' : undefined}>
          <DataTable key={'t' + tableKey} className="detect-nopager detect-actions3" title="Threat Models" noun={['alert', 'alerts']} toolbar={searchBox}
            columns={alertCols} rows={alertRows} rowKey={(a) => a.id} pageSizes={[1000]} activeKey={openId}
            onRowOpen={(a) => setOpenId((cur) => (cur === a.id ? null : a.id))} rowActions={alertActions}
            empty={alerts.length === 0 ? (
              <EmptyState icon="bell" title="No alerts yet. Click Add Alert to create one."
                action={<Button icon="plus" onClick={() => setWiz({ mode: 'add' })}>Add alert</Button>} />
            ) : undefined} />
          {open && (
            <AlertDetailsPanel alert={open} onClose={closePanel}
              onStatus={(on) => { const a = { ...open, status: on ? 'Enabled' as const : 'Disabled' as const }; saveAlert(a); statusToast('Alert updated', a); }} />
          )}
        </div>
      ) : (
        <DataTable key={'e' + tableKey} className="detect-nopager" title="Email Settings" noun={['account', 'accounts']} toolbar={searchBox}
          columns={accCols} rows={accRows} rowKey={(a) => a.id} pageSizes={[1000]} rowActions={accActions}
          empty={accounts.length === 0 ? <EmptyState icon="mail" title="No accounts yet. Click Add to configure one." /> : undefined} />
      )}

      {/* DLG-DET-03 · Delete alert confirm */}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete alert" confirmLabel="Delete"
        message={deleting ? `Delete "${deleting.name}"? It stops alerting immediately. This can't be undone.` : undefined}
        onConfirm={() => {
          if (!deleting) return;
          removeAlert(deleting.id);
          if (openId === deleting.id) setOpenId(null);
          toast({ variant: 'success', title: 'Alert deleted', message: `${deleting.name} was removed.` });
          setDeleting(null);
        }} />

      {/* Delete account confirm (GAP-DET-07 intended) */}
      <ConfirmDialog open={!!accDeleting} onClose={() => setAccDeleting(null)} title="Delete account" confirmLabel="Delete"
        message={accDeleting ? `Delete "${accDeleting.name}"? Alerts can no longer be sent through it. This can't be undone.` : undefined}
        onConfirm={() => {
          if (!accDeleting) return;
          removeDeliveryAccount(accDeleting.id);
          toast({ variant: 'success', title: 'Account deleted', message: `${accDeleting.name} was removed.` });
          setAccDeleting(null);
        }} />

      <EmailAccountDialog open={accDialog?.kind === 'Email'} editing={accDialog?.editing} onClose={() => setAccDialog(null)} />
      <AppAccountDialog open={accDialog?.kind === 'App'} editing={accDialog?.editing} onClose={() => setAccDialog(null)} />
      <SiemAccountDialog open={accDialog?.kind === 'SIEM'} editing={accDialog?.editing} onClose={() => setAccDialog(null)} />
    </div>
  );
}
