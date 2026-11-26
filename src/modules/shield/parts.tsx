// @ts-nocheck — ported from the live prototype (https://lepide-new-ui.vercel.app/shield); shapes are in ./types.ts.
/* Shared pieces: the page frame with the six AI Shield tabs, the role, risk, outcome and activity-type tags, and the date helpers. */
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader, ToneTag, Chip } from '../../ui';
import { ROLES, riskOf, OUTCOMES, ACTIVITY_KINDS } from './data';
import { shieldStore } from './store';

export const TABS = [
  {
    value: 'overview',
    label: 'Overview',
    path: '/shield',
  },
  {
    value: 'sessions',
    label: 'Sessions',
    path: '/shield/sessions',
  },
  {
    value: 'people',
    label: 'People',
    path: '/shield/people',
  },
  {
    value: 'policy',
    label: 'Protection policy',
    path: '/shield/policy',
  },
  {
    value: 'activity',
    label: 'Admin activity',
    path: '/shield/activity',
  },
  {
    value: 'server',
    label: 'Server',
    path: '/shield/server',
  },
];
export function ShieldPage({ tab: t, title: n, description: o, chip: c, actions: d, children: u, fill: f }) {
  const x = useNavigate(),
    j = useLocation(),
    r = shieldStore.use((s) => s.sessions.filter((i) => i.outcome === 'review' && !i.reviewed).length),
    v =
      t === 'overview'
        ? [
            {
              label: 'Home',
              to: '/',
            },
            {
              label: 'AI Shield',
            },
          ]
        : [
            {
              label: 'Home',
              to: '/',
            },
            {
              label: 'AI Shield',
              to: '/shield',
            },
            {
              label: TABS.find((s) => s.value === t).label,
            },
          ],
    m = (s) => {
      j.pathname !== s.path && x(s.path);
    },
    p = (s) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(s.key)) return;
      const i = TABS.findIndex((a) => a.value === t),
        l =
          s.key === 'Home'
            ? 0
            : s.key === 'End'
              ? TABS.length - 1
              : s.key === 'ArrowRight'
                ? (i + 1) % TABS.length
                : (i - 1 + TABS.length) % TABS.length;
      s.preventDefault(), m(TABS[l]);
    };
  return (
    <div className={'sub shield' + (f ? ' sub--fill' : '')}>
      <PageHeader crumbs={v} eyebrow="AI Shield · Admin" title={n} chip={c} description={o} actions={d} />
      <nav className="shield-nav" aria-label="AI Shield pages">
        <div role="tablist" onKeyDown={p}>
          {TABS.map((s) => {
            const i = s.value === t,
              l = s.value === 'sessions' && r > 0 ? r : null;
            return (
              <button
                type="button"
                role="tab"
                aria-selected={i}
                tabIndex={i ? 0 : -1}
                onClick={() => m(s)}
                ref={(a) => {
                  var h;
                  a && i && (h = document.activeElement) != null && h.closest('.shield-nav') && a.focus();
                }}
                key={s.value}
              >
                <span>{s.label}</span>
                {l !== null && <b aria-label={`${l} need review`}>{l}</b>}
              </button>
            );
          })}
        </div>
      </nav>
      {u}
    </div>
  );
}
export const RoleChip = ({ role: t }) => <Chip tone={ROLES[t].tone}>{ROLES[t].label}</Chip>;
export const RiskChip = ({ risk: t }) => (
  <Chip tone={riskOf(t).tone}>
    {riskOf(t).label}
    {' risk'}
  </Chip>
);
export const OutcomeTag = ({ outcome: t, short: n }) => (
  <ToneTag tone={OUTCOMES[t].tone}>{n ? OUTCOMES[t].short : OUTCOMES[t].label}</ToneTag>
);
export const KindChip = ({ kind: t }) => {
  const n = ACTIVITY_KINDS.find((o) => o.id === t);
  return <Chip tone={n.tone}>{n.label}</Chip>;
};
export function ago(t) {
  if (!t) return 'Never';
  const n = new Date(t),
    o = Date.now() - n.getTime(),
    c = Math.round(o / 6e4);
  if (c < 1) return 'Just now';
  if (c < 60) return `${c} min ago`;
  const d = Math.round(c / 60);
  if (d < 24) return `${d} hour${d === 1 ? '' : 's'} ago`;
  const u = n.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return Math.floor(o / 864e5) < 2
    ? `Yesterday ${u}`
    : `${n.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
      })}, ${u}`;
}
export const fullDate = (t) =>
  new Date(t).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
