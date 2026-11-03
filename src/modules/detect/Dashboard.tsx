import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import predefined from '../../data/dashboards/predefined.json';
import { Button, Chart, IconButton, Menu, PageHeader, SearchSelect, SelectField, Icon, type ChartKind } from '../../ui';
import { deliveryStore } from '../../stores/deliveryAccounts';
import { detectStore, stamp } from './model';

/* SCR-DET-04 · Detect Dashboard ("Dashboard - Detect"), Lepide Design System dashboard pattern (04 § 7).
   GAP-DET-13 intended behaviour: Day / Week / Month change a widget's range, Refresh reloads it and
   updates "Last Updated", Generate filters anomalies by user, chart points drill into the alerts /
   Alert Status. Figures are the original demo's, widened deterministically for the ranges. */

type Range = 'Day' | 'Week' | 'Month';
const DASHBOARDS = (predefined.exports.PREDEFINED_DASHBOARDS as { id: string; name: string }[]).map((x) => ({ value: x.id, label: x.name }));
const ANOMALY_DATES = ['11-06-2024', '12-06-2024', '13-06-2024', '17-06-2024', '20-06-2024', '21-06-2024', '24-06-2024', '28-06-2024', '01-07-2024', '02-07-2024', '04-07-2024', '05-07-2024', '09-07-2024'];
const ANOMALY_VALUES = [10, 10, 22, 4, 6, 4, 4, 4, 4, 4, 5, 16, 4];
const USERS = ['lpde4\\neal.gamby', 'lpde4\\michel.marsh', 'lpde4\\rand.warner'];
const LIVE_FEED = [
  ['09-07-2024 10:06:42 PM', 'ldep4\\neal.gamby Logoff 1 object(s) at 09/07/2024 22:06:42 from DMD01.'],
  ['09-07-2024 10:06:37 PM', 'ldep4\\neal.gamby Session Locked 1 object(s) at 09/07/2024 22:06:37 from RO-WS-114.'],
  ['09-07-2024 10:06:37 PM', 'ldep4\\neal.gamby Disconnected to the Remote Terminal or remote Desktop session from RO-WS-114.'],
  ['09-07-2024 02:33:09 PM', 'ldep4\\neal.gamby Interactive Logon 1 object(s) at 09/07/2024 14:33:09 from RO-WS-114.'],
  ['09-07-2024 10:06:42 AM', 'ldep4\\neal.gamby Logoff 1 object(s) at 09/07/2024 10:06:42 from DMD01.'],
  ['09-07-2024 10:06:37 AM', 'ldep4\\neal.gamby Session Locked 1 object(s) at 09/07/2024 10:06:37 from RO-WS-114.'],
  ['09-07-2024 10:06:37 AM', 'ldep4\\neal.gamby Disconnected to the Remote Terminal or remote Desktop session from RO-WS-114.'],
  ['09-07-2024 02:33:09 AM', 'ldep4\\neal.gamby Interactive Logon 1 object(s) at 09/07/2024 02:33:09 from RO-WS-114.'],
];
const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const SCALE: Record<Range, number> = { Day: 0.08, Week: 0.3, Month: 1 };
const scale = (v: number, r: Range) => Math.max(r === 'Month' ? v : 0, Math.round(v * SCALE[r]));
const POINTS: Record<Range, number> = { Day: 2, Week: 6, Month: 13 };

