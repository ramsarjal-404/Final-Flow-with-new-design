/* SCR-PRO-01 Overview, DLG-PRO-02 Notifications, DLG-PRO-03 card date range; ?view=ad-cleaner renders SCR-PRO-02. */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Chart, EmptyState, Icon, IconButton, PageHeader, Segmented, useToast } from '../../ui';
import { DCS, NOTIF_TYPES, OVERVIEW, POLICY_OVERVIEW, TEAM, pad, type Notif } from './data';
import { markAllRead, protectStore, toggleNotif } from './store';
import { Popover, RangeMenu, useBusy } from './kit';
import AdAnalytics from './AdAnalytics';

const kFmt = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));
const FACTOR: Record<number, number> = { 31: 1, 7: 0.72, 1: 0.4 };
const scale = (xs: number[], win: number, jit: number[]) => xs.map((v, i) => Math.round(v * FACTOR[win] * (win === 31 ? 1 : 1 + 0.07 * Math.sin(i * 2.3 + win)) * (jit[i] ?? 1)));
const jitter = (n: number, amp: number) => Array.from({ length: n }, () => 1 + (Math.random() * 2 - 1) * amp);

const LAST = [1, 7, 31].map((n) => ({ n, label: `Last ${n} day${n === 1 ? '' : 's'}` }));

