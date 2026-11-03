import { useState } from 'react';
import { Button, Card, Dropdown, IconButton, Menu, PageHeader, useToast } from '@lepide/ds-react';
import { Chart, KpiCard } from '@lepide/ds-react/charts';

/* Dashboard (DESIGN.md §4.2): page header with a dashboard switcher and Refresh, a KPI row, then chart panels
   in the .panels grid. Each panel is a Card whose title names the chart, whose subtitle says when it was updated, and
   whose actions are small tools: refresh this panel, and a menu with Download CSV and Open full report. */

const DASHBOARDS = [
  { value: 'security', label: 'Security overview' },
  { value: 'files', label: 'File server activity' },
  { value: 'ad', label: 'Active Directory changes' },
];

const stamp = (d: Date) =>
  'Last updated on ' + d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* Chart colours use the product colour names, which Chart resolves to Lepide Design System values (DESIGN.md §2.3). */
const RISK_BANDS = [
  { to: 40, label: 'Low', color: 'var(--chart-green)' },
  { to: 70, label: 'Medium', color: 'var(--dch-orange)' },
  { to: 100, label: 'High', color: 'var(--dch-crimson)' },
];

const DAYS = ['21 Oct', '22 Oct', '23 Oct', '24 Oct', '25 Oct', '26 Oct', '27 Oct', '28 Oct', '29 Oct', '30 Oct', '31 Oct', '1 Nov', '2 Nov', '3 Nov'];

export default function Dashboard() {
  const toast = useToast();
  const [board, setBoard] = useState('security');
  const [updated, setUpdated] = useState(() => new Date(2026, 10, 3, 9, 42));
  const [refreshing, setRefreshing] = useState(false);
  const name = DASHBOARDS.find((d) => d.value === board)?.label ?? 'Security overview';
  const caption = stamp(updated);

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setUpdated(new Date());
      setRefreshing(false);
      toast({ variant: 'success', message: `${name} refreshed` });
    }, 900);
  };

  const tools = (title: string) => (<>
    <IconButton icon="refresh" label={`Refresh ${title}`}
      onClick={() => toast({ variant: 'success', message: `${title} refreshed` })} />
    <Menu
      label={`More actions for ${title}`}
      trigger={(p) => <IconButton {...p} icon="more" label={`More actions for ${title}`} />}
      items={[
        { label: 'Download CSV', icon: 'download', onSelect: () => toast({ variant: 'success', message: `${title} downloaded as CSV` }) },
        { label: 'Open full report', icon: 'external', onSelect: () => toast({ variant: 'info', message: `Opening the ${title} report` }) },
      ]}
    />
  </>);

  return (
    <div className="sub">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Dashboards', to: '/dashboards' }, { label: name }]}
        title={name}
        description="Changes, logons and risk across every monitored server in corp.lepide.local."
        actions={<>
          <Dropdown pill ariaLabel="Dashboard" value={board} onChange={setBoard} options={DASHBOARDS}
            style={{ width: 'calc(var(--s10) * 6)' }} />
          <Button icon="refresh" loading={refreshing} onClick={refresh}>Refresh</Button>
        </>}
      />

      <div className="kpis">
        <KpiCard label="Changes audited" value={48216} delta="+6%" deltaDir="up" deltaTone="brand"
          foot="vs previous 7 days" spark={[6120, 6480, 7010, 6890, 7240, 6930, 7546]} />
        <KpiCard label="Failed logons" value={1204} delta="−18%" deltaDir="down" deltaTone="good"
          foot="vs previous 7 days" spark={[220, 198, 240, 176, 150, 162, 140]} />
        <KpiCard label="Open alerts" value={37} delta="+9" deltaDir="up" deltaTone="bad"
          foot="vs yesterday" spark={[22, 25, 24, 30, 28, 33, 37]} sparkColor="var(--chart-red)" />
        <KpiCard label="Files with open access" value={2318} delta="−4%" deltaDir="down" deltaTone="good"
          foot="Shared with Everyone" spark={[2480, 2460, 2410, 2400, 2372, 2340, 2318]} />
      </div>

      <div className="panels">
        <Card className="panel" title="Changes by server" sub={caption} actions={tools('Changes by server')}>
          <Chart kind="columns" title="Changes by server"
            data={{ name: 'Changes', labels: ['DC01', 'FS01', 'FS02', 'EXCH01', 'SQL01'], values: [1840, 1320, 960, 610, 420] }} />
        </Card>

        <Card className="panel" title="Permissions by type" sub={caption} actions={tools('Permissions by type')}>
          <Chart kind="donut" title="Permissions by type"
            data={{ caption: 'Permissions', segments: [
              { label: 'Inherited', value: 1890 }, { label: 'Explicit', value: 412 }, { label: 'Open access', value: 64 },
            ] }} />
        </Card>

        <Card className="panel" title="Risk score" sub={caption} actions={tools('Risk score')}>
          <Chart kind="speedometer" title="Risk score"
            data={{ value: 68, name: 'Risk', bands: RISK_BANDS }} />
        </Card>

        <Card className="panel panel--wide" title="Changes over the last 14 days" sub={caption} actions={tools('Changes over the last 14 days')}>
          <Chart kind="multiArea" title="Changes over the last 14 days" height={300}
            data={{ labels: DAYS, series: [
              { name: 'File servers', values: [610, 680, 720, 650, 800, 420, 300, 640, 700, 760, 820, 780, 450, 320] },
              { name: 'Active Directory', values: [320, 410, 380, 450, 520, 300, 180, 360, 440, 470, 510, 490, 260, 170] },
            ] }} />
        </Card>

        <Card className="panel" title="Top users by changes" sub={caption} actions={tools('Top users by changes')}>
          <Chart kind="pairedBars" title="Top users by changes"
            data={{ rows: ['j.smith', 'a.khan', 'svc-backup', 'm.garcia', 'l.chen'], series: [
              { name: 'Modified', values: [412, 356, 298, 241, 187] },
              { name: 'Deleted', values: [64, 22, 118, 31, 15] },
            ] }} />
        </Card>
      </div>
    </div>
  );
}
