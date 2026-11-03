import { useMemo, useState } from 'react';
import {
  Banner, Button, ConfirmDialog, DataTable, Drawer, EmptyState, IconButton, KeyValues, Menu, PageHeader, Person,
  SearchField, Segmented, ToneTag, useToast, type Column, type StatusTone,
} from '@lepide/ds-react';

/* Golden example — Alerts (Detect › Alert status).
   Pattern: filtered list → detail drawer → confirm → toast, with the row updating in place. */

type Severity = 'High' | 'Medium' | 'Low';
type Status = 'Open' | 'Snoozed' | 'Resolved';
type Filter = 'all' | Lowercase<Status>;

type Alert = {
  id: string;
  name: string;
  severity: Severity;
  source: string;
  user: string;
  raised: string; // ISO-like, sorts as text
  status: Status;
  events: number;
  rule: string;
  summary: string;
  note?: string;
};

const ALERTS: Alert[] = [
  { id: 'AL-2093', name: 'Mass file deletion', severity: 'High', source: 'FS-01.corp.local', user: 'CORP\\j.smith', raised: '2026-11-03 09:42', status: 'Open', events: 812,
    rule: 'More than 500 files deleted within 5 minutes', summary: '812 files were deleted from \\\\FS-01\\Finance in 4 minutes.' },
  { id: 'AL-2092', name: 'Member added to Domain Admins', severity: 'High', source: 'DC-01.corp.local', user: 'CORP\\a.okafor', raised: '2026-11-03 08:15', status: 'Open', events: 1,
    rule: 'Any change to Domain Admins membership', summary: 'CORP\\svc-sql was added to Domain Admins outside a change window.' },
  { id: 'AL-2091', name: 'Ransomware-like file renames', severity: 'High', source: 'FS-02.corp.local', user: 'CORP\\svc-backup', raised: '2026-11-03 07:58', status: 'Snoozed', events: 1240,
    rule: 'More than 200 renames to an unknown extension within 1 minute', summary: '1,240 files in \\\\FS-02\\Projects were renamed to .bak2 in 50 seconds.', note: 'Snoozed until 10:58 by Ann Lee' },
  { id: 'AL-2090', name: 'Bulk permission change on site', severity: 'Medium', source: 'SharePoint Online', user: 'l.martin@corp.com', raised: '2026-11-03 06:31', status: 'Open', events: 36,
    rule: 'More than 25 permission changes on one site within 10 minutes', summary: '36 sharing links were created on the HR Policies site.' },
  { id: 'AL-2089', name: 'Logon outside working hours', severity: 'Medium', source: 'DC-02.corp.local', user: 'CORP\\m.khan', raised: '2026-11-02 23:58', status: 'Open', events: 3,
    rule: 'Interactive logon between 22:00 and 06:00', summary: 'Three interactive logons from WS-114 between 23:58 and 00:20.' },
  { id: 'AL-2088', name: 'External mail forwarding rule', severity: 'Medium', source: 'Exchange Online', user: 'k.brown@corp.com', raised: '2026-11-02 17:21', status: 'Open', events: 1,
    rule: 'Inbox rule forwards mail outside corp.com', summary: 'A new inbox rule forwards all mail to an external Gmail address.' },
  { id: 'AL-2087', name: 'Everyone granted full control', severity: 'Medium', source: 'FS-02.corp.local', user: 'CORP\\r.patel', raised: '2026-11-02 14:07', status: 'Resolved', events: 4,
    rule: 'Full control granted to Everyone or Authenticated Users', summary: 'Full control on \\\\FS-02\\Legal was granted to Everyone.', note: 'Resolved by Raj Patel · 2 Nov 2026, 15:12' },
  { id: 'AL-2086', name: 'Disabled account re-enabled', severity: 'Low', source: 'DC-02.corp.local', user: 'CORP\\h.schmidt', raised: '2026-11-02 11:04', status: 'Resolved', events: 1,
    rule: 'A disabled account in Leavers OU is enabled', summary: 'CORP\\p.wells (Leavers OU) was enabled again.', note: 'Resolved by Ann Lee · 2 Nov 2026, 11:40' },
  { id: 'AL-2085', name: 'Repeated failed logons', severity: 'Low', source: 'DC-01.corp.local', user: 'CORP\\t.nguyen', raised: '2026-11-01 15:37', status: 'Open', events: 14,
    rule: 'More than 10 failed logons for one account within 1 minute', summary: '14 failed logons from WS-087 in 40 seconds, then the account locked.' },
  { id: 'AL-2084', name: 'Group Policy object modified', severity: 'Low', source: 'DC-01.corp.local', user: 'CORP\\a.lee', raised: '2026-11-01 09:12', status: 'Open', events: 2,
    rule: 'Any change to a linked GPO', summary: 'Default Domain Policy: the password history setting changed from 24 to 12.' },
];

