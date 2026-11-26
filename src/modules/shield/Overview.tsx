// @ts-nocheck — ported from the live prototype (https://lepide-new-ui.vercel.app/shield); shapes are in ./types.ts.
/* AI Shield › Overview (/shield): status strip, four KPI cards, sessions-by-day chart, outcomes donut, sessions needing review, agents needing attention and admin activity. */
import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Chip, Icon, Button, Person, KpiCard, Chart } from '../../ui';
import { OUTCOMES, ACTIVITY_KINDS } from './data';
import { shieldStore, personByEmail, keywordCount } from './store';
import { ShieldPage, OutcomeTag, ago } from './parts';

export const ONE_DAY = 864e5;
export const OUTCOME_COLORS = {
  blocked: 'var(--dch-crimson)',
  paused: 'var(--dch-amber)',
  warned: 'var(--chart-yellow)',
  review: 'var(--dch-indigo)',
  clean: 'var(--chart-green)',
};
export function Overview() {
  const t = useNavigate(),
    n = shieldStore.use(),
    o = Date.now(),
    c = n.people.filter((s) => s.role === 'approver' && s.status !== 'left'),
    d = React.useMemo(
      () => ({
        total: n.endpoints.length,
        protectedN: n.endpoints.filter((s) => s.agent === 'active' && s.extension).length,
        gaps: n.endpoints.filter((s) => s.agent === 'active' && !s.extension).length,
        attention: n.endpoints
          .filter((s) => s.agent !== 'active')
          .sort((s, i) => (s.agent === 'none' ? -1 : 1) - (i.agent === 'none' ? -1 : 1)),
      }),
      [n.endpoints],
    ),
    u = React.useMemo(() => {
      const s = Array.from(
          {
            length: 7,
          },
          (h, S) => {
            const R = new Date(o - (6 - S) * ONE_DAY);
            return R.setHours(0, 0, 0, 0), R;
          },
        ),
        i = s.map(
          (h) =>
            n.sessions.filter((S) => {
              const R = new Date(S.at).getTime();
              return R >= h.getTime() && R < h.getTime() + ONE_DAY;
            }).length,
        ),
        l = Math.max(4, ...i),
        a = Math.ceil(l / 4);
      return {
        labels: s.map((h) =>
          h.toLocaleDateString('en-US', {
            weekday: 'short',
          }),
        ),
        values: i,
        yTicks: [0, a, a * 2, a * 3, a * 4],
      };
    }, [n.sessions, o]),
    f = n.sessions.filter((s) => o - new Date(s.at).getTime() < 7 * ONE_DAY),
    x = Object.keys(OUTCOMES)
      .map((s) => ({
        label: OUTCOMES[s].short,
        value: f.filter((i) => i.outcome === s).length,
        color: OUTCOME_COLORS[s],
      }))
      .filter((s) => s.value > 0),
    j = f.filter((s) => s.outcome === 'blocked' || s.outcome === 'paused').length,
    r = new Set(n.sessions.map((s) => s.tool)).size,
    v = n.sessions.filter((s) => s.outcome === 'review' && !s.reviewed),
    m = React.useMemo(() => {
      const s = n.activity.filter((i) => i.actorRole === 'admin' && o - new Date(i.at).getTime() < 30 * ONE_DAY);
      return {
        total: s.length,
        parts: ACTIVITY_KINDS.filter((i) => i.id !== 'system')
          .map((i) => ({
            ...i,
            n: s.filter((l) => l.kind === i.id).length,
          }))
          .filter((i) => i.n > 0),
      };
    }, [n.activity, o]),
    p = (s) =>
      Array.from(
        {
          length: 8,
        },
        (i, l) => Math.round(6 + 4 * Math.sin(l * 0.9 + s) + l * 0.6),
      );
  return (
    <ShieldPage
      tab="overview"
      title="AI Shield"
      chip={
        <Chip tone="good" icon="check">
          Server live
        </Chip>
      }
      description="The server is live, approvers are in place and agents are reporting. This is what happened across your AI tools and what still needs a look."
    >
      <div className="stack">
        <section className="lf-card shield-status" aria-label="Shield status">
          <div className="shield-status__cell">
            <span className="shield-status__ic">
              <Icon name="users" size={17} />
            </span>
            <div className="grow">
              <b>
                {c.length}
                {' approver'}
                {c.length === 1 ? '' : 's'}
                {' in place'}
              </b>
              <small>
                {c.length ? `${c.map((s) => s.name).join(', ')} decides requests` : 'Nobody can decide a request yet'}
              </small>
            </div>
            <Link className="lf-link" to="/shield/people">
              Manage people
            </Link>
          </div>
          <div className="shield-status__cell">
            <span className={'shield-status__ic' + (d.attention.length ? ' shield-status__ic--warn' : '')}>
              <Icon name="cpu" size={17} />
            </span>
            <div className="grow">
              <b>
                {d.protectedN}
                {' of '}
                {d.total}
                {' endpoints protected'}
              </b>
              <small>
                {d.attention.length ? `${d.attention.length} need attention` : 'Agent and extension reporting'}
                {d.gaps ? ` · ${d.gaps} extension gap${d.gaps === 1 ? '' : 's'}` : ''}
              </small>
            </div>
            <Link className="lf-link" to="/shield/server">
              Server
            </Link>
          </div>
          <div className="shield-status__cell">
            <span className="shield-status__ic">
              <Icon name="shield" size={17} />
            </span>
            <div className="grow">
              <b>
                {'Policy version '}
                {n.policyVersion}
              </b>
              <small>
                {n.categories.length}
                {' policies · '}
                {keywordCount(n.categories)}
                {' keywords · published '}
                {ago(n.policyPublishedAt)}
              </small>
            </div>
            <Link className="lf-link" to="/shield/policy">
              Review policy
            </Link>
          </div>
        </section>
        <div className="kpis">
          <KpiCard
            label="Endpoints protected"
            value={d.protectedN}
            foot={`of ${d.total} · fills in as endpoints check in`}
            spark={p(1)}
            onClick={() => t('/shield/server')}
          />
          <KpiCard
            label="Sessions this week"
            value={f.length}
            delta={`${v.length} need review`}
            deltaTone={v.length ? 'brand' : 'flat'}
            foot="Every prompt the agent saw"
            spark={p(2)}
            onClick={() => t('/shield/sessions')}
          />
          <KpiCard
            label="High-risk activity blocked"
            value={j}
            delta="7 days"
            deltaTone="bad"
            foot="When a policy stopped something"
            spark={p(3)}
            sparkColor="#c0392b"
            onClick={() => t('/shield/sessions')}
          />
          <KpiCard
            label="AI tools in use"
            value={r}
            foot="Found automatically on endpoints"
            spark={p(4)}
            onClick={() => t('/shield/sessions')}
          />
        </div>
        <div className="panels">
          <section className="lf-card panel panel--wide">
            <h3 className="lf-card__title">
              Sessions this week<small>Prompts and uploads the agent saw, by day</small>
            </h3>
            <Chart
              kind="columns"
              height={250}
              data={{
                labels: u.labels,
                values: u.values,
                yTicks: u.yTicks,
                colors: u.values.map(() => 'var(--dch-blue)'),
              }}
              onSelect={() => t('/shield/sessions')}
            />
          </section>
          <section className="lf-card panel">
            <h3 className="lf-card__title">
              What happened<small>Outcomes, last 7 days</small>
            </h3>
            <Chart
              kind="donut"
              height={250}
              data={{
                caption: 'Sessions',
                segments: x,
              }}
              onSelect={() => t('/shield/sessions')}
            />
          </section>
          <section className="lf-card panel">
            <h3 className="lf-card__title">
              Needs your review<small>Sensitive data was found and let through</small>
            </h3>
            {v.length === 0 ? (
              <p
                className="lf-muted"
                style={{
                  margin: '8px 0',
                }}
              >
                Nothing waiting on you.
              </p>
            ) : (
              <ul className="shield-list">
                {v.slice(0, 4).map((s) => {
                  var i;
                  return (
                    <li key={s.id}>
                      <div className="shield-list__text">
                        <b>
                          {((i = personByEmail(s.person)) == null ? void 0 : i.name) ?? s.person}
                          {' · '}
                          {s.tool}
                        </b>
                        <small>{s.preview}</small>
                      </div>
                      <span className="shield-list__when">{ago(s.at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="shield-panel__foot">
              <Button
                size="sm"
                iconEnd="arrow"
                onClick={() =>
                  t('/shield/sessions', {
                    state: {
                      filter: 'review',
                    },
                  })
                }
              >
                Open sessions
              </Button>
            </div>
          </section>
          <section className="lf-card panel">
            <h3 className="lf-card__title">
              Agents needing attention<small>Stopped reporting, or never installed</small>
            </h3>
            {d.attention.length === 0 ? (
              <p
                className="lf-muted"
                style={{
                  margin: '8px 0',
                }}
              >
                Every endpoint is reporting.
              </p>
            ) : (
              <ul className="shield-list">
                {d.attention.slice(0, 5).map((s) => {
                  var i;
                  return (
                    <li key={s.id}>
                      <div className="shield-list__text">
                        <b>{s.name}</b>
                        <small>
                          {s.user
                            ? (((i = personByEmail(s.user)) == null ? void 0 : i.name) ?? s.user)
                            : 'No signed-in account'}
                          {' · '}
                          {s.address}
                        </small>
                      </div>
                      <OutcomeTag outcome={s.agent === 'none' ? 'blocked' : 'warned'} short={!0} />
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="shield-panel__foot">
              <Button size="sm" iconEnd="arrow" onClick={() => t('/shield/server')}>
                Endpoints
              </Button>
            </div>
          </section>
          <section className="lf-card panel">
            <h3 className="lf-card__title">
              Admin activity
              <small>
                {m.total}
                {' changes by admins in the last 30 days'}
              </small>
            </h3>
            <div className="shield-band" aria-hidden="true">
              {m.parts.map((s) => (
                <span
                  className={'shield-band--' + s.tone}
                  style={{
                    width: `${(s.n / Math.max(1, m.total)) * 100}%`,
                  }}
                  key={s.id}
                />
              ))}
            </div>
            <ul className="shield-band__legend">
              {m.parts.map((s) => (
                <li key={s.id}>
                  <i className={'shield-band--' + s.tone} />
                  {s.label}
                  <small>
                    {'· '}
                    {s.hint}
                  </small>
                  <b>{s.n}</b>
                </li>
              ))}
            </ul>
            <ul
              className="shield-list"
              style={{
                marginTop: 12,
              }}
            >
              {n.activity
                .filter((s) => s.actorRole === 'admin')
                .slice(0, 2)
                .map((s) => (
                  <li key={s.id}>
                    <Person name={s.actor} />
                    <div className="shield-list__text">
                      <b>{s.action}</b>
                    </div>
                    <span className="shield-list__when">{ago(s.at)}</span>
                  </li>
                ))}
            </ul>
            <div className="shield-panel__foot">
              <Button size="sm" iconEnd="arrow" onClick={() => t('/shield/activity')}>
                All activity
              </Button>
            </div>
          </section>
        </div>
      </div>
    </ShieldPage>
  );
}
