import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { formatCell } from '../../reports';
import { SEED, type PbuFile, type PbuFolder } from './data';
import { DeepFrame, flagWanted, useDeepReport } from './frame';
import { DeepTable, useDeepModel, type DCol } from './DeepTable';
import { TreeNav, TreeSplit } from './TreePanel';
import { ObjectName, flagCol } from './widgets';

/* SCR-TRU-04 · Permissions by User (FLW-TRU-04). TreePanel "File Server" (read-only, GAP-TRU-11),
   Folders (primary) and Files. Modify Filters: Object Path → Folders path; Compliance, Monetary Value →
   Files; Stale Data → Files by the not-accessed flag (GAP-TRU-02 intended: every listed field narrows).
   Export = Files after Modify Filters. */

type Folder = PbuFolder & { k: string };
type File = PbuFile & { k: string };
const FOLDERS: Folder[] = SEED.PBU_FOLDERS.map((r, i) => ({ ...r, k: String(i) }));
const FILES: File[] = SEED.PBU_FILES.map((r, i) => ({ ...r, k: String(i) }));

const text = <T,>(key: keyof T & string, header: string, minWidth = 150): DCol<T> => ({
  key, header, sortable: true, filterable: true, minWidth, value: (r) => String(r[key] ?? ''),
});

const FOLDER_COLS: DCol<Folder>[] = [
  { ...text<Folder>('name', 'Object Name', 220), render: (r) => <ObjectName name={r.name} kind="folder" /> },
  flagCol<Folder>('everyone'), flagCol<Folder>('broken'),
  { ...text<Folder>('path', 'Path', 200), cls: 'lf-mono' },
  text<Folder>('owner', 'Owner', 180), text<Folder>('lastScan', 'Last Scan', 190), text<Folder>('lastModified', 'Last Modified', 190),
  text<Folder>('effective', 'Effective Permission', 180),
];
const FILE_COLS: DCol<File>[] = [
  { ...text<File>('name', 'Name', 220), render: (r) => <ObjectName name={r.name} kind={r.kind} /> },
  flagCol<File>('everyone'), flagCol<File>('broken'), flagCol<File>('notAccessed'),
  text<File>('contentType', 'Content Type', 180), text<File>('compliance', 'Compliance'), text<File>('monetary', 'Monetary Value'),
  { ...text<File>('risk', 'Risk Level', 130), render: (r) => formatCell('Risk Level', r.risk) },
  text<File>('effective', 'Effective Permission', 180),
];

export default function PermissionsByUser() {
  const rep = useDeepReport('permissions-by-user');
  const { status, gen, filterRows } = rep;

  const folders = useMemo(() => filterRows(FOLDERS, (r, f) => (f === 'Object Path' ? r.path : undefined)), [filterRows]);
  const files = useMemo(() => {
    const out = filterRows(FILES, (r, f) => (f === 'Compliance' ? r.compliance : f === 'Monetary Value' ? r.monetary : undefined));
    const want = flagWanted(rep.applied.find((f) => f.field === 'Stale Data'));
    return want === null ? out : out.filter((r) => r.notAccessed === want);
  }, [filterRows, rep.applied]);

  const fm = useDeepModel(folders, FOLDER_COLS, status, gen);
  const fl = useDeepModel(files, FILE_COLS, status, gen);

  if (rep.entry.redirect || !rep.entry.row) return <Navigate to="/trust" replace />;
  const exportTable = {
    columns: ['Name', 'Content Type', 'Compliance', 'Monetary Value', 'Risk Level', 'Effective Permission'],
    rows: files.map((r) => [r.name, r.contentType, r.compliance, r.monetary, r.risk, r.effective]),
  };

  return (
    <DeepFrame rep={rep} exportTable={exportTable}>
      <TreeSplit title="File Server" show={status === 'ready'}
        tree={<TreeNav root={SEED.PBU_TREE} label="File Server" />}>
        <DeepTable model={fm} columns={FOLDER_COLS} rowKey={(r) => r.k} title="Folders" titleId="tru-pbu-folders" status={status} primary onGenerate={rep.generate} />
        <DeepTable model={fl} columns={FILE_COLS} rowKey={(r) => r.k} title="Files" titleId="tru-pbu-files" status={status} />
      </TreeSplit>
    </DeepFrame>
  );
}
