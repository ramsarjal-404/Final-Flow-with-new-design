import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Button, ConfirmDialog, DataTable, Icon, IconButton, PageHeader, SearchField, onMenuKeys, useToast, type Column } from '../../ui';
import { DetailsDialog } from './DetailsDialog';
import { ShareDialog } from './ShareDialogs';
import { removeDashboard, useDashboards, type Dashboard } from './store';

/* SCR-DSH-01 · Dashboards list (+ DLG-DSH-01 create, DLG-DSH-02 row menu, DLG-DSH-03 delete, DLG-DSH-04/05 share). */

/** D-18: "Shared with" as an avatar stack (max 4) with the full names in the tooltip and accessible label. */
function SharedWith({ value }: { value: string }) {
  if (!value) return <span className="lf-na">—</span>;
  const names = value.split(', ');
  return (
    <span className="dashboards-avs" data-tip={value} aria-label={value} role="img" tabIndex={0}>
      {names.slice(0, 4).map((n) => <Avatar key={n} name={n} size={26} />)}
      {names.length > 4 && <span className="dashboards-avs__more">+{names.length - 4}</span>}
    </span>
  );
}

/** DLG-DSH-02 · floating row action menu (closes on outside click, Escape, scroll and resize). */
function RowMenu({ dashboard, anchor, onClose, onEdit, onDelete, onShare }: {
  dashboard: Dashboard; anchor: HTMLElement; onClose: () => void; onEdit: () => void; onDelete: () => void; onShare: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -999, left: -999 });
  const place = () => {
    const r = anchor.getBoundingClientRect(); const el = ref.current; const w = el?.offsetWidth ?? 200; const h = el?.offsetHeight ?? 130;
    const below = r.bottom + 6 + h < innerHeight;
    setPos({ top: below ? r.bottom + 6 : r.top - h - 6, left: Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) });
  };
  useLayoutEffect(() => {
    place();
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('.pop__item:not([aria-disabled="true"])')?.focus());
  }, [anchor]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const down = (e: MouseEvent) => { if (ref.current?.contains(e.target as Node) || anchor.contains(e.target as Node)) return; onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); anchor.focus(); } };
    // Ignore the scroll the browser makes to bring the clicked trigger into view as the menu opens.
    const t0 = performance.now();
    const away = (e: Event) => {
      if (e.target instanceof Node && ref.current?.contains(e.target)) return;
      if (performance.now() - t0 < 250) { place(); return; }
      onClose();
    };
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key, true);
    addEventListener('scroll', away, true); addEventListener('resize', away);
    return () => {
      document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key, true);
      removeEventListener('scroll', away, true); removeEventListener('resize', away);
    };
  }, [anchor, onClose]); // eslint-disable-line react-hooks/exhaustive-deps
  const pre = dashboard.predefined;
  const item = (label: string, icon: 'edit' | 'trash' | 'share', run: () => void, reason?: string, danger?: boolean) => (
    <button type="button" role="menuitem" className={'pop__item' + (danger && !reason ? ' pop__item--danger' : '')}
      aria-disabled={reason ? true : undefined} data-tip={reason}
      onClick={() => { if (reason) return; onClose(); run(); }}>
      <Icon name={icon} size={15} /><span>{label}</span>
    </button>
  );
  return createPortal(
    <div ref={ref} className="pop lf dashboards-menu" role="menu" aria-label={`Actions for ${dashboard.name}`} onKeyDown={onMenuKeys}
      style={{ position: 'fixed', top: pos.top, left: pos.left, right: 'auto' }}>
      {item('Edit', 'edit', onEdit, pre ? "Predefined dashboards can't be edited" : undefined)}
      {item('Delete', 'trash', onDelete, pre ? "Predefined dashboards can't be deleted" : undefined, true)}
      {item('Share', 'share', onShare)}
    </div>, document.body);
}

