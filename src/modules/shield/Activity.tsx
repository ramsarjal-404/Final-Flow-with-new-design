// @ts-nocheck — ported from the live prototype (https://lepide-new-ui.vercel.app/shield); shapes are in ./types.ts.
/* AI Shield › Admin activity (/shield/activity): 30-day breakdown, type filter and the activity table. */
import * as React from 'react';
import { Person, Segmented, SearchField, DataTable } from '../../ui';
import { ROLES, ACTIVITY_KINDS } from './data';
import { shieldStore } from './store';
import { ShieldPage, KindChip, ago, fullDate } from './parts';

export const DAY_LENGTH = 864e5;
export function Activity() {
  const t = shieldStore.use((r) => r.activity),
    [n, o] = React.useState('all'),
    [c, d] = React.useState(''),
    u = React.useMemo(() => t.filter((r) => n === 'all' || r.kind === n), [t, n]),
    f = React.useMemo(() => {
      const r = t.filter((m) => m.actorRole === 'admin' && Date.now() - new Date(m.at).getTime() < 30 * DAY_LENGTH),
        v = new Set(r.map((m) => m.actor));
      return {
        total: r.length,
        admins: v.size,
        parts: ACTIVITY_KINDS.filter((m) => m.id !== 'system').map((m) => ({
          ...m,
          n: r.filter((p) => p.kind === m.id).length,
        })),
      };
    }, [t]),
    x = (r) => (r === 'all' ? t.length : t.filter((v) => v.kind === r).length),
    j = [
      {
        key: 'at',
        header: 'When',
        value: (r) => new Date(r.at).getTime(),
        sortable: !0,
        width: 170,
        render: (r) => <span title={fullDate(r.at)}>{ago(r.at)}</span>,
      },
      {
        key: 'actor',
        header: 'Who',
        sortable: !0,
        filterable: !0,
        width: 220,
        render: (r) => <Person name={r.actor} sub={r.actorRole === 'system' ? 'System' : ROLES[r.actorRole].label} />,
      },
      {
        key: 'action',
        header: 'Action',
        sortable: !0,
        filterable: !0,
        width: 230,
        render: (r) => (
          <b
            style={{
              fontWeight: 600,
            }}
          >
            {r.action}
          </b>
        ),
      },
      {
        key: 'detail',
        header: 'Details',
        filterable: !0,
        wrap: !0,
        minWidth: 320,
      },
      {
        key: 'kind',
        header: 'Type',
        value: (r) => {
          var v;
          return ((v = ACTIVITY_KINDS.find((m) => m.id === r.kind)) == null ? void 0 : v.label) ?? '';
        },
        sortable: !0,
        width: 190,
        render: (r) => <KindChip kind={r.kind} />,
      },
    ];
  return (
    <ShieldPage
      tab="activity"
      title="Admin activity"
      fill={!0}
      description="Every change an admin made on this server, and what the server did by itself. Decisions on requests live with the approvers, not here."
    >
      <div className="stack">
        <section className="lf-card" aria-label="Last 30 days">
          <h3 className="lf-card__title">
            Last 30 days
            <small>
              {f.total}
              {' changes by '}
              {f.admins}
              {' admin'}
              {f.admins === 1 ? '' : 's'}
            </small>
          </h3>
          <div className="shield-band" aria-hidden="true">
            {f.parts
              .filter((r) => r.n)
              .map((r) => (
                <span
                  className={'shield-band--' + r.tone}
                  style={{
                    width: `${(r.n / Math.max(1, f.total)) * 100}%`,
                  }}
                  key={r.id}
                />
              ))}
          </div>
          <ul
            className="shield-band__legend"
            style={{
              gridTemplateColumns: 'repeat(5,minmax(0,1fr))',
            }}
          >
            {f.parts.map((r) => (
              <li key={r.id}>
                <i className={'shield-band--' + r.tone} />
                {r.label}
                <b>{r.n}</b>
              </li>
            ))}
          </ul>
        </section>
        <Segmented
          ariaLabel="Type"
          hug={!0}
          value={n}
          onChange={(r) => o(r)}
          items={[
            {
              value: 'all',
              label: 'Everything',
              count: x('all'),
            },
            ...ACTIVITY_KINDS.map((r) => ({
              value: r.id,
              label: r.label,
              count: x(r.id),
            })),
          ]}
        />
        <DataTable
          columns={j}
          rows={u}
          rowKey={(r) => r.id}
          title="Activity"
          noun={['entry', 'entries']}
          search={c}
          defaultPageSize={25}
          initialSort={{
            key: 'at',
            dir: 'desc',
          }}
          toolbar={<SearchField value={c} onChange={d} placeholder="Search actions and details…" />}
        />
      </div>
    </ShieldPage>
  );
}
