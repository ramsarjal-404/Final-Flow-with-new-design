/* AI Shield › Admin activity (/shield/activity): 30-day breakdown, type filter and the activity table. */
import { useState } from 'react';
import { DataTable, Person, SearchField, Segmented, type Column } from '../../ui';
import { ACTIVITY_KINDS, DAY, ROLES } from './data';
import { shieldStore } from './store';
import { ago, fullDate, KindChip, ShieldPage } from './parts';
import type { ActivityEntry, ActivityKind } from './types';

type Filter = ActivityKind | 'all';

export function Activity() {
  const activity = shieldStore.use((s) => s.activity);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const rows = activity.filter((a) => filter === 'all' || a.kind === filter);
  const countOf = (f: Filter) => (f === 'all' ? activity.length : activity.filter((a) => a.kind === f).length);

  // Changes by admins in the last 30 days, split by type (System is not an admin change).
  const adminChanges = activity.filter((a) => a.actorRole === 'admin' && Date.now() - new Date(a.at).getTime() < 30 * DAY);
  const adminCount = new Set(adminChanges.map((a) => a.actor)).size;
  const parts = ACTIVITY_KINDS.filter((k) => k.id !== 'system').map((k) => ({ ...k, count: adminChanges.filter((a) => a.kind === k.id).length }));

  const columns: Column<ActivityEntry>[] = [
    {
      key: 'at', header: 'When', value: (a) => new Date(a.at).getTime(), sortable: true, width: 170,
      render: (a) => <span title={fullDate(a.at)}>{ago(a.at)}</span>,
    },
    {
      key: 'actor', header: 'Who', sortable: true, filterable: true, width: 220,
      render: (a) => <Person name={a.actor} sub={a.actorRole === 'system' ? 'System' : ROLES[a.actorRole].label} />,
    },
    { key: 'action', header: 'Action', sortable: true, filterable: true, width: 230, render: (a) => <b style={{ fontWeight: 600 }}>{a.action}</b> },
    { key: 'detail', header: 'Details', filterable: true, wrap: true, minWidth: 320 },
    {
      key: 'kind', header: 'Type', value: (a) => ACTIVITY_KINDS.find((k) => k.id === a.kind)?.label ?? '', sortable: true, width: 190,
      render: (a) => <KindChip kind={a.kind} />,
    },
  ];

  return (
    <ShieldPage
      tab="activity"
      title="Admin activity"
      fill
      description="Every change an admin made on this server, and what the server did by itself. Decisions on requests live with the approvers, not here."
    >
      <div className="stack">
        <section className="lf-card" aria-label="Last 30 days">
          <h3 className="lf-card__title">
            Last 30 days<small>{adminChanges.length} changes by {adminCount} admin{adminCount === 1 ? '' : 's'}</small>
          </h3>
          <div className="shield-band" aria-hidden="true">
            {parts.filter((k) => k.count).map((k) => (
              <span key={k.id} className={'shield-band--' + k.tone} style={{ width: `${(k.count / Math.max(1, adminChanges.length)) * 100}%` }} />
            ))}
          </div>
          <ul className="shield-band__legend" style={{ gridTemplateColumns: 'repeat(5,minmax(0,1fr))' }}>
            {parts.map((k) => (
              <li key={k.id}><i className={'shield-band--' + k.tone} />{k.label}<b>{k.count}</b></li>
            ))}
          </ul>
        </section>
        <Segmented
          ariaLabel="Type"
          hug
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          items={[
            { value: 'all', label: 'Everything', count: countOf('all') },
            ...ACTIVITY_KINDS.map((k) => ({ value: k.id, label: k.label, count: countOf(k.id) })),
          ]}
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(a) => a.id}
          title="Activity"
          noun={['entry', 'entries']}
          search={search}
          defaultPageSize={25}
          initialSort={{ key: 'at', dir: 'desc' }}
          toolbar={<SearchField value={search} onChange={setSearch} placeholder="Search actions and details…" />}
        />
      </div>
    </ShieldPage>
  );
}
