/* SCR-PRO-02 AD Cleaner analytics with DLG-PRO-03 card windows and DLG-PRO-04 drill-down panel. */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Chart, Icon, IconButton, KpiCard, Segmented, useToast } from '../../ui';
import { AD, BUCKETS, STAGES, VIEWS, type ViewKey } from './data';
import { ouMatrix, trendTotals, upcoming, type Params, type TypeKey } from './workspace';
import { RangeMenu, SidePanel, useBusy } from './kit';
import { WorkspaceTable } from './WorkspaceTable';

const TYPE_LABEL: Record<TypeKey, string> = { all: 'All accounts', users: 'Users', computers: 'Computers' };
const STAGE_SHORT = ['Reset', 'Disabled', 'Moved', 'Deletion'];
const STAGE_CLS = ['protect-c1', 'protect-c2', 'protect-c3', 'protect-c4'];
const FACTOR: Record<number, number> = { 7: 0.72, 1: 0.4 };
const plural = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

function Card({ title, meta, action, tools, children, wide }: { title: string; meta?: ReactNode; action?: ReactNode; tools?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <section className={'lf-card panel protect-panel' + (wide ? ' panel--wide' : '')}>
      <div className="protect-panel__head">
        <h3 className="lf-card__title">{title}{meta && <small>{meta}</small>}</h3>
        <div className="row protect-panel__tools">{tools}{action}</div>
      </div>
      {children}
    </section>
  );
}
const LinkAction = ({ children, onClick }: { children: string; onClick: () => void }) => (
  <button type="button" className="lf-link protect-linkbtn" onClick={onClick}>{children}<Icon name="arrow" size={13} /></button>
);

export function DrillPanel({ state, onClose, onChange }: { state: { tab: ViewKey; params: Params } | null; onClose: () => void; onChange: (s: { tab: ViewKey; params: Params }) => void }) {
  if (!state) return null;
  const v = VIEWS[state.tab];
  const base = { type: state.params.type, range: state.params.range };
  return (
    <SidePanel open onClose={onClose} eyebrow={`Protect › AD Cleaner › ${v.label}`} title={v.title} subtitle={v.description} width={1200}>
      <div className="stack">
        <Segmented ariaLabel="Drill-down views" value={state.tab} onChange={(t) => onChange({ tab: t as ViewKey, params: base })}
          items={[{ value: 'accounts', label: 'Accounts' }, { value: 'schedule', label: 'Schedule' }, { value: 'activity', label: 'Activity' }, { value: 'runs', label: 'Policy runs' }]} />
        <WorkspaceTable key={state.tab + JSON.stringify(state.params)} tab={state.tab} params={state.params} keep={['type', 'range']}
          onClear={() => onChange({ tab: state.tab, params: base })} />
      </div>
    </SidePanel>
  );
}

