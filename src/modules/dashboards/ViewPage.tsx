import { useEffect, useRef, useState } from 'react';
import { Suspense, lazy } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageLoader } from '../../ui';
const DetectDashboard = lazy(() => import('../detect/Dashboard'));
import { Button, Chip, EmptyState, IconButton, PageHeader, SearchSelect, useToast } from '../../ui';
import type { ToastHandle } from '../../ui';
import { DashCard } from './DashCard';
import {
  FIXED_STAMP, dashStamp, graphTitle, graphWidget, reportPath, updateGraphs, useDashboard, useDashboards,
  type Dashboard, type Widget, type WidgetTool,
} from './store';

/* SCR-DSH-02 · Predefined dashboard view and SCR-DSH-03 · Custom dashboard view. */

const TOOL_MESSAGE: Record<WidgetTool, string> = {
  calendar: 'Date range: last 30 days.',
  filter: 'Filters apply to this card only.',
  list: 'Showing the data behind this card.',
};

export function NameChip({ name, onRename }: { name: string; onRename?: () => void }) {
  return (
    <div className="dashboards-chip">
      <Chip tone="brand" icon="grid">Dashboard Name- {name}</Chip>
      {onRename && <IconButton icon="edit" size={14} label="Rename dashboard" onClick={onRename} />}
    </div>
  );
}

export default function ViewPage() {
  const { id } = useParams();
  const d = useDashboard(id);
  if (!d) return <Navigate to="/dashboards" replace />;
  // SCR-DET-04: the predefined "Detect" entry opens Detect's own dashboard (GAP-DSH-11 / GAP-DET-13 intended).
  if (d.id === 'detect') return <Suspense fallback={<PageLoader />}><DetectDashboard /></Suspense>;
  return d.predefined ? <PredefinedView key={d.id} d={d} /> : <CustomView key={d.id} d={d} />;
}

function PredefinedView({ d }: { d: Dashboard }) {
  const nav = useNavigate();
  const toast = useToast();
  const all = useDashboards();
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);

  const refresh = () => {
    if (busy) return;
    setBusy(true);
    const note = toast({ variant: 'info', title: d.name, message: 'Refreshing the dashboard…', loading: true });
    window.setTimeout(() => { setBusy(false); setNonce((n) => n + 1); note.update({ variant: 'success', loading: false, message: 'Dashboard refreshed.' }); }, 600);
  };
  const tool = (w: Widget, t: WidgetTool) => toast({ variant: 'info', title: w.title, message: TOOL_MESSAGE[t] });
  const grid = (ws: Widget[]) => (
    <section className="panels dashboards-grid" key={nonce}>
      {ws.map((w) => (
        <DashCard key={w.id} title={w.title} subtitle={w.subtitle} titleEdit={w.titleEdit} tools={w.tools?.length ? w.tools : ['calendar']}
          stamp={FIXED_STAMP} span={w.span ?? 1} kind={w.kind} data={w.data ?? {}} nonce={nonce}
          onTool={(t) => tool(w, t)}
          onRename={() => toast({ variant: 'info', title: w.title, message: 'Rename this card from Manage Dashboard.' })} />
      ))}
    </section>
  );

  return (
    <div className="sub">
      <PageHeader crumbs={[{ label: 'Dashboard', to: '/dashboards' }, { label: d.name }]} title={d.title ?? `Dashboard- ${d.name}`}
        actions={<>
          <SearchSelect className="dashboards-switch" pill label={d.manage ? 'Dashboard List' : 'Dashboards List'} value={d.id}
            options={all.map((x) => ({ value: x.id, label: x.name }))} onChange={(v) => v !== d.id && nav(`/dashboards/${v}`)} />
          {d.manage && <Button onClick={() => nav('/dashboards')}>Manage dashboard</Button>}
          <Button icon="refresh" loading={busy} aria-label="Refresh dashboard" onClick={refresh}>Refresh</Button>
        </>}>
        <NameChip name={d.name} />
      </PageHeader>
      {grid(d.widgets)}
      {(d.sections ?? []).map((s) => (
        <div key={s.title} className="stack">
          <h3 className="section-title dashboards-section">
            {s.title}
            <IconButton icon="refresh" size={15} label={`Refresh ${s.title}`} data-tip="Refresh" aria-busy={busy || undefined}
              className={busy ? 'dashboards-spin' : undefined} onClick={refresh} />
          </h3>
          {grid(s.widgets)}
        </div>
      ))}
    </div>
  );
}

function CustomView({ d }: { d: Dashboard }) {
  const nav = useNavigate();
  const toast = useToast();
  const note = useRef<ToastHandle | null>(null);
  const graphs = d.graphs ?? [];
  const hasNodata = graphs.some((g) => g.state === 'nodata');
  const hasLoading = graphs.some((g) => g.state === 'loading');
  const edit = () => nav(`/dashboards/${d.id}/edit`);

  // INT-DSH-078: graphs saved as "nodata" load on arrival; every loading graph becomes ready 1200 ms later.
  useEffect(() => { if (hasNodata) updateGraphs(d.id, (g) => (g.state === 'nodata' ? { ...g, state: 'loading' } : g)); }, [d.id, hasNodata]);
  useEffect(() => {
    if (!hasLoading) return;
    const t = window.setTimeout(() => {
      const now = dashStamp(); updateGraphs(d.id, (g) => (g.state === 'loading' ? { ...g, state: 'ready', updated: now } : g));
      note.current?.update({ variant: 'success', loading: false, message: 'Graphs refreshed.' }); note.current = null;
    }, 1200);
    return () => clearTimeout(t);
  }, [d.id, hasLoading]);

  const refresh = () => {
    updateGraphs(d.id, (g) => (g.state === 'ready' ? { ...g, state: 'loading' } : g));
    note.current?.dismiss();
    note.current = toast({ variant: 'info', title: d.name, message: 'Refreshing graphs…', loading: true });
  };

  return (
    <div className="sub">
      <PageHeader crumbs={[{ label: 'Dashboard', to: '/dashboards' }, { label: d.name }]} title={`Dashboard- ${d.name}`}
        actions={<>
          <Button icon="refresh" onClick={refresh}>Refresh</Button>
          <Button variant="primary" icon="edit" onClick={edit}>Edit</Button>
        </>}>
        <NameChip name={d.name} onRename={edit} />
      </PageHeader>
      {graphs.length === 0 ? (
        <div className="lf-card dashboards-empty">
          <EmptyState icon="grid" title="This dashboard has no graphs yet." action={<Button icon="plus" onClick={edit}>Add graph</Button>} />
        </div>
      ) : (
        <section className="panels dashboards-grid">
          {graphs.map((g) => {
            const w = graphWidget(g); const title = graphTitle(g.config);
            return (
              <DashCard key={g.id} title={title} state={g.state} stamp={g.updated ?? FIXED_STAMP} tools={['calendar']} kind={w.kind} data={w.data}
                reportTo={reportPath(g.config)} onTool={(t) => toast({ variant: 'info', title, message: TOOL_MESSAGE[t] })} />
            );
          })}
        </section>
      )}
    </div>
  );
}