type W = { id: string; title: string; filter?: boolean; refreshOnly?: boolean; noStamp?: boolean };
const WIDGETS: W[] = [
  { id: 'threat', title: 'Alerts By Threat Models' },
  { id: 'anomalies', title: 'Anomalies Detected', filter: true, noStamp: true },
  { id: 'criticality', title: 'Alert By Criticality' },
  { id: 'feed', title: 'Live Feed', refreshOnly: true },
  { id: 'responses', title: 'Responses Initiated By Names' },
  { id: 'type', title: 'Alert By Type' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const alerts = detectStore.use((s) => s.alerts);
  const agents = deliveryStore.use((s) => s.agents);
  const [range, setRange] = useState<Record<string, Range>>({});
  const [updated, setUpdated] = useState<Record<string, string>>({
    threat: '28-06-2024 10:56:28 AM', criticality: '28-06-2024 10:56:28 AM', feed: '10-07-2024 12:38:07 AM', responses: '03-04-2024 09:47:59 AM', type: '28-06-2024 10:56:27 AM',
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [userDraft, setUserDraft] = useState('');
  const [user, setUser] = useState('');
  const r = (id: string): Range => range[id] ?? 'Month';
  const refresh = (id: string) => {
    setLoading((l) => ({ ...l, [id]: true }));
    setTimeout(() => { setLoading((l) => ({ ...l, [id]: false })); setUpdated((u) => ({ ...u, [id]: stamp() })); }, 900);
  };

  const charts = useMemo(() => {
    const models = alerts.filter((a) => a.status === 'Enabled').slice(0, 6);
    const anomalyN = POINTS[r('anomalies')];
    const factor = user ? 0.35 + (hash(user) % 40) / 100 : 1;
    const ipSeries = Array.from(new Set(['192.168.30.160', ...agents.filter((a) => /^\d/.test(a))]));
    return {
      threat: { kind: 'columns' as ChartKind, data: { name: 'Alerts', labels: models.map((m) => m.name), values: models.map((m) => scale(2 + (hash(m.name) % 9), r('threat'))) } },
      anomalies: { kind: 'multiArea' as ChartKind, data: { labels: ANOMALY_DATES.slice(-anomalyN), series: [{ name: 'Never seen changes', values: ANOMALY_VALUES.slice(-anomalyN).map((v) => Math.round(v * factor)) }] } },
      criticality: { kind: 'stacked' as ChartKind, data: { cats: ['12-06-2024', '13-06-2024', '14-06-2024'], series: [
        { name: 'High', color: '#cf3a3f', values: [11, 7, 9].map((v) => scale(v, r('criticality'))) },
        { name: 'Medium', color: '#ee8a5f', values: [6, 8, 5].map((v) => scale(v, r('criticality'))) },
        { name: 'Low', color: '#1c4599', values: [2, 3, 4].map((v) => scale(v, r('criticality'))) },
      ] } },
      responses: { kind: 'multiArea' as ChartKind, data: { labels: ['10-04-2024', '15-04-2024', '20-04-2024'], series: ipSeries.map((ip) => ({ name: ip, values: [0, 1, 2].map((i) => scale(1 + ((hash(ip) >> i) % 4), r('responses'))) })) } },
      type: { kind: 'columns' as ChartKind, data: { name: 'Alerts', labels: ['Brute Force Attack', 'Group Modifications', 'Mass data copy'], values: [2, 3, 4].map((v) => scale(v, r('type'))) } },
    };
  }, [alerts, agents, range, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drill-downs: a threat model / alert type opens Alert Configuration searched by it; the rest open Alert Status.
  const drill = (id: string) => (label: string) => {
    if (id === 'threat' || id === 'type') navigate('/detect', { state: { tab: 'threat', search: id === 'type' ? label.split(' ')[0] : label } });
    else navigate('/detect/alert-status');
  };

  const tools = (w: W) => (
    <span className="row" style={{ gap: 4 }}>
      {w.filter && (
        <Menu label="Filter anomalies" width={300} trigger={(p) => <IconButton icon="filter" label="Filter" data-tip="Filter" {...p} />}>
          {(close) => (
            <div className="detect-pop__body page-form">
              <SelectField label="All Changes Attempt:" placeholder="All users" options={USERS} value={userDraft} onChange={setUserDraft} />
              <Button variant="primary" size="sm" onClick={() => { setUser(userDraft); close(); }}>Generate</Button>
            </div>
          )}
        </Menu>
      )}
      <Menu label={`${w.title} range`} width={180} trigger={(p) => <IconButton icon="calendar" label="Calendar" data-tip="Calendar" {...p} />}
        items={[
          ...(w.refreshOnly ? [] : (['Day', 'Week', 'Month'] as Range[]).map((x) => ({ label: x, icon: 'calendar' as const, selected: r(w.id) === x, onSelect: () => { setRange((m) => ({ ...m, [w.id]: x })); refresh(w.id); } }))),
          ...(w.refreshOnly ? [] : [{ label: '', separator: true }]),
          { label: 'Refresh', icon: 'refresh', onSelect: () => refresh(w.id) },
        ]} />
    </span>
  );

  return (
    <div className="sub">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: 'Dashboards', to: '/dashboards' }, { label: 'Detect' }]} title="Dashboard - Detect"
        actions={
          <span className="row detect-dashlist">
            <span className="fld__lbl">Dashboards List</span>
            <SearchSelect pill ariaLabel="Dashboards List" options={DASHBOARDS} value="detect" onChange={(v) => { if (v !== 'detect') navigate(`/dashboards/${v}`); }} />
          </span>
        } />
      <div className="panels">
        {WIDGETS.map((w) => (
          <section key={w.id} className="lf-card panel" aria-busy={loading[w.id] || undefined}>
            <div className="row row--between" style={{ alignItems: 'flex-start', marginBottom: 6 }}>
              <h3 className="lf-card__title" style={{ margin: 0 }}>
                {w.title}
                <small>
                  {w.id === 'anomalies' ? (user ? `All Changes Attempt: ${user}` : `${r(w.id)} view`) : `${w.refreshOnly ? '' : r(w.id) + ' view · '}Last Updated ${updated[w.id]}`}
                </small>
              </h3>
              {tools(w)}
            </div>
            {loading[w.id] ? (
              <div className="page-loader" style={{ minHeight: 270 }} role="status"><span className="spinner-lg" /></div>
            ) : w.id === 'feed' ? (
              <ul className="detect-feed">
                {LIVE_FEED.map(([t, text], i) => (
                  <li key={i}>
                    <span className="detect-feed__ic" aria-hidden="true"><Icon name="bell" size={14} /></span>
                    <div><b>Anomaly Detected</b><time>{t}</time><p title={text}>{text}</p></div>
                  </li>
                ))}
              </ul>
            ) : (() => {
              const c = charts[w.id as keyof typeof charts];
              return <Chart kind={c.kind} data={c.data} height={270} title={w.title} onSelect={drill(w.id)} />;
            })()}
          </section>
        ))}
      </div>
    </div>
  );
}
