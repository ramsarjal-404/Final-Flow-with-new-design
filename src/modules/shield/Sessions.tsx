/* AI Shield › Sessions (/shield/sessions): outcome filter, sessions table and the session detail panel with
   "Mark as reviewed". Navigation state { filter: 'review' } opens it on Needs review. */
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Chip, DataTable, DetailPanel, Icon, Person, SearchField, Segmented, useToast, type Column, type IconName } from '../../ui';
import { actionOf, OUTCOMES } from './data';
import { markSessionReviewed, personByEmail, shieldStore } from './store';
import { ago, fullDate, OutcomeTag, RiskChip, ShieldPage } from './parts';
import type { Outcome, Session } from './types';

const OUTCOME_ICONS: Record<Outcome, IconName> = { blocked: 'lock', paused: 'pause', warned: 'alert', review: 'eye', clean: 'check' };

type Filter = Outcome | 'all';

export function Sessions() {
  const toast = useToast();
  const location = useLocation();
  const state = shieldStore.use();
  const [filter, setFilter] = useState<Filter>((location.state as { filter?: Filter } | null)?.filter ?? 'all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  // Close the panel if its session disappears.
  useEffect(() => {
    if (openId && !state.sessions.some((s) => s.id === openId)) setOpenId(null);
  }, [state.sessions, openId]);

  const policyOf = (id: string | null) => state.categories.find((p) => p.id === id) ?? null;
  const nameOf = (s: Session) => personByEmail(s.person)?.name ?? s.person;
  const rows = state.sessions.filter((s) => filter === 'all' || s.outcome === filter);
  const countOf = (f: Filter) => (f === 'all' ? state.sessions.length : state.sessions.filter((s) => s.outcome === f).length);
  const open = state.sessions.find((s) => s.id === openId) ?? null;

  const columns: Column<Session>[] = [
    {
      key: 'person', header: 'Person', value: nameOf, sortable: true, filterable: true, minWidth: 200,
      render: (s) => <Person name={nameOf(s)} sub={personByEmail(s.person)?.unit} />,
    },
    { key: 'tool', header: 'AI tool', sortable: true, filterable: true, width: 150 },
    {
      key: 'outcome', header: 'What happened', value: (s) => OUTCOMES[s.outcome].short, sortable: true, filterable: true, width: 170,
      render: (s) => (
        <span className="row">
          <OutcomeTag outcome={s.outcome} short />
          {s.outcome === 'review' && s.reviewed && <Chip tone="good" icon="check">Reviewed</Chip>}
        </span>
      ),
    },
    {
      key: 'category', header: 'Sensitive data', value: (s) => policyOf(s.category)?.short ?? '', sortable: true, filterable: true, width: 150,
      render: (s) => policyOf(s.category)?.short ?? <span className="lf-na">—</span>,
    },
    {
      key: 'risk', header: 'Risk', value: (s) => policyOf(s.category)?.risk ?? '', sortable: true, width: 130,
      render: (s) => {
        const policy = policyOf(s.category);
        return policy ? <RiskChip risk={policy.risk} /> : <span className="lf-na">—</span>;
      },
    },
    { key: 'endpoint', header: 'Endpoint', mono: true, sortable: true, filterable: true, width: 130 },
    { key: 'at', header: 'When', value: (s) => new Date(s.at).getTime(), sortable: true, width: 150, render: (s) => ago(s.at) },
  ];

  const markReviewed = (s: Session) => {
    markSessionReviewed(s.id);
    toast({ variant: 'success', title: 'Session reviewed', message: `${nameOf(s)}'s ${s.tool} session is recorded as reviewed.` });
  };

  return (
    <ShieldPage
      tab="sessions"
      title="Sessions"
      fill
      description="Every prompt and upload the endpoint agent saw, what the protection policy found in it, and what happened next."
    >
      <div className="stack">
        <Segmented
          ariaLabel="Outcome"
          hug
          value={filter}
          onChange={(v) => { setFilter(v as Filter); setOpenId(null); }}
          items={[
            { value: 'all', label: 'All', count: countOf('all') },
            ...(Object.keys(OUTCOMES) as Outcome[]).map((o) => ({ value: o, label: OUTCOMES[o].short, count: countOf(o) })),
          ]}
        />
        <div className={'shield-sessions' + (open ? ' with-detail' : '')}>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(s) => s.id}
            title="Sessions"
            noun={['session', 'sessions']}
            search={search}
            initialSort={{ key: 'at', dir: 'desc' }}
            toolbar={<SearchField value={search} onChange={setSearch} placeholder="Search people, AI tools, or reasons…" />}
            onRowOpen={(s) => setOpenId(s.id === openId ? null : s.id)}
            activeKey={openId}
            defaultPageSize={25}
          />
          {open && <SessionDetail session={open} onClose={() => setOpenId(null)} onReviewed={() => markReviewed(open)} />}
        </div>
      </div>
    </ShieldPage>
  );
}