export default function AdAnalytics() {
  const toast = useToast();
  const [type, setType] = useState<TypeKey>('all');
  const [range, setRange] = useState<30 | 90>(30);
  const [upWin, setUpWin] = useState<number | null>(null);
  const [trendWin, setTrendWin] = useState<number | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [panel, setPanel] = useState<{ tab: ViewKey; params: Params } | null>(null);
  const [busy, run] = useBusy(550);
  const [tick, setTick] = useState(0);
  const ts = type === 'all' ? (['users', 'computers'] as const) : ([type] as const);
  const sum = (p: { users: number[]; computers: number[] }, i: number) => ts.reduce((s, t) => s + p[t][i], 0);
  const sumAll = (p: { users: number[]; computers: number[] }) => p.users.reduce((s, _, i) => s + sum(p, i), 0);

  const open = (tab: ViewKey, extra: Params = {}) => setPanel({ tab, params: { type, range: String(range), ...extra } });
  const inactive = sumAll(AD.age);
  const never = ts.reduce((s, t) => s + AD.never[t], 0);
  const upFull = upcoming(type, range, range);
  const deletions = upFull[3].count;
  const tt = trendTotals(type, range);
  const uw = upWin ?? range; const up = upcoming(type, range, uw); const upMax = Math.max(1, ...up.map((u) => u.count));
  const tw = trendWin ?? range;
  const tr = AD.trend[range === 90 ? 'd90' : 'd30'];
  const f = (i: number) => (tw === range ? 1 : FACTOR[tw] * (1 + 0.06 * Math.sin(i * 1.7 + tw)));
  const det = tr.labels.map((_, i) => Math.round(sum(tr.detected, i) * f(i)));
  const rem = tr.labels.map((_, i) => Math.round(sum(tr.remediated, i) * f(i)));
  const backlog = det[det.length - 1] - rem[rem.length - 1];
  const life = STAGES.map((_, i) => sum(AD.lifecycle, i));
  const enabled = life[0]; const contained = life.slice(1).reduce((a, b) => a + b, 0);
  const pct = Math.round((enabled / Math.max(1, enabled + contained)) * 100);
  const matrix = useMemo(() => ouMatrix(type), [type]);
  const mMax = Math.max(1, ...matrix.map((m) => m.total));
  const series = [{ key: 'detected', name: 'Detected', values: det }, { key: 'remediated', name: 'Remediated', values: rem }];
  const visible = series.filter((s) => !hidden.includes(s.key));

  return (
    <>
      <div className="row row--wrap protect-ad-bar">
        <p className="lf-muted grow" style={{ margin: 0 }}>Inactive accounts, what the policy will do next, and whether cleanup is keeping up.</p>
        <IconButton icon="refresh" label="Refresh AD Cleaner data" bordered className={busy ? 'protect-spin' : undefined}
          onClick={() => run(() => { setTick((t) => t + 1); toast({ variant: 'success', title: 'AD Cleaner', message: 'AD Cleaner data refreshed' }); })} />
        <Segmented hug mode="pressed" ariaLabel="AD Cleaner account type" value={type}
          onChange={(v) => { setType(v as TypeKey); toast({ variant: 'info', title: 'AD Cleaner', message: `${TYPE_LABEL[v as TypeKey]} selected` }); }}
          items={[{ value: 'all', label: 'All accounts' }, { value: 'users', label: 'Users' }, { value: 'computers', label: 'Computers' }]} />
        <Segmented hug mode="pressed" ariaLabel="AD Cleaner reporting window" value={String(range)}
          onChange={(v) => { setRange(Number(v) as 30 | 90); setUpWin(null); setTrendWin(null); toast({ variant: 'info', title: 'AD Cleaner', message: `AD Cleaner range: ${v} days` }); }}
          items={[{ value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
      </div>

      <div className="kpis" key={'k' + tick}>
        <KpiCard label="Inactive accounts" value={inactive} foot="Live in cleanup scope" onClick={() => open('accounts')} />
        <KpiCard label="Never logged on" value={never} foot="created, never signed in" onClick={() => open('accounts', { never: '1' })} />
        <KpiCard label="Scheduled deletions" value={deletions} delta="Irreversible" deltaTone="bad" foot={`next ${range} days · irreversible`} onClick={() => open('schedule', { action: 'Delete' })} />
        <KpiCard label="Remediated" value={tt.remediated} foot={`last ${range} days`} onClick={() => open('activity')} />
      </div>

      <div className="panels" key={'p' + tick}>
        <Card title="Inactivity Age Profile" meta={`${inactive} inactive accounts`} action={<LinkAction onClick={() => open('accounts', { bucket: '180d+', sort: 'inactive-desc' })}>Review oldest</LinkAction>}>
          <Chart kind="stacked" title="Inactivity age profile" data={{ cats: BUCKETS, series: [
            { name: 'Users', values: type === 'computers' ? BUCKETS.map(() => 0) : AD.age.users },
            { name: 'Computers', values: type === 'users' ? BUCKETS.map(() => 0) : AD.age.computers }] }}
            options={{ stacked: false, onPoint: (s, i) => open('accounts', { bucket: BUCKETS[i], type: s === 0 ? 'users' : 'computers' }) }} />
          <div className="sr-only">{BUCKETS.map((b) => <button key={b} type="button" onClick={() => open('accounts', { bucket: b })}>Open accounts inactive {b}</button>)}</div>
        </Card>

        <Card title="Upcoming Automated Actions" meta={<><span className="lf-chip">Next {plural(uw)}</span> {up.reduce((s, u) => s + u.count, 0)} actions queued</>}
          tools={<RangeMenu label="Select time window" value={uw} options={[1, 7, range].map((n) => ({ n, label: `Next ${plural(n)}` }))}
            onPick={(n) => { setUpWin(n); toast({ variant: 'info', title: 'AD Cleaner', message: `Next ${plural(n)}` }); }}
            onRefresh={() => toast({ variant: 'success', title: 'AD Cleaner', message: 'Data refreshed' })} />}
          action={<LinkAction onClick={() => open('schedule')}>View schedule</LinkAction>}>
          <ul className="protect-timeline">
            {up.map((u, i) => (
              <li key={u.label}>
                <button type="button" className="protect-timeline__row" onClick={() => open('schedule', { action: u.label })}>
                  <span className="protect-timeline__name">{u.label}{i === 3 && <span className="lf-chip lf-chip--bad">irreversible</span>}</span>
                  <b>{u.count}</b>
                  <span className="protect-hbar"><span className={STAGE_CLS[i]} style={{ width: `${(u.count / upMax) * 100}%` }} /></span>
                  <span className="protect-timeline__due">{u.due}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Account Lifecycle Funnel" meta="accounts progress top → bottom" action={<LinkAction onClick={() => open('accounts')}>View accounts</LinkAction>}>
          <ol className="protect-funnel" aria-label="Account lifecycle funnel">
            {STAGES.map((s, i) => (
              <li key={s}>
                <button type="button" onClick={() => open('accounts', { stage: s })} aria-label={`${s}: ${life[i]} accounts`}>
                  <span className={'protect-funnel__bar ' + STAGE_CLS[i]} style={{ width: `${Math.max(18, (life[i] / Math.max(1, life[0])) * 100)}%` }}><b>{life[i]}</b></span>
                  <span className="protect-funnel__lbl">{s}</span>
                </button>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Dormant Accounts by OU" meta="Lifecycle stage per OU" action={<LinkAction onClick={() => open('accounts', { group: 'ou' })}>View all OUs</LinkAction>}>
          <ul className="protect-ou">
            {matrix.map((m) => (
              <li key={m.ou}>
                <span className="protect-ou__name">{m.ou}<b>{m.total}</b></span>
                <span className="protect-ou__bar" style={{ width: `${(m.total / mMax) * 100}%` }}>
                  {m.counts.map((c, i) => c > 0 && (
                    <button key={i} type="button" className={STAGE_CLS[i]} style={{ flex: c }} aria-label={`${m.ou}, ${STAGE_SHORT[i]}: ${c}`} data-tip={`${m.ou} · ${STAGE_SHORT[i]}: ${c}`}
                      onClick={() => open('accounts', { ou: m.ou, stage: STAGES[i] })} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <div className="protect-legend">{STAGE_SHORT.map((s, i) => <span key={s}><i className={STAGE_CLS[i]} />{s}</span>)}</div>
        </Card>

        <Card title="Cleanup Activity Trend" meta={<><span className="lf-chip">Last {plural(tw)}</span> {backlog} open backlog</>}
          tools={<RangeMenu label="Select time window" value={tw} options={[1, 7, range].map((n) => ({ n, label: `Last ${plural(n)}` }))}
            onPick={(n) => { setTrendWin(n); toast({ variant: 'info', title: 'AD Cleaner', message: `Last ${plural(n)}` }); }}
            onRefresh={() => toast({ variant: 'success', title: 'AD Cleaner', message: 'Data refreshed' })} />}
          action={<LinkAction onClick={() => open('activity')}>View activity</LinkAction>}>
          <div className="protect-legend" role="group" aria-label="Series">
            {series.map((s, i) => (
              <button key={s.key} type="button" aria-pressed={!hidden.includes(s.key)} className="protect-legend__btn"
                onClick={() => setHidden((h) => h.includes(s.key) ? h.filter((x) => x !== s.key) : visible.length > 1 ? [...h, s.key] : h)}>
                <i className={i === 0 ? 'protect-c3' : 'protect-c1'} />{s.name}
              </button>
            ))}
          </div>
          <Chart kind="line" title="Cleanup activity trend chart" data={{ labels: tr.labels, series: visible.map((s) => ({ name: s.name, values: s.values, color: s.key === 'detected' ? '#8aa3dc' : '#1c4599' })) }}
            options={{ legend: false, markers: true, onPoint: (si, i) => { const s = visible[si]; if (s) open('activity', { series: s.key, date: tr.labels[i] }); } }} />
          <div className="sr-only">{tr.labels.map((l) => <button key={l} type="button" onClick={() => open('activity', { series: visible[0].key, date: l })}>{visible[0].name} on {l}</button>)}</div>
        </Card>

        <Card title="Attack Surface" meta={`${inactive} inactive accounts`} action={<LinkAction onClick={() => open('accounts', { posture: 'enabled', sort: 'inactive-desc' })}>Review exposure</LinkAction>}>
          <p className="protect-lead">{enabled} accounts still <b>enabled</b> — live exposure ({pct}%)</p>
          <div className="protect-surface" role="group" aria-label={`${pct}% still enabled, ${100 - pct}% contained`}>
            <button type="button" className="protect-c4" style={{ flex: enabled }} aria-label={`Still enabled ${enabled}`} onClick={() => open('accounts', { posture: 'enabled', sort: 'inactive-desc' })} />
            <button type="button" className="protect-c1" style={{ flex: contained }} aria-label={`Contained ${contained}`} onClick={() => open('accounts', { posture: 'contained', sort: 'inactive-desc' })} />
          </div>
          <div className="protect-legend">
            <button type="button" className="protect-legend__btn" onClick={() => open('accounts', { posture: 'enabled', sort: 'inactive-desc' })}><i className="protect-c4" />Still enabled <b>{enabled}</b></button>
            <button type="button" className="protect-legend__btn" onClick={() => open('accounts', { posture: 'contained', sort: 'inactive-desc' })}><i className="protect-c1" />Contained <b>{contained}</b></button>
          </div>
        </Card>
      </div>
      <DrillPanel state={panel} onClose={() => setPanel(null)} onChange={setPanel} />
    </>
  );
}
