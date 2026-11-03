import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ConfirmDialog, DataTable, EmptyState, IconButton, SearchField, useToast } from '../../../ui';
import type { Column } from '../../../ui';
import { addCase, edStore, removeCase, runCase } from './store';
import type { Case, IndexedDocument } from './store';
import { AgentStatus, BASE, CaseStatus, EdHeader, RowMenu } from './parts';
import { DocumentPreview, ExportTools, ResultItem, SearchControls, useCaseQuery, useExporter } from './search';
import { CaseWizard } from './Wizard';

/* SCR-IDN-04 e-Discovery › Cases, with DLG-IDN-02 (side panel), DLG-IDN-05 (wizard), DLG-IDN-09 (delete). */

const SEARCHED: (keyof Case)[] = ['name', 'description', 'agent', 'agentStatus', 'status', 'type'];

export default function CasesPage() {
  const cases = edStore.use((s) => s.cases);
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [panelId, setPanelId] = useState<string | null>(null);
  const [wizard, setWizard] = useState(false);
  const [toDelete, setToDelete] = useState<Case | null>(null);
  const [tableKey, setTableKey] = useState(0);

  const panelCase = cases.find((c) => c.id === panelId) ?? null;
  useEffect(() => { if (panelId && !panelCase) setPanelId(null); }, [panelId, panelCase]);

  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return t ? cases.filter((c) => SEARCHED.some((k) => String(c[k]).toLowerCase().includes(t))) : cases;
  }, [cases, search]);

  const columns: Column<Case>[] = [
    { key: 'name', header: 'Case name', sortable: true, filterable: true, minWidth: 200 },
    { key: 'description', header: 'Description', sortable: true, filterable: true, minWidth: 180 },
    { key: 'agent', header: 'Agent', sortable: true, filterable: true, minWidth: 120 },
    { key: 'agentStatus', header: 'Agent status', sortable: true, filterable: true, minWidth: 170, render: (c) => <AgentStatus value={c.agentStatus} /> },
    { key: 'status', header: 'Status', sortable: true, filterable: true, minWidth: 140, render: (c) => <CaseStatus value={c.status} /> },
    { key: 'lastStart', header: 'Last search start time', sortable: true, filterable: true, minWidth: 190 },
    { key: 'lastEnd', header: 'Last search end time', sortable: true, filterable: true, minWidth: 190 },
    { key: 'type', header: 'Type', sortable: true, filterable: true, minWidth: 110 },
  ];

  const created = (c: Case) => {
    addCase(c);
    // A new case starts its run at once: Search Now, and every Index case (GAP-IDN-12 intended).
    if (c.status === 'In Progress') runCase(c.id);
    setWizard(false); setSearch(''); setTableKey((k) => k + 1);
    toast({ variant: 'success', title: 'Success!', message: 'Case created successfully' });
  };

  return (
    <div className="sub">
      <EdHeader tab="cases" actions={<Button variant="primary" icon="plus" onClick={() => { setPanelId(null); setWizard(true); }}>Create case</Button>} />
      <div className={panelCase ? 'with-detail' : undefined}>
        <DataTable key={tableKey} title="Cases" noun={['case', 'cases']} columns={columns} rows={rows} rowKey={(c) => c.id}
          search={search} pageSizes={[10, 20, 50, 100]} defaultPageSize={50}
          toolbar={<SearchField value={search} onChange={setSearch} placeholder="Search" ariaLabel="Search cases" />}
          activeKey={panelId} onRowOpen={(c) => setPanelId((id) => (id === c.id ? null : c.id))}
          rowActions={(c) => (
            <RowMenu label={`Actions for ${c.name}`} items={[
              { label: 'Search index', icon: 'search', onSelect: () => setPanelId(c.id) },
              {
                label: 'Run search now', icon: 'play', onSelect: () => runCase(c.id),
                disabled: c.type === 'Index' || c.status === 'In Progress',
                reason: c.type === 'Index' ? 'Index cases search their indexed locations.' : 'The search is already running.',
              },
              { label: 'Delete case', icon: 'trash', danger: true, onSelect: () => setToDelete(c) },
            ]} />
          )}
          empty={cases.length === 0 ? <EmptyState compact icon="file-search" title="You don't have any case here please click on Create Case button to create a case!" /> : undefined} />
        {panelCase && <SearchPanel key={panelCase.id} c={panelCase} onClose={() => setPanelId(null)} />}
      </div>

      <CaseWizard mode="case" open={wizard} onClose={() => setWizard(false)} onDone={(r) => r.kind === 'case' && created(r.value)} />

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} title="Delete case" confirmLabel="Delete"
        message={toDelete ? `Delete "${toDelete.name}"? Its search results are removed too. This can't be undone.` : undefined}
        onConfirm={() => {
          const c = toDelete!;
          removeCase(c.id);
          if (panelId === c.id) setPanelId(null);
          setToDelete(null);
          toast({ variant: 'success', title: 'Case deleted', message: `${c.name} was removed.` });
        }} />
    </div>
  );
}

/* ---------- DLG-IDN-02 Searching Index side panel (non-modal detail panel) ---------- */
function SearchPanel({ c, onClose }: { c: Case; onClose: () => void }) {
  const nav = useNavigate();
  const s = useCaseQuery(c);
  const [preview, setPreview] = useState<IndexedDocument | null>(null);
  const ex = useExporter(c.name, s.q, s.results ?? []);

  // Escape closes the panel unless a dialog, drawer or menu is open (menus stop the event themselves).
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[data-overlay]')) onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  const res = s.results;
  return (
    <aside className="lf-card detail identify-panel" aria-label="Searching index">
      <header className="drawer__head">
        <div style={{ minWidth: 0 }}><h3>Searching Index</h3><small>{c.name} · {c.type}</small></div>
        <IconButton icon="x" label="Close search panel" onClick={onClose} />
      </header>
      <div className="drawer__body">
        <SearchControls s={s} layout="panel" />
        {res && (res.length === 0 ? (
          <EmptyState compact icon="file-search" title="No results match your search or filters." />
        ) : (
          <section className="identify-results" aria-label="Results">
            <div className="identify-results__head">
              <h4>Results ({res.length})</h4>
              <div className="row"><ExportTools ex={ex} /></div>
            </div>
            {res.slice(0, 3).map((d) => <ResultItem key={d.id} doc={d} q={s.q} onPreview={setPreview} />)}
            {res.length > 3 && <Button iconEnd="arrow" onClick={() => nav(`${BASE}/search`)}>Show all</Button>}
          </section>
        ))}
      </div>
      <DocumentPreview doc={preview} q={s.q} onClose={() => setPreview(null)} />
      {ex.dialog}
    </aside>
  );
}