/** The panel beside the table: what happened, the masked prompt or upload, what was found, details and a timeline. */
function SessionDetail({ session, onClose, onReviewed }: { session: Session; onClose: () => void; onReviewed: () => void }) {
  const policy = shieldStore.get().categories.find((p) => p.id === session.category) ?? null;
  const person = personByEmail(session.person);
  const name = person?.name ?? session.person;
  const outcome = OUTCOMES[session.outcome];
  const canReview = session.outcome === 'review' && !session.reviewed;

  return (
    <DetailPanel
      title={outcome.headline(policy?.short ?? 'Sensitive content')}
      subtitle={`${name} · ${session.tool} · ${fullDate(session.at)}`}
      onClose={onClose}
      footer={canReview ? (
        <>
          <span className="lf-muted grow">Sensitive data was found and the policy let it through.</span>
          <Button variant="primary" icon="check" onClick={onReviewed}>Mark as reviewed</Button>
        </>
      ) : (
        <span className="lf-muted">{session.reviewed ? 'Reviewed. Nothing further needed.' : 'Nothing to decide here; the policy already acted.'}</span>
      )}
    >
      <div className="stack">
        <div className="shield-headline">
          <span className={'shield-headline__ic shield-headline__ic--' + outcome.tone}><Icon name={OUTCOME_ICONS[session.outcome]} size={18} /></span>
          <div>
            <b>{outcome.label}</b>
            <small>{policy ? `${policy.title} · policy says ${actionOf(policy.action).label.toLowerCase()}` : 'No protection policy matched'}</small>
          </div>
        </div>

        <div>
          <p className="shield-section">{session.file ? 'Upload' : 'Prompt'}, as recorded</p>
          {session.file ? (
            <p className="shield-preview shield-preview--file">
              <Icon name="file" size={16} />
              <span>{session.file}</span>
              <span className="lf-muted">· {session.preview}</span>
            </p>
          ) : (
            <pre className="shield-preview">{session.preview}</pre>
          )}
          <p className="lf-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
            Secrets, card numbers and personal identifiers are masked before anything is stored.
          </p>
        </div>

        {session.keywords.length > 0 && (
          <div>
            <p className="shield-section">What was found</p>
            <div className="shield-kw">{session.keywords.map((k) => <Chip key={k} tone="warn">{k}</Chip>)}</div>
          </div>
        )}

        <div>
          <p className="shield-section">Details</p>
          <div className="shield-facts">
            <Fact label="Person">{name}{person?.unit ? ` · ${person.unit}` : ''}</Fact>
            <Fact label="AI tool">{session.tool}</Fact>
            <Fact label="Endpoint">{session.endpoint}</Fact>
            <Fact label="Asked at">{fullDate(session.at)}</Fact>
            {policy && <Fact label="Policy">{policy.title}</Fact>}
            {policy && <Fact label="Risk"><RiskChip risk={policy.risk} /></Fact>}
          </div>
        </div>

        <div>
          <p className="shield-section">Timeline</p>
          <ol className="shield-timeline">
            <li>{session.file ? 'Upload started' : 'Prompt typed'} in {session.tool}<small>{fullDate(session.at)}</small></li>
            {policy ? (
              <li>
                Matched <b>{policy.title}</b> · {session.keywords.length} keyword{session.keywords.length === 1 ? '' : 's'}
                <small>Scanned on the endpoint before anything left it</small>
              </li>
            ) : (
              <li>No keyword matched<small>Scanned on the endpoint before anything left it</small></li>
            )}
            <li>{outcome.label}<small>{policy ? `Policy action: ${actionOf(policy.action).label}` : 'Sent with no interruption'}</small></li>
            {session.reviewed && <li>Reviewed by an admin<small>Recorded in Admin activity</small></li>}
          </ol>
        </div>
      </div>
    </DetailPanel>
  );
}

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <span className="shield-fact">
    <span className="shield-fact__l">{label}</span>
    <span className="shield-fact__v">{children}</span>
  </span>
);
