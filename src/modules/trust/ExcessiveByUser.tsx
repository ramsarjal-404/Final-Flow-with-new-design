import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { KpiCard } from '../../ui';
import { formatCell } from '../../reports';
import { EPU_ROW_USER, SEED, type EpoFile, type EpuFolder } from './data';
import { DeepFrame, useDeepReport } from './frame';
import { DeepTable, useDeepModel, type DCol } from './DeepTable';
import { TreeNav, TreeSplit } from './TreePanel';
import { ObjectName, TickLegend, flagCol, permCols, permsText } from './widgets';

/* SCR-TRU-06 · Excessive Permissions by User (FLW-TRU-07). TreePanel "Users" in user mode (root
   "lpde4" not selectable; users selectable, Marty.Byrde selected on arrival), KPI cards (Lepide Design System 08 § 4),
   Folders (primary, 13-right used / excessive matrix) and Files (never has rows — GAP-TRU-14).
   Modify Filters "User" matches the row's user, not the Owner (GAP-TRU-07 resolved). Export = the
   selected user's Folders rows after Modify Filters, with a Permissions text column. */

type Row = EpuFolder & { k: string; user: string };
const ROWS: Row[] = SEED.EPU_FOLDERS.map((r, i) => ({ ...r, k: String(i), user: EPU_ROW_USER }));
const DOMAIN = SEED.EPU_USER_TREE.name;
type FileRow = EpoFile & { k: string };

const text = <T,>(key: keyof T & string, header: string, minWidth = 150): DCol<T> => ({
  key, header, sortable: true, filterable: true, minWidth, value: (r) => String(r[key] ?? ''),
});
const COLS: DCol<Row>[] = [
  text<Row>('server', 'Server Name', 130),
  { ...text<Row>('name', 'Object Name', 200), render: (r) => <ObjectName name={r.name} kind="folder" /> },
  flagCol<Row>('everyone'), flagCol<Row>('broken'),
  { ...text<Row>('path', 'Path', 180), cls: 'lf-mono' },
  text<Row>('owner', 'Owner', 180), text<Row>('lastScan', 'Last Scan', 180), text<Row>('lastModified', 'Last Modified', 180),
  ...permCols<Row>(),
];
const FILE_COLS: DCol<FileRow>[] = [
  { ...text<FileRow>('name', 'Name', 200), render: (r) => <ObjectName name={r.name} kind={r.kind} /> },
  { key: 'notAccessed', header: 'Not accessed (30 days)', sortable: true, filterable: true, minWidth: 190, value: (r) => (r.notAccessed ? 'Yes' : 'No') },
  text<FileRow>('contentType', 'Content Type', 180), text<FileRow>('compliance', 'Compliance'), text<FileRow>('monetary', 'Monetary Value'),
  { ...text<FileRow>('risk', 'Risk Level', 130), render: (r) => formatCell('Risk Level', r.risk) },
];
const NO_FILES: FileRow[] = [];
const count = (rows: Row[], code: string) => rows.reduce((n, r) => n + r.perms.split('').filter((c) => c === code).length, 0);

export default function ExcessiveByUser() {
  const rep = useDeepReport('excessive-permissions-by-user');
  const { status, gen, filterRows } = rep;
  const firstUser = SEED.EPU_USER_TREE.children?.[0]?.name ?? '';
  const [user, setUser] = useState(firstUser);

  const rows = useMemo(() => filterRows(ROWS.filter((r) => r.user.toLowerCase() === `${DOMAIN}\\${user}`.toLowerCase()),
    (r, f) => (f === 'User' ? r.user : undefined)), [filterRows, user]);
  const fm = useDeepModel(rows, COLS, status, gen);
  const flm = useDeepModel(NO_FILES, FILE_COLS, status, gen);

  if (rep.entry.redirect || !rep.entry.row) return <Navigate to="/trust" replace />;
  const ready = status === 'ready';
  const exportTable = {
    columns: ['Server Name', 'Object Name', 'Path', 'Owner', 'Last Scan', 'Last Modified', 'Permissions'],
    rows: rows.map((r) => [r.server, r.name, r.path, r.owner, r.lastScan, r.lastModified, permsText(r.perms)]),
  };
  const excessive = count(rows, 'r'); const used = count(rows, 'g');

  return (
    <DeepFrame rep={rep} exportTable={exportTable}>
      {ready && (
        <div className="kpis" role="group" aria-label="Summary">
          <KpiCard label="Folders with excessive rights" value={rows.filter((r) => r.perms.includes('r')).length} foot={`of ${rows.length} folder(s) for ${DOMAIN}\\${user}`} />
          <KpiCard label="Granted but not used" value={excessive} deltaTone={excessive ? 'warn' : 'flat'} delta={excessive ? 'Excessive' : undefined} foot="Rights not used in the last 30 days" />
          <KpiCard label="Granted and used" value={used} foot="Rights used in the last 30 days" />
          <KpiCard label="'Everyone' in ACL" value={rows.filter((r) => r.everyone).length} foot="Folders with 'Everyone' added directly" />
        </div>
      )}
      <TreeSplit title="Users" show={ready}
        tree={<TreeNav root={SEED.EPU_USER_TREE} label="Users" userMode selected={`${DOMAIN}/${user}`}
          isSelectable={(_, depth) => depth > 0} onSelect={(_, n) => setUser(n.name)} />}>
        <DeepTable model={fm} columns={COLS} rowKey={(r) => r.k} title={ready ? `Folders · ${DOMAIN}\\${user}` : 'Folders'} titleId="tru-epu-folders"
          aside={<TickLegend />} status={status} primary onGenerate={rep.generate} />
        <DeepTable model={flm} columns={FILE_COLS} rowKey={(r) => r.k} title="Files" titleId="tru-epu-files" status={status}
          emptyText="No files with excessive permissions for this user." />
      </TreeSplit>
    </DeepFrame>
  );
}
