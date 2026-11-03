import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { EmptyState, IconButton, PageHeader, Pager } from '../../../ui';
import { edStore } from './store';
import type { Case, IndexedDocument } from './store';
import { BASE } from './parts';
import { DocumentPreview, ExportTools, ResultItem, SearchControls, useCaseQuery, useExporter } from './search';

/* SCR-IDN-05 e-Discovery › Searching Index (expanded results). Needs a stored query whose case
   still exists; otherwise (reload, pasted link) it redirects to Cases (INT-IDN-060). */
export default function SearchPage() {
  const query = edStore.use((s) => s.query);
  const c = edStore.use((s) => s.cases.find((x) => x.id === s.query?.caseId));
  if (!query || !c) return <Navigate to={BASE} replace />;
  return <Expanded c={c} />;
}

const SIZES = [5, 10, 20, 50];

function Expanded({ c }: { c: Case }) {
  const nav = useNavigate();
  const s = useCaseQuery(c);
  const res = s.results;
  const ex = useExporter(c.name, s.q, res ?? []);
  const [preview, setPreview] = useState<IndexedDocument | null>(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(5);
  // Page returns to 1 when keys, operator, exact match or the page size change.
  useEffect(() => { setPage(1); }, [s.q.keys.join('\u0000'), s.q.operator, s.q.exact, size]);

  const total = res?.length ?? 0;
  const pages = Math.max(1, Math.ceil(total / size));
  const cur = Math.min(page, pages);
  const reason = !res ? 'Run a search first.' : total === 0 ? 'There are no results to export.' : undefined;

  return (
    <div className="sub">
      <nav className="crumbs identify-crumbs" aria-label="Breadcrumb">
        <IconButton icon="chevron-left" label="Back to cases" bordered onClick={() => nav(BASE)} />
        <Link to={BASE}>e-Discovery</Link><span aria-hidden="true">/</span><b aria-current="page">{c.name}</b>
      </nav>
      <PageHeader title="Searching Index" description={`${c.name} · ${c.type}`} />
      <section className="lf-card identify-searchcard">
        <SearchControls s={s} layout="page" />
      </section>
      <section className="lf-card tablecard identify-resultcard" aria-label="Results">
        <div className="toolbar">
          <h3 className="lf-card__title" style={{ margin: 0 }}>Results ({total})</h3>
          <div className="row row--wrap"><ExportTools ex={ex} reason={reason} /></div>
        </div>
        <div className="identify-resultlist">
          {!res ? <EmptyState compact icon="file-search" title="Add keywords and click Search to see the matching files." />
            : total === 0 ? <EmptyState compact icon="file-search" title="No results match your search or filters." />
              : res.slice((cur - 1) * size, cur * size).map((d) => <ResultItem key={d.id} doc={d} q={s.q} onPreview={setPreview} />)}
        </div>
        <Pager total={total} noun={['result', 'results']} page={cur} pages={pages} size={size} sizes={SIZES} onPage={setPage} onSize={setSize} />
      </section>
      <DocumentPreview doc={preview} q={s.q} onClose={() => setPreview(null)} />
      {ex.dialog}
    </div>
  );
}
