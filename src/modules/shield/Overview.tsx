/* AI Shield › Overview (/shield): status strip, four KPI cards, sessions-by-day chart, outcomes donut, sessions needing
   review, agents needing attention and admin activity. */
import { Link, useNavigate } from 'react-router-dom';
import { Button, Chart, Chip, Icon, KpiCard, Person } from '../../ui';
import { ACTIVITY_KINDS, DAY, OUTCOMES } from './data';
import { keywordCount, personByEmail, shieldStore } from './store';
import { ago, OutcomeTag, ShieldPage } from './parts';
import type { Outcome } from './types';

/** Donut colours per outcome (chart palette tokens). */
const OUTCOME_COLORS: Record<Outcome, string> = {
  blocked: 'var(--dch-crimson)',
  paused: 'var(--dch-amber)',
  warned: 'var(--chart-yellow)',
  review: 'var(--dch-indigo)',
  clean: 'var(--chart-green)',
};

/** A gentle, made-up trend line for each KPI card's sparkline. */
const spark = (seed: number) => Array.from({ length: 8 }, (_, i) => Math.round(6 + 4 * Math.sin(i * 0.9 + seed) + i * 0.6));

export function Overview() {
  const navigate = useNavigate();
  const state = shieldStore.use();
  const now = Date.now();

  const approvers = state.people.filter((p) => p.role === 'approver' && p.status !== 'left');

  // Endpoints: protected = agent reporting and browser extension present.
  const endpoints = {
    total: state.endpoints.length,
    protectedCount: state.endpoints.filter((e) => e.agent === 'active' && e.extension).length,
    extensionGaps: state.endpoints.filter((e) => e.agent === 'active' && !e.extension).length,
    // Not reporting; endpoints with no agent at all first.
    attention: state.endpoints
      .filter((e) => e.agent !== 'active')
      .sort((a, b) => (a.agent === 'none' ? -1 : 1) - (b.agent === 'none' ? -1 : 1)),
  };

  // Sessions per day for the last 7 days (today last).
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now - (6 - i) * DAY);
    day.setHours(0, 0, 0, 0);
    return day;
  });
  const perDay = days.map((day) => state.sessions.filter((s) => {
    const at = new Date(s.at).getTime();
    return at >= day.getTime() && at < day.getTime() + DAY;
  }).length);
  const tick = Math.ceil(Math.max(4, ...perDay) / 4);

  const thisWeek = state.sessions.filter((s) => now - new Date(s.at).getTime() < 7 * DAY);
  const outcomeSegments = (Object.keys(OUTCOMES) as Outcome[])
    .map((o) => ({ label: OUTCOMES[o].short, value: thisWeek.filter((s) => s.outcome === o).length, color: OUTCOME_COLORS[o] }))
    .filter((seg) => seg.value > 0);
  const blockedThisWeek = thisWeek.filter((s) => s.outcome === 'blocked' || s.outcome === 'paused').length;
  const toolsInUse = new Set(state.sessions.map((s) => s.tool)).size;
  const needReview = state.sessions.filter((s) => s.outcome === 'review' && !s.reviewed);

  // Changes by admins in the last 30 days, split by type (System is not an admin change).
  const adminChanges = state.activity.filter((a) => a.actorRole === 'admin' && now - new Date(a.at).getTime() < 30 * DAY);
  const changeParts = ACTIVITY_KINDS.filter((k) => k.id !== 'system')
    .map((k) => ({ ...k, count: adminChanges.filter((a) => a.kind === k.id).length }))
    .filter((k) => k.count > 0);

  const nameOf = (email: string | null) => personByEmail(email)?.name ?? email;

  return (
    <ShieldPage
      tab="overview"
      title="AI Shield"
      chip={<Chip tone="good" icon="check">Server live</Chip>}
      description="The server is live, approvers are in place and agents are reporting. This is what happened across your AI tools and what still needs a look."
    >
      <div className="stack">
        <section className="lf-card shield-status" aria-label="Shield status">
          <div className="shield-status__cell">
            <span className="shield-status__ic"><Icon name="users" size={17} /></span>
            <div className="grow">
              <b>{approvers.length} approver{approvers.length === 1 ? '' : 's'} in place</b>
              <small>
                {approvers.length ? `${approvers.map((p) => p.name).join(', ')} decides requests` : 'Nobody can decide a request yet'}
              </small>
            </div>
            <Link className="lf-link" to="/shield/people">Manage people</Link>
          </div>
          <div className="shield-status__cell">
            <span className={'shield-status__ic' + (endpoints.attention.length ? ' shield-status__ic--warn' : '')}>
              <Icon name="cpu" size={17} />
            </span>
            <div className="grow">
              <b>{endpoints.protectedCount} of {endpoints.total} endpoints protected</b>
              <small>
                {endpoints.attention.length ? `${endpoints.attention.length} need attention` : 'Agent and extension reporting'}
                {endpoints.extensionGaps ? ` · ${endpoints.extensionGaps} extension gap${endpoints.extensionGaps === 1 ? '' : 's'}` : ''}
              </small>
            </div>
            <Link className="lf-link" to="/shield/server">Server</Link>
          </div>
          <div className="shield-status__cell">
            <span className="shield-status__ic"><Icon name="shield" size={17} /></span>
            <div className="grow">
              <b>Policy version {state.policyVersion}</b>
              <small>
                {state.categories.length} policies · {keywordCount(state.categories)} keywords · published {ago(state.policyPublishedAt)}
              </small>
            </div>
            <Link className="lf-link" to="/shield/policy">Review policy</Link>
          </div>
        </section>

        <div className="kpis">
          <KpiCard label="Endpoints protected" value={endpoints.protectedCount} foot={`of ${endpoints.total} · fills in as endpoints check in`}
            spark={spark(1)} onClick={() => navigate('/shield/server')} />
          <KpiCard label="Sessions this week" value={thisWeek.length} delta={`${needReview.length} need review`}
            deltaTone={needReview.length ? 'brand' : 'flat'} foot="Every prompt the agent saw" spark={spark(2)}
            onClick={() => navigate('/shield/sessions')} />
          <KpiCard label="High-risk activity blocked" value={blockedThisWeek} delta="7 days" deltaTone="bad"
            foot="When a policy stopped something" spark={spark(3)} sparkColor="#c0392b" onClick={() => navigate('/shield/sessions')} />
          <KpiCard label="AI tools in use" value={toolsInUse} foot="Found automatically on endpoints" spark={spark(4)}
            onClick={() => navigate('/shield/sessions')} />
        </div>

        <div className="panels">
          <section className="lf-card panel panel--wide">
            <h3 className="lf-card__title">Sessions this week<small>Prompts and uploads the agent saw, by day</small></h3>
            <Chart
              kind="columns"
              height={250}
              data={{
                labels: days.map((d) => d.toLocaleDateString('en-US', { weekday: 'short' })),
                values: perDay,
                colors: perDay.map(() => 'var(--dch-blue)'),
              }}
              // Axis 0 … at least 4, in four equal steps.
              options={{ y: { min: 0, max: tick * 4, ticks: 4 } }}
              onSelect={() => navigate('/shield/sessions')}
            />
          </section>

          <section className="lf-card panel">
            <h3 className="lf-card__title">What happened<small>Outcomes, last 7 days</small></h3>
            <Chart kind="donut" height={250} data={{ caption: 'Sessions', segments: outcomeSegments }} onSelect={() => navigate('/shield/sessions')} />
          </section>

          <section className="lf-card panel">
            <h3 className="lf-card__title">Needs your review<small>Sensitive data was found and let through</small></h3>
            {needReview.length === 0 ? (
              <p className="lf-muted" style={{ margin: '8px 0' }}>Nothing waiting on you.</p>
            ) : (
              <ul className="shield-list">
                {needReview.slice(0, 4).map((s) => (
                  <li key={s.id}>
                    <div className="shield-list__text">
                      <b>{nameOf(s.person)} · {s.tool}</b>
                      <small>{s.preview}</small>
                    </div>
                    <span className="shield-list__when">{ago(s.at)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="shield-panel__foot">
              <Button size="sm" iconEnd="arrow" onClick={() => navigate('/shield/sessions', { state: { filter: 'review' } })}>Open sessions</Button>
            </div>
          </section>

          <section className="lf-card panel">
            <h3 className="lf-card__title">Agents needing attention<small>Stopped reporting, or never installed</small></h3>
            {endpoints.attention.length === 0 ? (
              <p className="lf-muted" style={{ margin: '8px 0' }}>Every endpoint is reporting.</p>
            ) : (
              <ul className="shield-list">
                {endpoints.attention.slice(0, 5).map((e) => (
                  <li key={e.id}>
                    <div className="shield-list__text">
                      <b>{e.name}</b>
                      <small>{e.user ? nameOf(e.user) : 'No signed-in account'} · {e.address}</small>
                    </div>
                    {/* No agent reads as Blocked (red); a stale agent as Warned (amber). */}
                    <OutcomeTag outcome={e.agent === 'none' ? 'blocked' : 'warned'} short />
                  </li>
                ))}
              </ul>
            )}
            <div className="shield-panel__foot">
              <Button size="sm" iconEnd="arrow" onClick={() => navigate('/shield/server')}>Endpoints</Button>
            </div>
          </section>

          <section className="lf-card panel">
            <h3 className="lf-card__title">Admin activity<small>{adminChanges.length} changes by admins in the last 30 days</small></h3>
            <div className="shield-band" aria-hidden="true">
              {changeParts.map((k) => (
                <span key={k.id} className={'shield-band--' + k.tone} style={{ width: `${(k.count / Math.max(1, adminChanges.length)) * 100}%` }} />
              ))}
            </div>
            <ul className="shield-band__legend">
              {changeParts.map((k) => (
                <li key={k.id}>
                  <i className={'shield-band--' + k.tone} />
                  {k.label}
                  <small>· {k.hint}</small>
                  <b>{k.count}</b>
                </li>
              ))}
            </ul>
            <ul className="shield-list" style={{ marginTop: 12 }}>
              {state.activity.filter((a) => a.actorRole === 'admin').slice(0, 2).map((a) => (
                <li key={a.id}>
                  <Person name={a.actor} />
                  <div className="shield-list__text"><b>{a.action}</b></div>
                  <span className="shield-list__when">{ago(a.at)}</span>
                </li>
              ))}
            </ul>
            <div className="shield-panel__foot">
              <Button size="sm" iconEnd="arrow" onClick={() => navigate('/shield/activity')}>All activity</Button>
            </div>
          </section>
        </div>
      </div>
    </ShieldPage>
  );
}
