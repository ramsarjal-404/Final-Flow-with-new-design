import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { initialsOf, Button, ConfirmDialog, EmptyState, Icon, IconButton, PageHeader, Toggle, useToast } from '../ui';
import { useAuth } from '../app/auth';
import { useOpenReport, useReportModule } from './context';
import { ALL_ID, ReportTree } from './ReportTree';
import { ReportTable, useTableModel, type RCol } from './ReportTable';
import { CreateFolderDialog, CreateReportDialog, MoveReportDialog, ShareDialog, SharedWithDialog } from './dialogs';
import { displayTitle, reportActions, useReportSlice } from './store';
import type { CatalogReportNode, ReportRow } from './types';

/* SCR-RLIB-01 · Reports hub (Lepide Design System 04 § 3). */

export default function HubPage() {
  const { module, focusFolderId, setFocusFolderId } = useReportModule();
  const { folders, rows } = useReportSlice(module.key);
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const openReport = useOpenReport();

  const crumbFolder = (loc.state as { folderId?: string } | null)?.folderId;
  const start = focusFolderId ?? (crumbFolder && folders.some((f) => f.id === crumbFolder) ? crumbFolder : null);
  const [activeId, setActiveId] = useState<string>(start ?? ALL_ID);
  const [openId, setOpenId] = useState<string | null>(start ?? (module.openAllReports ? ALL_ID : null));
  const [treeQuery, setTreeQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [modal, setModal] = useState<'report' | 'folder' | 'removeFolder' | null>(null);
  const [removeRow, setRemoveRow] = useState<ReportRow | null>(null);
  const [shareRow, setShareRow] = useState<ReportRow | null>(null);
  const [sharedRow, setSharedRow] = useState<ReportRow | null>(null);
  const [moveRow, setMoveRow] = useState<ReportRow | null>(null);

  useEffect(() => {
    if (focusFolderId) setFocusFolderId(null);
    if (crumbFolder) nav(loc.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // a removed active folder falls back to All Reports
  useEffect(() => { if (activeId !== ALL_ID && !folders.some((f) => f.id === activeId)) { setActiveId(ALL_ID); setOpenId(null); } }, [folders, activeId]);

  const activeFolder = folders.find((f) => f.id === activeId);
  const tableRows = useMemo(() => (activeId === ALL_ID ? rows : rows.filter((r) => r.folderId === activeId)), [rows, activeId]);
  const counts = useMemo(() => { const m = new Map<string, number>(); rows.forEach((r) => m.set(r.folderId, (m.get(r.folderId) ?? 0) + 1)); return m; }, [rows]);
  const allNodes = useMemo<CatalogReportNode[]>(() => rows.map((r) => ({ kind: 'report', id: r.id, name: r.name, slug: r.slug, description: r.description, disabled: r.disabled })), [rows]);
  const liveRow = (id: string | undefined) => rows.find((r) => r.id === id) ?? null;

  const open = (r: Pick<ReportRow, 'slug' | 'id' | 'name' | 'disabled'>) => { if (!r.disabled) openReport(module, r.slug, r.id, r.name); };
  const onFolder = (id: string) => { setActiveId(id); setOpenId((o) => (o === id ? null : id)); };

  const columns = useMemo<RCol<ReportRow>[]>(() => [
    {
      key: 'name', header: 'Report Name', width: 330, sortable: true, filterable: true, value: (r) => displayTitle(r),
      render: (r) => r.disabled
        ? <span className="rep-link off" data-tip={`${displayTitle(r)} (not available)`} aria-disabled="true"><span>{displayTitle(r)}</span></span>
        : <button type="button" className="rep-link" data-tip={displayTitle(r)} onClick={() => open(r)}><span>{displayTitle(r)}</span><Icon name="arrow" size={14} /></button>,
    },
    { key: 'description', header: 'Description', width: 260, sortable: true, filterable: true, value: (r) => r.description, cls: 'rlib-ink2' },
    {
      key: 'sharedWith', header: 'Shared with', width: 170, sortable: true, filterable: true, value: (r) => r.sharedWith.join(', '),
      render: (r) => r.sharedWith.length
        ? <button type="button" className="avs rlib-avs" aria-label={`Shared with ${r.sharedWith.join(', ')}. See More`} data-tip={r.sharedWith.join(', ')} onClick={() => setSharedRow(r)}>
            {r.sharedWith.slice(0, 4).map((n, i) => <span key={i} className="av" aria-hidden="true">{initialsOf(n)}</span>)}
            {r.sharedWith.length > 4 && <span className="rlib-avs__more">+{r.sharedWith.length - 4}</span>}
          </button>
        : <span className="lf-na">—</span>,
    },
    { key: 'sharedBy', header: 'Shared By', width: 150, sortable: true, filterable: true, value: (r) => r.sharedBy },
    {
      key: 'myLepide', header: 'My Lepide', width: 120, sortable: true, value: (r) => r.myLepide,
      render: (r) => (
        <span data-tip={r.disabled ? `${r.name} (not available)` : undefined} style={{ display: 'inline-flex' }}>
          <Toggle checked={r.myLepide} label={`${r.name}: add to My Lepide`} disabled={r.disabled} onChange={() => reportActions.toggleMyLepide(module.key, r.id)} />
        </span>
      ),
    },
    {
      key: 'type', header: 'Report Type', width: 150, sortable: true, filterable: true, value: (r) => r.type,
      render: (r) => <span className={'lf-chip' + (r.type === 'Custom' ? ' lf-chip--brand' : '')}>{r.type}</span>,
    },
    { key: 'addedBy', header: 'Added By', width: 150, sortable: true, filterable: true, value: (r) => r.addedBy },
    { key: 'addedOn', header: 'Added On', width: 140, sortable: true, filterable: true, value: (r) => r.addedOn, cls: 'lf-num' },
  ], [module]); // eslint-disable-line react-hooks/exhaustive-deps

  const model = useTableModel({ rows: tableRows, columns, pageSizes: [5, 10, 20, 50, 100, 200, 500, 1000], defaultPageSize: 50, resetKey: activeId });

  const removeFolder = () => {
    if (activeId === ALL_ID) return;
    if (!activeFolder) { toast({ variant: 'error', title: 'Remove folder', message: 'Please click on folder icon before remove.' }); return; }
    if (!activeFolder.custom) { toast({ variant: 'info', title: 'Remove folder', message: "You can't remove predefined folder." }); return; }
    setModal('removeFolder');
  };

  return (
    <div className="sub sub--fill rlib">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: module.tileName, to: module.basePath }, { label: 'Reports' }]}
        title={module.title} description={module.description}
        actions={<>
          <span data-tip={activeId === ALL_ID ? 'Select a folder to remove it' : undefined} style={{ display: 'inline-flex' }}>
            <Button variant="danger" icon="trash" disabled={activeId === ALL_ID} onClick={removeFolder}>Remove folder</Button>
          </span>
          <Button icon="folder" onClick={() => setModal('folder')}>Create folder</Button>
          <Button variant="primary" icon="plus" onClick={() => setModal('report')}>Create report</Button>
        </>} />

      <div className={'reports' + (collapsed ? ' reports--collapsed' : '')}>
        <section className="lf-card folders" aria-label="Report folders" id="rlib-folders">
          <label className="lf-field">
            <span className="lf-input lf-input--pill">
              {treeQuery ? null : <Icon name="search" />}
              <input value={treeQuery} placeholder="Search" aria-label="Search reports" maxLength={200} onChange={(e) => setTreeQuery(e.target.value)} />
              {treeQuery && <button type="button" className="rlib-clear" aria-label="Clear search" onClick={() => setTreeQuery('')}><Icon name="x" size={14} /></button>}
            </span>
          </label>
          <ReportTree folders={folders} allNodes={allNodes} countFor={(id) => counts.get(id) ?? 0} pinned={module.pinned}
            activeId={activeId} openId={openId} query={treeQuery} onFolder={onFolder}
            onReport={(n) => { const r = liveRow(n.id) ?? rows.find((x) => x.slug === n.slug); if (r) open(r); else if (!n.disabled) openReport(module, n.slug, n.id, n.name); }} />
        </section>

        <ReportTable model={model} columns={columns} rowKey={(r) => r.id} actionsHeader="Action"
          toolbarStart={<IconButton icon={collapsed ? 'folder' : 'chevron-left'} label={collapsed ? 'Show folders' : 'Hide folders'}
            aria-expanded={!collapsed} aria-controls="rlib-folders" onClick={() => setCollapsed((c) => !c)} />}
          title={activeFolder ? activeFolder.name + (activeFolder.custom ? ' (custom)' : '') : 'All Reports'}
          count={`${model.processed.length.toLocaleString()} report${model.processed.length === 1 ? '' : 's'}`}
          empty={activeId !== ALL_ID ? <EmptyState icon="folder" title="You don't have any reports to view please click on Create Report button to generate new reports!" /> : undefined}
          rowActions={(r) => <>
            <IconButton icon="share" label={`Share ${r.name}`} onClick={() => setShareRow(r)} />
            <span data-tip={r.type === 'Custom' ? undefined : "Predefined reports can't be moved"} style={{ display: 'inline-flex' }}>
              <IconButton icon="folder" label={`Move ${r.name}`} disabled={r.type !== 'Custom'} onClick={() => setMoveRow(r)} />
            </span>
            <span data-tip={r.type === 'Custom' ? undefined : "Predefined reports can't be removed"} style={{ display: 'inline-flex' }}>
              <IconButton icon="trash" label={`Remove ${r.name}`} danger disabled={r.type !== 'Custom'} onClick={() => setRemoveRow(r)} />
            </span>
          </>} />
      </div>

      <CreateReportDialog open={modal === 'report'} onClose={() => setModal(null)} folders={folders}
        onNext={(draft) => { setModal(null); nav(`${module.basePath}/reports/new`, { state: { draft } }); }} />
      <CreateFolderDialog open={modal === 'folder'} onClose={() => setModal(null)} moduleKey={module.key}
        onCreated={(f) => { setModal(null); setActiveId(f.id); setOpenId(f.id); toast({ variant: 'success', title: 'Create folder', message: `Folder "${f.name}" created successfully.` }); }} />
      <ConfirmDialog open={modal === 'removeFolder'} onClose={() => setModal(null)} title="Are you sure?" confirmLabel="Remove"
        message="If selected folder is associated with reports, the respective charts in the dashboard will be removed. Do you want to continue?"
        onConfirm={() => {
          if (activeFolder) {
            reportActions.removeFolder(module.key, activeFolder.id);
            toast({ variant: 'success', title: 'Remove folder', message: `Folder "${activeFolder.name}" removed.` });
          }
          setModal(null); setActiveId(ALL_ID); setOpenId(null);
        }} />
      <ConfirmDialog open={!!removeRow} onClose={() => setRemoveRow(null)} title="Are you sure?" confirmLabel="Remove"
        message="If selected report is associated with a chart in the dashboard and you remove this report then the chart will also be removed. Do you want to continue?"
        onConfirm={() => {
          if (removeRow) { reportActions.removeReport(module.key, removeRow.id); toast({ variant: 'success', title: 'Remove Report', message: `"${removeRow.name}" removed.` }); }
          setRemoveRow(null);
        }} />
      <ShareDialog row={shareRow} moduleKey={module.key} sharer={user?.name ?? 'Console User'} onClose={() => setShareRow(null)} />
      <SharedWithDialog row={liveRow(sharedRow?.id)} moduleKey={module.key} onClose={() => setSharedRow(null)} />
      <MoveReportDialog row={moveRow} moduleKey={module.key} folders={folders} onClose={() => setMoveRow(null)} />
    </div>
  );
}
