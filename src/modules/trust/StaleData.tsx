import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Chart, ConfirmDialog, KpiCard, Segmented } from '../../ui';
import { SEED, type StaleFile, type StaleFolder } from './data';
import { DeepFrame, useDeepReport } from './frame';
import { DeepTable, useDeepModel, type DCol } from './DeepTable';
import { TreeNav, TreeSplit } from './TreePanel';
import { ObjectName } from './widgets';

/* SCR-TRU-08 / SCR-TRU-09 · Stale Data Report — General View and Tree View (FLW-TRU-09) with DLG-TRU-07
   (view-switch confirm). Lepide Design System 08 § 4: the view switch is a segmented control in the header; General
   View = KPI cards + chart panels + the files table; Tree View = the counted tree + the folders table.
   GAP-TRU-01 intended: the user's chosen view wins (the first Generate no longer forces Tree View) and
   the confirm appears only when a generated (or generating) report would be lost. Only "Financial
   Services" is selectable (GAP-TRU-15). */

type View = 'general' | 'tree';
type File = StaleFile & { k: string };
type Folder = StaleFolder & { k: string };
const FILES: File[] = SEED.STALE_FILES.map((r, i) => ({ ...r, k: String(i) }));
const FOLDERS: Folder[] = SEED.STALE_FOLDERS.map((r, i) => ({ ...r, k: String(i) }));
const PICK_HINT = 'Select Financial Services in the tree to view its stale folders.';

const text = <T,>(key: keyof T & string, header: string, minWidth = 150): DCol<T> => ({
  key, header, sortable: true, filterable: true, minWidth, value: (r) => String(r[key] ?? ''),
});
const FILE_COLS: DCol<File>[] = [
  text<File>('server', 'File Server', 120),
  { ...text<File>('folder', 'Folder Path', 300), cls: 'lf-mono' },
  { ...text<File>('file', 'File Name', 220), render: (r) => <ObjectName name={r.file} kind="file" /> },
  { ...text<File>('size', 'File Size', 110), cls: 'lf-num' },
  { ...text<File>('accessed', 'File Access Time', 190), cls: 'lf-num' },
  { ...text<File>('lastScan', 'Last Scan Time', 190), cls: 'lf-num' },
  text<File>('owner', 'Owner', 180),
];
const FOLDER_COLS: DCol<Folder>[] = [
  { ...text<Folder>('path', 'Folder Path', 340), render: (r) => <ObjectName name={r.path} kind="folder" /> },
  { ...text<Folder>('staleSize', 'Stale Folder Size', 150), cls: 'lf-num' },
  { ...text<Folder>('totalSize', 'Total Folder Size', 150), cls: 'lf-num' },
  { ...text<Folder>('staleCount', 'Stale File Count', 150), value: (r) => Number(r.staleCount), cls: 'lf-num' },
  { ...text<Folder>('totalCount', 'Total File Count', 150), value: (r) => Number(r.totalCount), cls: 'lf-num' },
  text<Folder>('owner', 'Owner', 180),
  { ...text<Folder>('lastScan', 'Last Scan Time', 190), cls: 'lf-num' },
];

