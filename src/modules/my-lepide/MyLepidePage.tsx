import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, ConfirmDialog, EmptyState, Icon, IconButton, PageHeader, useToast } from '../../ui';
import {
  ALL_ID, ReportPager, ReportTable, ReportTree, displayTitle, useMyLepide, useOpenReport, useTableModel,
  type CatalogFolder, type CatalogReportNode, type MyLepideRow, type RCol,
} from '../../reports';

/* SCR-MYL-01 · My Lepide (Lepide Design System 04 § 12 simple list page + the hub's folder card, 08 § 9) and
   DLG-MYL-01 · Remove from My Lepide. Rows are a live projection of the report store (useMyLepide),
   so the hubs' "My Lepide" toggles and this page always agree. Screen state is local: every visit
   starts at All Reports, no search, filters, sort, page 1 (AC-MYL-009). */

const PINNED_FOLDER = 'all-environment';
const PAGE_SIZES = [5, 10, 20, 50, 100, 200, 500, 1000];

const keyOf = (m: MyLepideRow) => `${m.module.key}:${m.row.id}`;
const folderIdOf = (m: MyLepideRow) => `folder:${m.folder.name}`;
const nodeOf = (m: MyLepideRow): CatalogReportNode => ({
  kind: 'report', id: keyOf(m), name: m.row.name, slug: m.row.slug, description: m.row.description, disabled: false,
});