export default function ListPage() {
  const nav = useNavigate();
  const toast = useToast();
  const dashboards = useDashboards();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [menu, setMenu] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [removing, setRemoving] = useState<Dashboard | null>(null);
  const [sharing, setSharing] = useState<Dashboard | null>(null);

  // Global search: Name, Description, Shared With, Shared By or Added By (case-insensitive substring).
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? dashboards.filter((d) => [d.name, d.description, d.sharedWith, d.sharedBy, d.addedBy].some((v) => v.toLowerCase().includes(t))) : dashboards;
  }, [dashboards, q]);

  const columns: Column<Dashboard>[] = [
    { key: 'name', header: 'Dashboard Name', sortable: true, filterable: true, minWidth: 200, value: (d) => d.name,
      render: (d) => <Link className="lf-link" to={`/dashboards/${d.id}`}>{d.name}</Link> },
    { key: 'description', header: 'Description', sortable: true, filterable: true, minWidth: 200, value: (d) => d.description, render: (d) => d.description },
    { key: 'sharedWith', header: 'Shared With', sortable: true, filterable: true, minWidth: 150, value: (d) => d.sharedWith, render: (d) => <SharedWith value={d.sharedWith} /> },
    { key: 'sharedBy', header: 'Shared By', sortable: true, filterable: true, minWidth: 130, value: (d) => d.sharedBy, render: (d) => d.sharedBy },
    { key: 'addedBy', header: 'Added By', sortable: true, filterable: true, minWidth: 130, value: (d) => d.addedBy, render: (d) => d.addedBy },
    { key: 'addedOn', header: 'Added On', sortable: true, filterable: true, minWidth: 120, value: (d) => d.addedOn, render: (d) => d.addedOn },
  ];

  const current = menu ? dashboards.find((d) => d.id === menu.id) : undefined;
  return (
    <div className="sub sub--fill">
      <PageHeader title="Dashboards" actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Create dashboard</Button>} />
      {/* Rows are pre-filtered by the spec's search fields; `search` is passed too so the table resets to page 1.
          When nothing matches, the full list goes in with a search that cannot match, so the table keeps its
          pager ("0 records") and shows the no-results copy. */}
      <DataTable className="dashboards-list" columns={columns} rows={rows.length ? rows : dashboards} rowKey={(d) => d.id}
        search={rows.length ? q : '\u0000' + q} noun={['record', 'records']}
        pageSizes={[10, 20, 50, 100]} defaultPageSize={50}
        toolbar={<SearchField value={q} onChange={setQ} placeholder="Search" ariaLabel="Search dashboards" />}
        rowActions={(d) => {
          const open = menu?.id === d.id;
          return (
            <IconButton icon="more" label={`Actions for ${d.name}`} aria-haspopup="menu" aria-expanded={open}
              className={open ? 'is-open' : undefined}
              onClick={(e) => { const el = e.currentTarget; setMenu(open ? null : { id: d.id, anchor: el }); }} />
          );
        }} />

      {menu && current && (
        <RowMenu dashboard={current} anchor={menu.anchor} onClose={() => setMenu(null)}
          onEdit={() => nav(`/dashboards/${current.id}/edit`)} onDelete={() => setRemoving(current)} onShare={() => setSharing(current)} />
      )}

      <DetailsDialog open={creating} mode="create" initial={{ name: '', description: '' }} taken={dashboards.map((d) => d.name)}
        onClose={() => setCreating(false)}
        onConfirm={(v) => { setCreating(false); nav('/dashboards/new', { state: v }); }} />

      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} confirmLabel="Delete"
        title={removing ? `Do you really want to delete “${removing.name}”?` : ''} message="This can't be undone."
        onConfirm={() => {
          if (!removing) return;
          removeDashboard(removing.id);
          toast({ variant: 'success', title: 'Dashboard deleted', message: `“${removing.name}” was deleted.` });
          setRemoving(null);
        }} />

      <ShareDialog dashboard={sharing} onClose={() => setSharing(null)} />
    </div>
  );
}
