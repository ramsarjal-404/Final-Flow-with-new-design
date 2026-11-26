/* Shared pieces: the page frame with the six AI Shield tabs, the role, risk, outcome and activity-type tags, and the
   date helpers. */
import type { KeyboardEvent, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Chip, PageHeader, ToneTag, type Crumb } from '../../ui';
import { ACTIVITY_KINDS, DAY, MINUTE, OUTCOMES, riskOf, ROLES } from './data';
import { shieldStore } from './store';
import type { ActivityKind, Outcome, Risk, Role } from './types';

export type ShieldTab = 'overview' | 'sessions' | 'people' | 'policy' | 'activity' | 'server';

export const TABS: { value: ShieldTab; label: string; path: string }[] = [
  { value: 'overview', label: 'Overview', path: '/shield' },
  { value: 'sessions', label: 'Sessions', path: '/shield/sessions' },
  { value: 'people', label: 'People', path: '/shield/people' },
  { value: 'policy', label: 'Protection policy', path: '/shield/policy' },
  { value: 'activity', label: 'Admin activity', path: '/shield/activity' },
  { value: 'server', label: 'Server', path: '/shield/server' },
];

/** The frame of every AI Shield page: breadcrumb, eyebrow, header, then the tab bar (arrow keys, Home and End move
    between tabs). The Sessions tab shows how many sessions still need review. `fill` lets a table fill the height. */
export function ShieldPage({ tab, title, description, chip, actions, children, fill }: {
  tab: ShieldTab; title: ReactNode; description?: ReactNode; chip?: ReactNode; actions?: ReactNode; children: ReactNode; fill?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const needReview = shieldStore.use((s) => s.sessions.filter((x) => x.outcome === 'review' && !x.reviewed).length);
  const crumbs: Crumb[] = tab === 'overview'
    ? [{ label: 'Home', to: '/' }, { label: 'AI Shield' }]
    : [{ label: 'Home', to: '/' }, { label: 'AI Shield', to: '/shield' }, { label: TABS.find((t) => t.value === tab)!.label }];

  const go = (target: (typeof TABS)[number]) => {
    if (location.pathname !== target.path) navigate(target.path);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const i = TABS.findIndex((t) => t.value === tab);
    const next = e.key === 'Home' ? 0
      : e.key === 'End' ? TABS.length - 1
      : e.key === 'ArrowRight' ? (i + 1) % TABS.length
      : (i - 1 + TABS.length) % TABS.length;
    e.preventDefault();
    go(TABS[next]);
  };

  return (
    <div className={'sub shield' + (fill ? ' sub--fill' : '')}>
      <PageHeader crumbs={crumbs} eyebrow="AI Shield · Admin" title={title} chip={chip} description={description} actions={actions} />
      <nav className="shield-nav" aria-label="AI Shield pages">
        <div role="tablist" onKeyDown={onKeyDown}>
          {TABS.map((t) => {
            const selected = t.value === tab;
            const badge = t.value === 'sessions' && needReview > 0 ? needReview : null;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => go(t)}
                // Keep keyboard focus on the tab bar after moving with the arrow keys.
                ref={(el) => { if (el && selected && document.activeElement?.closest('.shield-nav')) el.focus(); }}
              >
                <span>{t.label}</span>
                {badge !== null && <b aria-label={`${badge} need review`}>{badge}</b>}
              </button>
            );
          })}
        </div>
      </nav>
      {children}
    </div>
  );
}

export const RoleChip = ({ role }: { role: Role }) => <Chip tone={ROLES[role].tone}>{ROLES[role].label}</Chip>;

export const RiskChip = ({ risk }: { risk: Risk }) => <Chip tone={riskOf(risk).tone}>{riskOf(risk).label} risk</Chip>;

export const OutcomeTag = ({ outcome, short }: { outcome: Outcome; short?: boolean }) => (
  <ToneTag tone={OUTCOMES[outcome].tone}>{short ? OUTCOMES[outcome].short : OUTCOMES[outcome].label}</ToneTag>
);

export const KindChip = ({ kind }: { kind: ActivityKind }) => {
  const k = ACTIVITY_KINDS.find((x) => x.id === kind)!;
  return <Chip tone={k.tone}>{k.label}</Chip>;
};

/** Relative time: "Never", "Just now", "5 min ago", "3 hours ago", "Yesterday 4:10 PM", "Nov 22, 4:10 PM". */
export function ago(iso: string | null) {
  if (!iso) return 'Never';
  const date = new Date(iso);
  const elapsed = Date.now() - date.getTime();
  const minutes = Math.round(elapsed / MINUTE);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return Math.floor(elapsed / DAY) < 2 ? `Yesterday ${time}` : `${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}, ${time}`;
}

/** "Nov 26, 2026, 12:40 PM" */
export const fullDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