function Panel({ title, sub, tools, children, className }: { title: string; sub?: ReactNode; tools?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={'lf-card panel protect-panel' + (className ? ' ' + className : '')}>
      <div className="protect-panel__head">
        <h3 className="lf-card__title">{title}{sub && <small>{sub}</small>}</h3>
        {tools && <div className="row protect-panel__tools">{tools}</div>}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ notifications */
const TONE_IC: Record<string, string> = { error: 'ax__ic--risk', warning: 'ax__ic--account', na: 'ax__ic--files' };
function NotifText({ n }: { n: Notif }) {
  return <>{n.text.map((t, i) => (typeof t === 'string' ? <span key={i}>{t}</span> : <b key={i}>{t.b}</b>))}</>;
}
export function NotificationList({ items, onOpen }: { items: Notif[]; onOpen: (n: Notif) => void }) {
  return (
    <ul className="protect-notifs" aria-live="polite">
      {items.map((n) => (
        <li key={n.id} className={'ax' + (n.unread ? '' : ' ax--read')}>
          <span className={'ax__ic ' + (TONE_IC[NOTIF_TYPES[n.type].tone] ?? '')} aria-hidden="true">
            {n.src === 'Z' ? <img src="/blueprint/icons/components/protect/icons/ZohoGlyph.svg" alt="" width={18} height={18} /> : <Icon name="server" size={17} />}
          </span>
          <div className="ax__head">
            <button type="button" className="protect-notif__open" onClick={() => onOpen(n)}>
              <span className="ax__text"><NotifText n={n} /></span>
              <span className="protect-notif__meta">{n.ago} · {NOTIF_TYPES[n.type].cat}</span>
            </button>
            <IconButton className="ax__read" icon={n.unread ? 'check' : 'mail'} label={n.unread ? 'Mark as read' : 'Mark as unread'} aria-pressed={!n.unread}
              onClick={() => toggleNotif(n.id)} />
          </div>
        </li>
      ))}
    </ul>
  );
}
function Notifications() {
  const notifs = protectStore.use((s) => s.notifs);
  const nav = useNavigate(); const toast = useToast();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const anchor = useRef<HTMLSpanElement>(null);
  const unread = notifs.filter((n) => n.unread).length;
  const list = filter === 'unread' ? notifs.filter((n) => n.unread) : notifs;
  const openItem = (n: Notif) => {
    toggleNotif(n.id, false);
    if (n.link) { setOpen(false); nav(`/protect/ad-cleaner/report?type=${n.link}`); }
  };
  return (
    <span className="rel" ref={anchor} style={{ display: 'inline-flex' }}>
      <button type="button" className="lf-btn lf-btn--icon protect-bell" aria-label={`Notifications, ${unread} unread`} aria-haspopup="dialog" aria-expanded={open}
        style={{ border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--sh-xs)' }} onClick={() => setOpen((o) => !o)}>
        <Icon name="bell" />{unread > 0 && <span className="protect-badge" aria-hidden="true">{unread}</span>}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={anchor} label="Notifications" width={400}>
        <div className="protect-np">
          <div className="protect-np__head">
            <b>Notifications</b><span className={'lf-chip' + (unread ? ' lf-chip--brand' : '')}>{unread ? `${unread} new` : 'All read'}</span>
            <span className="grow" /><IconButton icon="x" label="Close notifications" onClick={() => setOpen(false)} />
          </div>
          <div className="row protect-np__bar">
            <Segmented ariaLabel="Filter notifications" value={filter} onChange={setFilter}
              items={[{ value: 'all', label: 'All', count: notifs.length }, { value: 'unread', label: 'Unread', count: unread }]} />
            <span className="grow" />
            <button type="button" className="lf-link protect-linkbtn" disabled={!unread}
              onClick={() => { markAllRead(); toast({ variant: 'success', title: 'Notifications', message: 'All notifications marked as read' }); }}>Mark all read</button>
          </div>
          <div className="protect-np__list">
            {list.length ? <NotificationList items={list} onOpen={openItem} />
              : <EmptyState compact icon="bell" title={filter === 'unread' ? "You're all caught up" : 'Nothing to show'} />}
          </div>
          <div className="protect-np__foot">
            <button type="button" className="lf-link protect-linkbtn"
              onClick={() => toast({ variant: 'info', title: 'Notifications', message: 'Opening the full notification history' })}>View all notifications</button>
          </div>
        </div>
      </Popover>
    </span>
  );
}

/* ------------------------------------------------------------------ overview grid */
function OverviewGrid({ seed }: { seed: number }) {
  const toast = useToast(); const nav = useNavigate();
  const [win, setWin] = useState<Record<string, number>>({ c1: 31, c2: 31, c4: 31, c5: 31 });
  const ones = () => [[1, 1, 1], [1, 1, 1]];
  const [jit, setJit] = useState<Record<string, number[][]>>({ c1: ones(), c2: ones(), c4: ones(), c5: ones() });
  useEffect(() => {
    if (seed) setJit({ c1: [jitter(3, .15), jitter(3, .15)], c2: [jitter(3, .15), jitter(3, .15)], c4: [jitter(3, .15), jitter(3, .15)], c5: [jitter(3, .15), jitter(3, .15)] });
  }, [seed]);
  const j = (k: string, i: number) => jit[k][i];
  const pick = (k: string) => (n: number) => { setWin((w) => ({ ...w, [k]: n })); toast({ variant: 'info', title: 'Date range', message: `Last ${n} day${n === 1 ? '' : 's'}` }); };
  const refresh = (k: string) => () => { setJit((x) => ({ ...x, [k]: [jitter(3, .18), jitter(3, .18)] })); toast({ variant: 'success', title: 'Data refreshed', message: 'Card data is up to date.' }); };
  const tools = (k: string) => <RangeMenu value={win[k]} onPick={pick(k)} onRefresh={refresh(k)} options={LAST} />;
  const yk = (max: number, ticks: number) => ({ y: { min: 0, max, ticks, format: kFmt } });
  const two = (k: 'c1' | 'c2' | 'c4', names: [string, string]) => ({
    labels: DCS, series: [{ name: names[0], values: scale(OVERVIEW[k].ex, win[k], j(k, 0)) }, { name: names[1], values: scale(OVERVIEW[k].al, win[k], j(k, 1)) }],
  });
  return (
    <div className="panels protect-overview">
      <Panel title="Least Privileges by Shared Folder" sub={`Last ${win.c1} day${win.c1 === 1 ? '' : 's'}`} tools={tools('c1')}>
        <Chart kind="multiArea" title="Least Privileges by Shared Folder" data={two('c1', ['Excessive Privilege', 'Applied Least Privilege'])} options={yk(12000, 6)} />
      </Panel>
      <Panel title="Top Users with Least Privilege" sub={`Last ${win.c2} day${win.c2 === 1 ? '' : 's'}`} tools={tools('c2')}>
        <Chart kind="multiArea" title="Top Users with Least Privilege" data={two('c2', ['Excessive Privilege', 'Applied Least Privilege'])} options={{ y: { min: 0, max: 35, ticks: 7 } }} />
      </Panel>
      <Panel title="Comprehensive Policy Overview" sub="Permission policy outcomes" tools={<Button size="sm" onClick={() => nav('/protect/policies')}>Manage</Button>}>
        <ul className="protect-po">
          {POLICY_OVERVIEW.map((r) => (
            <li key={r.label}>
              <button type="button" className={'protect-po__row protect-po__row--' + r.tone}
                onClick={() => toast({ variant: 'info', title: r.label, message: `${r.label}: ${r.value}` })}>
                <span className="protect-po__ic" aria-hidden="true"><Icon name={r.icon === 'x' ? 'x' : r.icon === 'clock' ? 'clock' : r.icon === 'restore' ? 'restore' : r.icon === 'progress' ? 'refresh' : 'check'} size={15} /></span>
                <span className="grow">{r.label}</span><b>{pad(r.value)}</b>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Folder Risk Reduction by Policy Actions" sub={`Last ${win.c4} day${win.c4 === 1 ? '' : 's'}`} tools={tools('c4')}>
        <Chart kind="line" title="Folder Risk Reduction by Policy Actions" data={two('c4', ['Remove Least Privilege', 'Stale Users'])} options={yk(70000, 7)} />
      </Panel>
      <Panel title="Stale Users Across File Servers" sub={`Last ${win.c5} day${win.c5 === 1 ? '' : 's'}`} tools={tools('c5')}>
        <Chart kind="dateColumns" title="Stale Users Across File Servers" data={{ labels: DCS, name: 'Stale Users', values: scale(OVERVIEW.c5, win.c5, j('c5', 0)) }}
          options={{ legend: true, y: { min: 0, max: 40, ticks: 4 } }} />
      </Panel>
      <Panel title="Team Management Insights" sub="Enrolment across the hierarchy">
        <Chart kind="donut" title="Team Management Insights" data={{ caption: 'Total Members', value: 113, segments: TEAM }} />
      </Panel>
    </div>
  );
}

export default function OverviewPage() {
  const [sp, setSp] = useSearchParams();
  const toast = useToast();
  const ad = sp.get('view') === 'ad-cleaner';
  const [seed, setSeed] = useState(0);
  const [busy, run] = useBusy(550);
  const [syncing, runSync] = useBusy(900);
  const label = ad ? 'AD Cleaner' : 'Overview';
  return (
    <div className="sub">
      <PageHeader crumbs={[{ label: 'Lepide Protect' }, { label }]} title={label}
        actions={ad ? undefined : <>
          <IconButton icon="refresh" label="Refresh data" bordered className={busy ? 'protect-spin' : undefined} aria-busy={busy || undefined}
            onClick={() => run(() => { setSeed((s) => s + 1); toast({ variant: 'success', title: 'Data refreshed', message: 'Protect overview data is up to date.' }); })} />
          <Notifications />
          <Button variant="primary" icon="refresh" loading={syncing}
            onClick={() => { toast({ variant: 'info', title: 'Sync data from CPA', message: 'Syncing data from CPA…' }); runSync(); }}>Sync data from CPA</Button>
        </>}>
        <div className="protect-tabs">
          <Segmented hug mode="pressed" ariaLabel="Protect view" value={ad ? 'ad' : 'overview'}
            onChange={(v) => setSp(v === 'ad' ? { view: 'ad-cleaner' } : {})}
            items={[{ value: 'overview', label: 'Overview' }, { value: 'ad', label: 'AD Cleaner' }]} />
        </div>
      </PageHeader>
      {ad ? <AdAnalytics /> : <OverviewGrid seed={seed} />}
    </div>
  );
}
