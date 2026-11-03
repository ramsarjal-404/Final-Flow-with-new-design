import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, ConfirmDialog, Icon, PageHeader, useToast } from '../../ui';
import { useAuth } from '../../app/auth';
import { AddGraphWizard } from './AddGraphWizard';
import { DashCard } from './DashCard';
import { DetailsDialog } from './DetailsDialog';
import { NameChip } from './ViewPage';
import {
  FIXED_STAMP, dashDate, graphTitle, graphWidget, isConfigured, reportPath, saveDashboard, useDashboard, useDashboards,
  type Dashboard, type Graph, type GraphConfig,
} from './store';

/* SCR-DSH-04 · Dashboard editor — Create (/dashboards/new) and SCR-DSH-05 · Customize (/dashboards/:id/edit). */

type DraftGraph = Graph & { tok?: number };
type Draft = { name: string; description: string; graphs: DraftGraph[] };
const LOAD_MS = 1200;

/** Route guard for /dashboards/new: needs router state { name, description }. */
export function CreateEditor() {
  const st = useLocation().state as { name?: string; description?: string } | null;
  if (!st || typeof st.name !== 'string') return <Navigate to="/dashboards" replace />;
  return <Editor initial={{ name: st.name, description: st.description ?? '', graphs: [] }} />;
}

/** Route guard for /dashboards/:id/edit: predefined → the view; unknown → the list. */
export function CustomizeEditor() {
  const { id } = useParams();
  const d = useDashboard(id);
  if (!d) return <Navigate to="/dashboards" replace />;
  if (d.predefined) return <Navigate to={`/dashboards/${d.id}`} replace />;
  return <Editor key={d.id} saved={d} initial={{ name: d.name, description: d.description, graphs: d.graphs ?? [] }} />;
}

function Editor({ saved, initial }: { saved?: Dashboard; initial: Draft }) {
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const all = useDashboards();
  const [draft, setDraft] = useState<Draft>(initial);
  const [wizard, setWizard] = useState<{ editId?: string; initial?: GraphConfig } | null>(null);
  const [removing, setRemoving] = useState<DraftGraph | null>(null);
  const [renaming, setRenaming] = useState(false);
  const loading = draft.graphs.some((g) => g.state === 'loading');

  // INT-DSH-077: a submitted graph loads for 1200 ms, then becomes "nodata" (configured) or "notconfigured".
  useEffect(() => {
    const timers = draft.graphs.filter((g) => g.state === 'loading').map((g) => {
      const tok = g.tok ?? Date.now();
      return window.setTimeout(() => setDraft((d) => ({
        ...d, graphs: d.graphs.map((x) => (x.id === g.id && x.state === 'loading' && x.tok === g.tok ? { ...x, state: isConfigured(x.config) ? 'nodata' : 'notconfigured' } : x)),
      })), Math.max(0, tok + LOAD_MS - Date.now()));
    });
    return () => timers.forEach(clearTimeout);
  }, [draft.graphs]);

  const submit = (config: GraphConfig) => {
    const tok = Date.now();
    setDraft((d) => wizard?.editId
      ? { ...d, graphs: d.graphs.map((g) => (g.id === wizard.editId ? { ...g, config: { ...config, kind: undefined }, state: 'loading', updated: undefined, tok } : g)) }
      : { ...d, graphs: [...d.graphs, { id: `g-${tok}`, config, state: 'loading', tok }] });
    setWizard(null);
  };

  const save = () => {
    const graphs: Graph[] = draft.graphs.map(({ tok: _tok, ...g }) => g); // eslint-disable-line @typescript-eslint/no-unused-vars
    const id = saved?.id ?? `custom-${Date.now()}`;
    saveDashboard(saved ? { ...saved, name: draft.name, description: draft.description, graphs }
      : { id, name: draft.name, description: draft.description, sharedWith: '', sharedBy: '', addedBy: user?.name ?? '', addedOn: dashDate(), predefined: false, widgets: [], graphs });
    toast({ variant: 'success', title: 'Dashboard saved', message: `“${draft.name}” was saved.` });
    nav(`/dashboards/${id}`);
  };

  const openAdd = () => setWizard({});
  const crumbs = saved
    ? [{ label: 'Dashboard', to: '/dashboards' }, { label: saved.name, to: `/dashboards/${saved.id}` }, { label: `${saved.name} Edit` }]
    : [{ label: 'Dashboard', to: '/dashboards' }, { label: 'Create dashboard' }];

  return (
    <div className="sub">
      <PageHeader crumbs={crumbs} title={saved ? `Dashboard- ${draft.name}` : 'Dashboards'}
        actions={<>
          <Button onClick={() => nav(saved ? `/dashboards/${saved.id}` : '/dashboards')}>Discard</Button>
          <Button icon="save" disabled={loading} onClick={save}>Save dashboard</Button>
          <Button variant="primary" icon="plus" onClick={openAdd}>Add graph</Button>
        </>}>
        <NameChip name={draft.name} onRename={() => setRenaming(true)} />
      </PageHeader>

      <section className="dashboards-canvas" role="region" aria-label="Dashboard canvas">
        {draft.graphs.length === 0 ? (
          <button type="button" className="dashboards-hint" onClick={openAdd}>
            <span className="dashboards-hint__ring"><Icon name="plus" size={22} /></span>
            <span><b>Add graph</b> to start building this dashboard.</span>
          </button>
        ) : (
          <div className="panels dashboards-grid">
            {draft.graphs.map((g) => {
              const w = graphWidget(g); const title = graphTitle(g.config);
              return (
                <DashCard key={g.id} editing title={title} state={g.state} stamp={g.updated ?? FIXED_STAMP} kind={w.kind} data={w.data}
                  reportTo={reportPath(g.config)}
                  onEdit={() => setWizard({ editId: g.id, initial: { ...g.config } })} onDelete={() => setRemoving(g)} />
              );
            })}
          </div>
        )}
      </section>

      <AddGraphWizard open={!!wizard} initial={wizard?.initial} onClose={() => setWizard(null)} onSubmit={submit} />

      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} confirmLabel="Remove" message="This can't be undone."
        title={removing ? `Do you really want to remove “${graphTitle(removing.config)}”?` : ''}
        onConfirm={() => { const r = removing; setRemoving(null); if (r) setDraft((d) => ({ ...d, graphs: d.graphs.filter((g) => g.id !== r.id) })); }} />

      <DetailsDialog open={renaming} mode="edit" initial={{ name: draft.name, description: draft.description }}
        taken={all.filter((d) => d.id !== saved?.id).map((d) => d.name)}
        onClose={() => setRenaming(false)}
        onConfirm={(v) => { setDraft((d) => ({ ...d, ...v })); setRenaming(false); }} />
    </div>
  );
}
