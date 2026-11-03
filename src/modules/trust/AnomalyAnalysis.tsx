import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Chart, Person } from '../../ui';
import { formatCell } from '../../reports';
import { ANOMALY_SEED_USER, SEED, type Anomaly, type AnomalyDetail, type AnomalyUser } from './data';
import { DeepFrame, useDeepReport } from './frame';
import { DeepTable, useDeepModel, type DCol } from './DeepTable';

/* SCR-TRU-10 · Anomaly Analysis (FLW-TRU-10): Users → the selected user's anomalies (+ trend chart)
   → the event behind the selected anomaly. Date chip (DLG-TRU-03, chip text only — GAP-TRU-16); no
   Export. Lepide Design System 08 § 4: chart panels — a "Total Anomalies" bar panel (a bar selects that user) and
   the "Anomaly (198)" trend area for LPDE4\justin.Hammer, the only user with seed anomalies. */

type U = AnomalyUser & { k: string };
type A = Anomaly & { k: string };
type Det = AnomalyDetail & { k: string };
const USERS: U[] = SEED.ANOMALY_USERS.map((r) => ({ ...r, k: r.user }));
const ANOMALIES: A[] = SEED.ANOMALIES.map((r, i) => ({ ...r, k: String(i) }));
const DETAIL: Det = { ...SEED.ANOMALY_DETAIL, k: '0' };
const CHART = SEED.ANOMALY_CHART;

const text = <T,>(key: keyof T & string, header: string, minWidth = 150): DCol<T> => ({
  key, header, sortable: true, filterable: true, minWidth, value: (r) => String(r[key] ?? ''),
});
const USER_COLS: DCol<U>[] = [
  { ...text<U>('user', 'User', 240), render: (r) => <Person name={r.user} /> },
  text<U>('components', 'Component(s)', 240),
  { key: 'total', header: 'Total Anomalies', sortable: true, filterable: true, minWidth: 150, value: (r) => r.total, cls: 'lf-num' },
];
const ANOMALY_COLS: DCol<A>[] = [
  { ...text<A>('when', 'Date Time', 190), cls: 'lf-num' },
  { ...text<A>('details', 'Details', 520), cls: 'td-wrap' },
];
const DETAIL_COLS: DCol<Det>[] = [
  { ...text<Det>('path', 'Path', 240), cls: 'lf-mono' },
  { ...text<Det>('operation', 'Operation', 200), render: (r) => formatCell('Operation', r.operation) },
  text<Det>('process', 'Process Name', 140), text<Det>('source', 'From', 130),
  text<Det>('severity', 'Severity', 240), { ...text<Det>('when', 'When', 190), cls: 'lf-num' },
];

export default function AnomalyAnalysis() {
  const rep = useDeepReport('anomaly-analysis');
  const { status, gen, filterRows } = rep;
  const [user, setUser] = useState<string | null>(null);
  const [anomaly, setAnomaly] = useState<string | null>(null);

  const users = useMemo(() => filterRows(USERS, (r, f) => (f === 'User' ? r.user : f === 'Component(s)' ? r.components : undefined)), [filterRows]);
  const anomalies = useMemo(() => (user === ANOMALY_SEED_USER ? ANOMALIES : []), [user]);
  const details = useMemo(() => (anomaly !== null && user === ANOMALY_SEED_USER ? [DETAIL] : []), [anomaly, user]);
  const um = useDeepModel(users, USER_COLS, status, gen);
  const am = useDeepModel(anomalies, ANOMALY_COLS, status, gen);
  const dm = useDeepModel(details, DETAIL_COLS, status, gen);

  if (rep.entry.redirect || !rep.entry.row) return <Navigate to="/trust" replace />;
  const ready = status === 'ready';
  const generate = () => { setUser(null); setAnomaly(null); rep.generate(); };
  const pickUser = (u: string) => { if (!ready) return; setUser(u); setAnomaly(null); };
  const showTrend = ready && user === ANOMALY_SEED_USER;

  return (
    <DeepFrame rep={rep} exportTable={null} onGenerate={generate}>
      <DeepTable model={um} columns={USER_COLS} rowKey={(r) => r.k} title="Users" titleId="tru-an-users" status={status} primary onGenerate={generate}
        onRowOpen={ready ? (r) => pickUser(r.user) : undefined} selectedKey={user} rowLabel={(r) => `${r.user}, ${r.total} anomalies`} />
      <DeepTable model={am} columns={ANOMALY_COLS} rowKey={(r) => r.k} title={user && ready ? `Anomaly · ${user}` : 'Anomaly'} titleId="tru-an-anomaly" status={status}
        emptyText={user ? 'No anomaly records for this user in the demo dataset.' : 'Select a user to view their anomalies.'}
        onRowOpen={ready ? (r) => setAnomaly(r.k) : undefined} selectedKey={anomaly} rowLabel={(r) => `${r.when}: ${r.details}`} />
      <DeepTable model={dm} columns={DETAIL_COLS} rowKey={(r) => r.k} title="Anomaly Details" titleId="tru-an-details" status={status}
        emptyText="Select an anomaly to view its details." />

      {ready && (
        <div className="grid2">
          <section className={'lf-card panel' + (showTrend ? '' : ' panel--wide')}>
            <h3 className="lf-card__title">Total Anomalies<small>By user · select a bar to open that user's anomalies</small></h3>
            <Chart kind="columns" title="Total Anomalies by user" height={showTrend ? 270 : 300}
              data={{ name: 'Total Anomalies', labels: users.map((u) => u.user.split('\\').pop()), values: users.map((u) => u.total) }}
              onSelect={(_, i) => { const u = users[i]; if (u) pickUser(u.user); }} />
          </section>
          {showTrend && (
            <section className="lf-card panel">
              <h3 className="lf-card__title">{CHART.title}<small>{user}</small></h3>
              <Chart kind="multiArea" title={CHART.title} data={{ labels: CHART.labels, series: CHART.series }}
                options={{ markers: true, legend: true }} />
            </section>
          )}
        </div>
      )}
    </DeepFrame>
  );
}