const SEVERITY_TONE: Record<Severity, StatusTone> = { High: 'bad', Medium: 'warn', Low: 'none' };
const SEVERITY_RANK: Record<Severity, number> = { High: 3, Medium: 2, Low: 1 };
const STATUS_TONE: Record<Status, StatusTone> = { Open: 'info', Snoozed: 'none', Resolved: 'good' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-11-03 09:42" → "3 Nov 2026, 09:42" */
const fmt = (s: string) => { const [d, t] = s.split(' '); const [y, m, day] = d.split('-'); return `${Number(day)} ${MONTHS[Number(m) - 1]} ${y}, ${t}`; };

const columns: Column<Alert>[] = [
  { key: 'name', header: 'Alert', sortable: true, minWidth: 260 },
  { key: 'severity', header: 'Severity', sortable: true, width: 120, value: (a) => SEVERITY_RANK[a.severity],
    render: (a) => <ToneTag tone={SEVERITY_TONE[a.severity]}>{a.severity}</ToneTag> },
  { key: 'source', header: 'Source', sortable: true, mono: true, minWidth: 170 },
  { key: 'user', header: 'User', sortable: true, minWidth: 190, render: (a) => <Person name={a.user} /> },
  { key: 'raised', header: 'Raised', sortable: true, width: 170, render: (a) => fmt(a.raised), title: (a) => fmt(a.raised) },
  { key: 'status', header: 'Status', sortable: true, width: 120, render: (a) => <ToneTag tone={STATUS_TONE[a.status]}>{a.status}</ToneTag> },
];

export default function Alerts() {
  const toast = useToast();
  const [alerts, setAlerts] = useState(ALERTS);
  const [filter, setFilter] = useState<Filter>('open');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const open = alerts.find((a) => a.id === openId) ?? null;
  const confirming = alerts.find((a) => a.id === confirmId) ?? null;
  const count = (s: Status) => alerts.filter((a) => a.status === s).length;
  const rows = useMemo(() => (filter === 'all' ? alerts : alerts.filter((a) => a.status.toLowerCase() === filter)), [alerts, filter]);

  const update = (id: string, patch: Partial<Alert>) => setAlerts((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const snooze = (a: Alert) => {
    update(a.id, { status: 'Snoozed', note: 'Snoozed until 11:05 by Ann Lee' });
    toast({ title: 'Alert snoozed for 1 hour', message: `${a.name} won't notify anyone until 11:05.` });
  };
  const wake = (a: Alert) => {
    update(a.id, { status: 'Open', note: undefined });
    toast({ title: 'Snooze ended', message: `${a.name} is open again.` });
  };
  const resolve = () => {
    if (!confirming) return;
    const a = confirming;
    update(a.id, { status: 'Resolved', note: 'Resolved by Ann Lee · 3 Nov 2026, 10:05' });
    setConfirmId(null);
    setOpenId(null);
    toast({ variant: 'success', title: 'Alert resolved', message: `${a.name} (${a.id}) moved to Resolved.`,
      actions: [{ label: 'Undo', onClick: () => update(a.id, { status: a.status, note: a.note }) }] });
  };
  const exportCsv = () => {
    const t = toast({ loading: true, title: 'Exporting alerts', message: 'Preparing the CSV…' });
    window.setTimeout(() => t.update({ loading: false, variant: 'success', title: 'Export ready', message: 'alerts-2026-11-03.csv' }), 1200);
  };

  return (
    <div className="sub">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Detect', to: '/detect' }, { label: 'Alert status' }]}
        title="Alerts"
        description="Threats and policy breaches that Detect raised across your file servers, Active Directory and Microsoft 365."
        actions={<>
          <Button icon="download" onClick={exportCsv}>Export</Button>
          <Button variant="primary" icon="plus" onClick={() => toast({ title: 'Create alert', message: 'In the console this opens Detect › Alert configuration.' })}>
            Create alert
          </Button>
        </>}
      />

      <DataTable
        title="Alerts"
        noun={['alert', 'alerts']}
        rows={rows}
        rowKey={(a) => a.id}
        columns={columns}
        search={q}
        initialSort={{ key: 'raised', dir: 'desc' }}
        toolbar={<>
          <Segmented
            mode="pressed"
            hug
            ariaLabel="Alert status"
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            items={[
              { value: 'all', label: 'All', count: alerts.length },
              { value: 'open', label: 'Open', count: count('Open') },
              { value: 'snoozed', label: 'Snoozed', count: count('Snoozed') },
              { value: 'resolved', label: 'Resolved', count: count('Resolved') },
            ]}
          />
          <SearchField value={q} onChange={setQ} placeholder="Search alerts" ariaLabel="Search alerts" />
        </>}
        activeKey={openId}
        onRowOpen={(a) => setOpenId(a.id)}
        rowActions={(a) => (
          <Menu
            label={`Actions for ${a.name}`}
            trigger={(p) => <IconButton {...p} icon="more" label="More actions" />}
            items={[
              { label: 'View details', icon: 'eye', onSelect: () => setOpenId(a.id) },
              { label: 'Snooze for 1 hour', icon: 'clock', onSelect: () => snooze(a), disabled: a.status !== 'Open',
                reason: a.status === 'Snoozed' ? 'This alert is already snoozed' : 'Resolved alerts can’t be snoozed' },
              { label: 'Resolve alert', icon: 'check', onSelect: () => setConfirmId(a.id), disabled: a.status === 'Resolved', reason: 'This alert is already resolved' },
            ]}
          />
        )}
        empty={<EmptyState icon="bell" title="No alerts yet" message="Detect raises an alert here when activity matches one of your alert rules." />}
        noResults="No alerts match this filter or search."
      />

      <Drawer
        open={!!open}
        onClose={() => setOpenId(null)}
        title={open?.name ?? 'Alert'}
        subtitle={open ? `${open.id} · Raised ${fmt(open.raised)}` : undefined}
        footerNote={open?.note}
        footer={open && (open.status === 'Resolved'
          ? <Button onClick={() => setOpenId(null)}>Close</Button>
          : <>
            {open.status === 'Snoozed'
              ? <Button icon="bell" onClick={() => wake(open)}>End snooze</Button>
              : <Button icon="clock" onClick={() => snooze(open)}>Snooze</Button>}
            <Button variant="primary" icon="check" onClick={() => setConfirmId(open.id)}>Resolve alert</Button>
          </>)}
      >
        {open && <>
          {open.status === 'Resolved'
            ? <Banner tone="success">This alert is resolved and no longer notifies anyone.</Banner>
            : <Banner tone={open.severity === 'High' ? 'warning' : 'info'}>{open.summary}</Banner>}
          <KeyValues items={[
            { label: 'Severity', value: <ToneTag tone={SEVERITY_TONE[open.severity]}>{open.severity}</ToneTag> },
            { label: 'Status', value: <ToneTag tone={STATUS_TONE[open.status]}>{open.status}</ToneTag> },
            { label: 'Source', value: open.source },
            { label: 'User', value: open.user },
            { label: 'Raised', value: fmt(open.raised) },
            { label: 'Matching events', value: open.events.toLocaleString() },
            { label: 'Rule', value: open.rule, wide: true },
          ]} />
        </>}
      </Drawer>

      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirmId(null)}
        destructive={false}
        icon="check"
        title="Resolve this alert?"
        message={confirming ? `${confirming.name} moves to Resolved and stops notifying its recipients. You can undo this from the notification.` : undefined}
        confirmLabel="Resolve alert"
        onConfirm={resolve}
      />
    </div>
  );
}
