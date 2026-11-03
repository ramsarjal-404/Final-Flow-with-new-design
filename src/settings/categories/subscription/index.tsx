import { useCallback, useMemo, useState } from 'react';
import {
  Button, Chip, ConfirmDialog, DataTable, EmptyState, Icon, IconButton, SearchField, Segmented, Toggle, useToast,
} from '../../../ui';
import type { Column } from '../../../ui';
import { HeaderActions } from '../../SettingsFrame';
import { deleteSubscription, saveSubscription, setSubscriptionEnabled, subStore } from '../../../stores/subscription';
import type { Subscription } from '../../../stores/subscription';
import InfoPanel from './InfoPanel';
import StatusTab from './StatusTab';
import SubscriptionWizard from './Wizard';
import './styles.css';

/* SCR-SAD-12 Manage Subscription + SCR-SAD-13 Subscription Status (tabs are page state),
   DLG-SAD-24 panel, DLG-SAD-25 wizard, DLG-SAD-28 delete. Subscriptions live in the subscription
   module store; tab, search, sort, selection, panel and the "New" marker are page-local. */

type Tab = 'manage' | 'status';
const plural = (n: number, w: string) => (n === 1 ? `${n} ${w}` : `${n} ${w}(s)`);

export default function SubscriptionPage() {
  const toast = useToast();
  const subs = subStore.use((s) => s.subscriptions);
  const [tab, setTab] = useState<Tab>('manage');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState(false);
  const [wizard, setWizard] = useState<null | { editing?: Subscription }>(null);
  const [pending, setPending] = useState<Subscription | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [tableKey, setTableKey] = useState(0);
  const [sortCleared, setSortCleared] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? subs.filter((s) => `${s.name} ${s.description}`.toLowerCase().includes(q)) : subs;
  }, [subs, search]);
  const current = subs.find((s) => s.id === selected) ?? null;
  const closePanel = useCallback(() => setPanel(false), []);

  const switchTab = (v: string) => { setTab(v as Tab); setPanel(false); };
  const openWizard = (editing?: Subscription) => { setPanel(false); setWizard({ editing }); };
  const openRow = (s: Subscription) => {
    if (panel && selected === s.id) { setPanel(false); return; }
    setSelected(s.id); setPanel(true);
  };
  const openInfo = () => {
    const target = (selected && rows.find((r) => r.id === selected)) || [...rows].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))[0];
    if (!target) { toast({ variant: 'info', title: 'Subscription Information', message: 'Add a subscription to see its details here.' }); return; }
    setSelected(target.id); setPanel(true);
  };
  const toggle = (s: Subscription, on: boolean) => {
    setSubscriptionEnabled(s.id, on);
    toast(on
      ? { variant: 'success', title: 'Subscription enabled', message: `${s.name} will be delivered on schedule.` }
      : { variant: 'success', title: 'Subscription disabled', message: `${s.name} is paused until you turn it back on.` });
  };
  const onSaved = (s: Subscription, isNew: boolean) => {
    saveSubscription(s);
    if (isNew) { setFresh(s.id); setSortCleared(true); setTableKey((k) => k + 1); }
    setWizard(null); setTab('manage'); setSearch(''); setSelected(s.id);
    toast({
      variant: 'success', title: isNew ? 'Subscription added' : 'Subscription updated',
      message: `${s.name} is ${s.enabled ? 'enabled' : 'disabled'} with ${plural(s.schedules.length, 'schedule')}.`,
    });
  };

  const columns: Column<Subscription>[] = [
    {
      key: 'name', header: 'Subscription Name', sortable: true, minWidth: 220, value: (s) => s.name,
      render: (s) => (
        <span className="subscription-name" title={s.name}>
          <span className="subscription-name__text">{s.name}</span>{s.id === fresh && <Chip tone="brand">New</Chip>}
        </span>
      ),
    },
    { key: 'description', header: 'Description', sortable: true, minWidth: 220, value: (s) => s.description || '-' },
    {
      key: 'status', header: 'Status', sortable: true, width: 110, value: (s) => (s.enabled ? 0 : 1),
      render: (s) => <Toggle checked={s.enabled} label={`${s.enabled ? 'Disable' : 'Enable'} ${s.name}`} onChange={(v) => toggle(s, v)} />,
    },
    {
      key: 'actions', header: 'Action', width: 104,
      render: (s) => (
        <span className="row">
          <IconButton icon="edit" label={`Edit ${s.name}`} data-tip="Edit subscription" onClick={() => openWizard(s)} />
          <IconButton icon="trash" danger label={`Delete ${s.name}`} data-tip="Delete subscription" onClick={() => setPending(s)} />
        </span>
      ),
    },
  ];

  return (
    <>
      <HeaderActions>
        {tab === 'manage' && <SearchField value={search} onChange={setSearch} placeholder="Search" ariaLabel="Search subscriptions" style={{ width: 240 }} />}
        <Button variant="primary" icon="plus" onClick={() => openWizard()}>Subscribe</Button>
      </HeaderActions>

      <div className="subscription-tabs">
        <Segmented ariaLabel="Subscription" value={tab} onChange={switchTab}
          items={[{ value: 'manage', label: 'Manage Subscription' }, { value: 'status', label: 'Subscription Status' }]} />
      </div>

      {tab === 'manage' ? (
        <div className={panel && current ? 'with-detail' : undefined}>
          <div className="stack">
            <DataTable key={tableKey} className="subscription-table" title="Manage Subscription" noun={['subscription', 'subscriptions']}
              columns={columns} rows={rows} rowKey={(s) => s.id} onRowOpen={openRow} activeKey={selected}
              initialSort={sortCleared ? undefined : { key: 'name', dir: 'asc' }}
              empty={subs.length === 0 ? <EmptyState compact icon="send" title="No subscriptions yet. Click Subscribe to schedule a report." /> : undefined} />
            {!(panel && current) && (
              <button type="button" className="lf-card subscription-infobar" aria-label="Open subscription information" onClick={openInfo}>
                <Icon name="info" /><span>Subscription Information</span><Icon name="chevron-right" />
              </button>
            )}
          </div>
          {panel && current && (
            <InfoPanel key={current.id} sub={current} onClose={closePanel} onEdit={() => openWizard(current)} />
          )}
        </div>
      ) : <StatusTab />}

      {wizard && <SubscriptionWizard editing={wizard.editing} onClose={() => setWizard(null)} onSaved={onSaved} />}
      <ConfirmDialog open={!!pending} onClose={() => setPending(null)} title="Delete subscription" confirmLabel="Delete"
        message={pending ? `Delete "${pending.name}"? Its reports stop being delivered. This can't be undone.` : undefined}
        onConfirm={() => {
          if (!pending) return;
          deleteSubscription(pending.id);
          if (selected === pending.id) { setPanel(false); setSelected(null); }
          toast({ variant: 'success', title: 'Subscription deleted', message: `${pending.name} was removed.` });
          setPending(null);
        }} />
    </>
  );
}