export default function MyLepidePage() {
  const { rows, remove } = useMyLepide();
  const openReport = useOpenReport();
  const toast = useToast();
  const nav = useNavigate();

  const [activeId, setActiveId] = useState<string>(ALL_ID);
  const [openId, setOpenId] = useState<string | null>(ALL_ID);
  const [treeQuery, setTreeQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  /* ENT-MYL-FavouriteFolder: one folder per folder name (merged across modules, GAP-MYL-01), in order
     of first appearance; the All Environment row is the pinned node instead. */
  const { folders, pinned, counts } = useMemo(() => {
    const byName = new Map<string, CatalogFolder>();
    const n = new Map<string, number>();
    let pin: CatalogReportNode | null = null;
    for (const m of rows) {
      if (m.row.folderId === PINNED_FOLDER) { if (!pin) pin = nodeOf(m); continue; }
      const id = folderIdOf(m);
      if (!byName.has(id)) byName.set(id, { id, name: m.folder.name, component: m.folder.name, children: [] });
      byName.get(id)!.children.push(nodeOf(m));
      n.set(id, (n.get(id) ?? 0) + 1);
    }
    return { folders: [...byName.values()], pinned: pin, counts: n };
  }, [rows]);
  const allNodes = useMemo(() => rows.map(nodeOf), [rows]);

  // INT-MYL-020: a folder emptied by a removal falls back to All Reports.
  const folderGone = activeId !== ALL_ID && !folders.some((f) => f.id === activeId);
  const active = folderGone ? ALL_ID : activeId;
  useEffect(() => {
    if (folderGone) { setActiveId(ALL_ID); setOpenId((o) => (o === activeId ? null : o)); }
  }, [folderGone, activeId]);

  const activeFolder = folders.find((f) => f.id === active);
  const tableRows = useMemo(() => (active === ALL_ID ? rows : rows.filter((m) => folderIdOf(m) === active)), [rows, active]);

  const open = (m: MyLepideRow) => openReport(m.module, m.row.slug, m.row.id, m.row.name);
  const openNode = (n: CatalogReportNode) => { const m = rows.find((x) => keyOf(x) === n.id); if (m) open(m); };
  const onFolder = (id: string) => { setActiveId(id); setOpenId((o) => (o === id ? null : id)); };

  const columns = useMemo<RCol<MyLepideRow>[]>(() => [
    {
      key: 'name', header: 'Report Name', width: 330, sortable: true, filterable: true, value: (m) => displayTitle(m.row),
      render: (m) => (
        <button type="button" className="rep-link" data-tip={displayTitle(m.row)} onClick={() => open(m)}>
          <span>{displayTitle(m.row)}</span><Icon name="arrow" size={14} />
        </button>
      ),
    },
    {
      key: 'section', header: 'Section', width: 170, sortable: true, filterable: true, value: (m) => m.module.tileName,
      render: (m) => <Chip>{m.module.tileName}</Chip>,
    },
    { key: 'description', header: 'Description', width: 300, sortable: true, filterable: true, value: (m) => m.row.description, cls: 'rlib-ink2' },
    { key: 'sharedBy', header: 'Shared By', width: 150, sortable: true, filterable: true, value: (m) => m.row.sharedBy || 'N/A' },
    { key: 'addedOn', header: 'Added On', width: 140, sortable: true, filterable: true, value: (m) => m.addedOn, cls: 'lf-num' },
  ], [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const model = useTableModel({ rows: tableRows, columns, pageSizes: PAGE_SIZES, defaultPageSize: 50, resetKey: active });

  const removing = removingKey ? rows.find((m) => keyOf(m) === removingKey) ?? null : null;
  const confirmRemove = () => {
    if (removing) {
      remove(removing.module.key, removing.row.id);
      toast({ variant: 'success', title: 'My Lepide', message: `"${removing.row.name}" removed from My Lepide.` });
    }
    setRemovingKey(null);
  };

  const n = model.processed.length;

  return (
    <div className="sub sub--fill rlib myl">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: 'My Lepide' }]}
        title="My Lepide"
        description="A collection of all of your favourite reports."
        actions={<Button variant="primary" icon="plus" onClick={() => nav('/auditor')}>Add reports</Button>} />

      <div className={'reports' + (collapsed ? ' reports--collapsed' : '')}>
        <section className="lf-card folders" aria-label="My Lepide folders" id="myl-folders">
          <label className="lf-field">
            <span className="lf-input lf-input--pill">
              {treeQuery ? null : <Icon name="search" />}
              <input value={treeQuery} placeholder="Search" aria-label="Search reports" maxLength={200} onChange={(e) => setTreeQuery(e.target.value)} />
              {treeQuery && <button type="button" className="rlib-clear" aria-label="Clear search" onClick={() => setTreeQuery('')}><Icon name="x" size={14} /></button>}
            </span>
          </label>
          {rows.length > 0
            ? <ReportTree folders={folders} allNodes={allNodes} countFor={(id) => counts.get(id) ?? 0} pinned={pinned}
                activeId={active} openId={openId} query={treeQuery} onFolder={onFolder} onReport={openNode} label="Report folders" />
            : <p className="myl-none">No reports in My Lepide yet.</p>}
        </section>

        <ReportTable model={model} columns={columns} rowKey={keyOf} actionsHeader="Actions"
          toolbarStart={<IconButton icon={collapsed ? 'folder' : 'chevron-left'} label={collapsed ? 'Show folders' : 'Hide folders'}
            aria-expanded={!collapsed} aria-controls="myl-folders" onClick={() => setCollapsed((c) => !c)} />}
          title={activeFolder ? activeFolder.name : 'All Reports'}
          count={`${n.toLocaleString()} report${n === 1 ? '' : 's'}`}
          empty={rows.length === 0 ? (
            <>
              <EmptyState icon="star" title="You don't have any reports to view here yet, please add an existing report to My Lepide first."
                action={<Button iconEnd="arrow" onClick={() => nav('/auditor')}>Go to Auditor reports</Button>} />
              <ReportPager total={0} label={(t) => `Total Records - ${t}`} page={1} pages={1} size={model.size} sizes={PAGE_SIZES}
                onPage={() => undefined} onSize={model.setSize} />
            </>
          ) : undefined}
          rowActions={(m) => (
            <IconButton icon="trash" danger label={`Remove ${m.row.name} from My Lepide`} data-tip="Remove from My Lepide"
              onClick={() => setRemovingKey(keyOf(m))} />
          )} />
      </div>

      <ConfirmDialog open={!!removing} onClose={() => setRemovingKey(null)} title="Remove from My Lepide" confirmLabel="Remove"
        message={removing ? `“${displayTitle(removing.row)}” will be removed from My Lepide. It stays in ${removing.module.tileName}, where you can add it again.` : undefined}
        onConfirm={confirmRemove} />
    </div>
  );
}
