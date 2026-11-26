// @ts-nocheck — ported from the live prototype (https://lepide-new-ui.vercel.app/shield); shapes are in ./types.ts.
/* AI Shield › Sessions (/shield/sessions): outcome filter, sessions table and the session detail panel with "Mark as reviewed". */
import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { Chip, Icon, Button, Person, useToast, Segmented, SearchField, DetailPanel, DataTable } from '../../ui';
import { actionOf, OUTCOMES } from './data';
import { shieldStore, personByEmail, markSessionReviewed } from './store';
import { ShieldPage, RiskChip, OutcomeTag, ago, fullDate } from './parts';

export const OUTCOME_ICONS = {
  blocked: 'lock',
  paused: 'pause',
  warned: 'alert',
  review: 'eye',
  clean: 'check',
};
export function Sessions() {
  var l;
  const t = useToast(),
    n = useLocation(),
    o = shieldStore.use(),
    [c, d] = React.useState(((l = n.state) == null ? void 0 : l.filter) ?? 'all'),
    [u, f] = React.useState(''),
    [x, j] = React.useState(null);
  React.useEffect(() => {
    x && !o.sessions.some((a) => a.id === x) && j(null);
  }, [o.sessions, x]);
  const r = (a) => o.categories.find((h) => h.id === a) ?? null,
    v = React.useMemo(() => o.sessions.filter((a) => c === 'all' || a.outcome === c), [o.sessions, c]),
    m = (a) => (a === 'all' ? o.sessions.length : o.sessions.filter((h) => h.outcome === a).length),
    p = o.sessions.find((a) => a.id === x) ?? null,
    s = [
      {
        key: 'person',
        header: 'Person',
        value: (a) => {
          var h;
          return ((h = personByEmail(a.person)) == null ? void 0 : h.name) ?? a.person;
        },
        sortable: !0,
        filterable: !0,
        minWidth: 200,
        render: (a) => {
          const h = personByEmail(a.person);
          return <Person name={(h == null ? void 0 : h.name) ?? a.person} sub={h == null ? void 0 : h.unit} />;
        },
      },
      {
        key: 'tool',
        header: 'AI tool',
        sortable: !0,
        filterable: !0,
        width: 150,
      },
      {
        key: 'outcome',
        header: 'What happened',
        value: (a) => OUTCOMES[a.outcome].short,
        sortable: !0,
        filterable: !0,
        width: 170,
        render: (a) => (
          <span className="row">
            <OutcomeTag outcome={a.outcome} short={!0} />
            {a.outcome === 'review' && a.reviewed && (
              <Chip tone="good" icon="check">
                Reviewed
              </Chip>
            )}
          </span>
        ),
      },
      {
        key: 'category',
        header: 'Sensitive data',
        value: (a) => {
          var h;
          return ((h = r(a.category)) == null ? void 0 : h.short) ?? '';
        },
        sortable: !0,
        filterable: !0,
        width: 150,
        render: (a) => {
          var h;
          return ((h = r(a.category)) == null ? void 0 : h.short) ?? <span className="lf-na">—</span>;
        },
      },
      {
        key: 'risk',
        header: 'Risk',
        value: (a) => {
          var h;
          return ((h = r(a.category)) == null ? void 0 : h.risk) ?? '';
        },
        sortable: !0,
        width: 130,
        render: (a) => {
          const h = r(a.category);
          return h ? <RiskChip risk={h.risk} /> : <span className="lf-na">—</span>;
        },
      },
      {
        key: 'endpoint',
        header: 'Endpoint',
        mono: !0,
        sortable: !0,
        filterable: !0,
        width: 130,
      },
      {
        key: 'at',
        header: 'When',
        value: (a) => new Date(a.at).getTime(),
        sortable: !0,
        width: 150,
        render: (a) => ago(a.at),
      },
    ],
    i = (a) => {
      var h;
      markSessionReviewed(a.id),
        t({
          variant: 'success',
          title: 'Session reviewed',
          message: `${((h = personByEmail(a.person)) == null ? void 0 : h.name) ?? a.person}'s ${a.tool} session is recorded as reviewed.`,
        });
    };
  return (
    <ShieldPage
      tab="sessions"
      title="Sessions"
      fill={!0}
      description="Every prompt and upload the endpoint agent saw, what the protection policy found in it, and what happened next."
    >
      <div className="stack">
        <Segmented
          ariaLabel="Outcome"
          hug={!0}
          value={c}
          onChange={(a) => {
            d(a), j(null);
          }}
          items={[
            {
              value: 'all',
              label: 'All',
              count: m('all'),
            },
            ...Object.keys(OUTCOMES).map((a) => ({
              value: a,
              label: OUTCOMES[a].short,
              count: m(a),
            })),
          ]}
        />
        <div className={'shield-sessions' + (p ? ' with-detail' : '')}>
          <DataTable
            columns={s}
            rows={v}
            rowKey={(a) => a.id}
            title="Sessions"
            noun={['session', 'sessions']}
            search={u}
            initialSort={{
              key: 'at',
              dir: 'desc',
            }}
            toolbar={<SearchField value={u} onChange={f} placeholder="Search people, AI tools, or reasons…" />}
            onRowOpen={(a) => j(a.id === x ? null : a.id)}
            activeKey={x}
            defaultPageSize={25}
          />
          {p &&
            (() => {
              const a = r(p.category),
                h = personByEmail(p.person),
                S = OUTCOMES[p.outcome];
              return (
                <DetailPanel
                  title={S.headline((a == null ? void 0 : a.short) ?? 'Sensitive content')}
                  subtitle={`${(h == null ? void 0 : h.name) ?? p.person} · ${p.tool} · ${fullDate(p.at)}`}
                  onClose={() => j(null)}
                  footer={
                    p.outcome === 'review' && !p.reviewed ? (
                      <>
                        <span className="lf-muted grow">Sensitive data was found and the policy let it through.</span>
                        <Button variant="primary" icon="check" onClick={() => i(p)}>
                          Mark as reviewed
                        </Button>
                      </>
                    ) : (
                      <span className="lf-muted">
                        {p.reviewed
                          ? 'Reviewed. Nothing further needed.'
                          : 'Nothing to decide here; the policy already acted.'}
                      </span>
                    )
                  }
                >
                  <div className="stack">
                    <div className="shield-headline">
                      <span className={'shield-headline__ic shield-headline__ic--' + S.tone}>
                        <Icon name={OUTCOME_ICONS[p.outcome]} size={18} />
                      </span>
                      <div>
                        <b>{S.label}</b>
                        <small>
                          {a
                            ? `${a.title} · policy says ${actionOf(a.action).label.toLowerCase()}`
                            : 'No protection policy matched'}
                        </small>
                      </div>
                    </div>
                    <div>
                      <p className="shield-section">{p.file ? 'Upload' : 'Prompt'}, as recorded</p>
                      {p.file ? (
                        <p className="shield-preview shield-preview--file">
                          <Icon name="file" size={16} />
                          <span>{p.file}</span>
                          <span className="lf-muted">
                            {'· '}
                            {p.preview}
                          </span>
                        </p>
                      ) : (
                        <pre className="shield-preview">{p.preview}</pre>
                      )}
                      <p
                        className="lf-muted"
                        style={{
                          margin: '6px 0 0',
                          fontSize: 12,
                        }}
                      >
                        Secrets, card numbers and personal identifiers are masked before anything is stored.
                      </p>
                    </div>
                    {p.keywords.length > 0 && (
                      <div>
                        <p className="shield-section">What was found</p>
                        <div className="shield-kw">
                          {p.keywords.map((R) => (
                            <Chip tone="warn" key={R}>
                              {R}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="shield-section">Details</p>
                      <div className="shield-facts">
                        <span className="shield-fact">
                          <span className="shield-fact__l">Person</span>
                          <span className="shield-fact__v">
                            {(h == null ? void 0 : h.name) ?? p.person}
                            {h != null && h.unit ? ` · ${h.unit}` : ''}
                          </span>
                        </span>
                        <span className="shield-fact">
                          <span className="shield-fact__l">AI tool</span>
                          <span className="shield-fact__v">{p.tool}</span>
                        </span>
                        <span className="shield-fact">
                          <span className="shield-fact__l">Endpoint</span>
                          <span className="shield-fact__v">{p.endpoint}</span>
                        </span>
                        <span className="shield-fact">
                          <span className="shield-fact__l">Asked at</span>
                          <span className="shield-fact__v">{fullDate(p.at)}</span>
                        </span>
                        {a && (
                          <span className="shield-fact">
                            <span className="shield-fact__l">Policy</span>
                            <span className="shield-fact__v">{a.title}</span>
                          </span>
                        )}
                        {a && (
                          <span className="shield-fact">
                            <span className="shield-fact__l">Risk</span>
                            <span className="shield-fact__v">
                              <RiskChip risk={a.risk} />
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="shield-section">Timeline</p>
                      <ol className="shield-timeline">
                        <li>
                          {p.file ? 'Upload started' : 'Prompt typed'}
                          {' in '}
                          {p.tool}
                          <small>{fullDate(p.at)}</small>
                        </li>
                        {a ? (
                          <li>
                            {'Matched '}
                            <b>{a.title}</b>
                            {' · '}
                            {p.keywords.length}
                            {' keyword'}
                            {p.keywords.length === 1 ? '' : 's'}
                            <small>Scanned on the endpoint before anything left it</small>
                          </li>
                        ) : (
                          <li>
                            No keyword matched<small>Scanned on the endpoint before anything left it</small>
                          </li>
                        )}
                        <li>
                          {S.label}
                          <small>
                            {a ? `Policy action: ${actionOf(a.action).label}` : 'Sent with no interruption'}
                          </small>
                        </li>
                        {p.reviewed && (
                          <li>
                            Reviewed by an admin<small>Recorded in Admin activity</small>
                          </li>
                        )}
                      </ol>
                    </div>
                  </div>
                </DetailPanel>
              );
            })()}
        </div>
      </div>
    </ShieldPage>
  );
}