/** "7.63 KB" / "1.14MB" / "0 Bytes" → bytes. */
function bytes(s: string) {
  const m = s.match(/([\d.]+)\s*(bytes|b|kb|mb|gb)/i); if (!m) return 0;
  const k = m[2].toLowerCase();
  return Number(m[1]) * (k === 'kb' ? 1024 : k === 'mb' ? 1024 ** 2 : k === 'gb' ? 1024 ** 3 : 1);
}
function humanSize(n: number) {
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${Math.round(n)} Bytes`;
}
const ext = (name: string) => { const m = name.match(/\.([a-z0-9]+)$/i); return m ? m[1].toLowerCase() : 'other'; };
const tally = (xs: string[]) => { const m = new Map<string, number>(); xs.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]); };

export default function StaleData() {
  const rep = useDeepReport('stale-data-report');
  const { status, gen, filterRows } = rep;
  const [view, setView] = useState<View>('general');
  const [confirm, setConfirm] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  const files = useMemo(() => filterRows(FILES, (r, f) => (f === 'Folder Path' ? r.folder : f === 'Owner' ? r.owner : undefined)), [filterRows]);
  const folders = useMemo(() => (sel ? filterRows(FOLDERS, (r, f) => (f === 'Folder Path' ? r.path : f === 'Owner' ? r.owner : undefined)) : []), [filterRows, sel]);
  const filesM = useDeepModel(files, FILE_COLS, status, gen);
  const foldersM = useDeepModel(folders, FOLDER_COLS, status, gen);

  if (rep.entry.redirect || !rep.entry.row) return <Navigate to="/trust" replace />;
  const ready = status === 'ready';
  const other: View = view === 'general' ? 'tree' : 'general';

  const switchView = () => { setView(other); setSel(null); rep.reset(); setConfirm(false); };
  const askSwitch = (v: string) => {
    if (v === view) return;
    if (status === 'idle') switchView(); else setConfirm(true);
  };
  const generate = () => { setSel(null); rep.generate(); };

  const exportTable = view === 'general'
    ? { columns: ['File Server', 'Folder Path', 'File Name', 'File Size', 'File Access Time', 'Last Scan Time', 'Owner'],
        rows: files.map((r) => [r.server, r.folder, r.file, r.size, r.accessed, r.lastScan, r.owner]) }
    : { columns: ['Folder Path', 'Stale Folder Size', 'Total Folder Size', 'Stale File Count', 'Total File Count', 'Owner', 'Last Scan Time'],
        rows: folders.map((r) => [r.path, r.staleSize, r.totalSize, r.staleCount, r.totalCount, r.owner, r.lastScan]) };

  const toggle = (
    <Segmented mode="pressed" hug ariaLabel="Switch between General View and Tree View" value={view} onChange={askSwitch}
      items={[{ value: 'general', label: 'General View' }, { value: 'tree', label: 'Tree View' }]} />
  );

  const owners = tally(files.map((f) => f.owner));
  const types = tally(files.map((f) => ext(f.file)));
  const oldest = files.map((f) => f.accessed).sort((a, b) => {
    const d = (s: string) => { const m = s.match(/^(\d{2})-(\d{2})-(\d{4})/); return m ? +`${m[3]}${m[2]}${m[1]}` : 0; };
    return d(a) - d(b);
  })[0];

  return (
    <DeepFrame rep={rep} exportTable={exportTable} extraActions={toggle} onGenerate={generate}>
      {view === 'general' ? (
        <>
          {ready && files.length > 0 && (
            <>
              <div className="kpis" role="group" aria-label="Summary">
                <KpiCard label="Stale files" value={files.length} foot="Not accessed for 30+ days" />
                <KpiCard label="Stale data size" value={humanSize(files.reduce((n, f) => n + bytes(f.size), 0))} foot={`Across ${new Set(files.map((f) => f.folder)).size} folder(s)`} />
                <KpiCard label="Owners" value={owners.length} foot="Accounts owning stale files" />
                <KpiCard label="Oldest access" value={oldest?.slice(0, 10) ?? '—'} foot="Earliest file access time" />
              </div>
              <div className="grid2">
                <section className="lf-card panel">
                  <h3 className="lf-card__title">Stale files by owner<small>{files.length} file(s)</small></h3>
                  <Chart kind="donut" title="Stale files by owner" data={{ caption: 'Files', segments: owners.map(([label, value]) => ({ label, value })) }} />
                </section>
                <section className="lf-card panel">
                  <h3 className="lf-card__title">Stale files by type<small>By file extension</small></h3>
                  <Chart kind="columns" title="Stale files by type" data={{ name: 'Files', labels: types.map(([t]) => t.toUpperCase()), values: types.map(([, n]) => n) }} />
                </section>
              </div>
            </>
          )}
          <DeepTable model={filesM} columns={FILE_COLS} rowKey={(r) => r.k} title="Results" titleId="tru-stale-files" status={status} primary onGenerate={generate} fill />
        </>
      ) : (
        <TreeSplit title="File Server" show={ready}
          tree={<TreeNav root={SEED.STALE_TREE} label="File Server" selected={sel} onSelect={(p) => setSel((s) => (s === p ? null : p))} />}>
          <DeepTable model={foldersM} columns={FOLDER_COLS} rowKey={(r) => r.k} title={sel ? `Results · ${sel.split("/").pop()}` : "Results"}
            titleId="tru-stale-folders" status={status} primary onGenerate={generate} emptyText={sel ? undefined : PICK_HINT} fill />
        </TreeSplit>
      )}

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={switchView} destructive={false} icon="info"
        title="Are you sure?" message="This will clear all data for the report. You will need to regenerate the report to continue." confirmLabel="Yes" />
    </DeepFrame>
  );
}
