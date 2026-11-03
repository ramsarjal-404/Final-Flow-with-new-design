import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { KpiCard } from '../../ui';
import { formatCell, isNA } from '../../reports';
import { FINANCE_PATH, SEED, type EffectiveRow, type EpoFile, type EpoObject } from './data';
import { DeepFrame, useDeepReport } from './frame';
import { DeepTable, useDeepModel, type DCol } from './DeepTable';
import { TreeNav, TreeSplit } from './TreePanel';
import { ObjectName, TickLegend, effectiveCols, flagCol } from './widgets';

/* SCR-TRU-07 · Excessive Permissions by Object (FLW-TRU-08). Read-only tree (GAP-TRU-13), KPI cards
   (Lepide Design System 08 § 4), Objects (primary; its search row and sort are the export's — GAP-TRU-08 resolved),
   "Permissions on Folder : <Finance>" and "Files in Folder : Finance" (fixed to Finance, ignore filters).
   Modify Filters "Directory" narrows Objects by name. */

type Obj = EpoObject & { k: string };
type Perm = EffectiveRow & { k: string };
type FileRow = EpoFile & { k: string };
const OBJECTS: Obj[] = SEED.EPO_OBJECTS.map((r, i) => ({ ...r, k: String(i) }));
const PERMS: Perm[] = SEED.EPO_FOLDER_PERMISSIONS.map((r, i) => ({ ...r, k: String(i) }));
const FILES: FileRow[] = SEED.EPO_FILES.map((r, i) => ({ ...r, k: String(i) }));
const FOLDER = FINANCE_PATH.split('\\').pop() ?? '';

const text = <T,>(key: keyof T & string, header: string, minWidth = 150): DCol<T> => ({
  key, header, sortable: true, filterable: true, minWidth, value: (r) => String(r[key] ?? ''),
});
const OBJ_COLS: DCol<Obj>[] = [
  { ...text<Obj>('name', 'Object Name', 240), render: (r) => <ObjectName name={r.name} kind={r.kind} /> },
  flagCol<Obj>('everyone'), flagCol<Obj>('broken'),
  text<Obj>('owner', 'Owner', 200), text<Obj>('lastScan', 'Last Scan', 180),
];
const PERM_COLS: DCol<Perm>[] = effectiveCols<Perm>().map((c) => (c.key === 'account' ? { ...c, render: undefined } : c));
const FILE_COLS: DCol<FileRow>[] = [
  { ...text<FileRow>('name', 'Name', 220), render: (r) => <ObjectName name={r.name} kind={r.kind} /> },
  flagCol<FileRow>('everyone'), flagCol<FileRow>('broken'), flagCol<FileRow>('notAccessed'),
  text<FileRow>('contentType', 'Content Type', 200), text<FileRow>('compliance', 'Compliance', 220), text<FileRow>('monetary', 'Monetary Value'),
  { ...text<FileRow>('risk', 'Risk Level', 130), render: (r) => formatCell('Risk Level', r.risk) },
];

export default function ExcessiveByObject() {
  const rep = useDeepReport('excessive-permissions-by-object');
  const { status, gen, filterRows } = rep;
  const objects = useMemo(() => filterRows(OBJECTS, (r, f) => (f === 'Directory' ? r.name : undefined)), [filterRows]);
  const om = useDeepModel(objects, OBJ_COLS, status, gen);
  const pm = useDeepModel(PERMS, PERM_COLS, status, gen);
  const fm = useDeepModel(FILES, FILE_COLS, status, gen);

  if (rep.entry.redirect || !rep.entry.row) return <Navigate to="/trust" replace />;
  const ready = status === 'ready';
  // INT-TRU-068: Objects after Modify Filters, then its search row and sort, in displayed order across all pages.
  const exportTable = { columns: ['Object Name', 'Owner', 'Last Scan'], rows: om.processed.map((r) => [r.name, r.owner, r.lastScan]) };
  const unusedAccounts = PERMS.filter((p) => p.perms.includes('r')).length;
  const unused = PERMS.reduce((n, p) => n + p.perms.split('').filter((c) => c === 'r').length, 0);
  const classified = FILES.filter((f) => !isNA(f.compliance)).length;

  return (
    <DeepFrame rep={rep} exportTable={exportTable}>
      {ready && (
        <div className="kpis" role="group" aria-label="Summary">
          <KpiCard label="Objects" value={objects.length} foot={`In ${FOLDER}`} />
          <KpiCard label="Accounts with unused rights" value={unusedAccounts} foot={`of ${PERMS.length} account(s) on ${FOLDER}`} />
          <KpiCard label="Granted but not used" value={unused} delta={unused ? 'Excessive' : undefined} deltaTone={unused ? 'warn' : 'flat'} foot="Rights not used in the last 30 days" />
          <KpiCard label="Classified files" value={classified} foot={`of ${FILES.length} file(s) not accessed in 30 days`} />
        </div>
      )}
      <TreeSplit title="File Server" show={ready} tree={<TreeNav root={SEED.OBJECT_TREE} label="File Server" />}>
        <DeepTable model={om} columns={OBJ_COLS} rowKey={(r) => r.k} title="Objects" titleId="tru-epo-objects" status={status} primary onGenerate={rep.generate} />
        <DeepTable model={pm} columns={PERM_COLS} rowKey={(r) => r.k} title={<span className="tru-title--path">Permissions on Folder : {FINANCE_PATH}</span>}
          titleId="tru-epo-perms" aside={<TickLegend />} status={status} />
        <DeepTable model={fm} columns={FILE_COLS} rowKey={(r) => r.k} title={`Files in Folder : ${FOLDER}`} titleId="tru-epo-files" status={status} />
      </TreeSplit>
    </DeepFrame>
  );
}
